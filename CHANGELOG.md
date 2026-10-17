# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-10-17

### Added
- One-line script install (`readmcp.min.js`, 9.1 KB gzipped). Zero-config discovery from JSON-LD, OpenGraph, `<article>`, the prebuilt `readmcp.json`, RSS/Atom/JSON Feed, sitemap.xml (and indexes), llms.txt and Pagefind.
- Tools: `get_current_article`, `search_posts`, `list_posts`, `get_post`, `get_table_of_contents`, `get_section`, `get_related_posts`, `list_taxonomies`, `get_citation` (quote verification + text-fragment links), `get_site_info`; opt-in `get_subscribe_link`, `get_comments_link`, `navigate_to`.
- WebMCP registration on `document.modelContext` with `AbortSignal` and `exposedTo`; legacy `navigator.modelContext` fallback; opt-in MCP-B polyfill (`data-polyfill`).
- Lazily loaded site-wide engine (6.6 KB gzipped): BM25F search with prefix matching and accent folding, related posts, session cache.
- Adapters: WordPress (auto-detected), Ghost, Sanity, Contentful, Enonic XP (Guillotine), Strapi 5/4, Storyblok, generic/static. Proxy mode, and refusal of management credentials.
- `readmcp build` (static index with sharded Markdown and llms.txt) and `readmcp inspect` (agent-readiness report) CLI.
- 🔌 Inspector panel (`?readmcp-inspect`, `data-inspector`).
- WordPress plugin with a settings page.
- Analytics hooks: `onToolCall`, the `readmcp:call` event, `data-analytics` beacons.
- 76 unit tests, 12 end-to-end tests in headless Chromium against fixture sites (native WebMCP and the polyfill).
