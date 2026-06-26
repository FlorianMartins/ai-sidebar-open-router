// Background (MODULE service worker on Chromium / module background page on
// Firefox). Two jobs:
//   1. Sider-style right-click menus on the page / selection.
//   2. Selection quick-actions (Explain / Translate / Improve / Summarize /
//      Reply) run HERE and stream into a floating bubble drawn ON THE PAGE by
//      the content script — WITHOUT opening the sidebar. Page-level actions
//      (summarise/translate the whole page) and "Open Hivey AI" still use the
//      sidebar.
//
// Running the model in the background (instead of the sidebar) is what lets the
// bubble appear as a page overlay on its own. We reuse the very same provider /
// agent / i18n libs the sidebar uses, so there is no logic duplication.
import "./compat.js";
import { getSettings, setSettings } from "../lib/storage.js";
import { setLang, t } from "../lib/i18n.js";
import { makeProvider } from "../lib/providers.js";
import { keyFor, WRITING_PRESETS } from "../lib/models.js";
import { buildSystemPrompt, runConversation } from "../lib/agent.js";
import { effectivePalette } from "../lib/theme.js";

// Context-menu items. Contexts are fixed; titles are localised (English default,
// French when the user picks uiLang="fr" in Settings).
const MENU_ITEMS = [
  { id: "ai-open", contexts: ["all"] },
  { id: "ai-summarize-page", contexts: ["page"] },
  { id: "ai-translate-page", contexts: ["page"] },
  { id: "ai-summarize-sel", contexts: ["selection"] },
  { id: "ai-explain", contexts: ["selection"] },
  { id: "ai-translate-sel", contexts: ["selection"] },
  { id: "ai-improve", contexts: ["selection"] },
  { id: "ai-reply", contexts: ["selection", "editable"] },
];
const MENU_TITLES = {
  en: {
    "ai-open": "Open Hivey AI",
    "ai-summarize-page": "Summarize the page",
    "ai-translate-page": "Translate the page",
    "ai-summarize-sel": "Summarize the selection",
    "ai-explain": "Explain the selection",
    "ai-translate-sel": "Translate the selection",
    "ai-improve": "Improve the selected text",
    "ai-reply": "Draft a reply to this text",
  },
  fr: {
    "ai-open": "Ouvrir Hivey AI",
    "ai-summarize-page": "Résumer la page",
    "ai-translate-page": "Traduire la page",
    "ai-summarize-sel": "Résumer la sélection",
    "ai-explain": "Expliquer la sélection",
    "ai-translate-sel": "Traduire la sélection",
    "ai-improve": "Améliorer le texte sélectionné",
    "ai-reply": "Rédiger une réponse à ce texte",
  },
};

async function buildMenus() {
  let lang = "en";
  try {
    const { uiLang } = await browser.storage.local.get("uiLang");
    lang = uiLang === "fr" ? "fr" : "en";
  } catch (_) {}
  const titles = MENU_TITLES[lang] || MENU_TITLES.en;
  await browser.contextMenus.removeAll();
  for (const m of MENU_ITEMS) {
    browser.contextMenus.create({ id: m.id, title: titles[m.id], contexts: m.contexts });
  }
}

// Map a menu id to a quick-action name. Page-level items pass no text, so the
// sidebar falls back to the current page.
const MENU_ACTION = {
  "ai-summarize-page": "summarize",
  "ai-translate-page": "translate",
  "ai-summarize-sel": "summarize-selection",
  "ai-explain": "explain",
  "ai-translate-sel": "translate",
  "ai-improve": "improve",
  "ai-reply": "reply",
};

// Selection actions that run as a floating ON-PAGE bubble (no sidebar).
const BUBBLE_MENU_IDS = new Set([
  "ai-summarize-sel",
  "ai-explain",
  "ai-translate-sel",
  "ai-improve",
  "ai-reply",
]);

const TRANSLATE_LANGS = [
  "French", "English", "Spanish", "German", "Italian", "Portuguese",
  "Dutch", "Arabic", "Chinese", "Japanese", "Russian",
];

// Files needed to (re)inject the on-page bubble renderer.
const CONTENT_FILES = ["vendor/browser-polyfill.min.js", "src/content/content.js"];

