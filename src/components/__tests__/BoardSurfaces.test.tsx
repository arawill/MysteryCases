import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { case001 } from '../../data/cases/case001'
import { resolveZoneSurface } from '../../game/zones/surfaces'
import type { Zone } from '../../game/types'
import { Board } from '../Board'

describe('visual board surfaces', () => {
  it('gives old zones without surfaces defaults by tone and falls back for unknown data', () => {
    expect(case001.zones.every(zone => zone.surface === undefined)).toBe(true)
    expect(case001.zones.map(resolveZoneSurface)).toEqual(['wood', 'kitchenTile', 'industrial', 'tile'])
    expect(resolveZoneSurface({ tone: 'unknown' })).toBe('generic')
    expect(resolveZoneSurface({ tone: 'cafe', surface: 'invalid' } as unknown as Zone)).toBe('generic')
    expect(resolveZoneSurface()).toBe('generic')
    expect(resolveZoneSurface({ tone: 'cafe', surface: 'grass' })).toBe('grass')
  })

  it('renders surfaces and occupancy classes without changing cells, clues or assets', () => {
    const before = structuredClone(case001)
    const markup = renderToStaticMarkup(<Board {...case001} placements={[]} excludedCells={[]} onCellClick={() => {}} onCellContextMenu={() => {}} />)
    expect((markup.match(/<button /g) ?? [])).toHaveLength(36)
    for (const surface of ['wood', 'kitchenTile', 'industrial', 'tile']) expect(markup).toContain(`surface-${surface}`)
    expect(markup).toContain('object-chair object-occupiable')
    expect(markup).toContain('object-table object-blocking')
    for (const cell of case001.board) if (cell.object) expect(markup).toContain(`src="${cell.object.icon}"`)
    for (const zone of case001.zones) if (zone.icon) expect(markup).toContain(`src="${zone.icon}"`)
    expect(case001).toEqual(before)
  })

  it('uses the final PNG assets without changing board semantics or the canonical solution', () => {
    const before = {
      cells: case001.board.length,
      solution: structuredClone(case001.solution),
      occupancy: case001.board.map(cell => ({ position: `${cell.row}:${cell.column}`, occupiable: cell.occupiable, object: cell.object?.id })),
    }
    const objectIds = ['chair', 'table', 'plant', 'crate', 'register', 'puddle']
    for (const id of objectIds) {
      const object = case001.board.find(cell => cell.object?.id === id)?.object
      expect(object?.icon).toMatch(new RegExp(`/objects/${id}\\.png$`))
    }
    for (const id of ['cafe', 'kitchen', 'storage', 'bathroom']) {
      expect(case001.zones.find(zone => zone.id === id)?.icon).toMatch(new RegExp(`/objects/${id}\\.png$`))
    }
    expect(case001.board.length).toBe(before.cells)
    expect(case001.solution).toEqual(before.solution)
    expect(case001.board.map(cell => ({ position: `${cell.row}:${cell.column}`, occupiable: cell.occupiable, object: cell.object?.id }))).toEqual(before.occupancy)
  })

  it.each(['chair.png', 'chair.webp', 'chair.svg'])('accepts %s through the existing object icon without format-specific renderers', icon => {
    const board = case001.board.map(cell => cell.object?.id === 'chair' ? { ...cell, object: { ...cell.object, icon } } : cell)
    const markup = renderToStaticMarkup(<Board {...case001} board={board} placements={[]} excludedCells={[]} onCellClick={() => {}} onCellContextMenu={() => {}} />)
    expect(markup).toContain(`src="${icon}"`)
  })

  it('distinguishes manual and automatic notes without altering placements or exclusions', () => {
    const manual = [{ row: 1, column: 1 }], excluded = [...manual, { row: 2, column: 1 }]
    const before = structuredClone(excluded)
    const markup = renderToStaticMarkup(<Board {...case001} placements={case001.solution} selectedCharacterId="alma" excludedCells={excluded} manualExcludedCells={manual} onCellClick={() => {}} onCellContextMenu={() => {}} />)
    expect(markup).toContain('excluded-manual')
    expect(markup).toContain('excluded-auto')
    expect(markup).toContain('descarte manual')
    expect(markup).toContain('descarte automático')
    expect(markup).toContain('<small>A</small>')
    expect(markup).toContain('token-victim')
    expect(markup).toContain('cell-selected')
    expect(excluded).toEqual(before)
  })
})
