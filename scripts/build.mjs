// Builds every distributable with esbuild and reports gzipped sizes.
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const NAME = pkg.name;
const banner = { js: `/*! ${NAME} v${pkg.version} | MIT | https://github.com/${pkg.repository?.url?.match(/github\.com\/(.+?)(\.git)?$/)?.[1] || ''} */` };
const common = { bundle: true, minify: true, target: 'es2020', legalComments: 'none', banner, logLevel: 'warning', define: { __VERSION__: JSON.stringify(pkg.version) } };
const adapters = readdirSync('src/adapters').filter((f) => f.endsWith('.ts') && !['index.ts', 'types.ts'].includes(f) && !f.startsWith('_')).map((f) => f.replace('.ts', ''));

// The script-tag build loads the site-wide engine on demand (lib-lazy.ts) instead of bundling it.
const lazyLib = {
  name: 'lazy-lib',
  setup(b) {
    b.onResolve({ filter: /\/lib$/ }, () => ({ path: fileURLToPath(new URL('../src/core/lib-lazy.ts', import.meta.url)) }));
  },
};

const sharedShim = {
  name: 'shared-shim',
  setup(b) {
    b.onResolve({ filter: /^\.\/(extract|markdown)$/ }, (a) => (/(source|site-tools)\.ts$/.test(a.importer) ? { path: fileURLToPath(new URL('../src/core/shared-shim.ts', import.meta.url)) } : undefined));
  },
};

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/adapters', { recursive: true });

await Promise.all([
  // 1. The one-line script-tag build (IIFE) and its lazily loaded engine.
  build({ ...common, entryPoints: ['src/auto.ts'], format: 'iife', outfile: `dist/${NAME}.min.js`, sourcemap: true, plugins: [lazyLib], metafile: true }).then((r) => writeFileSync('dist/meta-core.json', JSON.stringify(r.metafile))),
  build({ ...common, entryPoints: ['src/index-lib.ts'], format: 'iife', outfile: `dist/${NAME}.index.min.js`, sourcemap: true, plugins: [sharedShim] }),
  build({ ...common, entryPoints: ['src/inspector.ts'], format: 'iife', outfile: `dist/${NAME}.inspector.min.js` }),
  // 2. ESM library for bundlers (engine included statically; tree-shakeable).
  build({
    ...common,
    minify: false,
    entryPoints: { index: 'src/index.ts', full: 'src/full.ts', ...Object.fromEntries(adapters.map((a) => [`adapters/${a}`, `src/adapters/${a}.ts`])) },
    format: 'esm',
    outdir: 'dist',
    splitting: true,
    chunkNames: 'chunks/[name]-[hash]',
  }),
  // 3. Per-adapter IIFE files the script tag loads on demand (data-adapter="ghost").
  ...adapters.map((a) =>
    build({
      ...common,
      stdin: { contents: `import { fromAttributes } from './src/adapters/${a}.ts'; ((window.AgentProse ||= { adapters: {} }).adapters ||= {})['${a}'] = fromAttributes;`, resolveDir: '.', loader: 'ts' },
      format: 'iife',
      outfile: `dist/adapters/${a}.min.js`,
    }),
  ),
  // 4. CLI for Node.
  build({ ...common, minify: false, banner: { js: '#!/usr/bin/env node' }, entryPoints: ['src/cli/index.ts'], platform: 'node', format: 'esm', outfile: 'dist/cli.js', packages: 'external' }),
]);

const size = (f) => {
  const b = readFileSync(f);
  return { file: f, bytes: b.length, gzip: gzipSync(b, { level: 9 }).length };
};
const report = [size(`dist/${NAME}.min.js`), size(`dist/${NAME}.index.min.js`), ...readdirSync('dist/adapters').filter((f) => f.endsWith('.min.js')).map((f) => size(`dist/adapters/${f}`))];
for (const r of report) console.log(`${r.file.padEnd(40)} ${String(r.bytes).padStart(7)} B  ${String(r.gzip).padStart(6)} B gzip`);
writeFileSync('dist/sizes.json', JSON.stringify(report, null, 2));
const [core, engine] = report;
if (core.gzip > 10240 || core.gzip + engine.gzip > 16384) {
  console.error(`Size budget exceeded: core ${core.gzip} B (max 10240), core+engine ${core.gzip + engine.gzip} B (max 16384).`);
  process.exit(1);
}
