'use client';
// Alternative to the script tag: the npm API with your own data source.
import { useEffect } from 'react';
import { createAgentTools } from 'readmcp';
import { defineAdapter } from 'readmcp/adapters/generic';

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
