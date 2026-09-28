import { describe, expect, it } from 'vitest'
import { areAllGlobalCluesSatisfied, evaluateAllGlobalClues, hasViolatedGlobalClue } from '../globalClues'
import type { GameCase, GlobalClue, Placement } from '../types'

const completePlacements: Placement[] = [
  { characterId: 'a', position: { row: 1, column: 1 } },
  { characterId: 'b', position: { row: 2, column: 2 } },
  { characterId: 'c', position: { row: 3, column: 3 } },
  { characterId: 'd', position: { row: 4, column: 4 } },
]
const partialPlacements = completePlacements.slice(0, 2)
const satisfiedClues = (): GlobalClue[] => [
  { id: 'empty', type: 'emptyZoneCount', count: 0, text: '' },
  { id: 'zone', type: 'zoneOccupancyCount', zoneId: 'carpet-zone', count: 2, text: '' },
  { id: 'object', type: 'objectOccupancyCount', objectId: 'chair', count: 1, text: '' },
  { id: 'trait', type: 'zoneTraitCount', zoneId: 'carpet-zone', traitId: 'staff', count: 1, text: '' },
  { id: 'surface', type: 'surfaceOccupancyCount', surface: 'carpet', count: 2, text: '' },
]
const fixture = (globalClues: GlobalClue[] | undefined = satisfiedClues()): GameCase => ({
  id: 'global-clues', title: 'Global clues', intro: '', difficulty: 1, rows: 4, columns: 4,
  zones: [
    { id: 'carpet-zone', name: 'Carpet', tone: 'a', surface: 'carpet' },
    { id: 'tile-zone', name: 'Tile', tone: 'b', surface: 'tile' },
  ],
  board: Array.from({ length: 16 }, (_, index) => {
    const row = Math.floor(index / 4) + 1, column = index % 4 + 1
    return { row, column, zoneId: row <= 2 ? 'carpet-zone' : 'tile-zone', occupiable: true, ...(row === 1 && column === 1 ? { object: { id: 'chair', label: 'Chair', icon: '', occupiable: true } } : {}) }
  }),
  traitDefinitions: [{ id: 'staff', label: 'Staff' }, { id: 'visitor', label: 'Visitor' }],
  characters: [
    { id: 'a', name: 'A', avatar: '', isVictim: false, traitIds: ['staff'], clues: [] },
    { id: 'b', name: 'B', avatar: '', isVictim: true, traitIds: ['visitor'], clues: [] },
    { id: 'c', name: 'C', avatar: '', isVictim: false, traitIds: ['staff'], clues: [] },
    { id: 'd', name: 'D', avatar: '', isVictim: false, traitIds: ['visitor'], clues: [] },
  ],
  solution: completePlacements,
  ...(globalClues === undefined ? {} : { globalClues }),
})
const violation = (id: string): GlobalClue => ({ id, type: 'zoneOccupancyCount', zoneId: 'carpet-zone', count: 1, text: '' })
const tracked = (clue: GlobalClue, calls: string[]): GlobalClue => {
  const { type, ...rest } = clue
  return Object.defineProperty(rest, 'type', { enumerable: true, get: () => { calls.push(clue.id); return type } }) as GlobalClue
}
const unsupported = (id: string, calls: string[]): GlobalClue => Object.defineProperty({ id, text: '' }, 'type', { enumerable: true, get: () => { calls.push(id); return 'futureGlobal' } }) as GlobalClue

