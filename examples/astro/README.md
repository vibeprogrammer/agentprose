# Astro

Use `BaseLayout.astro`. `is:inline` keeps Astro from bundling the CDN script. If the site uses Pagefind (Starlight does), agentprose detects it and uses it for `search_posts`.

Postbuild index: add `"postbuild": "agentprose build dist --base-url https://example.com/"` to package.json.
