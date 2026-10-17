// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../../src/cli/index';

let site: string;
let out: string;
beforeAll(() => {
  site = mkdtempSync(join(tmpdir(), 'readmcp-site-'));
  out = mkdtempSync(join(tmpdir(), 'readmcp-out-'));
  execFileSync('node', ['scripts/demo.mjs', 'https://blog.example/'], { env: { ...process.env, DEMO_OUT: site }, stdio: 'ignore' });
  rmSync(join(site, 'llms.txt'));
});

describe('readmcp build', () => {
  it('indexes article pages only, newest first, with sharded markdown', async () => {
    const r = await build(site, { 'base-url': 'https://blog.example', out, llms: true });
    expect(r.posts).toBe(6);
    const idx = JSON.parse(readFileSync(join(out, 'readmcp.json'), 'utf8'));
    expect(idx.version).toBe(1);
    expect(idx.site.name).toBe('readmcp demo blog');
    expect(idx.posts[0]).toMatchObject({ url: 'https://blog.example/posts/measuring-agent-traffic/', title: 'Measuring agent traffic with onToolCall', md: '/readmcp/posts/posts/measuring-agent-traffic.md' });
    expect(idx.posts.every((p: any) => !p.markdown && p.text.length > 100)).toBe(true);
    expect(idx.posts.some((p: any) => p.url.includes('/tags/'))).toBe(false);
    const md = readFileSync(join(out, 'readmcp/posts/posts/one-line-install.md'), 'utf8');
    expect(md).toMatch(/^# Installing readmcp/);
    expect(md).toContain('| `data-content` |');
    expect(readFileSync(join(out, 'llms.txt'), 'utf8')).toContain('- [Why agents should get markdown, not HTML](https://blog.example/posts/markdown-not-html/)');
  });
  it('supports --inline, --include and --all', async () => {
    const o2 = mkdtempSync(join(tmpdir(), 'readmcp-out2-'));
    const r = await build(site, { 'base-url': 'https://blog.example/', out: o2, inline: true, include: 'install' });
    expect(r.posts).toBe(1);
    const idx = JSON.parse(readFileSync(join(o2, 'readmcp.json'), 'utf8'));
    expect(idx.posts[0].markdown).toContain('## The one line');
    expect(existsSync(join(o2, 'readmcp/posts'))).toBe(false);
    const all = await build(site, { 'base-url': 'https://blog.example/', out: o2, all: true });
    expect(all.posts).toBeGreaterThan(6);
  });
  it('rejects a missing base URL', async () => {
    await expect(build(site, {})).rejects.toThrow(/base-url/);
  });
});
