import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { case001 } from '../../data/cases/case001'
import { case002 } from '../../data/cases/case002'
import { resolveZoneSurface } from '../../game/zones/surfaces'
import { canPlace } from '../../game/rules'
import { normaliseObjectAppearanceScale, resolveObjectAppearanceScale, resolveObjectVisualProfile } from '../../game/objects/appearanceCatalog'
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
    expect(markup).toMatch(/object-chair[^"]*object-occupiable/)
    expect(markup).toMatch(/object-table[^"]*object-blocking/)
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
      expect(case001.zones.find(zone => zone.id === id)?.icon).toMatch(new RegExp(`/zones/${id}\\.png$`))
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

  it('keeps objects and people in independent anchored layers through placement, movement and removal', () => {
    const chair = case001.board.find(cell => cell.object?.id === 'chair')!
    const other = case001.board.find(cell => cell.row === 2 && cell.column === 4)!
    const person = { characterId: 'lucia', position: { row: chair.row, column: chair.column } }
    const render = (placements: typeof case001.solution) => renderToStaticMarkup(<Board {...case001} placements={placements} excludedCells={[]} onCellClick={() => {}} onCellContextMenu={() => {}} />)
    const empty = render([])
    const occupied = render([person])
    const moved = render([{ ...person, position: { row: other.row, column: other.column } }])
    expect(empty).toContain('data-layer="object"')
    expect(occupied).toContain('data-layer="object"')
    expect(occupied).toContain('data-layer="person"')
    expect(occupied.indexOf('data-layer="object"')).toBeLessThan(occupied.indexOf('data-layer="person"'))
    expect(occupied).toContain(`src="${chair.object!.icon}"`)
    expect(moved).toContain(`src="${chair.object!.icon}"`)
    expect(empty).toContain(`src="${chair.object!.icon}"`)
  })

  it('renders a multi-cell footprint once, centered over its declared box, while keeping only its explicit position occupiable', () => {
    const anchor = case002.board.find(cell => cell.row === 4 && cell.column === 1)!
    const reserved = case002.board.find(cell => cell.row === 5 && cell.column === 1)!
    const markup = renderToStaticMarkup(<Board {...case002} placements={[{ characterId: 'tomas', position: anchor }]} excludedCells={[]} onCellClick={() => {}} onCellContextMenu={() => {}} />)
    expect((markup.match(/data-footprint="case002-patio-lounger"/g) ?? []).length).toBe(1)
    expect(markup).toContain('--object-footprint-columns:1;--object-footprint-rows:2')
    expect(markup).toContain('object-visual-tall')
    expect(markup).toContain('footprint-anchor')
    expect(markup).toContain('footprint-reserved')
    expect(markup.indexOf('data-footprint="case002-patio-lounger"')).toBeLessThan(markup.indexOf('data-layer="person"'))
    expect(canPlace('vera', anchor, [], case002.board).ok).toBe(true)
    expect(canPlace('vera', reserved, [], case002.board).ok).toBe(false)
  })

  it('uses visual profiles instead of source image dimensions', () => {
    expect(['compact', 'standard', 'wide', 'tall'].map(visualProfile => resolveObjectVisualProfile({ visualProfile: visualProfile as 'compact' | 'standard' | 'wide' | 'tall' }))).toEqual(['compact', 'standard', 'wide', 'tall'])
    expect(resolveObjectVisualProfile({})).toBe('standard')
  })

  it('renders each declared zone label once, behind objects and people', () => {
    const markup = renderToStaticMarkup(<Board {...case002} placements={case002.solution} excludedCells={[]} onCellClick={() => {}} onCellContextMenu={() => {}} />)
    expect((markup.match(/data-layer="zone-label"/g) ?? [])).toHaveLength(case002.zones.length)
    for (const zone of case002.zones) {
      expect((markup.match(new RegExp(`data-zone-label="${zone.id}"`, 'g')) ?? [])).toHaveLength(1)
      expect(markup).toContain(`>${zone.name}</span>`)
    }
    expect(markup).toContain('zone-label-bottom')
    expect(markup).toContain('zone-label-top')
    const case001Markup = renderToStaticMarkup(<Board {...case001} placements={[]} excludedCells={[]} onCellClick={() => {}} onCellContextMenu={() => {}} />)
    expect(case001Markup).not.toContain('data-layer="zone-label"')
  })

  it('uses catalog scale metadata inside visual profile boxes with safe fallbacks', () => {
    const stool = case002.board.find(cell => cell.object?.id === 'stool')!.object!
    const chair = case002.board.find(cell => cell.object?.appearance === 'diningChair')!.object!
    expect(resolveObjectAppearanceScale(stool)).toBeLessThan(1)
    expect(resolveObjectAppearanceScale(chair)).toBe(.92)
    expect(resolveObjectAppearanceScale(case001.board.find(cell => cell.object?.id === 'chair')!.object!)).toBe(1)
    expect(normaliseObjectAppearanceScale(-1)).toBe(1)
    expect(normaliseObjectAppearanceScale(Number.NaN)).toBe(1)
    expect(normaliseObjectAppearanceScale(Infinity)).toBe(1)
    expect(normaliseObjectAppearanceScale(.8)).toBe(.8)
    const markup = renderToStaticMarkup(<Board {...case002} placements={[]} excludedCells={[]} onCellClick={() => {}} onCellContextMenu={() => {}} />)
    expect(markup).toContain('--object-appearance-scale:0.7')
    expect(markup).toContain('--object-appearance-scale:0.92')
  })
})
