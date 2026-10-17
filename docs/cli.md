# CLI

```bash
npx readmcp --help
```

## `readmcp build <dir> --base-url <url>`

Indexes the HTML output of any static site generator:

| Generator | Output folder |
|---|---|
| Hugo | `public/` |
| Jekyll | `_site/` |
| Astro | `dist/` |
| Eleventy | `_site/` |
| Next.js (`output: 'export'`) | `out/` |
| Gatsby | `public/` |
| Docusaurus | `build/` |

```bash
hugo && npx readmcp build public --base-url https://example.com/ --llms
```

It writes:

- `readmcp.json`: site info, plus one record per article (URL, title, summary, dates, authors, tags, categories, image, reading time, and a 1,500-character text excerpt for search).
- `readmcp/posts/<path>.md`: the full Markdown of each article, fetched only when an agent reads that post. This keeps the index small, about 2 KB per post instead of the whole body.
- `llms.txt` (with `--llms`, and only if none exists).

It uses the same extraction code as the browser. Pages count as articles when they have Article/BlogPosting JSON-LD, `og:type=article`, or a single dated `<article>`. Tag, category, pagination, 404 and redirect pages are skipped.

| Option | Meaning |
|---|---|
| `--out <dir>` | Write somewhere other than `<dir>` |
| `--include <regex>` / `--exclude <regex>` | Filter by URL path, e.g. `--include "^/(posts\|blog)/"` |
| `--all` | Index every page, not only articles (docs sites) |
| `--inline` | Put Markdown inside `readmcp.json` (small sites, one request) |
| `--content <selector>` | Article body selector |

The script finds `/readmcp.json` on its own. If your site lives under a sub-path, add `data-base="https://example.com/blog/"` to the script tag.

Add it to CI after your site build:

```yaml
- run: hugo --minify
- run: npx readmcp build public --base-url https://example.com/
```

## `readmcp inspect <url>`

```bash
npx readmcp inspect https://example.com/a-post/
```

```
✔ Article detected             "A post" (1840 words)
✔ Structured data (JSON-LD)    2 block(s)
✔ Published date               2026-10-12T09:00:00.000Z
✘ Author                       missing
✔ Feed                         https://example.com/index.xml
✔ Sitemap                      https://example.com/sitemap.xml
✘ llms.txt                     none found
✘ WebMCP tools on page         none (add the readmcp script tag)

Posts discoverable: 214 (via feed, sitemap)
Agent-readiness: 63/100
```

`--json` prints the same report as machine-readable JSON.
