import type { Character, GameCase, Placement } from '../../game/types'
import { avatarCatalog } from '../../game/characters/avatarCatalog'
import { contextualObject, createManualBoard } from './manualCaseHelpers'

const counter = contextualObject('ticketCounter', 'ticketCounter', false, [{ row: 1, column: 2 }, { row: 1, column: 3 }])
const vending = contextualObject('vendingMachine', 'vendingMachine', false)
const bench = contextualObject('waitingBench', 'outdoorBench', true, undefined, [{ row: 2, column: 5 }])
const seatA = contextualObject('lobbySeat', 'diningChair', true), seatB = contextualObject('platformSeat', 'stool', true), seatC = contextualObject('storeSeat', 'diningChair', true), seatD = contextualObject('platformSeatB', 'stool', true)
const zoneAt = (r: number, c: number) => r <= 2 ? (c <= 3 ? 'ticketHall' : 'waiting') : r <= 4 ? (c <= 2 ? 'lobby' : 'platform') : c <= 3 ? 'storage' : 'platform'
const board = createManualBoard(zoneAt, { '1:2': counter, '1:3': counter, '1:4': seatA, '2:5': bench, '2:6': vending, '3:6': seatB, '4:2': seatD, '5:3': seatC })
const avatar = (i: number) => avatarCatalog[i + 6].image
const characters: Character[] = [
  { id: 'rita', name: 'Rita', avatar: '👤', avatarImage: avatar(0), isVictim: false, clues: [{ id: 'c12-rita-seat', type: 'onObject', objectId: 'lobbySeat', text: 'Estaba sentada en la sala de espera.' }, { id: 'c12-rita-wait', type: 'zone', zoneId: 'waiting', text: 'Estaba en la espera.' }] },
  { id: 'bruno', name: 'Bruno', avatar: '👤', avatarImage: avatar(1), isVictim: false, clues: [{ id: 'c12-bruno-seat', type: 'onObject', objectId: 'storeSeat', text: 'Estaba sentado en el almacén.' }, { id: 'c12-bruno-storage', type: 'zone', zoneId: 'storage', text: 'Estaba en el almacén.' }] },
  { id: 'carlos', name: 'Carlos', avatar: '👤', avatarImage: avatar(2), isVictim: false, clues: [{ id: 'c12-carlos-seat', type: 'onObject', objectId: 'platformSeat', text: 'Estaba sentado en el andén.' }] },
  { id: 'miriam', name: 'Miriam', avatar: '👤', avatarImage: avatar(3), isVictim: false, clues: [{ id: 'c12-miriam-seat', type: 'onObject', objectId: 'waitingBench', text: 'Estaba sentada en el banco.' }, { id: 'c12-miriam-vending', type: 'besideObject', objectId: 'vendingMachine', text: 'Estaba junto a la máquina expendedora.' }] },
  { id: 'david', name: 'David', avatar: '👤', avatarImage: avatar(4), isVictim: false, clues: [{ id: 'c12-david-seat', type: 'onObject', objectId: 'platformSeatB', text: 'Estaba sentado en el vestíbulo.' }] },
  { id: 'elena', name: 'Elena', avatar: '👤', avatarImage: avatar(5), isVictim: true, clues: [] },
]
const solution: Placement[] = [{ characterId: 'rita', position: { row: 1, column: 4 } }, { characterId: 'miriam', position: { row: 2, column: 5 } }, { characterId: 'carlos', position: { row: 3, column: 6 } }, { characterId: 'david', position: { row: 4, column: 2 } }, { characterId: 'bruno', position: { row: 5, column: 3 } }, { characterId: 'elena', position: { row: 6, column: 1 } }]
export const case012: GameCase = { id: 'case012', title: 'El último andén', intro: 'Elena fue encontrada sin vida después del último tren. Reconstruye las posiciones de la estación y descubre quién se quedó a solas con ella.', difficulty: 1, rows: 6, columns: 6, zones: [{ id: 'ticketHall', name: 'Taquillas', tone: 'cafe', surface: 'tile', labelAnchor: { position: { row: 2, column: 2 } } }, { id: 'waiting', name: 'Espera', tone: 'kitchen', surface: 'wood', labelAnchor: { position: { row: 1, column: 6 } } }, { id: 'lobby', name: 'Vestíbulo', tone: 'storage', surface: 'tile', labelAnchor: { position: { row: 4, column: 1 } } }, { id: 'platform', name: 'Andén', tone: 'bathroom', surface: 'concrete', labelAnchor: { position: { row: 6, column: 5 } } }, { id: 'storage', name: 'Almacén', tone: 'storage', surface: 'concrete', labelAnchor: { position: { row: 6, column: 2 } } }], board, characters, solution }
