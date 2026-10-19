---
title: "Auto-discovery"
description: "How agentprose finds your content with no configuration: the page itself, agentprose.json, feeds, sitemaps, llms.txt and Pagefind."
---

agentprose's first design rule is **the page is the API**: use what sites already publish before asking for configuration. There are two levels.

## The current page

`get_current_article`, `get_table_of_contents` and `get_section` read the page the visitor has open and need no network at all. agentprose looks at:

- **JSON-LD** (`Article`, `BlogPosting` and friends), **OpenGraph** and `<meta>` tags for title, authors, dates, tags, summary and image;
- the **article body**: `<article>`, common content containers, or your `data-content` selector, minus navigation, `aria-hidden`, `[hidden]`, scripts, styles and anything in `data-ignore`;
- the **headings**, which become the section outline.

A page counts as an article when it has Article/BlogPosting JSON-LD, `og:type=article`, or a single dated `<article>`.

## The whole site

Site-wide tools (search, lists, related posts, citations of other posts) need a list of posts. The first time an agent calls one, agentprose builds that list, in this order:

1. **A prebuilt index**: `agentprose.json` at the site root, the URL in `<link rel="agentprose-index">`, or `data-index`. Built by [`agentprose build`](../../guides/large-archives/), it carries clean metadata and full Markdown per post. If it is there, feeds and sitemaps are skipped.
2. **Feeds**: RSS 2.0, RSS 1.0, Atom or JSON Feed, from `<link rel="alternate">` in the page, `data-feed`, or common paths (`feed.json`, `index.xml`, `feed.xml`, `atom.xml`, `rss.xml`, `feed/`, `rss/`).
3. **The sitemap**: `sitemap.xml` (or `data-sitemap`), including sitemap indexes, post sitemaps first. Tag, category, author, pagination and asset URLs are skipped.
4. **`llms.txt`**, which adds the pages it lists with their titles, plus the site's name and description.
5. **Pagefind**: if the site ships a [Pagefind](https://pagefind.app/) index (Starlight and many static themes do), `search_posts` uses it for full-text search.

Records for the same URL are merged, and the current page is always included. The result is cached in `sessionStorage` for 10 minutes (`data-cache`), without post bodies.

## Bounds

| Limit | Default | Attribute |
|---|---|---|
| Posts held in the client index | 2,000 | `data-max-posts` |
| Sitemaps followed | 5 | (`maxSitemaps` in code) |
| Characters per answer | 20,000 | `data-max-chars` |

Feed and sitemap discovery handles a few thousand posts well. Beyond that, or for search over full text instead of feed excerpts, build an index.

## Same-origin only

agentprose only fetches URLs on your site's own origin (pages, feeds, sitemaps, `llms.txt`, the index), and `get_post` refuses URLs on other origins. It never acts as an open proxy.

## When your site lives under a sub-path

Tell agentprose where the site root is, so it looks for `agentprose.json`, feeds and the sitemap in the right place:

```html
<script src="https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js" defer
        data-base="https://example.com/blog/"></script>
```

## When there is no feed or sitemap

Use a CMS [adapter](../adapters/), point `data-index` at a JSON file, or run `agentprose build` on your built site.
