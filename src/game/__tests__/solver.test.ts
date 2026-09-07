import { describe, expect, it } from 'vitest'
import { case001 } from '../../data/cases/case001'
import { solveCase } from '../solver'
import { analyzeCase } from '../analysis'
import { placementsEqual } from '../rules'
import type { GameCase } from '../types'
const smallCase = (clues: GameCase['characters'][number]['clues'][]): GameCase => ({ id: 'small', title: '', intro: '', difficulty: '', rows: 2, columns: 2, zones: [{ id: 'z', name: 'Z', tone: 'z' }], board: [{ row: 1, column: 1, zoneId: 'z', occupiable: true }, { row: 1, column: 2, zoneId: 'z', occupiable: true }, { row: 2, column: 1, zoneId: 'z', occupiable: true }, { row: 2, column: 2, zoneId: 'z', occupiable: true }], characters: [{ id: 'a', name: 'A', avatar: '', isVictim: true, clues: clues[0] }, { id: 'b', name: 'B', avatar: '', isVictim: false, clues: clues[1] }], solution: [{ characterId: 'a', position: { row: 1, column: 1 } }, { characterId: 'b', position: { row: 2, column: 2 } }] })
describe('solver', () => {
  it('encuentra la única solución de case001 y coincide con la canónica', () => { const analysis = analyzeCase(case001); expect(analysis.status).toBe('unique'); expect(analysis.solutionsFound).toBe(1); expect(analysis.solution && placementsEqual(analysis.solution, case001.solution)).toBe(true); expect(analysis.matchesCanonical).toBe(true) })
  it('no lee caseData.solution durante la búsqueda', () => { const altered: GameCase = { ...case001, solution: [] }; const result = solveCase(altered); expect(result.solutionsFound).toBe(1); expect(placementsEqual(result.solutions[0], case001.solution)).toBe(true) })
  it('detecta un caso ambiguo sin superar maxSolutions', () => { const result = solveCase(smallCase([[], []])); expect(result.solutionsFound).toBe(2) })
  it('respeta maxSolutions explícito y el valor predeterminado 2', () => { expect(solveCase(case001).solutionsFound).toBe(1); expect(solveCase(smallCase([[], []])).solutionsFound).toBe(2); expect(solveCase(smallCase([[], []]), { maxSolutions: 1 }).solutionsFound).toBe(1) })
  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rechaza maxSolutions inválido: %s', maxSolutions => { expect(() => solveCase(case001, { maxSolutions })).toThrow('maxSolutions must be a positive integer.') })
  it('detecta un caso imposible', () => { const result = solveCase(smallCase([[{ id: 'a-row', type: 'row', text: '', row: 1 }], [{ id: 'b-row', type: 'row', text: '', row: 1 }]])); expect(result.solutionsFound).toBe(0) })
})
