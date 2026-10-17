// Read-only CMS proxy for readmcp. Node 18+, no dependencies.
// UPSTREAM=https://cms.example.com TOKEN=... ALLOW_ORIGIN=https://example.com node node-proxy.mjs
import { createServer } from 'node:http';

const { UPSTREAM, TOKEN, ALLOW_ORIGIN = '*', PORT = 8787 } = process.env;
const ALLOW = [/^\/api\/[a-z0-9-]+$/, /^\/v\d{4}-\d{2}-\d{2}\/data\/query\//, /^\/spaces\/[^/]+\/environments\/[^/]+\/entries$/];

createServer(async (req, res) => {
  const cors = { 'Access-Control-Allow-Origin': ALLOW_ORIGIN, Vary: 'Origin' };
  const url = new URL(req.url, 'http://local');
  if (req.method === 'OPTIONS') return res.writeHead(204, { ...cors, 'Access-Control-Allow-Methods': 'GET' }).end();
  if (req.method !== 'GET' || !ALLOW.some((re) => re.test(url.pathname))) return res.writeHead(403, cors).end('not allowed');
  try {
    const r = await fetch(new URL(url.pathname + url.search, UPSTREAM), { headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' } });
    res.writeHead(r.status, { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' });
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    res.writeHead(502, cors).end('upstream error');
  }
}).listen(PORT, () => console.log(`readmcp proxy on :${PORT} → ${UPSTREAM}`));
