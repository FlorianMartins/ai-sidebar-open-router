// Catalogue of AI providers and their default models.
// The extension is 100% BYOK: no key is bundled, the user supplies their own
// (or points at a local server that needs none).
//
// `kind`:
//   "anthropic"  -> native Anthropic API (Claude)
//   "openai"     -> OpenAI-compatible API (/chat/completions, /models, /images)
//
// Most providers (OpenAI, Gemini, Mistral, Groq, DeepSeek, OpenRouter, Ollama,
// LM Studio, self-hosted servers…) speak the OpenAI dialect, so a single generic
// client covers them all, parameterised only by `baseUrl` + `apiKey`.

export const PROVIDERS = {
  anthropic: {
    label: "Claude (Anthropic)",
    kind: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    needsKey: true,
    keysUrl: "https://console.anthropic.com/settings/keys",
    keyHint: "sk-ant-...",
    supportsThinking: true,
    supportsWebSearch: true,
    supportsImages: false,
    models: [
      ["claude-opus-4-8", "Claude Opus 4.8"],
      ["claude-sonnet-4-6", "Claude Sonnet 4.6"],
      ["claude-haiku-4-5", "Claude Haiku 4.5"],
    ],
  },

  openai: {
    label: "OpenAI",
    kind: "openai",
    baseUrl: "https://api.openai.com/v1",
    needsKey: true,
    keysUrl: "https://platform.openai.com/api-keys",
    keyHint: "sk-...",
    supportsImages: true,
    imageModels: [
      ["gpt-image-1", "GPT Image 1"],
      ["dall-e-3", "DALL·E 3"],
      ["dall-e-2", "DALL·E 2"],
    ],
    models: [
      ["gpt-4o", "GPT-4o"],
      ["gpt-4o-mini", "GPT-4o mini"],
      ["o4-mini", "o4-mini (reasoning)"],
      ["o3", "o3 (reasoning)"],
    ],
  },

  openrouter: {
    label: "OpenRouter",
    kind: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    needsKey: true,
    keysUrl: "https://openrouter.ai/keys",
    keyHint: "sk-or-...",
    canListModels: true,
    supportsWebSearch: true, // universal "web" plugin — works with any model, incl. free ones
    // Image generation on OpenRouter goes through /chat/completions with image
    // modalities (NOT /images/generations) — see providers.js. This is what lets an
    // OpenRouter-only user generate images (e.g. Google's "Nano Banana").
    supportsImages: true,
    imageVia: "chat",
    // auto-maintained by scripts/update-models.mjs
    // <models:openrouter:image:start>
    imageModels: [
      ["google/gemini-2.5-flash-image", "Nano Banana (Gemini 2.5 Flash Image)"],
      ["google/gemini-3-pro-image", "Nano Banana Pro (Gemini 3 Pro Image)"],
      ["google/gemini-3-pro-image-preview", "Nano Banana Pro (Gemini 3 Pro Image Preview)"],
      ["google/gemini-3.1-flash-image", "Nano Banana 2 (Gemini 3.1 Flash Image)"],
      ["google/gemini-3.1-flash-image-preview", "Nano Banana 2 (Gemini 3.1 Flash Image Preview)"],
      ["openai/gpt-5-image", "GPT-5 Image"],
      ["openai/gpt-5-image-mini", "GPT-5 Image Mini"],
      ["openai/gpt-5.4-image-2", "GPT-5.4 Image 2"],
    ],
    // <models:openrouter:image:end>
    // The sidebar still fetches the account's LIVE list at runtime; this curated set is
    // the fallback + out-of-the-box default (free models first, then notable paid
    // flagships). Regenerated daily by scripts/update-models.mjs from OpenRouter.
    // <models:openrouter:start>
    models: [
      ["hivey/free", "🎁 🐝 Hivey Free"],
      ["hivey/low-cost", "🟢 🐝 Hivey Low-Cost"],
      ["hivey/balanced", "🟡 🐝 Hivey"],
      ["hivey/pro", "🟠 🐝 Hivey Pro"],
      ["meta-llama/llama-3.3-70b-instruct:free", "Llama 3.3 70B Instruct — free (recommended)"],
      ["google/gemma-4-31b-it:free", "Gemma 4 31B — free"],
      ["openai/gpt-oss-120b:free", "gpt-oss-120b — free"],
      ["openai/gpt-oss-20b:free", "gpt-oss-20b — free"],
      ["qwen/qwen3-coder:free", "Qwen3 Coder 480B A35B — free"],
      ["qwen/qwen3-next-80b-a3b-instruct:free", "Qwen3 Next 80B A3B Instruct — free"],
      ["nvidia/nemotron-3-nano-30b-a3b:free", "Nemotron 3 Nano 30B A3B — free"],
      ["nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", "Nemotron 3 Nano Omni — free (reasoning)"],
      ["nvidia/nemotron-3-super-120b-a12b:free", "Nemotron 3 Super — free"],
      ["nvidia/nemotron-3-ultra-550b-a55b:free", "Nemotron 3 Ultra — free"],
      ["nvidia/nemotron-nano-12b-v2-vl:free", "Nemotron Nano 12B 2 VL — free"],
      ["nvidia/nemotron-nano-9b-v2:free", "Nemotron Nano 9B V2 — free"],
      ["cognitivecomputations/dolphin-mistral-24b-venice-edition:free", "Uncensored — free"],
      ["cohere/north-mini-code:free", "North Mini Code — free"],
      ["google/gemma-4-26b-a4b-it:free", "Gemma 4 26B A4B — free"],
      ["liquid/lfm-2.5-1.2b-instruct:free", "LFM2.5-1.2B-Instruct — free"],
      ["liquid/lfm-2.5-1.2b-thinking:free", "LFM2.5-1.2B-Thinking — free (reasoning)"],
      ["meta-llama/llama-3.2-3b-instruct:free", "Llama 3.2 3B Instruct — free"],
      ["anthropic/claude-opus-4.8-fast", "Claude Opus 4.8 (Fast) (paid)"],
      ["anthropic/claude-sonnet-4.6", "Claude Sonnet 4.6 (paid)"],
      ["openai/gpt-4o-mini-search-preview", "GPT-4o-mini Search Preview (paid)"],
      ["openai/o3-deep-research", "o3 Deep Research (reasoning) (paid)"],
      ["openai/gpt-4.1", "GPT-4.1 (paid)"],
      ["google/gemini-2.5-pro", "Gemini 2.5 Pro (paid)"],
      ["google/gemini-2.5-flash-lite-preview-09-2025", "Gemini 2.5 Flash Lite Preview 09-2025 (paid)"],
      ["deepseek/deepseek-r1-0528", "R1 0528 (reasoning) (paid)"],
      ["deepseek/deepseek-chat-v3.1", "DeepSeek V3.1 (paid)"],
      ["x-ai/grok-build-0.1", "Grok Build 0.1 (paid)"],
    ],
    // <models:openrouter:end>
  },

  google: {
    label: "Google Gemini",
    kind: "openai",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    needsKey: true,
    keysUrl: "https://aistudio.google.com/app/apikey",
    keyHint: "AIza...",
    models: [
      ["gemini-2.5-pro", "Gemini 2.5 Pro"],
      ["gemini-2.5-flash", "Gemini 2.5 Flash"],
      ["gemini-2.0-flash", "Gemini 2.0 Flash"],
    ],
  },

  mistral: {
    label: "Mistral AI",
    kind: "openai",
    baseUrl: "https://api.mistral.ai/v1",
    needsKey: true,
    keysUrl: "https://console.mistral.ai/api-keys",
    canListModels: true,
    models: [
      ["mistral-large-latest", "Mistral Large"],
      ["mistral-small-latest", "Mistral Small"],
      ["pixtral-large-latest", "Pixtral Large (vision)"],
    ],
  },

  groq: {
    label: "Groq",
    kind: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    needsKey: true,
    keysUrl: "https://console.groq.com/keys",
    canListModels: true,
    models: [
      ["llama-3.3-70b-versatile", "Llama 3.3 70B"],
      ["deepseek-r1-distill-llama-70b", "DeepSeek R1 Distill 70B"],
      ["qwen-2.5-32b", "Qwen 2.5 32B"],
    ],
  },

  deepseek: {
    label: "DeepSeek",
    kind: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    needsKey: true,
    keysUrl: "https://platform.deepseek.com/api_keys",
    models: [
      ["deepseek-chat", "DeepSeek V3 (chat)"],
      ["deepseek-reasoner", "DeepSeek R1 (reasoning)"],
    ],
  },

  xai: {
    label: "xAI (Grok)",
    kind: "openai",
    baseUrl: "https://api.x.ai/v1",
    needsKey: true,
    keysUrl: "https://console.x.ai",
    keyHint: "xai-...",
    canListModels: true,
    supportsImages: true,
    imageModels: [
      ["grok-2-image-1212", "Grok 2 Image"],
    ],
    models: [
      ["grok-2-latest", "Grok 2"],
      ["grok-2-vision-latest", "Grok 2 Vision"],
      ["grok-beta", "Grok Beta"],
    ],
  },

  perplexity: {
    label: "Perplexity",
    kind: "openai",
    baseUrl: "https://api.perplexity.ai",
    needsKey: true,
    keysUrl: "https://www.perplexity.ai/settings/api",
    keyHint: "pplx-...",
    supportsWebSearch: true, // Sonar models are online (web-grounded) by default
    models: [
      ["sonar", "Sonar"],
      ["sonar-pro", "Sonar Pro"],
      ["sonar-reasoning", "Sonar Reasoning"],
    ],
  },

  together: {
    label: "Together AI",
    kind: "openai",
    baseUrl: "https://api.together.xyz/v1",
    needsKey: true,
    keysUrl: "https://api.together.ai/settings/api-keys",
    canListModels: true,
    supportsImages: true,
    imageModels: [
      ["black-forest-labs/FLUX.1-schnell-Free", "FLUX.1 schnell (free)"],
      ["black-forest-labs/FLUX.1-schnell", "FLUX.1 schnell"],
      ["black-forest-labs/FLUX.1-dev", "FLUX.1 dev"],
      ["black-forest-labs/FLUX.1.1-pro", "FLUX 1.1 Pro"],
    ],
    models: [
      ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "Llama 3.3 70B Turbo"],
      ["deepseek-ai/DeepSeek-R1", "DeepSeek R1"],
      ["Qwen/Qwen2.5-72B-Instruct-Turbo", "Qwen2.5 72B"],
    ],
  },

  fireworks: {
    label: "Fireworks AI",
    kind: "openai",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    needsKey: true,
    keysUrl: "https://fireworks.ai/account/api-keys",
    canListModels: true,
    supportsImages: true,
    imageModels: [
      ["accounts/fireworks/models/flux-1-schnell-fp8", "FLUX.1 schnell"],
      ["accounts/fireworks/models/flux-1-dev-fp8", "FLUX.1 dev"],
    ],
    models: [
      ["accounts/fireworks/models/llama-v3p3-70b-instruct", "Llama 3.3 70B"],
      ["accounts/fireworks/models/deepseek-r1", "DeepSeek R1"],
      ["accounts/fireworks/models/qwen2p5-72b-instruct", "Qwen2.5 72B"],
    ],
  },

  deepinfra: {
    label: "DeepInfra",
    kind: "openai",
    baseUrl: "https://api.deepinfra.com/v1/openai",
    needsKey: true,
    keysUrl: "https://deepinfra.com/dash/api_keys",
    canListModels: true,
    supportsImages: true,
    imageModels: [
      ["black-forest-labs/FLUX-1-schnell", "FLUX.1 schnell"],
      ["black-forest-labs/FLUX-1-dev", "FLUX.1 dev"],
    ],
    models: [
      ["meta-llama/Llama-3.3-70B-Instruct", "Llama 3.3 70B"],
      ["deepseek-ai/DeepSeek-R1", "DeepSeek R1"],
    ],
  },

  cerebras: {
    label: "Cerebras",
    kind: "openai",
    baseUrl: "https://api.cerebras.ai/v1",
    needsKey: true,
    keysUrl: "https://cloud.cerebras.ai",
    canListModels: true,
    models: [
      ["llama-3.3-70b", "Llama 3.3 70B"],
      ["llama3.1-8b", "Llama 3.1 8B"],
    ],
  },

  cohere: {
    label: "Cohere",
    kind: "openai",
    baseUrl: "https://api.cohere.ai/compatibility/v1",
    needsKey: true,
    keysUrl: "https://dashboard.cohere.com/api-keys",
    models: [
      ["command-r-plus", "Command R+"],
      ["command-r", "Command R"],
    ],
  },

  ollama: {
    label: "Local (Ollama)",
    kind: "openai",
    baseUrl: "http://localhost:11434/v1",
    needsKey: false,
    local: true,
    canListModels: true,
    keysUrl: "https://ollama.com",
    models: [
      ["llama3.2", "llama3.2"],
      ["qwen2.5", "qwen2.5"],
      ["deepseek-r1", "deepseek-r1"],
    ],
  },

  lmstudio: {
    label: "Local (LM Studio)",
    kind: "openai",
    baseUrl: "http://localhost:1234/v1",
    needsKey: false,
    local: true,
    canListModels: true,
    keysUrl: "https://lmstudio.ai",
    models: [["local-model", "(model loaded in LM Studio)"]],
  },

  custom: {
    label: "Custom (OpenAI-compatible)",
    kind: "openai",
    baseUrl: "",
    needsKey: false,
    custom: true,
    canListModels: true,
    models: [],
  },
};

