// Content script: reads the page and performs the DOM actions requested by the
// agent. Injected on every page (document_idle) and re-injected on demand by
// tools.js. Also powers the page element picker and region screenshot capture.
(function () {
  if (window.__aiSidebarInjected) return;
  window.__aiSidebarInjected = true;

  const refMap = new Map(); // ref -> element
  let refCounter = 0;

  // --- Safety: payment / checkout guardrail --------------------------------
  // The agent may browse and fill a cart, but never transact. We refuse clicks
  // on payment/checkout controls and typing into card fields. Matching is
  // intentionally broad (EN + FR) and errs on the side of refusing.
  const PAY_WORDS = [
    "pay now", "pay ", "payment", "checkout", "check out", "place order",
    "place your order", "buy now", "buy ", "purchase", "complete purchase",
    "confirm order", "confirm and pay", "proceed to payment", "proceed to checkout",
    "subscribe", "complete order", "order now",
    // French
    "payer", "paiement", "payez", "régler", "passer commande", "passer la commande",
    "valider la commande", "valider le paiement", "confirmer la commande",
    "confirmer l'achat", "acheter", "procéder au paiement", "finaliser la commande",
    "finaliser l'achat",
  ];
  const CARD_FIELD = /(card.?number|cardnum|cc.?num|cvv|cvc|cryptogramme|num(é|e)ro.?de.?carte|expir|exp.?date|securitycode|card.?code)/i;

  function textOf(el) {
    return (
      (el.innerText || el.value || "") + " " +
      (el.getAttribute && (
        (el.getAttribute("aria-label") || "") + " " +
        (el.getAttribute("name") || "") + " " +
        (el.getAttribute("id") || "") + " " +
        (el.getAttribute("title") || "") + " " +
        (el.getAttribute("value") || "")
      ) || "")
    ).toLowerCase();
  }

  function looksLikePaymentControl(el) {
    const hay = textOf(el);
    return PAY_WORDS.some((w) => hay.includes(w));
  }

  function looksLikeCardField(el) {
    const ac = (el.getAttribute && el.getAttribute("autocomplete")) || "";
    if (/cc-(number|csc|exp)/i.test(ac)) return true;
    const hay =
      (el.getAttribute && (
        (el.getAttribute("name") || "") + " " +
        (el.getAttribute("id") || "") + " " +
        (el.getAttribute("placeholder") || "") + " " +
        (el.getAttribute("aria-label") || "")
      )) || "";
    return CARD_FIELD.test(hay);
  }

  // --- Very sensitive (non-payment) actions: ALWAYS confirmed, even in "Allow" mode.
  // Downloading, reserving/booking, deleting, transferring, signing up, installing… The
  // agent must get the user's OK before doing these. Payments stay hard-blocked above.
  const SENSITIVE_WORDS = [
    "download", "télécharger", "telecharger",
    "reserve", "reservation", "réserver", "reserver", "réservation",
    "book now", "book ticket", "booking",
    "delete", "supprimer", "remove account", "delete account", "supprimer le compte",
    "transfer", "transférer", "transferer", "virement", "wire ",
    "sign up", "signup", "register", "create account", "s'inscrire", "inscrire", "créer un compte", "creer un compte",
    "apply now", "postuler", "submit application",
    "install", "installer",
    "send email", "send message", "envoyer le message", "envoyer un message",
    "unsubscribe", "se désabonner", "se desabonner",
    "publish", "publier", "post publicly",
  ];
  function looksLikeSensitiveControl(el) {
    // A real download link/button (download attribute or a file href).
    if (el.tagName === "A" &&
        ((el.hasAttribute && el.hasAttribute("download")) ||
         /\.(zip|exe|dmg|msi|pkg|apk|iso|deb|rpm|7z|rar|tar|gz|jar|bin|app|csv|xlsx?)(\?|#|$)/i.test((el.getAttribute && el.getAttribute("href")) || ""))) {
      return "download";
    }
    const hay = textOf(el);
    for (const w of SENSITIVE_WORDS) if (hay.includes(w)) return w.trim();
    return null;
  }

  function isVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    const style = getComputedStyle(el);
    return style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0";
  }

  function labelOf(el) {
    const txt =
      (el.innerText || "").trim() ||
      (el.value || "").trim() ||
      el.getAttribute("aria-label") ||
      el.getAttribute("placeholder") ||
      el.getAttribute("title") ||
      el.getAttribute("name") ||
      "";
    return txt.replace(/\s+/g, " ").slice(0, 120);
  }

  function metaDescription() {
    const m =
      document.querySelector('meta[name="description"]') ||
      document.querySelector('meta[property="og:description"]');
    return (m && m.getAttribute("content")) || "";
  }

  function readPage() {
    const main = document.querySelector("main, article, [role=main]") || document.body;
    const text = (main.innerText || "").replace(/\n{3,}/g, "\n\n").slice(0, 20000);
    return {
      title: document.title,
      url: location.href,
      description: metaDescription(),
      text,
    };
  }

  function readSelection() {
    return { selection: (window.getSelection() || "").toString().slice(0, 8000) };
  }

  function findElements(query) {
    refMap.clear();
    refCounter = 0;
    const q = (query || "").toLowerCase().trim();
    const selector =
      "a[href], button, input:not([type=hidden]), textarea, select, [role=button], [onclick]";
    const out = [];
    const nodes = document.querySelectorAll(selector);
    for (const el of nodes) {
      if (!isVisible(el)) continue;
      const label = labelOf(el);
      const hay = (label + " " + (el.getAttribute("href") || "")).toLowerCase();
      if (q && !hay.includes(q)) continue;
      const ref = "e" + ++refCounter;
      refMap.set(ref, el);
      out.push({
        ref,
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute("type") || undefined,
        text: label,
        href: el.getAttribute("href") || undefined,
        // Hint so the model can avoid even proposing a payment action.
        payment: looksLikePaymentControl(el) || undefined,
      });
      if (out.length >= 60) break;
    }
    return { count: out.length, elements: out };
  }

  function clickElement(ref, guard, confirmed) {
    const el = refMap.get(ref);
    if (!el) return { error: `ref not found: ${ref} (re-run find_elements)` };
    if (guard && guard.blockPayments && looksLikePaymentControl(el)) {
      return { error: "Blocked by safety guardrail: payment/checkout action is not allowed.", blocked: true };
    }
    // Very sensitive action → ask the user to confirm (even in "Allow" mode).
    if (!confirmed) {
      const reason = looksLikeSensitiveControl(el);
      if (reason) return { confirm: true, action: reason, label: labelOf(el) };
    }
    el.scrollIntoView({ block: "center" });
    el.click();
    return { ok: true, clicked: labelOf(el) };
  }

  function fillInput(ref, value, submit, guard, confirmed) {
    const el = refMap.get(ref);
    if (!el) return { error: `ref not found: ${ref} (re-run find_elements)` };
    if (guard && guard.blockPayments && looksLikeCardField(el)) {
      return { error: "Blocked by safety guardrail: card/payment field is not allowed.", blocked: true };
    }
    // If submitting a form that triggers a very sensitive action, confirm first.
    if (submit && !confirmed) {
      const reason = (el.form && looksLikeSensitiveControl(el.form)) || looksLikeSensitiveControl(el);
      if (reason) return { confirm: true, action: reason, label: labelOf(el) };
    }
    el.focus();
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value");
    if (setter && setter.set) setter.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    if (submit) {
      // Refuse to submit a form that looks like a payment form.
      if (guard && guard.blockPayments && el.form && looksLikePaymentControl(el.form)) {
        return { ok: true, filled: labelOf(el), note: "Filled but submit blocked (payment form)." };
      }
      const form = el.form;
      if (form) {
        if (typeof form.requestSubmit === "function") form.requestSubmit();
        else form.submit();
      } else {
        el.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true })
        );
      }
    }
    return { ok: true, filled: labelOf(el) };
  }

  function scrollPage(direction) {
    const h = window.innerHeight;
    if (direction === "top") window.scrollTo({ top: 0, behavior: "smooth" });
    else if (direction === "bottom")
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    else window.scrollBy({ top: direction === "up" ? -h * 0.9 : h * 0.9, behavior: "smooth" });
    return { ok: true };
  }

  // --- Element picker ------------------------------------------------------
  // Lets the user point at any element on the page (a table, an image, a menu…) and
  // "ask the AI about it". Hover outlines the element; a single click captures it;
  // holding the left button and dragging across several elements selects them all
  // (each captured). Esc, or a pick_cancel message from the sidebar, aborts cleanly.
  let pickResolve = null;
  // Theme accent colours — passed from the sidebar so the capture/pick overlays and
  // the agent glow match the user's selected theme instead of a fixed colour.
  let ACCENT = "#8b5cf6", ACCENT2 = "#6366f1";
  function rgba(hex, a) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec((hex || "").trim());
    return m ? `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})` : hex;
  }
  function setAccents(msg) {
    if (msg && msg.accent) ACCENT = msg.accent;
    if (msg && msg.accent2) ACCENT2 = msg.accent2;
  }
  let pickHoverBox = null;
  let pickHover = null;
  let pickPainting = false;
  let pickSelected = [];
  let pickBoxes = [];
  function mkBox(color, bg, z) {
    const d = document.createElement("div");
    Object.assign(d.style, {
      position: "fixed", zIndex: z, top: 0, left: 0, width: 0, height: 0,
      border: "2px solid " + color, background: bg, borderRadius: "3px", pointerEvents: "none",
    });
    document.documentElement.appendChild(d);
    return d;
  }
  function placeBox(d, r) {
    Object.assign(d.style, { top: r.top + "px", left: r.left + "px", width: r.width + "px", height: r.height + "px" });
  }
  function addSelected(el) {
    if (!el || pickSelected.includes(el)) return;
    pickSelected.push(el);
    const b = mkBox(ACCENT, rgba(ACCENT, 0.22), 2147483646);
    placeBox(b, el.getBoundingClientRect());
    pickBoxes.push(b);
  }
  function pickMove(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;
    if (pickPainting) { addSelected(el); }
    else { pickHover = el; placeBox(pickHoverBox, el.getBoundingClientRect()); }
  }
  function pickDown(e) {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    pickPainting = true;
    if (pickHoverBox) pickHoverBox.style.display = "none";
    addSelected(pickHover || document.elementFromPoint(e.clientX, e.clientY));
  }
  function pickUp(e) {
    if (!pickPainting) return;
    e.preventDefault(); e.stopPropagation();
    endPick(false);
  }
  function pickSwallow(e) { e.preventDefault(); e.stopPropagation(); } // don't trigger page links/buttons
  function pickKey(e) { if (e.key === "Escape") { e.preventDefault(); endPick(true); } }
  function describeElement(el) {
    const rect = el.getBoundingClientRect();
    const text = (el.innerText || el.textContent || "").replace(/\n{3,}/g, "\n\n").trim().slice(0, 8000);
    let imgSrc = "";
    if (el.tagName === "IMG") imgSrc = el.currentSrc || el.src || "";
    return { tag: el.tagName.toLowerCase(), text, imgSrc, rect: { x: rect.left, y: rect.top, w: rect.width, h: rect.height } };
  }
  function endPick(cancelled) {
    document.removeEventListener("mousemove", pickMove, true);
    document.removeEventListener("mousedown", pickDown, true);
    document.removeEventListener("mouseup", pickUp, true);
    document.removeEventListener("click", pickSwallow, true);
    document.removeEventListener("keydown", pickKey, true);
    document.documentElement.style.cursor = "";
    if (pickHoverBox) { pickHoverBox.remove(); pickHoverBox = null; }
    pickBoxes.forEach((b) => b.remove());
    const els = pickSelected;
    pickBoxes = []; pickSelected = []; pickPainting = false;
    const r = pickResolve; pickResolve = null;
    if (!r) return;
    if (cancelled || !els.length) { r({ cancelled: true }); return; }
    r({ elements: els.slice(0, 8).map(describeElement), dpr: window.devicePixelRatio || 1, url: location.href, title: document.title });
  }
  function startPick() {
    if (pickResolve) endPick(true); // restart cleanly
    return new Promise((resolve) => {
      pickResolve = resolve; pickSelected = []; pickBoxes = []; pickPainting = false; pickHover = null;
      pickHoverBox = mkBox(ACCENT2, rgba(ACCENT2, 0.14), 2147483647);
      document.documentElement.style.cursor = "crosshair";
      document.addEventListener("mousemove", pickMove, true);
      document.addEventListener("mousedown", pickDown, true);
      document.addEventListener("mouseup", pickUp, true);
      document.addEventListener("click", pickSwallow, true);
      document.addEventListener("keydown", pickKey, true);
    });
  }

  // --- Region capture (screenshot tool) -----------------------------------
  // Lets the user draw a free rectangle over the page (like a screenshot selection);
  // we return the rect so the sidebar can crop the visible-tab screenshot and attach
  // that IMAGE to the context. Esc or right-click cancels.
  let regResolve = null, regBox = null, regStart = null, regDragging = false;
  function regRect(e) {
    const left = Math.min(e.clientX, regStart.x), top = Math.min(e.clientY, regStart.y);
    return { x: left, y: top, w: Math.abs(e.clientX - regStart.x), h: Math.abs(e.clientY - regStart.y) };
  }
  function regDown(e) {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    regDragging = true; regStart = { x: e.clientX, y: e.clientY };
    placeBox(regBox, { left: e.clientX, top: e.clientY, width: 0, height: 0 });
  }
  function regMove(e) {
    if (!regDragging || !regStart) return;
    const r = regRect(e);
    placeBox(regBox, { left: r.x, top: r.y, width: r.w, height: r.h });
  }
  function regUp(e) {
    if (!regDragging) return;
    e.preventDefault(); e.stopPropagation();
    endRegion(false, regRect(e));
  }
  function regSwallow(e) { e.preventDefault(); e.stopPropagation(); }
  function regKey(e) { if (e.key === "Escape") { e.preventDefault(); endRegion(true); } }
  function endRegion(cancelled, rect) {
    document.removeEventListener("mousedown", regDown, true);
    document.removeEventListener("mousemove", regMove, true);
    document.removeEventListener("mouseup", regUp, true);
    document.removeEventListener("click", regSwallow, true);
    document.removeEventListener("keydown", regKey, true);
    document.documentElement.style.cursor = "";
    if (regBox) { regBox.remove(); regBox = null; }
    regDragging = false; regStart = null;
    const r = regResolve; regResolve = null;
    if (!r) return;
    if (cancelled || !rect || rect.w < 5 || rect.h < 5) { r({ cancelled: true }); return; }
    r({ rect, dpr: window.devicePixelRatio || 1, url: location.href, title: document.title });
  }
  function startRegion() {
    if (regResolve) endRegion(true);
    return new Promise((resolve) => {
      regResolve = resolve; regDragging = false; regStart = null;
      regBox = mkBox(ACCENT2, rgba(ACCENT2, 0.14), 2147483647);
      document.documentElement.style.cursor = "crosshair";
      document.addEventListener("mousedown", regDown, true);
      document.addEventListener("mousemove", regMove, true);
      document.addEventListener("mouseup", regUp, true);
      document.addEventListener("click", regSwallow, true);
      document.addEventListener("keydown", regKey, true);
    });
  }

  // --- Agent activity glow -------------------------------------------------
  // A soft pulsing border around the viewport (à la Perplexity) shown while the agent
  // is acting on this page. pointer-events:none so it never blocks the page.
  let glowEl = null;
  function setAgentGlow(on) {
    if (on) {
      if (glowEl && document.documentElement.contains(glowEl)) return;
      // Rebuild the style each time so the glow tracks the current theme accent.
      let st = document.getElementById("__ai_agent_glow_style");
      if (!st) { st = document.createElement("style"); st.id = "__ai_agent_glow_style"; (document.head || document.documentElement).appendChild(st); }
      st.textContent =
        `@keyframes aiAgentGlow{0%,100%{box-shadow:inset 0 0 16px 3px ${rgba(ACCENT, 0.55)},inset 0 0 4px 1px ${rgba(ACCENT2, 0.85)}}50%{box-shadow:inset 0 0 36px 9px ${rgba(ACCENT, 0.85)},inset 0 0 9px 2px ${rgba(ACCENT2, 1)}}}` +
        "#__ai_agent_glow{position:fixed;inset:0;z-index:2147483646;pointer-events:none;border-radius:2px;animation:aiAgentGlow 1.8s ease-in-out infinite}";
      glowEl = document.createElement("div");
      glowEl.id = "__ai_agent_glow";
      document.documentElement.appendChild(glowEl);
    } else if (glowEl) {
      glowEl.remove();
      glowEl = null;
    }
  }

  // ---- On-page action bubble -----------------------------------------------
  // A floating result bubble rendered IN THE PAGE (Shadow DOM, isolated from the
  // site's CSS) at the right-click position. The sidebar runs the model and relays
  // the text here via messages; the bubble is independent of the sidebar UI.
  let lastCtxPos = { x: 80, y: 80 };
  document.addEventListener("contextmenu", (e) => { lastCtxPos = { x: e.clientX, y: e.clientY }; }, true);
  let pageBubble = null;
  function closePageBubble() {
    if (!pageBubble) return;
    try { pageBubble.cleanup(); } catch (_) {}
    try { pageBubble.host.remove(); } catch (_) {}
    pageBubble = null;
  }
  function buildPageBubble(opts) {
    closePageBubble();
    const A = (opts && opts.accent) || ACCENT;
    const host = document.createElement("div");
    host.style.cssText = "all:initial;position:fixed;top:0;left:0;z-index:2147483647;";
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent =
      ".card{position:fixed;width:380px;max-width:92vw;max-height:62vh;display:flex;flex-direction:column;" +
      "font:13px/1.55 system-ui,-apple-system,Segoe UI,sans-serif;color:#e8e8f2;background:#1a1d2c;border:1px solid #30334d;" +
      "border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,.55);overflow:hidden}" +
      ".head{display:flex;align-items:center;gap:8px;padding:8px 10px;border-bottom:1px solid #2a2d44;cursor:move;user-select:none}" +
      ".title{font-weight:600;color:#fff;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      ".acts{margin-left:auto;display:flex;align-items:center;gap:5px;flex:0 0 auto}" +
      "select{font:inherit;font-size:12px;padding:3px 6px;border-radius:7px;background:#262a40;color:#e8e8f2;border:1px solid #30334d}" +
      "button{all:unset;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:7px;cursor:pointer;color:#9b9db5}" +
      "button:hover{background:#262a40;color:#fff}" +
      ".src{font-size:11px;color:#9b9db5;padding:7px 10px;border-bottom:1px solid #2a2d44;max-height:64px;overflow:auto;white-space:pre-wrap;background:#14151c}" +
      ".body{padding:10px 12px;overflow:auto;flex:1;min-height:46px;white-space:pre-wrap}" +
      ".body.done{white-space:normal}" +
      ".body.loading{color:#9b9db5}" +
      ".note{font-size:10px;color:#9b9db5;padding:5px 10px;border-top:1px solid #2a2d44;text-align:center}" +
      ".body a{color:" + A + "}.body h1,.body h2,.body h3{color:" + A + ";margin:10px 0 5px}.body strong,.body b{color:" + A + "}" +
      ".body ul,.body ol{padding-left:20px;margin:7px 0}.body p{margin:8px 0}.body pre{white-space:pre-wrap;background:#14151c;padding:8px;border-radius:8px;overflow:auto}" +
      "svg{display:block}";
    shadow.appendChild(style);
    const card = document.createElement("div"); card.className = "card";
    const head = document.createElement("div"); head.className = "head";
    const title = document.createElement("span"); title.className = "title"; title.textContent = (opts && opts.title) || "";
    const acts = document.createElement("div"); acts.className = "acts";
    let langSel = null, presetSel = null;
    const sendRerun = () => browser.runtime.sendMessage({ type: "bubble_rerun", lang: langSel ? langSel.value : null, preset: presetSel ? presetSel.value : null });
    if (opts && opts.langs && opts.langs.length) {
      langSel = document.createElement("select");
      for (const l of opts.langs) { const o = document.createElement("option"); o.value = l.value; o.textContent = l.label; langSel.appendChild(o); }
      langSel.value = opts.currentLang || opts.langs[0].value;
      langSel.addEventListener("change", sendRerun);
      acts.appendChild(langSel);
    }
    if (opts && opts.presets && opts.presets.length) {
      presetSel = document.createElement("select");
      for (const p of opts.presets) { const o = document.createElement("option"); o.value = p.value; o.textContent = p.label; presetSel.appendChild(o); }
      presetSel.value = opts.currentPreset || opts.presets[0].value;
      presetSel.addEventListener("change", sendRerun);
      acts.appendChild(presetSel);
    }
    const copyBtn = document.createElement("button"); copyBtn.title = (opts && opts.copyLabel) || "Copy";
    copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    copyBtn.addEventListener("click", () => { try { navigator.clipboard.writeText(pageBubble ? pageBubble.raw : ""); } catch (_) {} });
    const closeBtn = document.createElement("button"); closeBtn.title = (opts && opts.closeLabel) || "Close";
    closeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
    closeBtn.addEventListener("click", closePageBubble);
    acts.appendChild(copyBtn); acts.appendChild(closeBtn);
    head.appendChild(title); head.appendChild(acts);
    const src = document.createElement("div"); src.className = "src"; src.textContent = (opts && opts.source) || "";
    const body = document.createElement("div"); body.className = "body loading"; body.textContent = "…";
    const note = document.createElement("div"); note.className = "note"; note.textContent = (opts && opts.note) || "";
    card.appendChild(head); card.appendChild(src); card.appendChild(body); card.appendChild(note);
    shadow.appendChild(card);
    (document.body || document.documentElement).appendChild(host);
    // Position at the right-click point (clamped to the viewport).
    const cw = 380;
    const x = Math.min(Math.max(8, lastCtxPos.x), Math.max(8, window.innerWidth - cw - 8));
    const y = Math.min(Math.max(8, lastCtxPos.y + 10), Math.max(8, window.innerHeight - 90));
    card.style.left = x + "px"; card.style.top = y + "px";
    // Drag by the header.
    let ox = 0, oy = 0;
    const onMove = (e) => {
      let nx = e.clientX - ox, ny = e.clientY - oy;
      nx = Math.max(2, Math.min(window.innerWidth - 60, nx));
      ny = Math.max(2, Math.min(window.innerHeight - 30, ny));
      card.style.left = nx + "px"; card.style.top = ny + "px";
    };
    const stop = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", stop); };
    head.addEventListener("mousedown", (e) => {
      if (e.target.closest("button, select")) return;
      const r = card.getBoundingClientRect();
      ox = e.clientX - r.left; oy = e.clientY - r.top; e.preventDefault();
      document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", stop);
    });
    // Close on outside click / Esc.
    const onDocDown = (e) => { if (!host.contains(e.target)) closePageBubble(); };
    const onKey = (e) => { if (e.key === "Escape") closePageBubble(); };
    setTimeout(() => document.addEventListener("mousedown", onDocDown, true), 0);
    document.addEventListener("keydown", onKey, true);
    pageBubble = {
      host, body, raw: "",
      cleanup: () => { document.removeEventListener("mousedown", onDocDown, true); document.removeEventListener("keydown", onKey, true); stop(); },
    };
  }

  browser.runtime.onMessage.addListener((msg) => {
    switch (msg && msg.type) {
      case "bubble_open":
        setAccents(msg);
        buildPageBubble(msg);
        return Promise.resolve({ ok: true });
      case "bubble_reset":
        if (pageBubble) { pageBubble.raw = ""; pageBubble.body.className = "body loading"; pageBubble.body.textContent = "…"; }
        return Promise.resolve({ ok: true });
      case "bubble_delta":
        if (pageBubble) { pageBubble.raw += msg.text || ""; pageBubble.body.className = "body"; pageBubble.body.textContent = pageBubble.raw; pageBubble.body.scrollTop = pageBubble.body.scrollHeight; }
        return Promise.resolve({ ok: true });
      case "bubble_done":
        if (pageBubble) { pageBubble.raw = msg.raw || pageBubble.raw; pageBubble.body.className = "body done"; pageBubble.body.innerHTML = msg.html || pageBubble.raw; }
        return Promise.resolve({ ok: true });
      case "bubble_error":
        if (pageBubble) { pageBubble.body.className = "body"; pageBubble.body.textContent = msg.error || "Error"; }
        return Promise.resolve({ ok: true });
      case "bubble_close":
        closePageBubble();
        return Promise.resolve({ ok: true });
      case "agent_glow":
        setAccents(msg);
        setAgentGlow(!!msg.on);
        return Promise.resolve({ ok: true });
      case "read_page":
        return Promise.resolve(readPage());
      case "read_selection":
        return Promise.resolve(readSelection());
      case "pick_element":
        setAccents(msg);
        return startPick();
      case "pick_cancel":
        if (pickResolve) endPick(true);
        return Promise.resolve({ ok: true });
      case "capture_region":
        setAccents(msg);
        return startRegion();
      case "region_cancel":
        if (regResolve) endRegion(true);
        return Promise.resolve({ ok: true });
      case "find_elements":
        return Promise.resolve(findElements(msg.query));
      case "click_element":
        return Promise.resolve(clickElement(msg.ref, msg.guard, msg.confirmed));
      case "fill_input":
        return Promise.resolve(fillInput(msg.ref, msg.value, msg.submit, msg.guard, msg.confirmed));
      case "scroll_page":
        return Promise.resolve(scrollPage(msg.direction));
      case "ping":
        return Promise.resolve({ ok: true });
    }
    return false;
  });

  // --- SPA navigation notifier ---------------------------------------------
  // Tell the sidebar when the URL changes via the History API (pushState /
  // popstate), which does not always fire tabs.onUpdated. Classic navigations
  // (new site, subdomain) are caught by the sidebar via tab events instead.
  let lastUrl = location.href;
  const notifyNav = () => {
    if (location.href === lastUrl) return;
    lastUrl = location.href;
    try {
      browser.runtime.sendMessage({ type: "page_changed", url: location.href });
    } catch (_) {}
  };
  for (const m of ["pushState", "replaceState"]) {
    const orig = history[m];
    history[m] = function () {
      const r = orig.apply(this, arguments);
      setTimeout(notifyNav, 50);
      return r;
    };
  }
  window.addEventListener("popstate", () => setTimeout(notifyNav, 50));

})();
