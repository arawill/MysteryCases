import { describe, expect, it } from 'vitest'
import { createSolverCluePlan, type SolverOccupancyClue, type SolverRelationalClue } from '../solverCluePlan'
import { solveCaseWithStats } from '../solver'
import type { Character, Clue, GameCase } from '../types'

const relationTypes = ['northOfCharacter', 'southOfCharacter', 'sameZoneAsCharacter', 'besideCharacter', 'rowOffsetFromCharacter'] as const
const occupancyTypes = ['aloneInZone', 'notAloneInZone', 'ownZoneOccupancyCount', 'withTraitInZone', 'withoutTraitInZone', 'companionTraitCount'] as const
const relation = (id: string, type: typeof relationTypes[number] = 'northOfCharacter', targetCharacterId = 'target'): Clue => ({ id, type, text: '', targetCharacterId, ...(type === 'rowOffsetFromCharacter' ? { rowOffset: 1 } : {}) } as Clue)
const occupancy = (id: string, type: typeof occupancyTypes[number] = 'aloneInZone'): Clue => ({ id, type, text: '', ...(['ownZoneOccupancyCount', 'companionTraitCount'].includes(type) ? { count: 1 } : {}), ...(['withTraitInZone', 'withoutTraitInZone', 'companionTraitCount'].includes(type) ? { traitId: 'staff' } : {}) } as Clue)
const character = (id: string, clues: Clue[]): Character => ({ id, name: id, avatar: '', isVictim: false, clues })
const fixture = (characters: Character[]): GameCase => ({
  id: 'plan', title: '', intro: '', difficulty: 1, rows: 2, columns: 2,
  zones: [{ id: 'z', name: 'Z', tone: 'z' }],
  board: [
    { row: 1, column: 1, zoneId: 'z', occupiable: true }, { row: 1, column: 2, zoneId: 'z', occupiable: true },
    { row: 2, column: 1, zoneId: 'z', occupiable: true }, { row: 2, column: 2, zoneId: 'z', occupiable: true },
  ],
  characters,
  solution: [],
})
const isRelational = (clue: Clue): clue is SolverRelationalClue => relationTypes.some(type => type === clue.type)
const isOccupancy = (clue: Clue): clue is SolverOccupancyClue => occupancyTypes.some(type => type === clue.type)

function legacyRelations(caseData: GameCase, characterId: string, placed: ReadonlySet<string>, violatedId?: string) {
  const cluesByCharacter = new Map(caseData.characters.map(item => [item.id, item.clues]))
  const relevant: Array<{ owner: string; clue: SolverRelationalClue }> = []
  for (const clue of cluesByCharacter.get(characterId) ?? []) if (isRelational(clue)) relevant.push({ owner: characterId, clue })
  for (const [owner, clues] of cluesByCharacter) for (const clue of clues) if (isRelational(clue) && clue.targetCharacterId === characterId && placed.has(owner)) relevant.push({ owner, clue })
  const trace: string[] = []
  const violated = relevant.some(({ owner, clue }) => { trace.push(`${owner}:${clue.id}`); return clue.id === violatedId })
  return { trace, violated }
}

function plannedRelations(caseData: GameCase, characterId: string, placed: ReadonlySet<string>, violatedId?: string) {
  const trace: string[] = [], plan = createSolverCluePlan(caseData)
  const violated = plan.hasViolatedRelation(characterId, owner => placed.has(owner), (owner, clue) => { trace.push(`${owner}:${clue.id}`); return clue.id === violatedId })
  return { trace, violated }
}

function legacyOccupancy(caseData: GameCase, placed: ReadonlySet<string>, violatedId?: string) {
  const trace: string[] = []
  const violated = caseData.characters.some(item => placed.has(item.id) && item.clues.some(clue => {
    if (!isOccupancy(clue)) return false
    trace.push(`${item.id}:${clue.id}`)
    return clue.id === violatedId
  }))
  return { trace, violated }
}

function plannedOccupancy(caseData: GameCase, placed: ReadonlySet<string>, violatedId?: string) {
  const trace: string[] = [], plan = createSolverCluePlan(caseData)
  const violated = plan.hasViolatedOccupancy(id => placed.has(id), (id, clue) => { trace.push(`${id}:${clue.id}`); return clue.id === violatedId })
  return { trace, violated }
}

