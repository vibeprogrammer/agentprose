# agentprose + MCP-B: your blog inside Claude Desktop, Cursor or Claude Code

`index.html` is a one-page blog with three script tags: MCP-B's runtime (optional), agentprose, and MCP-B's local relay embed. `verify.mjs` is the end-to-end check behind the [tutorial](../../docs/tutorials/mcp-b-claude-desktop.md): it does what a desktop MCP client does, with no desktop app.

## Try the page

```bash
npx --yes serve . --listen 3000      # then open http://localhost:3000
```

Add the relay to your MCP client (Claude Desktop, Cursor):

```json
{
  "mcpServers": {
    "webmcp-local-relay": { "command": "npx", "args": ["-y", "@mcp-b/webmcp-local-relay@latest", "--widget-origin", "http://localhost:3000"] }
  }
}
```

Restart the client, open the page, and ask: “List the connected WebMCP sources”, then “Summarise the post in my browser and quote one sentence.”

## Run the check

```bash
# repo root
npm ci && npm run build && node scripts/demo.mjs http://localhost:3000/
cd examples/mcp-b-desktop && npm install
CHROME=/path/to/chrome node verify.mjs global      # page loads @mcp-b/global
CHROME=/path/to/chrome node verify.mjs polyfill    # page loads only agentprose (+ its MCP-B polyfill)
CHROME=/path/to/chrome node verify.mjs bookmarklet # page loads only agentprose; the embed is added after load
```

What it does: the official MCP TypeScript SDK client launches `@mcp-b/webmcp-local-relay` over stdio (exactly what `claude_desktop_config.json` does), headless Chromium without native WebMCP opens a demo post served with the local agentprose build and the MCP-B scripts from jsDelivr, and the client waits for the page's tools to appear, then calls `webmcp_list_sources`, `get_current_article`, `search_posts`, `get_post` and `get_citation` through the relay.

Results on 2026-10-18 (Chromium 156, Node 22, relay 6.0.3, global 6.0.3, polyfill 6.0.3):

| Page | Origin | Result |
|---|---|---|
| `@mcp-b/global` + agentprose + embed | `http://localhost:3000` | PASS: 11 agentprose tools listed by the relay ~0.5 s after load, all five calls answered |
| agentprose (auto polyfill) + embed | `http://localhost:3000` | PASS: same 11 tools; the relay reads the polyfill's `document.modelContext` |
| agentprose only; embed added after load (`bookmarklet`) | `http://localhost:3000` | PASS: same 11 tools |
| `index.html` as published here (agentprose **0.1.0 from jsDelivr** + `@mcp-b/global` + embed) | `http://localhost:3000` | PASS: 10 tools, all calls answered |
| global, polyfill or bookmarklet | `https://blog.example` (a public origin, served through request interception) | blocked by Chrome's Local Network Access check (`ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`) until the visitor allows it; granting the permission over CDP did not change that in headless mode; PASS with the check off (`LNA=off`, standing in for “Allow”) |

Not tested here: a real Claude Desktop, Cursor or Claude Code (none on the test machine; the SDK client speaks the same stdio MCP), a headed Chrome's permission prompt, Firefox and Safari.
