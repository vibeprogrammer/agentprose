# Comparison with existing tools

This summarizes the landscape research done on 17 October 2026, with primary sources read that day. [S] marks a claim seen only in a search snippet. Install counts and stars change daily.

## Gap matrix
Columns: 1L = one-line script install · AD = zero-config auto-discovery (JSON-LD/OG/feeds/sitemap/llms.txt) · FT = full-text search · MD = full article as Markdown (no tiny cap) · TOC = sections/TOC of current page · REL = related posts · TAX = taxonomies · SSG = works across SSGs · CMS = headless CMS adapters · WP = WordPress · PX = proxy mode for private tokens · SEC = read-only + untrusted hints + caps · TEST = tests/CI · NAV = desktop-agent bridge compat (MCP-B relay) · CUR = current API (`document.modelContext`)
| Solution | 1L | AD | FT | MD | TOC | REL | TAX | SSG | CMS | WP | PX | SEC | TEST | CUR |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Cloudflare WebMCP packs | ✅ (edge toggle) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | any (CF-only) | via own /mcp | via own /mcp | n/a | ~ | ? | ✅ |
| WebMCP Bridge (WP) | ✅ plugin | ✗ | ~ (WP search) | ~ (needs Mescio) | ✗ | ✗ | ✅ | ✗ | ✗ | ✅ | ✗ | ~ | ? | ? |
| Royal MCP (WP) | plugin | ✗ | ~ | ✗ | ✗ | ✗ | ✅ | ✗ | ✗ | ✅ | server | ~ (OAuth) | ? | server-side |
| Agentgate (WP) | plugin | ✗ | ~ | ✅ | ✗ | ✗ | ✅ | ✗ | ✗ | ✅ | ✗ | ✅ | ? | ✗ navigator |
| astro-webmcp | 1 config line | ~ (content collections) | ✅ Pagefind/Orama | ✗ (1.5k cap) | ✗ | ✗ | ~ | Astro only | ✗ | ✗ | ✗ | ✅ | ? | ✅ |
| webmcp-docs | ✗ | ✗ | via provider | ✅ | ~ | ✗ | ✗ | ~ | ✗ | ✗ | ✗ | ~ | ? | ✅ (via @mcp-b) |
| contentstack-webmcp | ✗ | ✗ | ✅ CDA | ✅ | ✗ | ✗ | ✅ | ✗ | Contentstack only | ✗ | ✅ | ✅ | ? | ✅ |
| auto-webmcp / keak | ✅ | forms only | ✗ | ✗ | ✗ | ✗ | ✗ | ✅ | ✗ | ✗ | ✗ | ~ | ✅ | ✅ |
| Hand-rolled Hugo/Jekyll (Chaganti, pardel) | ✗ | ✗ | titles/tags | ✅ (.md) / ✗ | ✗ | ✗ | ✅ | 1 site | ✗ | ✗ | ✗ | ~ | ✗ | ✅ |
| Vendor MCP servers (Sanity/Contentful/Strapi/WP adapter) | ✗ | ✗ | ✅ | ✅ | ✗ | ✗ | ✅ | ✗ | own CMS | own | server | admin creds | ✅ | not WebMCP |
| **agentprose** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ 6+ | ✅ | ✅ | ✅ | ✅ | ✅ |

### The 10 sharpest weaknesses of what exists
1. **Siloed per platform** — Astro-only, WP-only, Contentstack-only; nothing spans static sites + WordPress + Ghost + headless CMS.
2. **No zero-config content discovery** — nobody reads what every blog already publishes (JSON-LD `BlogPosting`, OpenGraph, RSS/Atom/JSON Feed, sitemap, llms.txt).
3. **Agents can't actually read an article** — astro-webmcp truncates every output at 1,500 chars; Jekyll example returns excerpts only; WP Bridge needs a second plugin for Markdown.
4. **No page-level tools** — no "current article", "table of contents", "get section", "cite/quote" — the thing an in-tab agent most needs.
5. **Index size is unsolved** — Chaganti's Hugo index hit 60 MB; hand-rolled sites ship one JSON blob; only astro-webmcp reuses Pagefind's chunked index.
6. **Stale / wrong API** — several plugins and posts target the deprecated `navigator.modelContext` (Agentgate, code-atlantic/webmcp-abilities, goSmarter post) and silently do nothing in current Chrome.
7. **Write-capable surface where read-only is the job** — WP plugins mix cart/forms/admin; vendor MCP servers need admin tokens. Readers' agents need read-only + `untrustedContentHint`.
8. **Token-leak footguns for headless CMS** — no packaged direct/proxy split except an unpublished Contentstack experiment; no guard against shipping preview/management tokens.
9. **Zero observability** — site owners can't see which agents called which tools (Cloudflare/TollBit sell this for crawlers; nobody offers it for WebMCP calls).
10. **Untested, unmaintained hobby code** — most WP WebMCP plugins have 0–10 installs; only Cloudflare and MCP-B have real engineering behind them; discoverability is an admitted limitation in Chrome's own docs.


