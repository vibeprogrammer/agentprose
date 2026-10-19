---
title: "What is WebMCP?"
description: "WebMCP lets a web page hand tools to the AI agent running in the visitor's browser. What it is, where it runs today, and how agentprose uses it."
---

**WebMCP** is a proposed web standard, developed in the W3C Web Machine Learning Community Group, that lets a web page hand *tools* to the AI agent running in the visitor's browser. Instead of reading pixels or raw HTML, the agent sees a list of named functions with descriptions and JSON Schemas, and calls them.

It borrows the idea of tools from the [Model Context Protocol](https://modelcontextprotocol.io/) (MCP), but runs in the page, with the page's own origin and the user's own session, instead of on a server.

## The API in one paragraph

agentprose follows the [WebMCP Draft Community Group Report](https://webmachinelearning.github.io/webmcp/) of 16 October 2026. The API lives on `document.modelContext`: a page calls `registerTool(tool, { signal, exposedTo })` for each tool; agents (and the page itself) can list them with `getTools()` and call one with `executeTool()`. A tool is removed by aborting the `AbortSignal` it was registered with. The draft has no `provideContext` and no `unregisterTool`.

A tool, in WebMCP terms, looks like this:

```js
document.modelContext.registerTool(
  {
    name: 'search_posts',
    description: 'Full-text search across every post on this site…',
    inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    execute: async ({ query }) => ({ /* results */ }),
  },
  { signal: controller.signal },
);
```

agentprose writes all of that for you: 14 tools, their descriptions and schemas, the annotations, and the code behind them.

## Where it runs today

WebMCP is new. As of October 2026:

- **Chrome / Chromium** implements it behind the `WebMCPTesting` feature (`chrome://flags/#enable-webmcp-testing`), and sites can join the Chrome or Edge **origin trial** to switch it on for real visitors.
- **Everywhere else**, the open-source [MCP-B](https://docs.mcp-b.ai/) project supplies `document.modelContext` with a polyfill, and its browser extension and local relay let agents such as Claude Desktop, Cursor and Claude Code reach the tools.

agentprose works with both: it registers natively when the browser has WebMCP, and otherwise loads the pinned, integrity-checked MCP-B polyfill after your page has loaded. The exact matrix, with dates and the browser builds we tested, is on [Browser and agent support](../support/).

:::note
WebMCP is a Community Group draft, not a W3C Recommendation. Names and details may still change; agentprose tracks the current draft and keeps a legacy path for older polyfills that expose `navigator.modelContext`.
:::

## Requirements worth knowing

- **Secure contexts only.** WebMCP exists on HTTPS pages and on `localhost`.
- **Frames.** An iframe that registers tools needs `allow="tools"`; to let a parent page see them, pass `exposedTo` (`data-exposed-to`).
- **One name, one tool.** If another script already registered a tool with the same name, that registration fails and the rest continue. `data-prefix` avoids collisions.

## How agentprose fits

WebMCP is the plumbing. It doesn't say which tools a blog should offer or how to build them. agentprose is that layer for content sites: it reads what your site already publishes, turns it into a well-described set of read-only tools, and registers them. Read [Tools](../concepts/tools/) next.
