// Export a saved conversation as Markdown (download) or PDF (print window). Local-only, no upload.

function convTitle(conv) {
  return (conv.customTitle || conv.title || "Conversation").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function conversationToMarkdown(conv) {
  const lines = [`# ${convTitle(conv)}`, ""];
  if (conv.updatedAt) lines.push(`_${new Date(conv.updatedAt).toLocaleString()}_`, "");
  for (const m of conv.transcript || []) {
    const who = m.role === "user" ? "🧑 **You**" : "🐝 **Assistant**";
    lines.push(who, "", (m.text || "").trim(), "");
  }
  return lines.join("\n");
}

export function downloadMarkdown(conv) {
  const md = conversationToMarkdown(conv);
  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${convTitle(conv).replace(/\W+/g, "-").toLowerCase() || "conversation"}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Open a self-contained printable window (user chooses "Save as PDF").
export function printConversation(conv) {
  const esc = (s) => (s || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const rows = (conv.transcript || [])
    .map((m) => {
      const who = m.role === "user" ? "You" : "Assistant";
      const cls = m.role === "user" ? "user" : "assistant";
      return `<div class="msg ${cls}"><div class="who">${who}</div><div class="body">${esc((m.text || "").trim()).replace(/\n/g, "<br>")}</div></div>`;
    })
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(convTitle(conv))}</title>
<style>
  body{font:14px/1.55 -apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:32px;max-width:760px}
  h1{margin:0 0 2px} .date{color:#777;margin-bottom:18px;font-size:12px}
  .msg{margin:0 0 14px;padding:10px 12px;border-radius:10px}
  .msg.user{background:#eef2ff}.msg.assistant{background:#f6f6f8}
  .who{font-weight:700;font-size:11px;text-transform:uppercase;color:#666;margin-bottom:4px}
  .body{white-space:normal;word-wrap:break-word}
</style></head><body>
  <h1>${esc(convTitle(conv))}</h1>
  <div class="date">${conv.updatedAt ? esc(new Date(conv.updatedAt).toLocaleString()) : ""}</div>
  ${rows || "<p>(empty)</p>"}
  <script>window.onload=function(){setTimeout(function(){window.print()},200)}</script>
</body></html>`;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
}
