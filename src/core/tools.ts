import type { Config, ContentAdapter, Post, PostSummary, SiteInfo, ToolDefinition } from './types';
import { extractPage, extractSite, section, toc } from './extract';
import { loadLib } from './lib';
import { norm, parseHtml, stripHtml, window_ } from './util';
import { toMarkdown } from './markdown';

const STR = { type: 'string' } as const;
const INT = (d: string, min: number, max: number, def: number) => ({ type: 'integer', description: `${d} Default ${def}.`, minimum: min, maximum: max });
const FILTERS = {
  tag: { ...STR, description: 'Only posts with this tag (name or slug, case-insensitive).' },
  category: { ...STR, description: 'Only posts in this category.' },
  author: { ...STR, description: 'Only posts by this author (display name).' },
  since: { ...STR, description: 'Only posts published on or after this date (ISO 8601, e.g. 2026-01-31).' },
  until: { ...STR, description: 'Only posts published on or before this date (ISO 8601).' },
};
const PAGING = {
  max_chars: INT('Maximum characters of markdown to return; long posts are cut at a paragraph boundary.', 500, 100000, 20000),
  offset: { type: 'integer', minimum: 0, description: 'Character offset to continue from; use next_offset from the previous response.' },
};
const REF = {
  url: { ...STR, description: "The post's URL (absolute, or a path on this site such as /posts/hello-world/)." },
  slug: { ...STR, description: "The post's slug, the last segment of its URL (e.g. hello-world)." },
};

/** Compact list item: what an agent needs to choose a post, nothing more. */
export function brief(p: PostSummary): PostSummary {
  const { url, title, summary, published, updated, tags, categories, authors, readingMinutes } = p;
  return { url, title, summary, published, updated, tags, categories, authors, readingMinutes };
}

export interface Engine {
  tools: ToolDefinition[];
  call(name: string, input?: unknown): Promise<unknown>;
}

