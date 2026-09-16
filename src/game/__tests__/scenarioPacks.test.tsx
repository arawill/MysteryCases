import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { CharacterAvatar } from '../../components/CharacterAvatar'
import { case001 } from '../../data/cases/case001'
import { avatarCatalog } from '../characters/avatarCatalog'
import { analyzeCase } from '../analysis'
import { generateProceduralCase } from '../generation/proceduralCase'
import { findKiller } from '../rules'
import { scenarioPacks, selectScenarioPack } from '../scenarios/catalog'
import { validateCaseDefinition } from '../validation'

describe('neutral scenario packs', () => {
  it('defines six complete visual vocabularies with valid unique assets', () => {
    expect(scenarioPacks).toHaveLength(6)
    expect(new Set(scenarioPacks.map(pack => pack.id)).size).toBe(6)
    for (const pack of scenarioPacks) {
      expect(pack.zones).toHaveLength(4)
      expect(pack.objects.length).toBeGreaterThanOrEqual(6)
      expect(pack.objects.length).toBeLessThanOrEqual(8)
      expect(new Set(pack.zones.map(zone => zone.id)).size).toBe(pack.zones.length)
      expect(new Set(pack.objects.map(object => object.id)).size).toBe(pack.objects.length)
      for (const zone of pack.zones) {
        expect(zone.icon).toMatch(new RegExp(`/src/assets/scenarios/${pack.id}/zones/.+\\.png$`))
        expect(zone.surface).toBeTruthy()
      }
      for (const object of pack.objects) {
        expect(typeof object.occupiable).toBe('boolean')
        expect(object.icon).toMatch(new RegExp(`/src/assets/scenarios/${pack.id}/objects/.+\\.png$`))
      }
    }
  })

  it('selects deterministically, varies small seeds, and reaches every pack', () => {
    for (let seed = 0; seed < 30; seed += 1) expect(selectScenarioPack(seed)).toBe(selectScenarioPack(seed))
    const reached = new Set(Array.from({ length: 200 }, (_, seed) => selectScenarioPack(seed).id))
    expect(reached).toEqual(new Set(scenarioPacks.map(pack => pack.id)))
  })

  it.each([1, 2, 3, 4, 5] as const)('generates a valid unique difficulty %s using its selected pack', difficulty => {
    const targetPack = scenarioPacks[(difficulty - 1) % scenarioPacks.length]
    const seed = Array.from({ length: 1000 }, (_, value) => value).find(value => selectScenarioPack(value).id === targetPack.id)
    expect(seed).toBeDefined()
    const generated = generateProceduralCase({ id: `pack-d${difficulty}`, title: 'Pack test', intro: 'Test', difficulty, seed: seed! })
    const analysis = analyzeCase(generated.caseData)
    expect(validateCaseDefinition(generated.caseData)).toEqual([])
    expect(analysis.status).toBe('unique')
    expect(analysis.matchesCanonical).toBe(true)
    expect(new Set(generated.caseData.zones.map(zone => zone.id))).toEqual(new Set(targetPack.zones.map(zone => zone.id)))
    const objectIds = new Set(targetPack.objects.map(object => object.id))
    for (const character of generated.caseData.characters) for (const clue of character.clues) {
      if (['onObject', 'besideObject', 'notOnObject', 'notBesideObject'].includes(clue.type)) {
        expect(objectIds.has((clue as { objectId: string }).objectId)).toBe(true)
      }
    }
  }, 30000)

  it('keeps the manual cafeteria case semantics and solution unchanged', () => {
    expect(case001.zones.map(zone => zone.id)).toEqual(['cafe', 'kitchen', 'storage', 'bathroom'])
    expect(case001.board.map(cell => [cell.row, cell.column, cell.zoneId, cell.occupiable, cell.object?.id])).toMatchSnapshot()
    expect(case001.characters.find(character => character.id === 'ines')?.clues.map(clue => clue.id)).toEqual(['ines-zone', 'ines-column', 'ines-row'])
    expect(case001.characters.find(character => character.id === 'alma')?.clues).toEqual([])
    expect(case001.solution).toEqual([
      { characterId: 'lucia', position: { row: 1, column: 3 } },
      { characterId: 'mateo', position: { row: 2, column: 4 } },
      { characterId: 'nora', position: { row: 3, column: 6 } },
      { characterId: 'bruno', position: { row: 4, column: 1 } },
      { characterId: 'ines', position: { row: 5, column: 5 } },
      { characterId: 'alma', position: { row: 6, column: 2 } },
    ])
    expect(findKiller(case001, case001.solution)?.id).toBe('bruno')
  })
})

describe('avatar infrastructure', () => {
  it('catalogues 24 independent images with alternating 12/12 genders', () => {
    expect(avatarCatalog).toHaveLength(24)
    expect(new Set(avatarCatalog.map(entry => entry.id)).size).toBe(24)
    expect(new Set(avatarCatalog.map(entry => entry.image)).size).toBe(24)
    expect(avatarCatalog.filter(entry => entry.gender === 'female')).toHaveLength(12)
    expect(avatarCatalog.filter(entry => entry.gender === 'male')).toHaveLength(12)
    for (const entry of avatarCatalog) expect(entry.image).toMatch(/\/src\/assets\/avatar\/individuals\/avatar_\d{2}\.png$/)
    expect(Object.keys(avatarCatalog[0])).toEqual(['id', 'image', 'gender'])
  })

  it('renders an image when available and preserves the emoji fallback', () => {
    const image = renderToStaticMarkup(<CharacterAvatar character={{ avatar: '🕵️', avatarImage: avatarCatalog[0].image }} label="Retrato" />)
    const emoji = renderToStaticMarkup(<CharacterAvatar character={{ avatar: '🕵️' }} />)
    expect(image).toContain('<img')
    expect(image).toContain(avatarCatalog[0].image)
    expect(image).not.toContain('🕵️')
    expect(emoji).toContain('🕵️')
    expect(emoji).not.toContain('<img')
  })
})
