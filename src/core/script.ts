/** Appends an async script to <head>; done(true) on load, done(false) on error. The caller checks what arrived. */
export function addScript(src: string, done?: (ok: boolean) => void): HTMLScriptElement {
  const s = document.createElement('script');
  s.src = src;
  s.async = true;
  s.onload = s.onerror = (e) => done?.((e as Event).type == 'load');
  return document.head.appendChild(s);
}
