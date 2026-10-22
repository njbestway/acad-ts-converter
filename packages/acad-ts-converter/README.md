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

## Publishing note

`@node-projects/acad-ts` is wired as a `link:` dependency to a sibling acad-ts checkout for local development. Before `npm publish`, replace it with a registry version (e.g. `^3.3.0`) and verify parity against the linked fork — the fork is synced commit-by-commit with upstream, but confirm no local-only fixes are relied upon.

## License

MIT
