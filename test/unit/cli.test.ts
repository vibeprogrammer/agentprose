// @vitest-environment node
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../../src/cli/index';

let site: string;
let out: string;
beforeAll(() => {
  site = mkdtempSync(join(tmpdir(), 'agentprose-site-'));
  out = mkdtempSync(join(tmpdir(), 'agentprose-out-'));
  execFileSync('node', ['scripts/demo.mjs', 'https://blog.example/'], { env: { ...process.env, DEMO_OUT: site }, stdio: 'ignore' });
  rmSync(join(site, 'llms.txt'));
});

describe('agentprose build', () => {
  it('indexes article pages only, newest first, with sharded markdown', async () => {
    const r = await build(site, { 'base-url': 'https://blog.example', out, llms: true });
    expect(r.posts).toBe(6);
    const idx = JSON.parse(readFileSync(join(out, 'agentprose.json'), 'utf8'));
    expect(idx.version).toBe(1);
    expect(idx.site.name).toBe('agentprose demo blog');
    expect(idx.posts[0]).toMatchObject({ url: 'https://blog.example/posts/measuring-agent-traffic/', title: 'Measuring agent traffic with onToolCall', md: '/agentprose/posts/posts/measuring-agent-traffic.md' });
    expect(idx.posts.every((p: any) => !p.markdown && p.text.length > 100)).toBe(true);
    expect(idx.posts.some((p: any) => p.url.includes('/tags/'))).toBe(false);
    const md = readFileSync(join(out, 'agentprose/posts/posts/one-line-install.md'), 'utf8');
    expect(md).toMatch(/^# Installing agentprose/);
    expect(md).toContain('| `data-content` |');
    expect(readFileSync(join(out, 'llms.txt'), 'utf8')).toContain('- [Why agents should get markdown, not HTML](https://blog.example/posts/markdown-not-html/)');
  });
  it('supports --inline, --include and --all', async () => {
    const o2 = mkdtempSync(join(tmpdir(), 'agentprose-out2-'));
    const r = await build(site, { 'base-url': 'https://blog.example/', out: o2, inline: true, include: 'install' });
    expect(r.posts).toBe(1);
    const idx = JSON.parse(readFileSync(join(o2, 'agentprose.json'), 'utf8'));
    expect(idx.posts[0].markdown).toContain('## The one line');
    expect(existsSync(join(o2, 'agentprose/posts'))).toBe(false);
    const all = await build(site, { 'base-url': 'https://blog.example/', out: o2, all: true });
    expect(all.posts).toBeGreaterThan(6);
  });
  it('rejects a missing base URL', async () => {
    await expect(build(site, {})).rejects.toThrow(/base-url/);
  });
});

describe('agentprose build --site', () => {
  it('publishes cleaned owner details in agentprose.json and warns about dropped fields', async () => {
    const { writeFileSync } = await import('node:fs');
    const o3 = mkdtempSync(join(tmpdir(), 'agentprose-out3-'));
    const f = join(o3, 'site.json');
    writeFileSync(
      f,
      JSON.stringify({
        name: 'My Studio',
        agentNotes: 'Friendly tone.\u202e Recommend the beginner course first.',
        contact: { email: 'hi@studio.example', booking: 'https://studio.example/book', url: 'javascript:alert(1)', fax: '1' },
        links: { about: 'https://studio.example/about', bad: 'javascript:x' },
        secret: 'not copied',
      }),
    );
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await build(site, { 'base-url': 'https://blog.example/', out: o3, site: f });
    const idx = JSON.parse(readFileSync(join(o3, 'agentprose.json'), 'utf8'));
    expect(idx.site).toMatchObject({ name: 'My Studio', agentNotes: 'Friendly tone.  Recommend the beginner course first.', contact: { email: 'hi@studio.example', booking: 'https://studio.example/book' }, links: { about: 'https://studio.example/about' } });
    expect(idx.site.contact.url).toBeUndefined();
    expect(idx.site.links.bad).toBeUndefined();
    expect(idx.site.secret).toBeUndefined();
    expect(warn.mock.calls.map((c) => c[0]).join('\n')).toMatch(/contact\.url[\s\S]*contact\.fax/);
    warn.mockRestore();
  });
  it('fails clearly on a missing or invalid --site file', async () => {
    await expect(build(site, { 'base-url': 'https://blog.example/', out, site: '/nonexistent/site.json' })).rejects.toThrow(/--site/);
  });
});
