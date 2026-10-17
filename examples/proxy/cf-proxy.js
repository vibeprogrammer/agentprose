// Cloudflare Worker: read-only CMS proxy for agentprose (deploy as your Worker's main module).
// Vars: UPSTREAM (e.g. https://abc123.api.sanity.io), TOKEN (secret), ALLOW_ORIGIN (e.g. https://example.com)
const ALLOW = [/^\/v\d{4}-\d{2}-\d{2}\/data\/query\//, /^\/spaces\/[^/]+\/environments\/[^/]+\/entries$/, /^\/api\/[a-z0-9-]+$/, /^\/v2\/cdn\/(stories|tags)/];

export default {
  async fetch(req, env, ctx) {
    const cors = { 'Access-Control-Allow-Origin': env.ALLOW_ORIGIN, 'Vary': 'Origin' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: { ...cors, 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Allow-Headers': 'Accept' } });
    if (req.method !== 'GET') return new Response('read-only', { status: 405, headers: cors });
    const url = new URL(req.url);
    if (!ALLOW.some((re) => re.test(url.pathname))) return new Response('not allowed', { status: 403, headers: cors });
    const cache = caches.default;
    const hit = await cache.match(req);
    if (hit) return hit;
    const up = new URL(url.pathname + url.search, env.UPSTREAM);
    const res = await fetch(up, { headers: { Authorization: `Bearer ${env.TOKEN}`, Accept: 'application/json' } });
    const out = new Response(res.body, { status: res.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60', ...cors } });
    if (res.ok) ctx.waitUntil(cache.put(req, out.clone()));
    return out;
  },
};
