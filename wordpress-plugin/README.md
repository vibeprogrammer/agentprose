# agentprose WordPress plugin

The plugin lives in `agentprose/` and ships the library's browser build. The JavaScript in `agentprose/js/` is generated (git-ignored): `sync.mjs` puts it there.

## How the plugin gets the library

The plugin bundles a fixed agentprose release in `agentprose/js/`, plus the MCP-B WebMCP polyfill that release pins, in `agentprose/js/vendor/`. Nothing is loaded from a CDN: the script tag points at the plugin's own files, and `data-polyfill` points at the local polyfill (or is `false` when the owner switches it off). That rules out the library's evergreen jsDelivr or agentprose.cloud `/v/0/` URLs here.

This is what wordpress.org requires. [Guideline 8](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/#8-plugins-may-not-send-executable-code-via-third-party-systems) lists "calling third party CDNs for reasons other than font inclusions; all non-service related JavaScript and CSS must be included locally" and "serving updates … from servers other than WordPress.org's" as not allowed. [Guideline 15](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/#15-plugin-version-numbers-must-be-incremented-for-each-new-release) says sites are only offered an update when the version goes up.

So each library release becomes a plugin release with a new version number, and WordPress updates (or auto-updates, if the owner turned them on) deliver it to sites. The plugin version follows the library version: plugin 0.1.1 bundles agentprose 0.1.1.

## Updating the bundled library

After an agentprose release is on npm, run this from the repo root:

```sh
node wordpress-plugin/sync.mjs 0.1.2      # or: npm run wp:sync -- 0.1.2
```

With no version it uses `package.json`'s version; `latest` asks npm. It:

1. downloads `agentprose@<version>` from npm and checks it against the registry's integrity hash. If that version is not on npm yet but `dist/` is that version (`npm run build`), it uses `dist/`; `--from-dist` forces that;
2. copies `agentprose.min.js`, `agentprose.index.min.js`, `agentprose.inspector.min.js` and `adapters/wordpress.min.js` into `agentprose/js/`, byte for byte;
3. reads the polyfill version the release pins (`@mcp-b/webmcp-polyfill@x.y.z` inside the bundle) and vendors that exact build plus its licence into `agentprose/js/vendor/`;
4. sets `Version:` in `agentprose.php`, `AGENTPROSE_VERSION`, the readme's `Stable tag` and polyfill version, and adds a changelog and upgrade-notice entry (add lines with `--note "…"`);
5. zips the plugin to `dist/wordpress/agentprose.zip`.

`--plugin-version 0.1.2.1` releases a plugin-only fix on the same library. `node wordpress-plugin/sync.mjs --check` (run in CI) fails if the three version fields disagree or the changelog lacks the version.

Then:

1. **Check.** Run PHPCS and Plugin Check (below). Both should report nothing.
2. **Commit** the changes to `agentprose.php` and `readme.txt` (the JS stays git-ignored), in a PR.
3. **Release on wordpress.org (SVN).** From the repo root, after the sync:
   ```sh
   svn co https://plugins.svn.wordpress.org/agentprose svn-agentprose   # once
   cd svn-agentprose && svn up && cd ..
   rsync -a --delete --exclude .svn wordpress-plugin/agentprose/ svn-agentprose/trunk/
   cd svn-agentprose
   svn add --force trunk && svn status | awk '/^!/{print $2}' | xargs -r svn rm
   svn cp trunk tags/0.1.2
   svn ci -m "agentprose 0.1.2"
   ```
   Sites see the update within a few hours. Sites with auto-updates on install it by themselves.

`node wordpress-plugin/build.mjs` (used by CI) packages the plugin from `dist/` without changing any versions.

## Check

```sh
cd wordpress-plugin
composer install                 # PHP_CodeSniffer + WordPress Coding Standards + PHPCompatibilityWP
vendor/bin/phpcs                 # uses phpcs.xml.dist
```

Plugin Check (the tool wordpress.org reviewers use) needs a WordPress install: `wp plugin install plugin-check --activate`, copy `agentprose/` into `wp-content/plugins/`, then `wp plugin check agentprose --include-experimental`.

## First release on wordpress.org

`wporg-assets/` holds the files for the SVN `assets/` folder (banners, icons, screenshots). They are not part of the plugin zip.

1. Submit `dist/wordpress/agentprose.zip` at https://wordpress.org/plugins/developers/add/ and wait for review.
2. After approval, with the SVN credentials from the approval email, do step 3 above and copy the assets once:
   ```sh
   cp wordpress-plugin/wporg-assets/* svn-agentprose/assets/
   cd svn-agentprose && svn add --force assets && svn ci -m "Plugin assets"
   ```
