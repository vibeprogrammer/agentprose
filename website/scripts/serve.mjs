// Serves dist/ under the base path (like GitHub Pages) for local checks: node scripts/serve.mjs [port]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const port = +(process.argv[2] || 4329);
const base = new URL(process.env.SITE_URL || `http://localhost:${port}/agentprose/`).pathname.replace(/\/?$/, '/');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.zip': 'application/zip', '.wasm': 'application/wasm', '.pf_meta': 'application/octet-stream' };

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = decodeURIComponent(url.pathname);
  if (!p.startsWith(base)) { res.writeHead(404); return res.end('outside base'); }
  let file = join('dist', p.slice(base.length));
  try {
    const s = await stat(file);
    if (s.isDirectory()) {
      if (!p.endsWith('/')) { res.writeHead(301, { location: p + '/' }); return res.end(); }
      file = join(file, 'index.html');
    }
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    res.end(await readFile(join('dist', '404.html')).catch(() => 'not found'));
  }
}).listen(port, () => console.log(`serving dist at http://localhost:${port}${base}`));
