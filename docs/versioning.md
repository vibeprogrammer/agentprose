# Versioning and updates

agentprose follows [Semantic Versioning](https://semver.org/). While it is 0.x, a new minor (0.2) may change behaviour, so the recommended channel is pinned to the **major** version `0`: it receives every 0.x release, and a breaking 1.0 would ship as a new channel (`agentprose@1`, `/v/1/`) that you opt into.

## Recommended: follow the channel

| Where you load it from | Snippet | How fast fixes reach your site |
|---|---|---|
| jsDelivr | `https://cdn.jsdelivr.net/npm/agentprose@0/dist/agentprose.min.js` | jsDelivr resolves `@0` to the newest 0.x within 12 hours of a release (the maintainers purge it right after publishing, so usually minutes). Returning visitors' browsers may keep the previous copy for up to 7 days. |
| agentprose Cloud | `https://agentprose.cloud/v/0/agentprose.min.js` | The Cloud serves its newest 0.x at `/v/0/` with a 1-hour cache (`stale-while-revalidate` up to a day), so fixes reach visitors within about an hour. |

A moving channel never mixes versions on one page: from 0.1.2 on, the core loads its engine, adapters, inspector and polyfill from **its own exact version** (`agentprose@0.1.2/dist/…` on jsDelivr, `/v/0.1.2/…` on the Cloud), so a cached core always pairs with the engine it was built with.

## Advanced: pin an exact version

Pin when you need to review every change before it reaches your site, or want a Subresource Integrity hash on the tag itself:

```html
<script src="https://cdn.jsdelivr.net/npm/agentprose@0.1.2/dist/agentprose.min.js"
        integrity="sha384-…" crossorigin="anonymous" defer></script>
```

Compute the hash from the exact file:

```bash
curl -s https://cdn.jsdelivr.net/npm/agentprose@0.1.2/dist/agentprose.min.js | openssl dgst -sha384 -binary | openssl base64 -A
```

On the Cloud, `/v/<exact version>/agentprose.min.js` (for example `/v/0.1.2/`) is immutable and stays available. Exact versions never change, so the hash stays valid; you update by changing the version and the hash together. The hash covers the core file. The files the core loads later (engine, adapters) come from the same immutable version folder, and the MCP-B polyfill carries its own hash ([security.md](security.md#the-mcp-b-polyfill)).

## Self-hosting

A copy you serve yourself never changes until you replace it. Copy the whole `dist/` folder of one version from npm (`node_modules/agentprose/dist/`) so the core and the files it loads stay matched.
