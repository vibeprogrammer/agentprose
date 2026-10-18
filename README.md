<div align="center">

# agentprose

**Make any blog or CMS readable by AI agents — with one line of JavaScript.**

agentprose turns the content your site already publishes into read-only [WebMCP](https://webmachinelearning.github.io/webmcp/) tools. Agents in the browser can read the current article, search the archive, open a section and cite you accurately, so they don't have to scrape your HTML.

[Live demo](https://vibeprogrammer.github.io/agentprose-demo/) · [Docs](docs/) · [Tools](docs/tools.md) · [Adapters](docs/adapters.md) · [CLI](docs/cli.md) · [Security](SECURITY.md) · [agentprose Cloud](https://agentprose.cloud)

[![npm version](https://img.shields.io/npm/v/agentprose?color=4338ca&label=npm)](https://www.npmjs.com/package/agentprose)
[![License: MIT](https://img.shields.io/badge/license-MIT-34d399)](LICENSE)
[![Core size](https://img.shields.io/badge/core-9.4%20KB%20gzipped-4338ca)](#performance--safety)
[![CI](https://github.com/vibeprogrammer/agentprose/actions/workflows/ci.yml/badge.svg)](https://github.com/vibeprogrammer/agentprose/actions/workflows/ci.yml)

`0 runtime dependencies in the browser` · `read-only tools` · `works on any site`

<!-- Product Hunt badge: uncomment on launch day and replace POST_ID / the post URL.
<a href="https://www.producthunt.com/posts/agentprose?utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-agentprose" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=POST_ID&theme=light" alt="agentprose - Make any blog readable by AI agents | Product Hunt" width="250" height="54" /></a>
-->

</div>

> **agentprose Cloud** · [agentprose.cloud](https://agentprose.cloud) adds hosted search, agent analytics (which agents read, searched and cited what) and zero-config setup: one script tag with your site's `data-key`. Optional. The library below is complete without it, and stays MIT.

---

```html
<script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" defer></script>
```

That's the whole install. agentprose needs no build step, no backend, no account and no configuration.

![The agentprose demo blog with the inspector panel listing its WebMCP tools](docs/assets/demo.png)

<!-- Launch GIF slot: docs/assets/demo.gif (about 20 s: an agent calls search_posts and get_citation on the demo blog). Swap it in above the screenshot when it exists. -->

## Why

When an AI agent visits a blog today, it sees navigation, cookie banners and share buttons. Somewhere in the middle is the article. The agent has to guess where the content starts, spends tokens on markup, and has no reliable way to search the archive.

WebMCP lets a page hand the agent **tools** instead. Most existing WebMCP tools are tied to one platform. Some cut every answer off at 1,500 characters, some still call the deprecated `navigator.modelContext`, and some need admin tokens. agentprose is a single drop-in script that works on any site, from a 5-post Jekyll blog to a headless CMS with 50,000 entries.

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
| `get_site_info` | Site name, description, language, feeds, post count, latest post, links, contact details and the owner's notes for AI agents. |
| `get_contact_info` | How to reach the owner: email, phone, contact page, booking link, hours, address. Registered when the site publishes contact details or uses agentprose Cloud. |
| `get_subscribe_link` · `get_comments_link` · `navigate_to` | Opt-in actions, declared by config. |

Site owners can add **notes for AI agents** (tone, what to recommend, what not to claim) and **contact or booking details** in the page config, in `agentprose.json` (`agentprose build --site`), or in the agentprose Cloud dashboard. Agents are told the notes are preferences that never override the user. See [docs/configuration.md](docs/configuration.md#notes-for-ai-agents-and-contact-details).

Every built-in tool is annotated `readOnlyHint` and `untrustedContentHint`, so agents know the tools change nothing and that post text is data, not instructions. Full schemas are in [docs/tools.md](docs/tools.md).

## How it finds your content

With zero configuration, agentprose reads, in order:

1. **The page.** It reads schema.org JSON-LD (`BlogPosting`, `Article`, `@graph`), OpenGraph and `article:*` meta, the canonical URL, and the article body. The body comes from `<article>`, `[itemprop=articleBody]`, the common theme classes, or a text-density fallback. Navigation, footers, share widgets, ads and comment forms are stripped.
2. **A prebuilt index**, if one exists (`/agentprose.json` from the [CLI](docs/cli.md)). Post bodies sit in one small Markdown file each, so the index stays small on large sites.
3. **Your feeds.** RSS 2.0, Atom and JSON Feed, from `<link rel="alternate">` or the usual paths (`/index.xml`, `/feed.xml`, `/feed/`, `/rss/`).
4. **`sitemap.xml`**, including sitemap indexes, for every post the feed doesn't list. Tag, category and pagination pages are skipped.
5. **`llms.txt`**, for titles and summaries.
6. **[Pagefind](https://pagefind.app/)**, if your site ships it. Its chunked index then answers search.
7. **WordPress**, detected from `<link rel="https://api.w.org/">`. Search, filters and posts then come from the REST API.

Nothing is fetched on page load. Registering the tools costs no network requests. The site-wide engine (6.6 KB) and your feeds load only when an agent first calls a site-wide tool. The result is cached for the session.

## Three ways in

### 1. One line (any site)

```html
<script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" defer
        data-subscribe="https://example.com/newsletter"></script>
```

Every option is a `data-*` attribute; see [docs/configuration.md](docs/configuration.md).

`agentprose@0` always serves the latest 0.x release, so fixes reach your site without a new tag; breaking changes would ship as `agentprose@1`. To freeze an exact version, with an optional SRI hash, see [docs/versioning.md](docs/versioning.md).

Using [agentprose Cloud](https://agentprose.cloud)? Load the same library from the Cloud instead. Your site's public key (`pk_…`, from the dashboard) is the only attribute, and hosted search and agent analytics switch on by themselves:

```html
<script src="https://agentprose.cloud/v/0/agentprose.min.js" data-key="pk_…" defer></script>
```

`/v/0/` is the Cloud's evergreen channel (latest 0.x, fixes within about an hour); `/v/<exact version>/` pins one release. Everything the Cloud snippet loads, including the MCP-B polyfill, comes from `agentprose.cloud`.

Add `?agentprose-inspect` to any URL to open the 🔌 inspector. It lists the registered tools and lets you call them, in any browser.

### 2. npm (apps, frameworks, custom tools)

```bash
npm install agentprose
```

```ts
import { createAgentTools } from 'agentprose';
import { sanity } from 'agentprose/adapters/sanity';

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
npx agentprose build public --base-url https://example.com/ --llms
```

This writes `agentprose.json` (metadata and a search excerpt per post), one `agentprose/posts/*.md` per post and, optionally, `llms.txt`. The script finds `/agentprose.json` automatically. `npx agentprose inspect https://example.com/some-post/` shows what agents can read on a live page and gives it an agent-readiness score.

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

A **private** dataset or token can't go in a page, because every visitor can read it. For those, use **proxy mode**: `proxy: 'https://you.example/cms'` sends every request to your endpoint, and your server adds the credential. [examples/proxy](examples/proxy/) has a 30-line Cloudflare Worker and a Node server. agentprose **refuses to start** with credentials shaped like management keys: Contentful `CFPAT-…`, Sanity `sk…` and Ghost Admin keys. Details are in [docs/adapters.md](docs/adapters.md).

## Browser support

| Environment | Behaviour |
|---|---|
| Chrome with `chrome://flags/#enable-webmcp-testing`, or the WebMCP origin trial | Native `document.modelContext`. Tested end-to-end in Chromium 156. |
| Any other browser | agentprose loads the pinned [MCP-B polyfill](https://www.npmjs.com/package/@mcp-b/webmcp-polyfill) (9 KB gzipped, from jsDelivr with an integrity hash, or from agentprose Cloud when you use the Cloud snippet) **after the page has loaded**, and registers into its `document.modelContext`. Nothing is loaded when the page already has WebMCP. Tested end-to-end. `data-polyfill="off"` turns it off. |
| Older polyfills exposing `navigator.modelContext` | Used as a fallback (`legacy` mode); no polyfill is loaded. |
| Polyfill blocked (strict CSP, offline) or turned off | Registers nothing, throws nothing, changes nothing. Tools stay callable via `window.AgentProse.instance.call()`. |

WebMCP runs only in secure contexts (HTTPS or localhost). Embedded frames need the `tools` Permissions Policy feature. agentprose registers tools with an `AbortSignal`, so `destroy()` removes them cleanly, and it never calls the removed `provideContext` or `unregisterTool`. See [docs/browser-support.md](docs/browser-support.md).

## Works with MCP-B

[MCP-B](https://docs.mcp-b.ai/) gives a page the WebMCP runtime. agentprose gives it something to say. The two fit together with no glue code:

- **The polyfill is built in.** In browsers without WebMCP, agentprose loads `@mcp-b/webmcp-polyfill@6.0.3` once the page has loaded, so MCP-B's extension, relay and other clients find the tools through the standard `document.modelContext`. In short:
  - **When:** only after the `load` event, and only if the page still has no WebMCP (native, `@mcp-b/global`, an extension). Never in Chrome with native WebMCP.
  - **From where:** jsDelivr, pinned to 6.0.3, with a Subresource Integrity hash (`integrity="sha384-…"`), so the browser runs only the exact file agentprose was tested with. The agentprose Cloud snippet loads the same file from `agentprose.cloud` instead, so there is one domain to trust.
  - **Opt out:** `data-polyfill="off"`. **Self-host:** copy the file and set `data-polyfill="/js/webmcp-polyfill.js"`.
  - **Strict CSP:** allow `https://cdn.jsdelivr.net` in `script-src`, or self-host.

  The full story (why, the hash, self-hosting steps, a CSP table): [docs/security.md](docs/security.md#the-mcp-b-polyfill).
- **`@mcp-b/global` is detected.** If the page loads MCP-B's full runtime, agentprose registers into it and loads nothing extra.
- **Your blog inside Claude Desktop, Cursor or Claude Code.** Add MCP-B's local relay embed next to agentprose, add the relay to your MCP client, and the agent can search, read and cite your posts from the tab you have open:

```html
<script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/@mcp-b/webmcp-local-relay@6/dist/browser/embed.js" defer></script>
```

```json
{ "mcpServers": { "webmcp-local-relay": { "command": "npx", "args": ["-y", "@mcp-b/webmcp-local-relay@latest"] } } }
```

Step by step, with what was verified: [docs/tutorials/mcp-b-claude-desktop.md](docs/tutorials/mcp-b-claude-desktop.md). A runnable check (a real MCP client, the relay and headless Chromium) is in [examples/mcp-b-desktop](examples/mcp-b-desktop/).

## Compared with what exists

|  | One-line install | Auto-discovery | Full article (no cap) | Sections / TOC | Search | Any SSG | WordPress | Headless CMS | Proxy mode | Current API |
|---|---|---|---|---|---|---|---|---|---|---|
| **agentprose** | ✅ | ✅ | ✅ paged | ✅ | ✅ BM25F / Pagefind / CMS | ✅ | ✅ | ✅ 6 adapters | ✅ | ✅ |
| astro-webmcp | config | Astro collections | ✗ 1.5k cap | ✗ | ✅ | Astro only | ✗ | ✗ | ✗ | ✅ |
| WordPress WebMCP plugins | plugin | ✗ | some | ✗ | WP search | ✗ | ✅ | ✗ | ✗ | mixed |
| Hand-rolled Hugo/Jekyll scripts | ✗ | ✗ | some | ✗ | titles/tags | one site | ✗ | ✗ | ✗ | ✅ |
| CMS vendors' MCP servers | ✗ | ✗ | ✅ | ✗ | ✅ | ✗ | own | own (admin creds) | server | not WebMCP |

The full landscape, with sources, is in [docs/comparison.md](docs/comparison.md).

## Performance & safety

- **9.9 KB gzipped** core. It's deferred and doesn't touch layout. The core works with strict CSP: no `eval`, no inline code, and scripts load only from the script's own directory, plus the MCP-B polyfill (pinned, integrity-checked) from jsDelivr after the load event in browsers without WebMCP (self-host it with `data-polyfill="/path.js"`, or `data-polyfill="off"`; see [the polyfill notes](docs/security.md#the-mcp-b-polyfill)). The lazily loaded engine is 6.6 KB, and each adapter is 2–3 KB.
- **Read-only.** The only tool that does anything is `navigate_to`, which is opt-in and same-origin only.
- **Bounded output.** Answers are capped (`maxChars`, default 20,000) and continue with `offset`/`next_offset`. Indexes are capped (`maxPosts`, default 2,000).
- **Same-origin only.** agentprose fetches only your own pages, feeds and sitemaps. It never acts as an open proxy.
- **No tracking.** Analytics is your callback, or your endpoint (`data-analytics`). It receives tool names, timings, the page and search queries, never content.

See [SECURITY.md](SECURITY.md) and [docs/security.md](docs/security.md).

## Analytics hook

```js
document.addEventListener('agentprose:call', (e) => console.log(e.detail)); // { tool, ok, ms, page, args }
```

Learn which posts agents read, what they search for and what comes up empty. Searches that return nothing point to posts you haven't written yet. Want it without building anything? [agentprose Cloud](https://agentprose.cloud) is the hosted dashboard: agents, tools, latency, zero-result searches and verified citations, with a free plan.

## Roadmap

- [x] Zero-config script, 10 tools plus 3 opt-in actions, inspector, CLI, 7 CMS adapters, WordPress plugin
- [ ] Declarative forms (WebMCP `toolname` attributes) for newsletter sign-up, opt-in
- [ ] `agentprose build` plugins for Astro, Eleventy and Next.js (zero-step indexing)
- [ ] Semantic search ("ask this blog") via an optional embedding index
- [ ] More adapters: Payload, Directus, Hashnode, Contentstack
- [x] [agentprose Cloud](https://agentprose.cloud): agent analytics and hosted index and search
- [ ] agentprose Cloud: managed CMS proxy ([BUSINESS.md](docs/BUSINESS.md))

## For coding agents

`skills/agentprose/` is an agent skill: it teaches Claude Code, Codex, Cursor, Copilot and other coding agents to add agentprose to a site the right way (pick the install path for the CMS or generator, add the tag, build the index, verify with `agentprose inspect`). Install it with:

```bash
npx skills add vibeprogrammer/agentprose
```

## Development

```bash
npm install
npm run typecheck && npm test   # 104 unit tests (vitest + happy-dom/linkedom)
npm run build                   # dist/, prints gzipped sizes, fails over budget
CHROME=$(which chromium) npm run test:e2e   # 12 end-to-end tests in headless Chromium (native WebMCP flag)
npm run demo                    # builds the demo blog into demo/site
```

See [CONTRIBUTING.md](CONTRIBUTING.md). Releases: [RELEASING.md](RELEASING.md).

## License

[MIT](LICENSE). The core, every tool, the CLI, all adapters and the WordPress plugin are MIT, and stay that way.