## Landscape
Legend: [P]=page/registry/API read this session; [S]=search snippet only (unverified).

### 2a. Edge / platform-level
| Tool | What it is | Content tools for blogs? | Notes |
|---|---|---|---|
| **Cloudflare "WebMCP on Cloudflare"** (dev preview, blog 2026-08-06) https://blog.cloudflare.com/webmcp/ [P] | Dashboard toggle (Agent Readiness → WebMCP); edge HTMLRewriter injects `<script type="module" src="/.webmcp/bridge.js" data-packs="c2pa,mcp-server-client" data-mcp-url="/mcp">`; bridge registers tool **packs** via `document.modelContext.registerTool`; no-op when unsupported | **No content pack yet.** Packs: Content Credentials (`scan_images_c2pa`, `inspect_image_c2pa`) and Site MCP Server (proxies your own `/mcp` tools/list → tools/call with the visitor's session). Blog says future packs may "summarize a sitemap with Workers AI or query an AI Search index". | Biggest strategic threat/validation: proves the "one injected line" model. Cloudflare-only; requires an existing MCP server for anything site-specific. Also BrowserRun (remote browser) consumes WebMCP: https://developers.cloudflare.com/browser-run/features/webmcp/ [S] |
| **MCP-B / WebMCP-org** https://github.com/WebMCP-org/npm-packages [P] (104★, MIT, pushed 2026-10-14) | Polyfill + transports + React hooks + local relay | No blog tools — infrastructure | @mcp-b/webmcp-polyfill ~702k dl/mo, @mcp-b/global ~439k/mo [P npm search API]. Bridges in-tab tools to desktop MCP clients (local relay). We should interoperate, not compete. |

### 2b. WordPress (≈20 plugins mention WebMCP; all small) — wordpress.org plugin API queried [P]
| Plugin | Installs | Updated | WebMCP tools / approach | Strengths | Weaknesses |
|---|---|---|---|---|---|
| **Royal MCP** https://wordpress.org/plugins/royal-mcp/ | 10,000+ | 2026-10-15 | Server-side MCP (200+ tools, OAuth 2.0); "WebMCP-ready on the server side": signed-in visitors' browser agents via a WebMCP bridge (names Cloudflare's) | Breadth, OAuth, integrations (Woo, Elementor, Yoast…) | Admin/write oriented; WebMCP only for signed-in users via third-party bridge; huge attack surface; not a reader-facing content layer |
| **WebMCP Bridge** https://wordpress.org/plugins/webmcp-bridge/ | 600+ | 2026-09-25 | `search_posts, get_post, get_menu, get_categories, get_site_info, submit_contact_form` + 8 WooCommerce tools; manifest at `/wp-json/webmcp-bridge/v1/manifest`, OpenAPI, remote MCP at `/wp-json/webmcp-bridge/v1/mcp`; with paid-ish companion "Mescio for Agents": `retrieve` (RAG), `get_markdown_content`, `get_llms_txt` | Most complete reader tool set in WP; multi-surface (WebMCP + MCP + OpenAPI) | Markdown/RAG need a 2nd plugin; WP-only; mixes write actions (cart) |
| Conversion Agent Discovery https://wordpress.org/plugins/conversion-agent-discovery/ | 100+ | 2026-06-17 | read-only WebMCP + Accept: text/markdown, llms.txt, api-catalog, agent-skills, optional Origin-Trial header | Honest, standards-heavy, read-only | tiny adoption; WP-only |
| Agentgate for WebMCP https://wordpress.org/plugins/agentgate-for-webmcp/ | 10+ | 2026-04-02 | 3 read-only tools (search posts, get post, list categories); **checks `navigator.modelContext`** | zero-config | **targets the deprecated `navigator` alias → silently dead on current Chrome**; abandoned since April |
| BeeClear / Rootz / IBS Gateway / GoldT / Semantika / QuangNhatDev / Nurevo / RankReady(github eticastudio/rankready, 9★) | 0–10 each | 2026 | Mostly "AI visibility/SEO" bundles: llms.txt, markdown, /.well-known files + some WebMCP tools | lots of surfaces | Fragmented, overlapping, near-zero installs; proprietary-ish "standards" (/.well-known/ai, agents.txt) |
| Form plugins (IBS for WPForms/Ninja, WebMCPFY CF7/Gravity, Form Annotator) | 0 | 2026 | Declarative form tools | narrow | not content |
| **Official WordPress MCP Adapter** https://github.com/WordPress/mcp-adapter [P] (1,849★, GPL-2.0, pushed 2026-10-16) + Abilities API (merged to core; repo archived https://github.com/WordPress/abilities-api 215★) | — | — | Server-side MCP over the Abilities API; Automattic/wordpress-mcp (948★) archived/deprecated in favour of it | Canonical, core-backed | Server-side, authenticated, admin/editor use-case — **not** an in-page reader layer |
| code-atlantic/webmcp-abilities https://github.com/code-atlantic/webmcp-abilities [P] | 14★ | 2026-02-25 | Bridges WP Abilities → `navigator.modelContext` | smart idea (reuse Abilities) | stale; deprecated `navigator` API |

