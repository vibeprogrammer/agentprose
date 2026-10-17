import { describe, it, expect } from 'vitest';
import { toMarkdown } from '../../src/core/markdown';
import { html } from './helpers';

const md = (body: string) => toMarkdown(html(`<div id="r">${body}</div>`).getElementById('r')!, 'https://ex.com/blog/post/');

describe('toMarkdown', () => {
  it('converts headings, paragraphs and inline marks', () => {
    expect(md('<h2>Title</h2><p>Some <strong>bold</strong>, <em>em</em> and <code>code</code>.</p>')).toBe('## Title\n\nSome **bold**, *em* and `code`.');
  });
  it('keeps code blocks with language and exact content', () => {
    expect(md('<pre><code class="language-ts">const a = 1;\nconst b = a * 2;\n</code></pre>')).toBe('```ts\nconst a = 1;\nconst b = a * 2;\n```');
  });
  it('makes links and images absolute and drops javascript: links', () => {
    const out = md('<p><a href="../other/">x</a> <a href="javascript:alert(1)">y</a> <img src="/i.png" alt="A"></p>');
    expect(out).toContain('[x](https://ex.com/blog/other/)');
    expect(out).toContain('y');
    expect(out).not.toContain('javascript:');
    expect(out).toContain('![A](https://ex.com/i.png)');
  });
  it('renders nested and ordered lists', () => {
    const out = md('<ul><li>a<ul><li>b</li></ul></li><li>c</li></ul><ol><li>one</li><li>two</li></ol>');
    expect(out).toContain('- a\n  - b');
    expect(out).toContain('- c');
    expect(out).toContain('1. one\n2. two');
  });
  it('renders tables as GFM with escaped pipes', () => {
    const out = md('<table><tr><th>A</th><th>B</th></tr><tr><td>1|2</td><td>3</td></tr></table>');
    expect(out).toBe('| A | B |\n| --- | --- |\n| 1\\|2 | 3 |');
  });
  it('quotes blockquotes line by line', () => {
    expect(md('<blockquote><p>one</p><p>two</p></blockquote>')).toBe('> one\n>\n> two');
  });
  it('escapes markdown characters in text', () => {
    expect(md('<p>2*3 and [x]</p>')).toBe('2\\*3 and \\[x\\]');
  });
});
