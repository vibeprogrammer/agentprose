# Your blog inside Claude Desktop or Cursor in 5 minutes: agentprose + MCP-B

agentprose turns your blog into read-only WebMCP tools: search, full posts as Markdown, sections, related posts and checked citations. [MCP-B](https://docs.mcp-b.ai/)'s local relay carries those tools from a browser tab to a desktop MCP client. Put the two together and Claude Desktop, Cursor or Claude Code can search and quote your blog from the tab you have open, with no server code and no API keys.

```text
your blog tab                                   your computer
┌──────────────────────────────┐   WebSocket   ┌────────────────────────┐  stdio  ┌──────────────────┐
│ agentprose  → content tools  │──localhost──▶ │ @mcp-b/webmcp-local-   │ ──────▶ │ Claude Desktop / │
│ MCP-B polyfill or global     │               │ relay (MCP server)     │         │ Cursor / Claude  │
│ relay embed.js               │               └────────────────────────┘         │ Code             │
└──────────────────────────────┘                                                 └──────────────────┘
```

**What you need:** Node.js 22 or later (the relay runs with `npx`), Chrome or Edge, and an MCP client.

## 1. Put the tools on the page

agentprose needs one script tag. MCP-B's embed connects the tab to the relay:

```html
<script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/@mcp-b/webmcp-local-relay@6/dist/browser/embed.js" defer></script>
```

agentprose loads MCP-B's WebMCP polyfill on its own in browsers that don't have WebMCP yet (after the page has loaded, about 9 KB). If your site already uses [`@mcp-b/global`](https://docs.mcp-b.ai/packages/global/overview), agentprose registers into it and loads nothing extra.

> **Version note.** The built-in polyfill ships in agentprose **0.1.1** and later (`agentprose@0` serves it); from 0.1.2 it carries an integrity hash ([details](../security.md#the-mcp-b-polyfill)). On agentprose **0.1.0**, add MCP-B's runtime in `<head>` first: `<script src="https://cdn.jsdelivr.net/npm/@mcp-b/global@6/dist/index.iife.js"></script>`. That combination was tested end to end too (see below).

**Should every visitor load the embed?** Usually not. The embed looks for a relay on `localhost` ports 9333–9348 from every visitor's browser. On a public site, Chrome asks each visitor for permission to reach their local network, and visitors without a relay see failed connections in the console. Three ways to keep it to yourself:

- **A bookmarklet (no site change).** Make a bookmark with this URL and click it on any page that runs agentprose:

  ```text
  javascript:void(document.head.appendChild(Object.assign(document.createElement('script'),{src:'https://cdn.jsdelivr.net/npm/@mcp-b/webmcp-local-relay@6/dist/browser/embed.js'})))
  ```

  The embed picks up tools that are already registered. It works on any agentprose site once the built-in polyfill is released (or today, on sites that load `@mcp-b/global`). Sites with a strict Content Security Policy block bookmarklet scripts.
- **A switch on your own site**, e.g. load the embed only when the URL has `?relay` or you are signed in.
- **A local copy.** Serve your site on `localhost` while you write. That is also where the relay needs no permission prompt.

## 2. Add the relay to your MCP client

The client starts the relay itself. `--widget-origin` limits it to your site; without it, any page you open can offer tools to the agent.

**Claude Desktop:** Settings → Developer → Edit Config, which opens `claude_desktop_config.json` (macOS `~/Library/Application Support/Claude/`, Windows `%APPDATA%\Claude\`):

```json
{
  "mcpServers": {
    "webmcp-local-relay": {
      "command": "npx",
      "args": ["-y", "@mcp-b/webmcp-local-relay@latest", "--widget-origin", "https://yourblog.example"]
    }
  }
}
```

Restart Claude Desktop.

**Cursor:** add the same `mcpServers` block to `~/.cursor/mcp.json` (all projects) or `.cursor/mcp.json` (one project).

**Claude Code:**

```bash
claude mcp add webmcp-local-relay -- npx -y @mcp-b/webmcp-local-relay@latest --widget-origin https://yourblog.example
```

For a local copy of your site, use its origin instead, e.g. `--widget-origin http://localhost:4000`.

## 3. Open your blog and ask

1. Open a post on your blog in Chrome or Edge (or click the bookmarklet on it).
2. If Chrome asks whether the site may access devices on your local network, choose **Allow**. That is the tab connecting to the relay on your own computer.
3. Ask the agent:
   - “List the connected WebMCP sources.” It calls the relay's `webmcp_list_sources` and shows your tab.
   - “What does my blog say about pricing? Quote it with links.” It calls `search_posts`, then `get_post` and `get_citation`.
   - “Summarise the post I have open, section by section.” It calls `get_current_article` and `get_section`.

The relay lists agentprose's tools under their own names (`search_posts`, `get_post`, `get_current_article`, `get_section`, `get_table_of_contents`, `list_posts`, `list_taxonomies`, `get_related_posts`, `get_citation`, `get_site_info`, plus `get_subscribe_link` when the site has a feed link). With two tabs offering the same tool names, the relay adds a short suffix (`search_posts_ed93`). Every tool is read-only.

## What was tested, and what wasn't

Tested on 2026-10-18 with [examples/mcp-b-desktop/verify.mjs](../../examples/mcp-b-desktop/verify.mjs): the official MCP TypeScript SDK client launched `@mcp-b/webmcp-local-relay@6.0.3` over stdio, which is what Claude Desktop and Cursor do with the config above. Headless Chromium 156 without native WebMCP opened the agentprose demo blog. Then the client listed the tools and called `webmcp_list_sources`, `get_current_article`, `search_posts`, `get_post` and `get_citation` through the relay.

| Page | Origin | Result |
|---|---|---|
| agentprose (built-in polyfill) + embed | `http://localhost` | ✅ 11 tools in the relay ~0.5 s after load; all calls answered |
| `@mcp-b/global` 6.0.3 + agentprose + embed | `http://localhost` | ✅ same |
| agentprose only, embed added after load (the bookmarklet) | `http://localhost` | ✅ same |
| agentprose **0.1.0 from jsDelivr** + `@mcp-b/global` + embed ([examples/mcp-b-desktop/index.html](../../examples/mcp-b-desktop/index.html)) | `http://localhost` | ✅ 10 tools; all calls answered |
| any of the above | a public `https://` origin | ⚠️ Chrome blocked the connection to `localhost` (Local Network Access) until it is allowed; with that check switched off, standing in for clicking **Allow**, ✅ all calls answered |

Not tested: Claude Desktop, Cursor and Claude Code themselves (the test machine has none; the SDK client speaks the same stdio protocol), the permission prompt in a headed Chrome, Firefox and Safari, and Windows paths.

## Troubleshooting

- **The agent sees only the four `webmcp_*` tools.** The tab isn't connected. Reload it after the client has started (the embed retries after 10, 20 and 30 s, then every two minutes). Check that `--widget-origin` matches the page's origin exactly, and that you allowed local network access.
- **`webmcp_list_sources` shows the tab with 0 tools.** The page has no WebMCP runtime. On agentprose 0.1.0, add `@mcp-b/global` or `data-polyfill`. On 0.1.1 and later, check that `data-polyfill="off"` isn't set and that your CSP allows `https://cdn.jsdelivr.net` (or self-host the polyfill: `data-polyfill="/js/webmcp-polyfill.js"`).
- **`file://` pages don't work.** Serve the page over `http://localhost`, because WebMCP needs a real origin.
- **Tool names clash with another tab.** Close the other tab, or give agentprose a prefix: `data-prefix="blog_"`.
