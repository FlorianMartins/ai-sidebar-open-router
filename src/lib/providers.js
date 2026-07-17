// API clients. Two families sharing one interface:
//   runTurn({ system, history, tools, onText, onThink, signal })
//     -> { message, toolCalls:[{id,name,input}], stopReason, text }
//   formatToolResults(results) -> native message(s) to push into the history
//
// `history` and `message` stay in each provider's NATIVE wire format (Anthropic
// vs OpenAI) to remain faithful to each API. The agent loop (agent.js) only ever
// touches the normalised `toolCalls` array.
//
// `onThink(delta)` receives reasoning text (Anthropic extended thinking,
// DeepSeek/o-series reasoning_content) so the UI can show it separately.

import { PROVIDERS, baseUrlFor, modelFor, keyFor } from "./models.js";

// Pull the real, resolvable source URLs out of web-plugin annotations (OpenRouter/OpenAI
// `url_citation`). These are the ACTUAL search-result links — unlike URLs the model types into its
// prose, which are frequently hallucinated or truncated (→ 404). Deduped, in first-seen order.
function extractUrlCitations(annotations) {
  const out = [];
  const seen = new Set();
  for (const a of annotations || []) {
    if (!a) continue;
    const uc = a.url_citation || (a.type === "url_citation" && a.url_citation) || (a.type === "url_citation" ? a : null);
    const url = uc && uc.url;
    if (typeof url === "string" && /^https?:\/\//.test(url) && !seen.has(url)) {
      seen.add(url);
      out.push({ url, title: (uc.title || "").slice(0, 200) });
    }
  }
  return out;
}

const MAX_TOKENS = 4096;
// Generous per-model OUTPUT cap for OpenRouter so big answers (full apps / artifacts /
// long code) are NOT truncated. OpenRouter clamps this down to each model's real limit,
// so a high value is safe. Without it, requests defaulted to a tiny completion and cut
// off mid-code — the artifact then failed to run and the verifier flagged it forever.
function orMaxTokens(model) {
  const m = String(model || "").toLowerCase();
  if (m.includes("claude") || m.includes("opus") || m.includes("sonnet")) return 32000;
  if (m.includes("gemini") || m.includes("gpt-5") || m.includes("gpt-4")) return 16000;
  if (m.includes("deepseek") || m.includes("qwen") || m.includes("llama") || m.includes("nemotron")) return 12000;
  return 8000;
}
// Extended-thinking budgets per reasoning LEVEL. Thinking has three levels now:
//   "off"  — no reasoning at all (fast, cheap)
//   "high" — deep, Claude-style reasoning
//   "max"  — maximum reasoning budget (pushes the model as far as it goes)
// budget_tokens must stay below max_tokens (enforced via MAX_TOKENS + budget below).
const THINKING_BUDGET = 10000; // "high"
const THINK_BUDGETS = { high: 10000, max: 28000 };

// Normalise any incoming thinking value (boolean back-compat OR level string) to a level.
function thinkLevelNorm(v) {
  if (v === "high" || v === "max" || v === "off") return v;
  return v ? "high" : "off";
}

// Open-weight model families (Llama, Qwen, DeepSeek, GLM, Mistral, Kimi, MiniMax, Nemotron,
// Gemma…). OpenRouter spreads their traffic across many hosts that may serve degraded low-bit
// quantizations (int4/int8) → quality varies host-to-host. For these we pin routing to
// high-precision hosts. PROPRIETARY models (Claude/GPT/Gemini) have one official provider, so
// they're already identical to the direct API and need no preference.
const OPEN_WEIGHT_RE =
  /^(z-ai|qwen|deepseek|meta-llama|mistralai|moonshotai|minimax|nvidia|nousresearch|cognitivecomputations|google\/gemma|microsoft\/phi)\b/i;
function openWeightProviderPref(model) {
  if (!OPEN_WEIGHT_RE.test(String(model || ""))) return undefined;
  // fp8/fp16/bf16/fp32 are (near-)lossless for these models; "unknown" keeps untagged
  // high-quality hosts available. Drops only the genuinely degraded int4/int8 hosts.
  return { quantizations: ["fp8", "fp16", "bf16", "fp32", "unknown"] };
}

// Generic SSE reader: yields the payloads of "data:" lines.
async function* sseData(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).replace(/\r$/, "");
      buf = buf.slice(idx + 1);
      if (line.startsWith("data:")) yield line.slice(5).trim();
    }
  }
}

