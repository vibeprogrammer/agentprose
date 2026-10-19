# Contributing

Thanks for helping make the web readable by agents.

## Setup

```bash
git clone https://github.com/webmaxru/agentprose && cd agentprose
npm install
npm run typecheck && npm test
npm run build            # prints gzipped sizes; fails over the size budget
CHROME=/path/to/chrome npm run test:e2e
npm run demo && npx serve demo/site   # or any static server
```

## Rules of the road

- **Size budget.** The script-tag core must stay under 10 KB gzipped, and core + lazy engine under 17,408 B (CI enforces both). New site-wide logic belongs in `src/core/site-tools.ts` or `src/core/source.ts`, which load lazily.
- **Read-only by default.** New tools that change state must be opt-in, must not set `readOnlyHint`, and should set `consequentialHint` if appropriate.
- **No runtime dependencies** in the browser bundle.
- **Errors are results.** Return `{ error, message }` instead of throwing from tools.
- **Tests.** Every feature needs a unit test. Anything that touches registration, discovery or the DOM also needs an e2e test.
- **Docs.** Update `docs/` and, when tool definitions change, run `node scripts/docs-tools.mjs`.

## Documentation site

The site at [salnikov.no/agentprose](https://salnikov.no/agentprose/) lives in `website/` (Astro + Starlight). Most of its reference pages are pulled from `docs/*.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `RELEASING.md` and the WordPress plugin's `readme.txt` at build time, and the API reference is generated from `src/` by TypeDoc, so edit those sources rather than the generated files. Hand-written pages are in `website/src/content/docs/`.

```bash
cd website
npm install
npm run dev                  # http://localhost:4321/agentprose/
npm run build                # dist/, with the agentprose index for this site
npm run check:links          # every internal link and #anchor in dist/, under the base path
SITE_URL=http://localhost:4329/agentprose/ npm run build && npm run serve &   # then:
SITE_URL=http://localhost:4329/agentprose/ CHROME=/path/to/chrome npm run check:browser
```

The site URL (origin and base path) is one value, `SITE_URL`; the Pages workflow sets it from the repository's Pages settings.

## Adapters

New CMS adapters live in `src/adapters/<name>.ts`. They export a factory and `fromAttributes(dataset)`, use only browser-safe credentials (or proxy mode), call `guardToken()` on any token, and come with a mocked-fetch test in `test/unit/adapters.test.ts`. Cite the vendor's API docs in `docs/adapters.md`.

## Commits and releases

Use conventional commit messages (`feat:`, `fix:`, `docs:`). Releases follow semver and the changelog; the full flow (prep PR, publish, jsDelivr purge, Cloud follow-up) is in [RELEASING.md](RELEASING.md).
