# Browser support

readmcp follows the WebMCP Draft Community Group Report (https://webmachinelearning.github.io/webmcp/, 16 October 2026). The API lives on `document.modelContext`: `registerTool(tool, { signal, exposedTo })`, `getTools()` and `executeTool()`. A tool is removed by aborting the `AbortSignal` it was registered with. The draft has no `provideContext` and no `unregisterTool`.

| Where | What readmcp does | Verified |
|---|---|---|
| Chrome / Chromium with the `WebMCPTesting` feature (`chrome://flags/#enable-webmcp-testing`, or `--enable-features=WebMCPTesting`) | Registers natively, with annotations and an `AbortSignal` | ✅ e2e, Chromium 156.0.8078.4 |
| Sites in the Chrome or Edge WebMCP origin trial | Same as above, for real visitors. The site owner registers their origin and serves the token. | not tested (needs a token) |
| Any browser with `data-polyfill` (MCP-B `@mcp-b/webmcp-polyfill@6.0.3` from unpkg) | The polyfill provides `document.modelContext`, and readmcp registers into it | ✅ e2e, `getTools`/`executeTool` through the polyfill |
| Older polyfills or extensions exposing `navigator.modelContext` | `legacy` mode: `registerTool()` there, unregistering via returned handles | unit-tested with a fake |
| Browsers without WebMCP | Registers nothing, throws nothing. `window.ReadMCP.instance.call()` still works | ✅ e2e |

Notes:

- **Secure contexts only.** WebMCP exists on HTTPS pages and on `localhost`.
- **Frames.** The `tools` Permissions Policy feature controls whether a document can use WebMCP. An iframe that should register tools needs `allow="tools"`. To let a parent page see tools registered in a frame, pass `exposedTo` (`data-exposed-to`).
- **Third-party script.** readmcp served from a CDN registers tools for the page's own origin. Tools and fetches stay on the page's origin.
- **Duplicate names.** If another script already registered a tool with the same name, that one registration fails (`InvalidStateError`) and the rest continue. Use `data-prefix` to avoid collisions.
- **Single-page apps.** Tools read `location` and the DOM when they run, so `get_current_article` follows client-side navigation without re-registering.
