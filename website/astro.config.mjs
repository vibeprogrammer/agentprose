// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';
import { createStarlightTypeDocPlugin } from 'starlight-typedoc';

// One value decides where the site lives: SITE_URL (origin + base path).
// The Pages workflow passes the URL GitHub reports for this repo's Pages site, so a later custom domain
// (e.g. https://docs.agentprose.dev/) needs no code change. While the owner's user site has the custom domain
// salnikov.no, project Pages serve at https://salnikov.no/agentprose/ (webmaxru.github.io/agentprose redirects there).
const SITE_URL = new URL(process.env.SITE_URL || 'https://salnikov.no/agentprose/');
if (SITE_URL.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(SITE_URL.hostname)) SITE_URL.protocol = 'https:';
const site = SITE_URL.origin;
const base = SITE_URL.pathname.replace(/\/+$/, '') || '/';
const abs = (p = '') => `${site}${base === '/' ? '' : base}/${p}`;

const repo = 'https://github.com/webmaxru/agentprose';
/** The public adapter entry points (package.json exports ./adapters/*); files starting with _ are internal. */
const ADAPTERS = ['contentful', 'enonic', 'generic', 'ghost', 'sanity', 'storyblok', 'strapi', 'wordpress'];

const [apiTypeDoc, apiTypeDocSidebar] = createStarlightTypeDocPlugin();

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  integrations: [
    starlight({
      title: 'agentprose',
      description:
        'Make any blog or CMS readable by AI agents through WebMCP: one script tag, zero config, read-only tools for articles, search, sections and citations.',
      logo: { src: './src/assets/logo.svg', replacesTitle: false },
      favicon: '/favicon.svg',
      social: [
        { icon: 'github', label: 'GitHub', href: repo },
        { icon: 'npm', label: 'npm', href: 'https://www.npmjs.com/package/agentprose' },
      ],
      editLink: { baseUrl: `${repo}/edit/main/website/` },
      lastUpdated: true,
      customCss: ['./src/styles/custom.css'],
      components: {
        Footer: './src/components/Footer.astro',
      },
      head: [
        { tag: 'meta', attrs: { property: 'og:image', content: abs('og.png') } },
        { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
        { tag: 'meta', attrs: { property: 'og:image:alt', content: 'agentprose: make any blog readable by AI agents' } },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
        { tag: 'meta', attrs: { name: 'twitter:image', content: abs('og.png') } },
        { tag: 'meta', attrs: { name: 'theme-color', content: '#4338ca' } },
        // Dogfooding: this site's own pages are agent-readable with agentprose (index built by `agentprose build`).
        // The site root is set from the page's own origin, so http:// and https:// visits both stay same-origin.
        { tag: 'script', content: `window.AgentProseConfig={baseUrl:location.origin+${JSON.stringify(abs().slice(site.length))}}` },
        {
          tag: 'script',
          attrs: {
            src: 'https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js',
            defer: true,
            'data-content': '.sl-markdown-content',
            'data-ignore': '.sl-anchor-link,.expressive-code .copy',
            // Search over agentprose.json (hand-written docs) rather than Pagefind, which also indexes the generated API pages.
            'data-pagefind': 'false',
          },
        },
      ],
      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'Why agentprose', slug: 'introduction' },
            { label: 'What is WebMCP?', slug: 'webmcp' },
            { label: 'Quick start', slug: 'getting-started' },
          ],
        },
        {
          label: 'Install',
          items: [
            { label: 'Script tag (CDN)', slug: 'install/script-tag' },
            { label: 'agentprose Cloud snippet', slug: 'install/cloud' },
            { label: 'npm package', slug: 'install/npm' },
            { label: 'WordPress plugin', slug: 'install/wordpress' },
            { label: 'Agent skill', slug: 'install/agent-skill' },
          ],
        },
        {
          label: 'WordPress plugin',
          items: [
            { label: 'Overview and install', slug: 'wordpress' },
            { label: 'Settings', slug: 'wordpress/settings' },
            { label: 'Self-hosted or Cloud', slug: 'wordpress/cloud' },
            { label: 'What it adds to your pages', slug: 'wordpress/how-it-works' },
            { label: 'Caching, CSP and uninstall', slug: 'wordpress/operations' },
            { label: 'Plugin FAQ', slug: 'wordpress/faq' },
            { label: 'Plugin changelog', slug: 'wordpress/changelog' },
            { label: 'Reference and comparison', slug: 'reference/wordpress-plugin' },
          ],
        },
        {
          label: 'Concepts',
          items: [
            { label: 'Tools', slug: 'concepts/tools' },
            { label: 'Auto-discovery', slug: 'concepts/discovery' },
            { label: 'Adapters', slug: 'concepts/adapters' },
            { label: 'The WebMCP polyfill', slug: 'concepts/polyfill' },
            { label: 'Notes and contact for agents', slug: 'concepts/notes-and-contact' },
            { label: 'Privacy and analytics', slug: 'concepts/privacy' },
            { label: 'Architecture', slug: 'concepts/architecture' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Static site generators', slug: 'guides/static-sites' },
            { label: 'Next.js and React apps', slug: 'guides/nextjs' },
            { label: 'Ghost', slug: 'guides/ghost' },
            { label: 'Headless CMS', slug: 'guides/headless-cms' },
            { label: 'Private content: proxy mode', slug: 'guides/proxy' },
            { label: 'Custom tools and analytics', slug: 'guides/custom-tools' },
            { label: 'Large archives: build an index', slug: 'guides/large-archives' },
            { label: 'With agentprose Cloud', slug: 'guides/cloud' },
            { label: 'Claude Desktop and Cursor (MCP-B)', slug: 'guides/mcp-b-claude-desktop' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Configuration', slug: 'reference/configuration' },
            { label: 'Tools', slug: 'reference/tools' },
            { label: 'Adapters', slug: 'reference/adapters' },
            { label: 'CLI', slug: 'reference/cli' },
            { label: 'Versioning and updates', slug: 'reference/versioning' },
            apiTypeDocSidebar,
          ],
        },
        { label: 'Browser and agent support', slug: 'support' },
        {
          label: 'Project',
          items: [
            { label: 'Security', slug: 'project/security' },
            { label: 'FAQ', slug: 'project/faq' },
            { label: 'Compared with what exists', slug: 'project/comparison' },
            { label: 'Changelog', slug: 'project/changelog' },
            { label: 'Contributing', slug: 'project/contributing' },
            { label: 'Releasing', slug: 'project/releasing' },
            { label: 'agentprose Cloud', link: 'https://agentprose.cloud', attrs: { target: '_blank', rel: 'noopener' } },
          ],
        },
      ],
      plugins: [
        apiTypeDoc({
          entryPoints: ['../src/index.ts', '../src/full.ts', ...ADAPTERS.map((a) => `../src/adapters/${a}.ts`)],
          tsconfig: './tsconfig.typedoc.json',
          output: 'reference/api',
          sidebar: { label: 'API (generated)', collapsed: true },
          typeDoc: {
            name: 'API reference',
            entryFileName: 'index',
            plugin: ['./scripts/typedoc-module-names.mjs'],
            excludeInternal: true,
            excludePrivate: true,
            excludeExternals: true,
            skipErrorChecking: true,
            disableGit: true,
            gitRevision: 'main',
            sourceLinkTemplate: `${repo}/blob/{gitRevision}/{path}#L{line}`,
            parametersFormat: 'table',
            interfacePropertiesFormat: 'table',
            useCodeBlocks: true,
          },
        }),
        // Relative links keep pages independent of the base path; scripts/check-links.mjs verifies them (and anchors)
        // in the built HTML under the real base.
        starlightLinksValidator({ errorOnLocalLinks: false, errorOnRelativeLinks: false }),
      ],
    }),
  ],
});
