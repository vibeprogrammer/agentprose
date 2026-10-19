---
title: "Self-hosted or Cloud"
description: "Run the agentprose WordPress plugin entirely on your own site, send analytics to your own endpoint, or connect agentprose Cloud with a site key."
---

The plugin has three modes. You pick one on **Settings → agentprose**; the default is the first.

| | Self-hosted (default) | Own analytics endpoint | agentprose Cloud |
|---|---|---|---|
| Set up | nothing | **Own analytics endpoint** URL | **Site key** (`pk_…`) |
| Tools for agents | ✅ all | ✅ all | ✅ all, plus `get_contact_info` from your Cloud notes |
| Search | WordPress REST search | WordPress REST search | hosted full-text search, falling back to WordPress search |
| Analytics | none | one beacon per tool call to your URL | dashboard at agentprose.cloud |
| External requests | none | to your endpoint | to `https://agentprose.cloud` |

## Self-hosted

Every file (the agentprose script, its engine, and the WebMCP polyfill) is served from your site, and the tools only call your own REST API from the visitor's browser. Nothing leaves your site.

## Own analytics endpoint

Each time an agent calls a tool, the browser sends one message to your URL with `navigator.sendBeacon`: tool name, outcome, timing, page address, search query (up to 200 characters), result count, the post address asked for, a short error code and a random per-page-load id. **Never post content.** Ignored when a Cloud site key is set. The message format is in the [configuration reference](../../reference/configuration/) (`data-analytics`).

## agentprose Cloud

[agentprose Cloud](https://agentprose.cloud) is the hosted companion by the same maintainers. Create a site there (the Free plan covers one site), copy its public key, and paste it into **Site key**. The plugin then:

- sends the same per-call message to `https://agentprose.cloud/v1/collect`, so you see which agents came, what they read, and what they searched for and didn't find;
- answers `search_posts` from the Cloud's index of your public pages (`/v1/search`), unless you untick **Hosted search**; if that request fails, WordPress search is used;
- lets agents read the notes and contact details you enter in the Cloud dashboard through `get_contact_info` and `get_site_info`, fetched only when an agent asks, never on page load.

Even with a key, the scripts themselves are still served from your site: only those requests go to the Cloud. Like any web request, they reveal the visitor's IP address to the Cloud; see the Cloud's [privacy policy](https://agentprose.cloud/privacy) and [terms](https://agentprose.cloud/terms).

:::note
The site key is public by design: it only works from the domains on the site's list in the Cloud, and it appears in your page's HTML. It is not a password.
:::
