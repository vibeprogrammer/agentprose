# Tools

Generated from the source by `node scripts/docs-tools.mjs`. Names can be prefixed (`data-prefix`), and any tool can be left out (`data-exclude`).

All built-in tools carry `annotations: { readOnlyHint: true, untrustedContentHint: true }`, except `navigate_to`. Errors come back as results, not exceptions, so agents can recover: `{ "error": "not_found" | "invalid_input" | "section_not_found" | "tool_failed", "message": "…" }`.

| Tool | Title |
|---|---|
| [`get_current_article`](#get_current_article) | Read the current article |
| [`search_posts`](#search_posts) | Search posts |
| [`list_posts`](#list_posts) | List posts |
| [`get_post`](#get_post) | Read a post |
| [`list_taxonomies`](#list_taxonomies) | List tags, categories and authors |
| [`get_related_posts`](#get_related_posts) | Find related posts |
| [`get_table_of_contents`](#get_table_of_contents) | Get the outline of a post |
| [`get_section`](#get_section) | Read one section |
| [`get_citation`](#get_citation) | Cite a post |
| [`get_site_info`](#get_site_info) | About this site |
| [`get_subscribe_link`](#get_subscribe_link) | How to subscribe |
| [`get_comments_link`](#get_comments_link) | Where to comment |
| [`navigate_to`](#navigate_to) | Open a page on this site |

## get_current_article

**Read the current article.** Returns the article the user is viewing as clean markdown, with title, author, dates, tags, summary and its section outline. Use this first when the user asks about "this post", "this page" or "the article". Long articles are paged: pass next_offset back as offset.

| Input | Type | Description |
|---|---|---|
| `max_chars` | integer 500–100000 | Maximum characters of markdown to return; long posts are cut at a paragraph boundary. Default 20000. |
| `offset` | integer 0–∞ | Character offset to continue from; use next_offset from the previous response. |

## search_posts

**Search posts.** Full-text search across every post on this site (titles, tags, summaries and body text), ranked by relevance. Returns URLs, titles, summaries and dates; call get_post with a URL to read one.

| Input | Type | Description |
|---|---|---|
| `query` * | string | Keywords or a natural-language question, e.g. "webmcp security". |
| `limit` | integer 1–50 | Number of results. Default 10. |
| `tag` | string | Only posts with this tag (name or slug, case-insensitive). |
| `category` | string | Only posts in this category. |
| `author` | string | Only posts by this author (display name). |
| `since` | string | Only posts published on or after this date (ISO 8601, e.g. 2026-01-31). |
| `until` | string | Only posts published on or before this date (ISO 8601). |

## list_posts

**List posts.** Lists posts newest first (or oldest first), optionally filtered by tag, category, author or date range. Use it for "latest posts", "everything tagged X" or browsing an archive; use search_posts for topics.

| Input | Type | Description |
|---|---|---|
| `limit` | integer 1–100 | Number of posts. Default 20. |
| `offset` | integer 0–∞ | Skip this many posts (paging). |
| `sort` | string (newest \| oldest) |  |
| `tag` | string | Only posts with this tag (name or slug, case-insensitive). |
| `category` | string | Only posts in this category. |
| `author` | string | Only posts by this author (display name). |
| `since` | string | Only posts published on or after this date (ISO 8601, e.g. 2026-01-31). |
| `until` | string | Only posts published on or before this date (ISO 8601). |

## get_post

**Read a post.** Returns one post as clean markdown with its metadata and section outline. Identify it by url (preferred) or slug. Pass section to get only that part (an id or title from sections). Long posts are paged with offset/next_offset.

| Input | Type | Description |
|---|---|---|
| `url` | string | The post's URL (absolute, or a path on this site such as /posts/hello-world/). |
| `slug` | string | The post's slug, the last segment of its URL (e.g. hello-world). |
| `section` | string | Optional section id or heading text to return only that section. |
| `max_chars` | integer 500–100000 | Maximum characters of markdown to return; long posts are cut at a paragraph boundary. Default 20000. |
| `offset` | integer 0–∞ | Character offset to continue from; use next_offset from the previous response. |

## list_taxonomies

**List tags, categories and authors.** Lists the tags, categories and authors used on this site with post counts, most used first. Use the names as filters in list_posts and search_posts.

| Input | Type | Description |
|---|---|---|
| `type` | string (all \| tags \| categories \| authors) | Which taxonomy. Default all. |
| `limit` | integer 1–500 | Maximum terms per taxonomy. Default 100. |

## get_related_posts

**Find related posts.** Returns posts related to a given post (by shared tags, categories and topic). Defaults to the article the user is viewing.

| Input | Type | Description |
|---|---|---|
| `url` | string | The post's URL (absolute, or a path on this site such as /posts/hello-world/). |
| `slug` | string | The post's slug, the last segment of its URL (e.g. hello-world). |
| `limit` | integer 1–20 | Number of posts. Default 5. |

## get_table_of_contents

**Get the outline of a post.** Returns the heading outline (section ids, levels and titles) of a post, so you can fetch just one section with get_section. Defaults to the article the user is viewing.

| Input | Type | Description |
|---|---|---|
| `url` | string | The post's URL (absolute, or a path on this site such as /posts/hello-world/). |
| `slug` | string | The post's slug, the last segment of its URL (e.g. hello-world). |

## get_section

**Read one section.** Returns the markdown of one section of a post, matched by section id or heading text (exact, then partial). Defaults to the article the user is viewing. Cheaper than reading the whole post.

| Input | Type | Description |
|---|---|---|
| `section` * | string | Section id or heading text, e.g. "installation". |
| `url` | string | The post's URL (absolute, or a path on this site such as /posts/hello-world/). |
| `slug` | string | The post's slug, the last segment of its URL (e.g. hello-world). |

## get_citation

**Cite a post.** Returns a ready citation for a post (author, date, title, site, URL). Pass quote to check that the exact text appears in the post; when it does you also get a deep link that scrolls to and highlights it. Use before quoting this site to the user.

| Input | Type | Description |
|---|---|---|
| `url` | string | The post's URL (absolute, or a path on this site such as /posts/hello-world/). |
| `slug` | string | The post's slug, the last segment of its URL (e.g. hello-world). |
| `quote` | string | Optional exact text you intend to quote. |

## get_site_info

**About this site.** Returns what this site is: name, description, language, feeds, number of posts, latest post date, useful links (subscribe, about, contact) and which content sources the tools read.

No input.

## get_subscribe_link

**How to subscribe.** Returns the link where the user can subscribe to this site (newsletter or feed). Show it to the user; this tool does not subscribe anyone.

No input.

Registered only when `links.subscribe` (`data-subscribe`) is set.

## get_comments_link

**Where to comment.** Returns the link where the user can read or write comments on the current article. Show it to the user; this tool posts nothing.

No input.

Registered only when `links.comments` (`data-comments`) is set.

## navigate_to

**Open a page on this site.** Opens another page of this site in the current tab (same origin only), e.g. a post found with search_posts, so the user can see it.

| Input | Type | Description |
|---|---|---|
| `url` * | string | The post's URL (absolute, or a path on this site such as /posts/hello-world/). |

Registered only with `navigate: true` (`data-navigate`). Same-origin URLs only. Not read-only.

## Example: get_current_article

```json
{
  "url": "https://blog.example/posts/headless-cms-tokens/",
  "title": "Connecting a headless CMS: which tokens are safe in a page",
  "summary": "WebMCP tools run in the visitor’s browser, so every credential in their config is public…",
  "published": "2026-10-16T09:00:00.000Z",
  "authors": ["Maxim Salnikov"],
  "tags": ["cms", "security", "agentprose"],
  "categories": ["Guides"],
  "readingMinutes": 1,
  "isArticle": true,
  "sections": [{ "id": "safe-to-embed", "level": 2, "title": "Safe to embed" }, { "id": "when-you-need-a-secret", "level": 2, "title": "When you need a secret" }],
  "markdown": "A WebMCP tool executes in the page. Whatever key it uses, every visitor can read…\n\n## Safe to embed\n\n- **WordPress**: no token…",
  "length": 1408,
  "truncated": false
}
```

When `truncated` is true, call again with `offset: next_offset`. Pages break at paragraph boundaries, and nothing is dropped.
