import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
import { DOMParser as LinkeDOMParser } from 'linkedom';
import { extractPage, extractSite } from '../core/extract';
import { autoSource } from '../core/source';
import { stripHtml } from '../core/util';

// The core runs on web APIs; linkedom provides DOMParser in Node.
(globalThis as any).DOMParser ||= LinkeDOMParser;

const VERSION = typeof __VERSION__ === 'string' ? __VERSION__ : 'dev';
declare const __VERSION__: string;

const HELP = `agentprose ${VERSION} — make a site's content readable by AI agents through WebMCP

Usage:
  agentprose build <dir> --base-url <url> [options]   Index a static site's HTML output
  agentprose inspect <url>                            Show what agents can read on a live page
  agentprose --version | --help

build options:
  --base-url <url>    Public URL of the site root (required), e.g. https://example.com/
  --out <dir>         Where to write agentprose.json and agentprose/ (default: <dir>)
  --include <regex>   Only index pages whose path matches (e.g. "^/(posts|blog)/")
  --exclude <regex>   Skip pages whose path matches
  --all               Index every page, not only article-like ones
  --inline            Put full markdown inside agentprose.json (small sites) instead of one .md per post
  --llms              Also write llms.txt (skipped if one exists)
  --content <sel>     CSS selector of the article body, if auto-detection picks the wrong element

Works with the output folder of Hugo (public/), Jekyll (_site/), Astro (dist/), Eleventy (_site/),
Next.js static export (out/), Gatsby (public/), Docusaurus (build/) and any other generator.`;

function args(argv: string[]) {
  const o: Record<string, string | boolean> = {};
  const pos: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      const v = argv[i + 1];
      if (v !== undefined && !v.startsWith('--') && !['all', 'inline', 'llms', 'help', 'version', 'json'].includes(k)) {
        o[k] = v;
        i++;
      } else o[k] = true;
    } else pos.push(a);
  }
  return { o, pos };
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.') || name === 'node_modules') continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.html?$/i.test(name)) out.push(p);
  }
  return out;
}

const SKIP = /(^|\/)(404|500)\.html?$|\/(tags?|categor(y|ies)|topics?|authors?|page|search|archives?)(\/|$)/i;

