// Copies the repository's canonical Markdown docs into the Starlight content folder, so docs/*.md, CHANGELOG.md,
// CONTRIBUTING.md and RELEASING.md stay the single source of truth (GitHub readers and the site see the same text).
// Run by `npm run build` / `npm run dev`; the generated files are git-ignored (website/.gitignore).
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join, posix, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, '..');
const root = join(site, '..');
const out = join(site, 'src/content/docs');
const REPO = 'https://github.com/webmaxru/agentprose';

/** Repo file → site slug (and an optional note shown above the synced text). */
export const PAGES = {
  'docs/configuration.md': { slug: 'reference/configuration' },
  'docs/tools.md': { slug: 'reference/tools' },
  'docs/adapters.md': { slug: 'reference/adapters' },
  'docs/cli.md': { slug: 'reference/cli' },
  'docs/wordpress.md': { slug: 'reference/wordpress-plugin', title: 'WordPress plugin reference and comparison' },
  'docs/versioning.md': { slug: 'reference/versioning' },
  'docs/architecture.md': { slug: 'concepts/architecture' },
  'docs/browser-support.md': { slug: 'support', title: 'Browser and agent support' },
  'docs/security.md': { slug: 'project/security', title: 'Security' },
  'docs/comparison.md': { slug: 'project/comparison', title: 'Compared with what exists' },
  'docs/tutorials/mcp-b-claude-desktop.md': { slug: 'guides/mcp-b-claude-desktop' },
  'CHANGELOG.md': { slug: 'project/changelog', tableOfContents: false },
  'CONTRIBUTING.md': { slug: 'project/contributing' },
  'RELEASING.md': { slug: 'project/releasing' },
};
/** Repo files that are not synced but have a hand-written page on the site. */
const ALIASES = { 'docs/getting-started.md': 'getting-started', 'docs/README.md': 'getting-started', 'README.md': '' };

