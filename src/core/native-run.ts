/**
 * Runs a tool through the browser's own WebMCP. Current Chrome takes the input as an object; Chrome 150-era
 * builds wanted a JSON string, so a TypeError gets one retry with a string (safe here: agentprose's tools
 * are read-only). Results arrive serialized as JSON text in current builds and as values in older ones.
 */
export async function nativeRun(mc: any, t: unknown, input: any): Promise<any> {
  let r: any;
  try {
    r = await mc.executeTool(t, input);
  } catch (e) {
    if (!(e instanceof TypeError)) throw e;
    r = await mc.executeTool(t, JSON.stringify(input ?? {}));
  }
  if (typeof r != 'string') return r;
  try {
    return JSON.parse(r);
  } catch {
    return r;
  }
}

