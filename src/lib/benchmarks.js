// 🎯 Curated benchmark index per model family & per capability category.
//
// OpenRouter (and the other providers' /models endpoints) expose NO benchmark/quality field,
// so a model's "accuracy %" can't be read live. This table is a CURATED, approximate quality
// index (0–100) per model family and per task category, used to RANK and label the models in
// each tab's picker by how good they are at THAT tab's specialty (chat=global, agent=agentic,
// image=image generation, translate=multilingual, improve=writing, pdf=document reasoning,
// code/terminal=coding). Values are relative, hand-tuned estimates — not official scores — and
// are matched to a model by id substring (most specific family first).
//
// Categories: global · agent · code · reasoning · multilingual · writing · image

// Each entry: [regex on the lowercased model id, { category: score }]. First match wins.
const FAMILIES = [
  // ── Anthropic Claude ──────────────────────────────────────────────────────
  [/claude.*opus|opus.*4/, { global: 90, agent: 93, code: 91, reasoning: 91, multilingual: 87, writing: 91 }],
  [/claude.*sonnet|sonnet.*4|3\.7-sonnet|3\.5-sonnet/, { global: 87, agent: 89, code: 88, reasoning: 86, multilingual: 85, writing: 89 }],
  [/claude.*haiku|haiku/, { global: 79, agent: 78, code: 78, reasoning: 75, multilingual: 78, writing: 81 }],
  [/claude/, { global: 84, agent: 85, code: 85, reasoning: 83, multilingual: 84, writing: 86 }],
  // ── OpenAI ────────────────────────────────────────────────────────────────
  [/gpt-5|o3(?!-mini)|o4(?!-mini)/, { global: 89, agent: 89, code: 89, reasoning: 92, multilingual: 87, writing: 88 }],
  [/o1|o3-mini|o4-mini/, { global: 84, agent: 82, code: 86, reasoning: 90, multilingual: 80, writing: 80 }],
  [/gpt-4\.1|gpt-4o|gpt-4-turbo|chatgpt-4o/, { global: 85, agent: 85, code: 84, reasoning: 81, multilingual: 86, writing: 86 }],
  [/gpt-oss-120b/, { global: 79, agent: 73, code: 77, reasoning: 77, multilingual: 72, writing: 74 }],
  [/gpt-oss-20b|gpt-oss/, { global: 71, agent: 63, code: 69, reasoning: 67, multilingual: 64, writing: 68 }],
  [/gpt-image|dall-e-3|dall-e/, { image: 86, global: 60 }],
  [/gpt-4o-mini|gpt-4\.1-mini|gpt-3\.5/, { global: 74, agent: 68, code: 72, reasoning: 68, multilingual: 76, writing: 76 }],
  // ── Google Gemini / Gemma ────────────────────────────────────────────────
  [/gemini.*image|nano-banana|flash-image|imagen/, { image: 91, global: 70 }],
  [/gemini.*(3.*pro|2\.5-pro|2-pro|pro)/, { global: 88, agent: 86, code: 85, reasoning: 88, multilingual: 88, writing: 86 }],
  [/gemini.*flash|gemini-2\.0|gemini-1\.5/, { global: 81, agent: 77, code: 77, reasoning: 77, multilingual: 85, writing: 80 }],
  [/gemini/, { global: 83, agent: 80, code: 80, reasoning: 82, multilingual: 86, writing: 82 }],
  [/gemma-4|gemma4/, { global: 72, agent: 60, code: 66, reasoning: 66, multilingual: 76, writing: 73 }],
  [/gemma/, { global: 66, agent: 52, code: 60, reasoning: 60, multilingual: 70, writing: 68 }],
  // ── xAI Grok ──────────────────────────────────────────────────────────────
  [/grok.*image|aurora/, { image: 84, global: 70 }],
  [/grok/, { global: 85, agent: 81, code: 81, reasoning: 83, multilingual: 82, writing: 83 }],
  // ── DeepSeek ─────────────────────────────────────────────────────────────
  [/deepseek-r1|deepseek.*r1|r1-/, { global: 84, agent: 78, code: 85, reasoning: 91, multilingual: 80, writing: 80 }],
  [/deepseek.*v3|deepseek-chat|deepseek-v3/, { global: 83, agent: 77, code: 85, reasoning: 81, multilingual: 82, writing: 82 }],
  [/deepseek/, { global: 81, agent: 75, code: 83, reasoning: 84, multilingual: 80, writing: 79 }],
  // ── Qwen ──────────────────────────────────────────────────────────────────
  [/qwen3-coder|qwen.*coder|qwen2\.5-coder/, { global: 79, agent: 81, code: 87, reasoning: 77, multilingual: 80, writing: 75 }],
  [/qwen3-next|qwen3-235b|qwen3-max|qwen-max/, { global: 81, agent: 75, code: 79, reasoning: 79, multilingual: 84, writing: 80 }],
  [/qwen3|qwen-3|qwen2\.5/, { global: 77, agent: 70, code: 77, reasoning: 76, multilingual: 82, writing: 76 }],
  [/qwen/, { global: 73, agent: 64, code: 73, reasoning: 70, multilingual: 80, writing: 72 }],
  // ── Meta Llama ────────────────────────────────────────────────────────────
  [/llama-4-maverick|llama4-maverick|maverick/, { global: 80, agent: 74, code: 76, reasoning: 76, multilingual: 82, writing: 78 }],
  [/llama-4-scout|llama4-scout|scout/, { global: 76, agent: 70, code: 72, reasoning: 71, multilingual: 79, writing: 75 }],
  [/llama-3\.3|llama3\.3|llama-3-70|70b-instruct/, { global: 76, agent: 68, code: 70, reasoning: 70, multilingual: 78, writing: 76 }],
  [/llama-3\.2-3b|llama-3\.2-1b|3b-instruct|1b-instruct/, { global: 55, agent: 40, code: 48, reasoning: 47, multilingual: 58, writing: 56 }],
  [/llama/, { global: 70, agent: 60, code: 65, reasoning: 64, multilingual: 73, writing: 70 }],
  // ── NVIDIA Nemotron ──────────────────────────────────────────────────────
  [/nemotron.*(ultra|super|340|253|120)/, { global: 80, agent: 70, code: 74, reasoning: 82, multilingual: 74, writing: 74 }],
  [/nemotron.*(vl|omni|vision)/, { global: 67, agent: 55, code: 60, reasoning: 64, multilingual: 66, writing: 64, image: 60 }],
  [/nemotron/, { global: 67, agent: 56, code: 62, reasoning: 66, multilingual: 66, writing: 64 }],
  // ── Mistral ──────────────────────────────────────────────────────────────
  [/mistral-large|mistral-medium|pixtral-large/, { global: 80, agent: 72, code: 78, reasoning: 76, multilingual: 85, writing: 80 }],
  [/mixtral|mistral-small|ministral|mistral/, { global: 72, agent: 60, code: 70, reasoning: 66, multilingual: 80, writing: 72 }],
  // ── Cohere ───────────────────────────────────────────────────────────────
  [/command-a|command-r-plus|command/, { global: 75, agent: 66, code: 70, reasoning: 68, multilingual: 82, writing: 76 }],
  [/north-mini-code|north/, { global: 70, agent: 66, code: 78, reasoning: 64, multilingual: 70, writing: 66 }],
  // ── Image-generation specialists ─────────────────────────────────────────
  [/flux.*(pro|1\.1|ultra)/, { image: 90, global: 40 }],
  [/flux.*(dev|schnell)|flux/, { image: 82, global: 40 }],
  [/stable-diffusion|sd3|sd-3|sdxl|stable/, { image: 78, global: 40 }],
  [/playground|ideogram|recraft|kandinsky|kolors/, { image: 80, global: 40 }],
  // ── Others / small ────────────────────────────────────────────────────────
  [/dolphin|venice|uncensored/, { global: 64, agent: 48, code: 60, reasoning: 58, multilingual: 64, writing: 72 }],
  [/phi-/, { global: 68, agent: 52, code: 66, reasoning: 66, multilingual: 64, writing: 66 }],
  [/lfm|liquid/, { global: 52, agent: 38, code: 46, reasoning: 46, multilingual: 54, writing: 54 }],
  [/glm|chatglm|yi-|zhipu/, { global: 76, agent: 66, code: 76, reasoning: 74, multilingual: 80, writing: 74 }],
  [/kimi|moonshot/, { global: 78, agent: 70, code: 76, reasoning: 76, multilingual: 80, writing: 76 }],
];

