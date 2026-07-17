// Configurable keyboard shortcuts. Each action has a stable id, a default combo, and an i18n label
// key. The sidebar registers one keydown handler that maps a pressed combo → action id → handler.
// Stored in settings.shortcuts as { actionId: "Ctrl+Shift+N" }. Local-only, like every setting.

export const SHORTCUT_ACTIONS = [
  { id: "newChat", labelKey: "sc.newChat", def: "Ctrl+Shift+O" },
  { id: "focusComposer", labelKey: "sc.focusComposer", def: "Ctrl+Shift+L" },
  { id: "toggleHistory", labelKey: "sc.toggleHistory", def: "Ctrl+Shift+H" },
  { id: "toggleWeb", labelKey: "sc.toggleWeb", def: "Ctrl+Shift+W" },
  { id: "modeChat", labelKey: "sc.modeChat", def: "Ctrl+Shift+1" },
  { id: "modeTranslate", labelKey: "sc.modeTranslate", def: "Ctrl+Shift+2" },
  { id: "modeImprove", labelKey: "sc.modeImprove", def: "Ctrl+Shift+3" },
  { id: "modeSecurity", labelKey: "sc.modeSecurity", def: "Ctrl+Shift+5" },
  { id: "promptLibrary", labelKey: "sc.promptLibrary", def: "Ctrl+Shift+P" },
];

export function defaultShortcuts() {
  const out = {};
  for (const a of SHORTCUT_ACTIONS) out[a.id] = a.def;
  return out;
}

// Canonical combo string from a keydown event, e.g. "Ctrl+Shift+N". Modifier order is fixed so the
// reverse lookup is stable. Returns "" for a modifier-only press.
export function comboFromEvent(e) {
  const key = e.key;
  if (["Control", "Shift", "Alt", "Meta"].includes(key)) return "";
  const parts = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.metaKey) parts.push("Meta");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  let k = key.length === 1 ? key.toUpperCase() : key;
  parts.push(k);
  return parts.join("+");
}

// A combo is "bindable" only if it carries a non-shift modifier (so plain typing never triggers it).
export function isBindable(combo) {
  return /(?:Ctrl|Meta|Alt)\+/.test(combo || "");
}
