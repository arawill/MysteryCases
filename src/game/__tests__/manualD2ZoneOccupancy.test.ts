import { describe, expect, it } from 'vitest'
import { manualNormalCases } from '../../data/cases/manualNormalCases'

describe('manual D2 zone occupancy', () => {
  it('places at least one person in every zone of every registered manual D2 case', () => {
    const manualD2Cases = [...manualNormalCases.values()].filter(caseData => caseData.difficulty === 2)
    expect(manualD2Cases.map(caseData => caseData.id)).toEqual(expect.arrayContaining(['case-d2-01', 'case-d2-02', 'case-d2-03', 'case-d2-04']))

    for (const caseData of manualD2Cases) {
      const emptyZones = caseData.zones
        .filter(zone => !caseData.solution.some(placement => caseData.board.find(cell => cell.row === placement.position.row && cell.column === placement.position.column)?.zoneId === zone.id))
        .map(zone => zone.id)
      expect(emptyZones, `${caseData.id} has empty zones: ${emptyZones.join(', ')}`).toEqual([])
    }
  })
})
