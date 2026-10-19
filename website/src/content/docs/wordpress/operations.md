---
title: "Caching, CSP and uninstall"
description: "Running the agentprose WordPress plugin alongside caches, optimisers, security plugins and a Content Security Policy, plus privacy text, updates and what uninstalling removes."
---

## Page caches and optimisers

The plugin's script is a normal deferred file enqueued with `wp_enqueue_script`, and its settings are in the tag itself, so full-page caches (WP Super Cache, W3 Total Cache, LiteSpeed, a CDN) work as-is. Two things to watch:

- **Script combining and minifying.** The core loads its engine, inspector and polyfill from **its own folder**, and reads its settings from its own `data-*` attributes. Exclude `agentprose` (the `wp-content/plugins/agentprose/js/` files) from "combine JS" and "minify JS", or it may lose both.
- **"Delay JavaScript until interaction".** Agents don't scroll or click, so a delayed script means no tools. Exclude `agentprose.min.js` from delay lists. It is already deferred and doesn't block rendering.

After changing plugin settings, purge the page cache so cached pages get the new attributes.

## Content Security Policy

Everything the plugin loads comes from your own site, so `script-src 'self'` covers it, and the tools call your REST API, covered by `connect-src 'self'`. With a Cloud site key, add `https://agentprose.cloud` to `connect-src` (analytics, hosted search, notes). No `unsafe-eval` or `unsafe-inline` is needed.

## Security plugins and the REST API

The site-wide tools read `/wp-json/wp/v2/…` anonymously. If a security plugin blocks anonymous REST access, agents can still read the current post (`get_current_article`, sections, outline) but search and lists will fail. Allow public `GET` access to the post types you expose, or accept the reduced tool set. Custom post types need `show_in_rest`.

## Privacy

The plugin adds suggested text to **Settings → Privacy → Policy guide**: it sets no cookies and stores nothing in the browser; with agentprose Cloud connected, each tool call sends the tool name, outcome, timing, page address, search query, result count and a random per-page-load id, never post content. Without a Cloud key or analytics endpoint, nothing is sent to anyone but your own site. Details: [Self-hosted or Cloud](../cloud/).

## Updates

Each agentprose library release ships as a new plugin version with the scripts included (plugin 0.1.3 bundles agentprose 0.1.3). Once the plugin is on wordpress.org, WordPress offers it under **Dashboard → Updates**; turn on **Enable auto-updates** on the Plugins screen to get fixes without doing anything. The plugin never downloads code from anywhere else. Until then, install a newer zip over the old one (**Upload Plugin** offers to replace it).

## Deactivate and uninstall

- **Deactivate:** the script tag disappears from your pages immediately. Settings are kept.
- **Delete:** WordPress runs the plugin's uninstall routine, which deletes its single option (`agentprose`). The plugin creates no tables, files, cron jobs or user meta, so nothing else is left behind.
- **agentprose Cloud data** (if you connected it) lives in your Cloud account; delete the site or the account there.
