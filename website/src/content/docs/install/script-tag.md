---
title: "Script tag (CDN)"
description: "The one-line install from jsDelivr, the channels it follows, how to pin an exact version with SRI, and how to self-host."
---

The script tag is the default install and works on any site: static generators, CMS themes, plain HTML.

```html
<script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" defer></script>
```

That's all. The script is deferred, doesn't touch layout and makes no request of its own on page load. The current-article tools work from the page itself; the site-wide engine (search, lists, related posts) loads from the same folder the first time an agent needs it.

## Configure with `data-*` attributes

Everything is optional. A few common ones:

```html
<script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" defer
        data-content=".post-body"
        data-ignore=".newsletter-box,.toc"
        data-prefix="blog_"
        data-subscribe="https://example.com/newsletter"
        data-contact="https://example.com/contact"></script>
```

The full table is in the [configuration reference](../../reference/configuration/). Options that need code (callbacks, your own tools) go in `window.AgentProseConfig` before the tag; see [Custom tools and analytics](../../guides/custom-tools/).

## Channels and pinning

| URL | What you get |
|---|---|
| `agentprose@0` | Every 0.x release. jsDelivr picks up a release within 12 hours; maintainers purge it right after publishing, so usually minutes. |
| `agentprose@0.1.3` | Exactly that version, forever. Add an `integrity="sha384-…"` hash if you want the browser to verify it. |

```html
<script src="https://cdn.jsdelivr.net/npm/agentprose@0.1.3/dist/agentprose.min.js"
        integrity="sha384-…" crossorigin="anonymous" defer></script>
```

How to compute the hash, and how a moving channel avoids mixing versions on one page: [Versioning and updates](../../reference/versioning/).

## Self-hosting

A copy you serve yourself never changes until you replace it. Copy the whole `dist/` folder of one version from npm (`node_modules/agentprose/dist/`) so the core and the files it loads stay matched: at least `agentprose.min.js`, `agentprose.index.min.js`, `agentprose.inspector.min.js` and the `adapters/` folder, in one directory. The core loads its other files from the directory it was served from.

```html
<script src="/js/agentprose/agentprose.min.js" defer></script>
```

In browsers without WebMCP, agentprose also loads the MCP-B polyfill from jsDelivr. To keep everything on your own domain, self-host that file too (`data-polyfill="/js/webmcp-polyfill.js"`) or switch it off (`data-polyfill="off"`). See [The WebMCP polyfill](../../concepts/polyfill/).

## Content Security Policy

agentprose needs no `unsafe-eval` and no `unsafe-inline`. With jsDelivr, allow `https://cdn.jsdelivr.net` in `script-src` (it covers agentprose and the polyfill) and your own origin in `connect-src`. The [security page](../../project/security/#the-mcp-b-polyfill) has the table for every setup.
