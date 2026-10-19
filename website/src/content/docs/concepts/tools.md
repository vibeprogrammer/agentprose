---
title: "Tools"
description: "The read-only WebMCP tools agentprose registers, what each is for, how answers are paged, and how errors come back."
---

A **tool** is a named function with a description and a JSON Schema that the page hands to an AI agent through WebMCP. agentprose registers a set of tools designed for reading content, each written so an agent knows when to use it.

## The set

| Tool | When an agent uses it | Registered |
|---|---|---|
| `get_current_article` | "this post", "this page" | always |
| `search_posts` | find posts on a topic across the site | always |
| `list_posts` | newest posts, or by tag, category, author or date | always |
| `get_post` | read any post in full, as Markdown | always |
| `list_taxonomies` | tags, categories and authors with counts | always |
| `get_related_posts` | posts similar to one post | always |
| `get_table_of_contents` | the outline of a long post | always |
| `get_section` | read one section by its heading | always |
| `get_citation` | cite a post, and verify a quote | always |
| `get_site_info` | what this site is, its feeds, links, notes for agents | always |
| `get_contact_info` | how to contact or book the owner | when contact details exist ([notes and contact](../notes-and-contact/)) |
| `get_subscribe_link` | how to subscribe | with `data-subscribe` |
| `get_comments_link` | where to comment | with `data-comments` |
| `navigate_to` | open another page of the site | with `data-navigate` |

Input schemas and example outputs for each are in the [tool reference](../../reference/tools/).

## Annotations

Every built-in tool carries `annotations: { readOnlyHint: true, untrustedContentHint: true }`, except `navigate_to`, which changes the page and is therefore opt-in, same-origin only and not marked read-only.

`untrustedContentHint` tells agents to treat what comes back as data, not instructions. Blog content includes comments, quotes and guest posts, and any of them could try prompt injection. Turn it off with `data-untrusted="false"` only for fully trusted content.

## Markdown, paged, never silently cut

Articles come back as GitHub-flavoured Markdown: headings, nested lists, tables and fenced code survive. Answers are capped by `maxChars` (default 20,000 characters, `data-max-chars`). When a post is longer, the answer says `truncated: true` and gives a `next_offset`; the agent calls again with `offset` to continue. Pages break at paragraph boundaries and nothing is dropped.

## Errors are results

Tools never throw at the agent. A problem comes back as a result the agent can read and recover from:

```json
{ "error": "not_found", "message": "…" }
```

The codes are `not_found`, `invalid_input`, `section_not_found` and `tool_failed`.

## Naming and choosing

- `data-prefix="blog_"` prefixes every tool name (`blog_search_posts`), useful when another script on the page registers tools too.
- `data-exclude="get_related_posts,get_citation"` leaves tools out.
- Your own tools sit next to the built-in ones: see [Custom tools and analytics](../../guides/custom-tools/).

## Calling tools yourself

The same code runs everywhere: in the 🔌 inspector (`?agentprose-inspect`), in `window.AgentProse.instance.call(name, input)`, in the CLI and in the agent. That makes tools easy to test:

```js
await window.AgentProse.instance.call('search_posts', { query: 'webmcp' });
```
