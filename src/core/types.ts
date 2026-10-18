/** A taxonomy term (tag, category) or an author. */
export interface Term {
  name: string;
  slug?: string;
  url?: string;
  count?: number;
}

/** A post as listed in an index: everything except the full body. */
export interface PostSummary {
  /** Absolute canonical URL. Always present; it is the post's identity. */
  url: string;
  title: string;
  slug?: string;
  id?: string;
  summary?: string;
  published?: string; // ISO 8601
  updated?: string; // ISO 8601
  authors?: string[];
  tags?: string[];
  categories?: string[];
  image?: string;
  lang?: string;
  readingMinutes?: number;
  /** Where this record came from (feed, sitemap, wordpress, ...). Useful for debugging. */
  source?: string;
}

/** A full post. `markdown` or `html` carries the body. */
export interface Post extends PostSummary {
  markdown?: string;
  html?: string;
}

/** How to reach the site owner. Owner-provided; agentprose cleans and caps every field. */
export interface Contact {
  email?: string;
  phone?: string;
  /** A contact page or form (http/https). */
  url?: string;
  /** A booking or appointment page (http/https). */
  booking?: string;
  /** Opening hours, plain text, e.g. "Mon–Fri 9–17 CET". */
  hours?: string;
  /** Postal or visiting address, plain text. */
  address?: string;
}

export interface SiteInfo {
  name?: string;
  description?: string;
  url: string;
  lang?: string;
  logo?: string;
  feeds?: string[];
  sitemap?: string;
  llmsTxt?: string;
  generator?: string;
  /** Free-form links (subscribe, comments, about, contact) declared in config. */
  links?: Record<string, string>;
  /** The owner's notes for AI agents (tone, what to recommend, what not to claim), plain text. */
  notesForAgents?: string;
  /** How to reach the owner. */
  contact?: Contact;
}

export interface ListOptions {
  limit?: number;
  offset?: number;
  tag?: string;
  category?: string;
  author?: string;
  since?: string;
  until?: string;
  sort?: 'newest' | 'oldest' | 'relevance';
}

export interface ListResult {
  items: PostSummary[];
  total?: number;
}

export interface Taxonomies {
  tags: Term[];
  categories: Term[];
  authors: Term[];
}

export interface PostRef {
  url?: string;
  slug?: string;
  id?: string;
}

/**
 * A content source. The zero-config build uses the page, feeds, sitemaps and
 * llms.txt; CMS adapters implement the same interface against an API.
 * Only `list` and `get` are required; everything else is optional and the
 * engine falls back to client-side work over `list` when a method is absent.
 */
export interface ContentAdapter {
  name: string;
  /** Enough posts to build a client-side search index (all of them, ideally). */
  list(opts?: ListOptions): Promise<ListResult>;
  /** One full post, or null when it does not exist. */
  get(ref: PostRef): Promise<Post | null>;
  /** Server-side search. When absent the engine ranks `list()` results itself. */
  search?(query: string, opts?: ListOptions): Promise<ListResult>;
  taxonomies?(): Promise<Taxonomies>;
  site?(): Promise<Partial<SiteInfo>>;
}

export interface ToolCallEvent {
  tool: string;
  args: unknown;
  ok: boolean;
  ms: number;
  error?: string;
  /** The page URL the call happened on. */
  page: string;
}

export interface ToolDefinition {
  name: string;
  title?: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
    consequentialHint?: boolean;
  };
  execute: (input: any, opts?: { signal?: AbortSignal }) => unknown | Promise<unknown>;
}

export interface Config {
  /** Site origin + base path. Defaults to location.origin. */
  baseUrl?: string;
  /** CSS selector for the article body. Auto-detected when omitted. */
  contentSelector?: string;
  /** Selectors removed from extracted content (in addition to built-in noise). */
  ignoreSelectors?: string[];
  /** URL of a prebuilt JSON index (from the CLI). Default: /agentprose.json if present. Empty string disables. */
  index?: string;
  /** Explicit feed URLs. Auto-discovered from <link rel=alternate> when omitted. */
  feeds?: string[];
  sitemap?: string | false;
  llmsTxt?: string | false;
  /** A CMS adapter. Replaces the feed/sitemap source for list/search/get. */
  adapter?: ContentAdapter;
  /** Prefix for tool names, e.g. "blog_" → blog_search_posts. */
  prefix?: string;
  /** Tools to leave out, by unprefixed name. */
  exclude?: string[];
  /** Extra tools registered beside the built-in ones. */
  tools?: ToolDefinition[];
  /** Links exposed through get_site_info and the action tools. */
  links?: { subscribe?: string; comments?: string; contact?: string; about?: string; [k: string]: string | undefined };
  /**
   * Notes for AI agents, written by the site owner: tone, what to recommend, what not to claim, how to get
   * in touch. Plain text, at most 2000 characters. Returned by get_site_info and get_contact_info.
   * Also read from agentprose.json (site.agentNotes) and from an agentprose Cloud.
   */
  agentNotes?: string;
  /** Contact and booking details for agents (get_contact_info). Also read from agentprose.json (site.contact) and a Cloud. */
  contact?: Contact;
  /**
   * URL of a JSON document { agentNotes?, contact? } fetched when an agent first asks for site or contact
   * info (never on page load). Defaults to the Cloud's /v1/site when data-key/data-cloud is used; false disables.
   */
  siteInfo?: string | false;
  /** Max characters of markdown per response (agents page with offset). Default 20000. */
  maxChars?: number;
  /** Max posts held in the client-side index. Default 2000. */
  maxPosts?: number;
  /** Max pages of a sitemap index followed. Default 5. */
  maxSitemaps?: number;
  /** Cache the built index in sessionStorage for this many seconds. 0 disables. Default 600. */
  cacheTtl?: number;
  /** Annotate tools with untrustedContentHint so agents treat post text as data, not instructions. Default true. */
  untrustedContent?: boolean;
  /** Pagefind bundle URL (/pagefind/pagefind.js) to use for search, or false. Auto-detected on Pagefind sites. */
  pagefind?: string | false;
  /** Hosted/remote search endpoint: GET {endpoint}?q=...&limit=... → { items: PostSummary[] }. */
  searchEndpoint?: string;
  /**
   * Analytics endpoint: each tool call is sent with navigator.sendBeacon as
   * { tool, ok, ms, page, query? } (search queries only; never post content). Off by default.
   */
  analytics?: string;
  /** Site key sent with analytics beacons (hosted dashboards). */
  analyticsKey?: string;
  /** Origins of other frames allowed to see the tools (WebMCP exposedTo). Default: none. */
  exposedTo?: string[];
  /** Register navigate_to (opens a same-origin URL in this tab; not read-only). Default false. */
  navigate?: boolean;
  /** Called after every tool call. Hook for analytics (never receives page content). */
  onToolCall?: (e: ToolCallEvent) => void;
  /** Also register through a polyfill's navigator.modelContext when document.modelContext is absent. Default true. */
  legacy?: boolean;
  /** Log registration details to the console. */
  debug?: boolean;
}
