import type { Lib } from './lib';

// Captured while the script-tag build is first evaluated, when currentScript is ours.
const me = (document.currentScript as HTMLScriptElement | null)?.src;
let p: Promise<Lib> | undefined;

export const loadLib = (): Promise<Lib> =>
  (p ||= new Promise<Lib>((resolve, reject) => {
    const g = ((window as any).ReadMCP ||= { adapters: {} });
    if (g.lib) return resolve(g.lib);
    const s = document.createElement('script');
    s.src = new URL('readmcp.index.min.js', me || location.href).href;
    s.async = true;
    s.onload = () => (g.lib ? resolve(g.lib) : reject(new Error('index module did not load')));
    s.onerror = () => reject(new Error('could not load ' + s.src));
    document.head.appendChild(s);
  })).catch((e) => {
    p = undefined;
    throw e;
  });