export const PROVIDER_ORDER = [
  "anthropic",
  "openai",
  "openrouter",
  "google",
  "mistral",
  "groq",
  "deepseek",
  "xai",
  "perplexity",
  "together",
  "fireworks",
  "deepinfra",
  "cerebras",
  "cohere",
  "ollama",
  "lmstudio",
  "custom",
];

// Image sizes for the OpenAI-compatible /images/generations endpoint, labelled by
// use-case. NOTE: the accepted sizes depend on the MODEL — gpt-image-1: 1024²,
// 1536×1024, 1024×1536 ; DALL·E 3: 1024², 1792×1024, 1024×1792 ; DALL·E 2: 256²,
// 512², 1024². True 4K / 1440p is not produced natively by current image models
// (upscale the result afterwards). [value, label] pairs.
export const IMAGE_SIZES = [
  ["256x256", "Favicon — carré 256² (DALL·E 2)"],
  ["512x512", "Petite icône — carré 512² (DALL·E 2)"],
  ["1024x1024", "Logo / carré HD — 1024² (tous modèles)"],
  ["1536x1024", "Paysage 3:2 — 1536×1024 (gpt-image-1)"],
  ["1024x1536", "Portrait 2:3 — 1024×1536 (gpt-image-1)"],
  ["1792x1024", "Paysage 16:9 « HD » — 1792×1024 (DALL·E 3)"],
  ["1024x1792", "Portrait 9:16 « HD » — 1024×1792 (DALL·E 3)"],
];

