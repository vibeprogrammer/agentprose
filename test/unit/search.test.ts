import { describe, it, expect } from 'vitest';
import { SearchIndex, tokenize } from '../../src/core/search';

const posts = [
  { url: 'https://ex.com/1', title: 'Getting started with WebMCP', tags: ['webmcp', 'intro'], summary: 'Register your first tool', published: '2026-10-01' },
  { url: 'https://ex.com/2', title: 'Caching strategies for service workers', tags: ['pwa'], summary: 'Offline first', published: '2026-09-01' },
  { url: 'https://ex.com/3', title: 'A café in Oslo', tags: ['travel'], summary: 'Coffee notes', published: '2026-08-01' },
  { url: 'https://ex.com/4', title: 'WebMCP security model', tags: ['webmcp', 'security'], summary: 'Untrusted content and prompt injection', published: '2026-10-05' },
];
const bodies = ['tools tools tools', 'service worker cache api, mentions webmcp once', 'espresso', 'security security'];

describe('tokenize', () => {
  it('lowercases, folds accents, drops stopwords and plurals', () => {
    expect(tokenize('The Cafés of Oslo')).toEqual(['cafe', 'oslo']);
    expect(tokenize('Strategies and caches')).toEqual(['strategy', 'cache']);
  });
});

describe('SearchIndex', () => {
  const idx = new SearchIndex(posts, bodies);
  it('ranks title and tag matches above body mentions', () => {
    const r = idx.search('webmcp');
    expect(r.map((h) => h.post.url).slice(0, 2).sort()).toEqual(['https://ex.com/1', 'https://ex.com/4']);
    expect(r[r.length - 1].post.url).toBe('https://ex.com/2');
  });
  it('rewards matching every term', () => {
    expect(idx.search('webmcp security')[0].post.url).toBe('https://ex.com/4');
  });
  it('matches the last term as a prefix while typing', () => {
    expect(idx.search('webm')[0].post.title).toContain('WebMCP');
  });
  it('folds accents in queries', () => {
    expect(idx.search('cafe')[0].post.url).toBe('https://ex.com/3');
  });
  it('returns nothing for empty or unknown queries', () => {
    expect(idx.search('')).toEqual([]);
    expect(idx.search('zzzz')).toEqual([]);
  });
  it('finds related posts by shared tags first', () => {
    expect(idx.related(0)[0].post.url).toBe('https://ex.com/4');
  });
});
