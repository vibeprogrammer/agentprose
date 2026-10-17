# Configuration

## Script attributes

Everything is optional.

| Attribute | Example | Meaning |
|---|---|---|
| `data-content` | `.post-body` | CSS selector of the article body when detection picks the wrong element |
| `data-ignore` | `.newsletter-box,.toc` | Extra selectors to strip from article content |
| `data-index` | `/agentprose.json` | Prebuilt index URL. Default: `/agentprose.json` if it exists. `data-index=""` disables the probe. |
| `data-feed` | `/index.xml` | Feed URL(s), comma-separated. Default: `<link rel=alternate>`, then common paths |
| `data-sitemap` | `/sitemap_index.xml` or `false` | Sitemap URL, or `false` to skip |
| `data-llms` | `/llms.txt` or `false` | llms.txt URL, or `false` to skip |
| `data-pagefind` | `/pagefind/pagefind.js` or `false` | Pagefind bundle. Auto-detected when the page uses Pagefind |
| `data-base` | `https://example.com/blog/` | Site root, when the blog lives under a sub-path |
| `data-adapter` | `wordpress`, `ghost`, `sanity`, `contentful`, `enonic`, `strapi`, `storyblok`, `generic` | Read from a CMS; see [adapters.md](adapters.md) for each adapter's attributes |
| `data-proxy` | `https://example.com/cms-proxy` | Adapter proxy mode (the server adds the credential) |
| `data-prefix` | `blog_` | Prefix for every tool name |
| `data-exclude` | `get_related_posts,get_citation` | Tools to leave out |
| `data-subscribe` | `https://example.com/newsletter` | Adds `get_subscribe_link` |
| `data-comments` | `https://example.com/comments?u={url}` | Adds `get_comments_link` (`{url}` becomes the page URL) |
| `data-about`, `data-contact` | URLs | Listed in `get_site_info` |
| `data-navigate` | (flag) | Adds `navigate_to` (same-origin only, not read-only) |
| `data-max-chars` | `12000` | Markdown characters per answer (default 20000) |
| `data-max-posts` | `5000` | Posts held in the client index (default 2000) |
| `data-cache` | `0` | Seconds to cache the index in sessionStorage (default 600) |
| `data-search-endpoint` | `https://search.example.com/q` | Remote search: `GET ?q=&limit=` → `{ items: [...] }` |
| `data-analytics` | `https://stats.example.com/agent` | Beacon per tool call (v2): `{v, key, tool, ok, ms, page, query?, n?, found?, post?, err?, sid}`. `query` only for search tools (≤200 chars), `n` = result count, `found` = citation verdict, `post` = URL argument, `sid` = random id per page load. Never post content |
| `data-cloud` | `https://cloud.agentprose.dev` | With `data-key`: hosted analytics (`/v1/collect`) and hosted search (`/v1/search`) in one attribute. `data-cloud-search="false"` keeps search local. Optional when the script itself is served by your agentprose Cloud (e.g. `https://cloud.agentprose.dev/v/0.1.0/agentprose.min.js`): with `data-key` and no `data-cloud`, the script's origin is used. Required when loading from jsDelivr or unpkg (agentprose warns in the console if it is missing). `data-cloud="false"` turns the Cloud off. The page's own origin is never treated as a Cloud |
| `data-key` | `site_123` | Site key sent with analytics beacons (or the adapter's key when `data-adapter` is set) |
| `data-exposed-to` | `https://partner.example` | Origins of other frames allowed to see the tools (WebMCP `exposedTo`) |
| `data-polyfill` | (flag) or a URL | Load the MCP-B WebMCP polyfill when the browser has no `document.modelContext` |
| `data-untrusted` | `false` | Turn off `untrustedContentHint` (only for fully trusted content) |
| `data-inspector` | (flag) or `open` | Load the 🔌 inspector. Every page also accepts `?agentprose-inspect` |
| `data-debug` | (flag) | Log registration results to the console |

For options that need code (callbacks, custom tools), set `window.AgentProseConfig` before the script:

```html
<script>
  window.AgentProseConfig = {
    onToolCall: (e) => console.log('agent used', e.tool),
    tools: [{ name: 'get_store_hours', description: 'Opening hours of our shop.', annotations: { readOnlyHint: true }, execute: () => ({ mon_fri: '9-17' }) }],
  };
</script>
<script src="https://cdn.jsdelivr.net/npm/agentprose@0.1/dist/agentprose.min.js" defer></script>
```

`window.AgentProse` exposes `version`, `instance` (`tools`, `call()`, `ready`, `destroy()`), `ready`, `create()` and `adapters`. The `agentprose:ready` event fires on `document` once tools are registered.

## `createAgentTools(config)`

```ts
import { createAgentTools, type Config } from 'agentprose';
```

| Option | Type | Default |
|---|---|---|
| `adapter` | `ContentAdapter` | Zero-config auto source (page + index + feeds + sitemap + llms.txt + Pagefind) |
| `baseUrl` | `string` | `location.origin + '/'` |
| `contentSelector`, `ignoreSelectors` | `string`, `string[]` | Auto |
| `index`, `feeds`, `sitemap`, `llmsTxt`, `pagefind` | discovery overrides | Auto |
| `prefix`, `exclude`, `tools` | naming and extra tools | none |
| `links` | `{ subscribe?, comments?, about?, contact?, [k]: string }` | none |
| `maxChars`, `maxPosts`, `maxSitemaps`, `cacheTtl` | `number` | 20000, 2000, 5, 600 |
| `searchEndpoint` | `string` | none |
| `onToolCall` | `(e: ToolCallEvent) => void` | none |
| `analytics`, `analyticsKey` | `string` | none |
| `exposedTo` | `string[]` | none |
| `navigate` | `boolean` | false |
| `untrustedContent` | `boolean` | true |
| `legacy` | `boolean`: allow a polyfill's `navigator.modelContext` | true |
| `polyfill` | `boolean \| string` | false |
| `register` | `boolean`: set false to build tools without registering (tests, SSR) | true |
| `debug` | `boolean` | false |

The return value is `{ tools, call(name, input), source, ready, destroy() }`.

`agentprose/full` also exports the engine pieces for custom builds and Node: `autoSource`, `SearchIndex`, `parseFeed`, `parseSitemap`, `parseLlmsTxt`, `extractPage`, `toMarkdown` and `toc`.
