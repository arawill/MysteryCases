import type { Character, GameCase, Placement } from '../../game/types'
import { avatarCatalog } from '../../game/characters/avatarCatalog'
import { contextualObject, createManualBoard } from './manualCaseHelpers'

const counter = contextualObject('cafeCounter', 'cafeCounter', false, [{ row: 1, column: 1 }, { row: 1, column: 2 }])
const coffee = contextualObject('coffeeMachine', 'coffeeMachine', false), roundTable = contextualObject('roundTable', 'roundTable', false)
const stoolA = contextualObject('stoolA', 'stool', true), stoolB = contextualObject('stoolB', 'stool', true)
const chairA = contextualObject('chairA', 'diningChair', true), chairB = contextualObject('chairB', 'diningChair', true), chairC = contextualObject('chairC', 'diningChair', true)
const zoneAt = (row: number, column: number) => row <= 2 && column <= 2 ? 'bar' : row <= 2 ? 'lounge' : column <= 2 ? 'kitchen' : 'storage'
const board = createManualBoard(zoneAt, { '1:1': counter, '1:2': counter, '2:1': coffee, '5:4': roundTable, '1:4': stoolA, '2:6': stoolB, '3:1': chairA, '4:3': chairB, '5:5': chairC })
const avatar = (index: number) => avatarCatalog[index + 6].image
const characters: Character[] = [
  { id: 'celia', name: 'Celia', avatar: '👤', avatarImage: avatar(0), isVictim: false, clues: [{ id: 'c05-celia-seat', type: 'onObject', objectId: 'stoolA', text: 'Estaba sentada en un taburete.' }, { id: 'c05-celia-lounge', type: 'zone', zoneId: 'lounge', text: 'Estaba en la sala.' }] },
  { id: 'alvaro', name: 'Álvaro', avatar: '👤', avatarImage: avatar(1), isVictim: false, clues: [{ id: 'c05-alvaro-seat', type: 'onObject', objectId: 'chairA', text: 'Estaba sentado en una silla.' }, { id: 'c05-alvaro-kitchen', type: 'zone', zoneId: 'kitchen', text: 'Estaba en la cocina.' }] },
  { id: 'pablo', name: 'Pablo', avatar: '👤', avatarImage: avatar(2), isVictim: false, clues: [{ id: 'c05-pablo-seat', type: 'onObject', objectId: 'stoolB', text: 'Estaba sentado en el otro taburete.' }, { id: 'c05-pablo-lounge', type: 'zone', zoneId: 'lounge', text: 'Estaba en la sala.' }] },
  { id: 'rosa', name: 'Rosa', avatar: '👤', avatarImage: avatar(3), isVictim: false, clues: [{ id: 'c05-rosa-seat', type: 'onObject', objectId: 'chairB', text: 'Estaba sentada en una silla junto al almacén.' }, { id: 'c05-rosa-storage', type: 'zone', zoneId: 'storage', text: 'Estaba en el almacén.' }] },
  { id: 'ivan', name: 'Iván', avatar: '👤', avatarImage: avatar(4), isVictim: false, clues: [{ id: 'c05-ivan-seat', type: 'onObject', objectId: 'chairC', text: 'Estaba sentado en una silla.' }, { id: 'c05-ivan-table', type: 'besideObject', objectId: 'roundTable', text: 'Estaba junto a la mesa redonda.' }] },
  { id: 'nadia', name: 'Nadia', avatar: '👤', avatarImage: avatar(5), isVictim: true, clues: [] },
]
const solution: Placement[] = [{ characterId: 'celia', position: { row: 1, column: 4 } }, { characterId: 'alvaro', position: { row: 3, column: 1 } }, { characterId: 'pablo', position: { row: 2, column: 6 } }, { characterId: 'rosa', position: { row: 4, column: 3 } }, { characterId: 'ivan', position: { row: 5, column: 5 } }, { characterId: 'nadia', position: { row: 6, column: 2 } }]
export const case005: GameCase = { id: 'case005', title: 'El último café', intro: 'Nadia fue encontrada sin vida después del cierre de la cafetería. Reconstruye la escena y averigua quién se quedó a solas con ella.', difficulty: 1, rows: 6, columns: 6, zones: [{ id: 'bar', name: 'Barra', tone: 'cafe', surface: 'wood', labelAnchor: { position: { row: 2, column: 2 } } }, { id: 'lounge', name: 'Sala', tone: 'kitchen', surface: 'wood', labelAnchor: { position: { row: 1, column: 5 } } }, { id: 'kitchen', name: 'Cocina', tone: 'storage', surface: 'kitchenTile', labelAnchor: { position: { row: 5, column: 1 } } }, { id: 'storage', name: 'Almacén', tone: 'bathroom', surface: 'concrete', labelAnchor: { position: { row: 6, column: 4 } } }], board, characters, solution }
