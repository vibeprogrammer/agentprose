// Copies the built scripts into the plugin and zips it: node wordpress-plugin/build.mjs
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
const dir = 'wordpress-plugin/readmcp/assets';
rmSync(dir, { recursive: true, force: true });
mkdirSync(`${dir}/adapters`, { recursive: true });
for (const f of ['readmcp.min.js', 'readmcp.index.min.js', 'readmcp.inspector.min.js']) cpSync(`dist/${f}`, `${dir}/${f}`);
cpSync('dist/adapters/wordpress.min.js', `${dir}/adapters/wordpress.min.js`);
mkdirSync('dist/wordpress', { recursive: true });
execSync('cd wordpress-plugin && zip -qr ../dist/wordpress/readmcp.zip readmcp');
console.log('wordpress plugin → dist/wordpress/readmcp.zip');
