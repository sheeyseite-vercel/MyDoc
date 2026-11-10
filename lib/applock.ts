// قفل التطبيق على هذا الجهاز فقط: رمز من 4 أرقام (PBKDF2) + بصمة اختيارية (WebAuthn). لا يشفّر البيانات.
const K = { hash: "lock.hash", salt: "lock.salt", delay: "lock.delay", bio: "lock.bio", fails: "lock.fails", until: "lock.until", hiddenAt: "lock.hiddenAt" };
const enc = new TextEncoder();
const b64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function derive(pin: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]);
  return b64(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: 150000 }, key, 256));
}
export const lockEnabled = () => { try { return !!localStorage.getItem(K.hash); } catch { return false; } };
export async function setPin(pin: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16)); localStorage.setItem(K.salt, b64(salt.buffer as ArrayBuffer)); localStorage.setItem(K.hash, await derive(pin, salt));
  localStorage.removeItem(K.fails); localStorage.removeItem(K.until); if (!localStorage.getItem(K.delay)) localStorage.setItem(K.delay, "60");
}
export const lockedOutFor = () => Math.max(0, Number(localStorage.getItem(K.until) || 0) - Date.now());
export async function verifyPin(pin: string) {
  if (lockedOutFor() > 0) return false; const salt = localStorage.getItem(K.salt), h = localStorage.getItem(K.hash); if (!salt || !h) return false;
  if ((await derive(pin, unb64(salt))) === h) { localStorage.removeItem(K.fails); localStorage.removeItem(K.until); return true; }
  const f = Number(localStorage.getItem(K.fails) || 0) + 1; localStorage.setItem(K.fails, String(f)); if (f >= 5) localStorage.setItem(K.until, String(Date.now() + 30000 * 2 ** (Math.floor(f / 5) - 1)));
  return false;
}
export function disableLock() { Object.values(K).forEach((k) => localStorage.removeItem(k)); sessionStorage.removeItem("lock.ok"); }
export const lockDelay = () => Number(localStorage.getItem(K.delay) ?? 60);
export const setLockDelay = (n: number) => localStorage.setItem(K.delay, String(n));
export const bioEnabled = () => { try { return !!localStorage.getItem(K.bio); } catch { return false; } };
export const bioOff = () => localStorage.removeItem(K.bio);
export async function bioSupported() { try { return !!window.PublicKeyCredential && (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch { return false; } }
export async function bioEnroll() {
  try {
    const cred = (await navigator.credentials.create({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: "MyDoc" }, user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "mydoc", displayName: "MyDoc" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }], authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required", residentKey: "discouraged" }, timeout: 60000 } })) as PublicKeyCredential | null;
    if (!cred) return false; localStorage.setItem(K.bio, b64(cred.rawId)); return true;
  } catch { return false; }
}
export async function bioVerify() {
  const id = localStorage.getItem(K.bio); if (!id) return false;
  try { return !!(await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: "public-key", id: unb64(id) as BufferSource }], userVerification: "required", timeout: 60000 } })); } catch { return false; }
}
export const hiddenKey = K.hiddenAt;