async function ensureOk(response) {
  if (response.ok) return;
  let detail = "";
  try {
    detail = await response.text();
  } catch (_) {}
  throw new Error(`HTTP ${response.status} — ${detail.slice(0, 500)}`);
}

// Auto-retry transient rate limits (429) and upstream hiccups (503). Free models get rate-limited
// upstream for a second or two ("retry_after_seconds":1) — a short retry usually clears it, so the
// right-click quick actions (translate/summarize…) keep working without a paid key.
async function fetchWithRetry(url, opts, maxRetries = 3) {
  let attempt = 0;
  while (true) {
    const res = await fetch(url, opts);
    if ((res.status !== 429 && res.status !== 503) || attempt >= maxRetries || (opts.signal && opts.signal.aborted)) return res;
    let waitMs = Math.min(4000, 700 * (attempt + 1));
    const ra = res.headers.get("retry-after");
    if (ra) { const s = parseInt(ra, 10); if (!Number.isNaN(s)) waitMs = Math.min(6000, Math.max(waitMs, (s || 1) * 1000)); }
    try { await res.body?.cancel?.(); } catch (_) {}
    await new Promise((r) => setTimeout(r, waitMs));
    attempt++;
  }
}

// ---------------------------------------------------------------------------
// Anthropic (Claude) — native API, + extended thinking + server-side web search
// ---------------------------------------------------------------------------
function anthropicProvider({ apiKey, model, baseUrl, thinkLevel, webSearch }) {
  const url = baseUrl.replace(/\/$/, "") + "/messages";
  return {
    id: "anthropic",

    async runTurn({ system, history, tools, onText, onThink, signal }) {
      const lvl = thinkLevelNorm(thinkLevel);
      const budget = lvl === "off" ? 0 : THINK_BUDGETS[lvl] || THINKING_BUDGET;
      const body = {
        model,
        max_tokens: budget ? MAX_TOKENS + budget : MAX_TOKENS,
        system,
        messages: history,
        stream: true,
      };
      if (budget) {
        body.thinking = { type: "enabled", budget_tokens: budget };
      }
      const toolList = [];
      if (tools && tools.length) {
        for (const t of tools)
          toolList.push({ name: t.name, description: t.description, input_schema: t.input_schema });
      }
      if (webSearch) {
        toolList.push({ type: "web_search_20250305", name: "web_search", max_uses: 5 });
      }
      if (toolList.length) body.tools = toolList;

      const response = await fetch(url, {
        method: "POST",
        signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify(body),
      });
      await ensureOk(response);

      const blocks = [];
      let stopReason = null;
      let text = "";

      for await (const data of sseData(response)) {
        if (data === "[DONE]") break;
        let ev;
        try {
          ev = JSON.parse(data);
        } catch (_) {
          continue;
        }
        switch (ev.type) {
          case "content_block_start":
            blocks[ev.index] = { ...ev.content_block, _partial: "" };
            break;
          case "content_block_delta": {
            const b = blocks[ev.index];
            if (!b) break;
            const d = ev.delta;
            if (d.type === "text_delta") {
              b.text = (b.text || "") + d.text;
              text += d.text;
              onText && onText(d.text);
            } else if (d.type === "thinking_delta") {
              b.thinking = (b.thinking || "") + d.thinking;
              onThink && onThink(d.thinking);
            } else if (d.type === "signature_delta") {
              b.signature = (b.signature || "") + d.signature;
            } else if (d.type === "input_json_delta") {
              b._partial += d.partial_json;
            }
            break;
          }
          case "content_block_stop": {
            const b = blocks[ev.index];
            if (b && b.type === "tool_use") {
              try {
                b.input = JSON.parse(b._partial || "{}");
              } catch (_) {
                b.input = {};
              }
            }
            if (b) delete b._partial;
            break;
          }
          case "message_delta":
            if (ev.delta && ev.delta.stop_reason) stopReason = ev.delta.stop_reason;
            break;
        }
      }

      // Keep ALL blocks (including thinking with its signature, which the API
      // requires on the next turn) so the conversation stays valid.
      const content = blocks.filter(Boolean).map((b) => {
        if (b.type === "tool_use")
          return { type: "tool_use", id: b.id, name: b.name, input: b.input || {} };
        if (b.type === "text") return { type: "text", text: b.text || "" };
        if (b.type === "thinking")
          return { type: "thinking", thinking: b.thinking || "", signature: b.signature || "" };
        if (b.type === "redacted_thinking")
          return { type: "redacted_thinking", data: b.data };
        return b;
      });

      const toolCalls = content
        .filter((b) => b.type === "tool_use")
        .map((b) => ({ id: b.id, name: b.name, input: b.input }));

      return { message: { role: "assistant", content }, toolCalls, stopReason, text };
    },

    formatToolResults(results) {
      return {
        role: "user",
        content: results.map((r) => {
          const block = { type: "tool_result", tool_use_id: r.id, is_error: !!r.isError };
          const m = r.image && /^data:([^;]+);base64,(.*)$/.exec(r.image);
          // Anthropic supports image blocks inside a tool_result → the model actually SEES the screenshot.
          block.content = m
            ? [{ type: "image", source: { type: "base64", media_type: m[1], data: m[2] } }, { type: "text", text: r.content }]
            : r.content;
          return block;
        }),
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Generic OpenAI-compatible (OpenAI, OpenRouter, Gemini, Mistral, Groq,
// DeepSeek, Ollama, LM Studio, self-hosted…)
// ---------------------------------------------------------------------------
function openaiProvider({ apiKey, model, baseUrl, webSearch, providerId, thinkLevel }) {
  const url = baseUrl.replace(/\/$/, "") + "/chat/completions";
  const headers = { "content-type": "application/json" };
  // Trim the key: a stray space/newline in a pasted or OAuth key makes OpenRouter reject it with a
  // cryptic 401 "User not found".
  if (apiKey && String(apiKey).trim()) headers.authorization = `Bearer ${String(apiKey).trim()}`;
  // OpenRouter attribution headers (ignored by other providers). They carry no
  // user data — just the app name/repo. CRITICAL: only send them to OpenRouter.
  // On a LOCAL server (Ollama/LM Studio) these are non-simple request headers that
  // force a CORS preflight (OPTIONS) which local servers reject → every local call
  // fails. Restricting them to OpenRouter lets local requests stay "simple" CORS.
  if (providerId === "openrouter") {
    headers["HTTP-Referer"] = "https://github.com/FlorianMartins/firefox-ai-sidebar";
    headers["X-Title"] = "Hivey AI";
  }

  return {
    id: "openai",

    async runTurn({ system, history, tools, onText, onThink, signal }) {
      const messages = system ? [{ role: "system", content: system }, ...history] : [...history];
      const lvl = thinkLevelNorm(thinkLevel);
      const body = { model, messages, stream: true };
      // Give answers room to be COMPLETE (full code/artifacts) — see orMaxTokens.
      if (providerId === "openrouter") body.max_tokens = orMaxTokens(model);
      // Web search: OpenRouter exposes a universal "web" plugin that works with
      // ANY model (including the free ones), so a fast free model can search the
      // web. Perplexity's Sonar models are online by default (nothing to add).
      if (webSearch && providerId === "openrouter") {
        body.plugins = [{ id: "web", max_results: 5 }];
      }
      // Reasoning / "thinking" for OpenAI-compatible providers. OpenRouter exposes a
      // universal `reasoning` switch that turns on a model's chain-of-thought (when it
      // supports one) and streams it back as `delta.reasoning` — which we surface in the
      // 💭 block. DeepSeek's reasoner models stream `reasoning_content` on their own.
      // We only send the param to OpenRouter; other strict APIs would reject an unknown
      // field, and models that don't reason simply ignore the toggle.
      //
      // IMPORTANT for speed/cost: many default models (gpt-oss, Nemotron, Qwen-thinking…)
      // REASON BY DEFAULT, which is slow and burns tokens. So when the Thinking toggle is
      // OFF we explicitly DISABLE reasoning for a fast, cheap, near-instant answer — and
      // only enable it when the user actually asks for it.
      if (providerId === "openrouter") {
        // Three reasoning levels: off = fully disabled (fast, cheap); high = deep Claude-style
        // reasoning (effort "high"); max = the biggest reasoning budget we allow, pushing the
        // model as far as it goes. For "max" we also raise the overall token cap so the long
        // chain-of-thought doesn't eat into the final answer and truncate the code.
        if (lvl === "max") {
          body.reasoning = { max_tokens: THINK_BUDGETS.max };
          body.max_tokens = Math.max(orMaxTokens(model), THINK_BUDGETS.max + 8000);
        } else if (lvl === "high") {
          body.reasoning = { effort: "high" };
        }
        // lvl === "off" → we DON'T send `reasoning:{enabled:false}`: some endpoints (R1,
        // Qwen-thinking, Nemotron-reasoning, gpt-oss…) make reasoning MANDATORY and reject
        // disabling it with "HTTP 400 — Reasoning is mandatory…". We simply omit the field;
        // models that reason by default will reason (hidden, since the 💭 toggle is off).
        // Quality: pin open-weight models to high-precision hosts (drop int4/int8 hosts).
        const provPref = openWeightProviderPref(model);
        if (provPref) body.provider = provPref;
      }
      if (tools && tools.length) {
        body.tools = tools.map((t) => ({
          type: "function",
          function: { name: t.name, description: t.description, parameters: t.input_schema },
        }));
      }

      let response = await fetchWithRetry(url, {
        method: "POST",
        signal,
        headers,
        body: JSON.stringify(body),
      });
      // Safety net: a few OpenRouter endpoints reject ANY reasoning override (mandatory or
      // unsupported) with a 400 mentioning "reasoning". Retry once WITHOUT the reasoning field.
      if (!response.ok && response.status === 400 && body.reasoning) {
        let errText = "";
        try { errText = await response.text(); } catch (_) {}
        if (/reasoning/i.test(errText)) {
          const retryBody = { ...body };
          delete retryBody.reasoning;
          response = await fetchWithRetry(url, { method: "POST", signal, headers, body: JSON.stringify(retryBody) });
        } else {
          throw new Error(`HTTP ${response.status} — ${errText.slice(0, 500)}`);
        }
      }
      await ensureOk(response);

      let text = "";
      let finishReason = null;
      const toolAcc = {};
      const annotations = []; // web-plugin citations (url_citation) — the REAL, resolvable source URLs

      for await (const data of sseData(response)) {
        if (data === "[DONE]") break;
        let chunk;
        try {
          chunk = JSON.parse(data);
        } catch (_) {
          continue;
        }
        const choice = chunk.choices && chunk.choices[0];
        if (!choice) continue;
        const delta = choice.delta || {};
        // Reasoning text (DeepSeek: reasoning_content ; OpenRouter: reasoning)
        const reason = delta.reasoning_content || delta.reasoning;
        if (reason) onThink && onThink(reason);
        // OpenRouter web plugin returns url_citation annotations (real source URLs) on the delta
        // and/or the final message — capture them so callers get resolvable links, not model-typed ones.
        if (Array.isArray(delta.annotations)) annotations.push(...delta.annotations);
        if (choice.message && Array.isArray(choice.message.annotations)) annotations.push(...choice.message.annotations);
        if (delta.content) {
          text += delta.content;
          onText && onText(delta.content);
        }
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const i = tc.index ?? 0;
            if (!toolAcc[i]) toolAcc[i] = { id: tc.id, name: "", args: "" };
            if (tc.id) toolAcc[i].id = tc.id;
            if (tc.function && tc.function.name) toolAcc[i].name = tc.function.name;
            if (tc.function && tc.function.arguments) toolAcc[i].args += tc.function.arguments;
          }
        }
        if (choice.finish_reason) finishReason = choice.finish_reason;
      }

      const nativeToolCalls = Object.values(toolAcc).map((t) => ({
        id: t.id,
        type: "function",
        function: { name: t.name, arguments: t.args || "{}" },
      }));

      const message = { role: "assistant", content: text || null };
      if (nativeToolCalls.length) message.tool_calls = nativeToolCalls;

      const toolCalls = nativeToolCalls.map((t) => {
        let input = {};
        try {
          input = JSON.parse(t.function.arguments || "{}");
        } catch (_) {}
        return { id: t.id, name: t.function.name, input };
      });

      return {
        message,
        toolCalls,
        stopReason: finishReason === "tool_calls" ? "tool_use" : finishReason,
        text,
        citations: extractUrlCitations(annotations),
      };
    },

    formatToolResults(results) {
      const msgs = results.map((r) => ({ role: "tool", tool_call_id: r.id, content: r.content }));
      // OpenAI tool messages can't carry images → append the screenshot(s) as a user message so
      // vision-capable models (gpt-4o, Gemini, etc.) can see them.
      const imgs = results.filter((r) => r.image);
      if (imgs.length) {
        msgs.push({
          role: "user",
          content: [
            { type: "text", text: "(Screenshot(s) returned by the tool above — read them visually.)" },
            ...imgs.map((r) => ({ type: "image_url", image_url: { url: r.image } })),
          ],
        });
      }
      return msgs;
    },
  };
}

// Build the provider for the current conversation.
export function makeProvider(settings, opts = {}) {
  const id = settings.provider;
  const meta = PROVIDERS[id] || PROVIDERS.anthropic;
  const apiKey = keyFor(id, settings);
  const model = modelFor(id, settings);
  const baseUrl = baseUrlFor(id, settings);

  // Reasoning level: prefer the explicit `thinkLevel`, fall back to the legacy boolean
  // `thinking`. Normalised to "off" | "high" | "max".
  const lvl = thinkLevelNorm(opts.thinkLevel != null ? opts.thinkLevel : opts.thinking);

  if (meta.kind === "anthropic") {
    return anthropicProvider({
      apiKey,
      model,
      baseUrl,
      thinkLevel: meta.supportsThinking ? lvl : "off",
      webSearch: !!opts.webSearch && meta.supportsWebSearch,
    });
  }
  return openaiProvider({
    apiKey,
    model,
    baseUrl,
    providerId: id,
    webSearch: !!opts.webSearch && !!meta.supportsWebSearch,
    thinkLevel: lvl,
  });
}

// OpenRouter: rich model list with vendor, display name and per-token pricing.
// Used to build the hierarchical menu (OpenRouter › vendor › model + cost).
export async function listOpenRouterRich(settings) {
  const baseUrl = baseUrlFor("openrouter", settings);
  const apiKey = keyFor("openrouter", settings);
  const headers = apiKey ? { authorization: `Bearer ${apiKey}` } : {};
  const res = await fetch(baseUrl.replace(/\/$/, "") + "/models", { headers });
  await ensureOk(res);
  const json = await res.json();
  return (json.data || []).map((m) => {
    const outMods = (m.architecture && m.architecture.output_modalities) || [];
    return {
      id: m.id,
      name: m.name || m.id,
      prompt: parseFloat((m.pricing && m.pricing.prompt) || "0"),
      completion: parseFloat((m.pricing && m.pricing.completion) || "0"),
      // Can this model OUTPUT images? (used to populate the Image tab dynamically)
      image: Array.isArray(outMods) && outMods.includes("image"),
    };
  });
}

// -------- Dynamic model listing (OpenAI /models format) ---------------------
export async function listModels(providerId, settings) {
  const meta = PROVIDERS[providerId];
  if (!meta) throw new Error("Fournisseur inconnu");
  const baseUrl = baseUrlFor(providerId, settings);
  if (!baseUrl) throw new Error("Base URL manquante.");
  const apiKey = keyFor(providerId, settings);
  const url = baseUrl.replace(/\/$/, "") + "/models";

  // Anthropic uses its own auth headers (no Bearer) for GET /v1/models.
  const headers =
    meta.kind === "anthropic"
      ? {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        }
      : apiKey
        ? { authorization: `Bearer ${apiKey}` }
        : {};

  try {
    const res = await fetch(url, { headers });
    await ensureOk(res);
    const json = await res.json();
    const data = json.data || json.models || [];
    const ids = data.map((m) => m.id || m.name).filter(Boolean).sort();
    if (ids.length) return ids;
    // Empty list on a local server → fall through to the native endpoint below.
    if (providerId === "ollama") throw new Error("empty");
    return ids;
  } catch (err) {
    // Native Ollama fallback: older/proxied Ollama builds don't serve the
    // OpenAI-compatible /v1/models. Its native /api/tags always lists installed
    // models. Strip a trailing /v1 from the base URL to reach the native root.
    if (providerId === "ollama") {
      const root = baseUrl.replace(/\/$/, "").replace(/\/v1$/, "");
      const res2 = await fetch(root + "/api/tags");
      await ensureOk(res2);
      const j2 = await res2.json();
      return (j2.models || []).map((m) => m.name || m.model).filter(Boolean).sort();
    }
    throw err;
  }
}

// -------- Audio transcription (Whisper-style /audio/transcriptions) ----------
// Powers the composer's voice-dictation fallback when the browser has no Web Speech
// API (e.g. Firefox). Posts the recorded audio to a connected OpenAI- or Groq-
// compatible endpoint and returns the recognised text. 100% BYOK — uses the user's
// own key and goes straight to the provider they chose.
export async function transcribeAudio(settings, blob) {
  const providerId = settings.provider;
  const meta = PROVIDERS[providerId];
  if (!meta) throw new Error("No transcription provider connected.");
  const baseUrl = baseUrlFor(providerId, settings);
  const apiKey = keyFor(providerId, settings);
  if (meta.needsKey && !apiKey) throw new Error(`API key missing for ${meta.label}.`);
  const model = providerId === "groq" ? "whisper-large-v3" : "whisper-1";
  const ext = (blob.type || "").includes("ogg") ? "ogg" : (blob.type || "").includes("mp4") ? "mp4" : "webm";
  const fd = new FormData();
  fd.append("file", blob, `audio.${ext}`);
  fd.append("model", model);
  const headers = {};
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  const res = await fetch(baseUrl.replace(/\/$/, "") + "/audio/transcriptions", { method: "POST", headers, body: fd });
  await ensureOk(res);
  const json = await res.json();
  return (json && (json.text || (json.results && json.results[0] && json.results[0].text))) || "";
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => { const s = String(r.result || ""); resolve(s.slice(s.indexOf(",") + 1)); };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}
// Dictation via a CHAT model that accepts AUDIO input (e.g. Gemini Flash on OpenRouter) — lets the
// mic work with just the OpenRouter key (OpenRouter has no Whisper /audio/transcriptions endpoint).
export async function transcribeAudioViaChat(settings, blob, modelId) {
  const providerId = "openrouter";
  const meta = PROVIDERS[providerId];
  if (!meta) throw new Error("OpenRouter not available.");
  const baseUrl = baseUrlFor(providerId, settings);
  const apiKey = keyFor(providerId, settings);
  if (!apiKey) throw new Error("OpenRouter API key missing.");
  const type = (blob.type || "").toLowerCase();
  const fmt = type.includes("ogg") ? "ogg" : type.includes("mp4") || type.includes("m4a") ? "mp4" : type.includes("wav") ? "wav" : type.includes("mp3") ? "mp3" : "webm";
  const b64 = await blobToBase64(blob);
  const body = {
    model: modelId || "google/gemini-2.0-flash-001",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: "Transcribe the following audio verbatim into text. Output ONLY the transcription — no preamble, no quotes, no commentary." },
        { type: "input_audio", input_audio: { data: b64, format: fmt } },
      ],
    }],
  };
  const res = await fetch(baseUrl.replace(/\/$/, "") + "/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  await ensureOk(res);
  const json = await res.json();
  const msg = json && json.choices && json.choices[0] && json.choices[0].message;
  const c = msg && msg.content;
  if (typeof c === "string") return c.trim();
  if (Array.isArray(c)) return c.map((p) => (p && (p.text || p.content)) || "").join("").trim();
  return "";
}

