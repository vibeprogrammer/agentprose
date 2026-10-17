# Next.js

- **Static export** (`output: 'export'`): add the script in `app/layout.tsx`, then run `next build && agentprose build out --base-url https://example.com/`.
- **Dynamic sites**: use `components/AgentTools.tsx` with an adapter that calls your API routes. `destroy()` on unmount keeps tools in sync with client-side navigation.
