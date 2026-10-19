---
title: "Why agentprose"
description: "AI agents read your site whether you plan for it or not. agentprose gives them proper tools, so they quote you correctly and link back."
---

People increasingly ask an AI assistant instead of clicking through search results. When that assistant lands on your blog, it has two options: scrape your theme's HTML and guess, or call tools your page offers it.

**agentprose** gives every page of your site those tools, through [WebMCP](../webmcp/), the browser standard for handing tools to AI agents. One script tag, no configuration, no server changes.

```html
<script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" defer></script>
```

## What agents get

With agentprose on the page, an agent can:

- **read the post the user is looking at** as clean Markdown, with title, author, dates, tags and section outline (`get_current_article`);
- **search the whole site** and list posts by tag, category, author or date (`search_posts`, `list_posts`, `list_taxonomies`);
- **read any post in full**, paged instead of truncated, or just one section of it (`get_post`, `get_table_of_contents`, `get_section`);
- **cite you properly**: `get_citation` checks that a quote really appears in the post and returns a link that scrolls to and highlights it;
- **learn about the site**, including notes you write for agents and how to contact or book you (`get_site_info`, `get_contact_info`).

The full list, with input schemas, is in the [tool reference](../reference/tools/).

## Why not just let them scrape?

| Scraping your HTML | Calling agentprose tools |
|---|---|
| Navigation, cookie banners, newsletter boxes and comments mixed into the "article" | The article body only, as Markdown, with headings, lists, tables and code intact |
| Long posts cut off at the agent's context limit, silently | Paged with `next_offset`; nothing is dropped |
| Only the page that is open | Search, lists and related posts across the whole site |
| Quotes that may or may not be in the post | Quotes verified against the post, with a deep link |
| No idea how you want to be represented | Your own notes for agents and contact details |

## What it is not

- **Not a write API.** Every built-in tool is read-only. The one tool that does something, `navigate_to`, is opt-in and same-origin only.
- **Not a server.** Tools run in the visitor's browser and read what your site already serves publicly. Nothing is added to your backend.
- **Not tracking.** Nothing is sent anywhere unless you configure analytics, and then never post content. See [Privacy and analytics](../concepts/privacy/).
- **Not a heavy dependency.** The core is about 10 KB gzipped, deferred, and doesn't touch layout. The site-wide engine (6.6 KB) loads only when an agent first searches or lists posts.

## Open source, with a hosted option

agentprose is MIT licensed: the core, every tool, the CLI, all adapters and the WordPress plugin. [agentprose Cloud](https://agentprose.cloud) is the optional hosted companion: it serves the same script and adds agent analytics, hosted search and a dashboard for your notes to agents. See [Using agentprose Cloud](../guides/cloud/).

## Next

- [What is WebMCP?](../webmcp/)
- [Quick start](../getting-started/)
