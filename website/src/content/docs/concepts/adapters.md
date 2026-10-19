---
title: "Adapters"
description: "Adapters tell agentprose where posts come from when the page, feeds and sitemap aren't enough, and how to keep credentials out of the page."
---

An **adapter** tells agentprose where posts come from. Without one, agentprose uses the zero-config source ([auto-discovery](../discovery/)) and detects WordPress on its own. With one, search, lists and full posts come straight from your CMS's API.

| CMS | Script tag | Safe in the page |
|---|---|---|
| WordPress | automatic, or `data-adapter="wordpress"` | nothing needed |
| Ghost | `data-adapter="ghost" data-key="<content key>"` | Content API key |
| Sanity | `data-adapter="sanity" data-project="<id>"` | no token (public dataset) |
| Contentful | `data-adapter="contentful" data-space="<id>" data-token="<CDA token>"` | Delivery API token |
| Enonic XP | `data-adapter="enonic" data-endpoint="<guillotine url>"` | public endpoint |
| Strapi 5/4 | `data-adapter="strapi" data-api="https://cms"` | Public role, no token |
| Storyblok | `data-adapter="storyblok" data-token="<public token>"` | public access token |
| Any JSON | `data-adapter="generic" data-src="/posts.json"` | n/a |

Each adapter is a separate 2–3 KB file that the script tag loads only when `data-adapter` asks for it. With npm, import it from `agentprose/adapters/<name>`. Every attribute per adapter is in the [adapter reference](../../reference/adapters/).

## The one rule: the page is public

WebMCP tools run in the visitor's browser, so **any credential in the page is public**. Use only credentials the vendor designed to be public (the ones in the table above), or use proxy mode.

agentprose enforces this: credentials shaped like management or admin tokens (Contentful `CFPAT-…`, Sanity `sk…`, Ghost Admin `id:secret`) make the adapter throw instead of running.

## Proxy mode

When content needs a secret (a private Sanity dataset, a Strapi API token, a preview token on staging), put a small proxy between the page and the CMS:

```html
<script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" defer
        data-adapter="contentful" data-space="xxxx" data-proxy="/api/cms"></script>
```

Each request keeps the vendor's path and query but goes to your proxy, which allow-lists read-only paths, adds the credential and forwards the request. See [Private content: proxy mode](../../guides/proxy/).

## Your own adapter

Only `list` and `get` are required:

```ts
import { defineAdapter } from 'agentprose/adapters/generic';

export const myCms = defineAdapter({
  name: 'my-cms',
  async list({ limit = 20, offset = 0 } = {}) {
    const r = await fetch(`/api/posts?limit=${limit}&offset=${offset}`).then((r) => r.json());
    return { items: r.posts.map((p) => ({ url: p.url, title: p.title, summary: p.excerpt, published: p.date })), total: r.total };
  },
  async get({ slug, url }) {
    const p = await fetch(`/api/posts/${slug ?? new URL(url).pathname.split('/').pop()}`).then((r) => (r.ok ? r.json() : null));
    return p && { url: p.url, title: p.title, markdown: p.markdown };
  },
});
```

When `search` is missing, agentprose ranks `list()` results itself; when `taxonomies` is missing, it counts them from posts. Return `markdown` or `html` from `get` (HTML is converted). More in [Writing an adapter](../../reference/adapters/#writing-an-adapter).
