// Copies the built scripts into the plugin and zips it: node wordpress-plugin/build.mjs
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
const dir = 'wordpress-plugin/agentprose/assets';
rmSync(dir, { recursive: true, force: true });
mkdirSync(`${dir}/adapters`, { recursive: true });
for (const f of ['agentprose.min.js', 'agentprose.index.min.js', 'agentprose.inspector.min.js']) cpSync(`dist/${f}`, `${dir}/${f}`);
cpSync('dist/adapters/wordpress.min.js', `${dir}/adapters/wordpress.min.js`);
mkdirSync('dist/wordpress', { recursive: true });
execSync('cd wordpress-plugin && zip -qr ../dist/wordpress/agentprose.zip agentprose');
console.log('wordpress plugin → dist/wordpress/agentprose.zip');