describe('global clue boolean evaluation contract', () => {
  it('preserves empty-list identities when globalClues is absent or empty', () => {
    const absent = fixture([])
    delete absent.globalClues
    for (const game of [absent, fixture([])]) {
      expect(evaluateAllGlobalClues(game, partialPlacements)).toEqual([])
      expect(hasViolatedGlobalClue(game, partialPlacements)).toBe(false)
      expect(areAllGlobalCluesSatisfied(game, partialPlacements)).toBe(true)
    }
  })

  it('evaluates all five global clue types for complete and partial placements', () => {
    const game = fixture()
    expect(evaluateAllGlobalClues(game, completePlacements).map(item => [item.clue.type, item.evaluation])).toEqual([
      ['emptyZoneCount', 'satisfied'],
      ['zoneOccupancyCount', 'satisfied'],
      ['objectOccupancyCount', 'satisfied'],
      ['zoneTraitCount', 'satisfied'],
      ['surfaceOccupancyCount', 'satisfied'],
    ])
    expect(evaluateAllGlobalClues(game, partialPlacements).map(item => item.evaluation)).toEqual(Array(5).fill('undetermined'))
    expect(hasViolatedGlobalClue(game, completePlacements)).toBe(false)
    expect(areAllGlobalCluesSatisfied(game, completePlacements)).toBe(true)
    expect(hasViolatedGlobalClue(game, partialPlacements)).toBe(false)
    expect(areAllGlobalCluesSatisfied(game, partialPlacements)).toBe(false)
  })

  it.each([
    ['first', [violation('violated'), ...satisfiedClues().slice(0, 2)]],
    ['middle', [satisfiedClues()[0], violation('violated'), satisfiedClues()[1]]],
    ['last', [...satisfiedClues().slice(0, 2), violation('violated')]],
  ] as const)('evaluates every clue in order when the %s clue is violated', (_position, clues) => {
    const calls: string[] = [], trackedClues = clues.map(clue => tracked(clue, calls)), game = fixture(trackedClues)
    expect(hasViolatedGlobalClue(game, completePlacements)).toBe(true)
    expect(calls).toEqual(trackedClues.map(clue => clue.id))
  })

  it('evaluates every clue in order after the first non-satisfied final check', () => {
    const calls: string[] = [], clues = satisfiedClues().slice(0, 3).map(clue => tracked(clue, calls))
    expect(areAllGlobalCluesSatisfied(fixture(clues), partialPlacements)).toBe(false)
    expect(calls).toEqual(clues.map(clue => clue.id))
  })

  it('throws for an unsupported type at the beginning', () => {
    for (const evaluate of [hasViolatedGlobalClue, areAllGlobalCluesSatisfied]) {
      const calls: string[] = [], game = fixture([unsupported('unknown', calls), tracked(satisfiedClues()[0], calls)])
      expect(() => evaluate(game, completePlacements)).toThrowError('Unsupported global clue type: futureGlobal')
      expect(calls).toEqual(['unknown', 'unknown'])
    }
  })

  it('still evaluates and throws for an unsupported type after a violated clue', () => {
    const calls: string[] = [], game = fixture([tracked(violation('violated'), calls), unsupported('unknown', calls), tracked(satisfiedClues()[0], calls)])
    expect(() => hasViolatedGlobalClue(game, completePlacements)).toThrowError('Unsupported global clue type: futureGlobal')
    expect(calls).toEqual(['violated', 'unknown', 'unknown'])
  })

  it('still evaluates and throws for an unsupported type after a non-satisfied clue', () => {
    const calls: string[] = [], game = fixture([tracked(satisfiedClues()[0], calls), unsupported('unknown', calls), tracked(satisfiedClues()[1], calls)])
    expect(() => areAllGlobalCluesSatisfied(game, partialPlacements)).toThrowError('Unsupported global clue type: futureGlobal')
    expect(calls).toEqual(['empty', 'unknown', 'unknown'])
  })

  it.each([[completePlacements], [partialPlacements]] as const)('matches detailed evaluation for every valid input shape', placements => {
    for (const clues of [satisfiedClues(), [violation('violated'), ...satisfiedClues()], [satisfiedClues()[0]]]) {
      const game = fixture(clues), detailed = evaluateAllGlobalClues(game, placements)
      expect(hasViolatedGlobalClue(game, placements)).toBe(detailed.some(item => item.evaluation === 'violated'))
      expect(areAllGlobalCluesSatisfied(game, placements)).toBe(detailed.every(item => item.evaluation === 'satisfied'))
      expect(detailed.map(item => item.clue)).toEqual(clues)
    }
  })
})
