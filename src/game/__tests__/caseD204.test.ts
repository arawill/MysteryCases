import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Board } from '../../components/Board'
import { caseD204 } from '../../data/cases/caseD204'
import { getManualNormalCase } from '../../data/cases/manualNormalCases'
import { areAllCluesSatisfied } from '../clues'
import { adjacentCellsForEdgeSegment, isEdgeSegmentOnWall } from '../edgeFeatures'
import { resolveObjectAppearance, resolveObjectVisualProfile } from '../objects/appearanceCatalog'
import { getObjectFootprintBounds, isFootprintReservedCell } from '../objects/footprints'
import { findKiller, getCell, placementsEqual } from '../rules'
import { solveCaseWithStats } from '../solver'
import { validateCaseDefinition } from '../validation'

const objectCells = (id: string) => caseD204.board.filter(cell => cell.object?.id === id)

describe('manual D2 case 04', () => {
  it('is a registered seven-by-seven manual case with a non-truncated canonical solution', () => {
    expect(getManualNormalCase(2, 4)).toBe(caseD204)
    expect(caseD204.rows).toBe(7)
    expect(caseD204.columns).toBe(7)
    expect(caseD204.board).toHaveLength(49)
    expect(caseD204.characters).toHaveLength(7)
    expect(caseD204.solution.map(placement => placement.position.row).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(caseD204.solution.map(placement => placement.position.column).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(caseD204.characters.find(character => character.isVictim)).toMatchObject({ id: 'iris', clues: [] })
    expect(validateCaseDefinition(caseD204)).toEqual([])
    const solved = solveCaseWithStats(caseD204)
    expect(solved.truncated).not.toBe(true)
    expect(solved.solutionsFound).toBe(1)
    expect(placementsEqual(solved.solutions[0], caseD204.solution)).toBe(true)
    expect(areAllCluesSatisfied(caseD204, caseD204.solution)).toBe(true)
    expect(findKiller(caseD204, caseD204.solution)?.id).toBe('joel')
  })

  it('uses exactly the five inspected agricultural assets with visible, accurate names and blocked footprints', () => {
    const expectations = [
      ['irrigationConsole', 'Consola de riego', ['1:1', '1:2'], 'wide'],
      ['hydroponicBed', 'Cultivo de plantas', ['3:2', '3:3'], 'wide'],
      ['nutrientTank', 'Depósito de agua', ['3:7'], 'tall'],
      ['growTower', 'Torre de cultivo', ['4:2'], 'tall'],
      ['harvestCart', 'Carro de cosecha', ['6:2'], 'standard'],
    ] as const
    for (const [id, label, expectedCells, profile] of expectations) {
      const cells = objectCells(id)
      expect(cells.map(cell => `${cell.row}:${cell.column}`)).toEqual(expectedCells)
      expect(cells[0].object?.label).toBe(label.toLocaleLowerCase('es'))
      expect(resolveObjectAppearance(cells[0].object!).src).toMatch(new RegExp(`/d2/case04/${id.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)}\\.png$`))
      expect(resolveObjectVisualProfile(cells[0].object!)).toBe(profile)
      expect(cells.every(cell => !cell.occupiable)).toBe(true)
    }
    for (const id of ['irrigationConsole', 'hydroponicBed']) {
      const cells = objectCells(id)
      expect(getObjectFootprintBounds(cells[0].object!, cells[0])).toMatchObject({ rows: 1, columns: 2 })
      expect(cells.every(cell => isFootprintReservedCell(cell.object, cell))).toBe(true)
    }
    const visibleContent = [...caseD204.characters.flatMap(character => character.clues.map(clue => clue.text)), ...expectations.map(([, label]) => label)].join(' ').toLocaleLowerCase('es')
    for (const forbidden of ['robot recolector', 'armario de semillas', 'mesa de nutrientes', 'bancal hidropónico']) expect(visibleContent).not.toContain(forbidden)
  })

  it('keeps labels and the exterior Martian window in valid, non-occupying positions', () => {
    for (const zone of caseD204.zones) {
      const anchor = zone.labelAnchor!.position
      const cell = getCell(caseD204.board, anchor)!
      expect(cell.zoneId).toBe(zone.id)
      expect(cell.object).toBeUndefined()
      expect(caseD204.solution.some(placement => placement.position.row === anchor.row && placement.position.column === anchor.column)).toBe(false)
    }
    const window = caseD204.edgeFeatures![0]
    expect(window).toMatchObject({ type: 'window', label: 'Ventanal a Marte' })
    expect(window.segments).toEqual([{ position: { row: 1, column: 4 }, side: 'N' }, { position: { row: 1, column: 5 }, side: 'N' }, { position: { row: 1, column: 6 }, side: 'N' }, { position: { row: 1, column: 7 }, side: 'N' }])
    for (const segment of window.segments) {
      expect(isEdgeSegmentOnWall(segment, caseD204.board)).toBe(true)
      expect(adjacentCellsForEdgeSegment(segment, caseD204.board)).toHaveLength(1)
      expect(getCell(caseD204.board, segment.position)?.zoneId).toBe('nursery')
    }
  })

  it('renders both horizontal footprints once beneath people and rejects every pairwise exchange', () => {
    const markup = renderToStaticMarkup(createElement(Board, { ...caseD204, placements: caseD204.solution, excludedCells: [], onCellClick: () => {}, onCellContextMenu: () => {} }))
    for (const footprint of ['irrigationConsole-footprint', 'hydroponicBed-footprint']) expect((markup.match(new RegExp(`data-footprint="${footprint}"`, 'g')) ?? [])).toHaveLength(1)
    expect((markup.match(/object-hydroponicBed/g) ?? [])).toHaveLength(1)
    for (let index = 0; index < caseD204.solution.length; index += 1) for (let otherIndex = index + 1; otherIndex < caseD204.solution.length; otherIndex += 1) {
      const first = caseD204.solution[index], second = caseD204.solution[otherIndex]
      const swapped = caseD204.solution.map(placement => placement.characterId === first.characterId
        ? { ...placement, position: { ...second.position } }
        : placement.characterId === second.characterId
          ? { ...placement, position: { ...first.position } }
          : placement)
      expect(areAllCluesSatisfied(caseD204, swapped)).toBe(false)
    }
    const controlOccupants = caseD204.solution.filter(placement => getCell(caseD204.board, placement.position)?.zoneId === 'control').map(placement => placement.characterId).sort()
    expect(controlOccupants).toEqual(['iris', 'joel'])
    expect(caseD204.characters.flatMap(character => character.clues).some(clue => clue.text.toLocaleLowerCase('es').includes('ocupaba'))).toBe(false)
  })
})
