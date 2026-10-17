=== agentprose — Agent-readable content (WebMCP) ===
Contributors: agentprose
Tags: ai, agents, webmcp, mcp, llm
Requires at least: 6.3
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 0.1.0
License: MIT
License URI: https://opensource.org/licenses/MIT

Let AI agents in the browser read, search and cite your posts through WebMCP. Read-only. No account. No external requests.

== Description ==

WebMCP is a W3C Community Group draft that lets a web page give tools to the AI agent running in the visitor's browser. agentprose registers a set of read-only tools for your content:

* get_current_article — the post being viewed, as clean Markdown with author, dates, tags and outline
* search_posts — full-text search through the WordPress REST API
* list_posts — newest posts, filterable by tag, category, author and date
* get_post, get_section, get_table_of_contents — read a whole post or one section
* list_taxonomies, get_related_posts, get_citation, get_site_info

The script is about 9 KB gzipped, loads deferred, fetches nothing until an agent calls a tool, and does nothing in browsers without WebMCP.

== Installation ==

1. Upload the `agentprose` folder to `/wp-content/plugins/`, or install the zip from Plugins → Add New → Upload.
2. Activate it. Tools are live on every front-end page.
3. Optional: Settings → agentprose to set a subscribe URL, post types, a tool prefix or an analytics endpoint.
4. As an administrator, open any page: the 🔌 panel lists the tools and lets you run them.

== Frequently Asked Questions ==

= Does this send my content anywhere? =
No. Tools run in the visitor's browser and read your own public REST API. Analytics are off unless you enter an endpoint.

= Which browsers support WebMCP? =
Chrome behind chrome://flags/#enable-webmcp-testing and through an origin trial. Other browsers ignore the script.

== Changelog ==

= 0.1.0 =
* First release.
