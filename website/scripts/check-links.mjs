// Checks every internal link and #anchor in the built site, resolved against the real base path.
//   node scripts/check-links.mjs [distDir=dist] [base=from SITE_URL or /agentprose/]
// Fails (exit 1) on a link to a page or file that is not in the build, or to an anchor that is not on the page.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = process.argv[2] || 'dist';
const base = (process.argv[3] || new URL(process.env.SITE_URL || 'https://salnikov.no/agentprose/').pathname).replace(/\/?$/, '/');
const origin = new URL(process.env.SITE_URL || 'https://salnikov.no/agentprose/').origin;

const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.html')) files.push(p);
  }
})(dist);

const ids = new Map();
const idsOf = (file) => {
  if (!ids.has(file)) {
    const html = readFileSync(file, 'utf8');
    ids.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return ids.get(file);
};
const urlOf = (file) => base + relative(dist, file).replace(/index\.html$/, '').replace(/\\/g, '/');

let bad = 0;
let checked = 0;
for (const file of files) {
  const html = readFileSync(file, 'utf8');
  const pageUrl = new URL(urlOf(file), origin);
  for (const m of html.matchAll(/<(?:a|link|img|script|source|iframe)\b[^>]*?\s(?:href|src)="([^"]+)"/g)) {
    if (/rel="canonical"/.test(m[0]) && file.endsWith("404.html")) continue; // the 404 page has no URL of its own
    const raw = m[1].replace(/&amp;/g, '&');
    if (/^(mailto:|tel:|javascript:|data:)/.test(raw)) continue;
    let u;
    try { u = new URL(raw, pageUrl); } catch { console.log(`${urlOf(file)}: unparsable ${raw}`); bad++; continue; }
    if (u.origin !== origin) continue;
    checked++;
    if (!u.pathname.startsWith(base)) { console.log(`${urlOf(file)}: outside the base ${raw}`); bad++; continue; }
    const rel = decodeURIComponent(u.pathname.slice(base.length));
    let target = join(dist, rel);
    if (rel === '' || rel.endsWith('/')) target = join(target, 'index.html');
    if (!existsSync(target)) {
      if (rel.startsWith('downloads/') && process.env.ALLOW_MISSING_DOWNLOADS) continue;
      console.log(`${urlOf(file)}: missing ${raw}`); bad++; continue;
    }
    if (u.hash && target.endsWith('.html')) {
      const id = decodeURIComponent(u.hash.slice(1));
      if (id && !idsOf(target).has(id)) { console.log(`${urlOf(file)}: missing anchor ${raw}`); bad++; }
    }
  }
}
console.log(`check-links: ${files.length} pages, ${checked} internal links and assets under ${base}, ${bad} broken`);
process.exit(bad ? 1 : 0);
