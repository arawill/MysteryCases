import { describe, expect, it } from 'vitest'
import { case001 } from '../../data/cases/case001'
import { getExclusionHint, getRevealHint, reviewInvestigation } from '../hints'

describe('hints', () => {
  it('revisa únicamente contradicciones reales de pistas', () => {
    expect(reviewInvestigation(case001, [])).toEqual({ status: 'clear' })
    expect(reviewInvestigation(case001, [{ characterId: 'lucia', position: { row: 2, column: 3 } }])).toEqual({ status: 'contradiction', source: 'character', characterId: 'lucia' })
    expect(reviewInvestigation(case001, [
      { characterId: 'ines', position: { row: 4, column: 5 } },
      { characterId: 'alma', position: { row: 3, column: 2 } },
    ])).toEqual({ status: 'contradiction', source: 'character', characterId: 'alma' })
  })

  it('propone una exclusión determinista, segura y sin mutar entradas', () => {
    const placements = [{ characterId: 'mateo', position: { row: 2, column: 4 } }]
    const excluded = [{ row: 1, column: 1 }]
    const originalPlacements = structuredClone(placements)
    const originalExcluded = structuredClone(excluded)
    const first = getExclusionHint(case001, placements, excluded)
    const second = getExclusionHint(case001, placements, excluded)

    expect(first).toEqual(second)
    expect(first).not.toBeNull()
    expect(case001.board.find(cell => cell.row === first?.position.row && cell.column === first?.position.column)?.occupiable).toBe(true)
    expect(case001.solution.some(item => item.characterId === first?.characterId && item.position.row === first?.position.row && item.position.column === first?.position.column)).toBe(false)
    expect(placements.some(item => item.position.row === first?.position.row || item.position.column === first?.position.column)).toBe(false)
    expect(excluded).toEqual(originalExcluded)
    expect(placements).toEqual(originalPlacements)
  })

  it('revela solo una posición canónica y nunca coloca automáticamente', () => {
    const placements = [{ characterId: 'lucia', position: { row: 1, column: 1 } }]
    expect(getRevealHint(case001, placements, 'lucia')).toEqual({ characterId: 'lucia', position: { row: 1, column: 3 } })
    expect(placements).toEqual([{ characterId: 'lucia', position: { row: 1, column: 1 } }])
    expect(getRevealHint(case001, case001.solution, 'lucia')).toBeNull()
  })
})