describe('solve-local clue plan', () => {
  it('classifies all five relational and six occupancy types while ignoring static and empty clue arrays', () => {
    const game = fixture([
      character('subject', [...relationTypes.map((type, index) => relation(`r${index}`, type)), ...occupancyTypes.map((type, index) => occupancy(`o${index}`, type)), { id: 'static', type: 'row', row: 1, text: '' }]),
      character('empty', []),
    ])
    expect(plannedRelations(game, 'subject', new Set()).trace).toEqual(relationTypes.map((_, index) => `subject:r${index}`))
    expect(plannedOccupancy(game, new Set(['subject'])).trace).toEqual(occupancyTypes.map((_, index) => `subject:o${index}`))
    expect(plannedRelations(game, 'empty', new Set()).trace).toEqual([])
  })

  it('matches legacy own/incoming order, placed-owner filtering, and first/intermediate/last short-circuit', () => {
    const game = fixture([
      character('target', [relation('own-1', 'northOfCharacter', 'missing'), relation('own-2', 'southOfCharacter', 'missing')]),
      character('alpha', [relation('in-1', 'sameZoneAsCharacter'), relation('in-2', 'besideCharacter')]),
      character('beta', [relation('in-3', 'rowOffsetFromCharacter')]),
    ])
    const allPlaced = new Set(['alpha', 'beta'])
    for (const violated of [undefined, 'own-1', 'own-2', 'in-1', 'in-3']) expect(plannedRelations(game, 'target', allPlaced, violated)).toEqual(legacyRelations(game, 'target', allPlaced, violated))
    expect(plannedRelations(game, 'target', new Set(['alpha']))).toEqual(legacyRelations(game, 'target', new Set(['alpha'])))
    expect(plannedRelations(game, 'absent', allPlaced)).toEqual({ trace: [], violated: false })
  })

  it('preserves first key position, last duplicate clue value, and original duplicate occupancy entries', () => {
    const game = fixture([
      character('duplicate', [relation('discarded-own'), occupancy('first-occupancy')]),
      character('other', [relation('other-incoming', 'northOfCharacter', 'target'), occupancy('middle-occupancy')]),
      character('duplicate', [relation('last-own'), relation('duplicate-incoming', 'southOfCharacter', 'target'), occupancy('last-occupancy')]),
      character('target', []),
    ])
    const placed = new Set(['duplicate', 'other', 'target'])
    expect(plannedRelations(game, 'duplicate', placed)).toEqual(legacyRelations(game, 'duplicate', placed))
    expect(plannedRelations(game, 'target', placed)).toEqual(legacyRelations(game, 'target', placed))
    expect(plannedRelations(game, 'target', placed).trace).toEqual(['duplicate:last-own', 'duplicate:duplicate-incoming', 'other:other-incoming'])
    expect(plannedOccupancy(game, placed)).toEqual(legacyOccupancy(game, placed))
    expect(plannedOccupancy(game, placed).trace).toEqual(['duplicate:first-occupancy', 'other:middle-occupancy', 'duplicate:last-occupancy'])
  })

  it('matches legacy occupancy order and short-circuit in the first, middle, and last character', () => {
    const game = fixture([
      character('a', [occupancy('first'), { id: 'row', type: 'row', row: 1, text: '' }]),
      character('b', [occupancy('middle-1'), occupancy('middle-2')]),
      character('c', [occupancy('last')]),
    ])
    const placed = new Set(['a', 'b', 'c'])
    for (const violated of [undefined, 'first', 'middle-2', 'last']) expect(plannedOccupancy(game, placed, violated)).toEqual(legacyOccupancy(game, placed, violated))
    expect(plannedOccupancy(game, new Set(['a', 'c']))).toEqual(legacyOccupancy(game, new Set(['a', 'c'])))
  })

  it('keeps relational, global, and occupancy phase order and the same short-circuit boundary', () => {
    const game = fixture([character('target', [relation('own')]), character('placed', [relation('incoming', 'northOfCharacter', 'target'), occupancy('occupied')])])
    const plan = createSolverCluePlan(game), placed = new Set(['placed'])
    const run = (violation?: 'relation' | 'global' | 'occupancy') => {
      const trace: string[] = []
      const valid = !plan.hasViolatedRelation('target', id => placed.has(id), (_owner, clue) => { trace.push(`relation:${clue.id}`); return violation === 'relation' })
        && !(trace.push('global'), violation === 'global')
        && !plan.hasViolatedOccupancy(id => placed.has(id), (_id, clue) => { trace.push(`occupancy:${clue.id}`); return violation === 'occupancy' })
      return { valid, trace }
    }
    expect(run('relation').trace).toEqual(['relation:own'])
    expect(run('global').trace).toEqual(['relation:own', 'relation:incoming', 'global'])
    expect(run('occupancy').trace).toEqual(['relation:own', 'relation:incoming', 'global', 'occupancy:occupied'])
  })

  it('creates independent frozen plans and keeps unsupported solver errors unchanged', () => {
    const first = fixture([character('a', [relation('first')])]), second = fixture([character('a', [relation('second')])])
    const firstPlan = createSolverCluePlan(first), secondPlan = createSolverCluePlan(second)
    expect(Object.isFrozen(firstPlan)).toBe(true)
    const trace: string[] = []
    firstPlan.hasViolatedRelation('a', () => false, (_owner, clue) => { trace.push(clue.id); return false })
    secondPlan.hasViolatedRelation('a', () => false, (_owner, clue) => { trace.push(clue.id); return false })
    expect(trace).toEqual(['first', 'second'])
    const unsupported = fixture([character('a', [{ id: 'future', type: 'futureClue', text: '' } as unknown as Clue])])
    expect(() => solveCaseWithStats(unsupported)).toThrowError('Unsupported clue type: futureClue')
  })
})
