# Releasing agentprose

Two steps, by two people (or one person in two hats):

1. **Release prep** (anyone, through a pull request): the version bump and the checks below.
2. **Publish** (a maintainer with npm rights on `agentprose`): the commands in section 2, on their own machine.

Nothing publishes from CI. A version on npm is permanent: once `x.y.z` is published it can never be changed or reused, so any later change goes into the next version.

## 1. Release prep (pull request)

On a branch from an up-to-date `main`:

1. **Version.** Bump `version` in `package.json` and `package-lock.json` (both the top-level `version` and `packages[""].version`). Use semver: a fix or a small addition is a patch while we are on 0.x (`0.1.1` → `0.1.2`), a behaviour change is a minor (`0.2.0`). The bundle banner, `VERSION` and `agentprose --version` follow from `package.json` at build time.
2. **Changelog.** Move the `[Unreleased]` notes into `## [x.y.z] - YYYY-MM-DD` in `CHANGELOG.md`.
3. **Docs.** Examples that show an exact version (docs/versioning.md) name the new one. Snippets use the channels `agentprose@0` and `https://agentprose.cloud/v/0/`, which need no change.
4. **Checks**, all of which CI runs too:

   ```bash
   npm ci
   npm run typecheck
   npm test                 # unit tests, incl. the polyfill pin/hash check
   npm run build            # fails over the size budget: core 10,240 B, core+engine 16,640 B gzipped
   npm run test:e2e         # headless Chromium (set CHROME=/path/to/chrome if needed)
   npm pack --dry-run       # what will be published
   ```

   `npm pack --dry-run` must list only `dist/` (JS, types, adapters, chunks, maps), `README.md`, `LICENSE`, `CHANGELOG.md` and `package.json`: no `wordpress-plugin/`, `dist/wordpress/`, `examples/`, `test/`, `src/` or `scripts/`. For 0.1.x that is about 65 files and 130 kB.
5. **Merge.** CI green (test on Node 20 and 22, e2e), then squash-merge with a title like `chore(release): x.y.z`.

## 2. Publish (maintainer)

From a clean, up-to-date checkout of `main`. Always pass `--registry https://registry.npmjs.org`, in case your npm config points elsewhere. `prepublishOnly` runs typecheck, tests and the build again before the upload.

**Windows PowerShell** (use `npm.cmd`, so a blocked `npm.ps1` never runs):

```powershell
git checkout main
git pull --ff-only
git status                                   # nothing to commit, working tree clean
node -p "require('./package.json').version"  # the version you are releasing
npm.cmd ci
npm.cmd test
npm.cmd run build
npm.cmd pack --dry-run                       # check the file list (see above)
npm.cmd whoami --registry https://registry.npmjs.org   # if this fails: npm.cmd login --registry https://registry.npmjs.org
npm.cmd publish --access public --registry https://registry.npmjs.org --otp 123456
```

**bash / macOS / Linux:**

```bash
git checkout main && git pull --ff-only && git status
node -p "require('./package.json').version"
npm ci && npm test && npm run build && npm pack --dry-run
npm whoami --registry https://registry.npmjs.org
npm publish --access public --registry https://registry.npmjs.org --otp 123456
```

Replace `123456` with the code from your authenticator app. If npm opens a browser to confirm instead, run `publish` without `--otp`.

## 3. Verify on npm

```bash
npm view agentprose version --registry https://registry.npmjs.org     # the new version
npm view agentprose dist-tags --registry https://registry.npmjs.org   # latest: the new version
```

The registry's package page can lag a few minutes behind `npm view <name>@x.y.z`; `https://registry.npmjs.org/agentprose/x.y.z` answers 200 as soon as the upload is accepted.

## 4. Purge jsDelivr's channels

jsDelivr caches what a range such as `agentprose@0` points to for up to 12 hours. Purging makes the channels serve the new version right away. The core loads its engine, inspector and adapters from its own folder, so every file is purged together. The script reads the list from `dist/`, so it stays right:

```bash
node scripts/purge-jsdelivr.mjs            # purges @0 and @0.1, then prints what each resolves to
```

It ends with lines like `@0 resolves to 0.1.2; served file: /*! agentprose v0.1.2 | MIT | … */`. If a channel still shows the old version, wait a minute and run it again. Visitors whose browsers cached the previous file may keep it for up to 7 days (jsDelivr's browser cache for ranges); new visitors get the new one. Exact-version URLs (`agentprose@0.1.2`) work as soon as npm has the version.

## 5. Tag (optional)

```bash
git tag -a vX.Y.Z -m "agentprose X.Y.Z"
git push origin vX.Y.Z
```

0.1.0 and 0.1.1 were published without tags; npm records the commit (`gitHead`) either way.

## 6. agentprose Cloud follow-up

agentprose Cloud serves its own copy of the library (`/v/<version>/` and the evergreen `/v/0/`). After a release, the Cloud repository vendors the new version from npm and switches its current version; its own `RELEASING`/`docs` describe that step. Until then the Cloud keeps serving the previous version.

## 7. WordPress plugin

The plugin in `wordpress-plugin/` is released separately to WordPress.org (see its README). It bundles its own copy of `agentprose.min.js` and the MCP-B polyfill, so an npm release does not change it until the plugin is rebuilt and released.
