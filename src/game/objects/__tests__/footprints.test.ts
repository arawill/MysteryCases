import { describe, expect, it } from 'vitest'
import { case002 } from '../../../data/cases/case002'
import { validateCaseDefinition } from '../../validation'

const clone = () => structuredClone(case002)
const loungerCells = (caseData: ReturnType<typeof clone>) => caseData.board.filter(cell => cell.object?.footprint?.id === 'case002-patio-lounger')

describe('object footprints', () => {
  it('keeps the Case002 vertical footprint contiguous and all logical occupancy inside it', () => {
    const cells = loungerCells(case002)
    expect(cells).toHaveLength(2)
    expect(cells.map(cell => `${cell.row}:${cell.column}`)).toEqual(['4:1', '5:1'])
    expect(cells.filter(cell => cell.occupiable).map(cell => `${cell.row}:${cell.column}`)).toEqual(['4:1', '5:1'])
    expect(validateCaseDefinition(case002)).toEqual([])
  })

  it('rejects an out-of-board or discontinuous footprint', () => {
    const outside = clone()
    for (const cell of loungerCells(outside)) cell.object!.footprint!.positions = [{ row: 4, column: 1 }, { row: 7, column: 1 }]
    expect(validateCaseDefinition(outside).join(' ')).toContain('sale del tablero')
    const discontinuous = clone()
    for (const cell of loungerCells(discontinuous)) cell.object!.footprint!.positions = [{ row: 4, column: 1 }, { row: 6, column: 1 }]
    expect(validateCaseDefinition(discontinuous).join(' ')).toContain('rectángulo continuo')
  })

  it('rejects overlapping footprints and positions occupiable outside their footprint', () => {
    const overlapping = clone()
    const chair = overlapping.board.find(cell => cell.row === 5 && cell.column === 4)!
    chair.object = { ...chair.object!, footprint: { id: 'overlap', positions: [{ row: 4, column: 1 }, { row: 5, column: 1 }] }, occupiablePositions: [{ row: 4, column: 1 }] }
    chair.occupiable = false
    expect(validateCaseDefinition(overlapping).join(' ')).toContain('solapan')
    const invalidPositions = clone()
    for (const cell of loungerCells(invalidPositions)) cell.object!.occupiablePositions = [{ row: 4, column: 1 }, { row: 6, column: 1 }]
    expect(validateCaseDefinition(invalidPositions).join(' ')).toContain('no pertenece al footprint')
  })
})
