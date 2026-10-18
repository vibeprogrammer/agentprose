#!/usr/bin/env node
// Syncs the WordPress plugin to an agentprose release and builds the zip.
//
//   node wordpress-plugin/sync.mjs [version|latest] [options]
//
//   version            agentprose version to bundle. Default: the version in package.json.
//                      "latest" asks npm for the newest published version.
//   --from-dist        use this checkout's dist/ (run `npm run build` first) instead of the
//                      published npm tarball. Used automatically when the version is not on npm
//                      yet and dist/ carries that version.
//   --plugin-version X plugin version, when it must differ from the library version
//                      (a plugin-only fix: 0.1.1.1). Default: the library version.
//   --note "text"      an extra changelog line for this release (repeatable).
//   --no-zip           update the files, skip the zip.
//   --keep-version     refresh js/ and the zip only; leave versions and readme alone (dev/CI builds).
//   --check            change nothing; fail if the plugin header, AGENTPROSE_VERSION and the
//                      readme Stable tag disagree or the changelog lacks that version (CI).
//
// What it does, in order:
//   1. fetches the agentprose release (npm tarball, integrity-checked) or reads dist/;
//   2. copies the browser build into wordpress-plugin/agentprose/js/ (git-ignored);
//   3. vendors the MCP-B WebMCP polyfill at the version that release pins, into js/vendor/,
//      so the plugin serves it from the site itself (wordpress.org guideline 8: no CDN JS);
//   4. sets the plugin header Version, AGENTPROSE_VERSION, readme.txt Stable tag, the
//      polyfill version in readme.txt, and adds a changelog + upgrade notice entry;
//   5. zips the plugin to dist/wordpress/agentprose.zip.
// Then: Plugin Check, commit, and tag in wordpress.org SVN (wordpress-plugin/README.md).
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REGISTRY = 'https://registry.npmjs.org';
const POLYFILL = '@mcp-b/webmcp-polyfill';
const POLYFILL_FALLBACK = '6.0.3'; // used only if a bundle does not name its pinned polyfill
const SEMVER = /^\d+\.\d+\.\d+(?:\.\d+)?(?:-[0-9A-Za-z.-]+)?$/;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const plugin = join(root, 'wordpress-plugin/agentprose');
const js = join(plugin, 'js');
const php = join(plugin, 'agentprose.php');
const readme = join(plugin, 'readme.txt');

// ---- arguments
const args = process.argv.slice(2);
const opt = { fromDist: false, zip: true, keep: false, check: false, notes: [], pluginVersion: '', version: '' };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--from-dist') opt.fromDist = true;
  else if (a === '--no-zip') opt.zip = false;
  else if (a === '--keep-version') opt.keep = true;
  else if (a === '--check') opt.check = true;
  else if (a === '--note') opt.notes.push(args[++i] || '');
  else if (a === '--plugin-version') opt.pluginVersion = args[++i] || '';
  else if (a === '-h' || a === '--help') {
    console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\nimport ')[0].replace(/^#!.*\n/, '').replace(/^\/\/ ?/gm, ''));
    process.exit(0);
  } else if (a.startsWith('-')) fail(`unknown option ${a}`);
  else opt.version = a.replace(/^v/, '');
}

function fail(msg) {
  console.error(`wp-sync: ${msg}`);
  process.exit(1);
}

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (res.status === 404) return null;
  if (!res.ok) fail(`${url}: HTTP ${res.status}`);
  return res.json();
}

