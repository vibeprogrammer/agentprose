import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { POLYFILL_URL, POLYFILL_SRI } from '../../src/index';

// The pinned MCP-B polyfill and its Subresource Integrity hash must describe exactly the same file. The npm package
// is a devDependency at the same exact version, so this check runs offline; the jsDelivr check below confirms the CDN
// serves those bytes (skipped only when the network is unreachable). Bumping the polyfill: change the version in
// POLYFILL_URL and in package.json together, then put the hash these tests print into POLYFILL_SRI.
const sri = (b: Buffer | Uint8Array) => 'sha384-' + createHash('sha384').update(b).digest('base64');
const pinned = POLYFILL_URL.match(/@mcp-b\/webmcp-polyfill@([^/]+)\/(.+)$/)!;

describe('pinned MCP-B polyfill', () => {
  it('names an exact version (no range) on jsDelivr', () => {
    expect(POLYFILL_URL).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/npm\/@mcp-b\/webmcp-polyfill@\d+\.\d+\.\d+\/dist\/index\.iife\.js$/);
  });

  it('matches the devDependency version', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    const installed = JSON.parse(readFileSync('node_modules/@mcp-b/webmcp-polyfill/package.json', 'utf8')).version;
    expect(pkg.devDependencies['@mcp-b/webmcp-polyfill']).toBe(pinned[1]);
    expect(installed).toBe(pinned[1]);
  });

  it('POLYFILL_SRI is the sha384 of that exact file (npm package)', () => {
    const file = readFileSync(`node_modules/@mcp-b/webmcp-polyfill/${pinned[2]}`);
    expect(sri(file), 'update POLYFILL_SRI in src/index.ts').toBe(POLYFILL_SRI);
  });

  it('jsDelivr serves exactly those bytes', async (ctx) => {
    let res: Response;
    try {
      res = await fetch(POLYFILL_URL, { signal: AbortSignal.timeout(15000) });
    } catch {
      return ctx.skip();
    }
    expect(res.status).toBe(200);
    expect(sri(new Uint8Array(await res.arrayBuffer()))).toBe(POLYFILL_SRI);
  }, 20000);
});
