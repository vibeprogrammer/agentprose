// Dev/CI build: packages the plugin from this checkout's dist/ without touching versions.
//   npm run build && node wordpress-plugin/build.mjs
// For a release use sync.mjs instead (it also sets the versions and the changelog):
//   node wordpress-plugin/sync.mjs <version>
process.argv.splice(2, 0, '--from-dist', '--keep-version');
await import('./sync.mjs');