### 2c. Static site generators & JS frameworks
| Tool | Stats | Approach | Strengths | Weaknesses |
|---|---|---|---|---|
| **astro-webmcp** https://www.npmjs.com/package/astro-webmcp [P] / github fabricioctelles/astro-webmcp (19★, MIT, v0.6.0 2026-09-19, ~788 dl/mo) | | Astro integration, "one line" in astro.config; tools `search_content`, `list_sections`, `go_to`, `get_page_info`; search backends manifest/Pagefind/Orama; security: exposedTo, maxOutputLength 1500, regex prompt-injection sanitizer; annotations | Closest competitor; good security thinking; Pagefind reuse | **Astro only**; **no full-article/markdown tool** (outputs capped at 1,500 chars); no TOC/sections, no related, no feeds/JSON-LD discovery; customTools as code strings |
| **webmcp-docs** https://www.npmjs.com/package/webmcp-docs [P] (MIT, v0.4.0 2026-09-01, ~58 dl/mo) | | Library: `search_docs`, `get_doc`, `list_docs`; you supply pages + provider(search,getDocument); depends on @mcp-b/global | framework-agnostic | docs-only; manual wiring; no auto-discovery |
| Hugo — hand-rolled: ravichaganti.com (5 tools, see §0) https://ravichaganti.com/blog/adding-webmcp-support-to-hugo-static-sites/ [P]; goSmarter.ai (Hugo/Netlify, uses `navigator.modelContext`) https://www.linkedin.com/pulse/getting-our-hugonetlify-site-agent-compatible-steph-locke-bnjoe [P] | | Per-site JS + Hugo JSON outputs | proves demand | **No reusable Hugo module exists** (GitHub search "webmcp hugo": 0 repos [P]) |
| Jekyll — hand-rolled: pardel.dev (Sep 28 2026) https://www.pardel.dev/2026/09/28/webmcp-this-blog-now-has-tools [P] | | `/webmcp.json` built by Liquid + one script: `search-posts`, `list-tags`, `list-projects`, `open-page`, `list-talks`; readOnlyHint | clean, idiomatic | bespoke; excerpts only (no full text); **no Jekyll plugin exists** (GitHub search: 0 repos [P]) |
| Eleventy, Docusaurus, VitePress, Next.js, Gatsby, Nuxt Content, Hashnode, Medium, Substack, dev.to | | **No dedicated WebMCP content integration found** (npm + GitHub + web search) [P/S] | — | gap |
| Generic auto-generators: **auto-webmcp** (forms → tools, script tag, v0.7.0, MIT) https://www.npmjs.com/package/auto-webmcp [P]; **@keak/webmcp-core** (crawler → tool defs, MIT) [P]; **webmcpable** (app actions, MIT, v0.7.0 2026-10-15) [P]; **@absolutejs/webmcp** (policy/audit) [P npm] | | Forms/app-action oriented | one-line install proven (auto-webmcp) | **Not content-aware**: a blog has no forms worth calling; reading/searching articles is the job |

### 2d. Headless CMS — vendors ship *server-side* MCP, nobody ships reader-side WebMCP
- Sanity, Contentful, Strapi, Storyblok, Hashnode, Ghost (community) all have MCP servers aimed at **editors/developers** (authenticated, write-capable, run in IDE/desktop) — see §3 for primary links. Strapi sidecar **corsen-context-strapi** (0★, MIT, 2026-09-03) https://github.com/CorsenAI/corsen-context-strapi [P] is the only CMS-side WebMCP attempt found.
- Enonic: no MCP/WebMCP product found [S].
- **Gap: no package turns a headless CMS's public delivery API into reader-facing in-page tools.**

### 2e. Adjacent agent-readiness layers (not WebMCP but overlapping)
- **llms.txt** plugins (WordPress "Website LLMs.txt", Yoast llms.txt feature) and Cloudflare "Markdown for Agents" — static discovery/markdown, no tools. NLWeb (Microsoft) https://github.com/nlweb-ai/NLWeb [P] 6,255★ MIT — Python server: natural-language `/ask` over schema.org data + MCP; heavyweight (vector DB). Scoring sites: webmcp.ora.ai (referenced in webmcp-docs README) [P].



## Where agentprose fits

agentprose is a *reader-side* layer. It serves the agent in the visitor's browser, from public content, read-only. The vendors' MCP servers (Sanity, Contentful, Strapi, the WordPress MCP Adapter) serve the *editor's* agent with admin credentials. The two are complementary. agentprose interoperates with MCP-B: it registers into the MCP-B polyfill and is visible to its relay.
