# Browser support

agentprose follows the WebMCP Draft Community Group Report (https://webmachinelearning.github.io/webmcp/, 16 October 2026). The API lives on `document.modelContext`: `registerTool(tool, { signal, exposedTo })`, `getTools()` and `executeTool()`. A tool is removed by aborting the `AbortSignal` it was registered with. The draft has no `provideContext` and no `unregisterTool`.

| Where | What agentprose does | Verified |
|---|---|---|
| Chrome / Chromium with the `WebMCPTesting` feature (`chrome://flags/#enable-webmcp-testing`, or `--enable-features=WebMCPTesting`) | Registers natively, with annotations and an `AbortSignal` | ✅ e2e, Chromium 156.0.8078.4 |
| Sites in the Chrome or Edge WebMCP origin trial | Same as above, for real visitors. The site owner registers their origin and serves the token. | not tested (needs a token) |
| Any other browser (the script-tag default) | After the `load` event, if the page still has no WebMCP, agentprose loads MCP-B `@mcp-b/webmcp-polyfill@6.0.3` from jsDelivr and registers into its `document.modelContext`. Skipped when native WebMCP, `@mcp-b/global` or a legacy `navigator.modelContext` is present. `data-polyfill="off"` disables it | ✅ e2e: polyfill loaded after `load`, 11 tools via `getTools`/`executeTool`; no load when WebMCP exists; blocked polyfill degrades to `none` |
| MCP-B `@mcp-b/global` on the page | agentprose registers into it and loads nothing else | ✅ relay check (examples/mcp-b-desktop) |
| Older polyfills or extensions exposing `navigator.modelContext` | `legacy` mode: `registerTool()` there, unregistering via returned handles | unit-tested with a fake |
| Browsers without WebMCP and the polyfill off or blocked (strict CSP, offline) | Registers nothing, throws nothing. `window.AgentProse.instance.call()` still works | ✅ e2e |

Notes:

- **Secure contexts only.** WebMCP exists on HTTPS pages and on `localhost`.
- **Frames.** The `tools` Permissions Policy feature controls whether a document can use WebMCP. An iframe that should register tools needs `allow="tools"`. To let a parent page see tools registered in a frame, pass `exposedTo` (`data-exposed-to`).
- **Third-party script.** agentprose served from a CDN registers tools for the page's own origin. Tools and fetches stay on the page's origin. The one cross-origin request agentprose can make is the MCP-B polyfill from jsDelivr (≈9 KB gzipped, after the load event, only where WebMCP is missing); a strict `script-src` either allows `https://cdn.jsdelivr.net`, self-hosts it (`data-polyfill="/js/webmcp-polyfill.js"`) or turns it off.
- **Desktop agents.** MCP-B's local relay (`@mcp-b/webmcp-local-relay`) carries the tools to Claude Desktop, Cursor and Claude Code. See [tutorials/mcp-b-claude-desktop.md](tutorials/mcp-b-claude-desktop.md).
- **Duplicate names.** If another script already registered a tool with the same name, that one registration fails (`InvalidStateError`) and the rest continue. Use `data-prefix` to avoid collisions.
- **Single-page apps.** Tools read `location` and the DOM when they run, so `get_current_article` follows client-side navigation without re-registering.
