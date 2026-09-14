import { describe, expect, it } from 'vitest'
import { case001 } from '../../data/cases/case001'
import { createCheckpoint } from '../checkpoints'
import { getCaseSaveKey, loadCaseSave, saveCase } from '../persistence/caseSave'
import { MemoryStorage } from './storage'

const state = () => ({ placements: [{ characterId: 'lucia', position: { row: 1, column: 3 } }], manualExcludedCells: [{ row: 2, column: 1 }] })
const hintsUsed = { review: 2, exclusion: 1, reveal: 3 }

describe('save V4', () => {
  it.each([1, 2, 3])('migrates V%i with positions, exclusions and historical hint usage intact', saveVersion => {
    const storage = new MemoryStorage(), board = state()
    const previous = { saveVersion, placements: board.placements, hintsUsed, ...(saveVersion === 1 ? { excludedCells: board.manualExcludedCells } : { manualExcludedCells: board.manualExcludedCells }) }
    storage.setItem(getCaseSaveKey(case001.id), JSON.stringify(previous))
    const migrated = loadCaseSave(case001.id, storage, case001)
    expect(migrated).toEqual({ saveVersion: 4, ...board, hintsUsed, checkpoints: [], positionChecksUsed: 0 })
    saveCase(case001.id, migrated, storage)
    expect(JSON.parse(storage.getItem(getCaseSaveKey(case001.id))!)).toEqual(migrated)
  })

  it('round-trips V4 snapshots and counters without shared references', () => {
    const storage = new MemoryStorage(), board = state(), checkpoint = createCheckpoint(board, 'Hipótesis almacén', 'Antes de probar otra fila')
    const source = { ...board, hintsUsed: { ...hintsUsed }, checkpoints: [checkpoint], positionChecksUsed: 1 }
    saveCase(case001.id, source, storage)
    const loaded = loadCaseSave(case001.id, storage, case001)
    expect(loaded).toEqual({ saveVersion: 4, ...source })
    expect(loaded.placements[0].position).not.toBe(source.placements[0].position)
    expect(loaded.checkpoints[0].placements[0].position).not.toBe(checkpoint.placements[0].position)
    expect(loaded.checkpoints[0].manualExcludedCells[0]).not.toBe(checkpoint.manualExcludedCells[0])
    loaded.checkpoints[0].placements[0].position.row = 6
    loaded.hintsUsed.review = 99
    source.manualExcludedCells[0].column = 6
    const again = loadCaseSave(case001.id, storage, case001)
    expect(again.checkpoints[0].placements[0].position.row).toBe(1)
    expect(again.hintsUsed).toEqual(hintsUsed)
    expect(again.manualExcludedCells).toEqual([{ row: 2, column: 1 }])
  })

  it.each(['{', 'null', '{}', '{"saveVersion":4,"placements":{}}', '{"saveVersion":5,"placements":[]}', '{"saveVersion":"4","placements":[]}'])('loads safe V4 defaults from invalid root %s', value => {
    const storage = new MemoryStorage()
    storage.setItem(getCaseSaveKey('corrupt'), value)
    expect(loadCaseSave('corrupt', storage)).toEqual({ saveVersion: 4, placements: [], manualExcludedCells: [], hintsUsed: { review: 0, exclusion: 0, reveal: 0 }, checkpoints: [], positionChecksUsed: 0 })
  })

  it('ignores corrupt snapshots while retaining a valid snapshot and current board', () => {
    const storage = new MemoryStorage(), valid = createCheckpoint(state(), 'Válida')
    const badValues = [null, {}, { ...valid, id: 1 }, { ...valid, name: '' }, { ...valid, name: 12 }, { ...valid, description: [] }, { ...valid, createdAt: 'invalid' }, { ...valid, placements: {} }, { ...valid, manualExcludedCells: null }, { ...valid, placements: [{ characterId: 'lucia', position: { row: 0, column: 3 } }] }, { ...valid, placements: [{ characterId: 'lucia', position: { row: 1.5, column: 3 } }] }, { ...valid, placements: [{ characterId: 'lucia', position: { row: 7, column: 3 } }] }, { ...valid, placements: [{ characterId: 'unknown', position: { row: 1, column: 3 } }] }, { ...valid, placements: [{ characterId: 'lucia', position: { row: 1, column: 2 } }] }, { ...valid, manualExcludedCells: [{ row: 1, column: 3 }] }, { ...valid, manualExcludedCells: [{ row: 4, column: 2 }] }, { ...valid, manualExcludedCells: [{ row: 99, column: 99 }] }]
    // Each candidate is checked independently, so duplicate-ID rejection cannot conceal malformed data.
    for (const bad of badValues) {
      storage.setItem(getCaseSaveKey(case001.id), JSON.stringify({ saveVersion: 4, ...state(), checkpoints: [bad, valid], hintsUsed, positionChecksUsed: 1 }))
      const loaded = loadCaseSave(case001.id, storage, case001)
      expect(loaded.checkpoints).toEqual([valid])
      expect(loaded).toMatchObject({ ...state(), hintsUsed, positionChecksUsed: 1 })
    }
  })

  it('validates current coordinates, duplicate rows/columns and unknown characters against the case', () => {
    const storage = new MemoryStorage()
    storage.setItem(getCaseSaveKey(case001.id), JSON.stringify({ saveVersion: 4, placements: [...state().placements, { characterId: 'nora', position: { row: 1, column: 6 } }, { characterId: 'mateo', position: { row: 2, column: 3 } }, { characterId: 'unknown', position: { row: 3, column: 6 } }, { characterId: 'bruno', position: { row: 4, column: 2 } }, { characterId: 'alma', position: { row: 7, column: 2 } }, null], manualExcludedCells: [{ row: -1, column: 2 }, { row: 2, column: 1 }, { row: 2, column: 1 }, { row: 1, column: 3 }, { row: 2, column: 2 }] }))
    expect(loadCaseSave(case001.id, storage, case001)).toMatchObject(state())
  })

  it.each([-1, 1.5, '1', null, Number.MAX_SAFE_INTEGER + 1])('uses safe counter defaults for %j', positionChecksUsed => {
    const storage = new MemoryStorage()
    storage.setItem(getCaseSaveKey('checks'), JSON.stringify({ saveVersion: 4, ...state(), checkpoints: {}, hintsUsed, positionChecksUsed }))
    expect(loadCaseSave('checks', storage)).toMatchObject({ checkpoints: [], positionChecksUsed: 0, hintsUsed })
  })

  it('keeps checkpoints and counters isolated by Normal, Daily and Infinite case IDs', () => {
    const storage = new MemoryStorage(), ids = ['normal-d1-c2-g1', 'daily-2026-09-14-d1-g1', 'infinite-d1-s42-g1']
    ids.forEach((id, index) => saveCase(id, { ...state(), checkpoints: [createCheckpoint(state(), `Hipótesis ${index}`)], positionChecksUsed: index }, storage))
    ids.forEach((id, index) => {
      const save = loadCaseSave(id, storage)
      expect(save.checkpoints.map(checkpoint => checkpoint.name)).toEqual([`Hipótesis ${index}`])
      expect(save.positionChecksUsed).toBe(index)
    })
    expect(loadCaseSave('other', storage).checkpoints).toEqual([])
  })

  it('partial board saves do not wipe checkpoints or replenish spent uses', () => {
    const storage = new MemoryStorage(), checkpoint = createCheckpoint(state(), 'Original')
    saveCase('test', { ...state(), checkpoints: [checkpoint], positionChecksUsed: 1, hintsUsed }, storage)
    saveCase('test', { placements: [], manualExcludedCells: [] }, storage)
    expect(loadCaseSave('test', storage)).toMatchObject({ checkpoints: [checkpoint], positionChecksUsed: 1, hintsUsed })
  })
})
