---
title: "Custom tools and analytics"
description: "Add your own WebMCP tools next to agentprose's, rename or drop built-in ones, and see which tools agents call."
---

Options that need code (functions, your own tools) go in `window.AgentProseConfig`, set **before** the agentprose script tag. Functions can't go in `data-*` attributes.

```html
<meta charset="utf-8">
<title>Custom tools</title>
<script>
  // Read before agentprose starts. Functions are allowed here (not in data-* attributes).
  window.AgentProseConfig = {
    prefix: 'acme_',
    exclude: ['get_related_posts'],
    onToolCall: (e) => navigator.sendBeacon('/stats/agent', JSON.stringify(e)),
    tools: [
      {
        name: 'get_events',
        title: 'Upcoming events',
        description: 'Lists upcoming meetups and talks with dates, venues and registration links.',
        inputSchema: { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 20 } } },
        annotations: { readOnlyHint: true },
        execute: async ({ limit = 5 }) => (await fetch('/events.json').then((r) => r.json())).slice(0, limit),
      },
    ],
  };
  document.addEventListener('agentprose:ready', (e) => console.log('agent tools:', e.detail.tools.map((t) => t.name)));
</script>
<script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" defer></script>
```

## Your own tools

A tool is a WebMCP tool definition plus an `execute` function:

| Field | Meaning |
|---|---|
| `name` | Unique on the page (after `prefix`, which applies to your tools too) |
| `title`, `description` | What it does and when an agent should use it. Write for the agent. |
| `inputSchema` | A JSON Schema object for the input |
| `annotations` | Set `readOnlyHint: true` for tools that don't change anything |
| `execute(input)` | Returns any JSON-serialisable value; errors should be returned as `{ error, message }` |

Keep custom tools read-only where you can. Anything that changes state should say so in its name and description, the way the built-in `navigate_to` does.

With npm, pass the same objects in `createAgentTools({ tools: [...] })`.

## Rename, drop, prefix

- `prefix: 'acme_'` (`data-prefix`) prefixes every tool, built-in or yours.
- `exclude: ['get_related_posts']` (`data-exclude`) leaves built-in tools out.

## See what agents call

Three hooks, in increasing order of effort saved:

```js
// An event on the page, for anything already listening on document
document.addEventListener('agentprose:call', (e) => console.log(e.detail)); // { tool, ok, ms, page, args }

// A callback in the config
window.AgentProseConfig = { onToolCall: (e) => navigator.sendBeacon('/stats/agent', JSON.stringify(e)) };
```

```html
<!-- A beacon per tool call to your own endpoint -->
<script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" defer
        data-analytics="https://stats.example.com/agent"></script>
```

The beacon never contains post content; see [Privacy and analytics](../../concepts/privacy/). Searches that return nothing are the most useful signal: they are the posts you haven't written yet. [agentprose Cloud](../cloud/) turns this into a dashboard without building anything.

## The `window.AgentProse` global

The script tag exposes `window.AgentProse` with `version`, `instance` (`tools`, `call()`, `ready`, `destroy()`), `ready`, `create()` and `adapters`. The `agentprose:ready` event fires on `document` once tools are registered.
