# WordPress

agentprose works on WordPress in two ways:

- **The plugin** (`wordpress-plugin/agentprose`, on its way to wordpress.org): install, activate, done. It serves the script from your own site, adds a settings page (post types, content selector, tool prefix, subscribe link, the bundled MCP-B WebMCP polyfill, and an optional agentprose Cloud site key), and shows administrators a 🔌 tool inspector on the front end.
- **The script tag**: any WordPress site works with the one-line snippet too. agentprose sees `<link rel="https://api.w.org/">` and switches to the REST API on its own (see [adapters](adapters.md#wordpress)).

Both register the same read-only tools, backed by the core REST API (`/wp/v2/posts`, `search`, `tags`, `categories`, `users`). Nothing is added on the server: no endpoints, no tables, no cron. Requests start only when an agent calls a tool.

## Plugin settings

| Setting | `data-*` attribute | Default |
|---|---|---|
| Enabled | (script enqueued) | on |
| Post types (REST bases) | `data-types` | `posts` |
| Content selector | `data-content` | auto |
| Tool name prefix | `data-prefix` | none |
| Subscribe URL | `data-subscribe` | none |
| Navigation tool | `data-navigate` | off |
| WebMCP polyfill (bundled, local file) | `data-polyfill="<plugin url>/js/vendor/webmcp-polyfill.iife.js"` or `"false"` | on |
| Cloud site key | `data-analytics=https://agentprose.cloud/v1/collect`, `data-analytics-key`, `data-search-endpoint` | none |
| Hosted search (with a key) | `data-search-endpoint` | on |
| Own analytics endpoint | `data-analytics` | none |
| Inspector (admins only) | `data-inspector` | on |

Filters: `agentprose_script_attributes` (array of attributes) and `agentprose_cloud_url` (for a self-hosted Cloud). The constant `AGENTPROSE_CLOUD_URL` does the same as the second.

The plugin never loads code from a CDN. The library's default polyfill URL (`POLYFILL_URL`, jsDelivr) is not used by the plugin: it always sets `data-polyfill` to its own copy of the same pinned build, or to `false`.

## agentprose vs WebMCP Bridge

[WebMCP Bridge](https://wordpress.org/plugins/webmcp-bridge/) (by Mescio, 600+ active installs, v1.9.3 updated 2026-09-25) is the established WebMCP plugin on wordpress.org. Read from its wp.org page and its 1.9.3 source on 2026-10-18:

| | agentprose | WebMCP Bridge 1.9.3 |
|---|---|---|
| Focus | Reading and citing content, read-only | Actions and server access: WooCommerce, forms, remote MCP |
| How tools run | In the visitor's browser, against the core REST API | PHP tool registry with its own REST routes, plus a JS bridge |
| WebMCP API | `modelContext.registerTool` (current draft), MCP-B polyfill bundled | `navigator.modelContext.provideContext()`, legacy `window.ai.tools`, fallback `window.webmcpBridgeTools` |
| Content tools | `get_current_article`, `search_posts`, `list_posts`, `get_post`, `get_section`, `get_table_of_contents`, `get_citation`, `get_related_posts`, `list_taxonomies`, `get_site_info`, `get_subscribe_link`, `get_comments_link`, optional `navigate_to` | `search_posts`, `get_post`, `get_menu`, `get_categories`, `get_site_info`; `retrieve`, `get_markdown_content`, `get_llms_txt` with the companion plugin Mescio for Agents |
| Post format | Markdown with outline; sections; paged, never truncated | `get_post` returns plain text (tags stripped); Markdown needs Mescio for Agents |
| Citations | `get_citation`: checks a quote against the post, returns a `#:~:text=` highlight link and a formatted citation | None |
| Write tools | None by design | WooCommerce (search, cart, coupons, checkout fields), Contact Form 7 submission |
| Server-side MCP | No (in-page). agentprose Cloud adds hosted search | Remote MCP endpoint (Streamable HTTP, optional API key / OAuth) and an OpenAPI schema for Custom GPT Actions |
| Custom tools | JavaScript (`AgentProse.create`, `createAgentTools`) | PHP registry API |
| Untrusted content | `untrustedContentHint` on every tool | Sanitizes Markdown and flags instruction-like text |
| Agent analytics | Optional (agentprose Cloud or your own endpoint) | None ("no telemetry") |
| Beyond WordPress | Same library on Ghost, Sanity, Contentful, Strapi, Storyblok, Enonic and static sites | WordPress only |
| Requires | WP 6.3, PHP 7.4 | WP 6.0, PHP 8.0 |
| Tested up to | 7.1 | 6.9 (Plugin Check flags it as below the current 7.1) |

In short: WebMCP Bridge is the better pick for a shop or for a server-side MCP endpoint. agentprose is the better pick for publishers who want agents to read whole articles and quote them correctly, and for anyone who wants agent analytics. They can run side by side; set a tool prefix in agentprose to avoid duplicate `search_posts` / `get_post` names.
