# Adapters

An adapter tells readmcp where posts come from. Without one, readmcp uses the zero-config source (page, `readmcp.json`, feeds, sitemap, llms.txt and Pagefind) and auto-detects WordPress.

**The rule for every adapter:** WebMCP tools run in the visitor's browser, so any credential in the page is public. Use only credentials the vendor designed to be public, or use proxy mode.

| Adapter | Script tag | npm | Safe in the page | Search |
|---|---|---|---|---|
| WordPress | auto, or `data-adapter="wordpress" data-api="/wp-json/"` | `readmcp/adapters/wordpress` | nothing needed | REST `search=` |
| Ghost | `data-adapter="ghost" data-key="<content key>" [data-api="https://site"]` | `readmcp/adapters/ghost` | Content API key | client-side index |
| Sanity | `data-adapter="sanity" data-project="<id>" [data-dataset] [data-type] [data-url-pattern]` | `readmcp/adapters/sanity` | no token (public dataset) | GROQ `match` + `score()` |
| Contentful | `data-adapter="contentful" data-space="<id>" data-token="<CDA token>" [data-content-type] [data-url-pattern]` | `readmcp/adapters/contentful` | Delivery API token | CDA `query=` |
| Enonic XP | `data-adapter="enonic" data-endpoint="<guillotine url>" data-content-type="app:type" [data-site-key]` | `readmcp/adapters/enonic` | public endpoint | Query DSL `fulltext` |
| Strapi 5/4 | `data-adapter="strapi" data-api="https://cms" [data-collection] [data-url-pattern]` | `readmcp/adapters/strapi` | Public role, no token | `$containsi` on title/description |
| Storyblok | `data-adapter="storyblok" data-token="<public token>" [data-starts-with="blog/"]` | `readmcp/adapters/storyblok` | public access token | `search_term` |
| JSON | `data-adapter="generic" data-src="/posts.json"` | `readmcp/adapters/generic` | n/a | client-side index |

Every adapter also accepts `data-proxy` / `proxy`.

## WordPress

No configuration. readmcp sees `<link rel="https://api.w.org/">` (WordPress prints it on every page) and switches to the REST API: `/wp/v2/posts` with `search`, `tags`, `categories`, `author`, `after`, `before`, and `_fields` to keep responses small. Sites without pretty permalinks (`?rest_route=`) work too. Custom post types use `types: ['posts', 'docs']` or `data-types="posts,docs"`. The [plugin](../wordpress-plugin/) adds the script and a settings page. Reference: https://developer.wordpress.org/rest-api/reference/posts/

## Ghost

```ts
ghost({ url: 'https://demo.ghost.io', key: 'YOUR_CONTENT_API_KEY' })
```

Ghost documents the Content API key as safe for browsers, because it only reads public data (https://docs.ghost.org/content-api). Filters map to NQL (`tag:`, `author:`, `published_at:>=`). Tags marked internal (`#hashtag`) are hidden. Ghost has no full-text search endpoint, so search uses readmcp's client-side index. On Ghost(Pro), paste the script tag into Settings → Code injection. An Admin API key (`id:secret`) is refused.

## Sanity

```ts
sanity({ projectId: 'abc123', dataset: 'production', type: 'post', urlPattern: '/blog/{slug}/' })
```

Queries go to the API CDN (`<project>.apicdn.sanity.io`) with GROQ. Parameters are passed as `$params`, never spliced into the query. Add your site's origin to the project's CORS origins (https://www.sanity.io/docs/content-lake/cors), **without** "allow credentials". The default projection fits Sanity's blog schema (`title`, `slug`, `publishedAt`, `author->name`, `categories[]->title`, `mainImage`, Portable Text `body`). Pass `projection` to map your own schema. Private datasets need a token, which must not be in a page: use proxy mode. Tokens starting with `sk` are refused.

## Contentful

```ts
contentful({ space: 'xxxx', accessToken: 'CDA_TOKEN', contentType: 'blogPost', fields: { body: 'content' } })
```

Uses the Content Delivery API (`cdn.contentful.com`). Its tokens read published content only. Never use a Content Management (`CFPAT-…`, refused) or Preview token. Links to authors and assets are resolved from `includes`, and Rich Text renders to Markdown. Map your field ids with `fields`.

## Enonic XP (Guillotine)

```ts
enonic({ endpoint: 'https://example.com/site/myproject/master', contentType: 'com.example.myapp:article', siteKey: '/mysite', fields: { body: 'text', summary: 'preface', tags: 'tags' } })
```

POSTs GraphQL to Guillotine using `queryDsl` (term, range and `fulltext` expressions, sorted by `publish.first`) and reads `dataAsJson`, so you don't need type-specific fragments. Post URLs come from `pageUrl(type: absolute)`. The site key is sent as `X-Guillotine-SiteKey`. Reference: https://developer.enonic.com/docs/guillotine/stable/usage. The endpoint must allow anonymous reads of published content, or sit behind proxy mode.

## Strapi

```ts
strapi({ url: 'https://cms.example.com', collection: 'articles', urlPattern: '/blog/{slug}/' })
```

Enable `find` and `findOne` for the Public role on the collection (https://docs.strapi.io/cms/features/users-permissions), and allow your site in the `strapi::cors` middleware. Strapi 5 (flat) and Strapi 4 (`attributes`) responses are both handled. Bodies can be Markdown strings, the Blocks editor format, or `shared.rich-text` dynamic-zone blocks. An API token in a page is visible to every visitor, so use proxy mode instead.

## Storyblok

```ts
storyblok({ token: 'PUBLIC_TOKEN', startsWith: 'blog/', urlPattern: '/{slug}' })
```

Use the **public** access token, which Storyblok intends for production frontends (https://www.storyblok.com/docs/concepts/access-tokens). Never use the preview token. Only `version=published` is requested. Richtext renders to Markdown.

## Proxy mode

```ts
contentful({ space: 'xxxx', proxy: 'https://example.com/api/cms' }) // no token in the page
```

Each request keeps its path and query but goes to your proxy. The proxy adds the credential and forwards the request to the vendor. Allow-list the paths it forwards (read endpoints only). [examples/proxy](../examples/proxy/) has a Cloudflare Worker and a dependency-free Node server.

## Writing an adapter

```ts
import { defineAdapter } from 'readmcp/adapters/generic';

export const myCms = defineAdapter({
  name: 'my-cms',
  async list({ limit = 20, offset = 0, tag } = {}) {
    const r = await fetch(`/api/posts?limit=${limit}&offset=${offset}${tag ? `&tag=${tag}` : ''}`).then((r) => r.json());
    return { items: r.posts.map((p) => ({ url: p.url, title: p.title, summary: p.excerpt, published: p.date, tags: p.tags })), total: r.total };
  },
  async get({ slug, url }) {
    const p = await fetch(`/api/posts/${slug ?? new URL(url).pathname.split('/').pop()}`).then((r) => (r.ok ? r.json() : null));
    return p && { url: p.url, title: p.title, markdown: p.markdown /* or html: p.html */ };
  },
  // optional: search(query, opts), taxonomies(), site()
});
```

Only `list` and `get` are required. When `search` is missing, readmcp ranks `list()` results itself. When `taxonomies` is missing, it counts them from posts. Return `markdown` or `html` from `get` (HTML is converted). For a script-tag build, export `fromAttributes(dataset)` and register it with `window.ReadMCP.adapters['my-cms'] = fromAttributes`.
