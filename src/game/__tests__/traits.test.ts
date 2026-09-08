import { describe, expect, it } from 'vitest'
import { evaluateClue } from '../clues'
import { evaluateGlobalClue } from '../globalClues'
import { reviewInvestigation } from '../hints'
import { placementsEqual } from '../rules'
import { solveCase } from '../solver'
import { characterHasTrait, getCharacterTraitIds, getTraitLabel } from '../traits'
import type { Character, GameCase, Placement, TraitDefinition } from '../types'
import { validateCaseDefinition } from '../validation'

const characters = (): Character[] => [
  { id: 'a', name: 'A', avatar: 'A', isVictim: false, traitIds: ['staff'], clues: [] },
  { id: 'b', name: 'B', avatar: 'B', isVictim: true, traitIds: ['staff'], clues: [] },
  { id: 'c', name: 'C', avatar: 'C', isVictim: false, traitIds: ['staff'], clues: [] },
  { id: 'd', name: 'D', avatar: 'D', isVictim: false, traitIds: ['visitor', 'staff'], clues: [] },
]
const traitDefinitions: TraitDefinition[] = [{ id: 'staff', label: 'Personal' }, { id: 'visitor', label: 'Visitante' }]
const traitCase = (): GameCase => ({
  id: 'traits', title: 'Traits', intro: 'Test', difficulty: 1, rows: 4, columns: 4,
  zones: [{ id: 'z', name: 'Zona', tone: 'z' }, { id: 'o', name: 'Otra', tone: 'o' }],
  board: Array.from({ length: 16 }, (_, index) => ({ row: Math.floor(index / 4) + 1, column: index % 4 + 1, zoneId: index % 4 === 0 ? 'z' : 'o', occupiable: true })),
  traitDefinitions, characters: characters(), solution: [],
})
const at = (id: string, row: number, column: number): Placement => ({ characterId: id, position: { row, column } })

