// Minimal Web Push for Cloudflare Workers: RFC 8291 (aes128gcm) payload encryption + RFC 8292 (VAPID).
// Written against Web Crypto only, so it needs no packages. aes128gcm is the format iPhones require.
const enc = new TextEncoder();

export const b64u = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const unb64u = (s) => {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
};
const concat = (...parts) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};
const hkdf = async (salt, ikm, info, bytes) =>
  new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']),
    bytes * 8,
  ));

/** Encrypts `plaintext` (Uint8Array) for a browser subscription. Returns the full aes128gcm body. */
export async function encrypt(plaintext, p256dh, auth) {
  const ua = unb64u(p256dh);
  const authSecret = unb64u(auth);
  const eph = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', eph.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', ua, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, eph.privateKey, 256));

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hkdf(authSecret, shared, concat(enc.encode('WebPush: info\0'), ua, asPub), 32);
  const cek = await hkdf(salt, prk, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, prk, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  // One record: payload + 0x02 delimiter (last record). Record size 4096 is far above our tiny messages.
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(plaintext, new Uint8Array([2]))));
  const header = concat(salt, new Uint8Array([0, 0, 0x10, 0]), new Uint8Array([asPub.length]), asPub);
  return concat(header, sealed);
}

let signKey, signKeyFor;
/** VAPID Authorization header value for the push service that owns `endpoint`. */
export async function vapidAuthorization(endpoint, { subject, publicKey, privateKey }) {
  if (signKeyFor !== privateKey) {
    const pub = unb64u(publicKey);                                   // 0x04 || X(32) || Y(32)
    signKey = await crypto.subtle.importKey(
      'jwk',
      { kty: 'EC', crv: 'P-256', x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), d: privateKey, ext: true },
      { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'],
    );
    signKeyFor = privateKey;
  }
  const head = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u(enc.encode(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signKey, enc.encode(`${head}.${claims}`));
  return `vapid t=${head}.${claims}.${b64u(sig)}, k=${publicKey}`;
}

/** Builds the fetch() init for one push message. */
export async function buildPush(message, sub, vapid, { ttl = 120, urgency = 'high' } = {}) {
  const body = await encrypt(enc.encode(JSON.stringify(message)), sub.p256dh, sub.auth);
  return {
    method: 'POST',
    headers: {
      authorization: await vapidAuthorization(sub.endpoint, vapid),
      'content-encoding': 'aes128gcm',
      'content-type': 'application/octet-stream',
      ttl: String(ttl),
      urgency,
    },
    body,
  };
}
