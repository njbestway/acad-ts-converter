# cad-viewer-example (acad-ts DWG parser)

Minimal, honest demo of wiring [`@njbestway/acad-ts-converter`](../../packages/acad-ts-converter) into the published `@mlightcad/cad-viewer` UI as the **default DWG parser**.

## What it shows

- `main.ts` calls `registerAcadTsConverter()` before mounting — the DWG slot is last-writer-wins, so every DWG open in the app (our file button *and* the viewer's built-in Open dialog) goes through the pure-TypeScript acad-ts parser. No WASM, no worker, no `.wasm`/worker asset routing at all.
- **Bench parse** button: times a standalone `AcDbAcadTsConverter.read()` on the picked file and splits **decode vs map** using the converter's stage-progress callbacks, plus entity counts. You will see decode is one synchronous main-thread pass (the known acad-ts trade-off) while mapping is chunked.
- **Open in viewer** button: hands the file to `MlCadViewer` via the `local-file` prop.

## Run

```bash
pnpm install          # from the repo root
pnpm dev              # serves this example (http://localhost:5173)
```

Then pick a `.dwg` file (DWG R14–R2018+ per acad-ts's `DwgReader` matrix).

## Notes

- Dependencies are the **published npm packages** (`@mlightcad/cad-viewer@1.7.6`), not the local cad-viewer fork — the converter integrates purely through the public `AcDbDatabaseConverterManager` slot API, so the example doubles as a consumer-parity check.
- `cad-agent-plugin` / `cad-html-plugin` / `cad-pdf-plugin` / `cad-simple-viewer` / `cad-svg-plugin` / `pdf-renderer` are declared as *optional* peers of `cad-viewer`, but its bundle imports them statically (top-level `import` or hoisted `import()` in prebundled deps) — leaving them uninstalled breaks the build/dev server with `"registerLazyPdfPlugin" is not exported…` / `Failed to resolve import "__vite-optional-peer-dep:…"` errors. They are pinned to the same `1.7.6` and are there purely for assembly; this example never exercises their features. (`cad-onedrive-plugin` / `cad-google-drive-plugin` are genuinely lazy and gated on runtime config, so they are omitted.)
- DXF files still use the host's built-in DXF engine; this example only swaps the **DWG** slot.
- Fonts/templates load from the library's default CDN base URL. For offline or restricted networks, pass your own `base-url` prop to `MlCadViewer` pointing at a local checkout of `mlightcad/cad-data` (needs `fonts/` and `data/`).
