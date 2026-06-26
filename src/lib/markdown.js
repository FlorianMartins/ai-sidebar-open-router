// Markdown rendering (marked + DOMPurify) and "artifacts" (HTML/SVG preview,
// Mermaid diagrams). Artifacts run inside sandboxed iframes (opaque origin): the
// model-generated code can reach neither the extension, the pages, nor the API
// keys — and the extension's CSP does not constrain it there.
//
// marked and DOMPurify are loaded as globals via <script> in sidebar.html.

let afCounter = 0;
let mermaidLibPromise = null;
// Artifact mode (toggled in the composer). When OFF, code is shown as plain copyable
// blocks instead of being auto-rendered as a live interactive preview.
let artifactsLive = true;
export function setArtifactsLive(on) { artifactsLive = on !== false; }

function getMermaidLib() {
  if (!mermaidLibPromise) {
    mermaidLibPromise = fetch(browser.runtime.getURL("vendor/mermaid.min.js")).then((r) =>
      r.text()
    );
  }
  return mermaidLibPromise;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Which artifact frames have actually reported back (i.e. their scripts RAN). Used
// to detect a CSP-blocked preview and offer the "open in a tab" fallback.
const reportedArtifacts = new Set();
// Resize artifact iframes that report their own height.
window.addEventListener("message", (e) => {
  const d = e.data;
  if (d && d.__artifact) {
    reportedArtifacts.add(d.id);
    const f = document.querySelector(`iframe[data-aid="${d.id}"]`);
    if (f) f.style.height = Math.min(d.h + 8, 900) + "px";
  }
});

export function configureMarkdown() {
  if (window.marked && window.marked.setOptions) {
    window.marked.setOptions({ gfm: true, breaks: true });
  }
  // Links: open in a new tab with a safe rel.
  if (window.DOMPurify) {
    window.DOMPurify.addHook("afterSanitizeAttributes", (node) => {
      if (node.tagName === "A") {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }
    });
  }
}

export function renderMarkdown(raw) {
  const html = window.marked ? window.marked.parse(raw || "") : escapeHtml(raw || "");
  return window.DOMPurify ? window.DOMPurify.sanitize(html) : html;
}

const REPORTER = (id) =>
  `<script>function __r(){try{parent.postMessage({__artifact:1,id:${JSON.stringify(
    id
  )},h:document.documentElement.scrollHeight},'*')}catch(e){}}` +
  `window.addEventListener('load',function(){__r();setTimeout(__r,300);setTimeout(__r,1200)});<\/script>`;

// The artifact "runner": a tiny static page served from hivey.be (a real https origin
// whose CSP we control and made permissive). Inside an extension page, EVERY local
// scheme for a framed document (srcdoc / blob: / data:) inherits the extension's strict
// `script-src 'self'` CSP, so the artifact's scripts never run. Framing a real https
// origin escapes that: the runner's document uses hivey.be's permissive CSP. The
// artifact HTML is handed to the runner LOCALLY via postMessage — it never touches the
// server (only the static runner is fetched). The frame stays sandboxed (opaque origin),
// so the artifact can't reach the extension, the page or the user's keys.
const RUNNER_URL = "https://hivey.be/artifact-runner.html";
function makeFrame(srcdoc, { sandbox, initialHeight }) {
  const id = "af" + ++afCounter;
  const f = document.createElement("iframe");
  f.className = "artifact-frame";
  f.dataset.aid = id;
  f.setAttribute("sandbox", sandbox || "");
  f.style.height = (initialHeight || 160) + "px";
  f.src = RUNNER_URL;
  // Hand the runner the artifact once it's ready (on load, and again if it pings ready).
  let sent = false;
  const send = () => {
    if (sent || !f.contentWindow) return;
    try { f.contentWindow.postMessage({ type: "pg-artifact-render", html: srcdoc }, "*"); sent = true; } catch (_) {}
  };
  f.addEventListener("load", () => setTimeout(send, 20));
  const onReady = (e) => {
    if (e.source === f.contentWindow && e.data && e.data.type === "pg-artifact-ready") { send(); window.removeEventListener("message", onReady); }
  };
  window.addEventListener("message", onReady);
  return f;
}

// Interactive languages = real Claude-style artifacts the user can USE/PLAY.
const INTERACTIVE = ["html", "jsx", "tsx", "react", "babel"];
const GAME_SANDBOX = "allow-scripts allow-modals allow-pointer-lock allow-popups allow-forms";

// Wrap a bare HTML fragment into a full document; pass full documents through.
function asHtmlDocument(code) {
  if (/<!doctype/i.test(code) || /<html[\s>]/i.test(code)) return code;
  return (
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<style>body{margin:0;font-family:system-ui;background:#fff;color:#111}</style></head>` +
    `<body>${code}</body></html>`
  );
}

// React/JSX artifact runtime, à la Claude: React + ReactDOM + Babel transpile the
// component in-browser, inside the sandboxed iframe. The libraries are fetched by
// the isolated iframe only (not by the extension) and only when such an artifact
// is shown. The model is asked to define a component named `App`.
function reactShell(code, id) {
  return (
    `<!doctype html><html><head><meta charset="utf-8">` +
    `<style>body{margin:0;font-family:system-ui;background:#fff;color:#111}#root{min-height:40px}` +
    `.err{color:#b00;padding:10px;white-space:pre-wrap;font:12px ui-monospace}</style>` +
    `<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>` +
    `<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>` +
    `<script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>` +
    `</head><body><div id="root"></div>` +
    `<script type="text/babel" data-presets="react">\n${code}\n` +
    `;(function(){try{var C=(typeof App!=='undefined')?App:(typeof Component!=='undefined'?Component:null);` +
    `var r=document.getElementById('root');if(C&&!r.hasChildNodes()){ReactDOM.createRoot(r).render(React.createElement(C));}}` +
    `catch(e){document.body.innerHTML='<div class=err>'+(e&&e.message?e.message:e)+'</div>';}})();<\/script>` +
    REPORTER(id) +
    `</body></html>`
  );
}

// Build the full artifact document for a given language.
function buildArtifactDoc(code, lang, id) {
  if (lang === "svg") {
    return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:10px;background:#fff}</style></head><body>${code}${REPORTER(id)}</body></html>`;
  }
  if (lang === "jsx" || lang === "tsx" || lang === "react" || lang === "babel") {
    return reactShell(code, id);
  }
  // html (interactive app / game)
  return asHtmlDocument(code) + REPORTER(id);
}

function renderPreview(slot, code, lang) {
  const id = "af" + (afCounter + 1);
  const srcdoc = buildArtifactDoc(code, lang, id);
  // The runner itself needs allow-scripts to receive the artifact (even SVG, whose own
  // content has no scripts), so every artifact uses the same sandbox set.
  const sandbox = GAME_SANDBOX;
  const initialHeight = lang === "svg" ? 260 : 380;
  const f = makeFrame(srcdoc, { sandbox, initialHeight });
  slot.textContent = "";
  slot.appendChild(f);
  // SVG has no scripts (nothing to report). For interactive artifacts, if the frame
  // never reports back within a moment, its scripts were blocked by the extension CSP
  // (some Firefox builds enforce it on framed documents). In that case surface a big
  // "Run in a new tab" action — a TOP-LEVEL data: document runs on its own opaque
  // origin with NO inherited CSP, so the artifact is fully playable there.
  if (lang !== "svg") {
    setTimeout(() => {
      if (reportedArtifacts.has(id)) return; // scripts ran — nothing to do
      f.style.display = "none"; // the embedded frame is script-dead — replace it
      const note = document.createElement("div");
      note.className = "artifact-note";
      note.textContent = RUN_HINT();
      const run = document.createElement("button");
      run.className = "artifact-run";
      run.textContent = "▶ " + RUN_LABEL();
      run.addEventListener("click", () => openArtifact(code, lang));
      slot.appendChild(note);
      slot.appendChild(run);
    }, 2600);
  }
}
// Localised labels for the fallback "run in a tab" button (en/fr, picked from <html lang>).
function isFr() { try { return (document.documentElement.lang || "").toLowerCase().startsWith("fr"); } catch (_) { return false; } }
function RUN_LABEL() { return isFr() ? "Lancer dans un onglet" : "Run in a new tab"; }
function RUN_HINT() { return isFr() ? "L'aperçu intégré n'a pas pu démarrer — ouvre l'artifact jouable dans un onglet." : "The inline preview couldn't start — open the playable artifact in a tab."; }

async function renderMermaid(slot, code) {
  slot.textContent = "Rendu du diagramme…";
  const lib = await getMermaidLib();
  // makeFrame will bump afCounter to this id; the reporter uses the same one.
  const id = "af" + (afCounter + 1);
  const srcdoc =
    `<!DOCTYPE html><html><head><meta charset="utf-8">` +
    `<style>body{margin:0;padding:10px;font-family:system-ui;background:#fff;color:#111}` +
    `.err{color:#b00;font-size:13px}</style>` +
    `<script>${lib}<\/script></head><body>` +
    `<pre class="mermaid">${escapeHtml(code)}</pre>` +
    `<script>mermaid.initialize({startOnLoad:false,securityLevel:'strict'});` +
    `mermaid.run().catch(function(e){document.body.innerHTML='<div class=err>Erreur Mermaid : '+` +
    `(e&&e.message?e.message:e)+'</div>';});<\/script>` +
    REPORTER(id) +
    `</body></html>`;
  const f = makeFrame(srcdoc, { sandbox: "allow-scripts", initialHeight: 200 });
  slot.textContent = "";
  slot.appendChild(f);
}

function toolbarButton(label, onClick) {
  const b = document.createElement("button");
  b.className = "code-btn";
  b.textContent = label;
  b.addEventListener("click", onClick);
  return b;
}

// Open an artifact full-size in its OWN browser tab. We navigate to a TOP-LEVEL
// `data:` document: it gets a fresh opaque origin with NO inherited CSP, so the
// artifact's scripts run and it's fully interactive — unlike an embedded frame, whose
// document inherits the strict extension CSP. tabs.create is the reliable path for an
// extension (content-initiated top-level data: navigations are blocked, ours are not).
function openArtifact(code, lang) {
  const doc = buildArtifactDoc(code, lang, "open");
  // Open the runner in a new tab (real https origin → scripts run), then hand it the
  // artifact via postMessage. We can't navigate a tab to data:/blob: (Firefox blocks
  // top-level data:, and blob:moz-extension keeps the strict CSP), so the runner is the
  // reliable path here too. Retry briefly until the tab's runner is ready.
  let win = null;
  try { win = window.open(RUNNER_URL, "_blank"); } catch (_) {}
  if (!win) return;
  let tries = 0;
  const iv = setInterval(() => {
    tries++;
    try { win.postMessage({ type: "pg-artifact-render", html: doc }, "*"); } catch (_) {}
    if (tries >= 25) clearInterval(iv);
  }, 180);
  const ack = (e) => {
    if (e.data && e.data.type === "pg-artifact-ready") {
      try { win.postMessage({ type: "pg-artifact-render", html: doc }, "*"); } catch (_) {}
    }
  };
  window.addEventListener("message", ack);
  setTimeout(() => { clearInterval(iv); window.removeEventListener("message", ack); }, 5000);
}

function artifactLabel(lang) {
  if (lang === "mermaid") return "✨ Diagramme";
  if (lang === "svg") return "✨ SVG";
  if (INTERACTIVE.includes(lang)) return "✨ Artifact interactif";
  return lang || "code";
}

// Turn <pre><code> blocks into toolbar'd code blocks and Claude-style artifacts.
// Interactive HTML/JSX render automatically inside a sandboxed iframe the user can
// actually use and PLAY (games, apps, simulations), with an Aperçu/Code toggle and
// an "Ouvrir" button for full screen. Mermaid renders diagrams; other languages
// stay as a copyable code block.
export function enhanceArtifacts(container) {
  const codes = container.querySelectorAll("pre > code");
  for (const code of codes) {
    const pre = code.parentElement;
    if (pre.dataset.enhanced) continue;
    pre.dataset.enhanced = "1";

    const lang = ([...code.classList].find((c) => c.startsWith("language-")) || "").slice(9);
    // Artifact mode OFF → no live preview; everything stays a plain copyable code block.
    const isPreviewable = artifactsLive && (INTERACTIVE.includes(lang) || lang === "svg");
    const isMermaid = artifactsLive && lang === "mermaid";
    const isArtifact = isPreviewable || isMermaid;

    const wrap = document.createElement("div");
    wrap.className = isArtifact ? "code-wrap artifact" : "code-wrap";
    const bar = document.createElement("div");
    bar.className = "code-bar";
    const tag = document.createElement("span");
    tag.className = "code-lang";
    tag.textContent = artifactLabel(lang);
    bar.appendChild(tag);

    const slot = document.createElement("div");
    slot.className = "artifact-slot";

    if (isPreviewable) {
      // Auto-render the live artifact; offer a toggle back to the source code.
      renderPreview(slot, code.textContent, lang);
      pre.style.display = "none";
      const toggle = toolbarButton("</> Code", () => {
        const showingCode = pre.style.display !== "none";
        pre.style.display = showingCode ? "none" : "";
        slot.style.display = showingCode ? "" : "none";
        toggle.textContent = showingCode ? "</> Code" : "👁 Aperçu";
      });
      bar.appendChild(toggle);
      bar.appendChild(toolbarButton("⤢ Ouvrir", () => openArtifact(code.textContent, lang)));
    }

    const copy = toolbarButton("Copier", () => {
      navigator.clipboard.writeText(code.textContent).then(() => {
        copy.textContent = "Copié ✓";
        setTimeout(() => (copy.textContent = "Copier"), 1500);
      });
    });
    bar.appendChild(copy);

    pre.replaceWith(wrap);
    wrap.appendChild(bar);
    wrap.appendChild(pre);
    wrap.appendChild(slot);

    if (isMermaid) {
      pre.style.display = "none";
      renderMermaid(slot, code.textContent);
    }
  }
}
