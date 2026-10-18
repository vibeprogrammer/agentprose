/**
 * Where agentprose Cloud lives for a script tag.
 *
 * - `data-cloud="https://host"` always wins (`data-cloud="false"` turns the Cloud off).
 * - Without `data-cloud`, a script with `data-key` that was served by an agentprose Cloud
 *   (for example `https://cloud.example/v/0/agentprose.min.js`) uses that origin, so the
 *   snippet a Cloud hands out needs only `src` and `data-key`.
 * - Public CDNs (jsDelivr, unpkg) and the page's own origin are never treated as a Cloud:
 *   the Cloud stays off there, with a console warning that `data-cloud` is needed.
 * - A `data-key` that belongs to a CMS adapter (`data-adapter`), or an explicit
 *   `data-analytics` / `data-search-endpoint`, never triggers the inference.
 */
export interface CloudAttrs {
  cloud?: string;
  key?: string;
  adapter?: string;
  analytics?: string;
  searchEndpoint?: string;
}

/** Returns the Cloud base URL (no trailing slash), or undefined when the Cloud is off. */
export function cloudBase(d: CloudAttrs, src?: string | null, pageOrigin?: string): string | undefined {
  let c = d.cloud;
  if (!d.key || d.adapter) return;
  if (c == null && !d.analytics && !d.searchEndpoint && src) {
    const u = new URL(src);
    if (/jsdelivr|unpkg/.test(u.host)) console.warn('[agentprose] add data-cloud');
    else if (u.origin != pageOrigin) c = u.origin;
  }
  return c && c != 'false' ? c.replace(/\/+$/, '') : undefined;
}
