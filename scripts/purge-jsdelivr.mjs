#!/usr/bin/env node
// Purges jsDelivr's cache for agentprose's moving channels (@0 and @0.1 by default), so they serve the version that
// was just published right away instead of within 12 hours. The file list comes from dist/ (run `npm run build`
// first), so it stays right when files are added: the core, the engine, the inspector and every adapter. The core
// loads those from its own folder, so all of them are purged together.
//
//   node scripts/purge-jsdelivr.mjs              purge @0 and @0.1, then check what they resolve to
//   node scripts/purge-jsdelivr.mjs 0 0.1 latest choose the channels
//   node scripts/purge-jsdelivr.mjs --dry-run    print the URLs only
import { readdirSync, readFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const channels = args.filter((a) => !a.startsWith('--'));
if (!channels.length) channels.push('0', '0.1');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
if (!existsSync('dist/agentprose.min.js')) {
  console.error('dist/ is missing: run `npm run build` first.');
  process.exit(1);
}
const files = [
  ...readdirSync('dist').filter((f) => /^agentprose.*\.min\.js$/.test(f)),
  ...readdirSync('dist/adapters').filter((f) => f.endsWith('.min.js')).map((f) => `adapters/${f}`),
];

let failed = 0;
for (const ch of channels) {
  console.log(`\nagentprose@${ch} (${files.length} files)`);
  for (const f of files) {
    const url = `https://purge.jsdelivr.net/npm/${pkg.name}@${ch}/dist/${f}`;
    if (dry) {
      console.log('  ' + url);
      continue;
    }
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
      const body = await r.json().catch(() => ({}));
      const ok = r.ok && body.status !== 'failed';
      if (!ok) failed++;
      console.log(`  ${ok ? 'ok    ' : 'FAILED'} ${f} -> ${body.status || r.status}`);
    } catch (e) {
      failed++;
      console.log(`  FAILED ${f} -> ${e.message}`);
    }
  }
}
if (dry) process.exit(0);

// What each channel resolves to now, and the banner of the file jsDelivr serves.
console.log(`\nnpm package.json version: ${pkg.version}`);
for (const ch of channels) {
  try {
    const res = await fetch(`https://data.jsdelivr.com/v1/packages/npm/${pkg.name}/resolved?specifier=${ch}`, { signal: AbortSignal.timeout(30000) }).then((r) => r.json());
    const head = (await fetch(`https://cdn.jsdelivr.net/npm/${pkg.name}@${ch}/dist/agentprose.min.js`, { signal: AbortSignal.timeout(30000) }).then((r) => r.text())).split('\n')[0];
    console.log(`@${ch} resolves to ${res.version}; served file: ${head}`);
  } catch (e) {
    console.log(`@${ch}: check failed (${e.message}); try again in a minute`);
  }
}
if (failed) {
  console.error(`\n${failed} purge request(s) failed; run the script again.`);
  process.exit(1);
}
