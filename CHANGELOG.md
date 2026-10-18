# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.3] - 2026-10-18

### Added
- **Notes for AI agents** (`agentNotes`) and **contact details** (`contact`: `email`, `phone`, `url`, `booking`, `hours`, `address`), written by the site owner. Agents get them from `get_site_info` (`notesForAgents`, `contact`) and from a new read-only tool, **`get_contact_info`**, which is registered when the page sets `contact`, `data-contact`, or uses agentprose Cloud (`data-key`). Sources, highest priority first: page config, agentprose Cloud (`/v1/site`, fetched only when an agent first asks, never on page load; `siteInfo` overrides or disables it), `agentprose.json` (`site.agentNotes`, `site.contact`). Everything is cleaned and capped, and links must be http(s). See docs/configuration.md.
- `agentprose build --site <file.json>` publishes `name`, `description`, `lang`, `logo`, `links`, `agentNotes` and `contact` in `agentprose.json`, and warns about every field it leaves out. With `--out`, the CLI prints the `<link rel="agentprose-index">` tag to add.
- `skills/agentprose/SKILL.md`: an agent skill that teaches coding agents to install agentprose correctly (`npx skills add vibeprogrammer/agentprose`).

### Changed
- The 🔌 inspector passes object input to the browser's `executeTool`, retries once with a JSON string on a `TypeError` (older Chrome builds), and accepts both string and value results.
- Size budget: core + engine raised from 16,640 B to 17,408 B gzipped (+768 B) for owner details and `get_contact_info`. The core stays under 10,240 B.

### Docs
- `<link rel="agentprose-index">` (already supported) is now documented, with a section on owner notes and contact details, a security note on owner-written text, dated browser evidence, and docs/roadmap/2026-10-ideas.md.

### Tests
- A contract test calls every built-in tool with empty and malformed input and asserts it returns a JSON object and never `null`, `undefined` or a throw. Unit tests cover cleaning, precedence and the Cloud fetch; an e2e test shows the Cloud details load only when an agent asks.

## [0.1.2] - 2026-10-18

### Security
- The default MCP-B polyfill tag now carries Subresource Integrity: `integrity="sha384-aEnX8+GGpZs7j3YINfHJw5npl4H6AkfYHQ5KqdgJzScZ5s76I533BzlPrceDInPx"` and `crossorigin="anonymous"` for `@mcp-b/webmcp-polyfill@6.0.3`. If a CDN ever served a different file, the browser refuses it and agentprose settles in mode `none`. A polyfill URL you supply yourself (`data-polyfill="/js/…"`) is used as given, without a hash; the npm API also accepts `polyfill: { src, integrity }`. New export: `POLYFILL_SRI`.
- Tests keep the pin and the hash in step: `@mcp-b/webmcp-polyfill` is now an exact devDependency, a unit test compares the hash with the npm package and with jsDelivr, and an e2e test shows a tampered file being refused.

### Changed
- A copy served by agentprose Cloud (a `/v/<version>/` folder, including the evergreen `/v/0/`) loads the polyfill from the same Cloud (`/v/<exact version>/webmcp-polyfill.js`, same hash) instead of jsDelivr, so the Cloud snippet needs one domain in a CSP.
- A core loaded through a moving channel (`agentprose@0` on jsDelivr, `/v/0/` on the Cloud) loads its engine, adapters, inspector and polyfill from its own exact version, so a cached core never pairs with a newer engine.
- Docs recommend `agentprose@0` (latest 0.x) instead of `agentprose@0.1`, and `https://agentprose.cloud/v/0/` for the Cloud. Pinning an exact version with SRI is documented as the advanced option ([docs/versioning.md](docs/versioning.md)).
- Size budget: core + engine raised from 16,384 B to 16,640 B gzipped (+256 B) for the hash and the version pinning. Core is 9,893 B gzipped (was 9,636 B); the engine is unchanged (6,744 B).

