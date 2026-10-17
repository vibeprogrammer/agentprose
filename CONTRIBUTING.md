# Contributing

Thanks for helping make the web readable by agents.

## Setup

```bash
git clone https://github.com/vibeprogrammer/readmcp && cd readmcp
npm install
npm run typecheck && npm test
npm run build            # prints gzipped sizes; fails if the core passes 10 KB
CHROME=/path/to/chrome npm run test:e2e
npm run demo && npx serve demo/site   # or any static server
```

## Rules of the road

- **Size budget.** The script-tag core must stay under 10 KB gzipped (CI enforces it). New site-wide logic belongs in `src/core/site-tools.ts` or `src/core/source.ts`, which load lazily.
- **Read-only by default.** New tools that change state must be opt-in, must not set `readOnlyHint`, and should set `consequentialHint` if appropriate.
- **No runtime dependencies** in the browser bundle.
- **Errors are results.** Return `{ error, message }` instead of throwing from tools.
- **Tests.** Every feature needs a unit test. Anything that touches registration, discovery or the DOM also needs an e2e test.
- **Docs.** Update `docs/` and, when tool definitions change, run `node scripts/docs-tools.mjs`.

## Adapters

New CMS adapters live in `src/adapters/<name>.ts`. They export a factory and `fromAttributes(dataset)`, use only browser-safe credentials (or proxy mode), call `guardToken()` on any token, and come with a mocked-fetch test in `test/unit/adapters.test.ts`. Cite the vendor's API docs in `docs/adapters.md`.

## Commits and releases

Use conventional commit messages (`feat:`, `fix:`, `docs:`). Releases follow semver and the changelog.
