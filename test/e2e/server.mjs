// Tiny static server for e2e tests, with a WordPress REST API mock under /wp/wp-json/.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.map': 'application/json', '.md': 'text/markdown; charset=utf-8' };

export function serve(root, { wp } = {}) {
  const log = [];
  const server = createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    log.push(u.pathname + u.search);
    if (wp && u.pathname.startsWith('/wp/wp-json/')) return wpMock(wp, u, res);
    let p = join(root, decodeURIComponent(u.pathname));
    if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
    if (!existsSync(p)) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      return res.end('not found');
    }
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' });
    res.end(readFileSync(p));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port, log })));
}

function wpMock(wp, u, res) {
  const json = (body, headers = {}) => {
    res.writeHead(200, { 'content-type': 'application/json', ...headers });
    res.end(JSON.stringify(body));
  };
  const path = u.pathname.replace('/wp/wp-json/', '');
  if (path === '' || path === '/') return json({ name: wp.name, description: wp.description, url: wp.url });
  if (path === 'wp/v2/tags') return json(wp.tags);
  if (path === 'wp/v2/categories') return json(wp.categories);
  if (path === 'wp/v2/users') return json(wp.users);
  if (path === 'wp/v2/posts') {
    let ps = wp.posts;
    const q = u.searchParams;
    if (q.get('slug')) ps = ps.filter((p) => p.slug === q.get('slug'));
    if (q.get('search')) ps = ps.filter((p) => (p.title.rendered + p.content.rendered).toLowerCase().includes(q.get('search').toLowerCase()));
    if (q.get('tags')) ps = ps.filter((p) => p.tags.includes(+q.get('tags')));
    return json(ps, { 'X-WP-Total': String(ps.length) });
  }
  res.writeHead(404);
  res.end('{}');
}