export async function build(dir: string, o: Record<string, string | boolean>) {
  const base = String(o['base-url'] || '').replace(/\/?$/, '/');
  if (!/^https?:\/\//.test(base)) throw new Error('--base-url is required, e.g. --base-url https://example.com/');
  const outDir = String(o.out || dir);
  const inc = o.include ? new RegExp(String(o.include)) : undefined;
  const exc = o.exclude ? new RegExp(String(o.exclude)) : undefined;
  const files = walk(dir);
  const posts: any[] = [];
  let site: any = {};
  for (const file of files) {
    const rel = '/' + relative(dir, file).split(sep).join('/');
    const path = rel.replace(/index\.html?$/i, '').replace(/\.html?$/i, '');
    const url = new URL(path.replace(/^\//, ''), base).href;
    const html = readFileSync(file, 'utf8');
    const doc = new DOMParser().parseFromString(html, 'text/html');
    if (rel === '/index.html') site = extractSite(doc, url);
    if (SKIP.test(rel) || (inc && !inc.test(path)) || (exc && exc.test(path))) continue;
    if (doc.querySelector('meta[http-equiv="refresh"]')) continue; // redirect stubs
    const p = extractPage(doc, url, { selector: o.content ? String(o.content) : undefined });
    if (!o.all && !p.isArticle) continue;
    const { isArticle, description, markdown, source, ...meta } = p;
    const rec: any = { ...meta, text: stripHtml(markdown || '').slice(0, 1500) };
    if (o.inline) rec.markdown = markdown;
    else {
      const slug = (path.replace(/^\/|\/$/g, '') || 'index').replace(/[^\w\-/.]+/g, '-');
      const mdPath = `agentprose/posts/${slug}.md`;
      mkdirSync(dirname(join(outDir, mdPath)), { recursive: true });
      writeFileSync(join(outDir, mdPath), `# ${p.title}\n\n${markdown}\n`);
      rec.md = new URL(mdPath, base).pathname;
    }
    posts.push(rec);
  }
  posts.sort((a, b) => (b.published || '').localeCompare(a.published || ''));
  const index = { version: 1, generator: `agentprose ${VERSION}`, generated: new Date().toISOString(), site: { ...site, url: base }, posts };
  mkdirSync(outDir, { recursive: true });
  const json = JSON.stringify(index);
  writeFileSync(join(outDir, 'agentprose.json'), json);
  if (o.llms && !existsSync(join(outDir, 'llms.txt'))) {
    const lines = [`# ${site.name || new URL(base).host}`, '', site.description ? `> ${site.description}\n` : '', '## Posts', '', ...posts.map((p) => `- [${p.title}](${p.url})${p.summary ? ': ' + p.summary : ''}`)];
    writeFileSync(join(outDir, 'llms.txt'), lines.filter((l, i) => l || lines[i - 1]).join('\n') + '\n');
  }
  return { pages: files.length, posts: posts.length, bytes: json.length };
}

export async function inspect(url: string) {
  const r = await fetch(url, { headers: { 'User-Agent': `agentprose-inspect/${VERSION}` } });
  const html = await r.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const page = extractPage(doc, r.url || url);
  const site = extractSite(doc, r.url || url);
  const src = autoSource({ cacheTtl: 0, pagefind: false }, doc, r.url || url);
  const corpus = await src.corpus();
  const words = (page.markdown || '').split(/\s+/).filter(Boolean).length;
  const ld = [...doc.querySelectorAll('script[type="application/ld+json"]')].length;
  const checks: [string, boolean, string][] = [
    ['Article detected', page.isArticle, page.isArticle ? `"${page.title}" (${words} words)` : 'no Article JSON-LD, og:type=article or long <article>'],
    ['Structured data (JSON-LD)', ld > 0, `${ld} block(s)`],
    ['Published date', !!page.published, page.published || 'missing'],
    ['Author', !!page.authors?.length, page.authors?.join(', ') || 'missing'],
    ['Feed', corpus.sources.includes('feed') || corpus.sources.includes('index'), site.feeds?.join(', ') || corpus.site.feeds?.join(', ') || 'none found'],
    ['Sitemap', corpus.sources.includes('sitemap'), corpus.site.sitemap || 'none found'],
    ['llms.txt', corpus.sources.includes('llms.txt'), corpus.site.llmsTxt || 'none found'],
    ['WebMCP tools on page', /modelContext|agentprose/.test(html), /agentprose/.test(html) ? 'agentprose installed' : 'none (add the agentprose script tag)'],
  ];
  return { url: r.url || url, status: r.status, title: page.title, posts: corpus.posts.length, sources: corpus.sources, checks, score: Math.round((checks.filter((c) => c[1]).length / checks.length) * 100) };
}

async function main() {
  const { o, pos } = args(process.argv.slice(2));
  if (o.version) return console.log(VERSION);
  const [cmd, target] = pos;
  if (!cmd || o.help) return console.log(HELP);
  if (cmd === 'build') {
    if (!target) throw new Error('build needs a directory, e.g. agentprose build public --base-url https://example.com/');
    const t0 = Date.now();
    const r = await build(target, o);
    console.log(`agentprose: indexed ${r.posts} posts from ${r.pages} HTML pages → ${join(String(o.out || target), 'agentprose.json')} (${(r.bytes / 1024).toFixed(1)} KB) in ${Date.now() - t0} ms`);
    return;
  }
  if (cmd === 'inspect') {
    if (!target) throw new Error('inspect needs a URL');
    const r = await inspect(target);
    if (o.json) return console.log(JSON.stringify(r, null, 2));
    console.log(`\n${r.title}\n${r.url} (HTTP ${r.status})\n`);
    for (const [name, ok, detail] of r.checks) console.log(`${ok ? '✔' : '✘'} ${name.padEnd(28)} ${detail}`);
    console.log(`\nPosts discoverable: ${r.posts} (via ${r.sources.join(', ') || 'page only'})\nAgent-readiness: ${r.score}/100\n`);
    return;
  }
  throw new Error(`unknown command "${cmd}". Try --help.`);
}

const isMain = process.argv[1] && /cli(\.js|\.ts)?$|agentprose$/.test(process.argv[1]);
if (isMain) main().catch((e) => {
  console.error('agentprose:', e.message);
  process.exit(1);
});
