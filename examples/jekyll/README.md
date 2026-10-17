# Jekyll

Add `{% include readmcp.html %}` to `_includes/head.html`. The `jekyll-feed` and `jekyll-seo-tag` plugins already provide the feed and JSON-LD that readmcp reads.

For a prebuilt index: `bundle exec jekyll build && npx readmcp build _site --base-url https://example.com/`.
