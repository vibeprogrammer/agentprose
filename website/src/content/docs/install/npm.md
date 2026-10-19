---
title: "npm package"
description: "Install agentprose from npm and call createAgentTools() in apps with a bundler, with your own adapter, links and tools."
---

Use the npm package when your site is a JavaScript app with a bundler (React, Vue, Svelte, a Next.js app) or when you want to pass functions instead of attributes.

```bash
npm install agentprose
```

```ts
import { createAgentTools } from 'agentprose';

const tools = createAgentTools({
  links: { subscribe: '/newsletter', contact: '/contact' },
  contentSelector: '.post-body',
});

await tools.ready;          // { mode, registered, failed, … }
tools.destroy();            // unregisters every tool
```

`createAgentTools(config)` returns `{ tools, call(name, input), source, ready, destroy() }`. `call()` runs a tool exactly as an agent would, which is handy in tests:

```ts
const result = await tools.call('search_posts', { query: 'webmcp' });
```

## What the package exports

| Import | What |
|---|---|
| `agentprose` | `createAgentTools()`, the types, `buildTools`, `register`, `extractPage`, `toMarkdown`, `VERSION`, `POLYFILL_URL` |
| `agentprose/full` | Everything above plus the engine for Node and custom builds: `autoSource`, `SearchIndex`, `parseFeed`, `parseSitemap`, `parseLlmsTxt` |
| `agentprose/adapters/<name>` | CMS adapters: `wordpress`, `ghost`, `sanity`, `contentful`, `enonic`, `strapi`, `storyblok`, `generic` |
| `agentprose/agentprose.min.js` | The script-tag build, for self-hosting |

The generated [API reference](../../reference/api/) lists every export with its types.

## Differences from the script tag

- **The polyfill is off by default.** The npm API only loads the MCP-B polyfill when you pass `polyfill: true` (or a URL, or `{ src, integrity }`). The script tag loads it by default. See [The WebMCP polyfill](../../concepts/polyfill/).
- **The engine is bundled.** In the npm build the site-wide engine (search, feeds, sitemaps) is a plain static import, so your bundler decides how to split it. The script-tag build is the one that downloads it lazily, on the first site-wide call. `agentprose/full` also exports the engine's pieces for Node and custom builds.
- **Single-page apps.** Tools read `location` and the DOM when they run, so `get_current_article` follows client-side navigation without re-registering. Create the tools once, and call `destroy()` when the component that owns them unmounts.

## Example: React

```tsx
'use client';
import { useEffect } from 'react';
import { createAgentTools } from 'agentprose';

export function AgentTools() {
  useEffect(() => {
    const tools = createAgentTools({ links: { subscribe: '/newsletter' } });
    return () => tools.destroy();
  }, []);
  return null;
}
```

With your own data source, see [Next.js and React apps](../../guides/nextjs/).
