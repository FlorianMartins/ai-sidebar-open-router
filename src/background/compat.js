// Cross-browser `browser` global for a MODULE background.
//
// Chromium MV3 runs the background as a module service worker, where the
// webextension-polyfill isn't loaded. Chromium's `chrome.*` APIs already return
// promises under MV3, so the shared libs that call `browser.*` work unchanged —
// we just alias `browser` to `chrome`. In Firefox `browser` is native, so this
// is a no-op. Imported FIRST so the alias exists before any other module body
// (and before any browser.* call at runtime).
if (typeof globalThis.browser === "undefined" && typeof globalThis.chrome !== "undefined") {
  globalThis.browser = globalThis.chrome;
}

export {};
