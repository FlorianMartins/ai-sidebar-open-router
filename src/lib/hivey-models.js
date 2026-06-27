// 🐝 Hivey model assignments — the OpenRouter model behind each tier/role of each variant.
//
// AUTO-CURATED by scripts/update-models.mjs (daily, after the catalogue refresh): an LLM
// curator re-picks the best AVAILABLE model per role/budget when a clearly better one ships
// (it knows model benchmarks/reputation). Every id is validated against the live catalogue,
// so a removed model is never kept. Hand-edits here are allowed but may be overwritten by
// the next curation — change the curation prompt in update-models.mjs for lasting tweaks.
//
// <hivey:start>
export const HIVEY_MODELS = {
  "hivey/free": {
    "router": "meta-llama/llama-3.3-70b-instruct:free",
    "utility": "meta-llama/llama-3.3-70b-instruct:free",
    "light": "meta-llama/llama-3.3-70b-instruct:free",
    "chat": "meta-llama/llama-3.3-70b-instruct:free",
    "code": "qwen/qwen3-coder:free",
    "test": "qwen/qwen3-coder:free",
    "reasoning": "nvidia/nemotron-3-super-120b-a12b:free",
    "math": "qwen/qwq-32b:free",
    "creative": "meta-llama/llama-3.3-70b-instruct:free",
    "extract": "meta-llama/llama-3.3-70b-instruct:free",
    "vision": "nvidia/nemotron-nano-12b-v2-vl:free",
    "verify": "meta-llama/llama-3.3-70b-instruct:free",
    "agent": "qwen/qwen3-coder:free",
    "search": "meta-llama/llama-3.3-70b-instruct:free",
    "image": "google/gemini-3.1-flash-image"
  },
  "hivey/low-cost": {
    "router": "deepseek/deepseek-chat-v3.1",
    "utility": "google/gemini-3.1-flash-lite",
    "light": "deepseek/deepseek-chat-v3.1",
    "chat": "deepseek/deepseek-chat-v3.1",
    "code": "deepseek/deepseek-chat-v3.1",
    "test": "qwen/qwen3-coder:free",
    "reasoning": "deepseek/deepseek-r1-0528",
    "math": "qwen/qwq-32b",
    "creative": "deepseek/deepseek-chat-v3.1",
    "extract": "google/gemini-3.1-flash-lite",
    "vision": "google/gemini-3.1-flash-lite",
    "verify": "deepseek/deepseek-chat-v3.1",
    "agent": "deepseek/deepseek-chat-v3.1",
    "search": "google/gemini-3.1-flash-lite",
    "image": "google/gemini-3.1-flash-image"
  },
  "hivey/balanced": {
    "router": "anthropic/claude-opus-4.8",
    "utility": "google/gemini-3.1-flash-lite",
    "light": "google/gemini-3.5-flash",
    "chat": "anthropic/claude-sonnet-4.6",
    "code": "anthropic/claude-sonnet-4.6",
    "test": "qwen/qwen3-coder:free",
    "reasoning": "anthropic/claude-sonnet-4.6",
    "math": "qwen/qwq-32b",
    "creative": "anthropic/claude-sonnet-4.6",
    "extract": "google/gemini-3.5-flash",
    "vision": "google/gemini-3.5-flash",
    "verify": "google/gemini-3.5-flash",
    "agent": "anthropic/claude-sonnet-4.6",
    "search": "google/gemini-3.5-flash",
    "image": "google/gemini-3.1-flash-image"
  },
  "hivey/pro": {
    "router": "anthropic/claude-opus-4.8",
    "utility": "google/gemini-3.1-flash-lite",
    "light": "google/gemini-3.1-flash-lite",
    "chat": "anthropic/claude-sonnet-4.6",
    "code": "anthropic/claude-opus-4.8",
    "codePlanner": "anthropic/claude-opus-4.8",
    "codeWriter": "anthropic/claude-sonnet-4.6",
    "test": "anthropic/claude-sonnet-4.6",
    "reasoning": "anthropic/claude-opus-4.8",
    "math": "qwen/qwen3.7-max",
    "creative": "anthropic/claude-sonnet-4.6",
    "extract": "google/gemini-3.5-flash",
    "vision": "google/gemini-3.5-flash",
    "verify": "anthropic/claude-sonnet-4.6",
    "agent": "anthropic/claude-sonnet-4.6",
    "search": "google/gemini-3.5-flash",
    "image": "google/gemini-3-pro-image"
  }
};
// <hivey:end>
