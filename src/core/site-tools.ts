import type { Config, ContentAdapter, Post, PostSummary, SiteInfo } from './types';
import { extractSite } from './extract';
import { SearchIndex } from './search';
import { aggregate } from './source';
import { fetchText, norm, stripHtml } from './util';
import { mergeOwner } from './owner';

export interface SiteCtx {
  cfg: Config;
  src: ContentAdapter;
  doc: Document;
  here: () => string;
  current: () => Post;
  resolve: (i: { url?: string; slug?: string; id?: string }) => Promise<Post | null>;
  notFound: (i: unknown) => unknown;
  brief: (p: PostSummary) => PostSummary;
}

/** Executors of the site-wide tools. Part of the lazily loaded engine in the script-tag build. */
export function siteExec(ctx: SiteCtx) {
  const { cfg, src, doc, here, current, resolve, notFound, brief } = ctx;
  let indexP: Promise<SearchIndex> | undefined;
  const index = () =>
    (indexP ||= src.list({ limit: cfg.maxPosts ?? 2000 }).then((r) => {
      const posts = r.items as Post[];
      return new SearchIndex(posts, posts.map((p) => p.markdown || (p.html ? stripHtml(p.html) : (p as any).text)));
    })).catch((e) => {
      indexP = undefined;
      throw e;
    });
  // Owner details (notes for agents, contact) from the Cloud: fetched once, on the first call that needs them.
  let ownerP: Promise<any> | undefined;
  const owner = async (extra: any = {}) => {
    const u =
      cfg.siteInfo ??
      (cfg.analyticsKey && /\/v1\/collect$/.test(cfg.analytics || '') && cfg.analytics!.replace(/collect$/, 'site?key=' + encodeURIComponent(cfg.analyticsKey)));
    const cloud = await (ownerP ||= u
      ? fetchText(new URL(u, here()).href).then((t) => {
          try {
            return JSON.parse(t!);
          } catch {
            return {};
          }
        })
      : Promise.resolve({}));
    return mergeOwner(cfg, cloud, extra);
  };
  const links = () => Object.fromEntries(Object.entries(cfg.links || {}).filter(([, v]) => v)) as Record<string, string>;
  return {
    get_contact_info: async () => {
      let extra;
      try {
        extra = await src.site?.();
      } catch {
        /* sources unavailable */
      }
      const o = await owner(extra);
      const l = links();
      return o.contact || o.notesForAgents || l.contact
        ? { contact: o.contact, contactPage: l.contact, notesForAgents: o.notesForAgents }
        : { error: 'not_found', message: 'No contact details published for agents.' };
    },
    get_citation: async (i: any = {}) => {
        const p = await resolve(i);
        if (!p) return notFound(i);
        const siteName = extractSite(doc, here()).name;
        const year = p.published ? new Date(p.published).getUTCFullYear() : 'n.d.';
        const who = p.authors?.length ? p.authors.join(', ') : siteName || new URL(p.url).host;
        const out: Record<string, unknown> = { url: p.url, title: p.title, authors: p.authors, published: p.published, site: siteName, citation: `${who} (${year}). ${p.title}. ${siteName ? siteName + '. ' : ''}${p.url}` };
        if (i.quote) {
          const q = String(i.quote).replace(/\s+/g, ' ').trim();
          const plain = (p.markdown || '').replace(/\\([\\`*_[\]])/g, '$1').replace(/[*_`]/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ');
          out.found = q.length > 0 && plain.toLowerCase().includes(q.toLowerCase());
          if (out.found) out.quoteUrl = p.url.split('#')[0] + '#:~:text=' + encodeURIComponent(q.length > 80 ? q.slice(0, 40) : q).replace(/-/g, '%2D') + (q.length > 80 ? ',' + encodeURIComponent(q.slice(-30)).replace(/-/g, '%2D') : '');
        }
        return out;
      },
    search_posts: async (i: any = {}) => {
        const q = String(i.query || '').trim();
        if (!q) return { error: 'invalid_input', message: 'query is required' };
        const limit = Math.min(Math.max(i.limit || 10, 1), 50);
        const f = (p: PostSummary) =>
          (!i.tag || p.tags?.some((t) => t.toLowerCase() === String(i.tag).toLowerCase())) &&
          (!i.category || p.categories?.some((t) => t.toLowerCase() === String(i.category).toLowerCase())) &&
          (!i.author || p.authors?.some((t) => t.toLowerCase() === String(i.author).toLowerCase())) &&
          (!i.since || Date.parse(p.published || '') >= Date.parse(i.since)) &&
          (!i.until || Date.parse(p.published || '') <= Date.parse(i.until));
        if (cfg.searchEndpoint) {
          const u = new URL(cfg.searchEndpoint, here());
          u.searchParams.set('q', q);
          u.searchParams.set('limit', String(limit));
          try {
            const r = await fetch(u.href);
            if (r.ok) {
              const j = await r.json();
              const items: PostSummary[] = (j.items || j.results || []).filter(f);
              return { query: q, count: items.length, results: items.slice(0, limit).map(brief) };
            }
          } catch {
            /* endpoint unreachable, blocked or not JSON: fall back to the site's own search below */
          }
        }
        if (src.search) {
          try {
            const r = await src.search(q, { limit, tag: i.tag, category: i.category, author: i.author, since: i.since, until: i.until });
            return { query: q, count: r.items.length, results: r.items.map(brief) };
          } catch {
            /* backend search unavailable: rank locally below */
          }
        }
        const hits = (await index()).search(q, 200).filter((h) => f(h.post)).slice(0, limit);
        return { query: q, count: hits.length, results: hits.map((h) => ({ ...brief(h.post), score: +h.score.toFixed(3) })) };
      },
    list_posts: async (i: any = {}) => {
        const limit = Math.min(Math.max(i.limit || 20, 1), 100);
        const offset = Math.max(i.offset || 0, 0);
        const r = await src.list({ limit, offset, tag: i.tag, category: i.category, author: i.author, since: i.since, until: i.until, sort: i.sort === 'oldest' ? 'oldest' : 'newest' });
        const next = r.total !== undefined && offset + r.items.length < r.total ? offset + r.items.length : undefined;
        return { total: r.total, offset, items: r.items.map(brief), next_offset: next };
      },
    list_taxonomies: async (i: any = {}) => {
        const t = src.taxonomies ? await src.taxonomies() : aggregate((await src.list({ limit: cfg.maxPosts ?? 2000 })).items);
        const lim = i.limit || 100;
        const pick = (k: 'tags' | 'categories' | 'authors') => t[k].slice(0, lim).map(({ name, count, url }) => ({ name, count, url }));
        const type = i.type || 'all';
        return type === 'all' ? { tags: pick('tags'), categories: pick('categories'), authors: pick('authors') } : { [type]: pick(type) };
      },
    get_related_posts: async (i: any = {}) => {
        const idx = await index();
        const target = i.url || i.slug ? await resolve(i) : current();
        if (!target) return notFound(i);
        let at = idx.posts.findIndex((p) => norm(p.url) === norm(target.url));
        let ix = idx;
        if (at < 0) {
          ix = new SearchIndex([target, ...idx.posts]);
          at = 0;
        }
        return { url: target.url, title: target.title, related: ix.related(at, Math.min(i.limit || 5, 20)).map((h) => brief(h.post)) };
      },
    get_site_info: async () => {
        const page = extractSite(doc, here());
        let extra: Partial<SiteInfo> = {};
        let posts: PostSummary[] = [];
        try {
          extra = (await src.site?.()) || {};
          posts = (await src.list({ limit: cfg.maxPosts ?? 2000 })).items;
        } catch {
          /* sources unavailable; report what the page says */
        }
        const latest = posts.map((p) => p.published).filter(Boolean).sort().pop();
        const { agentNotes, contact, notesForAgents, ...rest } = extra as any;
        const info: SiteInfo & Record<string, unknown> = { ...page, ...Object.fromEntries(Object.entries(rest).filter(([, v]) => v)), url: extra.url || page.url } as any;
        const l = links();
        return { ...info, links: Object.keys(l).length ? l : undefined, ...(await owner(extra)), postCount: posts.length || undefined, latestPost: latest, contentSource: src.name };
      },
  };
}
