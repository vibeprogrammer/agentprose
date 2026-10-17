// Rich-text → markdown renderers for CMS body formats. Small and forgiving: unknown nodes keep their text.

const marks = (t: string, m: string[]): string => {
  if (!t.trim()) return t;
  let s = t;
  if (m.includes('code')) s = '`' + s + '`';
  if (m.includes('bold') || m.includes('strong')) s = `**${s}**`;
  if (m.includes('italic') || m.includes('em')) s = `*${s}*`;
  if (m.includes('strike') || m.includes('strikethrough')) s = `~~${s}~~`;
  return s;
};

const tidy = (s: string) => s.replace(/\n{3,}/g, '\n\n').trim();

/** Sanity Portable Text (https://portabletext.org). Image blocks need `url` projected (asset->url). */
export function portableText(blocks: any[] = []): string {
  let out = '';
  let n = 0;
  for (const b of blocks || []) {
    if (b._type === 'image') {
      out += `\n![${b.alt || ''}](${b.url || b.asset?.url || ''})\n\n`;
      continue;
    }
    if (b._type === 'code') {
      out += `\n\`\`\`${b.language || ''}\n${b.code || ''}\n\`\`\`\n\n`;
      continue;
    }
    if (b._type !== 'block') continue;
    const defs = Object.fromEntries((b.markDefs || []).map((d: any) => [d._key, d]));
    const text = (b.children || [])
      .map((c: any) => {
        const ms: string[] = c.marks || [];
        let t = marks(c.text || '', ms.filter((m) => !defs[m]));
        const link = ms.map((m) => defs[m]).find((d) => d?._type === 'link');
        if (link?.href) t = `[${t}](${link.href})`;
        return t;
      })
      .join('');
    if (b.listItem) {
      n = b.listItem === 'number' ? n + 1 : 0;
      out += `${'  '.repeat((b.level || 1) - 1)}${b.listItem === 'number' ? n + '.' : '-'} ${text}\n`;
      continue;
    }
    n = 0;
    const st = b.style || 'normal';
    out += /^h[1-6]$/.test(st) ? `\n${'#'.repeat(+st[1])} ${text}\n\n` : st === 'blockquote' ? `\n> ${text}\n\n` : `\n${text}\n\n`;
  }
  return tidy(out);
}

/** Contentful Rich Text (nodeType tree). `assets` maps asset id → URL for embedded-asset-block. */
export function contentfulRichText(doc: any, assets: Record<string, { url?: string; title?: string }> = {}): string {
  const node = (n: any, depth = 0, idx = 0, ordered = false): string => {
    const kids = (sep = '') => (n.content || []).map((c: any, i: number) => node(c, depth, i, ordered)).join(sep);
    switch (n.nodeType) {
      case 'document': return kids();
      case 'text': return marks(n.value || '', (n.marks || []).map((m: any) => m.type));
      case 'paragraph': return `\n${kids()}\n\n`;
      case 'heading-1': case 'heading-2': case 'heading-3': case 'heading-4': case 'heading-5': case 'heading-6':
        return `\n${'#'.repeat(+n.nodeType.slice(-1))} ${kids()}\n\n`;
      case 'unordered-list': case 'ordered-list':
        return '\n' + (n.content || []).map((c: any, i: number) => node(c, depth + 1, i, n.nodeType === 'ordered-list')).join('') + '\n';
      case 'list-item': {
        const body = (n.content || []).map((c: any) => node(c, depth, 0, ordered)).join('').trim().replace(/\n\n+/g, '\n');
        return `${'  '.repeat(depth - 1)}${ordered ? idx + 1 + '.' : '-'} ${body}\n`;
      }
      case 'blockquote': return '\n' + kids().trim().split('\n').map((l: string) => '> ' + l).join('\n') + '\n\n';
      case 'hr': return '\n---\n\n';
      case 'hyperlink': return `[${kids()}](${n.data?.uri || ''})`;
      case 'entry-hyperlink': case 'asset-hyperlink': return kids();
      case 'embedded-asset-block': {
        const a = assets[n.data?.target?.sys?.id] || {};
        return a.url ? `\n![${a.title || ''}](${a.url.startsWith('//') ? 'https:' + a.url : a.url})\n\n` : '';
      }
      default: return kids();
    }
  };
  return tidy(node(doc || {}));
}

/** ProseMirror/TipTap-style JSON (Storyblok richtext). */
export function proseMirror(doc: any): string {
  const node = (n: any, depth = 0, idx = 0, ordered = false): string => {
    const kids = () => (n.content || []).map((c: any, i: number) => node(c, depth, i, ordered)).join('');
    switch (n.type) {
      case 'doc': return kids();
      case 'text': {
        const ms = (n.marks || []).map((m: any) => m.type);
        let t = marks(n.text || '', ms);
        const link = (n.marks || []).find((m: any) => m.type === 'link');
        if (link?.attrs?.href) t = `[${t}](${link.attrs.href})`;
        return t;
      }
      case 'paragraph': return `\n${kids()}\n\n`;
      case 'heading': return `\n${'#'.repeat(n.attrs?.level || 2)} ${kids()}\n\n`;
      case 'bullet_list': case 'ordered_list':
        return '\n' + (n.content || []).map((c: any, i: number) => node(c, depth + 1, i, n.type === 'ordered_list')).join('') + '\n';
      case 'list_item': return `${'  '.repeat(depth - 1)}${ordered ? idx + 1 + '.' : '-'} ${kids().trim().replace(/\n\n+/g, '\n')}\n`;
      case 'blockquote': return '\n' + kids().trim().split('\n').map((l: string) => '> ' + l).join('\n') + '\n\n';
      case 'code_block': return `\n\`\`\`${n.attrs?.class?.replace('language-', '') || ''}\n${(n.content || []).map((c: any) => c.text).join('')}\n\`\`\`\n\n`;
      case 'horizontal_rule': return '\n---\n\n';
      case 'hard_break': return '  \n';
      case 'image': return `![${n.attrs?.alt || ''}](${n.attrs?.src || ''})`;
      default: return kids();
    }
  };
  return tidy(node(doc || {}));
}

/** Strapi 5 Blocks editor JSON. */
export function strapiBlocks(blocks: any[] = []): string {
  const inline = (cs: any[] = []): string =>
    cs.map((c) => (c.type === 'link' ? `[${inline(c.children)}](${c.url})` : marks(c.text || '', Object.keys(c).filter((k) => c[k] === true)))).join('');
  let out = '';
  for (const b of blocks || []) {
    switch (b.type) {
      case 'heading': out += `\n${'#'.repeat(b.level || 2)} ${inline(b.children)}\n\n`; break;
      case 'list': out += '\n' + (b.children || []).map((li: any, i: number) => `${b.format === 'ordered' ? i + 1 + '.' : '-'} ${inline(li.children)}`).join('\n') + '\n\n'; break;
      case 'quote': out += `\n> ${inline(b.children)}\n\n`; break;
      case 'code': out += `\n\`\`\`${b.language || ''}\n${inline(b.children)}\n\`\`\`\n\n`; break;
      case 'image': out += `\n![${b.image?.alternativeText || ''}](${b.image?.url || ''})\n\n`; break;
      default: out += `\n${inline(b.children)}\n\n`;
    }
  }
  return tidy(out);
}
