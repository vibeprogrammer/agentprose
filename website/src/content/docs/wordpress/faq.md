---
title: "Plugin FAQ"
description: "Questions about the agentprose WordPress plugin: content, browsers, custom post types, themes, other WebMCP plugins, updates and safety."
---

### Does this send my content anywhere?

No. The tools run in the visitor's browser and read your own public REST API. Only if you connect agentprose Cloud (or your own endpoint) is a small usage message sent per tool call, and never content. See [Self-hosted or Cloud](../cloud/).

### Which browsers and agents support WebMCP?

WebMCP is a draft. Chrome supports it behind a flag and an origin trial, and some AI browsers and extensions support it or use the MCP-B polyfill, which the plugin bundles. Nothing changes for human visitors, so there is no downside to installing early. The dated details are on [Browser and agent support](../../support/).

### Does it work with custom post types and pages?

Yes. Add their REST bases (for example `posts,pages,docs`) under **Settings → agentprose → Post types**. The post type must have `show_in_rest` enabled.

### My theme's article body is not detected

Set **Content selector** to the CSS selector of the article body, for example `.entry-content`.

### Another plugin already registers a tool called `search_posts`

Set a **Tool name prefix** such as `blog_`; all tools become `blog_search_posts`, `blog_get_post` and so on.

### How is this different from WebMCP Bridge?

Both expose WordPress content to agents through WebMCP; they focus on different things. agentprose is read-only and built for reading and quoting: full posts as Markdown (paged, never truncated), sections and a table of contents, related posts, and `get_citation`, which verifies a quote and returns a highlight link. WebMCP Bridge covers actions and server-side access: WooCommerce, Contact Form 7, a PHP tool API and a remote MCP endpoint. They can run side by side with a tool prefix. The full comparison is in the [plugin reference](../../reference/wordpress-plugin/#agentprose-vs-webmcp-bridge).

### Can I use the Cloud without the plugin?

Yes: paste the [Cloud snippet](../../install/cloud/) into your theme instead. The plugin is the better choice on WordPress because it serves every file from your site and adds the settings page and admin inspector.

### Is it safe?

All tools are read-only and use only public data from your REST API, which any visitor can already read. Post content is marked as untrusted for the agent. The inspector is shown to administrators only, and the plugin loads nothing from CDNs.

### Where do I report a problem?

On [GitHub issues](https://github.com/webmaxru/agentprose/issues). Security issues: privately, as [SECURITY.md](https://github.com/webmaxru/agentprose/blob/main/SECURITY.md) describes.
