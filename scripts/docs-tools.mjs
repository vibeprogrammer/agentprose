// Regenerates docs/tools.md from the tool definitions in code, so the docs never drift.
import { parseHTML } from 'linkedom';
import { writeFileSync } from 'node:fs';
const { document, DOMParser } = parseHTML('<!doctype html><html><head></head><body></body></html>');
Object.assign(globalThis, { document, DOMParser, location: new URL('https://example.com/') });
const { buildTools } = await import('../dist/index.js');
const tools = buildTools({ links: { subscribe: 'x', comments: 'y' }, contact: { email: 'a@b.co' }, navigate: true }, { name: 'x', list: async () => ({ items: [] }), get: async () => null }, document);

const row = (k, s, req) => `| \`${k}\`${req ? ' *' : ''} | ${s.type}${s.enum ? ` (${s.enum.join(' \\| ')})` : ''}${s.minimum !== undefined ? ` ${s.minimum}–${s.maximum ?? '∞'}` : ''} | ${(s.description || '').replace(/\|/g, '\\|')} |`;
let md = `# Tools

Generated from the source by \`node scripts/docs-tools.mjs\`. Names can be prefixed (\`data-prefix\`), and any tool can be left out (\`data-exclude\`).

All built-in tools carry \`annotations: { readOnlyHint: true, untrustedContentHint: true }\`, except \`navigate_to\`. Errors come back as results, not exceptions, so agents can recover: \`{ "error": "not_found" | "invalid_input" | "section_not_found" | "tool_failed", "message": "…" }\`.

| Tool | Title |
|---|---|
${tools.map((t) => `| [\`${t.name}\`](#${t.name}) | ${t.title} |`).join('\n')}

`;
for (const t of tools) {
  const p = t.inputSchema?.properties || {};
  const req = t.inputSchema?.required || [];
  md += `## ${t.name}\n\n**${t.title}.** ${t.description}\n\n`;
  md += Object.keys(p).length ? `| Input | Type | Description |\n|---|---|---|\n${Object.entries(p).map(([k, s]) => row(k, s, req.includes(k))).join('\n')}\n\n` : 'No input.\n\n';
  if (['get_subscribe_link', 'get_comments_link'].includes(t.name)) md += `Registered only when \`links.${t.name === 'get_subscribe_link' ? 'subscribe' : 'comments'}\` (\`data-${t.name === 'get_subscribe_link' ? 'subscribe' : 'comments'}\`) is set.\n\n`;
  if (t.name === 'get_contact_info') md += 'Registered only when the page sets `contact`, `data-contact` (`links.contact`) or uses an agentprose Cloud (`data-key`). Details come from the page, the Cloud or `agentprose.json`; see [configuration.md](configuration.md#notes-for-ai-agents-and-contact-details). Answers `{ "error": "not_found" }` when none are published.\n\n';
  if (t.name === 'navigate_to') md += 'Registered only with `navigate: true` (`data-navigate`). Same-origin URLs only. Not read-only.\n\n';
}
md += `## Example: get_current_article

\`\`\`json
{
  "url": "https://blog.example/posts/headless-cms-tokens/",
  "title": "Connecting a headless CMS: which tokens are safe in a page",
  "summary": "WebMCP tools run in the visitor’s browser, so every credential in their config is public…",
  "published": "2026-10-16T09:00:00.000Z",
  "authors": ["Maxim Salnikov"],
  "tags": ["cms", "security", "agentprose"],
  "categories": ["Guides"],
  "readingMinutes": 1,
  "isArticle": true,
  "sections": [{ "id": "safe-to-embed", "level": 2, "title": "Safe to embed" }, { "id": "when-you-need-a-secret", "level": 2, "title": "When you need a secret" }],
  "markdown": "A WebMCP tool executes in the page. Whatever key it uses, every visitor can read…\\n\\n## Safe to embed\\n\\n- **WordPress**: no token…",
  "length": 1408,
  "truncated": false
}
\`\`\`

When \`truncated\` is true, call again with \`offset: next_offset\`. Pages break at paragraph boundaries, and nothing is dropped.
`;
writeFileSync('docs/tools.md', md);
console.log(`docs/tools.md: ${tools.length} tools`);