describe('traits', () => {
  it('offers defensive generic trait helpers', () => {
    const [staff, , , visitor] = characters()
    expect(characterHasTrait(staff, 'staff')).toBe(true)
    expect(characterHasTrait({ ...visitor, traitIds: ['visitor'] }, 'staff')).toBe(false)
    expect(getCharacterTraitIds({ ...visitor, traitIds: undefined })).toEqual([])
    expect(getCharacterTraitIds({ ...visitor, traitIds: null as unknown as string[] })).toEqual([])
    expect(getTraitLabel(traitCase(), 'staff')).toBe('Personal')
  })

  it('evaluates companion trait clues without counting the subject', () => {
    const game = traitCase()
    const withTrait = { id: 'with', type: 'withTraitInZone' as const, traitId: 'staff', text: 'with' }
    const withoutTrait = { id: 'without', type: 'withoutTraitInZone' as const, traitId: 'staff', text: 'without' }
    const count = { id: 'count', type: 'companionTraitCount' as const, traitId: 'staff', count: 2, text: 'count' }
    const subject = [at('a', 1, 1)], visitor = [...subject, at('d', 2, 2)], one = [...subject, at('b', 2, 1)], two = [...one, at('c', 3, 1)], three = [...two, at('d', 4, 1)]
    expect(evaluateClue(withTrait, 'a', game, [])).toBe('undetermined')
    expect(evaluateClue(withTrait, 'a', game, subject)).toBe('undetermined')
    expect(evaluateClue(withTrait, 'a', game, visitor)).toBe('undetermined')
    expect(evaluateClue(withTrait, 'a', game, one)).toBe('satisfied')
    expect(evaluateClue(withoutTrait, 'a', game, subject)).toBe('undetermined')
    expect(evaluateClue(withoutTrait, 'a', game, one)).toBe('violated')
    expect(evaluateClue(withoutTrait, 'a', game, [at('a', 1, 1), at('b', 2, 2), at('c', 3, 2), at('d', 4, 2)])).toBe('satisfied')
    expect(evaluateClue(count, 'a', game, subject)).toBe('undetermined')
    expect(evaluateClue(count, 'a', game, one)).toBe('undetermined')
    expect(evaluateClue(count, 'a', game, two)).toBe('undetermined')
    expect(evaluateClue(count, 'a', game, three)).toBe('violated')
    expect(evaluateClue(count, 'a', game, [at('a', 1, 1), at('b', 2, 1), at('c', 3, 1), at('d', 4, 2)])).toBe('satisfied')
    expect(evaluateClue(count, 'a', game, [at('a', 1, 1), at('b', 2, 1), at('c', 3, 2), at('d', 4, 2)])).toBe('violated')
  })

  it('evaluates zoneTraitCount with monotonic tri-state semantics', () => {
    const game = traitCase()
    const clue = { id: 'zone-staff', type: 'zoneTraitCount' as const, zoneId: 'z', traitId: 'staff', count: 2, text: 'two staff' }
    expect(evaluateGlobalClue(clue, game, [])).toBe('undetermined')
    expect(evaluateGlobalClue(clue, game, [at('a', 1, 1)])).toBe('undetermined')
    expect(evaluateGlobalClue(clue, game, [at('a', 1, 1), at('b', 2, 1), at('c', 3, 1)])).toBe('violated')
    expect(evaluateGlobalClue(clue, game, [at('a', 1, 1), at('b', 2, 1), at('c', 3, 2), at('d', 4, 2)])).toBe('satisfied')
    expect(evaluateGlobalClue(clue, game, [at('a', 1, 1), at('b', 2, 2), at('c', 3, 2), at('d', 4, 2)])).toBe('violated')
    expect(validateCaseDefinition({ ...traitCase(), solution: [at('a', 1, 1), at('b', 2, 2), at('c', 3, 3), at('d', 4, 4)], globalClues: [{ ...clue, count: 0 }] }).some(error => error.includes('conteo de trait'))).toBe(false)
  })

  it('validates definitions, assignments and trait clue parameters without throwing on runtime data', () => {
    const game = traitCase()
    game.traitDefinitions = [{ id: 'staff', label: 'Personal' }, { id: 'staff', label: '' }, { id: '', label: 'Vacío' }]
    game.characters[0].traitIds = ['staff', 'staff', 'missing']
    game.characters[0].clues = [{ id: 'unknown-with', type: 'withTraitInZone', traitId: 'missing', text: '' }, { id: 'unknown-without', type: 'withoutTraitInZone', traitId: 'missing', text: '' }, { id: 'bad-count', type: 'companionTraitCount', traitId: 'staff', count: 0, text: '' }, { id: 'decimal-count', type: 'companionTraitCount', traitId: 'staff', count: 1.5, text: '' }, { id: 'large-count', type: 'companionTraitCount', traitId: 'staff', count: 9, text: '' }]
    game.globalClues = [{ id: 'bad-global', type: 'zoneTraitCount', zoneId: 'missing', traitId: 'missing', count: -1, text: '' }, { id: 'decimal-global', type: 'zoneTraitCount', zoneId: 'z', traitId: 'staff', count: 1.5, text: '' }, { id: 'large-global', type: 'zoneTraitCount', zoneId: 'z', traitId: 'staff', count: 9, text: '' }]
    const errors = validateCaseDefinition(game).join(' ')
    expect(errors).toContain('ID de trait duplicado')
    expect(errors).toContain('label inválido')
    expect(errors).toContain('traitIds de a repite')
    expect(errors).toContain('trait inexistente')
    expect(errors).toContain('conteo de compañeros')
    expect(errors).toContain('zona inexistente')
    for (const mutate of [
      (caseData: GameCase) => { caseData.traitDefinitions = {} as unknown as TraitDefinition[] },
      (caseData: GameCase) => { caseData.traitDefinitions = [{ id: 'staff', label: null }] as unknown as TraitDefinition[] },
      (caseData: GameCase) => { caseData.characters[0].traitIds = null as unknown as string[] },
      (caseData: GameCase) => { caseData.characters[0].traitIds = ['staff', 123] as unknown as string[] },
    ]) { const corrupt = traitCase(); corrupt.characters[0].clues = [{ id: 'trait-clue', type: 'withTraitInZone', traitId: 'staff', text: '' }]; mutate(corrupt); expect(() => validateCaseDefinition(corrupt)).not.toThrow(); expect(validateCaseDefinition(corrupt).length).toBeGreaterThan(0) }
  })

  it('solves a unique case with dynamic trait and global trait evidence', () => {
    const game: GameCase = {
      id: 'trait-solver', title: 'Trait solver', intro: '', difficulty: 1, rows: 2, columns: 2, traitDefinitions,
      zones: [{ id: 'z', name: 'Zona', tone: 'z' }], board: [{ row: 1, column: 1, zoneId: 'z', occupiable: true }, { row: 1, column: 2, zoneId: 'z', occupiable: true }, { row: 2, column: 1, zoneId: 'z', occupiable: true }, { row: 2, column: 2, zoneId: 'z', occupiable: true }],
      characters: [{ id: 'a', name: 'A', avatar: 'A', isVictim: false, traitIds: ['staff'], clues: [{ id: 'a-row', type: 'row', row: 1, text: '' }, { id: 'a-with', type: 'withTraitInZone', traitId: 'staff', text: '' }] }, { id: 'b', name: 'B', avatar: 'B', isVictim: true, traitIds: ['staff'], clues: [{ id: 'b-row', type: 'row', row: 2, text: '' }, { id: 'b-column', type: 'column', column: 2, text: '' }] }],
      solution: [at('a', 1, 1), at('b', 2, 2)], globalClues: [{ id: 'staff-zone', type: 'zoneTraitCount', zoneId: 'z', traitId: 'staff', count: 2, text: '' }],
    }
    expect(validateCaseDefinition(game)).toEqual([])
    const solved = solveCase(game, { maxSolutions: 2 })
    expect(solved.solutionsFound).toBe(1)
    expect(placementsEqual(solved.solutions[0], game.solution)).toBe(true)
    expect(reviewInvestigation(game, [at('a', 1, 1), at('b', 2, 1)])).toMatchObject({ status: 'contradiction' })
    const dynamicContradiction: GameCase = { ...game, characters: game.characters.map(character => character.id === 'a' ? { ...character, clues: [{ id: 'a-row', type: 'row', row: 1, text: '' }, { id: 'a-without', type: 'withoutTraitInZone', traitId: 'staff', text: '' }] } : { ...character }) }
    expect(solveCase(dynamicContradiction, { maxSolutions: 2 }).solutionsFound).toBe(0)
  })
})
