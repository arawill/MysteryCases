import { describe, expect, it, vi } from 'vitest'
import { notifyCaseCompletionOnce, shouldPersistGameSession } from '../../game/completionNotification'
import { clearCaseSave, loadCaseSave, saveCase } from '../../game/persistence/caseSave'
import { MemoryStorage } from '../../game/__tests__/storage'

describe('GameScreen completion callback', () => {
  it('forwards the exact assist payload once for a resolved case', () => {
    const callback = vi.fn(), state = { current: false }
    const performance = { review: 2, exclusion: 1, positionChecks: 3 }

    expect(notifyCaseCompletionOnce(state, performance, callback)).toBe(true)
    expect(notifyCaseCompletionOnce(state, { review: 0, exclusion: 0, positionChecks: 0 }, callback)).toBe(false)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(performance)
  })

  it('allows autosave before completion but never recreates the cleared save afterwards', () => {
    const storage = new MemoryStorage(), state = { current: false }, caseId = 'normal-d1-c02-g7'
    const save = { placements: [{ characterId: 'person-01', position: { row: 1, column: 1 } }], manualExcludedCells: [{ row: 2, column: 2 }] }

    if (shouldPersistGameSession(state)) saveCase(caseId, save, storage)
    expect(loadCaseSave(caseId, storage).placements).toEqual(save.placements)

    clearCaseSave(caseId, storage)
    state.current = true
    if (shouldPersistGameSession(state)) saveCase(caseId, { ...save, manualExcludedCells: [] }, storage)

    expect(loadCaseSave(caseId, storage)).toEqual({ saveVersion: 4, placements: [], manualExcludedCells: [], hintsUsed: { review: 0, exclusion: 0, reveal: 0 }, checkpoints: [], positionChecksUsed: 0 })
  })
})
