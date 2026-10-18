# Browser support

agentprose follows the WebMCP Draft Community Group Report (https://webmachinelearning.github.io/webmcp/, 16 October 2026). The API lives on `document.modelContext`: `registerTool(tool, { signal, exposedTo })`, `getTools()` and `executeTool()`. A tool is removed by aborting the `AbortSignal` it was registered with. The draft has no `provideContext` and no `unregisterTool`.

| Where | What agentprose does | Verified |
|---|---|---|
| Chrome / Chromium with the `WebMCPTesting` feature (`chrome://flags/#enable-webmcp-testing`, or `--enable-features=WebMCPTesting`) | Registers natively, with annotations and an `AbortSignal` | ✅ e2e, Chromium 156.0.8078.4 |
| Sites in the Chrome or Edge WebMCP origin trial | Same as above, for real visitors. The site owner registers their origin and serves the token. | not tested (needs a token) |
| Any other browser (the script-tag default) | After the `load` event, if the page still has no WebMCP, agentprose loads MCP-B `@mcp-b/webmcp-polyfill@6.0.3` from jsDelivr with a Subresource Integrity hash (a copy served by agentprose Cloud loads the same file from the Cloud) and registers into its `document.modelContext`. Skipped when native WebMCP, `@mcp-b/global` or a legacy `navigator.modelContext` is present. `data-polyfill="off"` disables it ([details](security.md#the-mcp-b-polyfill)) | ✅ e2e: polyfill loaded after `load` and passed its integrity check, 11 tools via `getTools`/`executeTool`; a tampered file is refused; a Cloud-style copy loads it from its own version folder; no load when WebMCP exists; blocked polyfill degrades to `none` |
| MCP-B `@mcp-b/global` on the page | agentprose registers into it and loads nothing else | ✅ relay check (examples/mcp-b-desktop) |
| Older polyfills or extensions exposing `navigator.modelContext` | `legacy` mode: `registerTool()` there, unregistering via returned handles | unit-tested with a fake |
| Browsers without WebMCP and the polyfill off or blocked (strict CSP, offline) | Registers nothing, throws nothing. `window.AgentProse.instance.call()` still works | ✅ e2e |

### Observed behaviour, dated

What our end-to-end tests saw, so you can tell evidence from the spec text. Newer or older builds may differ.

| Date | Browser | Observed |
|---|---|---|
| 2026-10-18 | Chromium 156.0.8078.4, `--enable-features=WebMCPTesting` | `document.modelContext.registerTool` with an `AbortSignal` and `annotations`; `getTools()` lists the tools; `executeTool(tool, inputObject)` accepts an **object** input and returns the result **serialized as a JSON string**. |
| 2026-10-18 | Chromium 156.0.8078.4, no WebMCP flag | No `document.modelContext`; the pinned MCP-B polyfill supplies it after `load`. |

Older Chrome builds (around 150, per other implementers' notes, not tested by us) wanted the `executeTool` input as a JSON string and returned values instead of strings. The 🔌 inspector handles both: it passes an object, retries once with a JSON string on a `TypeError` (safe because every built-in tool is read-only), and accepts string or value results. agentprose's own tools are callees and are not affected.

Notes:

- **Secure contexts only.** WebMCP exists on HTTPS pages and on `localhost`.
- **Frames.** The `tools` Permissions Policy feature controls whether a document can use WebMCP. An iframe that should register tools needs `allow="tools"`. To let a parent page see tools registered in a frame, pass `exposedTo` (`data-exposed-to`).
- **Third-party script.** agentprose served from a CDN registers tools for the page's own origin. Tools and fetches stay on the page's origin. The one cross-origin request agentprose can make is the MCP-B polyfill from jsDelivr (≈9 KB gzipped, after the load event, only where WebMCP is missing, pinned and integrity-checked); a strict `script-src` either allows `https://cdn.jsdelivr.net`, self-hosts it (`data-polyfill="/js/webmcp-polyfill.js"`) or turns it off. The agentprose Cloud snippet loads it from `agentprose.cloud` instead. See [security.md](security.md#the-mcp-b-polyfill) for a CSP table.
- **Desktop agents.** MCP-B's local relay (`@mcp-b/webmcp-local-relay`) carries the tools to Claude Desktop, Cursor and Claude Code. See [tutorials/mcp-b-claude-desktop.md](tutorials/mcp-b-claude-desktop.md).
- **Duplicate names.** If another script already registered a tool with the same name, that one registration fails (`InvalidStateError`) and the rest continue. Use `data-prefix` to avoid collisions.
- **Single-page apps.** Tools read `location` and the DOM when they run, so `get_current_article` follows client-side navigation without re-registering.
