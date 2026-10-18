# Eleventy

In `_includes/base.njk`:

```html
<script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" defer></script>
```

In `package.json`:

```json
{ "scripts": { "build": "eleventy", "postbuild": "agentprose build _site --base-url https://example.com/ --llms" } }
```
