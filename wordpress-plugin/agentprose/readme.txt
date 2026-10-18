=== agentprose ===
Contributors: maxious
Tags: ai, webmcp, mcp, ai-agents, llm
Requires at least: 6.3
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.1.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Let AI agents in the browser read, search and cite your posts through WebMCP. Read-only, runs in the visitor's browser, no account needed.

== Description ==

[WebMCP](https://webmachinelearning.github.io/webmcp/) is a W3C Community Group draft that lets a web page hand tools to the AI agent running in the visitor's browser. Instead of scraping your theme's HTML, the agent calls a tool and gets clean, structured content back.

agentprose registers a set of read-only tools for your content:

* `get_current_article`: the post being viewed, as clean Markdown with author, dates, tags and outline
* `search_posts`: full-text search through your site's REST API
* `list_posts`: newest posts, filterable by tag, category, author and date
* `get_post`: any post as Markdown, paged for long posts (never silently truncated)
* `get_section` and `get_table_of_contents`: read one section of a long post
* `get_citation`: checks a quote against the post and returns a link that scrolls to and highlights it (`#:~:text=`)
* `list_taxonomies`, `get_related_posts`, `get_site_info`, `get_subscribe_link`, `get_comments_link`
* `navigate_to` (optional): open another page of the site

How it works:

* The script loads deferred (about 9 KB gzipped) and does nothing until an agent calls a tool.
* The tools read this site's public WordPress REST API from the visitor's browser. No new endpoints, no database tables, no server load until an agent asks.
* Every tool is read-only and marks post content as untrusted, so agents treat it as data, not as instructions.
* In browsers without built-in WebMCP, the plugin loads the bundled [MCP-B](https://docs.mcp-b.ai/) WebMCP polyfill from your own site after the page has loaded, so agents that use it (for example the MCP-B browser extension) can see the tools. You can switch this off.
* Administrators get a small 🔌 inspector on the front end to list and try every tool.

The same library works on any site, not only WordPress (Ghost, Sanity, Contentful, Strapi, Storyblok, Enonic, static sites): see [the agentprose repository](https://github.com/vibeprogrammer/agentprose).

**Optional: agentprose Cloud.** Enter a site key from [agentprose Cloud](https://agentprose.cloud) to see which agents used which tools and what they searched for, and to answer agent searches from a hosted index. It is off by default; see "External services" below.

= Source code =

The JavaScript files in `js/` are the browser build of the [agentprose](https://www.npmjs.com/package/agentprose) npm release named in the changelog, unchanged. They are built from the TypeScript source at [github.com/vibeprogrammer/agentprose](https://github.com/vibeprogrammer/agentprose) (MIT licence); `npm ci && npm run build` rebuilds them, and `node wordpress-plugin/sync.mjs <version>` copies a release into the plugin. The bundled WebMCP polyfill in `js/vendor/` is [@mcp-b/webmcp-polyfill](https://github.com/WebMCP-org/npm-packages/tree/main/packages/webmcp-polyfill) 6.0.3 (MIT), unchanged.

== External services ==

This plugin connects to one external service, **agentprose Cloud** (https://agentprose.cloud), and only if the site owner enters a Cloud site key under Settings → agentprose. Without a key nothing is sent anywhere except requests from the visitor's browser to your own site's REST API.

When a site key is set:

* **Usage analytics.** Each time an AI agent calls one of the tools, the visitor's browser sends one message to `https://agentprose.cloud/v1/collect`: the site key, the tool name, whether it succeeded, how long it took, the page address, the search query (if any, up to 200 characters), the number of results, the post address the agent asked for, a short error text on failure, and a random identifier for that page load. Post content is never sent. Nothing is stored in the browser and no cookies are set. Nothing is sent on ordinary page views, only when an agent uses a tool.
* **Hosted search** (on by default when a key is set, can be switched off). When an agent calls `search_posts`, the query and site key are sent to `https://agentprose.cloud/v1/search`, which returns matching posts from the Cloud's index of your public pages. If the request fails, WordPress search is used.

Like any web request, these requests reveal the visitor's IP address to the service.

* Terms of service: https://agentprose.cloud/terms
* Privacy policy: https://agentprose.cloud/privacy

You can also send the same per-call message to an endpoint of your own instead ("Own analytics endpoint"); then that endpoint is the only place it goes.

The plugin does not load anything from CDNs: all scripts, including the WebMCP polyfill, are served from your site.

== Installation ==

1. Install from Plugins → Add New (search for "agentprose"), or upload the zip under Plugins → Add New → Upload Plugin.
2. Activate it. The tools are live on every front-end page.
3. Optional: Settings → agentprose to choose post types, a subscribe URL, a tool prefix, switch off the polyfill, or connect agentprose Cloud.
4. As an administrator, open any post and click 🔌 to list and run the tools.

== Frequently Asked Questions ==

= Does this send my content anywhere? =

No. The tools run in the visitor's browser and read your own public REST API. Only if you connect agentprose Cloud is a small usage message (never content) sent per tool call; see "External services".

= Which browsers and agents support WebMCP? =

WebMCP is a draft. Chrome supports it behind a flag and an origin trial, and some AI browsers and extensions support it or use the MCP-B polyfill, which the plugin bundles. Nothing changes for human visitors, so there is no downside to installing early.

= Does it work with custom post types and pages? =

Yes. Add their REST bases (for example `posts,pages,docs`) under Settings → agentprose. The post type must have `show_in_rest` enabled.

= My theme's article body is not detected =

Set "Content selector" to the CSS selector of the article body (for example `.entry-content`).

= Another plugin already registers a tool called search_posts =

Set a tool name prefix such as `blog_`; all tools become `blog_search_posts`, `blog_get_post` and so on.

= How is this different from WebMCP Bridge? =

Both expose WordPress content to agents through WebMCP; they focus on different things.

* **agentprose** is read-only and built for reading and quoting: full posts as Markdown (paged, never truncated), sections and a table of contents, related posts, and `get_citation`, which verifies a quote and returns a highlight link. It needs no extra REST endpoints, and the same library works on non-WordPress sites. It uses the current WebMCP API (`registerTool`) and bundles the MCP-B polyfill for browsers without it.
* **WebMCP Bridge** covers actions and server-side access: WooCommerce cart and coupon tools, Contact Form 7 submission, menus, a PHP API for custom tools, and a remote MCP endpoint plus an OpenAPI schema for desktop clients and Custom GPTs. Markdown output and llms.txt come from its companion plugin, Mescio for Agents.

If you run a shop or want a server-side MCP endpoint, WebMCP Bridge does that. If you publish articles and want agents to read and cite them accurately, use agentprose. They can run side by side; set a tool prefix to avoid duplicate names.

= How does the plugin get updates? =

Through normal WordPress plugin updates from WordPress.org. Each new version of the agentprose library ships as a new plugin version with the scripts included, and WordPress shows it under Dashboard → Updates. To get fixes without doing anything, turn on auto-updates for agentprose on the Plugins screen ("Enable auto-updates"). The plugin never downloads code from anywhere else.

= Is it safe? =

All tools are read-only and use only public data from your REST API: what any visitor can already read. Post content is marked as untrusted for the agent. The inspector is shown to administrators only.

== Screenshots ==

1. Settings → agentprose: post types, the WebMCP polyfill and the optional agentprose Cloud connection.
2. The 🔌 inspector on a post (administrators only), listing the tools an agent sees.

== Changelog ==

= 0.1.1 =
* Bundles [agentprose 0.1.1](https://github.com/vibeprogrammer/agentprose/blob/main/CHANGELOG.md) and the MCP-B WebMCP polyfill 6.0.3, served from your site.

= 0.1.0 =
* First release on WordPress.org: read-only WebMCP tools for posts, pages and custom post types; settings page; bundled MCP-B WebMCP polyfill (served locally, can be switched off); optional agentprose Cloud (analytics and hosted search).

== Upgrade Notice ==

= 0.1.1 =
Updates the bundled agentprose library to 0.1.1.

= 0.1.0 =
First release.
