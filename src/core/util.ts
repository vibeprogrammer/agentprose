export const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

export function abs(u: string | null | undefined, base: string): string | undefined {
  if (!u) return undefined;
  try {
    return new URL(u.trim(), base).href;
  } catch {
    return undefined;
  }
}

/** Canonical form used to compare URLs: no hash, no trailing slash, no index.html. */
export function norm(u: string): string {
  try {
    const x = new URL(u);
    x.hash = '';
    x.search = '';
    return (x.origin + x.pathname.replace(/\/index\.html?$/, '/').replace(/\/+$/, '')).toLowerCase();
  } catch {
    return u.toLowerCase();
  }
}

export function slugOf(u: string): string {
  try {
    const parts = new URL(u).pathname.replace(/\/index\.html?$/, '').replace(/\.html?$/, '').split('/').filter(Boolean);
    return decodeURIComponent(parts[parts.length - 1] || '');
  } catch {
    return '';
  }
}

export function clean(s: string | null | undefined): string {
  return (s || '').replace(/\s+/g, ' ').trim();
}

export function iso(d: string | null | undefined): string | undefined {
  if (!d) return undefined;
  const t = Date.parse(d);
  return isNaN(t) ? undefined : new Date(t).toISOString();
}

export function uniq<T>(a: (T | undefined | null | '')[]): T[] {
  return [...new Set(a.filter(Boolean) as T[])];
}

export function words(s: string): number {
  const m = s.match(/\S+/g);
  return m ? m.length : 0;
}

export function readingMinutes(text: string): number {
  return Math.max(1, Math.round(words(text) / 230));
}

export function stripHtml(h: string): string {
  return clean(h.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'"));
}

export function parseHtml(h: string): Document {
  return new DOMParser().parseFromString(h, 'text/html');
}

export function sameOrigin(u: string, base: string): boolean {
  try {
    return new URL(u, base).origin === new URL(base).origin;
  } catch {
    return false;
  }
}

/** Cut text at a paragraph/line boundary near max; return the cut text and the next offset. */
export function window_(text: string, offset: number, max: number): { text: string; next?: number } {
  if (offset >= text.length) return { text: '' };
  let end = Math.min(text.length, offset + max);
  if (end < text.length) {
    const para = text.lastIndexOf('\n\n', end);
    if (para > offset + max * 0.5) end = para;
  }
  return { text: text.slice(offset, end), next: end < text.length ? end : undefined };
}

export async function fetchText(url: string, signal?: AbortSignal): Promise<string | null> {
  try {
    const r = await fetch(url, { signal, credentials: 'same-origin', headers: { Accept: '*/*' } });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}
