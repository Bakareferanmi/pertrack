import { buildPush } from './webpush.js';

const WEEK = 10080;           // minutes
const MAX_REMINDERS = 200;    // a teacher's week is ~80
const MAX_PER_RUN = 45;       // Workers free plan allows 50 outbound requests per run
const STALE_DAYS = 120;

const J = (o, status = 200, h = {}) =>
  new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', ...h } });

const corsHeaders = (env) => ({
  'access-control-allow-origin': env.ALLOWED_ORIGIN || '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
  vary: 'origin',
});

const sha256hex = async (s) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))]
    .map((b) => b.toString(16).padStart(2, '0')).join('');

const str = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max;
const vapid = (env) => ({ subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC, privateKey: env.VAPID_PRIVATE });

/** Send one push. Resolves to the HTTP status; 404/410 mean the subscription is gone. */
export async function deliver(env, sub, message) {
  const init = await buildPush(message, sub, vapid(env), { ttl: 120, urgency: 'high' });
  const res = await fetch(sub.endpoint, init);
  return res.status;
}

async function dropSub(env, id) {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM reminders WHERE sub_id = ?').bind(id),
    env.DB.prepare('DELETE FROM subs WHERE id = ?').bind(id),
  ]);
}

/** Looks up an existing subscription and checks the caller knows its secret (the auth key). */
async function owned(env, subscription) {
  if (!subscription || !str(subscription.endpoint, 700) || !subscription.endpoint.startsWith('https://')) return null;
  const k = subscription.keys || {};
  if (!str(k.p256dh, 200) || !str(k.auth, 100)) return null;
  const id = await sha256hex(subscription.endpoint);
  const row = await env.DB.prepare('SELECT id, auth FROM subs WHERE id = ?').bind(id).first();
  return { id, row, k };
}

async function subscribe(env, body) {
  const o = await owned(env, body.subscription);
  if (!o) return J({ error: 'bad subscription' }, 400);
  if (o.row && o.row.auth !== o.k.auth) return J({ error: 'forbidden' }, 403);

  const offset = Number(body.offset);                       // minutes the device is ahead of UTC
  if (!Number.isInteger(offset) || offset < -840 || offset > 840) return J({ error: 'bad offset' }, 400);
  const list = Array.isArray(body.reminders) ? body.reminders : null;
  if (!list || list.length > MAX_REMINDERS) return J({ error: 'bad reminders' }, 400);

  const rows = [];
  for (const r of list) {
    if (!Number.isInteger(r.day) || r.day < 0 || r.day > 6) return J({ error: 'bad day' }, 400);
    if (!Number.isInteger(r.min) || r.min < 0 || r.min > 1439) return J({ error: 'bad minute' }, 400);
    if (!str(r.title, 120) || !str(r.body, 240) || !str(r.tag, 60)) return J({ error: 'bad text' }, 400);
    const slot = (((r.day * 1440 + r.min - offset) % WEEK) + WEEK) % WEEK;
    rows.push([o.id, slot, r.title, r.body, r.tag]);
  }

  const stmts = [
    env.DB.prepare(
      'INSERT INTO subs (id, endpoint, p256dh, auth, updated) VALUES (?, ?, ?, ?, ?) ' +
      'ON CONFLICT(id) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth, updated = excluded.updated',
    ).bind(o.id, body.subscription.endpoint, o.k.p256dh, o.k.auth, Math.floor(Date.now() / 1000)),
    env.DB.prepare('DELETE FROM reminders WHERE sub_id = ?').bind(o.id),
  ];
  for (let i = 0; i < rows.length; i += 19) {            // 5 params per row, D1 allows 100 per statement
    const chunk = rows.slice(i, i + 19);
    stmts.push(
      env.DB.prepare(
        'INSERT INTO reminders (sub_id, slot, title, body, tag) VALUES ' + chunk.map(() => '(?,?,?,?,?)').join(','),
      ).bind(...chunk.flat()),
    );
  }
  await env.DB.batch(stmts);
  return J({ ok: true, count: rows.length });
}

