import type { PostSummary } from './types';

const STOP = new Set(
  'a an and are as at be by for from has have how i in is it its of on or that the this to was were what when where which who why will with you your'.split(' '),
);

/** Lowercase, strip diacritics, split on non-letters, drop stopwords, light plural stemming. */
export function tokenize(s: string): string[] {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t && !STOP.has(t))
    .map((t) => (t.length > 4 && t.endsWith('ies') ? t.slice(0, -3) + 'y' : t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t));
}

const FIELDS: [keyof Doc, number][] = [
  ['title', 4],
  ['tags', 3],
  ['summary', 1.5],
  ['body', 1],
];

interface Doc {
  title: string[];
  tags: string[];
  summary: string[];
  body: string[];
}

export interface Hit {
  post: PostSummary;
  score: number;
}

/**
 * A small BM25F index over title, tags/categories/authors, summary and body text.
 * Last query term matches as a prefix ("webm" finds "webmcp"), so it works as you type.
 */
export class SearchIndex {
  private docs: Doc[] = [];
  private df = new Map<string, number>();
  private avg: Record<string, number> = { title: 1, tags: 1, summary: 1, body: 1 };
  constructor(public posts: PostSummary[], bodies: (string | undefined)[] = []) {
    const sums: Record<string, number> = { title: 0, tags: 0, summary: 0, body: 0 };
    posts.forEach((p, i) => {
      const d: Doc = {
        title: tokenize(p.title),
        tags: tokenize([...(p.tags || []), ...(p.categories || []), ...(p.authors || [])].join(' ')),
        summary: tokenize(p.summary || ''),
        body: tokenize((bodies[i] || '').slice(0, 20000)),
      };
      this.docs.push(d);
      for (const [f] of FIELDS) sums[f] += d[f].length;
      new Set([...d.title, ...d.tags, ...d.summary, ...d.body]).forEach((t) => this.df.set(t, (this.df.get(t) || 0) + 1));
    });
    const n = posts.length || 1;
    for (const [f] of FIELDS) this.avg[f] = sums[f] / n || 1;
  }

  private idf(t: string): number {
    const n = this.docs.length;
    const df = this.df.get(t) || 0;
    return Math.log(1 + (n - df + 0.5) / (df + 0.5));
  }

  search(query: string, limit = 10): Hit[] {
    const terms = tokenize(query);
    if (!terms.length) return [];
    const last = terms[terms.length - 1];
    const prefixTerms = last.length >= 3 ? [...this.df.keys()].filter((k) => k !== last && k.startsWith(last)).slice(0, 20) : [];
    const k1 = 1.2;
    const b = 0.75;
    const hits: Hit[] = [];
    this.docs.forEach((d, i) => {
      let score = 0;
      let matched = 0;
      for (const t of terms) {
        const variants = t === last ? [t, ...prefixTerms] : [t];
        let best = 0;
        for (const v of variants) {
          let tf = 0;
          for (const [f, w] of FIELDS) {
            const c = d[f].reduce((n, x) => n + (x === v ? 1 : 0), 0);
            if (c) tf += (w * c) / (1 - b + (b * d[f].length) / this.avg[f]);
          }
          if (tf) best = Math.max(best, (this.idf(v) * tf * (k1 + 1)) / (tf + k1) * (v === t ? 1 : 0.7));
        }
        if (best) matched++;
        score += best;
      }
      if (!score) return;
      // Reward covering every query term, and phrase matches in the title.
      score *= 0.5 + (0.5 * matched) / terms.length;
      if (this.posts[i].title.toLowerCase().includes(query.toLowerCase().trim())) score *= 1.5;
      hits.push({ post: this.posts[i], score });
    });
    return hits.sort((a, b) => b.score - a.score || (Date.parse(b.post.published || '') || 0) - (Date.parse(a.post.published || '') || 0)).slice(0, limit);
  }

  /** Posts most similar to posts[i]: shared tags/categories weigh most, then title and summary overlap. */
  related(i: number, limit = 5): Hit[] {
    const me = this.docs[i];
    if (!me) return [];
    const mine = new Set([...me.title, ...me.summary]);
    const myTags = new Set(me.tags);
    const hits: Hit[] = [];
    this.docs.forEach((d, j) => {
      if (j === i) return;
      let score = 0;
      d.tags.forEach((t) => myTags.has(t) && (score += 3 * this.idf(t)));
      new Set([...d.title, ...d.summary]).forEach((t) => mine.has(t) && (score += this.idf(t)));
      if (score > 0) hits.push({ post: this.posts[j], score });
    });
    return hits.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