// Effective base URL (honours the user's override for local / custom servers).
export function baseUrlFor(providerId, settings) {
  const override = settings && settings.baseUrls && settings.baseUrls[providerId];
  return (override && override.trim()) || PROVIDERS[providerId].baseUrl;
}

// Selected model for this provider (falls back to the first default).
// ----- "Hivey" smart auto-routing ------------------------------------------
// One selectable pseudo-model that routes EACH task to the best OpenRouter model for the
// job — cheap models for housekeeping, an affordable strong model for chat/code, premium
// for heavy reasoning and the agent, and a premium image model — so big models (Opus) are
// only spent when they're actually needed. All via the user's OpenRouter key.
// ── Hivey: four smart-routing pseudo-models, cheapest → priciest ────────────
// Each routes EVERY task to the best model of its budget. Tiers: utility=router +
// housekeeping (never user-facing), light=trivial (kept cheap), chat=everyday
// substantive answers (the BEST FORMATTER of the budget), code=real programming,
// reasoning=deep/hardest, agent=tools, search=cheap web-research fetcher (a small
// model gathers, then the routed model analyses), image=picture gen. `emoji`/`color`
// = the price dot in the picker.
//  • free     🎁 → 100% free models ($0).
//  • low-cost 🟢 → all cheap, no Claude (DeepSeek family).
//  • balanced 🟡 → affordable & efficient: cheap everyday, Sonnet for code/reasoning.
//  • pro      🟠 → smartest: Sonnet everyday, Opus for code/reasoning, Nano Banana Pro;
//                  small models on repetitive work keep the budget moderate.
export const HIVEY_DEFAULT = "hivey/balanced";
export const HIVEY_AUTO = HIVEY_DEFAULT; // back-compat alias for old imports
// Legacy selection ids → current variant (so a persisted choice keeps working).
const HIVEY_ALIASES = { "hivey/auto": "hivey/low-cost", "hivey/premium": "hivey/pro" };
// Each variant maps the SAME capability keys to the best model of its budget — leaning on
// the strength of each provider (Gemini→search/extract, Claude→code/writing, Qwen→tests,
// DeepSeek-R1→math) while staying in the variant's price range.
export const HIVEY_VARIANTS = {
  "hivey/free": {
    label: "Hivey Free", emoji: "🎁", color: "#34d399",
    tiers: {
      router: "openrouter|meta-llama/llama-3.3-70b-instruct:free",   // dispatcher (best free classifier)
      utility: "openrouter|meta-llama/llama-3.2-3b-instruct:free",   // housekeeping (titles/summaries/verify)
      light: "openrouter|meta-llama/llama-3.2-3b-instruct:free",
      chat: "openrouter|meta-llama/llama-3.3-70b-instruct:free",
      code: "openrouter|qwen/qwen3-coder:free",
      test: "openrouter|qwen/qwen3-coder:free",
      reasoning: "openrouter|nvidia/nemotron-3-super-120b-a12b:free",
      math: "openrouter|nvidia/nemotron-3-super-120b-a12b:free",
      creative: "openrouter|meta-llama/llama-3.3-70b-instruct:free",
      extract: "openrouter|meta-llama/llama-3.2-3b-instruct:free",
      agent: "openrouter|qwen/qwen3-coder:free",                     // tool-capable free model
      search: "openrouter|meta-llama/llama-3.3-70b-instruct:free",
      image: "openrouter|google/gemini-2.5-flash-image",             // no free image gen on OpenRouter — cheapest
    },
  },
  "hivey/low-cost": {
    label: "Hivey Low-Cost", emoji: "🟢", color: "#34d399",
    tiers: {
      router: "openrouter|deepseek/deepseek-chat-v3.1",             // dispatcher (cheap, decent classifier)
      utility: "openrouter|google/gemini-2.5-flash-lite",
      light: "openrouter|deepseek/deepseek-chat-v3.1",
      chat: "openrouter|deepseek/deepseek-chat-v3.1",
      code: "openrouter|deepseek/deepseek-chat-v3.1",
      test: "openrouter|qwen/qwen3-coder:free",                     // Qwen = strong, free, great at tests
      reasoning: "openrouter|deepseek/deepseek-r1-0528",            // cheap strong reasoner
      math: "openrouter|deepseek/deepseek-r1-0528",
      creative: "openrouter|deepseek/deepseek-chat-v3.1",
      extract: "openrouter|google/gemini-2.5-flash-lite",
      agent: "openrouter|deepseek/deepseek-chat-v3.1",
      search: "openrouter|google/gemini-2.5-flash-lite",           // Gemini for search/grounding
      image: "openrouter|google/gemini-2.5-flash-image",
    },
  },
  "hivey/balanced": {
    label: "Hivey", emoji: "🟡", color: "#fbbf24",
    // Claude Sonnet 4.6 does the substantive heavy lifting (always ≥ Low-Cost, and a
    // mis-route still lands on a strong model); specialised cheaper models take what their
    // provider is best at (Gemini search/extract, Qwen tests, R1 math). Opus = dispatcher.
    tiers: {
      router: "openrouter|anthropic/claude-opus-4.8",               // smart dispatcher
      utility: "openrouter|google/gemini-2.5-flash-lite",            // housekeeping (cheap)
      light: "openrouter|google/gemini-2.5-flash",                   // trivial answers (cheap but capable)
      chat: "openrouter|anthropic/claude-sonnet-4.6",                // everyday substantive answers
      code: "openrouter|anthropic/claude-sonnet-4.6",                // Claude = best code
      test: "openrouter|qwen/qwen3-coder:free",                     // Qwen = tests
      reasoning: "openrouter|anthropic/claude-sonnet-4.6",
      math: "openrouter|deepseek/deepseek-r1-0528",                 // R1 = strong, cheap math/reasoning
      creative: "openrouter|anthropic/claude-sonnet-4.6",           // Claude = best writing
      extract: "openrouter|google/gemini-2.5-flash",               // Gemini = fast structured extraction
      agent: "openrouter|anthropic/claude-sonnet-4.6",
      search: "openrouter|google/gemini-2.5-flash",                  // Gemini = search; Sonnet analyses
      image: "openrouter|google/gemini-2.5-flash-image",
    },
  },
  "hivey/pro": {
    label: "Hivey Pro", emoji: "🟠", color: "#fb923c",
    tiers: {
      router: "openrouter|anthropic/claude-opus-4.8",               // smart dispatcher
      utility: "openrouter|google/gemini-2.5-flash-lite",            // housekeeping stays cheap
      light: "openrouter|google/gemini-2.5-flash",
      chat: "openrouter|anthropic/claude-sonnet-4.6",                // everyday: best response formatting
      code: "openrouter|anthropic/claude-opus-4.8",                  // code with Opus 4.8
      // Code pipeline: Opus DESIGNS the solution, a cheaper reliable model WRITES it.
      codePlanner: "openrouter|anthropic/claude-opus-4.8",
      codeWriter: "openrouter|anthropic/claude-sonnet-4.6",
      test: "openrouter|anthropic/claude-sonnet-4.6",               // reliable premium tests
      reasoning: "openrouter|anthropic/claude-opus-4.8",
      math: "openrouter|anthropic/claude-opus-4.8",
      creative: "openrouter|anthropic/claude-sonnet-4.6",           // Claude = best writing
      extract: "openrouter|google/gemini-2.5-flash",               // Gemini = fast structured extraction
      agent: "openrouter|anthropic/claude-sonnet-4.6",               // reliable tool agent
      search: "openrouter|google/gemini-2.5-flash",                  // Gemini = search; Opus/Sonnet analyses
      image: "openrouter|google/gemini-3-pro-image",                 // Nano Banana Pro (top image)
    },
  },
};
// Extra capability regexes for the heuristic fallback (used only if the dispatcher fails).
const HIVEY_TEST_RE = /\b(test unitaire|tests? unitaires|unit ?test|pytest|jest|vitest|mocha|junit|test ?case|couverture de test|écris des tests|write tests?)\b/i;
const HIVEY_MATH_RE = /math[ée]matiqu|[ée]quation|int[ée]grale|d[ée]riv[ée]e|th[ée]or[èe]me|d[ée]montre|\bprouve\b|\bprove\b|probabilit|statistiqu|\bcalcul|alg[èe]bre|g[ée]om[ée]trie/i;
const HIVEY_SEARCH_RE = /\b(cherche|recherche|google|actualit|derni[èe]res? nouvelles|news|m[ée]t[ée]o|cours (de|du)|prix (de|du|actuel)|aujourd'?hui|en ce moment|r[ée]cent|qui est|sur le web|on the web|latest)\b/i;
const HIVEY_CREATIVE_RE = /\b(po[èe]me|poem|histoire|story|nouvelle|slogan|marketing|publicit|r[ée]dige|[ée]cris (un|une|moi) (texte|article|mail|email|lettre|post|tweet|description|bio)|brainstorm|id[ée]es de)\b/i;
// Tier KEY chosen for a chat turn (used by the orchestrator to know the task type).
export function hiveyHeuristicKey(text) {
  const t = text || "";
  if (HIVEY_TEST_RE.test(t)) return "test";
  if (HIVEY_CODE_RE.test(t)) return "code";
  if (HIVEY_SEARCH_RE.test(t)) return "search";
  if (HIVEY_MATH_RE.test(t)) return "math";
  if (HIVEY_CREATIVE_RE.test(t)) return "creative";
  if (t.length > 1800 || HIVEY_HARD_RE.test(t)) return "reasoning";
  return "chat";
}
// Map the dispatcher's word to a capability KEY. Unknown words fall back to "chat".
export function hiveyLabelKey(label) {
  const k = String(label || "").toLowerCase().replace(/[^a-z]/g, "");
  if (k.startsWith("light") || k.startsWith("trivial") || k.startsWith("simple")) return "light";
  if (k.startsWith("test")) return "test";
  if (k.startsWith("debug") || k.startsWith("code") || k.startsWith("program")) return "code";
  if (k.startsWith("search") || k.startsWith("web") || k.startsWith("lookup")) return "search";
  if (k.startsWith("math")) return "math";
  if (k.startsWith("creativ") || k.startsWith("write") || k.startsWith("writing")) return "creative";
  if (k.startsWith("extract") || k.startsWith("summar")) return "extract";
  if (k.startsWith("hard") || k.startsWith("reason")) return "reasoning";
  return "chat"; // normal / unknown
}
export function isHivey(modelId) { return !!(modelId && (HIVEY_VARIANTS[modelId] || HIVEY_ALIASES[modelId])); }
export function hiveyVariant(modelId) {
  return HIVEY_VARIANTS[modelId] || HIVEY_VARIANTS[HIVEY_ALIASES[modelId]] || HIVEY_VARIANTS[HIVEY_DEFAULT];
}
export function hiveyTiers(modelId) { return hiveyVariant(modelId).tiers; }
// Heuristic fallback (used only if the LLM router fails/stalls). Word PREFIXES so
// "raisonner", "stratégie", "optimiser"… all match. Order: deep reasoning → reasoning,
// else real coding → code, else everyday → chat.
const HIVEY_HARD_RE = /\b(raisonn|r[ée]fl[ée]ch|reason|think hard|think step|strat[ée]g|architect|d[ée]montr|prove|theorem|optimis|algorith|complex|complexe|approfondi|deep.?dive|trade.?off|audit|[ée]tape par [ée]tape|step by step|plan d[ée]taill|en profondeur|benchmark|s[ée]curit|security|scalab|math|prouv)/i;
const HIVEY_CODE_RE = /\b(code|coder|cod(e|er|ing)|programm|fonction|function|classe|class|m[ée]thode|method|bug|debug|d[ée]bogu|refactor|compil|script|react|vue\b|angular|svelte|next\.?js|node|python|javascript|typescript|\bjava\b|kotlin|swift|rust|golang|\bgo\b|\bc\+\+|csharp|\bc#|\bphp\b|\bsql\b|regex|\bapi\b|endpoint|stack ?trace|exception|impl[ée]ment|d[ée]ploie|deploy|tailwind|\bcss\b|\bhtml\b|component|composant)/i;
export function hiveyTierFor(modelId, mode, text) {
  const T = hiveyTiers(modelId);
  if (mode === "image") return T.image;
  if (mode === "translate" || mode === "improve") return T.utility;
  if (mode === "agent") return T.agent;
  const t = text || "";
  if (t.length > 1800 || HIVEY_HARD_RE.test(t)) return T.reasoning;
  if (HIVEY_CODE_RE.test(t)) return T.code;
  return T.chat;
}

// ── Hivey LLM router (the "dispatcher") ─────────────────────────────────────
// Before answering, the variant's `router` model — the SMARTEST model of the budget
// (Claude Opus 4.8 on the paid tiers) — classifies the request, so the right model
// answers and money is spent where it buys performance. The router NEVER answers.
export function hiveyRouterModel(modelId) { const T = hiveyTiers(modelId); return T.router || T.utility; }
export const HIVEY_ROUTER_SYSTEM =
  "You are the DISPATCHER of a team of specialised AI models. Read the user's last message " +
  "(with any context) and pick the SINGLE capability that best fits, so the model that is " +
  "strongest at that capability handles it. Correctness/quality first, cost second — never " +
  "downgrade a task that needs real capability. Reply with EXACTLY ONE word, no punctuation:\n" +
  "- light = truly trivial: greeting, small talk, a yes/no or one-line factual answer, a simple reformat.\n" +
  "- normal = everyday substantive answer: explanations, summaries, general questions, advice.\n" +
  "- code = writing, completing, fixing, reviewing or reasoning about source code (functions, components, scripts, games, algorithms in code, debugging). When unsure between normal and code, choose code.\n" +
  "- test = writing or fixing automated TESTS specifically (unit/integration tests, pytest/jest/etc.).\n" +
  "- math = mathematics: equations, calculus, proofs, probability/statistics, symbolic work.\n" +
  "- search = needs CURRENT/up-to-date or external info: news, prices, weather, recent events, looking something up on the web.\n" +
  "- creative = creative writing: stories, poems, marketing copy, slogans, brainstorming, drafting emails/articles.\n" +
  "- hard = deep non-code reasoning: system architecture, hard algorithms, performance, security analysis, multi-step strategy, careful long analysis.\n" +
  "Output ONLY one of: light, normal, code, test, math, search, creative, hard. Never answer the question.";
// Map the router's word to a tier model id within the chosen Hivey variant.
export function hiveyTierForLabel(modelId, label) {
  const T = hiveyTiers(modelId);
  const k = String(label || "").toLowerCase().replace(/[^a-z]/g, "");
  if (k.startsWith("hard")) return T.reasoning;
  if (k.startsWith("code")) return T.code;
  if (k.startsWith("light") || k.startsWith("simple") || k.startsWith("trivial")) return T.light || T.chat;
  return T.chat; // normal + anything unrecognised
}

export function modelFor(providerId, settings) {
  const chosen = settings && settings.models && settings.models[providerId];
  if (chosen) return chosen;
  const def = PROVIDERS[providerId].models[0];
  return def ? def[0] : "";
}

export function keyFor(providerId, settings) {
  return (settings && settings.keys && settings.keys[providerId]) || "";
}

// A provider is "connected" (usable) if it has a key, is a local server, or is a
// custom endpoint with a base URL. Used to build the single unified model picker.
export function isConnected(providerId, settings) {
  const meta = PROVIDERS[providerId];
  if (!meta) return false;
  // Local servers require an explicit opt-in (enabled in settings or a custom URL),
  // so a brand-new install shows no default models — only a "connect" button.
  if (meta.local) {
    return !!(
      (settings && settings.localEnabled && settings.localEnabled[providerId]) ||
      (settings && settings.baseUrls && settings.baseUrls[providerId])
    );
  }
  if (meta.custom) return !!(settings && settings.baseUrls && settings.baseUrls[providerId]);
  return !!keyFor(providerId, settings);
}

export function connectedProviders(settings) {
  return PROVIDER_ORDER.filter((id) => isConnected(id, settings));
}

// Pick a sensible model for WEB SEARCH mode, so we don't spend Claude on it.
// Prefers Perplexity Sonar (online by default), then OpenRouter (its "web" plugin
// works with any model, including the free ones), then any other connected
// web-capable provider. Returns "providerId|modelId" or "" if none is available.
export function defaultSearchModel(settings) {
  if (isConnected("perplexity", settings)) return "perplexity|" + modelFor("perplexity", settings);
  if (isConnected("openrouter", settings)) return "openrouter|" + modelFor("openrouter", settings);
  for (const id of connectedProviders(settings)) {
    if (PROVIDERS[id].supportsWebSearch) return id + "|" + modelFor(id, settings);
  }
  return "";
}

// Writing presets for the "Improve" workspace, Sider-style. Each maps to an
// instruction injected into the prompt. The label is shown in the UI (FR).
export const WRITING_PRESETS = [
  ["improve", "Améliorer (clarté & grammaire)", "Améliore ce texte : clarté, style, grammaire et fluidité, en gardant la langue et l'intention d'origine."],
  ["shorten", "Raccourcir", "Raccourcis ce texte en gardant l'essentiel et le sens."],
  ["expand", "Développer / détailler", "Développe et enrichis ce texte avec plus de détails et d'exemples pertinents."],
  ["simplify", "Simplifier", "Reformule ce texte de façon simple et accessible (niveau grand public)."],
  ["formal", "Plus formel", "Réécris ce texte dans un registre formel et professionnel."],
  ["friendly", "Plus amical", "Réécris ce texte sur un ton chaleureux, amical et accessible."],
  ["marketing", "Marketing / copywriting", "Réécris ce texte comme un copywriter : accrocheur, orienté bénéfices, avec un appel à l'action clair."],
  ["newsletter", "Newsletter", "Transforme ce texte en section de newsletter engageante : titre accrocheur, ton conversationnel, et une conclusion incitative."],
  ["email", "Email professionnel", "Rédige un email professionnel clair et poli à partir de ce contenu (objet + corps + formule de politesse)."],
  ["linkedin", "Post LinkedIn", "Transforme ce texte en post LinkedIn percutant : accroche forte, paragraphes courts, et quelques hashtags pertinents."],
  ["tweet", "Post X / Tweet", "Condense ce texte en un post X percutant (≤ 280 caractères), avec éventuellement 1–2 hashtags."],
  ["blog", "Article de blog", "Développe ce texte en article de blog structuré (titre, intertitres, intro, conclusion) au ton informatif."],
  ["academic", "Académique", "Réécris ce texte dans un style académique, précis et neutre, avec un vocabulaire soutenu."],
  ["storytelling", "Storytelling", "Réécris ce texte sous forme de narration immersive (storytelling) qui capte l'attention."],
];
