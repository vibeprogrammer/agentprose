# Ghost

Settings → Code injection → Site header:

```html
<script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" defer
        data-adapter="ghost" data-key="YOUR_CONTENT_API_KEY"></script>
```

Create the key in Settings → Integrations → Add custom integration → **Content API key**. Ghost documents this key as safe in browsers. Never paste the Admin API key; agentprose refuses it. Without `data-adapter`, agentprose still works from Ghost's `/rss/` feed and `sitemap.xml`.
