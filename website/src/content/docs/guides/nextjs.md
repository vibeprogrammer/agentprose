---
title: "Next.js and React apps"
description: "Add agentprose to a Next.js App Router site with next/script, or use the npm API with an adapter that calls your own API routes."
---

## Static export

With `output: 'export'`, add the script in `app/layout.tsx`, then index the exported site:

```tsx
// app/layout.tsx
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" strategy="afterInteractive" data-subscribe="/newsletter" />
      </body>
    </html>
  );
}
```

```bash
next build && npx agentprose build out --base-url https://example.com/
```

## Dynamic sites: the npm API with your own source

When posts come from your API, give agentprose an adapter that calls it, and create the tools once on the client:

```tsx
// components/AgentTools.tsx
'use client';
import { useEffect } from 'react';
import { createAgentTools } from 'agentprose';
import { defineAdapter } from 'agentprose/adapters/generic';

const api = defineAdapter({
  name: 'next-api',
  list: async ({ limit = 20, offset = 0 } = {}) => fetch(`/api/posts?limit=${limit}&offset=${offset}`).then((r) => r.json()),
  get: async ({ slug, url }) => fetch(`/api/posts/${slug ?? url?.split('/').filter(Boolean).pop()}`).then((r) => (r.ok ? r.json() : null)),
});

export function AgentTools() {
  useEffect(() => {
    const tools = createAgentTools({ adapter: api, links: { subscribe: '/newsletter' } });
    return () => tools.destroy(); // unregisters on unmount
  }, []);
  return null;
}
```

Render `<AgentTools />` once in your root layout. Tools read `location` and the DOM when they run, so `get_current_article` follows client-side navigation without re-registering.

`list` must return `{ items, total? }` with at least `url` and `title` per item; `get` returns a post with `markdown` or `html`. See [Adapters](../../concepts/adapters/#your-own-adapter).

## Vue, Svelte and others

The same pattern works anywhere: call `createAgentTools()` once when the app mounts on the client, and `destroy()` when it unmounts. Don't call it during server-side rendering (it needs `document`); pass `register: false` if you want to build the tools without registering them, for example in tests.
