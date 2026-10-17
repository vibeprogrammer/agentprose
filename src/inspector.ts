/**
 * readmcp inspector: a floating panel that lists the WebMCP tools on the page and runs them.
 * Loads with ?readmcp-inspect in the URL, data-inspector on the script tag, or this file directly.
 * Uses document.modelContext.getTools()/executeTool() when the browser has WebMCP, otherwise calls
 * readmcp's own tool registry, so it works in every browser.
 */
type Tool = { name: string; title?: string; description: string; inputSchema?: any; annotations?: any };

const w = window as any;

async function sourceOfTools(): Promise<{ mode: string; tools: Tool[]; run: (t: Tool, input: any) => Promise<any> }> {
  const mc = (document as any).modelContext;
  if (mc?.getTools) {
    try {
      const tools = await mc.getTools();
      if (tools.length) return { mode: 'Native WebMCP (document.modelContext)', tools, run: async (t, i) => JSON.parse(await mc.executeTool(t, i)) };
    } catch {
      /* fall through */
    }
  }
  await w.ReadMCP?.ready;
  const inst = w.ReadMCP?.instance;
  return {
    mode: mc ? 'WebMCP polyfill + readmcp registry' : 'This browser has no WebMCP yet; calling readmcp’s tools directly (same code an agent runs)',
    tools: inst?.tools || [],
    run: (t, i) => inst.call(t.name, i),
  };
}

const CSS = `
:host{all:initial}
*{box-sizing:border-box;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.btn{position:fixed;right:16px;bottom:16px;z-index:2147483646;background:#111827;color:#fff;border:0;border-radius:999px;padding:10px 16px;font-size:14px;font-weight:600;box-shadow:0 6px 24px rgba(0,0,0,.25);cursor:pointer}
.panel[hidden]{display:none}
.panel{position:fixed;right:16px;bottom:68px;z-index:2147483647;width:min(400px,calc(100vw - 32px));max-height:min(72vh,720px);display:flex;flex-direction:column;background:#fff;color:#111827;border:1px solid #e5e7eb;border-radius:14px;box-shadow:0 12px 48px rgba(0,0,0,.25);overflow:hidden;font-size:13px}
header{padding:12px 14px;border-bottom:1px solid #e5e7eb;background:#f9fafb}
header b{font-size:14px}
.mode{color:#6b7280;margin-top:4px;line-height:1.35}
.list{overflow:auto;padding:8px}
details{border:1px solid #e5e7eb;border-radius:10px;margin:6px 0;background:#fff}
summary{cursor:pointer;padding:9px 11px;list-style:none;display:flex;gap:8px;align-items:center}
summary::-webkit-details-marker{display:none}
code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}
.name{font-weight:600}
.ro{margin-left:auto;font-size:10px;color:#065f46;background:#d1fae5;border-radius:6px;padding:2px 6px}
.body{padding:0 11px 11px}
.desc{color:#374151;line-height:1.45;margin:0 0 8px}
label{display:block;margin:6px 0 2px;color:#374151;font-size:12px}
input,select{width:100%;padding:7px 8px;border:1px solid #d1d5db;border-radius:8px;font-size:13px}
.run{margin-top:9px;background:#2563eb;color:#fff;border:0;border-radius:8px;padding:8px 12px;font-weight:600;cursor:pointer}
pre{margin:8px 0 0;max-height:280px;overflow:auto;background:#0b1020;color:#e5e7eb;border-radius:8px;padding:10px;font-size:11.5px;line-height:1.45;white-space:pre-wrap;word-break:break-word}
.ms{color:#6b7280;font-size:11px;margin-top:4px}
`;

function field(name: string, s: any, required: boolean): string {
  const id = 'f-' + name;
  const label = `<label for="${id}"><code>${name}</code>${required ? ' *' : ''} ${s.description ? '— ' + esc(s.description) : ''}</label>`;
  if (s.enum) return label + `<select id="${id}" name="${name}"><option value=""></option>${s.enum.map((v: string) => `<option>${esc(v)}</option>`).join('')}</select>`;
  return label + `<input id="${id}" name="${name}" ${s.type === 'integer' || s.type === 'number' ? 'type="number"' : ''} placeholder="${s.type || 'string'}">`;
}

function esc(s: string): string {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

export async function mount(open = false): Promise<void> {
  if (document.getElementById('readmcp-inspector')) return;
  const host = document.createElement('div');
  host.id = 'readmcp-inspector';
  const root = host.attachShadow({ mode: 'open' });
  document.body.appendChild(host);
  const src = await sourceOfTools();
  root.innerHTML = `<style>${CSS}</style><button class="btn" aria-expanded="${open}">🔌 Agent tools (${src.tools.length})</button>
  <div class="panel" ${open ? '' : 'hidden'} role="dialog" aria-label="WebMCP tools on this page">
    <header><b>WebMCP tools on this page</b><div class="mode">${esc(src.mode)}</div></header>
    <div class="list">${src.tools
      .map((t) => {
        const props = t.inputSchema?.properties || {};
        const req: string[] = t.inputSchema?.required || [];
        return `<details data-tool="${esc(t.name)}"><summary><code class="name">${esc(t.name)}</code>${t.annotations?.readOnlyHint ? '<span class="ro">read-only</span>' : ''}</summary>
        <div class="body"><p class="desc">${esc(t.description)}</p><form>${Object.entries(props).map(([k, s]) => field(k, s, req.includes(k))).join('')}<button class="run" type="submit">Run ${esc(t.name)}</button></form><div class="out"></div></div></details>`;
      })
      .join('')}</div></div>`;
  const btn = root.querySelector('.btn') as HTMLButtonElement;
  const panel = root.querySelector('.panel') as HTMLElement;
  btn.onclick = () => {
    panel.hidden = !panel.hidden;
    btn.setAttribute('aria-expanded', String(!panel.hidden));
  };
  root.querySelectorAll('details').forEach((d) => {
    const t = src.tools.find((x) => x.name === d.getAttribute('data-tool'))!;
    const form = d.querySelector('form')!;
    form.onsubmit = async (e) => {
      e.preventDefault();
      const input: Record<string, unknown> = {};
      new FormData(form).forEach((v, k) => {
        if (v === '') return;
        const s = t.inputSchema?.properties?.[k];
        input[k] = s?.type === 'integer' || s?.type === 'number' ? Number(v) : v;
      });
      const out = d.querySelector('.out')!;
      out.innerHTML = '<div class="ms">running…</div>';
      const t0 = performance.now();
      try {
        const r = await src.run(t, input);
        out.innerHTML = `<pre>${esc(JSON.stringify(r, null, 2))}</pre><div class="ms">${Math.round(performance.now() - t0)} ms · ${esc(JSON.stringify(input))}</div>`;
      } catch (err: any) {
        out.innerHTML = `<pre>${esc(String(err?.message || err))}</pre>`;
      }
    };
  });
}

(w.ReadMCP ||= { adapters: {} }).inspect = mount;
// Opened automatically only where there is room for it beside the page.
const auto = (document.currentScript as HTMLScriptElement | null)?.dataset.open !== undefined && matchMedia('(min-width: 1560px)').matches;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mount(auto));
else mount(auto);
