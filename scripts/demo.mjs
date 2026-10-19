// Generates the demo blog (and e2e fixture) into demo/site from demo/posts.mjs.
// Usage: node scripts/demo.mjs [baseUrl]
import { mkdirSync, writeFileSync, copyFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { site, posts } from '../demo/posts.mjs';

const BASE = (process.argv[2] || 'http://localhost:8080/').replace(/\/?$/, '/');
const OUT = process.env.DEMO_OUT || 'demo/site';
const REPO = 'https://github.com/webmaxru/agentprose';
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const sorted = [...posts].sort((a, b) => b.date.localeCompare(a.date));
const tagSlug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const CSS = `
:root{--fg:#0f172a;--muted:#64748b;--line:#e2e8f0;--accent:#2563eb;--bg:#fff;--code:#0b1020}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;font:17px/1.65 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--fg);background:var(--bg)}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:760px;margin:0 auto;padding:0 20px}
.site-header{border-bottom:1px solid var(--line)}
.site-header .wrap{display:flex;align-items:center;gap:16px;height:60px}
.logo{font-weight:800;color:var(--fg);font-size:18px;letter-spacing:-.01em}.logo span{color:var(--accent)}
.site-header nav{margin-left:auto;display:flex;gap:18px;font-size:15px}.site-header nav a{color:var(--muted)}
.hero{padding:48px 0 24px}.hero h1{font-size:clamp(30px,6vw,44px);line-height:1.12;letter-spacing:-.02em;margin:0 0 14px}
.hero p{color:#334155;font-size:19px;margin:0 0 22px}
.snippet{position:relative;background:var(--code);color:#e2e8f0;border-radius:12px;padding:16px 84px 16px 18px;font:13.5px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;overflow-x:auto;white-space:pre}
.copy{position:absolute;top:10px;right:10px;background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:4px 10px;font-size:12px;cursor:pointer}
.cta{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0 8px}
.cta a,.cta button{display:inline-block;border-radius:10px;padding:10px 16px;font-weight:600;font-size:15px;border:1px solid var(--line);background:#fff;color:var(--fg);cursor:pointer}
.cta .primary{background:var(--accent);border-color:var(--accent);color:#fff}
.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin:28px 0}
.features div{border:1px solid var(--line);border-radius:12px;padding:14px 16px;font-size:15px}.features b{display:block;margin-bottom:4px}
h2.section{font-size:14px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:40px 0 8px}
.post-list article{padding:18px 0;border-bottom:1px solid var(--line)}
.post-list h3{margin:0 0 4px;font-size:21px;line-height:1.3}.post-list p{margin:4px 0;color:#334155}
.meta{color:var(--muted);font-size:14px}.meta a{color:var(--muted)}
.tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.tags a{font-size:13px;background:#f1f5f9;color:#334155;border-radius:999px;padding:2px 10px}
.post{padding:36px 0}.post h1{font-size:clamp(28px,5.5vw,40px);line-height:1.15;letter-spacing:-.02em;margin:0 0 10px}
.post-content h2{font-size:24px;margin:34px 0 8px;line-height:1.25}
.post-content pre{background:var(--code);color:#e2e8f0;border-radius:10px;padding:14px 16px;overflow-x:auto;font-size:13.5px;line-height:1.5}
.post-content code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.88em}
.post-content :not(pre)>code{background:#f1f5f9;border-radius:5px;padding:1px 5px}
.post-content blockquote{margin:20px 0;border-left:4px solid var(--accent);padding:2px 16px;color:#334155;background:#f8fafc}
.post-content table{border-collapse:collapse;width:100%;font-size:15px;display:block;overflow-x:auto}.post-content td,.post-content th{border:1px solid var(--line);padding:6px 10px;text-align:left}
.share{margin:28px 0;padding:14px 0;border-top:1px solid var(--line);color:var(--muted);font-size:14px}
.site-footer{border-top:1px solid var(--line);margin-top:48px;padding:24px 0;color:var(--muted);font-size:14px}
`;

function layout({ title, description, path, body, head = '', inspector = '' }) {
  const url = BASE + path;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${BASE}og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="alternate" type="application/rss+xml" title="${esc(site.name)}" href="${BASE}feed.xml">
<link rel="alternate" type="application/feed+json" title="${esc(site.name)}" href="${BASE}feed.json">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📖</text></svg>">
<style>${CSS}</style>
${head}
<script src="/agentprose.min.js" defer data-subscribe="${BASE}feed.xml" data-inspector${inspector}></script>
</head>
<body>
<header class="site-header"><div class="wrap"><a class="logo" href="/">agent<span>prose</span></a><nav><a href="/">Posts</a><a href="/about/">About</a><a href="${REPO}">GitHub</a></nav></div></header>
${body}
<footer class="site-footer"><div class="wrap">A demo of <a href="${REPO}">agentprose</a>, MIT licensed. This page registers WebMCP tools with one script tag; open the 🔌 panel to call them.</div></footer>
</body>
</html>`;
}

const tagLinks = (tags) => `<div class="tags">${tags.map((t) => `<a href="/tags/${tagSlug(t)}/" rel="tag">${esc(t)}</a>`).join('')}</div>`;
const card = (p) => `<article><h3><a href="/posts/${p.slug}/">${esc(p.title)}</a></h3><div class="meta"><time datetime="${p.date}">${fmt(p.date)}</time> · ${esc(p.author)}</div><p>${esc(p.summary)}</p>${tagLinks(p.tags)}</article>`;

const SNIPPET = `<script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" defer></script>`;
const home = layout({
  title: `${site.name} — agent-readable with one line`,
  description: site.description,
  path: '',
  inspector: '="open"',
  head: `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: site.name, description: site.description, url: BASE })}</script>`,
  body: `<main class="wrap">
<section class="hero">
<h1>This blog talks to AI agents.</h1>
<p>It is plain static HTML. One script tag gives every agent in the browser search, articles as markdown, sections and site info through <a href="/posts/what-webmcp-means-for-blogs/">WebMCP</a>.</p>
<div class="snippet" id="snippet">${esc(SNIPPET)}<button class="copy" type="button" data-copy>Copy</button></div>
<div class="cta"><button class="primary" type="button" data-open-inspector>Try the tools →</button><a href="${REPO}">GitHub</a><a href="/posts/one-line-install/">How it works</a></div>
<div class="features">
<div><b>Zero config</b>Reads JSON-LD, OpenGraph, &lt;article&gt;, feeds, sitemap.xml and llms.txt.</div>
<div><b>9 KB</b>gzipped. Nothing is fetched until an agent asks.</div>
<div><b>Any stack</b>Static sites, WordPress, Ghost, Sanity, Contentful, Enonic, Strapi, Storyblok.</div>
<div><b>Safe</b>Read-only tools, untrusted-content hints, no secrets in the page.</div>
</div>
</section>
<h2 class="section">Latest posts</h2>
<div class="post-list">${sorted.map(card).join('')}</div>
</main>
<script src="/demo.js" defer></script>`,
});
writeFileSync(join(OUT, 'index.html'), home);

for (const p of posts) {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: p.title,
    description: p.summary,
    datePublished: p.date,
    dateModified: p.date,
    author: { '@type': 'Person', name: p.author },
    keywords: p.tags.join(', '),
    articleSection: p.category,
    mainEntityOfPage: BASE + `posts/${p.slug}/`,
    publisher: { '@type': 'Organization', name: site.name },
  };
  const html = layout({
    title: `${p.title} · ${site.name}`,
    description: p.summary,
    path: `posts/${p.slug}/`,
    head: `<meta property="og:type" content="article"><meta property="article:published_time" content="${p.date}">${p.tags.map((t) => `<meta property="article:tag" content="${esc(t)}">`).join('')}<script type="application/ld+json">${JSON.stringify(ld)}</script>`,
    body: `<main class="wrap"><article class="post">
<h1>${esc(p.title)}</h1>
<div class="meta"><time datetime="${p.date}">${fmt(p.date)}</time> · <span class="author-name">${esc(p.author)}</span> · <a href="/categories/${tagSlug(p.category)}/" rel="category">${esc(p.category)}</a></div>
${tagLinks(p.tags)}
<div class="post-content">${p.body}</div>
<div class="share">Share: <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(BASE + 'posts/' + p.slug + '/')}">LinkedIn</a> · <a href="/feed.xml">RSS</a></div>
</article></main>`,
  });
  mkdirSync(join(OUT, 'posts', p.slug), { recursive: true });
  writeFileSync(join(OUT, 'posts', p.slug, 'index.html'), html);
}

const tags = [...new Set(posts.flatMap((p) => p.tags))];
for (const t of tags) {
  const list = sorted.filter((p) => p.tags.includes(t));
  mkdirSync(join(OUT, 'tags', tagSlug(t)), { recursive: true });
  writeFileSync(join(OUT, 'tags', tagSlug(t), 'index.html'), layout({ title: `#${t} · ${site.name}`, description: `Posts tagged ${t}`, path: `tags/${tagSlug(t)}/`, body: `<main class="wrap"><h1 style="margin-top:32px">#${esc(t)}</h1><div class="post-list">${list.map(card).join('')}</div></main>` }));
}

mkdirSync(join(OUT, 'about'), { recursive: true });
writeFileSync(join(OUT, 'about', 'index.html'), layout({ title: `About · ${site.name}`, description: 'About this demo.', path: 'about/', body: `<main class="wrap"><h1 style="margin-top:32px">About</h1><p>This is the live demo of <a href="${REPO}">agentprose</a>. Every page loads one script tag. Agents in browsers with WebMCP see the tools natively; everyone else can call them from the 🔌 panel.</p><p>The posts double as the project's end-to-end test fixture.</p></main>` }));

// Feeds, sitemap, llms.txt
const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/"><channel>
<title>${esc(site.name)}</title><link>${BASE}</link><description>${esc(site.description)}</description>
${sorted.slice(0, 4).map((p) => `<item><title>${esc(p.title)}</title><link>${BASE}posts/${p.slug}/</link><guid>${BASE}posts/${p.slug}/</guid><pubDate>${new Date(p.date).toUTCString()}</pubDate><dc:creator>${esc(p.author)}</dc:creator>${p.tags.map((t) => `<category>${esc(t)}</category>`).join('')}<description>${esc(p.summary)}</description><content:encoded><![CDATA[${p.body}]]></content:encoded></item>`).join('\n')}
</channel></rss>`;
writeFileSync(join(OUT, 'feed.xml'), rss);
writeFileSync(join(OUT, 'feed.json'), JSON.stringify({ version: 'https://jsonfeed.org/version/1.1', title: site.name, home_page_url: BASE, feed_url: BASE + 'feed.json', items: sorted.map((p) => ({ id: BASE + `posts/${p.slug}/`, url: BASE + `posts/${p.slug}/`, title: p.title, summary: p.summary, date_published: p.date, tags: p.tags, authors: [{ name: p.author }] })) }, null, 1));
writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>${BASE}</loc></url>\n${sorted.map((p) => `<url><loc>${BASE}posts/${p.slug}/</loc><lastmod>${p.date.slice(0, 10)}</lastmod></url>`).join('\n')}\n<url><loc>${BASE}about/</loc></url>\n${tags.map((t) => `<url><loc>${BASE}tags/${tagSlug(t)}/</loc></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(OUT, 'llms.txt'), `# ${site.name}\n\n> ${site.description}\n\n## Posts\n\n${sorted.map((p) => `- [${p.title}](${BASE}posts/${p.slug}/): ${p.summary}`).join('\n')}\n`);
writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${BASE}sitemap.xml\n`);
writeFileSync(join(OUT, 'demo.js'), `document.addEventListener('click',async(e)=>{const c=e.target.closest('[data-copy]');if(c){await navigator.clipboard?.writeText(document.getElementById('snippet').firstChild.textContent);c.textContent='Copied';setTimeout(()=>c.textContent='Copy',1500)}if(e.target.closest('[data-open-inspector]')){const h=document.getElementById('agentprose-inspector');const p=h&&h.shadowRoot.querySelector('.panel');if(p){p.hidden=false;p.scrollIntoView?.({block:'end'})}else location.search='?agentprose-inspect'}});\n`);

writeFileSync(join(OUT, '404.html'), layout({ title: `Not found · ${site.name}`, description: 'Page not found', path: '404.html', body: '<main class="wrap"><h1 style="margin-top:32px">Not found</h1><p><a href="/">Back to the posts</a></p></main>' }));
writeFileSync(join(OUT, 'tab-site.json'), JSON.stringify({ kind: 'static', worker: { html_handling: 'auto-trailing-slash', not_found_handling: '404-page' } }));

// The library itself, served from the site root.
if (existsSync('dist/adapters')) {
  for (const f of readdirSync('dist').filter((f) => /^agentprose\..*js(\.map)?$/.test(f))) copyFileSync(join('dist', f), join(OUT, f));
  mkdirSync(join(OUT, 'adapters'), { recursive: true });
  for (const f of readdirSync('dist/adapters')) copyFileSync(join('dist/adapters', f), join(OUT, 'adapters', f));
} else console.warn('demo: dist/ not built yet — pages generated without the library (run npm run build first)');
if (existsSync('demo/og.png')) copyFileSync('demo/og.png', join(OUT, 'og.png'));
console.log(`demo: ${posts.length} posts, ${tags.length} tags → ${OUT} (base ${BASE})`);
