// Dogfooding: builds this site's own agentprose index (agentprose.json, per-page Markdown, llms.txt) with the
// published agentprose CLI, so the agentprose script on every page serves the docs to AI agents.
// Run after `astro build`. Uses SITE_URL (the same value astro.config.mjs uses) as the base URL.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const SITE_URL = new URL(process.env.SITE_URL || 'https://salnikov.no/agentprose/');
if (SITE_URL.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(SITE_URL.hostname)) SITE_URL.protocol = 'https:';
const cli = join(dirname(require.resolve('agentprose/package.json')), 'dist/cli.js');
const args = [cli, 'build', 'dist', '--all', '--base-url', SITE_URL.href, '--content', '.sl-markdown-content',
  '--exclude', '/reference/api/', '--site', 'agentprose.site.json', '--llms'];
const r = spawnSync(process.execPath, args, { stdio: 'inherit' });
process.exit(r.status ?? 1);
