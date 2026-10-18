import type { Lib } from './lib';
import { addScript, base } from './script';

declare const __VERSION__: string;

// Captured while the script-tag build is first evaluated, when currentScript is ours.
const cur = (document.currentScript as HTMLScriptElement | null)?.src;
const me = cur && base(cur, __VERSION__);
let p: Promise<Lib> | undefined;

export const loadLib = (): Promise<Lib> =>
  (p ||= new Promise<Lib>((resolve, reject) => {
    const g = ((window as any).AgentProse ||= { adapters: {} });
    if (g.lib) return resolve(g.lib);
    const src = new URL('agentprose.index.min.js', me || location.href).href;
    addScript(src, (ok) => (g.lib ? resolve(g.lib) : reject(new Error((ok ? 'index module did not load: ' : 'could not load ') + src))));
  })).catch((e) => {
    p = undefined;
    throw e;
  });
