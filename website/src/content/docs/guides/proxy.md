---
title: "Private content: proxy mode"
description: "Keep CMS secrets on a server with agentprose's proxy mode, using the Cloudflare Worker or dependency-free Node proxy from the repository."
---

Use a proxy when the content needs a credential that must not reach the browser: a private Sanity dataset, a Strapi API token, a Contentful preview token on a staging site.

```html
<script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" defer
        data-adapter="sanity" data-project="abc123" data-proxy="https://cms-proxy.example.workers.dev"></script>
```

With npm:

```ts
contentful({ space: 'xxxx', proxy: 'https://example.com/api/cms' }); // no token in the page
```

agentprose keeps the vendor's path and query and swaps the origin for your proxy. The proxy:

1. **allow-lists read-only paths**, so it can't be used for anything else;
2. **adds the credential** from its environment;
3. **forwards** the request to the vendor and returns the JSON, with a short cache.

## Ready-made proxies

The repository has two, in [examples/proxy](https://github.com/webmaxru/agentprose/tree/main/examples/proxy):

- [`cf-proxy.js`](https://github.com/webmaxru/agentprose/blob/main/examples/proxy/cf-proxy.js): a Cloudflare Worker. Set `UPSTREAM`, `TOKEN` and `ALLOW_ORIGIN` as secrets or variables.
- [`node-proxy.mjs`](https://github.com/webmaxru/agentprose/blob/main/examples/proxy/node-proxy.mjs): Node 18+, no dependencies.

## Checklist

- Allow only `GET` and only the read endpoints your adapter uses.
- Restrict CORS to your site's origin (`ALLOW_ORIGIN`).
- Keep the token in the proxy's environment, never in the page, the repository or the build output.
- Remember that whatever the proxy returns is now public to anyone who can call it, exactly like your published pages.
