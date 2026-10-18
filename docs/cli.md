# CLI

```bash
npx agentprose --help
```

## `agentprose build <dir> --base-url <url>`

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
hugo && npx agentprose build public --base-url https://example.com/ --llms
```

It writes:

- `agentprose.json`: site info, plus one record per article (URL, title, summary, dates, authors, tags, categories, image, reading time, and a 1,500-character text excerpt for search).
- `agentprose/posts/<path>.md`: the full Markdown of each article, fetched only when an agent reads that post. This keeps the index small, about 2 KB per post instead of the whole body.
- `llms.txt` (with `--llms`, and only if none exists).

It uses the same extraction code as the browser. Pages count as articles when they have Article/BlogPosting JSON-LD, `og:type=article`, or a single dated `<article>`. Tag, category, pagination, 404 and redirect pages are skipped.

| Option | Meaning |
|---|---|
| `--out <dir>` | Write somewhere other than `<dir>` |
| `--include <regex>` / `--exclude <regex>` | Filter by URL path, e.g. `--include "^/(posts\|blog)/"` |
| `--all` | Index every page, not only articles (docs sites) |
| `--inline` | Put Markdown inside `agentprose.json` (small sites, one request) |
| `--content <selector>` | Article body selector |
| `--site <file.json>` | Site details to publish in `agentprose.json`: `name`, `description`, `lang`, `logo`, `links`, `agentNotes` and `contact` (see below) |

The script finds `/agentprose.json` on its own. If your site lives under a sub-path, add `data-base="https://example.com/blog/"` to the script tag. If the index is served somewhere else, add `<link rel="agentprose-index" href="/path/to/agentprose.json">` to your pages' `<head>`; with `--out`, the CLI prints the exact tag ([configuration.md](configuration.md#pointing-to-an-index-outside-the-site-root)).

### Notes for AI agents and contact details (`--site`)

```json
{
  "agentNotes": "Friendly, plain tone. Point newcomers to the beginner course. We don't give medical advice.",
  "contact": { "email": "hello@studio.example", "booking": "https://studio.example/book", "hours": "Mon–Fri 9–17 CET" },
  "links": { "about": "https://studio.example/about" }
}
```

```bash
npx agentprose build public --base-url https://studio.example/ --site agentprose.site.json
```

Only the fields above are copied. Text is cleaned the same way the browser cleans it (control characters removed, notes capped at 2,000 characters, links must be `http(s)`), and the CLI warns about every contact field it leaves out. Agents read the result through `get_site_info` and `get_contact_info` ([configuration.md](configuration.md#notes-for-ai-agents-and-contact-details)).

Add it to CI after your site build:

```yaml
- run: hugo --minify
- run: npx agentprose build public --base-url https://example.com/
```

## `agentprose inspect <url>`

```bash
npx agentprose inspect https://example.com/a-post/
```

```
✔ Article detected             "A post" (1840 words)
✔ Structured data (JSON-LD)    2 block(s)
✔ Published date               2026-10-12T09:00:00.000Z
✘ Author                       missing
✔ Feed                         https://example.com/index.xml
✔ Sitemap                      https://example.com/sitemap.xml
✘ llms.txt                     none found
✘ WebMCP tools on page         none (add the agentprose script tag)

Posts discoverable: 214 (via feed, sitemap)
Agent-readiness: 63/100
```

`--json` prints the same report as machine-readable JSON.
