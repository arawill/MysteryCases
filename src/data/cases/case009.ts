import type { Character, GameCase, Placement } from '../../game/types'
import { avatarCatalog } from '../../game/characters/avatarCatalog'
import bookshelf from '../../assets/scenarios/office/objects/bookshelf.png'
import register from '../../assets/scenarios/cafeteria/objects/register.png'
import { contextualObject, createManualBoard, legacyObject } from './manualCaseHelpers'
const cart = contextualObject('shoppingCart', 'shoppingCart', true), freezer = contextualObject('freezer', 'freezer', false, [{ row: 5, column: 4 }, { row: 5, column: 5 }])
const shelf = legacyObject('shelf', 'una estantería', bookshelf, false, 'tall'), registerObject = legacyObject('register', 'una caja registradora', register, false, 'standard')
const seatA = contextualObject('aisleSeatA', 'diningChair', true), seatB = contextualObject('aisleSeatB', 'stool', true), seatC = contextualObject('storeSeat', 'diningChair', true), seatD = contextualObject('checkoutSeat', 'stool', true)
const zoneAt = (r: number, c: number) => r <= 2 ? 'entrance' : r <= 4 && c <= 4 ? 'aisles' : r <= 4 ? 'checkout' : c <= 3 ? 'storage' : 'frozen'
const board = createManualBoard(zoneAt, { '1:4': cart, '2:5': seatD, '3:2': seatA, '3:4': shelf, '4:6': seatB, '5:3': seatC, '5:4': freezer, '5:5': freezer, '2:6': registerObject })
const avatar = (i: number) => avatarCatalog[i + 6].image
const characters: Character[] = [
  { id: 'nora', name: 'Nora', avatar: '👤', avatarImage: avatar(0), isVictim: false, clues: [{ id: 'c09-nora', type: 'onObject', objectId: 'shoppingCart', text: 'Estaba con el carrito de compra.' }] },
  { id: 'diego', name: 'Diego', avatar: '👤', avatarImage: avatar(1), isVictim: false, clues: [{ id: 'c09-diego', type: 'onObject', objectId: 'storeSeat', text: 'Estaba sentado en el almacén.' }] },
  { id: 'raul', name: 'Raúl', avatar: '👤', avatarImage: avatar(2), isVictim: false, clues: [{ id: 'c09-raul', type: 'onObject', objectId: 'aisleSeatA', text: 'Estaba sentado en un pasillo.' }] },
  { id: 'eva', name: 'Eva', avatar: '👤', avatarImage: avatar(3), isVictim: false, clues: [{ id: 'c09-eva', type: 'onObject', objectId: 'checkoutSeat', text: 'Estaba sentada junto a las cajas.' }] },
  { id: 'mario', name: 'Mario', avatar: '👤', avatarImage: avatar(4), isVictim: false, clues: [{ id: 'c09-mario', type: 'onObject', objectId: 'aisleSeatB', text: 'Estaba sentado en el otro pasillo.' }] },
  { id: 'marta', name: 'Marta', avatar: '👤', avatarImage: avatar(5), isVictim: true, clues: [] },
]
const solution: Placement[] = [{ characterId: 'nora', position: { row: 1, column: 4 } }, { characterId: 'diego', position: { row: 5, column: 3 } }, { characterId: 'raul', position: { row: 3, column: 2 } }, { characterId: 'eva', position: { row: 2, column: 5 } }, { characterId: 'mario', position: { row: 4, column: 6 } }, { characterId: 'marta', position: { row: 6, column: 1 } }]
export const case009: GameCase = { id: 'case009', title: 'Pasillo 24', intro: 'Marta murió después de cerrar el supermercado. Sigue los pasillos, las cajas y el almacén para reconstruir la última ronda.', difficulty: 1, rows: 6, columns: 6, zones: [{ id: 'entrance', name: 'Entrada', tone: 'cafe', surface: 'tile', labelAnchor: { position: { row: 1, column: 3 } } }, { id: 'aisles', name: 'Pasillos', tone: 'kitchen', surface: 'concrete', labelAnchor: { position: { row: 4, column: 1 } } }, { id: 'checkout', name: 'Cajas', tone: 'storage', surface: 'tile', labelAnchor: { position: { row: 3, column: 5 } } }, { id: 'storage', name: 'Almacén', tone: 'bathroom', surface: 'concrete', labelAnchor: { position: { row: 6, column: 1 } } }, { id: 'frozen', name: 'Congelados', tone: 'kitchen', surface: 'tile', labelAnchor: { position: { row: 6, column: 6 } } }], board, characters, solution }
