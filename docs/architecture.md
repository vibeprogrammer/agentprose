# Architecture

```
            page load                                   first site-wide tool call
┌─────────────────────────────────┐         ┌──────────────────────────────────────────────┐
│ agentprose.min.js  (9.9 KB gz)     │ ──────▶ │ agentprose.index.min.js  (6.6 KB gz, lazy)      │
│ • reads data-* config           │  loads  │ • autoSource: agentprose.json → feeds → sitemap │
│ • builds tool definitions       │         │   → llms.txt (+ Pagefind for search)         │
│ • registers on document.        │         │ • BM25F SearchIndex, related posts           │
│   modelContext (AbortSignal)    │         │ • site-wide tool executors                   │
│ • page extraction + Markdown    │         └──────────────────────────────────────────────┘
│   (current-article tools need   │         ┌──────────────────────────────────────────────┐
│    no network at all)           │ ──────▶ │ adapters/<cms>.min.js (2–3 KB gz, on demand) │
└─────────────────────────────────┘ data-   │ WordPress auto-detected; others by attribute │
                                    adapter └──────────────────────────────────────────────┘
```

**Source layout**

| Path | Role |
|---|---|
| `src/auto.ts` | Script-tag entry: config from `data-*`, adapter loading, inspector, the `window.AgentProse` global |
| `src/index.ts` | `createAgentTools()`, the public API |
| `src/core/tools.ts` | Tool definitions (names, descriptions, JSON Schemas) and page-level executors |
| `src/core/site-tools.ts` | Site-wide executors (search, list, taxonomies, related, citation, site info) |
| `src/core/register.ts` | WebMCP registration, analytics instrumentation, polyfill loading |
| `src/core/extract.ts` | JSON-LD/OpenGraph/meta reading, article-body detection, TOC and sections |
| `src/core/markdown.ts` | HTML → GitHub-flavoured Markdown (tables, nested lists, fenced code) |
| `src/core/feeds.ts` | RSS 2.0/1.0, Atom, JSON Feed, sitemap and llms.txt parsers |
| `src/core/source.ts` | The zero-config content source, merging, filtering, caching |
| `src/core/search.ts` | BM25F index with prefix matching and accent folding |
| `src/core/lib.ts` / `lib-lazy.ts` | Static engine (npm) vs. lazily loaded engine (script tag) |
| `src/adapters/*` | CMS adapters and rich-text renderers |
| `src/cli/index.ts` | `agentprose build` and `agentprose inspect` (Node, linkedom) |
| `src/inspector.ts` | The 🔌 panel |

**Design rules**

1. **The page is the API.** Use what sites already publish (JSON-LD, OpenGraph, feeds, sitemaps, llms.txt) before asking for configuration.
2. **Pay on use.** Registration is free. Network and engine code load on the first site-wide call.
3. **Agents get Markdown, paged.** Never truncate silently. Return `next_offset`.
4. **Errors are results.** `{ error, message }` lets agents recover; exceptions don't.
5. **Read-only by default.** Anything else is opt-in and named for what it does.
6. **Secrets never reach the page.** Credentials shaped like management keys are refused, and proxy mode exists for private content.
7. **One code path.** The inspector, `instance.call()`, the CLI and the agent all run the same tool code.

**Premium seams (open, documented, not crippling):** `onToolCall` / `agentprose:call` / `data-analytics` (analytics), `searchEndpoint` (hosted search), `index` (hosted index), `proxy` (managed CMS proxy). See [BUSINESS.md](BUSINESS.md).
