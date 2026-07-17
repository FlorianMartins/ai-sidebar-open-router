// Standalone microphone-permission primer. The getUserMedia prompt does NOT reliably appear in the
// sidebar / side panel, but a normal extension TAB prompts fine — and once granted (with "remember"),
// the permission persists for the extension origin, so dictation then works from the sidebar too.
const statusEl = document.getElementById("status");

async function grant() {
  statusEl.className = "";
  statusEl.textContent = "…";

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((tr) => tr.stop()); // we only wanted the permission, not the audio
    statusEl.className = "ok";
    statusEl.textContent = "✅ Micro autorisé ! Reviens dans la sidebar et clique sur le micro 🎙. (Tu peux fermer cet onglet.)";
  } catch (e) {
    const nm = (e && (e.name || e.message)) || "erreur inconnue";
    statusEl.className = "err";
    statusEl.textContent = "❌ " + nm + " — vérifie qu'un micro est branché et que tu as cliqué « Autoriser ».";
  }
}

document.getElementById("grant").addEventListener("click", grant);
