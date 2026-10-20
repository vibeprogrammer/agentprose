---
title: "FAQ"
description: "Common questions about agentprose, WebMCP, performance, SEO, security, agentprose Cloud and the WordPress plugin."
---

### Does agentprose change anything for human visitors?

No. The script is deferred, doesn't touch layout, and makes no request of its own on page load. Tools run only when an agent calls them.

### Which agents can use the tools today?

Any agent that reads WebMCP: Chrome with the WebMCP feature (or a site in the origin trial), and, through the MCP-B polyfill, MCP-B's browser extension and its local relay for Claude Desktop, Cursor and Claude Code. The dated matrix is on [Browser and agent support](../../support/).

### Is this the same as `llms.txt`?

No, they complement each other. `llms.txt` is a static file that lists your important pages. agentprose gives agents working tools: search, full posts, sections and checked citations. agentprose reads your `llms.txt` if you have one, and `agentprose build --llms` writes one if you don't.

### Is it the same as an MCP server?

It uses the same idea of tools, but runs in the page instead of on a server. There is nothing to host and no credentials to manage, and agents see exactly what a visitor sees.

### How big is it?

The core is about 10 KB gzipped (the build fails if it passes 10,240 bytes). The site-wide engine (6.6 KB) loads on the first search or list call, and each CMS adapter is 2–3 KB, loaded only if you use it.

### Will it hurt SEO or Core Web Vitals?

It shouldn't: it is deferred, adds no DOM and no layout shift, and loads nothing else until an agent calls a tool. The polyfill, where needed, loads after the `load` event.

### Can agents change my site or post comments?

No. Every built-in tool is read-only. `navigate_to` (opt-in) only opens another page on your own origin. Your own custom tools are yours to design.

### What about prompt injection in my content?

Every content tool carries `untrustedContentHint: true`, so agents treat the output as data, not instructions. Output is plain Markdown without hidden elements, scripts or styles. See [Security](../security/).

### Can I put my CMS token in the tag?

Only tokens the vendor designed to be public (Ghost Content API key, Contentful delivery token, Storyblok public token). Management tokens are refused. For anything private, use [proxy mode](../../guides/proxy/).

### Does it work with a strict Content Security Policy?

Yes. It needs no `unsafe-eval` and no `unsafe-inline`. Allow where the script comes from in `script-src` (jsDelivr, the Cloud, or `'self'`), or self-host everything including the polyfill.

### Do I need agentprose Cloud?

No. The library is complete on its own. The Cloud adds analytics, hosted search and a dashboard for your notes to agents. See [Using agentprose with Cloud](../../guides/cloud/).

### Is the WordPress plugin on wordpress.org?

It is on its way. Until it is listed, [download the zip](../../downloads/agentprose-wordpress.zip) and upload it under **Plugins → Add New Plugin → Upload Plugin**, or use the script tag.

### Who maintains agentprose?

Maxim Salnikov ([@webmaxru](https://github.com/webmaxru), salnikov@gmail.com) created and maintains the agentprose library, the agentprose WordPress plugin and [agentprose Cloud](https://agentprose.cloud). They are one project family; see [Community & open-source projects](https://agentprose.cloud/docs/community-projects).

### How do I update?

With `agentprose@0` (jsDelivr) or `/v/0/` (Cloud) you get every 0.x release automatically. Pinned versions never change. A breaking 1.0 would ship as a new channel you opt into. See [Versioning](../../reference/versioning/).

### Where do I report a bug or a security issue?

Bugs and ideas: [GitHub issues](https://github.com/webmaxru/agentprose/issues). Vulnerabilities: privately, as described in [SECURITY.md](https://github.com/webmaxru/agentprose/blob/main/SECURITY.md).
