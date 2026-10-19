---
title: "The WebMCP polyfill"
description: "When and from where agentprose loads the MCP-B WebMCP polyfill, why it is pinned and integrity-checked, and how to self-host it or turn it off."
---

Most browsers don't ship WebMCP yet. In those, the [MCP-B](https://docs.mcp-b.ai/) polyfill supplies the standard `document.modelContext`, so MCP-B's extension, its local relay (Claude Desktop, Cursor, Claude Code) and other WebMCP clients can find agentprose's tools. Without it the tools still exist (`window.AgentProse.instance.call()` works), but no agent can discover them.

agentprose's own code never needs a second script. This is the one optional file that can load next to it.

## When it loads

Only from the script-tag build, and only if all of these hold:

1. the page has finished loading (the `load` event), so it never competes with your page;
2. the page still has no WebMCP: no native `document.modelContext`, no `@mcp-b/global`, no extension, no legacy `navigator.modelContext`;
3. you haven't turned it off with `data-polyfill="off"`.

In Chrome with native WebMCP it never loads. The npm API leaves it off unless you pass `polyfill`.

## What and from where

| How agentprose is loaded | Polyfill loaded from |
|---|---|
| jsDelivr, unpkg or your own server (default) | `https://cdn.jsdelivr.net/npm/@mcp-b/webmcp-polyfill@6.0.3/dist/index.iife.js`, with an `integrity="sha384-…"` hash |
| agentprose Cloud (0.1.2 and later) | the same file from `https://agentprose.cloud/v/<version>/webmcp-polyfill.js`, same hash, one domain |
| WordPress plugin | the plugin's own bundled copy of the same build |
| `data-polyfill="/js/webmcp-polyfill.js"` | your URL, as given |
| `data-polyfill="off"` | nothing |

The file is `@mcp-b/webmcp-polyfill` **6.0.3** (MIT, about 9 KB gzipped), pinned to that exact version: a new polyfill version only reaches your site with a new agentprose release. The **Subresource Integrity** hash means the browser runs it only if it is byte-for-byte the file agentprose was tested with. If a CDN ever served anything else, the browser would refuse it and agentprose would settle in mode `none`: no error, no tools for agents, nothing else changed on the page.

## Self-host or opt out

```html
<!-- Off -->
<script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" data-polyfill="off" defer></script>

<!-- Your own copy -->
<script src="/js/agentprose.min.js" data-polyfill="/js/webmcp-polyfill.js" defer></script>
```

Copy the exact file from npm:

```bash
npm pack @mcp-b/webmcp-polyfill@6.0.3 && tar xzf mcp-b-webmcp-polyfill-6.0.3.tgz
cp package/dist/index.iife.js public/js/webmcp-polyfill.js
```

With the npm API you can keep an integrity check on your own copy: `createAgentTools({ polyfill: { src: '/js/webmcp-polyfill.js', integrity: 'sha384-…' } })`.

The full story, including the hash and a CSP table, is on the [security page](../../project/security/#the-mcp-b-polyfill).
