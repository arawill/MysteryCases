import { describe, expect, it } from 'vitest'
import serializedCase001 from '../../data/cases/json/case001.json'
import serializedCase002 from '../../data/cases/json/case002.json'
import { case001 } from '../../data/cases/case001'
import { case002 } from '../../data/cases/case002'
import { caseAssetRegistry } from '../cases/caseAssetRegistry'
import { loadSerializedCase } from '../cases/loadSerializedCase'
import { CURRENT_CASE_SCHEMA_VERSION } from '../cases/schemaVersion'
import type { SerializedGameCase } from '../cases/serializedTypes'
import { getSerializedCaseSchemaIssues, validateSerializedCaseSchema } from '../cases/validateSerializedCaseSchema'
import { findKiller, placementsEqual } from '../rules'
import { solveCaseWithStats } from '../solver'
import type { Clue, GlobalClue } from '../types'
import { validateCaseDefinition } from '../validation'
import { legacyCase001 } from './fixtures/legacyCase001'
import { legacyCase002 } from './fixtures/legacyCase002'

const cloneCase001 = () => structuredClone(serializedCase001) as unknown as SerializedGameCase

describe('serialización de casos', () => {
  it('versiona y valida C01 y C02 contra el JSON Schema oficial', () => {
    expect(CURRENT_CASE_SCHEMA_VERSION).toBe(1)
    expect(serializedCase001.schemaVersion).toBe(1)
    expect(serializedCase002.schemaVersion).toBe(1)
    expect(validateSerializedCaseSchema(serializedCase001)).toBe(true)
    expect(validateSerializedCaseSchema(serializedCase002)).toBe(true)
  })

  it('rechaza versiones desconocidas con un error específico', () => {
    const futureCase = structuredClone(serializedCase001) as Record<string, unknown>
    futureCase.schemaVersion = 2
    expect(() => loadSerializedCase(futureCase)).toThrow('Unsupported case schema version: 2')
  })

  it('rechaza con el schema una versión ausente, tipos erróneos y campos requeridos ausentes', () => {
    const withoutVersion = structuredClone(serializedCase001) as Record<string, unknown>
    delete withoutVersion.schemaVersion
    const wrongRows = { ...serializedCase001, rows: '6' }
    const withoutCharacters = structuredClone(serializedCase001) as Record<string, unknown>
    delete withoutCharacters.characters

    expect(validateSerializedCaseSchema(withoutVersion)).toBe(false)
    expect(validateSerializedCaseSchema(wrongRows)).toBe(false)
    expect(validateSerializedCaseSchema(withoutCharacters)).toBe(false)
    expect(() => loadSerializedCase(withoutVersion)).toThrow(/requiere la propiedad schemaVersion/)
  })

  it('rechaza propiedades adicionales para evitar typos y deriva silenciosa del contrato', () => {
    expect(validateSerializedCaseSchema({ ...serializedCase001, unexpectedField: true })).toBe(false)
  })

  it('expone rutas, valores y motivos accionables sin duplicar las reglas de Ajv', () => {
    const issues = getSerializedCaseSchemaIssues({ ...serializedCase001, rows: '6' })
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: '/rows', value: '6', reason: expect.stringContaining('integer') }),
    ]))
  })

  it('mantiene el schema alineado con todas las variantes actuales de pistas y referencias opcionales', () => {
    const clues = [
      { id: 'c01', type: 'row', text: 'x', row: 1 },
      { id: 'c02', type: 'column', text: 'x', column: 1 },
      { id: 'c03', type: 'zone', text: 'x', zoneId: 'cafe' },
      { id: 'c04', type: 'onObject', text: 'x', objectId: 'chair' },
      { id: 'c05', type: 'besideObject', text: 'x', objectId: 'chair' },
      { id: 'c06', type: 'northOfCharacter', text: 'x', targetCharacterId: 'mateo' },
      { id: 'c07', type: 'southOfCharacter', text: 'x', targetCharacterId: 'mateo' },
      { id: 'c08', type: 'sameZoneAsCharacter', text: 'x', targetCharacterId: 'mateo' },
      { id: 'c09', type: 'besideCharacter', text: 'x', targetCharacterId: 'mateo' },
      { id: 'c10', type: 'notZone', text: 'x', zoneId: 'cafe' },
      { id: 'c11', type: 'notOnObject', text: 'x', objectId: 'chair' },
      { id: 'c12', type: 'notBesideObject', text: 'x', objectId: 'chair' },
      { id: 'c13', type: 'rowOffsetFromCharacter', text: 'x', targetCharacterId: 'mateo', rowOffset: 1 },
      { id: 'c14', type: 'cornerOfBoard', text: 'x' },
      { id: 'c15', type: 'cornerOfZone', text: 'x' },
      { id: 'c16', type: 'besideWall', text: 'x' },
      { id: 'c17', type: 'notBesideWall', text: 'x' },
      { id: 'c18', type: 'besideEdgeFeature', text: 'x', featureType: 'door' },
      { id: 'c19', type: 'notBesideEdgeFeature', text: 'x', featureType: 'window' },
      { id: 'c20', type: 'withTraitInZone', text: 'x', traitId: 't' },
      { id: 'c21', type: 'withoutTraitInZone', text: 'x', traitId: 't' },
      { id: 'c22', type: 'companionTraitCount', text: 'x', traitId: 't', count: 1 },
      { id: 'c23', type: 'oneOfZones', text: 'x', zoneIds: ['cafe', 'kitchen'] },
      { id: 'c24', type: 'oneOfObjects', text: 'x', objectIds: ['chair', 'plant'] },
      { id: 'c25', type: 'aloneInZone', text: 'x' },
      { id: 'c26', type: 'notAloneInZone', text: 'x' },
      { id: 'c27', type: 'ownZoneOccupancyCount', text: 'x', count: 1 },
      { id: 'c28', type: 'sameColumnAsObject', text: 'x', objectId: 'chair', zoneRelation: 'same' },
      { id: 'c29', type: 'relativeToObject', text: 'x', objectId: 'chair', direction: 'northEast', zoneRelation: 'different' },
      { id: 'c30', type: 'onSurface', text: 'x', surface: 'wood' },
    ] satisfies Clue[]
    const globalClues = [
      { id: 'g01', type: 'emptyZoneCount', text: 'x', count: 1 },
      { id: 'g02', type: 'zoneOccupancyCount', text: 'x', zoneId: 'cafe', count: 1 },
      { id: 'g03', type: 'objectOccupancyCount', text: 'x', objectId: 'chair', count: 1 },
      { id: 'g04', type: 'zoneTraitCount', text: 'x', zoneId: 'cafe', traitId: 't', count: 1 },
      { id: 'g05', type: 'surfaceOccupancyCount', text: 'x', surface: 'wood', count: 1 },
    ] satisfies GlobalClue[]
    const contractExample = cloneCase001()
    contractExample.characters[0]!.clues = clues
    contractExample.globalClues = globalClues
    contractExample.edgeFeatures = [{ id: 'door', type: 'door', label: 'Puerta', segments: [{ position: { row: 1, column: 1 }, side: 'N' }] }]
    contractExample.traitDefinitions = [{ id: 't', label: 'Trait' }]
    contractExample.characters[0]!.traitIds = ['t']

    expect(validateSerializedCaseSchema(contractExample)).toBe(true)
  })

  it('carga C01 desde JSON sin cambiar sus datos ni su comportamiento lógico', () => {
    const loaded = loadSerializedCase(JSON.parse(JSON.stringify(serializedCase001)))

    expect(loaded).toEqual(case001)
    expect(loaded).toEqual(legacyCase001)
    expect(loaded).toMatchObject({ id: 'case001', rows: 6, columns: 6, difficulty: 1 })
    expect(loaded.characters.map(({ id, name, avatar, isVictim, clues }) => ({ id, name, avatar, isVictim, clues }))).toEqual(
      serializedCase001.characters.map(({ id, name, avatar, isVictim, clues }) => ({ id, name, avatar, isVictim, clues })),
    )
    expect(loaded.characters.find(character => character.isVictim)?.name).toBe('Alma')
    expect(loaded.solution).toEqual(serializedCase001.solution)
    expect(loaded.characters.map(character => character.clues)).toEqual(serializedCase001.characters.map(character => character.clues))
    expect(validateCaseDefinition(loaded)).toEqual([])
    const solved = solveCaseWithStats(loaded)
    expect(solved.solutionsFound).toBe(1)
    expect(placementsEqual(solved.solutions[0], loaded.solution)).toBe(true)
  })

  it('carga C02 desde JSON con equivalencia legacy exacta', () => {
    const loaded = loadSerializedCase(JSON.parse(JSON.stringify(serializedCase002)))

    expect(loaded).toEqual(case002)
    expect(loaded).toEqual(legacyCase002)
    expect(loaded).toMatchObject({ id: 'case002', rows: 6, columns: 6, difficulty: 1 })
    expect(loaded.characters.find(character => character.isVictim)?.name).toBe('Noa')
    expect(loaded.solution).toEqual(serializedCase002.solution)
    expect(loaded.characters.map(character => character.clues)).toEqual(serializedCase002.characters.map(character => character.clues))
    expect(validateCaseDefinition(loaded)).toEqual([])
    const solved = solveCaseWithStats(loaded)
    expect(solved.solutionsFound).toBe(1)
    expect(placementsEqual(solved.solutions[0], loaded.solution)).toBe(true)
    expect(findKiller(loaded, loaded.solution)?.id).toBe('tomas')
  })

  it('resuelve iconos de zonas, objetos y avatares mediante el Asset Registry', () => {
    expect(case001.zones.map(zone => zone.icon)).toEqual([
      caseAssetRegistry['cafeteria.zone.cafe'],
      caseAssetRegistry['cafeteria.zone.kitchen'],
      caseAssetRegistry['cafeteria.zone.storage'],
      caseAssetRegistry['cafeteria.zone.bathroom'],
    ])
    expect(case001.board.find(cell => cell.object?.id === 'chair')?.object?.icon).toBe(caseAssetRegistry['cafeteria.object.chair'])
    expect(case001.characters.find(character => character.id === 'alma')?.avatarImage).toBe(caseAssetRegistry['avatar.avatar_07'])
    expect(case002.board.find(cell => cell.object?.id === 'patioLounger')?.object?.icon).toBe(caseAssetRegistry['cafeteria.object.chair'])
    expect(case002.characters.map(character => character.avatarImage)).toEqual([
      caseAssetRegistry['avatar.avatar_08'],
      caseAssetRegistry['avatar.avatar_09'],
      caseAssetRegistry['avatar.avatar_10'],
      caseAssetRegistry['avatar.avatar_11'],
      caseAssetRegistry['avatar.avatar_12'],
      caseAssetRegistry['avatar.avatar_13'],
    ])
  })

  it.each([
    ['asset inexistente', (data: SerializedGameCase) => { data.zones[0]!.iconAsset = 'missing.asset' as never }, /Asset de caso inexistente/],
    ['zona inexistente', (data: SerializedGameCase) => { data.board[0]!.zoneId = 'missing-zone' }, /zona referenciada inexistente/],
    ['personaje duplicado', (data: SerializedGameCase) => { data.characters[1]!.id = data.characters[0]!.id }, /personaje duplicado/],
    ['posición fuera del tablero', (data: SerializedGameCase) => { data.board[0]!.row = 7 }, /posición fuera del tablero/],
    ['personaje inexistente en solución', (data: SerializedGameCase) => { data.solution[0]!.characterId = 'missing-character' }, /solución referencia un personaje inexistente/],
    ['object id inválido', (data: SerializedGameCase) => { data.board[0]!.objectId = 'missing-object' }, /object id inexistente/],
    ['recurso inexistente en pista', (data: SerializedGameCase) => {
      const clue = data.characters[0]!.clues.find(candidate => candidate.type === 'onObject')
      if (clue?.type === 'onObject') clue.objectId = 'missing-object'
    }, /pista lucia-chair referencia un objeto inexistente/],
  ])('rechaza %s con un error claro', (_label, mutate, expectedError) => {
    const invalidCase = cloneCase001()
    mutate(invalidCase)
    expect(() => loadSerializedCase(invalidCase)).toThrow(expectedError)
  })
})
