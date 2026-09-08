import { describe, expect, it } from 'vitest'
import { adjacentCellsForEdgeSegment, areCollinearContiguousEdgeSegments, edgeSegmentKey } from '../edgeFeatures'
import { applyConstraints } from '../generation/cluePool'
import { hasReadableClues } from '../generation/clueQuality'
import { findWideWindowSegments, generateScenarioEdgeFeatures } from '../generation/scenario/edgeFeatures'
import { createGenerationTemplate } from '../generation/template'
import type { GenerationTemplate } from '../generation/types'
import { generateInfiniteCase } from '../infinite/generator'
import { generateNormalCase } from '../normal/generator'
import { solveCase } from '../solver'
import type { BoardCell, EdgeFeature, GameCase, TraitDefinition } from '../types'
import { validateCaseDefinition } from '../validation'
import { generateDailyCase } from '../daily/generator'
import { case001 } from '../../data/cases/case001'

const isExterior = (segment: EdgeFeature['segments'][number], caseData: GameCase) =>
  (segment.side === 'N' && segment.position.row === 1) ||
  (segment.side === 'S' && segment.position.row === caseData.rows) ||
  (segment.side === 'W' && segment.position.column === 1) ||
  (segment.side === 'E' && segment.position.column === caseData.columns)

function expectCorrectEdges(caseData: GameCase, count: number) {
  const features = caseData.edgeFeatures ?? []
  expect(features).toHaveLength(count)
  expect(features.some(feature => feature.type === 'window')).toBe(true)
  expect(features.some(feature => feature.type === 'door')).toBe(true)
  const keys = features.flatMap(feature => feature.segments.map(edgeSegmentKey))
  expect(new Set(keys).size).toBe(keys.length)
  for (const feature of features) for (const segment of feature.segments) {
    if (feature.type === 'window') expect(isExterior(segment, caseData)).toBe(true)
    else {
      expect(isExterior(segment, caseData)).toBe(false)
      const adjacent = adjacentCellsForEdgeSegment(segment, caseData.board)
      expect(adjacent).toHaveLength(2)
      expect(adjacent[0].zoneId).not.toBe(adjacent[1].zoneId)
    }
  }
}

function expectCorrectTraits(caseData: GameCase) {
  const definitions = caseData.traitDefinitions ?? []
  expect(definitions).toHaveLength(3)
  expect(new Set(definitions.map(definition => definition.id)).size).toBe(3)
  expect(definitions.every(definition => definition.label.trim().length > 0)).toBe(true)
  for (const definition of definitions) {
    const owners = caseData.characters.filter(character => character.traitIds?.includes(definition.id)).length
    expect(owners).toBeGreaterThanOrEqual(2)
    expect(owners).toBeLessThanOrEqual(5)
    expect(owners).toBeLessThan(caseData.characters.length)
  }
  for (const character of caseData.characters) {
    const traitIds = character.traitIds ?? []
    expect(new Set(traitIds).size).toBe(traitIds.length)
    expect(traitIds.length).toBeLessThanOrEqual(2)
    expect(traitIds.every(id => definitions.some(definition => definition.id === id))).toBe(true)
  }
}