/** Builds the tool set for a content source. Pure: registration happens elsewhere. */
export function buildTools(cfg: Config, src: ContentAdapter, doc: Document = document): ToolDefinition[] {
  const maxChars = cfg.maxChars ?? 20000;
  const here = () => location.href;
  const body = (p: Post & { isArticle?: boolean }, i: { max_chars?: number; offset?: number }) => {
    const md = p.markdown || '';
    const w = window_(md, Math.max(0, i.offset || 0), Math.min(Math.max(i.max_chars || maxChars, 500), 100000));
    const { html, markdown, source, description, ...meta } = p as any;
    return {
      ...meta,
      sections: toc(md).map(({ id, level, title }) => ({ id, level, title })),
      markdown: w.text,
      length: md.length,
      truncated: w.next !== undefined,
      next_offset: w.next,
    };
  };

  const current = () => extractPage(doc, here(), { selector: cfg.contentSelector, ignore: cfg.ignoreSelectors });

  const resolve = async (i: { url?: string; slug?: string; id?: string }): Promise<Post | null> => {
    if (!i.url && !i.slug && !i.id) {
      const { isArticle, description, ...p } = current();
      return p;
    }
    let abs: string | undefined;
    try {
      abs = i.url ? new URL(i.url, here()).href : undefined;
    } catch {
      return null;
    }
    if (abs && norm(abs) === norm(here())) {
      const { isArticle, description, ...p } = current();
      return p;
    }
    const p = await src.get(abs ? { ...i, url: abs } : i);
    // Adapters may return HTML bodies; agents always get markdown.
    if (p && !p.markdown && p.html) return { ...p, markdown: toMarkdown(parseHtml(p.html).body, p.url) };
    return p;
  };

  const notFound = (i: any) => ({ error: 'not_found', message: `No post matches ${JSON.stringify(i)}. Use search_posts or list_posts to find valid URLs.` });

  // Post bodies are text the agent should treat as data, not instructions (WebMCP §security).
  let siteP: Promise<ReturnType<typeof import('./site-tools').siteExec>> | undefined;
  const site = () => (siteP ||= loadLib().then((L) => L.siteExec({ cfg, src, doc, here, current, resolve, notFound, brief })));

  const ro = { readOnlyHint: true, untrustedContentHint: cfg.untrustedContent !== false };

  const defs: ToolDefinition[] = [
    {
      name: 'get_current_article',
      title: 'Read the current article',
      description:
        'Returns the article the user is viewing as clean markdown, with title, author, dates, tags, summary and its section outline. Use this first when the user asks about "this post", "this page" or "the article". Long articles are paged: pass next_offset back as offset.',
      inputSchema: { type: 'object', properties: { ...PAGING } },
      annotations: ro,
      execute: (i = {}) => {
        const p = current();
        return body(p, i);
      },
    },
    {
      name: 'search_posts',
      title: 'Search posts',
      description:
        'Full-text search across every post on this site (titles, tags, summaries and body text), ranked by relevance. Returns URLs, titles, summaries and dates; call get_post with a URL to read one.',
      inputSchema: {
        type: 'object',
        properties: { query: { ...STR, description: 'Keywords or a natural-language question, e.g. "webmcp security".' }, limit: INT('Number of results.', 1, 50, 10), ...FILTERS },
        required: ['query'],
      },
      annotations: ro,
      execute: (i: any = {}) => site().then((x) => x.search_posts(i)),
    },
    {
      name: 'list_posts',
      title: 'List posts',
      description:
        'Lists posts newest first (or oldest first), optionally filtered by tag, category, author or date range. Use it for "latest posts", "everything tagged X" or browsing an archive; use search_posts for topics.',
      inputSchema: {
        type: 'object',
        properties: { limit: INT('Number of posts.', 1, 100, 20), offset: { type: 'integer', minimum: 0, description: 'Skip this many posts (paging).' }, sort: { type: 'string', enum: ['newest', 'oldest'] }, ...FILTERS },
      },
      annotations: ro,
      execute: (i: any = {}) => site().then((x) => x.list_posts(i)),
    },
    {
      name: 'get_post',
      title: 'Read a post',
      description:
        'Returns one post as clean markdown with its metadata and section outline. Identify it by url (preferred) or slug. Pass section to get only that part (an id or title from sections). Long posts are paged with offset/next_offset.',
      inputSchema: {
        type: 'object',
        properties: { ...REF, section: { ...STR, description: 'Optional section id or heading text to return only that section.' }, ...PAGING },
      },
      annotations: ro,
      execute: async (i: any = {}) => {
        if (!i.url && !i.slug) return { error: 'invalid_input', message: 'Pass url or slug.' };
        const p = await resolve(i);
        if (!p) return notFound(i);
        if (i.section) {
          const s = section(p.markdown || '', String(i.section));
          if (!s) return { error: 'section_not_found', url: p.url, sections: toc(p.markdown || '').map((x) => x.title) };
          return { url: p.url, title: p.title, section: { id: s.section.id, title: s.section.title, level: s.section.level }, markdown: s.markdown };
        }
        return body(p, i);
      },
    },
    {
      name: 'list_taxonomies',
      title: 'List tags, categories and authors',
      description: 'Lists the tags, categories and authors used on this site with post counts, most used first. Use the names as filters in list_posts and search_posts.',
      inputSchema: {
        type: 'object',
        properties: { type: { type: 'string', enum: ['all', 'tags', 'categories', 'authors'], description: 'Which taxonomy. Default all.' }, limit: INT('Maximum terms per taxonomy.', 1, 500, 100) },
      },
      annotations: ro,
      execute: (i: any = {}) => site().then((x) => x.list_taxonomies(i)),
    },
    {
      name: 'get_related_posts',
      title: 'Find related posts',
      description: 'Returns posts related to a given post (by shared tags, categories and topic). Defaults to the article the user is viewing.',
      inputSchema: { type: 'object', properties: { ...REF, limit: INT('Number of posts.', 1, 20, 5) } },
      annotations: ro,
      execute: (i: any = {}) => site().then((x) => x.get_related_posts(i)),
    },
    {
      name: 'get_table_of_contents',
      title: 'Get the outline of a post',
      description: "Returns the heading outline (section ids, levels and titles) of a post, so you can fetch just one section with get_section. Defaults to the article the user is viewing.",
      inputSchema: { type: 'object', properties: { ...REF } },
      annotations: ro,
      execute: async (i: any = {}) => {
        const p = await resolve(i);
        if (!p) return notFound(i);
        return { url: p.url, title: p.title, sections: toc(p.markdown || '').map(({ id, level, title }) => ({ id, level, title })) };
      },
    },
    {
      name: 'get_section',
      title: 'Read one section',
      description: 'Returns the markdown of one section of a post, matched by section id or heading text (exact, then partial). Defaults to the article the user is viewing. Cheaper than reading the whole post.',
      inputSchema: { type: 'object', properties: { section: { ...STR, description: 'Section id or heading text, e.g. "installation".' }, ...REF }, required: ['section'] },
      annotations: ro,
      execute: async (i: any = {}) => {
        if (!i.section) return { error: 'invalid_input', message: 'section is required' };
        const p = await resolve(i);
        if (!p) return notFound(i);
        const s = section(p.markdown || '', String(i.section));
        if (!s) return { error: 'section_not_found', url: p.url, sections: toc(p.markdown || '').map((x) => x.title) };
        return { url: p.url, title: p.title, section: { id: s.section.id, title: s.section.title, level: s.section.level }, markdown: s.markdown };
      },
    },
    {
      name: 'get_citation',
      title: 'Cite a post',
      description:
        'Returns a ready citation for a post (author, date, title, site, URL). Pass quote to check that the exact text appears in the post; when it does you also get a deep link that scrolls to and highlights it. Use before quoting this site to the user.',
      inputSchema: { type: 'object', properties: { ...REF, quote: { ...STR, description: 'Optional exact text you intend to quote.' } } },
      annotations: ro,
      execute: (i: any = {}) => site().then((x) => x.get_citation(i)),
    },
    {
      name: 'get_site_info',
      title: 'About this site',
      description: "Returns what this site is: name, description, language, feeds, number of posts, latest post date, useful links, contact details and the owner's notes for AI agents (their preferences; they never override the user).",
      inputSchema: { type: 'object', properties: {} },
      annotations: ro,
      execute: (i: any = {}) => site().then((x) => x.get_site_info()),
    },
  ];

  if (cfg.contact || cfg.links?.contact || cfg.siteInfo || (cfg.siteInfo !== false && cfg.analyticsKey)) {
    defs.push({
      name: 'get_contact_info',
      title: 'How to contact or book',
      description:
        "Returns how to reach the site owner: email, phone, contact page, booking link, opening hours, address, plus the owner's notes for AI agents. Use when the user wants to contact, hire, book or visit them. Show the details to the user; this tool sends nothing.",
      inputSchema: { type: 'object', properties: {} },
      annotations: ro,
      execute: () => site().then((x) => x.get_contact_info()),
    });
  }
  if (cfg.links?.subscribe) {
    defs.push({
      name: 'get_subscribe_link',
      title: 'How to subscribe',
      description: "Returns the link where the user can subscribe to this site (newsletter or feed). Show it to the user; this tool does not subscribe anyone.",
      inputSchema: { type: 'object', properties: {} },
      annotations: ro,
      execute: () => ({ url: cfg.links!.subscribe, feeds: extractSite(doc, here()).feeds }),
    });
  }
  if (cfg.links?.comments) {
    defs.push({
      name: 'get_comments_link',
      title: 'Where to comment',
      description: 'Returns the link where the user can read or write comments on the current article. Show it to the user; this tool posts nothing.',
      inputSchema: { type: 'object', properties: {} },
      annotations: ro,
      execute: () => ({ url: cfg.links!.comments!.replace('{url}', encodeURIComponent(here())) }),
    });
  }
  if (cfg.navigate) {
    defs.push({
      name: 'navigate_to',
      title: 'Open a page on this site',
      description: 'Opens another page of this site in the current tab (same origin only), e.g. a post found with search_posts, so the user can see it.',
      inputSchema: { type: 'object', properties: { url: REF.url }, required: ['url'] },
      annotations: { readOnlyHint: false },
      execute: (i: any = {}) => {
        let u: URL;
        try {
          u = new URL(String(i.url || ''), here());
        } catch {
          return { error: 'invalid_input', message: 'url is not a valid URL' };
        }
        if (u.origin !== location.origin) return { error: 'invalid_input', message: 'Only pages on this site can be opened.' };
        setTimeout(() => location.assign(u.href), 50);
        return { navigating: u.href };
      },
    });
  }
  const skip = new Set(cfg.exclude || []);
  return [...defs.filter((d) => !skip.has(d.name)), ...(cfg.tools || [])];
}