/** Downloads and unpacks an npm tarball after checking it against the registry's integrity. */
async function npmPackage(name, version) {
  const meta = await getJson(`${REGISTRY}/${name.replace('/', '%2F')}/${version}`);
  if (!meta) return null;
  const res = await fetch(meta.dist.tarball);
  if (!res.ok) fail(`${meta.dist.tarball}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const [algo, want] = String(meta.dist.integrity || '').split(/-(.+)/);
  if (algo && want) {
    const got = createHash(algo).update(buf).digest('base64');
    if (got !== want) fail(`${name}@${version}: tarball integrity mismatch`);
  }
  const tmp = mkdtempSync(join(tmpdir(), 'ap-wp-'));
  writeFileSync(join(tmp, 'p.tgz'), buf);
  execFileSync('tar', ['xzf', 'p.tgz'], { cwd: tmp });
  return { dir: join(tmp, 'package'), tmp };
}

const banner = (file) => (readFileSync(file, 'utf8').match(/agentprose v(\S+)/) || [])[1];

// ---- --check: the three version fields agree and the changelog has the release
if (opt.check) {
  const p = readFileSync(php, 'utf8');
  const r = readFileSync(readme, 'utf8');
  const found = {
    'agentprose.php Version': (p.match(/^ \* Version:\s+(\S+)/m) || [])[1],
    AGENTPROSE_VERSION: (p.match(/define\( 'AGENTPROSE_VERSION', '([^']*)' \);/) || [])[1],
    'readme.txt Stable tag': (r.match(/^Stable tag: (\S+)/m) || [])[1],
  };
  const v = found['agentprose.php Version'];
  const bad = Object.entries(found).filter(([, x]) => !x || x !== v);
  if (bad.length) fail(`versions disagree: ${JSON.stringify(found)}`);
  if (!r.includes(`\n= ${v} =\n`)) fail(`readme.txt has no changelog entry for ${v}`);
  console.log(`plugin versions agree: ${v}`);
  process.exit(0);
}

// ---- 1. which release, from where
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
let version = opt.version || pkg.version;
if (version === 'latest') {
  const tags = await getJson(`${REGISTRY}/-/package/agentprose/dist-tags`);
  if (!tags?.latest) fail('could not read the latest version from npm');
  version = tags.latest;
}
if (!SEMVER.test(version)) fail(`"${version}" is not a version`);
const pluginVersion = opt.pluginVersion || version;
if (!SEMVER.test(pluginVersion)) fail(`"${pluginVersion}" is not a plugin version`);

const temps = [];
let dist;
let source;
const localDist = join(root, 'dist');
const localOk = existsSync(join(localDist, 'agentprose.min.js')) && banner(join(localDist, 'agentprose.min.js')) === version;
if (opt.fromDist) {
  if (!localOk) fail(`dist/agentprose.min.js is not agentprose v${version}: run npm run build first`);
  dist = localDist;
  source = 'local dist/';
} else {
  const p = await npmPackage('agentprose', version);
  if (p) {
    temps.push(p.tmp);
    dist = join(p.dir, 'dist');
    source = `npm agentprose@${version}`;
  } else if (localOk) {
    dist = localDist;
    source = 'local dist/ (not on npm yet)';
  } else fail(`agentprose@${version} is not on npm and dist/ is not that version (npm run build)`);
}
if (banner(join(dist, 'agentprose.min.js')) !== version) fail(`${source} does not carry agentprose v${version}`);

// ---- 2. the browser build
const files = ['agentprose.min.js', 'agentprose.index.min.js', 'agentprose.inspector.min.js', 'adapters/wordpress.min.js'];
rmSync(js, { recursive: true, force: true });
mkdirSync(join(js, 'adapters'), { recursive: true });
mkdirSync(join(js, 'vendor'), { recursive: true });
for (const f of files) {
  if (!existsSync(join(dist, f))) fail(`${source} has no dist/${f}`);
  cpSync(join(dist, f), join(js, f)); // byte-identical to the release, so anyone can compare
}

// ---- 3. the polyfill the release pins, served locally
const polyVersion = (readFileSync(join(dist, 'agentprose.min.js'), 'utf8').match(/webmcp-polyfill@(\d+\.\d+\.\d+)/) || [])[1] || POLYFILL_FALLBACK;
const poly = await npmPackage(POLYFILL, polyVersion);
if (!poly) fail(`${POLYFILL}@${polyVersion} is not on npm`);
temps.push(poly.tmp);
cpSync(join(poly.dir, 'dist/index.iife.js'), join(js, 'vendor/webmcp-polyfill.iife.js'));
cpSync(join(poly.dir, 'LICENSE'), join(js, 'vendor/webmcp-polyfill.LICENSE.txt'));

// ---- 4. versions, readme, changelog
if (!opt.keep) {
const swap = (text, re, to, what) => {
  if (!re.test(text)) fail(`could not find ${what}`);
  return text.replace(re, to);
};
let p = readFileSync(php, 'utf8');
p = swap(p, /^( \* Version:\s+).+$/m, `$1${pluginVersion}`, 'the Version header in agentprose.php');
p = swap(p, /define\( 'AGENTPROSE_VERSION', '[^']*' \);/, `define( 'AGENTPROSE_VERSION', '${pluginVersion}' );`, 'AGENTPROSE_VERSION');
writeFileSync(php, p);

let r = readFileSync(readme, 'utf8');
r = swap(r, /^Stable tag: .+$/m, `Stable tag: ${pluginVersion}`, 'Stable tag in readme.txt');
r = r.replace(/(webmcp-polyfill\)\s+)\d+\.\d+\.\d+/, `$1${polyVersion}`);
const lib = `[agentprose ${version}](https://github.com/vibeprogrammer/agentprose/blob/main/CHANGELOG.md)`;
if (!r.includes(`\n= ${pluginVersion} =\n`)) {
  const lines = [`* Bundles ${lib}${polyVersion ? ` and the MCP-B WebMCP polyfill ${polyVersion}` : ''}, served from your site.`, ...opt.notes.map((n) => `* ${n}`)];
  r = swap(r, /(== Changelog ==\n\n)/, `$1= ${pluginVersion} =\n${lines.join('\n')}\n\n`, 'the Changelog section');
  r = swap(r, /(== Upgrade Notice ==\n\n)/, `$1= ${pluginVersion} =\nUpdates the bundled agentprose library to ${version}.\n\n`, 'the Upgrade Notice section');
}
writeFileSync(readme, r);
}

// ---- 5. zip
let zip = '';
if (opt.zip) {
  const out = join(root, 'dist/wordpress');
  mkdirSync(out, { recursive: true });
  zip = join(out, 'agentprose.zip');
  rmSync(zip, { force: true });
  execFileSync('zip', ['-qr', '-X', zip, 'agentprose', '-x', 'agentprose/.*', '-x', '*/.DS_Store'], { cwd: join(root, 'wordpress-plugin') });
}
for (const t of temps) rmSync(t, { recursive: true, force: true });

console.log(`agentprose plugin ${pluginVersion}: bundles agentprose ${version} (from ${source}) + ${POLYFILL} ${polyVersion}`);
if (zip) {
  const sha = createHash('sha256').update(readFileSync(zip)).digest('hex');
  console.log(`zip: ${zip.slice(root.length + 1)} (${statSync(zip).size} bytes, sha256 ${sha})`);
}
console.log('next: Plugin Check, commit, then copy to SVN trunk/ and tag (wordpress-plugin/README.md)');
