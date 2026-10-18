# agentprose WordPress plugin

The plugin lives in `agentprose/` and ships the library's browser build. The JavaScript in `agentprose/js/` is generated and git-ignored.

## Build

```sh
npm ci && npm run build          # the library (dist/)
node wordpress-plugin/build.mjs  # copies the scripts + the WebMCP polyfill into agentprose/js/, zips to dist/wordpress/agentprose.zip
```

## Check

```sh
cd wordpress-plugin
composer install                 # PHP_CodeSniffer + WordPress Coding Standards + PHPCompatibilityWP
vendor/bin/phpcs                 # uses phpcs.xml.dist
```

Plugin Check (the tool wordpress.org reviewers use) needs a WordPress install: `wp plugin install plugin-check --activate`, copy `agentprose/` into `wp-content/plugins/`, then `wp plugin check agentprose --include-experimental`.

## Release to wordpress.org

`wporg-assets/` holds the files for the SVN `assets/` folder (banners, icons, screenshots). They are not part of the plugin zip.

1. First time only: submit `dist/wordpress/agentprose.zip` at https://wordpress.org/plugins/developers/add/ and wait for review.
2. After approval, with the SVN credentials from the approval email:
   ```sh
   svn co https://plugins.svn.wordpress.org/agentprose svn-agentprose
   rsync -a --delete --exclude .svn wordpress-plugin/agentprose/ svn-agentprose/trunk/
   cp wordpress-plugin/wporg-assets/* svn-agentprose/assets/
   svn cp svn-agentprose/trunk svn-agentprose/tags/0.1.0
   cd svn-agentprose && svn add --force . && svn ci -m "agentprose 0.1.0"
   ```
3. Each release: bump `Version` in `agentprose.php`, `AGENTPROSE_VERSION`, `Stable tag` and the changelog in `readme.txt`, rebuild, copy to `trunk/`, tag.
