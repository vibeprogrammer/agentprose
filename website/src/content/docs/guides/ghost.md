---
title: "Ghost"
description: "Add agentprose to a Ghost site with code injection and the Content API key, so agents get full posts, tags and authors from Ghost."
---

In Ghost Admin, go to **Settings → Code injection → Site header** and paste:

```html
<script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" defer
        data-adapter="ghost" data-key="YOUR_CONTENT_API_KEY"></script>
```

Create the key in **Settings → Integrations → Add custom integration → Content API key**. Ghost documents this key as safe in browsers.

:::caution
Never paste the **Admin** API key (it looks like `id:secret`). agentprose refuses it and the adapter throws instead of running.
:::

If your Ghost API lives on a different URL than the site, add `data-api="https://your-ghost.example"`.

## Without the adapter

Ghost publishes `/rss/` and `sitemap.xml`, so agentprose works without `data-adapter` too, using [auto-discovery](../../concepts/discovery/). The adapter is better: full posts, tags and authors come straight from the Content API, and search runs over the client-side index.

## With agentprose Cloud

With a CMS adapter, `data-key` is the adapter's key, so the Cloud is not switched on by `data-key` and `data-cloud` (agentprose never mixes the two). Send analytics to the Cloud with the explicit attributes instead, the same way the WordPress plugin does:

```html
<script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" defer
        data-adapter="ghost" data-key="YOUR_CONTENT_API_KEY"
        data-analytics="https://agentprose.cloud/v1/collect" data-analytics-key="pk_your_site_key"></script>
```

Or drop the adapter and use the plain [Cloud snippet](../../install/cloud/): Ghost's feed and sitemap are enough for discovery, and the Cloud adds hosted search.