// Cross-browser sidebar open: Firefox exposes sidebarAction; Chromium uses
// sidePanel. We call it synchronously inside the click handler so the user
// gesture is preserved (Chromium requires it).
function openSidebar(tab) {
  try {
    if (typeof browser !== "undefined" && browser.sidebarAction && browser.sidebarAction.open) {
      return browser.sidebarAction.open();
    }
  } catch (_) {}
  // Chromium-only side panel. Reached via bracket access because this file is
  // shared with the Firefox build, whose validator doesn't know the sidePanel API.
  try {
    const cr = (typeof chrome !== "undefined") ? chrome : null;
    const sp = cr && cr["sidePanel"];
    if (sp && sp.open) return sp.open({ windowId: tab && tab.windowId });
  } catch (_) {}
}

// Fall back to the legacy sidebar path (used on pages we can't overlay).
function fallbackToSidebar(tab, action, text) {
  openSidebar(tab);
  browser.storage.local.set({ pendingAction: { action, text: text || "", ts: Date.now() } });
}

browser.runtime.onInstalled.addListener(() => {
  buildMenus();
  // Chromium: make the toolbar action open the side panel.
  try {
    const cr = (typeof chrome !== "undefined") ? chrome : null;
    const sp = cr && cr["sidePanel"];
    if (sp && sp.setPanelBehavior) sp.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  } catch (_) {}
});
// Rebuild context menus also on browser startup and whenever the UI language changes.
if (browser.runtime.onStartup) browser.runtime.onStartup.addListener(() => buildMenus());
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.uiLang) buildMenus();
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "ai-open") {
    openSidebar(tab);
    return;
  }
  const action = MENU_ACTION[info.menuItemId];
  if (!action) return;

  // Selection actions → floating bubble on the page, no sidebar.
  if (BUBBLE_MENU_IDS.has(info.menuItemId) && (info.selectionText || "").trim()) {
    runBubble(tab, action, info.selectionText.trim()).catch((e) => console.warn("page bubble failed", e));
    return;
  }

  // Page-level actions still use the sidebar (they need the whole page in the
  // sidebar workspace). Open it FIRST so the user gesture is preserved.
  fallbackToSidebar(tab, action, info.selectionText || "");
});

// --- On-page bubble pipeline ------------------------------------------------
// We hold a single "current bubble" context so the page can ask for a re-run
// (different language / writing preset) via a `bubble_rerun` message.
let lastBubble = null; // { tabId, action, text }
let bubbleAbort = null;

function isRestrictedUrl(url) {
  if (!url) return true;
  return /^(about:|chrome:|edge:|moz-extension:|chrome-extension:|view-source:|data:|https:\/\/addons\.mozilla\.org|https:\/\/chromewebstore\.google\.com|https:\/\/chrome\.google\.com\/webstore)/i.test(url);
}

// Firefox MV3 grants NO host permission at install — host_permissions are opt-in.
// Until the user grants page access, the declarative content script never runs and
// we cannot inject/reach the page, so the bubble fell back to the sidebar EVERY time.
// A right-click (contextMenus.onClicked) is a user gesture, so we may request it here.
// permissions.request() resolves true instantly (no prompt) when already granted.
async function ensureHostPermission() {
  try {
    if (!browser.permissions || !browser.permissions.request) return true;
    return await browser.permissions.request({ origins: ["<all_urls>"] });
  } catch (_) { return false; }
}

// Make sure the content script (which draws the bubble) is present in the tab.
async function ensureContent(tabId) {
  try { await browser.tabs.sendMessage(tabId, { type: "ping" }); return true; } catch (_) {}
  try {
    await browser.scripting.executeScript({ target: { tabId }, files: CONTENT_FILES });
  } catch (_) {
    try { await browser.scripting.executeScript({ target: { tabId, allFrames: true }, files: CONTENT_FILES }); }
    catch (_) { return false; }
  }
  for (let i = 0; i < 6; i++) {
    try { await browser.tabs.sendMessage(tabId, { type: "ping" }); return true; }
    catch (_) { await new Promise((r) => setTimeout(r, 100)); }
  }
  return false;
}

function langLabel(v) {
  const l = t("lang." + v);
  return l && l !== "lang." + v ? l : v;
}

