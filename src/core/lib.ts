// The site-wide indexing engine (feeds, sitemap, llms.txt, search). In the npm build it is a
// plain static import; the script-tag build swaps this module for lib-lazy.ts so the engine
// only downloads when an agent first calls a site-wide tool.
import { aggregate, autoSource, filterPosts } from './source';
import { SearchIndex } from './search';
import { siteExec } from './site-tools';

export const lib = { autoSource, aggregate, filterPosts, SearchIndex, siteExec };
export type Lib = typeof lib;
export const loadLib = async (): Promise<Lib> => lib;
