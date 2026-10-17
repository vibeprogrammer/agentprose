# Proxy mode

Use a proxy when the content needs a credential that must not reach the browser: a private Sanity dataset, a Strapi API token, a Contentful preview token on a staging site, and so on.

```html
<script src=".../readmcp.min.js" defer data-adapter="sanity" data-project="abc123" data-proxy="https://cms-proxy.example.workers.dev"></script>
```

readmcp keeps the vendor path and query and swaps the origin for your proxy. The proxy:

1. allow-lists read-only paths;
2. adds the credential from its environment;
3. forwards the request to the vendor and returns the JSON, with a short cache.

- `cf-proxy.js`: a Cloudflare Worker (set `UPSTREAM`, `TOKEN`, `ALLOW_ORIGIN` as secrets/vars).
- `node-proxy.mjs`: Node 18+, no dependencies.