// -------- Image generation (OpenAI-compatible /images/generations) ----------
// Returns a list of data: (or http) URLs to display.
export async function generateImage(settings, { prompt, size, signal, initImage, initImages }) {
  // Accept one image (initImage) or several (initImages, for "mix these images" requests).
  const inputImages = (initImages && initImages.length) ? initImages : (initImage ? [initImage] : []);
  // size === "" (or unset) means: no fixed size — let the model use the dimensions
  // described in the prompt (and providers fall back to their own default).
  size = size != null ? size : (settings.imageSize || "");
  const providerId = settings.imageProvider || "openai";
  const meta = PROVIDERS[providerId];
  if (!meta || !meta.supportsImages) {
    throw new Error(
      `Le fournisseur d'images « ${providerId} » n'est pas supporté. Choisissez OpenAI dans les réglages.`
    );
  }
  const baseUrl = baseUrlFor(providerId, settings);
  const apiKey = keyFor(providerId, settings);
  if (meta.needsKey && !apiKey) throw new Error(`Clé API manquante pour ${meta.label}.`);

  // Some providers (OpenRouter, Google) generate images through the chat-completions
  // API with image "modalities" rather than /images/generations. Those models have
  // no size parameter, so — as requested — we pass the size to the model as a plain
  // INSTRUCTION inside the prompt.
  const model = settings.imageModel || (meta.imageModels && meta.imageModels[0][0]);
  if (meta.imageVia === "chat") {
    return generateImageViaChat({ baseUrl, apiKey, providerId, model, prompt, size, signal, initImages: inputImages });
  }

  // img2img / edit: when input image(s) are provided, use the /images/edits endpoint.
  if (inputImages.length) {
    return generateImageEdit({ baseUrl, apiKey, model, prompt, size, signal, initImages: inputImages });
  }

  const body = {
    model,
    prompt,
    n: 1,
  };
  if (size) body.size = size; // omit when "—" (custom): the provider uses its default
  const headers = { "content-type": "application/json" };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;

  const res = await fetch(baseUrl.replace(/\/$/, "") + "/images/generations", {
    method: "POST",
    signal,
    headers,
    body: JSON.stringify(body),
  });
  await ensureOk(res);
  const json = await res.json();
  const out = [];
  for (const item of json.data || []) {
    if (item.b64_json) out.push(`data:image/png;base64,${item.b64_json}`);
    else if (item.url) out.push(item.url);
  }
  if (!out.length) throw new Error("Aucune image renvoyée par l'API.");
  return out;
}

