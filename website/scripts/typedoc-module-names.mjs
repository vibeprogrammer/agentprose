// TypeDoc plugin: names each module after its import path (agentprose, agentprose/full, agentprose/adapters/ghost),
// so the API reference reads the way you import it and no module is called "index".
import { Converter, ReflectionKind } from 'typedoc';

export function load(app) {
  app.converter.on(Converter.EVENT_RESOLVE_BEGIN, (context) => {
    for (const m of context.project.getReflectionsByKind(ReflectionKind.Module)) {
      m.name = m.name === 'index' ? 'agentprose' : `agentprose/${m.name}`;
    }
  });
}
