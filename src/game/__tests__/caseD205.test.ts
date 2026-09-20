import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Board } from '../../components/Board'
import { caseD205 } from '../../data/cases/caseD205'
import { getManualNormalCase } from '../../data/cases/manualNormalCases'
import { areAllCluesSatisfied, evaluateCharacterClues } from '../clues'
import { resolveObjectAppearance, resolveObjectVisualProfile } from '../objects/appearanceCatalog'
import { getObjectFootprintBounds, isFootprintReservedCell } from '../objects/footprints'
import { findKiller, getCell, placementsEqual } from '../rules'
import { solveCaseWithStats } from '../solver'
import { validateCaseDefinition } from '../validation'

const objectCells = (id: string) => caseD205.board.filter(cell => cell.object?.id === id)

const assetHashes = {
  assemblyLine: 'C894E74C4765F46F308F84B385352C8A3D2B70B58DB0668DE5B440BE30E7AD9D',
  roboticArm: '774B911ED5CCA946FB4E57133CAE8A768B6A3EFEF3C20A4FEE99119105D49AB2',
  androidPod: '3B5DE21063A3533EBA35B2C439197541C8C61ABDAE9413CEB56D49060A86C008',
  calibrationStation: 'F0A26511460C1F1D38E53D81DDCE005ABB4CAE497D54075F181B8278C953588A',
  partsTrolley: '533BBE7CA0023E15A9FDDC1104C5FBB50DCD2F44EE7705432F7B01078F28655D',
} as const

