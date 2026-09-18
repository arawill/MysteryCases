import type { Character, GameCase, Placement } from '../../game/types'
import { avatarCatalog } from '../../game/characters/avatarCatalog'
import { contextualObject, createManualBoard } from './manualCaseHelpers'
const lifeguard = contextualObject('lifeguardChair', 'lifeguardChair', true, undefined, [{ row: 4, column: 1 }]), lockers = contextualObject('lockerBank', 'lockerBank', false)
const seatA = contextualObject('deckSeat', 'outdoorBench', true), seatB = contextualObject('standSeatA', 'diningChair', true), seatC = contextualObject('standSeatB', 'diningChair', true), seatD = contextualObject('receptionSeat', 'stool', true)
const poolPositions = [{ row: 2, column: 2 }, { row: 2, column: 3 }, { row: 2, column: 4 }, { row: 3, column: 2 }, { row: 3, column: 3 }, { row: 3, column: 4 }]
const poolSurface = contextualObject('poolSurface', 'poolSurface', false, poolPositions, [])
const zoneAt = (r: number, c: number) => r >= 2 && r <= 3 && c >= 2 && c <= 4 ? 'pool' : r <= 3 && c === 1 ? 'lockers' : r >= 4 && c <= 2 ? 'deck' : c >= 5 ? 'stands' : 'reception'
const board = createManualBoard(zoneAt, { '1:4': seatD, '2:1': lockers, '2:2': poolSurface, '2:3': poolSurface, '2:4': poolSurface, '2:6': seatB, '3:2': poolSurface, '3:3': poolSurface, '3:4': poolSurface, '3:5': seatC, '4:1': lifeguard, '5:3': seatA })
const avatar = (i: number) => avatarCatalog[i].image
const characters: Character[] = [
  { id: 'sara', name: 'Sara', avatar: '👤', avatarImage: avatar(0), isVictim: false, clues: [{ id: 'c08-sara', type: 'onObject', objectId: 'receptionSeat', text: 'Estaba sentada en el taburete de recepción.' }] },
  { id: 'pablo', name: 'Pablo', avatar: '👤', avatarImage: avatar(1), isVictim: false, clues: [{ id: 'c08-pablo', type: 'onObject', objectId: 'lifeguardChair', text: 'Estaba en la silla del socorrista.' }, { id: 'c08-pablo-deck', type: 'zone', zoneId: 'deck', text: 'Estaba en la pasarela.' }] },
  { id: 'nico', name: 'Nico', avatar: '👤', avatarImage: avatar(2), isVictim: false, clues: [{ id: 'c08-nico', type: 'onObject', objectId: 'standSeatA', text: 'Estaba sentado en las gradas.' }] },
  { id: 'ana', name: 'Ana', avatar: '👤', avatarImage: avatar(3), isVictim: false, clues: [{ id: 'c08-ana', type: 'onObject', objectId: 'standSeatB', text: 'Estaba sentada junto a la piscina.' }] },
  { id: 'leo', name: 'Leo', avatar: '👤', avatarImage: avatar(4), isVictim: false, clues: [{ id: 'c08-leo', type: 'onObject', objectId: 'deckSeat', text: 'Estaba sentado en el banco.' }] },
  { id: 'vera', name: 'Vera', avatar: '👤', avatarImage: avatar(5), isVictim: true, clues: [] },
]
const solution: Placement[] = [{ characterId: 'sara', position: { row: 1, column: 4 } }, { characterId: 'pablo', position: { row: 4, column: 1 } }, { characterId: 'nico', position: { row: 2, column: 6 } }, { characterId: 'ana', position: { row: 3, column: 5 } }, { characterId: 'leo', position: { row: 5, column: 3 } }, { characterId: 'vera', position: { row: 6, column: 2 } }]
export const case008: GameCase = { id: 'case008', title: 'Piscina cerrada', intro: 'Vera fue encontrada sin vida junto a la piscina cerrada. Reconstruye la escena para identificar a quien se quedó a solas con ella.', difficulty: 1, rows: 6, columns: 6, zones: [{ id: 'pool', name: 'Piscina', tone: 'kitchen', surface: 'tile' }, { id: 'lockers', name: 'Vestuarios', tone: 'storage', surface: 'tile', labelAnchor: { position: { row: 3, column: 1 } } }, { id: 'deck', name: 'Pasarela', tone: 'cafe', surface: 'wood', labelAnchor: { position: { row: 5, column: 2 } } }, { id: 'stands', name: 'Gradas', tone: 'bathroom', surface: 'concrete', labelAnchor: { position: { row: 4, column: 6 } } }, { id: 'reception', name: 'Recepción', tone: 'cafe', surface: 'tile', labelAnchor: { position: { row: 1, column: 2 } } }], board, characters, solution }
