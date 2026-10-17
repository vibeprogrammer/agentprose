# Eleventy

In `_includes/base.njk`:

```html
<script src="https://cdn.jsdelivr.net/npm/readmcp@0.1/dist/readmcp.min.js" defer></script>
```

In `package.json`:

```json
{ "scripts": { "build": "eleventy", "postbuild": "readmcp build _site --base-url https://example.com/ --llms" } }
```
