<template>
  <div class="page">
    <header class="bar">
      <h1>acad-ts → cad-viewer</h1>
      <input type="file" accept=".dwg" @change="onPick" />
      <button :disabled="!picked || benching" @click="benchPicked">
        {{ benching ? 'Parsing…' : 'Bench parse' }}
      </button>
      <button :disabled="!picked" @click="openInViewer">Open in viewer</button>
      <span v-if="error" class="error">{{ error }}</span>
    </header>

    <div v-if="bench" class="bench">
      <table>
        <tbody>
          <tr>
            <td>File</td>
            <td>{{ bench.fileName }}</td>
          </tr>
          <tr>
            <td>Decode (acad-ts <code>DwgReader</code>, one synchronous main-thread pass)</td>
            <td>{{ bench.parseMs.toFixed(0) }} ms</td>
          </tr>
          <tr>
            <td>Map → AcDbDatabase (chunked, UI stays responsive)</td>
            <td>{{ bench.mapMs.toFixed(0) }} ms</td>
          </tr>
          <tr>
            <td>Total</td>
            <td>{{ bench.totalMs.toFixed(0) }} ms</td>
          </tr>
          <tr>
            <td>Model-space entities</td>
            <td>{{ bench.entities }}</td>
          </tr>
          <tr>
            <td>Unmapped entity types (counted, skipped)</td>
            <td>{{ bench.unknownEntities }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else-if="!viewerFile" class="hint">
      Pick a <code>.dwg</code> file (DWG R14–R2018+, same matrix as acad-ts's
      <code>DwgReader</code>). This app registers
      <code>@njbestway/acad-ts-converter</code> on the DWG slot at startup
      (last-writer-wins), so <b>every</b> DWG open — including the viewer's
      built-in Open dialog below — goes through the pure-TypeScript acad-ts
      parser: no WASM, no worker. DXF is untouched and still handled by the
      host's built-in engine. <b>Bench parse</b> times a standalone parse;
      <b>Open in viewer</b> hands the file to <code>MlCadViewer</code>.
    </p>

    <section class="viewer">
      <MlCadViewer v-if="viewerFile" locale="default" :local-file="viewerFile" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { AcDbAcadTsConverter } from '@njbestway/acad-ts-converter'
import { MlCadViewer } from '@mlightcad/cad-viewer'
import { AcDbDatabase } from '@mlightcad/data-model'
import { ref } from 'vue'

interface BenchResult {
  fileName: string
  totalMs: number
  parseMs: number
  mapMs: number
  entities: number
  unknownEntities: number
}

const picked = ref<File | null>(null)
const viewerFile = ref<File | null>(null)
const benching = ref(false)
const bench = ref<BenchResult | null>(null)
const error = ref<string | null>(null)

const onPick = (event: Event) => {
  const input = event.target as HTMLInputElement
  picked.value = input.files && input.files.length > 0 ? input.files[0] : null
  bench.value = null
  error.value = null
}

const runBench = async (file: File) => {
  benching.value = true
  error.value = null
  bench.value = null
  try {
    const buffer = await file.arrayBuffer()
    const converter = new AcDbAcadTsConverter({ useWorker: false })
    const db = new AcDbDatabase()

    // The converter reports per-stage progress (PARSE / LAYER / LTYPE / STYLE
    // / BLOCK_RECORD / ENTITY / BLOCK). Timestamp the PARSE boundaries to
    // split raw decode out of the mapping pass; everything after PARSE:END is
    // mapping (already chunked with UI yields inside the converter).
    const marks = new Map<string, number>()
    let unknownEntities = 0
    const t0 = performance.now()
    await converter.read(buffer, db, {
      progress: async (_percentage, stage, status, data) => {
        marks.set(`${String(stage)}/${String(status)}`, performance.now() - t0)
        if (data && typeof data === 'object' && 'unknownEntityCount' in data) {
          const value = (data as { unknownEntityCount?: number })
            .unknownEntityCount
          if (typeof value === 'number') unknownEntities = value
        }
      }
    })
    const totalMs = performance.now() - t0
    const parseMs =
      (marks.get('PARSE/END') ?? totalMs) - (marks.get('PARSE/START') ?? 0)

    const modelSpace = db.tables.blockTable.modelSpace
    const entities = modelSpace ? modelSpace.newIterator().count : 0

    bench.value = {
      fileName: file.name,
      totalMs,
      parseMs,
      mapMs: totalMs - parseMs,
      entities,
      unknownEntities
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    benching.value = false
  }
}

const benchPicked = () => {
  if (picked.value) runBench(picked.value)
}

const openInViewer = () => {
  if (picked.value) viewerFile.value = picked.value
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: system-ui, sans-serif;
}
.bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  border-bottom: 1px solid #ddd;
  flex-wrap: wrap;
}
.bar h1 {
  font-size: 16px;
  margin: 0 16px 0 0;
  white-space: nowrap;
}
.bar button {
  padding: 4px 12px;
  cursor: pointer;
}
.error {
  color: #c0392b;
}
.hint {
  padding: 12px 16px;
  color: #444;
  max-width: 900px;
}
.bench {
  padding: 8px 16px;
}
.bench table {
  border-collapse: collapse;
}
.bench td {
  border: 1px solid #ddd;
  padding: 4px 10px;
  font-size: 13px;
}
.bench td:first-child {
  color: #555;
}
.viewer {
  flex: 1;
  min-height: 0;
}
</style>