describe('manual D2 case 05', () => {
  it('is a registered seven-by-seven manual case with a non-truncated canonical solution', () => {
    expect(getManualNormalCase(2, 5)).toBe(caseD205)
    expect(caseD205.rows).toBe(7)
    expect(caseD205.columns).toBe(7)
    expect(caseD205.board).toHaveLength(49)
    expect(caseD205.characters).toHaveLength(7)
    expect(caseD205.solution.map(placement => placement.position.row).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(caseD205.solution.map(placement => placement.position.column).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(caseD205.characters.find(character => character.isVictim)).toMatchObject({ id: 'raquel', clues: [] })
    expect(validateCaseDefinition(caseD205)).toEqual([])
    const solved = solveCaseWithStats(caseD205)
    expect(solved.truncated).not.toBe(true)
    expect(solved.solutionsFound).toBe(1)
    expect(placementsEqual(solved.solutions[0], caseD205.solution)).toBe(true)
    expect(areAllCluesSatisfied(caseD205, caseD205.solution)).toBe(true)
    expect(findKiller(caseD205, caseD205.solution)?.id).toBe('victor')
  })

  it('uses five literal factory assets with their declared footprints and occupancy', () => {
    const expectations = [
      ['assemblyLine', 'Cadena de montaje', ['3:1', '3:2', '3:3'], 'wide'],
      ['roboticArm', 'Brazo robótico', ['2:2'], 'tall'],
      ['androidPod', 'Cápsula de ensamblaje', ['1:6'], 'tall'],
      ['calibrationStation', 'Estación de calibración', ['3:5', '3:6'], 'wide'],
      ['partsTrolley', 'Carro de repuestos', ['5:2'], 'standard'],
    ] as const
    for (const [id, label, expectedCells, profile] of expectations) {
      const cells = objectCells(id)
      expect(cells.map(cell => `${cell.row}:${cell.column}`)).toEqual(expectedCells)
      expect(cells[0].object?.label).toBe(label.toLocaleLowerCase('es'))
      expect(resolveObjectAppearance(cells[0].object!).src).toMatch(new RegExp(`/d2/case05/${id.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)}\\.png$`))
      expect(resolveObjectVisualProfile(cells[0].object!)).toBe(profile)
    }
    expect(getObjectFootprintBounds(objectCells('assemblyLine')[0].object!, objectCells('assemblyLine')[0])).toMatchObject({ rows: 1, columns: 3 })
    expect(objectCells('assemblyLine').every(cell => !cell.occupiable && isFootprintReservedCell(cell.object, cell))).toBe(true)
    expect(getObjectFootprintBounds(objectCells('calibrationStation')[0].object!, objectCells('calibrationStation')[0])).toMatchObject({ rows: 1, columns: 2 })
    expect(getCell(caseD205.board, { row: 3, column: 5 })?.occupiable).toBe(true)
    expect(getCell(caseD205.board, { row: 3, column: 6 })?.occupiable).toBe(false)
    expect(isFootprintReservedCell(getCell(caseD205.board, { row: 3, column: 6 })?.object, { row: 3, column: 6 })).toBe(true)
  })

  it('renders the assembly line once beneath people as a continuous footprint', () => {
    const markup = renderToStaticMarkup(createElement(Board, { ...caseD205, placements: caseD205.solution, excludedCells: [], onCellClick: () => {}, onCellContextMenu: () => {} }))
    expect((markup.match(/data-footprint="assemblyLine-footprint"/g) ?? [])).toHaveLength(1)
    expect((markup.match(/object-assemblyLine/g) ?? [])).toHaveLength(1)
    expect((markup.match(/object-cover-footprint/g) ?? [])).toHaveLength(1)
    const surfacesCss = readFileSync(new URL('../../styles/surfaces.css', import.meta.url), 'utf8')
    expect(surfacesCss).toMatch(/\.cell-object-layer\{[^}]*z-index:2[^}]*pointer-events:none/s)
  })

  it('keeps every label anchor free and uses one or more people in every zone', () => {
    for (const zone of caseD205.zones) {
      const anchor = zone.labelAnchor!.position
      const cell = getCell(caseD205.board, anchor)!
      expect(cell.zoneId).toBe(zone.id)
      expect(cell.object).toBeUndefined()
      expect(caseD205.solution.some(placement => placement.position.row === anchor.row && placement.position.column === anchor.column)).toBe(false)
      expect(caseD205.solution.some(placement => getCell(caseD205.board, placement.position)?.zoneId === zone.id)).toBe(true)
    }
    const occupantsByZone = Object.fromEntries(caseD205.zones.map(zone => [zone.name, caseD205.solution
      .filter(placement => getCell(caseD205.board, placement.position)?.zoneId === zone.id)
      .map(placement => placement.characterId)]))
    expect(occupantsByZone).toEqual({ Montaje: ['mario'], Calibración: ['laura', 'sergio'], Repuestos: ['paula', 'berta'], Control: ['victor', 'raquel'] })
  })

  it('uses human-readable clues with individual ambiguity and rejects all pairwise swaps', () => {
    for (const character of caseD205.characters.filter(character => !character.isVictim)) {
      expect(character.clues.map(clue => clue.text).join(' ')).not.toMatch(/ocupaba/i)
      const candidates = caseD205.board.filter(cell => cell.occupiable && evaluateCharacterClues(character.id, caseD205, [{ characterId: character.id, position: { row: cell.row, column: cell.column } }])
        .every(result => result.evaluation !== 'violated'))
      expect(candidates.length).toBeGreaterThanOrEqual(2)
    }
    for (let index = 0; index < caseD205.solution.length; index += 1) for (let otherIndex = index + 1; otherIndex < caseD205.solution.length; otherIndex += 1) {
      const first = caseD205.solution[index], second = caseD205.solution[otherIndex]
      const swapped = caseD205.solution.map(placement => placement.characterId === first.characterId
        ? { ...placement, position: { ...second.position } }
        : placement.characterId === second.characterId
          ? { ...placement, position: { ...first.position } }
          : placement)
      expect(areAllCluesSatisfied(caseD205, swapped)).toBe(false)
    }
  })

  it('keeps the copied C05 PNGs byte-identical to their audited hashes', () => {
    const filenames = {
      assemblyLine: 'assembly_line.png',
      roboticArm: 'robotic_arm.png',
      androidPod: 'android_pod.png',
      calibrationStation: 'calibration_station.png',
      partsTrolley: 'parts_trolley.png',
    } as const
    for (const [id, filename] of Object.entries(filenames) as Array<[keyof typeof filenames, string]>) {
      const source = readFileSync(new URL(`../../assets/objects/contextual/d2/case05/${filename}`, import.meta.url))
      expect(createHash('sha256').update(source).digest('hex').toUpperCase()).toBe(assetHashes[id])
    }
  })
})
