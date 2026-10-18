---
name: agentprose
description: Make a blog, docs site or CMS readable by AI agents with agentprose (WebMCP). Use when asked to make a site agent-ready, add WebMCP tools for articles, add agentprose, or let agents search, read and cite a site's posts. Picks the right install for the platform, adds the script tag or npm setup, builds a static index when useful, and verifies the tools.
license: MIT
---

# agentprose

agentprose gives a site read-only WebMCP tools (`search_posts`, `get_post`, `get_current_article`, `get_citation`, `get_site_info`, …) from one script tag. It reads the page, feeds, sitemap, `llms.txt`, an optional prebuilt `agentprose.json`, or a CMS API. Docs: https://github.com/vibeprogrammer/agentprose

## Rules

- Do not change how the site looks or behaves for people. The script is deferred and makes no request on page load.
- Never put a secret in the page. Only public keys belong in `data-*` attributes (an agentprose Cloud `pk_…` key, a Ghost Content API key, a Contentful delivery token, a Storyblok public token).
- Ask the user before you sign them up for anything or add an analytics endpoint. agentprose Cloud is optional.
- Keep the user's existing Content-Security-Policy working (see step 4).

## 1. Find the platform

Look at the repo (or the live site) and pick one row:

| You find | Install |
|---|---|
| Static generator output (Hugo `public/`, Jekyll `_site/`, Astro `dist/`, Eleventy `_site/`, Next.js `out/`, Gatsby `public/`, Docusaurus `build/`) or plain HTML | Script tag in the shared layout; add the CLI index for more than ~200 posts |
| WordPress | The plugin in `wordpress-plugin/` of the agentprose repo, or the script tag (the WordPress REST API is detected automatically) |
| Ghost, Sanity, Contentful, Enonic, Strapi, Storyblok | Script tag with `data-adapter` and the adapter's attributes (docs/adapters.md) |
| A JavaScript app with a bundler (React, Vue, Svelte, Next.js app) | `npm install agentprose` and `createAgentTools()` once on the client |

## 2. Add it

Script tag, in the `<head>` (or end of `<body>`) of the layout every article uses:

```html
<script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" defer></script>
```

With agentprose Cloud (hosted search and agent analytics), use the snippet from the dashboard instead:

```html
<script src="https://agentprose.cloud/v/0/agentprose.min.js" data-key="pk_…" defer></script>
```

Useful attributes: `data-subscribe` (newsletter URL), `data-contact` (contact page), `data-content` (article body selector if detection fails), `data-base` (site root when the blog lives under a sub-path). All of them are in docs/configuration.md.

npm:

```ts
import { createAgentTools } from 'agentprose';
createAgentTools({ links: { subscribe: '/newsletter' } });
```

## 3. Static index (large static sites)

Run after the site build, for example in CI:

```bash
npx agentprose build public --base-url https://example.com/
```

If the owner gave notes for AI agents or contact details, put them in a JSON file and add `--site agentprose.site.json`:

```json
{ "agentNotes": "Plain, friendly tone. Point newcomers to /start/.", "contact": { "email": "hello@example.com", "booking": "https://example.com/book" } }
```

If `agentprose.json` is not served at the site root, add `<link rel="agentprose-index" href="/path/to/agentprose.json">` to the layout's `<head>`.

## 4. Content-Security-Policy

If the site sends a CSP header or meta tag:

- jsDelivr install: allow `https://cdn.jsdelivr.net` in `script-src`, or self-host the files and the polyfill (`data-polyfill="/js/webmcp-polyfill.js"`), or set `data-polyfill="off"`.
- agentprose Cloud: allow `https://agentprose.cloud` in `script-src` and `connect-src`.

## 5. Verify

1. `npx agentprose inspect https://<site>/<an-article>/` should show "Article detected", a feed or sitemap, and "agentprose installed".
2. Open an article with `?agentprose-inspect` in the URL. The 🔌 panel lists the tools; run `get_current_article` and `search_posts`.
3. Check the browser console for errors.

Tell the user what you added, where, and how to switch it off (remove the tag).
