import { describe, expect, it } from 'vitest'
import { case001 } from '../../data/cases/case001'
import { createCheckpoint, restoreCheckpoint, resetInvestigationBoard } from '../checkpoints'
import { getAutomaticExcludedCells } from '../exclusions'
import { loadCaseSave, saveCase } from '../persistence/caseSave'
import { checkCharacterPosition, getPositionCheckLimit } from '../positionChecks'
import { MemoryStorage } from './storage'

describe('position checks', () => {
  it.each([[6, 1], [7, 2], [8, 3], [9, 4], [10, 5], [3, 1]])('allows %i characters to use %i checks', (count, limit) => {
    expect(getPositionCheckLimit({ characters: Array.from({ length: count }, () => case001.characters[0]) })).toBe(limit)
  })

  it.each(['lucia', 'alma'])('correct suspect or victim %s consumes exactly one use without coordinates', id => {
    const state = { placements: structuredClone(case001.solution), positionChecksUsed: 0 }, before = structuredClone(state)
    expect(checkCharacterPosition(case001, state, id)).toEqual({ status: 'correct', positionChecksUsed: 1 })
    expect(state).toEqual(before)
  })

  it('incorrect placement consumes exactly one use without revealing the correct position', () => {
    expect(checkCharacterPosition(case001, { placements: [{ characterId: 'lucia', position: { row: 1, column: 1 } }], positionChecksUsed: 0 }, 'lucia')).toEqual({ status: 'incorrect', positionChecksUsed: 1 })
  })

  it('does not consume with no selection, invalid selection, an unplaced character or no remaining uses', () => {
    expect(checkCharacterPosition(case001, { placements: [], positionChecksUsed: 0 }, null)).toEqual({ status: 'noSelection', positionChecksUsed: 0 })
    expect(checkCharacterPosition(case001, { placements: [], positionChecksUsed: 0 }, 'unknown')).toEqual({ status: 'noSelection', positionChecksUsed: 0 })
    expect(checkCharacterPosition(case001, { placements: [], positionChecksUsed: 0 }, 'lucia')).toEqual({ status: 'unplaced', positionChecksUsed: 0 })
    expect(checkCharacterPosition(case001, { placements: case001.solution, positionChecksUsed: 1 }, 'lucia')).toEqual({ status: 'exhausted', positionChecksUsed: 1 })
  })

  it('does not consume if canonical data is missing', () => {
    expect(checkCharacterPosition({ ...case001, solution: [] }, { placements: case001.solution, positionChecksUsed: 0 }, 'lucia')).toEqual({ status: 'unavailable', positionChecksUsed: 0 })
  })

  it('spent uses survive checkpoint restoration, board reset and reload; auto exclusions derive from the restored board', () => {
    const storage = new MemoryStorage()
    const before = { ...loadCaseSave(case001.id, storage), placements: [structuredClone(case001.solution[0])], manualExcludedCells: [{ row: 3, column: 1 }] }
    const checkpoint = createCheckpoint(before, 'Antes de comprobar')
    const checked = checkCharacterPosition(case001, before, 'lucia')
    const after = { ...before, checkpoints: [checkpoint], positionChecksUsed: checked.positionChecksUsed, hintsUsed: { review: 3, exclusion: 2, reveal: 1 } }
    const restored = restoreCheckpoint({ ...after, placements: [], manualExcludedCells: [] }, checkpoint.id)
    expect(restored.positionChecksUsed).toBe(1)
    expect(restored.hintsUsed).toEqual(after.hintsUsed)
    expect(getAutomaticExcludedCells(case001.board, restored.placements)).toEqual(getAutomaticExcludedCells(case001.board, before.placements))
    saveCase(case001.id, restored, storage)
    expect(loadCaseSave(case001.id, storage, case001)).toEqual(restored)
    const reset = resetInvestigationBoard(loadCaseSave(case001.id, storage, case001))
    saveCase(case001.id, reset, storage)
    const reloaded = loadCaseSave(case001.id, storage, case001)
    expect(reloaded.positionChecksUsed).toBe(1)
    expect(reloaded.checkpoints).toEqual([checkpoint])
    expect(reloaded.placements).toEqual([])
    expect(reloaded.manualExcludedCells).toEqual([])
    expect(reloaded.hintsUsed).toEqual(after.hintsUsed)
    expect(checkCharacterPosition(case001, { ...reloaded, placements: case001.solution }, 'alma').status).toBe('exhausted')
  })
})
