# acad-ts-converter

DWG parser plugin for [@mlightcad/data-model](https://www.npmjs.com/package/@mlightcad/data-model), built on [acad-ts](https://github.com/node-projects/acad-ts) (MIT, pure TypeScript). It maps an acad-ts `CadDocument` directly into the data-model `AcDbDatabase`, so any CAD viewer using the `AcDbDatabaseConverterManager` slot API can adopt it as its DWG reader — no WASM, no worker, no native toolchain.

- **Library**: [`packages/acad-ts-converter`](packages/acad-ts-converter) → `@njbestway/acad-ts-converter`
- **Example app**: [`examples/cad-viewer-example`](examples/cad-viewer-example) — registers the converter as the default DWG parser for the `@mlightcad/cad-viewer` UI.

## Why pure TypeScript

`acad-ts` parses DWG straight into a live `CadDocument` in-process, with **zero serialization at the parse boundary**. That makes it the simplest deployment shape (one JS bundle, no `.wasm` asset routing) at the cost of running decode on the calling thread — see the benchmark notes in the example for real numbers on large drawings.

## Workspace layout

This repo is a pnpm workspace:

```
packages/acad-ts-converter/   the published library (@njbestway/acad-ts-converter)
examples/cad-viewer-example/  Vite demo app wiring it into @mlightcad/cad-viewer
```

> Local development note: `@node-projects/acad-ts` is wired via a `link:` dependency to a sibling checkout of the acad-ts fork during development. Before publishing, that dependency must be switched to a registry version (see README of the package).

## Usage

```ts
import { registerAcadTsConverter } from '@njbestway/acad-ts-converter'

// Last writer wins on the DWG slot — call this after any built-in registration
// to make acad-ts the default DWG parser for the app.
registerAcadTsConverter()
```

Or construct the converter yourself and register it explicitly:

```ts
import { AcDbAcadTsConverter } from '@njbestway/acad-ts-converter'
import { AcDbDatabaseConverterManager, AcDbFileType } from '@mlightcad/data-model'

const converter = new AcDbAcadTsConverter({ useWorker: false })
AcDbDatabaseConverterManager.instance.register(AcDbFileType.DWG, converter)
```

## Development

```bash
pnpm install
pnpm build          # compile the library to lib/
pnpm dev            # serve examples/cad-viewer-example
```

## License

MIT — see [LICENSE](LICENSE). Upstream acad-ts is MIT as well; it is a TypeScript port of the C# [ACadSharp](https://github.com/DomCR/ACadSharp) library.
