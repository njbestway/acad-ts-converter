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

The parser is the published [`@node-projects/acad-ts`](https://www.npmjs.com/package/@node-projects/acad-ts) (MIT), pinned to `3.3.0` — the version this converter was developed and end-to-end verified against. `@mlightcad/data-model` is a peer dependency (`^1.15.14`), so the database object graph stays a single instance shared with your host app; install it yourself.

> `@node-projects/acad-ts` has moved on to `3.6.0` upstream. It is not tracked here because the intervening minors were not validated against this mapper; bump deliberately and re-run the example benchmark before relying on a newer parser.

## License

MIT
