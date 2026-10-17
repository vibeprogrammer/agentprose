# Business model: open core

> Summary: the script, every tool, the CLI, all open-CMS adapters, proxy templates and the WordPress plugin stay MIT forever. readmcp makes money from what site owners can't easily do themselves: **seeing** agent traffic, **hosting** search and indexes, **convenience** in WordPress, and **governance** for large publishers. Reading content is never gated.

Numbers marked *(estimate)* are planning assumptions anchored on the cited price points, not market data.

## Why now

- Site owners already care about "agent readiness". The WordPress *Website LLMs.txt* plugin reports 50,000+ active installs (wordpress.org plugin API, read 2026-10-17), while every WebMCP content plugin has 600 or fewer.
- Publishers pay to see and price machine access: Cloudflare pay-per-crawl (HTTP 402, https://blog.cloudflare.com/introducing-pay-per-crawl/) and TollBit's agent analytics and paywall (https://tollbit.com/).
- No one offers analytics for WebMCP tool calls today (see [comparison.md](comparison.md)).
- WebMCP itself is in origin trial (Chrome 149+), so revenue must not depend on WebMCP adoption alone. The analytics and index products also serve `llms.txt`, Markdown endpoints and server-side MCP traffic.

## Products

### 1. readmcp Cloud: Agent Analytics (core revenue)

The open-source script already emits every tool call (`onToolCall`, the `readmcp:call` event, `data-analytics`). Cloud adds one attribute, `data-key`, and a hosted dashboard that shows:

- calls per tool, agent and page; which articles agents read in full and which by section;
- **zero-result searches**, i.e. content gaps, as a weekly email;
- agent-referred clicks back to the site (`navigate_to`, citation deep links);
- llms.txt and Markdown hits, so one dashboard covers all agent traffic.

| Plan | Price *(estimate)* | Limits |
|---|---|---|
| Free | €0 | 10k tool calls/month, 30-day retention |
| Pro | €9–19 / site / month | 250k calls, 1-year retention, content-gap reports |
| Team | €49–99 / month | 10 sites, seats, exports, API |

Price anchor: Plausible, open-source privacy-first analytics, from $9/month (https://plausible.io/).

### 2. Hosted index & semantic search

`readmcp build --upload` (planned) pushes the index to the edge. The `searchEndpoint` seam already exists in the OSS client. Cloud serves sharded full-text and embeddings ("ask this blog") with freshness webhooks from WordPress, Ghost, Sanity, Contentful, Strapi and Storyblok. This also acts as the **managed proxy** for private CMS datasets, so tokens stay server-side.

Pricing *(estimate)*: free up to 10k searches a month, then usage-based. Anchor: Algolia, 10k free searches then $0.50 per 1k (https://www.algolia.com/pricing).

### 3. readmcp Pro for WordPress

The free plugin goes on wordpress.org (it's in `wordpress-plugin/`). Pro adds an analytics dashboard in wp-admin, read-only WooCommerce product tools, membership-aware tools, and llms.txt plus Markdown endpoints in one plugin, aimed at the 50k-install llms.txt demand.

Pricing *(estimate)*: €49–99 / site / year, with agency bundles. Anchor: Yoast SEO Premium at $118.80/year (https://yoast.com/wordpress/plugins/seo/).

### 4. Enterprise & governance (later)

SSO, per-tool policies, audit-log export, AI-usage and licensing terms surfaced to agents, pay-per-call integration (402 / Cloudflare pay-per-crawl / TollBit style), premium adapters (AEM, Contentstack, Sitecore, Optimizely) and an SLA. Priced on quote; anchor: Mintlify Pro at $450/month (https://www.mintlify.com/pricing).

## What stays free (the promise)

| Free forever (MIT) | Paid |
|---|---|
| One-line script, all tools, inspector | Hosted analytics dashboard |
| CLI (`build`, `inspect`) | Hosted index, semantic search, managed CMS proxy |
| All open-CMS adapters, proxy templates | Pro WordPress features |
| WordPress plugin | Enterprise governance, premium proprietary-CMS adapters, SLA |

The OSS client exposes every seam the paid products use (`onToolCall`, `analytics`, `searchEndpoint`, `index`, `proxy`), so anyone can self-host an alternative. That keeps the project trustworthy and the paid products honest.

## Go-to-market

1. **Launch the OSS** with the demo, the `readmcp inspect` scorer as a free top-of-funnel ("how agent-ready is your blog?") and the launch posts in `launch/`.
2. **Ship the WordPress plugin** on wordpress.org. That's where the installs are.
3. **Open the Cloud analytics waitlist** from the README and the inspector panel ("see what agents do on your site").
4. **Partner** with SSG and CMS communities (Hugo and Astro themes, Ghost and Strapi marketplaces) for one-click installs.

## Milestones *(estimates)*

| When | Goal |
|---|---|
| Month 1 | 500 GitHub stars, 50 sites, plugin approved on wordpress.org |
| Month 3 | Cloud analytics beta, 20 paying sites |
| Month 6 | €1–3k MRR from Cloud + WP Pro; first agency bundle |
| Month 12 | Hosted search GA; first enterprise pilot |

## Risks

- **WebMCP timing.** The spec and origin trial may shift. Mitigation: the analytics and index products also cover llms.txt and server-side MCP.
- **Platform bundling.** Cloudflare's edge WebMCP packs could add a content pack. Mitigation: readmcp is host-agnostic, works on any CDN and in the CMS, and can ship as a Cloudflare pack itself.
- **Maintainer's employer.** The maintainer works at Microsoft. Before charging for anything, check the employer's outside-activity and side-business rules. The open-source project itself is the lowest-risk first step.
