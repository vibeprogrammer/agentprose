# Hugo

1. Copy `layouts/partials/agentprose.html` into your site and call it from your head partial:

```go-html-template
{{ partial "agentprose.html" . }}
```

2. Optional, for large archives or full-text search: index the built site in CI.

```yaml
# .github/workflows/deploy.yml (excerpt)
- run: hugo --minify
- run: npx agentprose build public --base-url "${{ vars.SITE_URL }}" --llms
```

Hugo themes usually emit `og:type=article`, JSON-LD and `/index.xml`, which agentprose reads without configuration.
