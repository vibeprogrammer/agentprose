# Security model

**What readmcp is:** a script that registers read-only tools in the visitor's browser. It reads what the page and the site already serve publicly.

| Risk | Mitigation |
|---|---|
| Prompt injection through post content (comments, quotes, guest posts) | Every content tool carries `untrustedContentHint: true`, so agents treat output as data. Output stays plain Markdown: no hidden elements, `aria-hidden`, `[hidden]`, scripts or styles. |
| Leaking CMS secrets | Only public delivery credentials are supported in the page. Management/admin token shapes (Contentful `CFPAT-`, Sanity `sk…`, Ghost Admin `id:secret`) make the adapter throw. Proxy mode keeps private tokens on a server. |
| Acting as an open proxy / SSRF | The auto source fetches only same-origin URLs (pages, feeds, sitemaps, llms.txt, index). `get_post` refuses URLs on other origins. |
| Agents changing state | Built-in tools are `readOnlyHint: true`. `navigate_to` is opt-in, same-origin only, and not marked read-only. |
| Oversized responses / token blow-ups | `maxChars` (default 20,000) per answer with paging. `maxPosts` (default 2,000) and `maxSitemaps` (default 5) bound the index. |
| Breaking the host page | Registration never throws. Failures are reported in `ready.failed`. The core uses no `eval` and no inline script, and loads its lazy files only from its own directory. |
| Tracking visitors | Nothing is sent anywhere unless you configure `data-analytics`, and that carries tool name, timing, page URL and search query, never content or personal data. |
| Supply chain | No runtime dependencies in the browser bundle. Pin versions and use SRI (`integrity=`) when loading from a CDN. |

Report vulnerabilities as described in [SECURITY.md](../SECURITY.md).
