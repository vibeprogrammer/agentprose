---
title: "Using agentprose with Cloud"
description: "What agentprose Cloud adds to the open-source library (agent analytics, hosted search, notes from a dashboard), how to connect it, and what stays free."
---

[agentprose Cloud](https://agentprose.cloud) is the hosted companion to the open-source library, built by the same maintainers. The library makes your site readable by agents; the Cloud shows you what those agents do with it.

## What it adds

| | Open-source library | With agentprose Cloud |
|---|---|---|
| Tools for agents | ✅ every tool | ✅ the same script |
| Analytics | your callback or endpoint | a dashboard: which agents came, which tools, latency, zero-result searches, verified citations |
| Search | in the browser (index, feeds, Pagefind) | hosted search over your whole site, with in-browser fallback |
| Notes and contact for agents | in code or `agentprose.json` | edited in the dashboard, no deploy |
| Index freshness | rebuild your site | crawls, CMS webhooks and an upload API |

The Free plan covers one site, no card needed; paid plans add sites, seats, volume and history. See [pricing](https://agentprose.cloud/pricing).

## Connect a site

1. Sign up at [agentprose.cloud](https://agentprose.cloud/signup) and add your site's address.
2. Copy the public site key (`pk_…`) from **Settings & install**. It only works from the domains on the site's list and is safe to publish.
3. Use the Cloud snippet:

   ```html
   <script src="https://agentprose.cloud/v/0/agentprose.min.js" data-key="pk_your_site_key" defer></script>
   ```

   or keep jsDelivr and add `data-cloud="https://agentprose.cloud" data-key="pk_…"`. WordPress: paste the key in the plugin's settings.
4. Open a page with `?agentprose-inspect` and run a tool; the call shows up in the dashboard within seconds.

The Cloud builds its search index from `agentprose.json`, then your feed, then your sitemap. If it reports "no posts found", a feed or one line of structured data usually fixes it; see the Cloud's [content discovery](https://agentprose.cloud/docs/content-discovery) page.

## What is sent, and when

- **Nothing on page load.** Human visitors trigger no Cloud requests at all.
- **One analytics beacon per tool call** to `/v1/collect`: tool name, timing, page, search query (for search tools), result count, citation verdict. Never post content. Details: [Privacy and analytics](../../concepts/privacy/).
- **Hosted search** at `/v1/search` when an agent searches. If it fails or the plan's quota is used up, `search_posts` falls back to the site's own in-browser search. `data-cloud-search="false"` keeps search local.
- **Notes and contact** from `/v1/site`, once, the first time an agent asks for them.

## With a CMS adapter

`data-key` belongs to the adapter when `data-adapter` is set, so the Cloud isn't inferred. Use `data-analytics="https://agentprose.cloud/v1/collect"` with `data-analytics-key="pk_…"`; the [Ghost guide](../ghost/#with-agentprose-cloud) shows the full tag.

## What stays free

The core, every tool, the CLI, all adapters and the WordPress plugin are MIT licensed and stay that way. The Cloud's hooks (`onToolCall`, `data-analytics`, `searchEndpoint`, `index`) are documented open seams: you can point them at your own services instead.