// Image generation through the chat-completions API with image modalities
// (OpenRouter, Google "Nano Banana", etc.). These models have no size parameter,
// so the requested size is appended to the prompt as an instruction. Returns a
// list of data: / http image URLs.
// OpenAI-compatible image EDIT (img2img): multipart /images/edits with an input image.
async function generateImageEdit({ baseUrl, apiKey, model, prompt, size, signal, initImages }) {
  const imgs = initImages || [];
  const fd = new FormData();
  fd.append("model", model);
  fd.append("prompt", prompt);
  fd.append("n", "1");
  if (size) fd.append("size", size);
  // OpenAI-compatible edits accept several reference images via image[] (used to blend/mix).
  for (let i = 0; i < imgs.length; i++) {
    const blob = await (await fetch(imgs[i])).blob();
    fd.append(imgs.length > 1 ? "image[]" : "image", blob, `image${i}.png`);
  }
  const headers = {};
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  const res = await fetch(baseUrl.replace(/\/$/, "") + "/images/edits", { method: "POST", signal, headers, body: fd });
  await ensureOk(res);
  const json = await res.json();
  const out = [];
  for (const item of json.data || []) {
    if (item.b64_json) out.push(`data:image/png;base64,${item.b64_json}`);
    else if (item.url) out.push(item.url);
  }
  if (!out.length) throw new Error("Aucune image renvoyée par l'API.");
  return out;
}

