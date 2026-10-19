---
title: "Large archives: build an index"
description: "Use agentprose build to generate agentprose.json, per-post Markdown and llms.txt from your built site, for big archives and full-text search."
---

Feed and sitemap discovery handles a few thousand posts well, but feeds usually carry only excerpts and the latest items. For a large archive, or search over full text, generate an index when you build the site:

```bash
npx agentprose build public --base-url https://example.com/ --llms
```

It writes, next to your site:

- **`agentprose.json`**: site info and one record per article (URL, title, summary, dates, authors, tags, categories, image, reading time, and a 1,500-character excerpt for search);
- **`agentprose/posts/<path>.md`**: the full Markdown of each article, fetched only when an agent reads that post, so the index stays around 2 KB per post;
- **`llms.txt`** (with `--llms`, and only if you don't have one).

The script finds `/agentprose.json` on its own, and then skips feeds and sitemaps. It uses the same extraction code as the browser: pages count as articles when they have Article/BlogPosting JSON-LD, `og:type=article`, or a single dated `<article>`.

## Useful options

| Option | Use it for |
|---|---|
| `--include "^/(posts\|blog)/"`, `--exclude <regex>` | Index only part of the site |
| `--all` | Index every page, not only articles (docs sites) |
| `--inline` | Put the Markdown inside `agentprose.json` (small sites, one request) |
| `--content <selector>` | The article body selector |
| `--site <file.json>` | Publish [notes and contact details for agents](../../concepts/notes-and-contact/) |
| `--out <dir>` | Write somewhere else (the CLI prints the `<link rel="agentprose-index">` tag to add) |

## In CI

Run it right after your generator, before deploying:

```yaml
- run: hugo --minify
- run: npx agentprose build public --base-url "${{ vars.SITE_URL }}" --llms
```

This documentation site does the same: its Pages workflow runs `agentprose build dist --all` after the Astro build.

## Check the result

```bash
npx agentprose inspect https://example.com/a-post/
```

reports whether an article is detected, the feed, sitemap and `llms.txt`, how many posts are discoverable and an agent-readiness score. All options: the [CLI reference](../../reference/cli/).
