// Demo blog content. Each post is real, accurate documentation about readmcp and WebMCP,
// so the demo doubles as the end-to-end test fixture.
export const site = {
  name: 'readmcp demo blog',
  description: 'A small static blog that AI agents can read through WebMCP — installed with one line of JavaScript.',
  author: 'readmcp',
};

export const posts = [
  {
    slug: 'what-webmcp-means-for-blogs',
    title: 'What WebMCP means for blogs',
    date: '2026-10-12T09:00:00Z',
    tags: ['webmcp', 'agents'],
    category: 'Concepts',
    author: 'Maxim Salnikov',
    summary: 'WebMCP lets a page hand tools to the AI agent in the browser. For a blog, that means agents stop scraping and start asking.',
    body: `
<p>An AI agent visiting a blog today sees what a scraper sees: navigation, cookie banners, share buttons, and somewhere in the middle, the article. It guesses where the content starts, burns tokens on markup, and has no reliable way to search the archive.</p>
<h2>Tools instead of scraping</h2>
<p>WebMCP is a W3C Community Group draft that adds <code>document.modelContext</code> to the web platform. A page registers <em>tools</em> — a name, a description, a JSON Schema for the input and a function — and the agent in the browser calls them.</p>
<pre><code class="language-js">await document.modelContext.registerTool({
  name: 'search_posts',
  description: 'Full-text search across every post on this site.',
  inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  annotations: { readOnlyHint: true },
  execute: async ({ query }) => search(query),
});</code></pre>
<h2>What a blog should offer</h2>
<ul>
  <li><strong>The current article</strong> as clean markdown, with author, dates and tags.</li>
  <li><strong>Search and listing</strong> across the whole archive, not only the page.</li>
  <li><strong>Sections</strong>, so an agent can read one part of a long post.</li>
  <li><strong>Site facts</strong>: what the blog is about, its feeds, how to subscribe.</li>
</ul>
<h2>Where browsers are</h2>
<p>Chrome ships WebMCP behind <code>chrome://flags/#enable-webmcp-testing</code> for local testing and as an origin trial for real visitors. The tools only exist in secure contexts, and the <code>tools</code> Permissions Policy controls whether embedded frames may use them.</p>
<blockquote><p>Registering tools never changes how the page looks or loads. Browsers without WebMCP simply ignore it.</p></blockquote>`,
  },
  {
    slug: 'one-line-install',
    title: 'Installing readmcp with one line of JavaScript',
    date: '2026-10-13T09:00:00Z',
    tags: ['readmcp', 'install', 'webmcp'],
    category: 'Guides',
    author: 'Maxim Salnikov',
    summary: 'Add one script tag and your blog exposes search, articles, sections and site info to agents. No build step, no backend.',
    body: `
<p>readmcp reads what your site already publishes — schema.org JSON-LD, OpenGraph tags, the <code>&lt;article&gt;</code> element, your RSS, Atom or JSON Feed, <code>sitemap.xml</code> and <code>llms.txt</code> — and turns it into WebMCP tools.</p>
<h2>The one line</h2>
<pre><code class="language-html">&lt;script src="https://cdn.jsdelivr.net/npm/readmcp@0.1/dist/readmcp.min.js" defer&gt;&lt;/script&gt;</code></pre>
<p>That is the whole install. On page load readmcp registers its tools and fetches nothing. The first time an agent searches or lists posts, it loads a small engine and reads your feed and sitemap.</p>
<h2>Optional attributes</h2>
<table>
  <thead><tr><th>Attribute</th><th>What it does</th></tr></thead>
  <tbody>
    <tr><td><code>data-content</code></td><td>CSS selector of the article body, if detection picks the wrong element</td></tr>
    <tr><td><code>data-subscribe</code></td><td>Your newsletter URL, exposed through a subscribe tool</td></tr>
    <tr><td><code>data-index</code></td><td>A prebuilt index from the CLI, for large archives</td></tr>
    <tr><td><code>data-adapter</code></td><td>Read from WordPress, Ghost, Sanity, Contentful, Enonic, Strapi or Storyblok</td></tr>
  </tbody>
</table>
<h2>Checking it works</h2>
<p>Open any page with <code>?readmcp-inspect</code> in the URL. A panel lists every registered tool and lets you call them, in any browser.</p>`,
  },
  {
    slug: 'markdown-not-html',
    title: 'Why agents should get markdown, not HTML',
    date: '2026-10-14T09:00:00Z',
    tags: ['markdown', 'agents', 'performance'],
    category: 'Concepts',
    author: 'readmcp',
    summary: 'Markup is noise to a language model. Clean markdown keeps headings, lists, code and links, and drops everything else.',
    body: `
<p>A typical blog post weighs 60 to 150 KB of HTML. The words an agent needs are usually under 15 KB. Everything else — class names, inline SVG icons, tracking attributes — costs tokens and adds nothing.</p>
<h2>What survives the conversion</h2>
<ol>
  <li>Headings, so the outline stays navigable.</li>
  <li>Lists and tables, so structure is not flattened into prose.</li>
  <li>Code blocks with their language, so examples stay runnable.</li>
  <li>Links and images, made absolute so they work out of context.</li>
</ol>
<h2>What gets dropped</h2>
<p>Navigation, footers, share widgets, comment forms, ads, cookie banners and anything hidden. Site owners can drop more with <code>data-ignore</code> or by marking elements with <code>data-agent-ignore</code>.</p>
<h2>Paging instead of truncating</h2>
<p>Long posts are returned in pages that break at paragraph boundaries. The tool answers with <code>next_offset</code>, and the agent asks for the next part only if it needs it. Nothing is silently cut.</p>`,
  },
  {
    slug: 'search-without-a-server',
    title: 'Search without a server',
    date: '2026-10-15T09:00:00Z',
    tags: ['search', 'readmcp', 'performance'],
    category: 'Engineering',
    author: 'readmcp',
    summary: 'readmcp ranks posts in the browser with BM25F over titles, tags, summaries and text, and reuses Pagefind when a site already has it.',
    body: `
<p>Static blogs have no search backend, so readmcp brings one: a BM25F ranker that weighs titles above tags, tags above summaries and summaries above body text.</p>
<h2>Where the index comes from</h2>
<ul>
  <li>A prebuilt <code>readmcp.json</code> from the CLI, with one markdown file per post so the index stays small.</li>
  <li>Otherwise your feed, merged with every URL in <code>sitemap.xml</code> and the titles in <code>llms.txt</code>.</li>
  <li>If the site ships <a href="https://pagefind.app/">Pagefind</a>, its chunked index answers search directly.</li>
</ul>
<h2>Typing-friendly matching</h2>
<p>The last word of a query also matches as a prefix, so <code>webm</code> finds <code>WebMCP</code>. Accents are folded, so <code>cafe</code> finds <code>café</code>.</p>
<h2>Keeping it fast</h2>
<p>The index is built once, on the first search, and cached for the session. Pages load exactly as before.</p>`,
  },
  {
    slug: 'headless-cms-tokens',
    title: 'Connecting a headless CMS: which tokens are safe in a page',
    date: '2026-10-16T09:00:00Z',
    tags: ['cms', 'security', 'readmcp'],
    category: 'Guides',
    author: 'Maxim Salnikov',
    summary: 'WebMCP tools run in the visitor’s browser, so every credential in their config is public. Here is what that allows for each CMS.',
    body: `
<p>A WebMCP tool executes in the page. Whatever key it uses, every visitor can read. That rules out admin and preview tokens entirely, and it shapes how each adapter connects.</p>
<h2>Safe to embed</h2>
<ul>
  <li><strong>WordPress</strong>: no token; the REST API serves published posts publicly.</li>
  <li><strong>Ghost</strong>: the Content API key, which Ghost documents as safe for browsers.</li>
  <li><strong>Sanity</strong>: no token for a public dataset, read through the API CDN.</li>
  <li><strong>Contentful</strong>: a Content Delivery API token (published content only).</li>
  <li><strong>Storyblok</strong>: the public access token, never the preview token.</li>
  <li><strong>Strapi</strong>: the Public role with find and findOne enabled, no token.</li>
  <li><strong>Enonic XP</strong>: a public Guillotine endpoint.</li>
</ul>
<h2>When you need a secret</h2>
<p>Use proxy mode: point the adapter at your own endpoint with <code>proxy</code>, and let the server add the credential. readmcp refuses to start with credentials that look like management keys.</p>
<h2>Read-only by design</h2>
<p>Every built-in tool carries <code>readOnlyHint</code> and <code>untrustedContentHint</code>, so agents know the tools change nothing and that post text is data, not instructions.</p>`,
  },
  {
    slug: 'measuring-agent-traffic',
    title: 'Measuring agent traffic with onToolCall',
    date: '2026-10-17T08:00:00Z',
    tags: ['analytics', 'agents'],
    category: 'Engineering',
    author: 'readmcp',
    summary: 'Know which posts agents read and what they search for, without sending any content anywhere.',
    body: `
<p>Agents do not show up in page-view analytics the way people do. readmcp reports every tool call, so you can see what agents actually use.</p>
<h2>The hook</h2>
<pre><code class="language-js">import { createAgentTools } from 'readmcp';

createAgentTools({
  onToolCall: ({ tool, ok, ms, page }) => console.log(tool, ok, ms, page),
});</code></pre>
<p>Each call also fires a <code>readmcp:call</code> DOM event, and <code>data-analytics</code> sends a beacon with the tool name, timing, page and search query.</p>
<h2>What you learn</h2>
<ul>
  <li>Which posts agents read in full, and which they skim by section.</li>
  <li>Search queries that return nothing: the posts you have not written yet.</li>
  <li>How often agents fail, and on which tools.</li>
</ul>`,
  },
];
