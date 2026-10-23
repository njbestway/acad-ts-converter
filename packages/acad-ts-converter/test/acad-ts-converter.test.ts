import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

import { afterAll, describe, expect, it } from 'vitest'
import {
  AcDbAcadTsConverter,
  registerAcadTsConverter
} from '../lib/index.js'
import {
  AcDbDatabase,
  AcDbDatabaseConverterManager,
  AcDbFileType,
  acdbHostApplicationServices
} from '@mlightcad/data-model'

// Canonical regression corpus lives beside these tests (owned by the library).
const FIXTURES = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures')

/** Read a fixture into a standalone ArrayBuffer slice (no Node Buffer view leak). */
function fixtureBuffer(name: string): ArrayBuffer {
  const buf = readFileSync(resolve(FIXTURES, name))
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
}

/**
 * Run one end-to-end `read()` into a fresh AcDbDatabase and tally the two
 * numbers the benchmark panel reports: model-space entity count and the
 * converter's running `unknownEntityCount` (counted-but-skipped entities).
 */
async function readFixture(name: string): Promise<{
  entities: number
  unknownEntities: number
}> {
  const converter = new AcDbAcadTsConverter({ useWorker: false })
  const db = new AcDbDatabase()

  let unknownEntities = 0
  await converter.read(fixtureBuffer(name), db, {
    progress: async (_percentage, _stage, _status, data) => {
      if (data && typeof data === 'object' && 'unknownEntityCount' in data) {
        const value = (data as { unknownEntityCount?: number })
          .unknownEntityCount
        if (typeof value === 'number') unknownEntities = value
      }
    }
  })

  const modelSpace = db.tables.blockTable.modelSpace
  const entities = modelSpace ? modelSpace.newIterator().count : 0
  return { entities, unknownEntities }
}

describe('AcDbAcadTsConverter.read() — end-to-end mapping regression', () => {
  // baseline-sample.dwg: 80 KB, the map-heavy mixed drawing. These counts were
  // identical on acad-ts 3.3.0 and 3.6.0 — see HANDOFF §6 / §4 upgrade note.
  it('maps baseline-sample.dwg to 160 entities with 6 unmapped', async () => {
    const r = await readFixture('baseline-sample.dwg')
    expect(r.entities).toBe(160)
    expect(r.unknownEntities).toBe(6)
  })

  // map-of-uae.dwg: fully covered by the current mapper (unmapped = 0) — a
  // positive sentinel: if a future change starts skipping entities here, this
  // catches the breadth regression.
  it('maps map-of-uae.dwg to 129 entities with 0 unmapped', async () => {
    const r = await readFixture('map-of-uae.dwg')
    expect(r.entities).toBe(129)
    expect(r.unknownEntities).toBe(0)
  })
})

describe('workingDatabase self-binding (HANDOFF §5.1 core fix)', () => {
  // acdbHostApplicationServices().workingDatabase throws when nothing is bound;
  // the private _workingDatabase backing field is what the fix reads/restores.
  const host = acdbHostApplicationServices() as unknown as {
    workingDatabase: AcDbDatabase
    _workingDatabase: AcDbDatabase | null
  }

  it('reads a Hatch-bearing DWG headless and restores the prior binding', async () => {
    host._workingDatabase = null // harden the headless precondition
    const converter = new AcDbAcadTsConverter({ useWorker: false })
    const db = new AcDbDatabase()

    // baseline-sample has 19 AcDbHatch; each AcDbHatch construction reads the
    // working database during mapping. Without withWorkingDatabase() this
    // promise rejects with "The current working database must be set before
    // using it!".
    await expect(
      converter.read(fixtureBuffer('baseline-sample.dwg'), db, {})
    ).resolves.toBeUndefined()

    // Self-cleanup: after read() the working database binding must be restored
    // to its prior value (here, null) — no leaked global state.
    expect(host._workingDatabase).toBeNull()
  })
})

describe('registerAcadTsConverter() — DWG slot override (last-writer-wins)', () => {
  const manager = AcDbDatabaseConverterManager.instance

  afterAll(() => {
    // Don't leak a registered DWG converter into any other suite/process.
    manager.unregister(AcDbFileType.DWG)
  })

  it('overwrites whatever is in the DWG slot with an AcDbAcadTsConverter', () => {
    // Occupy the slot with a placeholder converter instance first...
    const placeholder = new AcDbAcadTsConverter({ useWorker: false })
    manager.register(AcDbFileType.DWG, placeholder)
    expect(manager.get(AcDbFileType.DWG)).toBe(placeholder)

    // ...then the convenience registrar must win, replacing it.
    registerAcadTsConverter()
    const active = manager.get(AcDbFileType.DWG)
    expect(active).toBeInstanceOf(AcDbAcadTsConverter)
    expect(active).not.toBe(placeholder)
  })
})
