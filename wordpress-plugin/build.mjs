// Builds the WordPress plugin from this repo's dist/ and zips it.
//   npm run build && node wordpress-plugin/build.mjs
// Output: wordpress-plugin/agentprose/js/ (git-ignored) and dist/wordpress/agentprose.zip
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const POLYFILL = '@mcp-b/webmcp-polyfill';
const POLYFILL_VERSION = '6.0.3'; // keep in step with POLYFILL_URL in src/index.ts

const plugin = 'wordpress-plugin/agentprose';
const js = `${plugin}/js`;
rmSync(js, { recursive: true, force: true });
mkdirSync(`${js}/adapters`, { recursive: true });
mkdirSync(`${js}/vendor`, { recursive: true });

for (const f of ['agentprose.min.js', 'agentprose.index.min.js', 'agentprose.inspector.min.js']) {
  if (!existsSync(`dist/${f}`)) throw new Error(`dist/${f} missing: run npm run build first`);
  cpSync(`dist/${f}`, `${js}/${f}`);
}
cpSync('dist/adapters/wordpress.min.js', `${js}/adapters/wordpress.min.js`);

// The WebMCP polyfill (MIT), served from the site itself when the owner enables it.
let pkgDir;
try {
  pkgDir = join(createRequire(import.meta.url).resolve(`${POLYFILL}/package.json`), '..');
  const v = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')).version;
  if (v !== POLYFILL_VERSION) pkgDir = undefined;
} catch {
  pkgDir = undefined;
}
if (!pkgDir) {
  const tmp = mkdtempSync(join(tmpdir(), 'ap-poly-'));
  const url = `https://registry.npmjs.org/${POLYFILL}/-/webmcp-polyfill-${POLYFILL_VERSION}.tgz`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  writeFileSync(join(tmp, 'p.tgz'), Buffer.from(await res.arrayBuffer()));
  execFileSync('tar', ['xzf', 'p.tgz'], { cwd: tmp });
  pkgDir = join(tmp, 'package');
}
cpSync(join(pkgDir, 'dist/index.iife.js'), `${js}/vendor/webmcp-polyfill.iife.js`);
cpSync(join(pkgDir, 'LICENSE'), `${js}/vendor/webmcp-polyfill.LICENSE.txt`);

mkdirSync('dist/wordpress', { recursive: true });
rmSync('dist/wordpress/agentprose.zip', { force: true });
execFileSync('zip', ['-qr', '-X', '../dist/wordpress/agentprose.zip', 'agentprose', '-x', 'agentprose/.*', '-x', '*/.DS_Store'], { cwd: 'wordpress-plugin' });
console.log('wordpress plugin → dist/wordpress/agentprose.zip');
