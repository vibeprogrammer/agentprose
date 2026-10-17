# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
