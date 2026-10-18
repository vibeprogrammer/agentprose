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
| `data-about`, `data-contact` | URLs | Listed in `get_site_info`. `data-contact` (a contact page) also adds `get_contact_info` |
| `data-navigate` | (flag) | Adds `navigate_to` (same-origin only, not read-only) |
| `data-max-chars` | `12000` | Markdown characters per answer (default 20000) |
| `data-max-posts` | `5000` | Posts held in the client index (default 2000) |
| `data-cache` | `0` | Seconds to cache the index in sessionStorage (default 600) |
| `data-search-endpoint` | `https://search.example.com/q` | Remote search: `GET ?q=&limit=` → `{ items: [...] }` |
| `data-analytics` | `https://stats.example.com/agent` | Beacon per tool call (v2): `{v, key, tool, ok, ms, page, query?, n?, found?, post?, err?, sid}`. `query` only for search tools (≤200 chars), `n` = result count, `found` = citation verdict, `post` = URL argument, `sid` = random id per page load. Never post content |
| `data-cloud` | `https://agentprose.cloud` | With `data-key`: hosted analytics (`/v1/collect`) and hosted search (`/v1/search`) in one attribute. `data-cloud-search="false"` keeps search local. Optional when the script itself is served by agentprose Cloud (`https://agentprose.cloud/v/0/agentprose.min.js`): with `data-key` and no `data-cloud`, the script's origin is used. Required when loading from jsDelivr or unpkg (agentprose warns in the console if it is missing). `data-cloud="false"` turns the Cloud off. The page's own origin is never treated as a Cloud |
| `data-key` | `pk_…` | With the Cloud: your site's public key (`pk_…`, from the agentprose Cloud dashboard; safe to publish in page HTML). With `data-adapter`: the CMS adapter's key. Also sent with `data-analytics` beacons |
| `data-exposed-to` | `https://partner.example` | Origins of other frames allowed to see the tools (WebMCP `exposedTo`) |
| `data-polyfill` | `off`, or a URL | On by default: when the page has no WebMCP once it has loaded (no native `document.modelContext`, no `@mcp-b/global`, no legacy `navigator.modelContext`), load the pinned MCP-B polyfill (`@mcp-b/webmcp-polyfill@6.0.3` from jsDelivr, with a Subresource Integrity hash) and register into it. A copy served by agentprose Cloud loads the same file from the Cloud instead. `off`/`false` never loads it. A URL (anything with a `/`) self-hosts it, used as given without an integrity hash. The 0.1.0 flag form (`data-polyfill`, `true`, `auto`) means the default. Details, CSP and self-hosting: [security.md](security.md#the-mcp-b-polyfill) |
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
<script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" defer></script>
```

Owner details for agents (notes and contact) are set the same way, or in `agentprose.json` (see [Notes for AI agents and contact details](#notes-for-ai-agents-and-contact-details) below):

```html
<script>
  window.AgentProseConfig = {
    agentNotes: 'Friendly, plain tone. Recommend the beginner course to newcomers. We do not give medical advice.',
    contact: { email: 'hello@studio.example', booking: 'https://studio.example/book', hours: 'Mon–Fri 9–17 CET' },
  };
</script>
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
| `agentNotes` | `string`: the owner's notes for AI agents, plain text, ≤ 2000 characters | none |
| `contact` | `{ email?, phone?, url?, booking?, hours?, address? }` | none |
| `siteInfo` | `string \| false`: URL of `{ agentNotes?, contact? }` JSON fetched on the first `get_site_info` / `get_contact_info` call | the Cloud's `/v1/site?key=…` with `data-key`; `false` turns it off |
| `maxChars`, `maxPosts`, `maxSitemaps`, `cacheTtl` | `number` | 20000, 2000, 5, 600 |
| `searchEndpoint` | `string` | none |
| `onToolCall` | `(e: ToolCallEvent) => void` | none |
| `analytics`, `analyticsKey` | `string` | none |
| `exposedTo` | `string[]` | none |
| `navigate` | `boolean` | false |
| `untrustedContent` | `boolean` | true |
| `legacy` | `boolean`: allow a polyfill's `navigator.modelContext` | true |
| `polyfill` | `boolean \| string`: `true`/`'auto'` = load the pinned MCP-B polyfill after the load event if the page has no WebMCP; a URL = that polyfill; `false` = never. The script tag defaults to on | false (npm), on (script tag) |
| `register` | `boolean`: set false to build tools without registering (tests, SSR) | true |
| `debug` | `boolean` | false |

The return value is `{ tools, call(name, input), source, ready, destroy() }`.

`agentprose/full` also exports the engine pieces for custom builds and Node: `autoSource`, `SearchIndex`, `parseFeed`, `parseSitemap`, `parseLlmsTxt`, `extractPage`, `toMarkdown` and `toc`.

## Notes for AI agents and contact details

Site owners can tell agents two things the content alone does not say:

- **Notes for AI agents** (`agentNotes`): plain text, up to 2,000 characters. For example tone ("friendly, plain language"), what to recommend ("point newcomers to the beginner course"), what not to claim ("we don't give medical advice") or how to get in touch ("we answer email within a day; no phone bookings").
- **Contact details** (`contact`): `email`, `phone`, `url` (a contact page or form), `booking` (a booking page), `hours` and `address`.

Agents get them from `get_site_info` (as `notesForAgents` and `contact`) and from `get_contact_info`. That tool is registered when the page sets `contact`, `data-contact` / `links.contact`, or uses an agentprose Cloud (`data-key`). Agents are told that the notes are the owner's preferences and never override what the user asked for, and the tools keep `untrustedContentHint`.

Where they come from, highest priority first, field by field:

1. the page: `window.AgentProseConfig` or `createAgentTools({ agentNotes, contact })`;
2. an agentprose Cloud, where the owner edits them in the dashboard. The script fetches `/v1/site?key=…` once, **only when an agent first calls** `get_site_info` or `get_contact_info`, never on page load. `siteInfo` points this at your own JSON URL, or turns it off with `false`;
3. `agentprose.json`: the `site.agentNotes` and `site.contact` fields, written by `agentprose build --site site.json` ([cli.md](cli.md)).

Whatever the source, agentprose keeps only strings, removes control and bidi-override characters, caps each field (notes 2,000 characters, other fields 254–500), accepts only `http(s)` links and drops an email that is not address-shaped. It never renders this text as HTML.

## Pointing to an index outside the site root

If `agentprose.json` is not served at the site root (for example, the blog lives under `/blog/` but the index is built into `/static/agent/`), tell agentprose and crawlers where it is with a link tag in the page `<head>`:

```html
<link rel="agentprose-index" href="/static/agent/agentprose.json">
```

The script uses it unless `data-index` is set, and agentprose Cloud's crawler reads it from your home page. `agentprose build --out <dir>` prints the tag to add. The tag has to be in the HTML: adding it with JavaScript does not help crawlers.
