# @njbestway/acad-ts-converter

DWG converter that maps an [acad-ts](https://github.com/node-projects/acad-ts) `CadDocument` directly into the [@mlightcad/data-model](https://www.npmjs.com/package/@mlightcad/data-model) `AcDbDatabase` — pure TypeScript on the calling thread, **no WASM, no worker, no `.wasm` asset routing**.

## Usage

Make acad-ts the default DWG parser for your app:

```ts
import { registerAcadTsConverter } from '@njbestway/acad-ts-converter'

// Registration is last-writer-wins on the DWG slot, so call this AFTER any
// built-in DWG converter registration you want to override.
registerAcadTsConverter()
```

Or drive the converter explicitly:

```ts
import { AcDbAcadTsConverter } from '@njbestway/acad-ts-converter'
import { AcDbDatabase } from '@mlightcad/data-model'

const converter = new AcDbAcadTsConverter({ useWorker: false })
const db = new AcDbDatabase()
await converter.read(dwgArrayBuffer, db)
// `db` now holds the mapped drawing — inspect `db.tables` / model space entities.
```

Mapping runs with chunked UI yielding (roughly 50 ms slices), so the main thread stays responsive while large drawings map; decoding itself is a single synchronous acad-ts pass — budget it for your UX (see the example app's benchmark output for real numbers).

## Dependencies

The parser is the published [`@node-projects/acad-ts`](https://www.npmjs.com/package/@node-projects/acad-ts) (MIT), pinned to `3.6.0` — an exact pin, validated end-to-end against this converter (tsc + the example build + a vitest regression suite that locks entity counts on known drawings). `@mlightcad/data-model` is a peer dependency (`~1.15.14`), so the database object graph stays a single instance shared with your host app; install it yourself.

> Why the peer is `~1.15.14` and not `^`: the converter reaches into a couple of `@mlightcad/data-model` private fields (to bind/restore the host working database headless). A `~1.15.x` range keeps those internals stable across patch bumps while you stay on a tested minor.

## Known limitations (0.x)

- **Bundler required.** The published ESM (`lib/*.js`) uses extensionless relative imports, which Vite/webpack/rollup resolve but bare Node ESM does **not** (`import '@njbestway/acad-ts-converter'` under plain `node` throws `ERR_MODULE_NOT_FOUND`). Consume it through a bundler, as the CAD viewer host does.
- **One conversion at a time.** Mapping binds the process-global `acdbHostApplicationServices().workingDatabase` for the duration of a `read()` and restores it afterwards. Overlapping/parallel `read()` calls in a single process will interleave on that global and can cross-contaminate or abort. Serialize conversions; this is not yet a concurrent-safe engine.
- **Decoding blocks the calling thread.** `DwgReader.readFromStream` is a single synchronous pass with no worker and no timeout/cancellation. Large DWGs freeze the caller (mapping, by contrast, yields to the event loop). For big drawings prefer the WASM engine (acad-rust); this package targets small/medium drawings and the simplest deploy shape.
- **Only `progress` is honored** among the base converter's read options; `encoding`, `sysVars`, `minimumChunkSize`, `timeout` are accepted but currently ignored.
- **Unmapped entities are counted, not failed.** Unknown entity types increment `unknownEntityCount` and are skipped; symbol-table adds are guarded so duplicate defaults don't abort a run — a side effect is that a genuinely malformed table record can be skipped silently rather than throwing.

## License

MIT

