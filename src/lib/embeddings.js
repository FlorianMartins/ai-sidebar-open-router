// Local sentence embeddings for the Wisebase RAG — 100% in the browser, zero API key.
//
// Backend: transformers.js (vendored ESM at vendor/transformers/) running onnxruntime-web in WASM.
// The COMPUTE ENGINE ships inside the extension (transformers.min.js + ort-wasm-simd.wasm), so it
// runs offline. Only the MODEL (Xenova/all-MiniLM-L6-v2, ~23 MB quantized) is fetched from the
// Hugging Face CDN on first use and then cached by the browser (Cache API). No user text ever leaves
// the browser — embeddings are computed locally; nothing is uploaded to any backend.
//
// Extension pages are NOT cross-origin isolated (no SharedArrayBuffer), so we force single-threaded
// SIMD WASM and point onnxruntime-web at the locally-vendored .wasm file.

import { pipeline, env } from "../../vendor/transformers/transformers.min.js";

const runtime = globalThis.browser || globalThis.chrome;
const vendorUrl = (p) => (runtime && runtime.runtime && runtime.runtime.getURL ? runtime.runtime.getURL(p) : p);

// Model files come from the HF CDN (remote), not from the extension package.
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = true;             // persist model files in the browser's Cache storage
// onnxruntime-web WASM: local, single-thread, SIMD (extension pages lack cross-origin isolation).
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.simd = true;
env.backends.onnx.wasm.proxy = false;
env.backends.onnx.wasm.wasmPaths = vendorUrl("vendor/transformers/");

export const EMBED_MODEL = "Xenova/all-MiniLM-L6-v2";
export const EMBED_DIM = 384;

let extractorPromise = null;
let ready = false;

export function embeddingsReady() { return ready; }

// Lazily build (and cache) the feature-extraction pipeline. `onProgress` receives transformers.js
// progress events during the one-time model download: { status, file, loaded, total, progress }.
export async function getExtractor(onProgress) {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", EMBED_MODEL, {
      quantized: true,
      progress_callback: (p) => { try { onProgress && onProgress(p); } catch (_) {} },
    }).then((ex) => { ready = true; return ex; }).catch((e) => { extractorPromise = null; throw e; });
  }
  return extractorPromise;
}

// Embed one string → Float32Array(384), mean-pooled + L2-normalized (cosine-ready).
export async function embedOne(text, onProgress) {
  const ex = await getExtractor(onProgress);
  const out = await ex(text, { pooling: "mean", normalize: true });
  return Float32Array.from(out.data);
}

// Embed many strings. Batched so a large source shows steady progress and doesn't spike memory.
// `onItem(done, total)` fires after each batch. Returns Float32Array[] aligned with `texts`.
export async function embedMany(texts, { onProgress, onItem, batchSize = 16 } = {}) {
  const ex = await getExtractor(onProgress);
  const vectors = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const out = await ex(batch, { pooling: "mean", normalize: true });
    // out is a [batch, 384] tensor → split into per-row Float32Arrays.
    const rows = out.tolist();
    for (const row of rows) vectors.push(Float32Array.from(row));
    if (onItem) try { onItem(Math.min(i + batch.length, texts.length), texts.length); } catch (_) {}
  }
  return vectors;
}

// Cosine similarity of two L2-normalized vectors = dot product. (embedOne/embedMany already normalize.)
export function cosineSim(a, b) {
  let dot = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  return dot;
}