// Map a workspace tab (mode) to the benchmark category its picker should rank by.
export function categoryForMode(mode) {
  switch (mode) {
    case "agent": return "agent";
    case "translate": return "multilingual";
    case "improve": return "writing";
    case "image": return "image";
    case "pdf": return "reasoning";
    case "code":
    case "terminal": return "code";
    case "chat":
    default: return "global";
  }
}

// Short FR label for a category — shown in the picker's metric caption.
export function categoryLabel(cat) {
  return ({
    global: "global", agent: "agentique", code: "code", reasoning: "analyse",
    multilingual: "traduction", writing: "rédaction", image: "image",
  })[cat] || cat;
}

// Vendor-level fallback so that even a model whose exact family isn't listed still gets a
// reasonable score from its maker's typical strength (keyed by the id's vendor prefix). This
// is what stops the picker from showing "—" on most models.
const VENDORS = {
  anthropic: { global: 85, agent: 87, code: 86, reasoning: 84, multilingual: 84, writing: 87 },
  openai: { global: 84, agent: 83, code: 83, reasoning: 84, multilingual: 84, writing: 84 },
  google: { global: 82, agent: 78, code: 79, reasoning: 81, multilingual: 85, writing: 81 },
  "x-ai": { global: 84, agent: 80, code: 80, reasoning: 82, multilingual: 81, writing: 82 },
  xai: { global: 84, agent: 80, code: 80, reasoning: 82, multilingual: 81, writing: 82 },
  "meta-llama": { global: 73, agent: 64, code: 68, reasoning: 67, multilingual: 76, writing: 73 },
  meta: { global: 73, agent: 64, code: 68, reasoning: 67, multilingual: 76, writing: 73 },
  qwen: { global: 77, agent: 70, code: 78, reasoning: 76, multilingual: 82, writing: 75 },
  deepseek: { global: 82, agent: 76, code: 84, reasoning: 84, multilingual: 80, writing: 80 },
  mistralai: { global: 75, agent: 64, code: 73, reasoning: 70, multilingual: 83, writing: 75 },
  mistral: { global: 75, agent: 64, code: 73, reasoning: 70, multilingual: 83, writing: 75 },
  nvidia: { global: 72, agent: 60, code: 66, reasoning: 72, multilingual: 70, writing: 68 },
  cohere: { global: 74, agent: 64, code: 70, reasoning: 68, multilingual: 81, writing: 74 },
  microsoft: { global: 70, agent: 56, code: 68, reasoning: 67, multilingual: 66, writing: 67 },
  "01-ai": { global: 74, agent: 62, code: 72, reasoning: 72, multilingual: 78, writing: 72 },
  moonshotai: { global: 78, agent: 70, code: 76, reasoning: 76, multilingual: 80, writing: 76 },
  "z-ai": { global: 76, agent: 66, code: 76, reasoning: 74, multilingual: 80, writing: 74 },
  zhipu: { global: 76, agent: 66, code: 76, reasoning: 74, multilingual: 80, writing: 74 },
  perplexity: { global: 78, agent: 66, code: 70, reasoning: 74, multilingual: 76, writing: 74 },
  "black-forest-labs": { image: 88, global: 40 },
  stabilityai: { image: 76, global: 40 },
  // Generic catch-all so an unlisted maker still shows an (honest, modest) estimate.
  _default: { global: 64, agent: 52, code: 60, reasoning: 60, multilingual: 66, writing: 64 },
};

function pick(scores, category) {
  if (category === "image") return scores.image != null ? scores.image : null;
  const v = scores[category];
  if (v != null) return v;
  return scores.global != null ? scores.global : null;
}

// Curated accuracy index (0–100) for a model id in a category, or null if unknown.
// For the "image" category we never fall back to a text score (a chat-only model has no
// image score); for text categories we fall back to the family's global score, then the
// vendor baseline, then a generic baseline — so the picker almost always shows a number.
export function modelScore(modelId, category) {
  const id = (modelId || "").toLowerCase();
  for (const [re, scores] of FAMILIES) {
    if (re.test(id)) return pick(scores, category);
  }
  const vendor = id.split("/")[0];
  const vb = VENDORS[vendor];
  if (vb) { const v = pick(vb, category); if (v != null) return v; }
  // For image category we don't invent a score for a non-image vendor.
  if (category === "image") return null;
  return pick(VENDORS._default, category);
}