async function generateImageViaChat({ baseUrl, apiKey, providerId, model, prompt, size, signal, initImages }) {
  const url = baseUrl.replace(/\/$/, "") + "/chat/completions";
  const headers = { "content-type": "application/json" };
  if (apiKey) headers.authorization = `Bearer ${apiKey}`;
  if (providerId === "openrouter") {
    headers["HTTP-Referer"] = "https://github.com/FlorianMartins/firefox-ai-sidebar";
    headers["X-Title"] = "Hivey AI";
  }
  const sizeHint = size ? ` Target size/aspect: ${size} pixels.` : "";
  const imgs = initImages || [];
  // With input image(s), send a multimodal message so the model EDITS/MIXES them (img2img).
  const text = imgs.length > 1
    ? `Combine/blend these ${imgs.length} images into a single new image as instructed: ${prompt}.${sizeHint}`
    : imgs.length === 1
      ? `Edit this image as instructed: ${prompt}.${sizeHint}`
      : `Generate an image: ${prompt}.${sizeHint}`;
  const content = imgs.length
    ? [{ type: "text", text }, ...imgs.map((u) => ({ type: "image_url", image_url: { url: u } }))]
    : text;
  const body = {
    model,
    modalities: ["image", "text"],
    messages: [{ role: "user", content }],
  };
  const res = await fetch(url, { method: "POST", signal, headers, body: JSON.stringify(body) });
  await ensureOk(res);
  const json = await res.json();
  const out = [];
  const msg = json.choices && json.choices[0] && json.choices[0].message;
  // OpenRouter/Gemini return generated images under message.images[].image_url.url
  for (const im of (msg && msg.images) || []) {
    const u = im && (im.image_url ? im.image_url.url : im.url);
    if (u) out.push(u);
  }
  // Some return a data URL directly in the content.
  if (!out.length && typeof (msg && msg.content) === "string") {
    const m = msg.content.match(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/);
    if (m) out.push(m[0]);
  }
  if (!out.length) throw new Error("Aucune image renvoyée par le modèle (essayez un autre modèle d'image).");
  return out;
}
