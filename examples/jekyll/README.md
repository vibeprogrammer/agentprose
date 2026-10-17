# Jekyll

Add `{% include agentprose.html %}` to `_includes/head.html`. The `jekyll-feed` and `jekyll-seo-tag` plugins already provide the feed and JSON-LD that agentprose reads.

For a prebuilt index: `bundle exec jekyll build && npx agentprose build _site --base-url https://example.com/`.
