import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { caseD203 } from '../../data/cases/caseD203'
import { getManualNormalCase } from '../../data/cases/manualNormalCases'
import { Board } from '../../components/Board'
import { areAllCluesSatisfied } from '../clues'
import { resolveObjectAppearance, resolveObjectVisualProfile } from '../objects/appearanceCatalog'
import { getObjectFootprintBounds, isFootprintReservedCell, isObjectPositionOccupiable } from '../objects/footprints'
import { findKiller, getCell, placementsEqual } from '../rules'
import { canPlace } from '../rules'
import { solveCaseWithStats } from '../solver'
import { validateCaseDefinition } from '../validation'

const objectCells = (id: string) => caseD203.board.filter(cell => cell.object?.id === id)

describe('manual D2 case 03', () => {
  it('is registered as a complete seven-by-seven D2 investigation with a canonical unique solution', () => {
    expect(getManualNormalCase(2, 3)).toBe(caseD203)
    expect(caseD203.rows).toBe(7)
    expect(caseD203.columns).toBe(7)
    expect(caseD203.board).toHaveLength(49)
    expect(caseD203.characters).toHaveLength(7)
    expect(caseD203.solution.map(placement => placement.position.row).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(caseD203.solution.map(placement => placement.position.column).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(caseD203.solution.every(placement => getCell(caseD203.board, placement.position)?.occupiable)).toBe(true)
    expect(caseD203.characters.find(character => character.isVictim)).toMatchObject({ id: 'vega', clues: [] })
    expect(validateCaseDefinition(caseD203)).toEqual([])
    const solved = solveCaseWithStats(caseD203)
    expect(solved.truncated).not.toBe(true)
    expect(solved.solutionsFound).toBe(1)
    expect(placementsEqual(solved.solutions[0], caseD203.solution)).toBe(true)
    expect(areAllCluesSatisfied(caseD203, caseD203.solution)).toBe(true)
    expect(findKiller(caseD203, caseD203.solution)?.id).toBe('adrian')
  })

  it('uses the five approved cargo-ship assets with their visible names, profiles and legal positions', () => {
    const expectations = [
      ['freightConsole', 'Consola de control', ['1:1'], 'standard'],
      ['magneticPallet', 'Plataforma de contenedores', ['1:6', '1:7'], 'wide'],
      ['cargoLoader', 'Carretilla elevadora', ['3:2', '3:3'], 'wide'],
      ['maintenanceUnit', 'Robot de mantenimiento', ['3:5'], 'tall'],
      ['sealedContainer', 'Caja metálica', ['5:7'], 'standard'],
    ] as const
    const usedCells: string[] = []
    for (const [id, label, cellsExpected, profile] of expectations) {
      const cells = objectCells(id)
      expect(cells.map(cell => `${cell.row}:${cell.column}`)).toEqual(cellsExpected)
      expect(cells[0].object?.label).toBe(label.toLocaleLowerCase('es'))
      expect(resolveObjectVisualProfile(cells[0].object!)).toBe(profile)
      expect(resolveObjectAppearance(cells[0].object!).src).toMatch(new RegExp(`/d2/case03/${id.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)}\\.png$`))
      usedCells.push(...cells.map(cell => `${cell.row}:${cell.column}`))
    }
    expect(new Set(usedCells).size).toBe(usedCells.length)
    expect(getObjectFootprintBounds(objectCells('cargoLoader')[0].object!, objectCells('cargoLoader')[0])).toMatchObject({ rows: 1, columns: 2 })
    expect(getObjectFootprintBounds(objectCells('magneticPallet')[0].object!, objectCells('magneticPallet')[0])).toMatchObject({ rows: 1, columns: 2 })
    for (const id of ['cargoLoader', 'magneticPallet']) {
      const cells = objectCells(id)
      expect(cells.every(cell => !cell.occupiable && isFootprintReservedCell(cell.object, cell))).toBe(true)
    }
    for (const id of ['maintenanceUnit', 'sealedContainer']) expect(objectCells(id)[0].occupiable).toBe(false)
    const console = objectCells('freightConsole')[0]
    expect(console.occupiable).toBe(false)
    expect(isObjectPositionOccupiable(console.object!, console)).toBe(false)
    expect(canPlace('sara', console, [], caseD203.board).ok).toBe(false)
    const visibleContent = [
      ...caseD203.characters.flatMap(character => character.clues.map(clue => clue.text)),
      ...expectations.map(([, label]) => label),
    ].join(' ').toLocaleLowerCase('es')
    for (const obsolete of ['escáner de carga', 'palé magnético', 'cargamento modular', 'contenedor criogénico', 'unidad de mantenimiento']) expect(visibleContent).not.toContain(obsolete)
  })

  it('keeps labels free and renders wide footprints once beneath all character tokens', () => {
    for (const zone of caseD203.zones) {
      const anchor = zone.labelAnchor!.position
      const cell = getCell(caseD203.board, anchor)!
      expect(cell.zoneId).toBe(zone.id)
      expect(cell.object).toBeUndefined()
      expect(caseD203.solution.some(placement => placement.position.row === anchor.row && placement.position.column === anchor.column)).toBe(false)
    }
    const markup = renderToStaticMarkup(createElement(Board, { ...caseD203, placements: caseD203.solution, excludedCells: [], onCellClick: () => {}, onCellContextMenu: () => {} }))
    for (const footprint of ['cargoLoader-footprint', 'magneticPallet-footprint']) {
      expect((markup.match(new RegExp(`data-footprint="${footprint}"`, 'g')) ?? [])).toHaveLength(1)
    }
    for (const objectId of ['cargoLoader', 'magneticPallet']) {
      const objectIndex = markup.indexOf(`data-footprint="${objectId}-footprint"`)
      const nextCell = markup.indexOf('</button>', objectIndex)
      const personIndex = markup.indexOf('data-layer="person"', objectIndex)
      expect(personIndex === -1 || personIndex > nextCell).toBe(true)
    }
  })

  it('leaves Adrián as Vega’s only companion in the airlock and rejects every pairwise exchange', () => {
    const airlockOccupants = caseD203.solution.filter(placement => getCell(caseD203.board, placement.position)?.zoneId === 'airlock').map(placement => placement.characterId).sort()
    expect(airlockOccupants).toEqual(['adrian', 'vega'])
    for (let index = 0; index < caseD203.solution.length; index += 1) for (let otherIndex = index + 1; otherIndex < caseD203.solution.length; otherIndex += 1) {
      const first = caseD203.solution[index], second = caseD203.solution[otherIndex]
      const swapped = caseD203.solution.map(placement => placement.characterId === first.characterId
        ? { ...placement, position: { ...second.position } }
        : placement.characterId === second.characterId
          ? { ...placement, position: { ...first.position } }
          : placement)
      expect(areAllCluesSatisfied(caseD203, swapped)).toBe(false)
    }
    expect(caseD203.characters.flatMap(character => character.clues).some(clue => clue.text.toLocaleLowerCase('es').includes('ocupaba'))).toBe(false)
  })
})
