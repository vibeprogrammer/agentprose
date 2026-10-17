import { abs, clean } from './util';

/** Elements that never carry article content. */
export const NOISE =
  'script,style,noscript,template,iframe,object,embed,canvas,svg,form,button,input,select,textarea,nav,aside,footer,dialog,body>header,.site-header,[role=banner],[role=navigation],[role=complementary],[role=contentinfo],[hidden],[aria-hidden="true"],.sr-only,.visually-hidden,[data-agent-ignore],.share,.sharing,.social,.related,.comments,#comments,.advert,.ads,.ad,.adsbygoogle,.newsletter,.subscribe,.cookie,.breadcrumbs,.post-nav,.pagination,.toc,.table-of-contents';

const BLOCK = /^(P|DIV|SECTION|ARTICLE|MAIN|HEADER|FIGURE|FIGCAPTION|UL|OL|LI|BLOCKQUOTE|PRE|TABLE|H[1-6]|HR|DL|DT|DD|DETAILS|SUMMARY)$/;

function esc(s: string): string {
  return s.replace(/([\\`*_[\]])/g, '\\$1');
}

/** Converts an element subtree to GitHub-flavoured markdown. Small, dependency-free, deterministic. */
export function toMarkdown(root: Element, base: string): string {
  const out = inner(root, base, 0).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

function inner(el: Element | Node, base: string, depth: number): string {
  let s = '';
  el.childNodes.forEach((n) => (s += node(n, base, depth)));
  return s;
}

function node(n: Node, base: string, depth: number): string {
  if (n.nodeType === 3) {
    const t = (n.textContent || '').replace(/\s+/g, ' ');
    return esc(t);
  }
  if (n.nodeType !== 1) return '';
  const e = n as Element;
  const tag = e.tagName.toUpperCase();
  const kids = () => inner(e, base, depth);
  switch (tag) {
    case 'H1': case 'H2': case 'H3': case 'H4': case 'H5': case 'H6': {
      const t = clean(kids());
      return t ? `\n\n${'#'.repeat(+tag[1])} ${t}\n\n` : '';
    }
    case 'P': case 'SECTION': case 'ARTICLE': case 'MAIN': case 'HEADER': case 'FIGURE': case 'DETAILS': case 'DL':
      return `\n\n${kids().trim()}\n\n`;
    case 'DIV': case 'SPAN': case 'TIME': case 'ABBR': case 'SMALL': case 'MARK': case 'CITE': case 'U': case 'SUP': case 'SUB': case 'LABEL':
      return BLOCK.test(tag) ? `\n${kids()}\n` : kids();
    case 'FIGCAPTION': case 'SUMMARY': case 'DT':
      return `\n\n*${clean(kids())}*\n\n`;
    case 'DD':
      return `\n: ${clean(kids())}\n`;
    case 'BR':
      return '  \n';
    case 'HR':
      return '\n\n---\n\n';
    case 'STRONG': case 'B': {
      const t = kids().trim();
      return t ? `**${t}**` : '';
    }
    case 'EM': case 'I': {
      const t = kids().trim();
      return t ? `*${t}*` : '';
    }
    case 'DEL': case 'S':
      return `~~${kids().trim()}~~`;
    case 'CODE': {
      const t = e.textContent || '';
      const f = t.includes('`') ? '``' : '`';
      return `${f}${t}${f}`;
    }
    case 'PRE': {
      const code = e.querySelector('code') || e;
      const m = ((code.getAttribute('class') || '') + ' ' + (e.getAttribute('class') || '')).match(/(?:language|lang)-([\w+#-]+)/) || [];
      const lang = m[1] || e.getAttribute('data-lang') || '';
      return `\n\n\`\`\`${lang}\n${(code.textContent || '').replace(/\n$/, '')}\n\`\`\`\n\n`;
    }
    case 'A': {
      const t = clean(kids());
      const href = e.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return t;
      const u = abs(href, base);
      return t ? `[${t}](${u})` : '';
    }
    case 'IMG': {
      const src = e.getAttribute('src') || e.getAttribute('data-src') || '';
      if (!src || src.startsWith('data:')) return '';
      return `![${clean(e.getAttribute('alt'))}](${abs(src, base)})`;
    }
    case 'PICTURE': {
      const img = e.querySelector('img');
      return img ? node(img, base, depth) : '';
    }
    case 'VIDEO': case 'AUDIO': {
      const src = e.getAttribute('src') || e.querySelector('source')?.getAttribute('src');
      return src ? `[${tag.toLowerCase()}](${abs(src, base)})` : '';
    }
    case 'BLOCKQUOTE':
      return '\n\n' + kids().trim().replace(/\n{3,}/g, '\n\n').split('\n').map((l) => (l.trim() ? '> ' + l : '>')).join('\n') + '\n\n';
    case 'UL': case 'OL': {
      let i = 0;
      const pad = '  '.repeat(depth);
      let s = '\n';
      e.childNodes.forEach((c) => {
        if (c.nodeType !== 1 || (c as Element).tagName.toUpperCase() !== 'LI') return;
        i++;
        const body = inner(c, base, depth + 1).trim().replace(/\n{2,}/g, '\n');
        s += `${pad}${tag === 'OL' ? i + '.' : '-'} ${body}\n`;
      });
      return depth ? s : s + '\n';
    }
    case 'LI':
      return `\n- ${clean(kids())}\n`;
    case 'TABLE':
      return table(e, base, depth);
    default:
      return kids();
  }
}

function table(t: Element, base: string, depth: number): string {
  const rows = [...t.querySelectorAll('tr')];
  if (!rows.length) return '';
  const cells = rows.map((r) => [...r.children].map((c) => clean(inner(c, base, depth)).replace(/\|/g, '\\|')));
  const n = Math.max(...cells.map((r) => r.length));
  const line = (r: string[]) => '| ' + Array.from({ length: n }, (_, i) => r[i] || '').join(' | ') + ' |';
  return '\n\n' + [line(cells[0]), line(Array(n).fill('---')), ...cells.slice(1).map(line)].join('\n') + '\n\n';
}