function actionRequest(action, text, lang, presetId) {
  switch (action) {
    case "translate":
      return { label: t("rail.translate"), content: t("prompt.translate", { lang, text }), translate: true };
    case "improve":
      return {
        label: t("rail.improve"),
        content: `${t("presetPrompt." + (presetId || "improve"))}\n${t("improve.only")}\n\n${t("improve.textLabel")}\n${text}`,
        improve: true,
      };
    case "summarize-selection":
      return { label: t("label.summarizeSel"), content: t("prompt.summarizeSel", { text }) };
    case "explain":
      return { label: t("label.explain"), content: t("prompt.explain", { text }) };
    case "reply":
      return { label: t("label.reply"), content: t("prompt.reply", { lang, text }) };
    default:
      return null;
  }
}

// Open the bubble on the page and kick off the model. Falls back to the sidebar
// on pages we cannot overlay (browser pages, store pages, …).
async function runBubble(tab, action, text) {
  if (!tab || isRestrictedUrl(tab.url)) { fallbackToSidebar(tab, action, text); return; }
  // Ask for page access FIRST (this call must stay before any other await so the
  // user-gesture from the right-click is preserved). Without it the bubble can never
  // reach the page on Firefox. If the user declines, gracefully use the sidebar.
  if (!(await ensureHostPermission())) { fallbackToSidebar(tab, action, text); return; }
  if (!(await ensureContent(tab.id))) { fallbackToSidebar(tab, action, text); return; }

  lastBubble = { tabId: tab.id, action, text };
  const settings = await getSettings();
  setLang(settings.uiLang || "en");
  const pal = effectivePalette(settings.theme || "dark", settings.themeColors);
  const reqInit = actionRequest(action, text, settings.targetLang || "French", settings.improvePreset);
  const langs = reqInit && reqInit.translate ? TRANSLATE_LANGS.map((v) => ({ value: v, label: langLabel(v) })) : null;
  const presets = reqInit && reqInit.improve ? WRITING_PRESETS.map(([id]) => ({ value: id, label: t("preset." + id) })) : null;

  try {
    await browser.tabs.sendMessage(tab.id, {
      type: "bubble_open",
      title: reqInit ? reqInit.label : "",
      source: text,
      note: t("bubble.note"),
      copyLabel: t("bubble.copy"),
      closeLabel: t("close.title"),
      langs, presets,
      currentLang: settings.targetLang || "French",
      currentPreset: settings.improvePreset || "improve",
      accent: pal.accent, accent2: pal.accent2,
    });
  } catch (_) { fallbackToSidebar(tab, action, text); return; }

  runBubbleModel();
}

async function runBubbleModel() {
  if (!lastBubble) return;
  const { tabId, action, text } = lastBubble;
  const send = (m) => { browser.tabs.sendMessage(tabId, m).catch(() => {}); };
  const settings = await getSettings();
  setLang(settings.uiLang || "en");
  const lang = settings.targetLang || "French";
  const req = actionRequest(action, text, lang, settings.improvePreset);
  if (!req) return;

  const providerId = settings.provider;
  if (!keyFor(providerId, settings) && providerId !== "ollama" && providerId !== "lmstudio") {
    send({ type: "bubble_error", error: t("err.noKeyModel") });
    return;
  }

  if (bubbleAbort) { try { bubbleAbort.abort(); } catch (_) {} }
  bubbleAbort = new AbortController();
  send({ type: "bubble_reset" });

  let raw = "";
  try {
    const provider = makeProvider(settings, { thinking: false, webSearch: false });
    const system = buildSystemPrompt({
      agentMode: false,
      targetLang: lang,
      responseLang: settings.responseLang,
      mode: action === "translate" ? "translate" : action === "improve" ? "improve" : "chat",
      blockPayments: settings.blockPayments,
      artifacts: false, // the on-page bubble shows plain text, not a live artifact frame
    });
    await runConversation({
      provider, system,
      history: [{ role: "user", content: req.content }],
      tools: [],
      onText: (d) => { raw += d; send({ type: "bubble_delta", text: d }); },
      onThink: () => {},
      signal: bubbleAbort.signal,
    });
    // The content script renders the final markdown itself (the SW has no DOM).
    send({ type: "bubble_done", raw });
  } catch (e) {
    if (!(e && e.name === "AbortError")) {
      send({ type: "bubble_error", error: (e && e.message) ? e.message : String(e) });
    }
  }
}

// The on-page bubble asks for a re-run when the user changes its language / style.
browser.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.type !== "bubble_rerun" || !lastBubble) return;
  (async () => {
    if (msg.lang) await setSettings({ targetLang: msg.lang });
    if (msg.preset) await setSettings({ improvePreset: msg.preset });
    runBubbleModel();
  })();
});
