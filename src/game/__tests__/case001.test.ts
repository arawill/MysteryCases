import { expect, it } from 'vitest'
import { case001 } from '../../data/cases/case001'
import { findKiller, getCell, placementsEqual } from '../rules'
import { analyzeCase } from '../analysis'
import { solveCaseWithStats } from '../solver'
import { validateCaseDefinition } from '../validation'

it('case001 conserva una solución canónica única y a Bruno como asesino', () => {
  const solved = solveCaseWithStats(case001)
  const analysis = analyzeCase(case001)
  expect(validateCaseDefinition(case001)).toEqual([])
  expect(solved.truncated).toBeUndefined()
  expect(solved.solutionsFound).toBe(1)
  expect(placementsEqual(solved.solutions[0], case001.solution)).toBe(true)
  expect(analysis).toMatchObject({ status: 'unique', matchesCanonical: true })
  expect(findKiller(case001, case001.solution)?.id).toBe('bruno')
})

it('case001 ancla las etiquetas oficiales en celdas libres de sus propias zonas', () => {
  expect(case001.zones.map(zone => zone.name)).toEqual(['Cafetería', 'Cocina', 'Almacén', 'Baño'])
  for (const zone of case001.zones) {
    const anchor = zone.labelAnchor!.position
    const cell = getCell(case001.board, anchor)!
    expect(cell.zoneId).toBe(zone.id)
    expect(cell.object).toBeUndefined()
    expect(case001.solution.some(placement => placement.position.row === anchor.row && placement.position.column === anchor.column)).toBe(false)
  }
})

it('case001 usa la redacción española "estaba" para las filas y columnas', () => {
  const texts = case001.characters.flatMap(character => character.clues.map(clue => clue.text))
  expect(texts.some(text => /ocupaba/i.test(text))).toBe(false)
  expect(case001.characters.find(character => character.id === 'nora')?.clues.find(clue => clue.id === 'nora-column')?.text).toBe('Estaba en la sexta columna.')
  expect(case001.characters.find(character => character.id === 'ines')?.clues.find(clue => clue.id === 'ines-column')?.text).toBe('Estaba en la quinta columna.')
})
it('case001 conserva sus emojis legacy y usa seis retratos humanos distintos', () => {
  expect(case001.characters.map(character => character.avatar)).toEqual(['🦊', '🦉', '🐈', '🦬', '🦋', '🌙'])
  const images = case001.characters.map(character => character.avatarImage)
  expect(images.every((image): image is string => typeof image === 'string' && image.length > 0)).toBe(true)
  expect(new Set(images).size).toBe(6)
})
