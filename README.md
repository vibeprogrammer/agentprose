<div align="center">

# readmcp

**Make any blog or CMS readable by AI agents — with one line of JavaScript.**

readmcp turns the content your site already publishes into read-only [WebMCP](https://webmachinelearning.github.io/webmcp/) tools. Agents in the browser can read the current article, search the archive, open a section and cite you accurately, so they don't have to scrape your HTML.

[Live demo](https://readmcp.sites.tab.bot/) · [Docs](docs/) · [Tools](docs/tools.md) · [Adapters](docs/adapters.md) · [CLI](docs/cli.md) · [Security](SECURITY.md)

`9.1 KB gzipped` · `0 runtime dependencies in the browser` · `MIT`

</div>

---

```html
<script src="https://cdn.jsdelivr.net/npm/readmcp@0.1/dist/readmcp.min.js" defer></script>
```

That's the whole install. readmcp needs no build step, no backend, no account and no configuration.

## Why

When an AI agent visits a blog today, it sees navigation, cookie banners and share buttons. Somewhere in the middle is the article. The agent has to guess where the content starts, spends tokens on markup, and has no reliable way to search the archive.

WebMCP lets a page hand the agent **tools** instead. Most existing WebMCP tools are tied to one platform. Some cut every answer off at 1,500 characters, some still call the deprecated `navigator.modelContext`, and some need admin tokens. readmcp is a single drop-in script that works on any site, from a 5-post Jekyll blog to a headless CMS with 50,000 entries.

## What agents get

| Tool | What it returns |
|---|---|
| `get_current_article` | The post being viewed as clean Markdown, with title, authors, dates, tags, reading time and section outline. Long posts are paged and never cut off. |
| `search_posts` | Full-text search across the whole site, ranked (BM25F over title › tags › summary › body). Filters for tag, category, author and date. |
| `list_posts` | Newest or oldest posts, filterable and paginated. |
| `get_post` | Any post as Markdown by URL or slug, optionally one `section`. |
| `get_table_of_contents` | The heading outline of a post (ids, levels, titles). |
| `get_section` | One section's Markdown, matched by id or heading text. |
| `get_related_posts` | Posts related by shared tags, categories and topic. |
| `list_taxonomies` | Tags, categories and authors, with post counts. |
| `get_citation` | A formatted citation. With `quote` it checks the text really appears and returns a `#:~:text=` deep link that highlights it. |
| `get_site_info` | Site name, description, language, feeds, post count, latest post and links. |
| `get_subscribe_link` · `get_comments_link` · `navigate_to` | Opt-in actions, declared by config. |

Every built-in tool is annotated `readOnlyHint` and `untrustedContentHint`, so agents know the tools change nothing and that post text is data, not instructions. Full schemas are in [docs/tools.md](docs/tools.md).

## How it finds your content

With zero configuration, readmcp reads, in order:

1. **The page.** It reads schema.org JSON-LD (`BlogPosting`, `Article`, `@graph`), OpenGraph and `article:*` meta, the canonical URL, and the article body. The body comes from `<article>`, `[itemprop=articleBody]`, the common theme classes, or a text-density fallback. Navigation, footers, share widgets, ads and comment forms are stripped.
2. **A prebuilt index**, if one exists (`/readmcp.json` from the [CLI](docs/cli.md)). Post bodies sit in one small Markdown file each, so the index stays small on large sites.
3. **Your feeds.** RSS 2.0, Atom and JSON Feed, from `<link rel="alternate">` or the usual paths (`/index.xml`, `/feed.xml`, `/feed/`, `/rss/`).
4. **`sitemap.xml`**, including sitemap indexes, for every post the feed doesn't list. Tag, category and pagination pages are skipped.
5. **`llms.txt`**, for titles and summaries.
6. **[Pagefind](https://pagefind.app/)**, if your site ships it. Its chunked index then answers search.
7. **WordPress**, detected from `<link rel="https://api.w.org/">`. Search, filters and posts then come from the REST API.

Nothing is fetched on page load. Registering the tools costs no network requests. The site-wide engine (6.6 KB) and your feeds load only when an agent first calls a site-wide tool. The result is cached for the session.

## Three ways in

### 1. One line (any site)

```html
<script src="https://cdn.jsdelivr.net/npm/readmcp@0.1/dist/readmcp.min.js" defer
        data-subscribe="https://example.com/newsletter"></script>
```

Every option is a `data-*` attribute; see [docs/configuration.md](docs/configuration.md). Add `?readmcp-inspect` to any URL to open the 🔌 inspector. It lists the registered tools and lets you call them, in any browser.

### 2. npm (apps, frameworks, custom tools)

```bash
npm install readmcp
```

```ts
import { createAgentTools } from 'readmcp';
import { sanity } from 'readmcp/adapters/sanity';

const agentTools = createAgentTools({
  adapter: sanity({ projectId: 'abc123', dataset: 'production', urlPattern: '/blog/{slug}/' }),
  links: { subscribe: '/newsletter' },
  onToolCall: (e) => analytics.track('agent_tool', e), // tool, ok, ms, page — never content
  tools: [
    {
      name: 'get_pricing',
      description: 'Returns current plan prices.',
      annotations: { readOnlyHint: true },
      execute: () => fetch('/api/pricing').then((r) => r.json()),
    },
  ],
});

await agentTools.ready; // { mode: 'native' | 'legacy' | 'none', registered, failed }
await agentTools.call('search_posts', { query: 'webmcp' }); // same code path an agent uses
agentTools.destroy(); // unregisters (aborts the AbortSignal)
```

### 3. Static index for big sites (Hugo, Jekyll, Astro, Eleventy, Next.js, …)

```bash
npx readmcp build public --base-url https://example.com/ --llms
```

This writes `readmcp.json` (metadata and a search excerpt per post), one `readmcp/posts/*.md` per post and, optionally, `llms.txt`. The script finds `/readmcp.json` automatically. `npx readmcp inspect https://example.com/some-post/` shows what agents can read on a live page and gives it an agent-readiness score.

## Platforms

| Platform | How | Credentials in the page |
|---|---|---|
| Static sites (Hugo, Jekyll, Astro, Eleventy, Next.js export, Gatsby, Docusaurus, plain HTML) | One line, plus the CLI for large archives | none |
| **WordPress** | Auto-detected, or the [ready plugin](wordpress-plugin/) | none (public REST API) |
| **Ghost** | `data-adapter="ghost" data-key="…"` | Content API key ([public by design](https://docs.ghost.org/content-api)) |
| **Sanity** | `data-adapter="sanity" data-project="…"` | none for public datasets (API CDN + GROQ) |
| **Contentful** | `data-adapter="contentful" data-space="…" data-token="…"` | Delivery API token (published content only) |
| **Enonic XP** | `data-adapter="enonic" data-endpoint="…/site/<project>/master"` | none (public Guillotine endpoint) |
| **Strapi 5 / 4** | `data-adapter="strapi" data-api="https://cms…"` | none (Public role: find, findOne) |
| **Storyblok** | `data-adapter="storyblok" data-token="…"` | public access token |
| Anything else | `defineAdapter({ list, get, search?, taxonomies?, site? })` | your call |

A **private** dataset or token can't go in a page, because every visitor can read it. For those, use **proxy mode**: `proxy: 'https://you.example/cms'` sends every request to your endpoint, and your server adds the credential. [examples/proxy](examples/proxy/) has a 30-line Cloudflare Worker and a Node server. readmcp **refuses to start** with credentials shaped like management keys: Contentful `CFPAT-…`, Sanity `sk…` and Ghost Admin keys. Details are in [docs/adapters.md](docs/adapters.md).

## Browser support

| Environment | Behaviour |
|---|---|
| Chrome with `chrome://flags/#enable-webmcp-testing`, or the WebMCP origin trial | Native `document.modelContext`. Tested end-to-end in Chromium 156. |
| Any browser + [MCP-B polyfill](https://www.npmjs.com/package/@mcp-b/webmcp-polyfill) (`data-polyfill`) | `document.modelContext` from the polyfill. Tested end-to-end. |
| Older polyfills exposing `navigator.modelContext` | Used as a fallback (`legacy` mode). |
| Everything else | Registers nothing, throws nothing, changes nothing. Tools stay callable via `window.ReadMCP.instance.call()`. |

WebMCP runs only in secure contexts (HTTPS or localhost). Embedded frames need the `tools` Permissions Policy feature. readmcp registers tools with an `AbortSignal`, so `destroy()` removes them cleanly, and it never calls the removed `provideContext` or `unregisterTool`. See [docs/browser-support.md](docs/browser-support.md).

## Compared with what exists

|  | One-line install | Auto-discovery | Full article (no cap) | Sections / TOC | Search | Any SSG | WordPress | Headless CMS | Proxy mode | Current API |
|---|---|---|---|---|---|---|---|---|---|---|
| **readmcp** | ✅ | ✅ | ✅ paged | ✅ | ✅ BM25F / Pagefind / CMS | ✅ | ✅ | ✅ 6 adapters | ✅ | ✅ |
| astro-webmcp | config | Astro collections | ✗ 1.5k cap | ✗ | ✅ | Astro only | ✗ | ✗ | ✗ | ✅ |
| WordPress WebMCP plugins | plugin | ✗ | some | ✗ | WP search | ✗ | ✅ | ✗ | ✗ | mixed |
| Hand-rolled Hugo/Jekyll scripts | ✗ | ✗ | some | ✗ | titles/tags | one site | ✗ | ✗ | ✗ | ✅ |
| CMS vendors' MCP servers | ✗ | ✗ | ✅ | ✗ | ✅ | ✗ | own | own (admin creds) | server | not WebMCP |

The full landscape, with sources, is in [docs/comparison.md](docs/comparison.md).

## Performance & safety

- **9.1 KB gzipped** core. It's deferred and doesn't touch layout. The core works with strict CSP: no `eval`, no inline code, and scripts load only from the script's own directory. The lazily loaded engine is 6.6 KB, and each adapter is 2–3 KB.
- **Read-only.** The only tool that does anything is `navigate_to`, which is opt-in and same-origin only.
- **Bounded output.** Answers are capped (`maxChars`, default 20,000) and continue with `offset`/`next_offset`. Indexes are capped (`maxPosts`, default 2,000).
- **Same-origin only.** readmcp fetches only your own pages, feeds and sitemaps. It never acts as an open proxy.
- **No tracking.** Analytics is your callback, or your endpoint (`data-analytics`). It receives tool names, timings, the page and search queries, never content.

See [SECURITY.md](SECURITY.md) and [docs/security.md](docs/security.md).

## Analytics hook

```js
document.addEventListener('readmcp:call', (e) => console.log(e.detail)); // { tool, ok, ms, page, args }
```

Learn which posts agents read, what they search for and what comes up empty. Searches that return nothing point to posts you haven't written yet. A hosted dashboard is on the [roadmap](docs/BUSINESS.md).

## Roadmap

- [x] Zero-config script, 10 tools plus 3 opt-in actions, inspector, CLI, 7 CMS adapters, WordPress plugin
- [ ] Declarative forms (WebMCP `toolname` attributes) for newsletter sign-up, opt-in
- [ ] `readmcp build` plugins for Astro, Eleventy and Next.js (zero-step indexing)
- [ ] Semantic search ("ask this blog") via an optional embedding index
- [ ] More adapters: Payload, Directus, Hashnode, Contentstack
- [ ] readmcp Cloud: agent analytics, hosted index and search, managed CMS proxy ([BUSINESS.md](docs/BUSINESS.md))

## Development

```bash
npm install
npm run typecheck && npm test   # 76 unit tests (vitest + happy-dom/linkedom)
npm run build                   # dist/, prints gzipped sizes, fails over budget
CHROME=$(which chromium) npm run test:e2e   # 12 end-to-end tests in headless Chromium (native WebMCP flag)
npm run demo                    # builds the demo blog into demo/site
```

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE). The core, every tool, the CLI, all adapters and the WordPress plugin are MIT, and stay that way.
