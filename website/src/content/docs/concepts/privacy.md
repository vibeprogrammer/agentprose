---
title: "Privacy and analytics"
description: "What agentprose sends, to whom and when. By default nothing at all; with analytics configured, tool names and timings, never content."
---

agentprose runs in the visitor's browser and reads what your site already serves publicly. **By default it sends nothing anywhere.** No cookies, no persistent visitor IDs, no third-party requests except the pinned [polyfill](../polyfill/) in browsers without WebMCP.

Human visitors are not affected at all: tools run only when an agent calls them.

## Requests agentprose makes

| When | Request | To |
|---|---|---|
| Page load | none | |
| After `load`, only where WebMCP is missing | the MCP-B polyfill | jsDelivr, the Cloud, your server, or nothing (`data-polyfill`) |
| First site-wide tool call | the engine file, then `agentprose.json` / feeds / sitemap / `llms.txt` | the script's own folder, then your own origin |
| Each tool call, if you configured analytics | one beacon | your endpoint or agentprose Cloud |
| First `get_site_info` / `get_contact_info`, with a Cloud key | `/v1/site?key=…` | agentprose Cloud |
| `search_posts`, with hosted search | `/v1/search` or your `searchEndpoint` | agentprose Cloud or your server |

## Analytics: opt-in, and never content

Three ways to see what agents do, all opt-in:

```js
// 1. An event on the page
document.addEventListener('agentprose:call', (e) => console.log(e.detail)); // { tool, ok, ms, page, args }
```

```js
// 2. A callback
window.AgentProseConfig = { onToolCall: (e) => navigator.sendBeacon('/stats/agent', JSON.stringify(e)) };
```

```html
<!-- 3. A beacon per tool call to your endpoint (or data-cloud + data-key for agentprose Cloud) -->
<script src="…/agentprose.min.js" data-analytics="https://stats.example.com/agent" defer></script>
```

The beacon (v2) carries `{v, key, tool, ok, ms, page, query?, n?, found?, post?, err?, sid}`: the tool name, whether it worked, its timing, the page, the search query for search tools (up to 200 characters), the result count, the citation verdict, the post URL argument, a short error code and a random id per page load. **It never carries post content or quote text**, and no personal data.

## agentprose Cloud

With a Cloud key, analytics go to agentprose Cloud, which stores them in Microsoft Azure's Norway East region. The `/v1/site` request for notes and contact details uses `credentials: same-origin`, so no cookies cross origins. See the Cloud's [privacy and data](https://agentprose.cloud/docs/privacy-and-data) page.
