// Engine-in-script-tag build only: reuse the page extractor and markdown converter the core
// bundle already shipped, instead of downloading them twice.
const s = () => (window as any).ReadMCP.shared;
export const extractPage: typeof import('./extract').extractPage = (...a) => s().extractPage(...a);
export const extractSite: typeof import('./extract').extractSite = (...a) => s().extractSite(...a);
export const toMarkdown: typeof import('./markdown').toMarkdown = (...a) => s().toMarkdown(...a);
