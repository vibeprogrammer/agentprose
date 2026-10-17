# Headless CMS snippets

```html
<!-- Sanity (public dataset; add your origin to the project's CORS origins, no credentials) -->
<script src=".../agentprose.min.js" defer data-adapter="sanity" data-project="abc123" data-dataset="production" data-type="post" data-url-pattern="/blog/{slug}/"></script>

<!-- Contentful (Delivery API token only) -->
<script src=".../agentprose.min.js" defer data-adapter="contentful" data-space="xxxx" data-token="CDA_TOKEN" data-content-type="blogPost" data-url-pattern="/blog/{slug}/"></script>

<!-- Enonic XP (public Guillotine endpoint) -->
<script src=".../agentprose.min.js" defer data-adapter="enonic" data-endpoint="https://example.com/site/myproject/master" data-content-type="com.example.myapp:article" data-site-key="/mysite"></script>

<!-- Strapi (Public role: find + findOne on the collection) -->
<script src=".../agentprose.min.js" defer data-adapter="strapi" data-api="https://cms.example.com" data-collection="articles" data-url-pattern="/blog/{slug}/"></script>

<!-- Storyblok (public token) -->
<script src=".../agentprose.min.js" defer data-adapter="storyblok" data-token="PUBLIC_TOKEN" data-starts-with="blog/"></script>

<!-- Private tokens: proxy mode -->
<script src=".../agentprose.min.js" defer data-adapter="contentful" data-space="xxxx" data-proxy="/api/cms"></script>
```

With npm, field mapping is available. See [docs/adapters.md](../../docs/adapters.md):

```ts
import { createAgentTools } from 'agentprose';
import { contentful } from 'agentprose/adapters/contentful';

createAgentTools({
  adapter: contentful({ space: 'xxxx', accessToken: 'CDA_TOKEN', contentType: 'article', fields: { body: 'content', published: 'date', author: 'writer' } }),
});
```