### Added
- Docs: what the polyfill is, when and from where it loads, the pinned version and hash, opting out, self-hosting and a CSP table ([docs/security.md](docs/security.md#the-mcp-b-polyfill)); [docs/versioning.md](docs/versioning.md).
- [RELEASING.md](RELEASING.md) and `scripts/purge-jsdelivr.mjs` (purges `@0` and `@0.1` for every file in `dist/`).

## [0.1.1] - 2026-10-18

### Changed
- The MCP-B WebMCP polyfill is on by default in the script-tag build. After the page's `load` event, if the page still has no WebMCP (no native `document.modelContext`, no `@mcp-b/global`, no legacy `navigator.modelContext`), agentprose loads `@mcp-b/webmcp-polyfill@6.0.3` from jsDelivr (was unpkg) and registers into it. `data-polyfill="off"` (or `false`) opts out; a URL self-hosts it; the 0.1.0 flag form still works. The npm `createAgentTools()` default is unchanged (off). A blocked or slow polyfill (CSP, offline, 10 s) settles as mode `none` without errors.
- Core bundle unchanged in size (9,636 B gzipped, was 9,637 B): the four script loaders are merged into one shared `addScript` helper.

### Added
- Tutorial: [your blog inside Claude Desktop/Cursor with agentprose + MCP-B](docs/tutorials/mcp-b-claude-desktop.md), and [examples/mcp-b-desktop](examples/mcp-b-desktop/) with an end-to-end check (official MCP SDK client → `@mcp-b/webmcp-local-relay` → headless Chromium page).
- WordPress plugin (`wordpress-plugin/`), prepared for WordPress.org: bundles the MCP-B polyfill locally (no CDN), opt-in agentprose Cloud disclosed under "External services", Plugin Check and PHPCS clean, plus WP adapter fixes for custom post types. It lives in this repository and is released separately as a WordPress plugin zip; it is not part of the npm package.
- Tests: 7 unit tests for polyfill loading; e2e for the default polyfill, opt-out, a blocked polyfill and a page that already has WebMCP.

### Fixed
- WordPress adapter: titles, excerpts, term and site names are decoded to plain text (WordPress renders `&#8217;`, `[&hellip;]`); several post types are merged into one date-ordered page of at most `limit`.

## [0.1.0] - 2026-10-18

### Changed
- Renamed from `readmcp` to `agentprose` before the first release: package, CLI, `window.AgentProse` global, `agentprose:*` events, `data-agentprose-*` attributes, `agentprose.json` index and the WordPress plugin slug. No `readmcp` package was ever published.

### Added
- agentprose Cloud hooks: `data-cloud` with `data-key` turns on hosted analytics (`/v1/collect`) and hosted search (`/v1/search`) in one attribute. `data-cloud` is optional when the script is served by the Cloud itself (its origin is used); it stays required on jsDelivr and unpkg, with a console warning when missing.
- Analytics beacon v2: `{v, key, tool, ok, ms, page, query?, n?, found?, post?, err?, sid}` (result count, citation verdict, post URL argument, short error code, random per-page-load id). Never sends post content or the quote text.
- `search_posts` with `searchEndpoint` falls back to the site's own search when the endpoint throws (network, CORS) or answers non-OK (e.g. 429 over quota).
- One-line script install (`agentprose.min.js`, 9.4 KB gzipped). Zero-config discovery from JSON-LD, OpenGraph, `<article>`, the prebuilt `agentprose.json`, RSS/Atom/JSON Feed, sitemap.xml (and indexes), llms.txt and Pagefind.
- Tools: `get_current_article`, `search_posts`, `list_posts`, `get_post`, `get_table_of_contents`, `get_section`, `get_related_posts`, `list_taxonomies`, `get_citation` (quote verification + text-fragment links), `get_site_info`; opt-in `get_subscribe_link`, `get_comments_link`, `navigate_to`.
- WebMCP registration on `document.modelContext` with `AbortSignal` and `exposedTo`; legacy `navigator.modelContext` fallback; opt-in MCP-B polyfill (`data-polyfill`).
- Lazily loaded site-wide engine (6.6 KB gzipped): BM25F search with prefix matching and accent folding, related posts, session cache.
- Adapters: WordPress (auto-detected), Ghost, Sanity, Contentful, Enonic XP (Guillotine), Strapi 5/4, Storyblok, generic/static. Proxy mode, and refusal of management credentials.
- `agentprose build` (static index with sharded Markdown and llms.txt) and `agentprose inspect` (agent-readiness report) CLI.
- 🔌 Inspector panel (`?agentprose-inspect`, `data-inspector`).
- WordPress plugin with a settings page.
- Analytics hooks: `onToolCall`, the `agentprose:call` event, `data-analytics` beacons.
- 87 unit tests, 12 end-to-end tests in headless Chromium against fixture sites (native WebMCP and the polyfill).
