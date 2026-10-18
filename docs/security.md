# Security model

**What agentprose is:** a script that registers read-only tools in the visitor's browser. It reads what the page and the site already serve publicly.

| Risk | Mitigation |
|---|---|
| Prompt injection through post content (comments, quotes, guest posts) | Every content tool carries `untrustedContentHint: true`, so agents treat output as data. Output stays plain Markdown: no hidden elements, `aria-hidden`, `[hidden]`, scripts or styles. |
| Leaking CMS secrets | Only public delivery credentials are supported in the page. Management/admin token shapes (Contentful `CFPAT-`, Sanity `sk…`, Ghost Admin `id:secret`) make the adapter throw. Proxy mode keeps private tokens on a server. |
| Acting as an open proxy / SSRF | The auto source fetches only same-origin URLs (pages, feeds, sitemaps, llms.txt, index). `get_post` refuses URLs on other origins. |
| Agents changing state | Built-in tools are `readOnlyHint: true`. `navigate_to` is opt-in, same-origin only, and not marked read-only. |
| Oversized responses / token blow-ups | `maxChars` (default 20,000) per answer with paging. `maxPosts` (default 2,000) and `maxSitemaps` (default 5) bound the index. |
| Breaking the host page | Registration never throws. Failures are reported in `ready.failed`. The core uses no `eval` and no inline script, and loads its lazy files only from its own directory. |
| Tracking visitors | Nothing is sent anywhere unless you configure `data-analytics`, and that carries tool name, timing, page URL and search query, never content or personal data. |
| Supply chain | No runtime dependencies in the browser bundle. The one optional second script, the MCP-B polyfill, is pinned to an exact version and carries a Subresource Integrity hash ([below](#the-mcp-b-polyfill)). To freeze agentprose itself, pin an exact version with `integrity=` ([versioning.md](versioning.md)). |

## The MCP-B polyfill

agentprose's own code never needs a second script. One optional file can load next to it: MCP-B's WebMCP polyfill. This section says exactly when, from where and why, and how to change it.

**Why.** Agents reach a page's tools through WebMCP (`document.modelContext`). Most browsers don't ship WebMCP yet. In those browsers the polyfill supplies the standard `document.modelContext`, so MCP-B's extension, its local relay (Claude Desktop, Cursor) and other WebMCP clients can see agentprose's tools. Without it, the tools still exist (`window.AgentProse.instance.call()`), but no agent can discover them.

**When it loads.** Only from the script-tag build (`agentprose.min.js`), and only if all of these hold:

1. The page has finished loading (`load` event), so it never competes with your page.
2. The page still has no WebMCP: no native `document.modelContext`, no `@mcp-b/global`, no extension, no legacy `navigator.modelContext`.
3. You haven't turned it off (`data-polyfill="off"`).

In Chrome with native WebMCP it never loads. The npm API (`createAgentTools()`) leaves it off unless you pass `polyfill`.

**What and from where.**

| How agentprose is loaded | Polyfill URL | Integrity check |
|---|---|---|
| jsDelivr, unpkg or your own server (default) | `https://cdn.jsdelivr.net/npm/@mcp-b/webmcp-polyfill@6.0.3/dist/index.iife.js` | `integrity="sha384-aEnX8+GGpZs7j3YINfHJw5npl4H6AkfYHQ5KqdgJzScZ5s76I533BzlPrceDInPx"` `crossorigin="anonymous"` |
| agentprose Cloud (`https://agentprose.cloud/v/…/agentprose.min.js`, agentprose 0.1.2 and later) | `https://agentprose.cloud/v/<exact version>/webmcp-polyfill.js`, the same file served by the Cloud, so everything comes from one domain | the same hash |
| `data-polyfill="/js/webmcp-polyfill.js"` (your URL) | your URL, as given | none (your file may be a different build) |
| `data-polyfill="off"` | nothing loads | |

The file is `@mcp-b/webmcp-polyfill` **6.0.3** (MIT, about 27 KB, 9 KB gzipped), pinned to that exact version. A new polyfill version only reaches your site with a new agentprose release. The **Subresource Integrity** hash means the browser runs the file only if it is byte-for-byte the one agentprose was tested with. If a CDN ever served anything else, the browser would refuse it and agentprose would carry on with mode `none`: no error, no tools for agents, nothing else changed on the page. The test suite checks the hash against the npm package and against jsDelivr on every CI run, and an end-to-end test shows a tampered file being refused.

**Opt out.**

```html
<script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" data-polyfill="off" defer></script>
```

**Self-host it.** Copy the exact file and point agentprose at it:

```bash
npm pack @mcp-b/webmcp-polyfill@6.0.3 && tar xzf mcp-b-webmcp-polyfill-6.0.3.tgz
cp package/dist/index.iife.js public/js/webmcp-polyfill.js
```

```html
<script src="/js/agentprose.min.js" data-polyfill="/js/webmcp-polyfill.js" defer></script>
```

With the npm API you can keep the integrity check on your own copy: `createAgentTools({ polyfill: { src: '/js/webmcp-polyfill.js', integrity: 'sha384-aEnX8+GGpZs7j3YINfHJw5npl4H6AkfYHQ5KqdgJzScZ5s76I533BzlPrceDInPx' } })`.

**Content Security Policy.** agentprose itself needs no `unsafe-eval` and no `unsafe-inline`. If your site sends a CSP with a `script-src` allowlist, pick one:

| Setup | `script-src` needs | `connect-src` needs |
|---|---|---|
| jsDelivr | `https://cdn.jsdelivr.net` (covers agentprose and the polyfill) | your own origin (`'self'`) |
| Self-hosted agentprose + self-hosted polyfill | `'self'` | `'self'` |
| agentprose Cloud snippet | `https://agentprose.cloud` | `'self' https://agentprose.cloud` (hosted search and analytics) |
| Polyfill off | wherever agentprose is served from | as above |

A CSP that blocks the polyfill causes one console message from the browser and nothing else: agentprose settles in mode `none`.

Report vulnerabilities as described in [SECURITY.md](../SECURITY.md).
