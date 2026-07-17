// Optional ENCRYPTED settings backup/sync — keeps the BYOK privacy model: nothing is uploaded. The
// user exports a passphrase-encrypted blob (settings incl. keys), moves the file to another device,
// and imports it there. AES-256-GCM with a PBKDF2-derived key (Web Crypto, 100k iterations).

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64(bytes) {
  let s = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s);
}
function unb64(str) {
  const bin = atob(str);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function deriveKey(passphrase, salt) {
  const base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptSettings(obj, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const data = enc.encode(JSON.stringify(obj));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
  return JSON.stringify({ v: 1, app: "hivey-sidebar", salt: b64(salt), iv: b64(iv), data: b64(ct) });
}

export async function decryptSettings(blobStr, passphrase) {
  const blob = JSON.parse(blobStr);
  if (!blob || blob.app !== "hivey-sidebar" || !blob.salt) throw new Error("Not a Hivey settings backup");
  const key = await deriveKey(passphrase, unb64(blob.salt));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(blob.iv) }, key, unb64(blob.data));
  return JSON.parse(dec.decode(pt));
}
