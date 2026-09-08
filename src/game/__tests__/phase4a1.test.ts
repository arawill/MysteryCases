import { describe, expect, it } from 'vitest'
import { case001 } from '../../data/cases/case001'
import { formatDifficultyStars, isDifficultyRating } from '../difficulty'
import { getAutomaticExcludedCells, mergeExcludedCells } from '../exclusions'
import { loadCaseSave, saveCase } from '../persistence/caseSave'
import { isCaseCompleted, loadProgress, markCaseCompleted } from '../persistence/progress'
import { loadSettings, updateSettings } from '../persistence/settings'
import { createScenarioProfile } from '../generation/scenario/profile'
import { validateGenerationTemplate, validateScenarioProfile } from '../generation/scenario/validation'
import { createGenerationTemplate } from '../generation/template'
import { validateCaseDefinition } from '../validation'

const memory = () => {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
    clear: () => data.clear(),
    key: () => null,
    get length() { return data.size },
  } as Storage
}

const emptySave = { saveVersion: 3, placements: [], manualExcludedCells: [], hintsUsed: { review: 0, exclusion: 0, reveal: 0 } }

describe('FASE 4A.1', () => {
  it('valida dificultad y formatea estrellas', () => {
    expect([1, 2, 3, 4, 5].every(isDifficultyRating)).toBe(true)
    expect([0, 6, -1, 1.5, '1', NaN, Infinity].some(isDifficultyRating)).toBe(false)
    expect(formatDifficultyStars(1)).toBe('★')
    expect(formatDifficultyStars(3)).toBe('★★★')
    expect(formatDifficultyStars(5)).toBe('★★★★★')
  })

  it('deriva autodesmarque exacto y fusiona sin mutar', () => {
    const board = Array.from({ length: 9 }, (_, i) => ({ row: Math.floor(i / 3) + 1, column: i % 3 + 1, zoneId: 'z', occupiable: i !== 1 }))
    expect(getAutomaticExcludedCells(board, [{ characterId: 'a', position: { row: 2, column: 2 } }])).toEqual([{ row: 2, column: 1 }, { row: 2, column: 3 }, { row: 3, column: 2 }])
    const many = getAutomaticExcludedCells(board.map(cell => ({ ...cell, occupiable: true })), [{ characterId: 'a', position: { row: 1, column: 1 } }, { characterId: 'b', position: { row: 3, column: 3 } }])
    expect(new Set(many.map(item => `${item.row}:${item.column}`)).size).toBe(many.length)
    expect(many.some(item => item.row === 1 && item.column === 1 || item.row === 3 && item.column === 3)).toBe(false)
    const manual = [{ row: 1, column: 1 }]
    const auto = [{ row: 1, column: 1 }, { row: 1, column: 2 }]
    expect(mergeExcludedCells(manual, auto)).toHaveLength(2)
    expect(manual).toEqual([{ row: 1, column: 1 }])
  })

  it('migra saves V1/V2 y guarda V3', () => {
    const storage = memory()
    storage.setItem('mystery-cases-case001', JSON.stringify({ saveVersion: 1, placements: [], excludedCells: [{ row: 1, column: 1 }] }))
    expect(loadCaseSave('case001', storage)).toEqual({ ...emptySave, manualExcludedCells: [{ row: 1, column: 1 }] })
    storage.setItem('mystery-cases-case001', JSON.stringify({ saveVersion: 2, placements: [], manualExcludedCells: [{ row: 2, column: 2 }] }))
    expect(loadCaseSave('case001', storage)).toEqual({ ...emptySave, manualExcludedCells: [{ row: 2, column: 2 }] })
    saveCase('case001', { placements: [], manualExcludedCells: [{ row: 3, column: 3 }] }, storage)
    expect(JSON.parse(storage.getItem('mystery-cases-case001') ?? '{}')).toEqual({ ...emptySave, manualExcludedCells: [{ row: 3, column: 3 }] })
  })

  it('hace round-trip V3 sin compartir referencias', () => {
    const storage = memory()
    const placements = [{ characterId: 'a', position: { row: 1, column: 1 } }]
    const excluded = [{ row: 2, column: 2 }]
    const hintsUsed = { review: 2, exclusion: 1, reveal: 3 }
    saveCase('roundtrip', { placements, manualExcludedCells: excluded, hintsUsed }, storage)
    const loaded = loadCaseSave('roundtrip', storage)
    expect(loaded).toEqual({ saveVersion: 3, placements, manualExcludedCells: excluded, hintsUsed })
    expect(loaded.placements).not.toBe(placements)
    expect(loaded.manualExcludedCells).not.toBe(excluded)
    expect(loaded.hintsUsed).not.toBe(hintsUsed)
    loaded.placements[0].position.row = 9
    expect(placements[0].position.row).toBe(1)
  })

  it('devuelve save V3 vacío ante corrupción o versión desconocida', () => {
    const storage = memory()
    for (const value of ['{', 'null', '{}', JSON.stringify({ saveVersion: 2, placements: {} }), JSON.stringify({ saveVersion: 4, placements: [] }), JSON.stringify({ saveVersion: 999, placements: [] }), JSON.stringify({ saveVersion: '3', placements: [] })]) {
      storage.setItem('mystery-cases-case001', value)
      expect(loadCaseSave('case001', storage)).toEqual(emptySave)
    }
  })

  it('protege settings y progreso corruptos', () => {
    const storage = memory()
    storage.setItem('mystery-cases-settings', '{')
    expect(loadSettings(storage)).toMatchObject({ theme: 'dark', autoCrossout: false, saveVersion: 1 })
    updateSettings({ theme: 'light', autoCrossout: true }, storage)
    updateSettings({ theme: 'dark' }, storage)
    expect(loadSettings(storage).autoCrossout).toBe(true)
    markCaseCompleted('case001', storage)
    markCaseCompleted('case001', storage)
    markCaseCompleted('case002', storage)
    expect(loadProgress(storage).completedCaseIds).toEqual(['case001', 'case002'])
    expect(isCaseCompleted('case001', storage)).toBe(true)
  })

  it('rechaza progreso corrupto y filtra entradas inválidas', () => {
    const storage = memory()
    for (const value of ['{', JSON.stringify({ completedCaseIds: 'case001' }), JSON.stringify({ completedCaseIds: ['case001', 123, 'case001', null] })]) {
      storage.setItem('mystery-cases-progress', value)
      if (value.includes('123')) expect(loadProgress(storage).completedCaseIds).toEqual(['case001'])
      else expect(loadProgress(storage)).toEqual({ saveVersion: 1, completedCaseIds: [] })
    }
  })

  it('rechaza difficulty inválida en las validaciones', () => {
    const invalid = { ...case001, difficulty: 6 } as unknown as typeof case001
    expect(validateCaseDefinition(invalid)).toContain('La dificultad debe ser un valor entre 1 y 5.')
    const profile = { ...createScenarioProfile(case001), difficulty: 0 } as unknown as ReturnType<typeof createScenarioProfile>
    expect(validateScenarioProfile(profile)).toContain('La dificultad debe ser un valor entre 1 y 5.')
    const template = createGenerationTemplate(invalid)
    expect(validateGenerationTemplate(template)).toContain('La dificultad debe ser un valor entre 1 y 5.')
  })
})
