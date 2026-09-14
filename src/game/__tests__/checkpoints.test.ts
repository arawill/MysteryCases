import { describe, expect, it } from 'vitest'
import { createCheckpoint, deleteCheckpoint, restoreCheckpoint, resetInvestigationBoard, sanitiseCheckpoints } from '../checkpoints'
import { loadCaseSave } from '../persistence/caseSave'
import { MemoryStorage } from './storage'

const boardState = () => ({ placements: [{ characterId: 'lucia', position: { row: 1, column: 3 } }], manualExcludedCells: [{ row: 2, column: 1 }] })

describe('checkpoints', () => {
  it('stores the hypothesis, trims text and makes independent nested copies with unique IDs', () => {
    const source = boardState()
    const checkpoint = createCheckpoint(source, '  Primera hipótesis  ', '  Antes del almacén  ')
    expect(checkpoint).toMatchObject({ ...source, name: 'Primera hipótesis', description: 'Antes del almacén' })
    expect(Number.isFinite(Date.parse(checkpoint.createdAt))).toBe(true)
    expect(createCheckpoint(source, 'Otra').id).not.toBe(checkpoint.id)
    expect(checkpoint).not.toHaveProperty('hintsUsed')
    expect(checkpoint).not.toHaveProperty('positionChecksUsed')
    source.placements[0].position.row = 5; source.manualExcludedCells[0].column = 6
    expect(checkpoint.placements[0].position).toEqual({ row: 1, column: 3 })
    expect(checkpoint.manualExcludedCells).toEqual([{ row: 2, column: 1 }])
  })

  it.each(['', '   ', 'a'.repeat(41)])('rejects invalid name %j', name => {
    expect(() => createCheckpoint(boardState(), name)).toThrow('nombre')
  })

  it('accepts bounded text and optional description, rejecting too long notes', () => {
    expect(createCheckpoint(boardState(), 'a'.repeat(40), 'b'.repeat(160)).description).toHaveLength(160)
    expect(createCheckpoint(boardState(), 'Sin notas')).not.toHaveProperty('description')
    expect(() => createCheckpoint(boardState(), 'Notas', 'b'.repeat(161))).toThrow('descripción')
  })

  it('restores only board data, keeping spent hints, checks and checkpoints', () => {
    const checkpoint = createCheckpoint(boardState(), 'Almacén')
    const current = { ...loadCaseSave('test', new MemoryStorage()), placements: [], manualExcludedCells: [], checkpoints: [checkpoint], hintsUsed: { review: 2, exclusion: 3, reveal: 1 }, positionChecksUsed: 1 }
    const restored = restoreCheckpoint(current, checkpoint.id)
    expect(restored).toMatchObject({ ...boardState(), hintsUsed: current.hintsUsed, positionChecksUsed: 1, checkpoints: [checkpoint] })
    restored.placements[0].position.column = 6; restored.manualExcludedCells[0].row = 3
    expect(checkpoint).toMatchObject(boardState())
    expect(current.placements).toEqual([])
    expect(restoreCheckpoint(current, 'missing')).toEqual(current)
  })

  it('deletes a checkpoint without mutating the collection or retained snapshots', () => {
    const first = createCheckpoint(boardState(), 'Primera'), second = createCheckpoint(boardState(), 'Segunda')
    const source = [first, second], result = deleteCheckpoint(source, first.id)
    expect(result).toEqual([second]); expect(source).toEqual([first, second])
    result[0].placements[0].position.row = 6
    expect(second.placements[0].position.row).toBe(1)
  })

  it('reset keeps checkpoints and all counters', () => {
    const current = { ...loadCaseSave('test', new MemoryStorage()), ...boardState(), checkpoints: [createCheckpoint(boardState(), 'Original')], hintsUsed: { review: 2, exclusion: 1, reveal: 1 }, positionChecksUsed: 1 }
    expect(resetInvestigationBoard(current)).toEqual({ ...current, placements: [], manualExcludedCells: [] })
    expect(current.placements).toHaveLength(1)
  })

  it('sorts by creation date, removes duplicate IDs and never mutates input', () => {
    const first = { ...createCheckpoint(boardState(), 'Primera'), createdAt: '2026-09-08T12:00:00.000Z' }
    const second = { ...createCheckpoint(boardState(), 'Segunda'), createdAt: '2026-09-09T12:00:00.000Z' }
    const source = [first, second, first]
    expect(sanitiseCheckpoints(source).map(item => item.name)).toEqual(['Segunda', 'Primera'])
    expect(source).toEqual([first, second, first])
    expect(sanitiseCheckpoints(null)).toEqual([])
  })
})
