import { describe, expect, it } from 'vitest'
import { evaluateClue } from '../clues'
import { isBeside } from '../rules'
import type { GameCase, Placement } from '../types'

const board = [
  { row: 1, column: 1, zoneId: 'a', occupiable: true, object: { id: 'plant', label: 'plant', icon: '', occupiable: false } },
  { row: 1, column: 2, zoneId: 'a', occupiable: true, object: { id: 'chair', label: 'chair', icon: '', occupiable: true } },
  { row: 2, column: 1, zoneId: 'a', occupiable: true }, { row: 2, column: 2, zoneId: 'b', occupiable: true },
]
const baseCase: GameCase = { id: 'test', title: '', intro: '', difficulty: 1, rows: 2, columns: 2, zones: [{ id: 'a', name: 'A', tone: 'a' }, { id: 'b', name: 'B', tone: 'b' }], board, characters: [{ id: 'a', name: 'A', avatar: '', isVictim: true, clues: [] }, { id: 'b', name: 'B', avatar: '', isVictim: false, clues: [] }], solution: [] }
const placed: Placement[] = [{ characterId: 'a', position: { row: 1, column: 2 } }, { characterId: 'b', position: { row: 2, column: 1 } }]
describe('evaluateClue', () => {
  it('evalúa pistas directas y negativas', () => {
    expect(evaluateClue({ id: 'r', type: 'row', text: '', row: 1 }, 'a', baseCase, placed)).toBe('satisfied')
    expect(evaluateClue({ id: 'c', type: 'column', text: '', column: 1 }, 'a', baseCase, placed)).toBe('violated')
    expect(evaluateClue({ id: 'z', type: 'zone', text: '', zoneId: 'a' }, 'a', baseCase, placed)).toBe('satisfied')
    expect(evaluateClue({ id: 'noz', type: 'notZone', text: '', zoneId: 'b' }, 'a', baseCase, placed)).toBe('satisfied')
    expect(evaluateClue({ id: 'on', type: 'onObject', text: '', objectId: 'chair' }, 'a', baseCase, placed)).toBe('satisfied')
    expect(evaluateClue({ id: 'noon', type: 'notOnObject', text: '', objectId: 'plant' }, 'a', baseCase, placed)).toBe('satisfied')
    expect(evaluateClue({ id: 'beside', type: 'besideObject', text: '', objectId: 'plant' }, 'a', baseCase, placed)).toBe('satisfied')
    expect(evaluateClue({ id: 'nobeside', type: 'notBesideObject', text: '', objectId: 'plant' }, 'b', baseCase, placed)).toBe('violated')
    expect(evaluateClue({ id: 'row-fail', type: 'row', text: '', row: 2 }, 'a', baseCase, placed)).toBe('violated')
    expect(evaluateClue({ id: 'column-pass', type: 'column', text: '', column: 2 }, 'a', baseCase, placed)).toBe('satisfied')
    expect(evaluateClue({ id: 'zone-fail', type: 'zone', text: '', zoneId: 'b' }, 'a', baseCase, placed)).toBe('violated')
    expect(evaluateClue({ id: 'not-zone-fail', type: 'notZone', text: '', zoneId: 'a' }, 'a', baseCase, placed)).toBe('violated')
    expect(evaluateClue({ id: 'on-fail', type: 'onObject', text: '', objectId: 'plant' }, 'a', baseCase, placed)).toBe('violated')
    expect(evaluateClue({ id: 'not-on-fail', type: 'notOnObject', text: '', objectId: 'chair' }, 'a', baseCase, placed)).toBe('violated')
    expect(evaluateClue({ id: 'beside-fail', type: 'besideObject', text: '', objectId: 'chair' }, 'a', baseCase, placed)).toBe('violated')
    expect(evaluateClue({ id: 'not-beside-pass', type: 'notBesideObject', text: '', objectId: 'chair' }, 'b', baseCase, placed)).toBe('satisfied')
  })
  it('evalúa relaciones entre personajes y estados indeterminados', () => {
    expect(evaluateClue({ id: 'north', type: 'northOfCharacter', text: '', targetCharacterId: 'b' }, 'a', baseCase, placed)).toBe('satisfied')
    expect(evaluateClue({ id: 'south', type: 'southOfCharacter', text: '', targetCharacterId: 'a' }, 'b', baseCase, placed)).toBe('satisfied')
    expect(evaluateClue({ id: 'same', type: 'sameZoneAsCharacter', text: '', targetCharacterId: 'b' }, 'a', baseCase, placed)).toBe('satisfied')
    expect(evaluateClue({ id: 'north-fail', type: 'northOfCharacter', text: '', targetCharacterId: 'a' }, 'b', baseCase, placed)).toBe('violated')
    expect(evaluateClue({ id: 'south-fail', type: 'southOfCharacter', text: '', targetCharacterId: 'b' }, 'a', baseCase, placed)).toBe('violated')
    const crossZone: Placement[] = [{ characterId: 'a', position: { row: 1, column: 2 } }, { characterId: 'b', position: { row: 2, column: 2 } }]
    expect(evaluateClue({ id: 'same-fail', type: 'sameZoneAsCharacter', text: '', targetCharacterId: 'b' }, 'a', baseCase, crossZone)).toBe('violated')
    const adjacent: Placement[] = [{ characterId: 'a', position: { row: 1, column: 1 } }, { characterId: 'b', position: { row: 2, column: 1 } }]
    expect(evaluateClue({ id: 'beside-person', type: 'besideCharacter', text: '', targetCharacterId: 'b' }, 'a', baseCase, adjacent)).toBe('satisfied')
    expect(evaluateClue({ id: 'beside-person-fail', type: 'besideCharacter', text: '', targetCharacterId: 'b' }, 'a', baseCase, crossZone)).toBe('violated')
    expect(evaluateClue({ id: 'pending', type: 'row', text: '', row: 1 }, 'a', baseCase, [])).toBe('undetermined')
    expect(evaluateClue({ id: 'pending-relation', type: 'northOfCharacter', text: '', targetCharacterId: 'b' }, 'a', baseCase, [placed[0]])).toBe('undetermined')
  })
})
describe('isBeside', () => {
  it('acepta horizontal y vertical, pero no diagonal ni paredes entre zonas', () => {
    expect(isBeside(board[0], board[1], board)).toBe(true)
    expect(isBeside(board[0], board[2], board)).toBe(true)
    expect(isBeside(board[0], board[3], board)).toBe(false)
    expect(isBeside(board[1], board[3], board)).toBe(false)
  })
})
