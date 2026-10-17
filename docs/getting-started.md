# Getting started

## 1. Add the script

Put this in your site's `<head>` (or before `</body>`):

```html
<script src="https://cdn.jsdelivr.net/npm/agentprose@0.1/dist/agentprose.min.js" defer></script>
```

Pin a version in production (`agentprose@0.1.0`). To self-host, copy `agentprose.min.js`, `agentprose.index.min.js`, `agentprose.inspector.min.js` and the `adapters/` folder from `node_modules/agentprose/dist/` into one directory. The core loads its other files from the directory it was served from.

Where to put it:

| Generator | File |
|---|---|
| Hugo | `layouts/partials/head.html` (or your theme's head partial). See [examples/hugo](../examples/hugo). |
| Jekyll | `_includes/head.html`. See [examples/jekyll](../examples/jekyll). |
| Astro | Your base layout's `<head>`. See [examples/astro](../examples/astro). |
| Eleventy | Your base layout. See [examples/eleventy](../examples/eleventy). |
| Next.js | `<Script strategy="afterInteractive">` in `app/layout.tsx`. See [examples/nextjs](../examples/nextjs). |
| WordPress | Install the [plugin](../wordpress-plugin/). |
| Ghost | Settings → Code injection → Site header. See [examples/ghost](../examples/ghost). |

## 2. Check what agents see

Open any page with `?agentprose-inspect` added to the URL. The 🔌 panel lists every tool. Fill in the inputs and press **Run**. The panel works in every browser: with native WebMCP it calls `document.modelContext.executeTool()`, otherwise it calls agentprose directly.

From a terminal:

```bash
npx agentprose inspect https://example.com/a-post/
```

## 3. Try it with a real agent

1. In Chrome, enable `chrome://flags/#enable-webmcp-testing` and restart.
2. Open your site. In DevTools:

```js
const tools = await document.modelContext.getTools();
tools.map((t) => t.name);
await document.modelContext.executeTool(tools.find((t) => t.name === 'search_posts'), { query: 'pricing' });
```

Agents that support WebMCP see the same tools.

## 4. Optional: big archives

The feed + sitemap discovery handles a few thousand posts well. For bigger sites, or for search over full text instead of feed excerpts, generate an index at build time:

```bash
npx agentprose build public --base-url https://example.com/
```

Deploy the generated `agentprose.json` and `agentprose/` folder with the site. See [cli.md](cli.md).
