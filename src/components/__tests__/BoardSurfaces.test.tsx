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
    expect(markup).toContain('object object-occupiable')
    expect(markup).toContain('object object-blocking')
    for (const cell of case001.board) if (cell.object) expect(markup).toContain(renderToStaticMarkup(<img src={cell.object.icon} alt="" />))
    expect(case001).toEqual(before)
  })

  it.each(['chair.png', 'chair.webp', 'chair.svg'])('accepts %s through the existing object icon without format-specific renderers', icon => {
    const board = case001.board.map(cell => cell.object?.id === 'chair' ? { ...cell, object: { ...cell.object, icon } } : cell)
    const markup = renderToStaticMarkup(<Board {...case001} board={board} placements={[]} excludedCells={[]} onCellClick={() => {}} onCellContextMenu={() => {}} />)
    expect(markup).toContain(`src="${icon}"`)
  })
})
