---
title: "agentprose Cloud snippet"
description: "Load agentprose from agentprose.cloud with your site key to add agent analytics, hosted search and owner notes managed from a dashboard."
---

[agentprose Cloud](https://agentprose.cloud) is the hosted companion to the open-source library. It serves the same `agentprose.min.js` and, with your site key, turns on:

- **agent analytics**: which agents came, which tools they called, what they searched for and what came up empty;
- **hosted search** over your whole site, built from `agentprose.json`, your feeds or your sitemap;
- **notes and contact details for agents**, edited in a dashboard instead of in code.

## The snippet

```html
<script src="https://agentprose.cloud/v/0/agentprose.min.js" data-key="pk_your_site_key" defer></script>
```

1. Sign up at [agentprose.cloud](https://agentprose.cloud/signup) and add your site. The Free plan covers one site, no card needed.
2. Copy your site's public key (`pk_…`) from the site's **Settings & install** tab. It is not a secret: it only works from the domains on the site's list, and it is meant to be published in your HTML.
3. Paste the tag into your site's `<head>`.
4. Open any page with `?agentprose-inspect` to see the tools, and watch the dashboard as agents arrive.

When the script is served by the Cloud, `data-cloud` is optional: the script's own origin is used.

## Already using jsDelivr?

Keep your tag and add two attributes. `data-cloud` is required when the script is not served by the Cloud (agentprose warns in the console if it is missing):

```html
<script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" defer
        data-cloud="https://agentprose.cloud" data-key="pk_your_site_key"></script>
```

`data-cloud-search="false"` keeps search local and sends analytics only.

## Versions on the Cloud

| URL | What you get |
|---|---|
| `/v/0/agentprose.min.js` | The Cloud's newest 0.x, cached for one hour (`stale-while-revalidate` up to a day), so fixes reach visitors within about an hour. |
| `/v/0.1.3/agentprose.min.js` | Exactly that version. Immutable, so a Subresource Integrity hash stays valid. |

From 0.1.2 on, a core loaded from `/v/0/` fetches its engine, adapters, inspector and the MCP-B polyfill from its own exact version folder, so everything comes from one domain and one version.

## Content Security Policy

Allow `https://agentprose.cloud` in `script-src`, and `'self' https://agentprose.cloud` in `connect-src` (hosted search and analytics).

## Learn more

- [Using agentprose with Cloud](../../guides/cloud/): what is sent, when, and how hosted search falls back
- [agentprose Cloud docs](https://agentprose.cloud/docs) and [pricing](https://agentprose.cloud/pricing)