async function unsubscribe(env, body) {
  const o = await owned(env, body.subscription);
  if (!o) return J({ error: 'bad subscription' }, 400);
  if (o.row && o.row.auth !== o.k.auth) return J({ error: 'forbidden' }, 403);
  if (o.row) await dropSub(env, o.id);
  return J({ ok: true });
}

async function test(env, ctx, body) {
  const o = await owned(env, body.subscription);
  if (!o || !o.row) return J({ error: 'not subscribed' }, 404);
  if (o.row.auth !== o.k.auth) return J({ error: 'forbidden' }, 403);
  const sub = { endpoint: body.subscription.endpoint, p256dh: o.k.p256dh, auth: o.k.auth };
  // Wait 10 s so the person can close the app first; waitUntil keeps the Worker alive after we respond.
  ctx.waitUntil(
    new Promise((r) => setTimeout(r, 10000))
      .then(() => deliver(env, sub, { title: 'PERTRACK test', body: 'Closed-app reminders are working.', tag: 'pertrack-test', test: true }))
      .then((s) => (s === 404 || s === 410 ? dropSub(env, o.id) : null))
      .catch(() => {}),
  );
  return J({ ok: true, in: 10 });
}

export default {
  async fetch(req, env, ctx) {
    const cors = corsHeaders(env);
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method === 'GET' && url.pathname === '/') return J({ ok: true, service: 'pertrack-push' }, 200, cors);
    // The VAPID *public* key is public by design; the PWA fetches it so nobody has to copy it by hand.
    if (req.method === 'GET' && url.pathname === '/api/key')
      return J({ key: env.VAPID_PUBLIC }, 200, { ...cors, 'cache-control': 'public, max-age=3600' });
    if (req.method !== 'POST') return J({ error: 'not found' }, 404, cors);
    if (Number(req.headers.get('content-length') || 0) > 100000) return J({ error: 'too large' }, 413, cors);

    let body;
    try { body = await req.json(); } catch { return J({ error: 'bad json' }, 400, cors); }

    let res;
    try {
      if (url.pathname === '/api/subscribe') res = await subscribe(env, body);
      else if (url.pathname === '/api/unsubscribe') res = await unsubscribe(env, body);
      else if (url.pathname === '/api/test') res = await test(env, ctx, body);
      else res = J({ error: 'not found' }, 404);
    } catch (e) {
      res = J({ error: 'server error' }, 500);
    }
    Object.entries(cors).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  },

  /** Runs every minute: push whatever is due right now. */
  async scheduled(event, env, ctx) {
    const t = new Date(event.scheduledTime);
    const slot = t.getUTCDay() * 1440 + t.getUTCHours() * 60 + t.getUTCMinutes();

    const { results } = await env.DB.prepare(
      'SELECT r.title, r.body, r.tag, s.id, s.endpoint, s.p256dh, s.auth ' +
      'FROM reminders r JOIN subs s ON s.id = r.sub_id WHERE r.slot = ? LIMIT ?',
    ).bind(slot, MAX_PER_RUN).all();

    const gone = [];
    await Promise.allSettled(
      results.map(async (r) => {
        const status = await deliver(env, r, { title: r.title, body: r.body, tag: r.tag });
        if (status === 404 || status === 410) gone.push(r.id);
      }),
    );
    for (const id of new Set(gone)) await dropSub(env, id);

    // Once a day (03:00 UTC) forget devices that haven't opened the app in a long time.
    if (slot % 1440 === 180) {
      const cutoff = Math.floor(Date.now() / 1000) - STALE_DAYS * 86400;
      await env.DB.batch([
        env.DB.prepare('DELETE FROM reminders WHERE sub_id IN (SELECT id FROM subs WHERE updated < ?)').bind(cutoff),
        env.DB.prepare('DELETE FROM subs WHERE updated < ?').bind(cutoff),
      ]);
    }
  },
};