const slugOf = (repoPath) => PAGES[repoPath]?.slug ?? ALIASES[repoPath];
const ALIAS_TITLES = { 'getting-started': 'Quick start', '': 'agentprose' };
const titleCache = {};
function titleOf(repoPath) {
  if (PAGES[repoPath]?.title) return PAGES[repoPath].title;
  if (repoPath in ALIASES) return ALIAS_TITLES[ALIASES[repoPath]];
  if (!(repoPath in titleCache)) {
    const h1 = readFileSync(join(root, repoPath), 'utf8').match(/^# (.+)$/m);
    titleCache[repoPath] = h1 ? h1[1].trim() : repoPath;
  }
  return titleCache[repoPath];
}
/** "[configuration.md](configuration.md#x)" reads oddly on a website: use the target page's title instead. */
function rewriteText(text, target, fromRepoPath) {
  if (!/^`?[\w./-]+\.md(#[\w-]+)?`?$/.test(text) || /^(https?:|#)/.test(target)) return text;
  const resolved = posix.normalize(posix.join(posix.dirname(fromRepoPath), target.split('#')[0]));
  return slugOf(resolved) !== undefined ? titleOf(resolved) : text;
}

function rewriteLink(target, fromRepoPath, fromSlug) {
  if (/^(https?:|mailto:|#|\/\/)/.test(target)) return target;
  const [pathPart, hash = ''] = target.split('#');
  const resolved = posix.normalize(posix.join(posix.dirname(fromRepoPath), pathPart)).replace(/\/$/, '');
  const slug = slugOf(resolved);
  const frag = hash ? `#${hash}` : '';
  if (slug !== undefined) {
    const rel = posix.relative(`/${fromSlug}`, `/${slug}`) || '.';
    return `${rel.replace(/\/?$/, '/')}${frag}`;
  }
  if (/\.(png|jpe?g|gif|svg|webp)$/i.test(resolved) && existsSync(join(root, resolved))) {
    const dest = join(site, 'public/repo', resolved);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(join(root, resolved), dest);
    return posix.relative(`/${fromSlug}`, `/repo/${resolved}`);
  }
  const isDir = !posix.extname(resolved) || target.endsWith('/');
  return `${REPO}/${isDir ? 'tree' : 'blob'}/main/${resolved}${frag}`;
}

function plain(md) {
  return md
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function convert(repoPath, src) {
  const meta = PAGES[repoPath];
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const h1 = lines.findIndex((l) => /^# /.test(l));
  const title = meta.title || (h1 >= 0 ? lines[h1].slice(2).trim() : repoPath);
  if (h1 >= 0) lines.splice(h1, 1);
  let body = lines.join('\n').replace(/^\n+/, '');
  // Rewrite links outside fenced code blocks.
  let inFence = false;
  body = body
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
      if (inFence) return line;
      return line.replace(/(!?)\[([^\]]*)\]\(([^)\s]+)\)/g, (_, bang, text, t) =>
        `${bang}[${bang ? text : rewriteText(text, t, repoPath)}](${rewriteLink(t, repoPath, meta.slug)})`);
    })
    .join('\n');
  const firstPara = body.split(/\n\n/).find((p) => p.trim() && !/^[|#`<>-]/.test(p.trim())) || '';
  let description = plain(firstPara);
  if (description.length > 180) description = description.slice(0, description.lastIndexOf(' ', 177)) + '…';
  const fm = [
    '---',
    `title: ${JSON.stringify(title)}`,
    description ? `description: ${JSON.stringify(description)}` : null,
    `editUrl: ${JSON.stringify(`${REPO}/edit/main/${repoPath}`)}`,
    meta.tableOfContents === false ? 'tableOfContents: false' : null,
    '---',
    '',
    `<!-- Generated from ${repoPath} by website/scripts/sync-docs.mjs. Edit that file, not this one. -->`,
    '',
  ].filter((l) => l !== null);
  return fm.join('\n') + body;
}

/** readme.txt (wordpress.org format) → the plugin changelog page. */
export function wpChangelog(readme) {
  const section = (name) => (readme.split(`== ${name} ==`)[1] || '').split(/\n== /)[0].trim();
  const md = (t) =>
    t
      .replace(/^= (.+) =$/gm, '## $1')
      .replace(/^\* /gm, '- ');
  const stable = (readme.match(/^Stable tag:\s*(\S+)/m) || [])[1];
  const notices = Object.fromEntries(
    section('Upgrade Notice')
      .split(/^= (.+) =$/m)
      .slice(1)
      .reduce((a, v, i, arr) => (i % 2 ? a : [...a, [v.trim(), (arr[i + 1] || '').trim()]]), []),
  );
  const body = md(section('Changelog')).replace(/^## (.+)$/gm, (h, v) => (notices[v] ? `${h}\n\n*Upgrade notice:* ${notices[v]}\n` : h));
  return [
    '---',
    'title: "Plugin changelog"',
    `description: ${JSON.stringify(`Release notes for the agentprose WordPress plugin. The current version is ${stable}; each plugin version bundles the agentprose release with the same number.`)}`,
    `editUrl: ${JSON.stringify(`${REPO}/edit/main/wordpress-plugin/agentprose/readme.txt`)}`,
    '---',
    '',
    '<!-- Generated from wordpress-plugin/agentprose/readme.txt by website/scripts/sync-docs.mjs. -->',
    '',
    `The plugin version follows the library version: plugin ${stable} bundles agentprose ${stable}. The library's own changes are in the [changelog](../../project/changelog/).`,
    '',
    body,
    '',
  ].join('\n');
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const generated = [];
  for (const repoPath of Object.keys(PAGES)) {
    const dest = join(out, `${PAGES[repoPath].slug}.md`);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, convert(repoPath, readFileSync(join(root, repoPath), 'utf8')));
    generated.push(relative(site, dest));
  }
  // WordPress plugin: the wordpress.org screenshots, and the changelog from readme.txt.
  const wpAssets = join(site, 'src/assets/wordpress');
  mkdirSync(wpAssets, { recursive: true });
  for (const f of ['screenshot-1.png', 'screenshot-2.png']) copyFileSync(join(root, 'wordpress-plugin/wporg-assets', f), join(wpAssets, f));
  const readme = readFileSync(join(root, 'wordpress-plugin/agentprose/readme.txt'), 'utf8').replace(/\r\n/g, '\n');
  writeFileSync(join(out, 'wordpress/changelog.md'), wpChangelog(readme));
  generated.push('src/content/docs/wordpress/changelog.md');
  console.log(`sync-docs: ${generated.length} pages from the repository's Markdown`);
}