describe('5.5E.2 procedural scenario decoration', () => {
  it.each([1, 2, 3] as const)('does not decorate difficulty %s with edges or traits', difficulty => {
    const caseData = generateNormalCase({ difficulty, caseNumber: 40 + difficulty }).caseData
    expect(caseData.edgeFeatures ?? []).toHaveLength(0)
    expect(caseData.traitDefinitions ?? []).toHaveLength(0)
    expect(caseData.characters.every(character => (character.traitIds?.length ?? 0) === 0)).toBe(true)
  }, 30000)

  it('creates exactly one exterior window and one internal door at difficulty four', () => {
    const caseData = generateNormalCase({ difficulty: 4, caseNumber: 41 }).caseData
    expectCorrectEdges(caseData, 2)
    expect(caseData.edgeFeatures?.filter(feature => feature.type === 'window')).toHaveLength(1)
    expect(caseData.edgeFeatures?.filter(feature => feature.type === 'door')).toHaveLength(1)
    expect(caseData.traitDefinitions ?? []).toHaveLength(0)
    expect(validateCaseDefinition(caseData)).toEqual([])
    expect(solveCase(caseData, { maxSolutions: 2 }).solutionsFound).toBe(1)
    expect(hasReadableClues(caseData)).toBe(true)
  }, 30000)

  it('prefers a valid two-segment wide window when the geometry allows it', () => {
    const board: BoardCell[] = [
      { row: 1, column: 1, zoneId: 'north', occupiable: true }, { row: 1, column: 2, zoneId: 'north', occupiable: true },
      { row: 2, column: 1, zoneId: 'south', occupiable: true }, { row: 2, column: 2, zoneId: 'south', occupiable: true },
    ]
    const segments = findWideWindowSegments([{ position: { row: 1, column: 1 }, side: 'N' }, { position: { row: 1, column: 2 }, side: 'N' }], new Set())
    expect(segments).toBeDefined()
    const [first, second] = segments!
    expect(areCollinearContiguousEdgeSegments(first, second)).toBe(true)
    expect(edgeSegmentKey(first)).not.toBe(edgeSegmentKey(second))
    const features = generateScenarioEdgeFeatures(board, 2, 2, 5, 12345)
    const wide = features?.find(feature => feature.type === 'window' && feature.segments.length === 2)
    expect(wide).toBeDefined()
  })

  it('creates complete, valid five-star scenario decorations', () => {
    const caseData = generateNormalCase({ difficulty: 5, caseNumber: 42 }).caseData
    expectCorrectEdges(caseData, 3)
    expectCorrectTraits(caseData)
    expect(validateCaseDefinition(caseData)).toEqual([])
    expect(solveCase(caseData, { maxSolutions: 2 }).solutionsFound).toBe(1)
    expect(hasReadableClues(caseData)).toBe(true)
  }, 30000)

  it('deep-copies edge features, traits and character trait IDs when applying constraints', () => {
    const template: GenerationTemplate = createGenerationTemplate(case001)
    const edgeFeatures: EdgeFeature[] = [{ id: 'window', type: 'window', label: 'Ventana', segments: [{ position: { row: 1, column: 1 }, side: 'N' }] }]
    const traitDefinitions: TraitDefinition[] = [{ id: 'staff', label: 'Personal' }]
    template.edgeFeatures = edgeFeatures
    template.traitDefinitions = traitDefinitions
    template.characters[0].traitIds = ['staff']
    const generated = applyConstraints(template, case001.solution, [])
    expect(generated.edgeFeatures).toEqual(edgeFeatures)
    expect(generated.traitDefinitions).toEqual(traitDefinitions)
    expect(generated.characters[0].traitIds).toEqual(['staff'])
    expect(generated.edgeFeatures).not.toBe(edgeFeatures)
    expect(generated.edgeFeatures?.[0].segments).not.toBe(edgeFeatures[0].segments)
    expect(generated.edgeFeatures?.[0].segments[0].position).not.toBe(edgeFeatures[0].segments[0].position)
    expect(generated.traitDefinitions).not.toBe(traitDefinitions)
    expect(generated.characters[0].traitIds).not.toBe(template.characters[0].traitIds)
  })

  it('is deterministic', () => {
    const first = generateNormalCase({ difficulty: 5, caseNumber: 42 }).caseData
    const again = generateNormalCase({ difficulty: 5, caseNumber: 42 }).caseData
    expect(again).toEqual(first)
  }, 30000)

  it('varies edge arrangements for verified different seeds', () => {
    const first = generateNormalCase({ difficulty: 5, caseNumber: 42 }).caseData
    const other = generateNormalCase({ difficulty: 5, caseNumber: 43 }).caseData
    expect(other.edgeFeatures).not.toEqual(first.edgeFeatures)
  }, 30000)

  it('varies trait assignments for verified different seeds', () => {
    const first = generateNormalCase({ difficulty: 5, caseNumber: 42 }).caseData
    const other = generateNormalCase({ difficulty: 5, caseNumber: 43 }).caseData
    expect({ definitions: other.traitDefinitions, assignments: other.characters.map(character => character.traitIds) }).not.toEqual({ definitions: first.traitDefinitions, assignments: first.characters.map(character => character.traitIds) })
  }, 30000)

  it('applies shared decoration policy to Normal, Daily and Infinite', () => {
    const normal = generateNormalCase({ difficulty: 5, caseNumber: 44 }).caseData
    const daily = generateDailyCase(new Date(2026, 8, 8, 12), 5).caseData
    const infinite = generateInfiniteCase({ difficulty: 4, seed: 424242 }).caseData
    for (const caseData of [normal, daily]) { expectCorrectEdges(caseData, 3); expectCorrectTraits(caseData) }
    expectCorrectEdges(infinite, 2)
    expect(infinite.traitDefinitions ?? []).toHaveLength(0)
  }, 30000)
})
