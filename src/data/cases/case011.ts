import type { Character, GameCase, Placement } from '../../game/types'
import { avatarCatalog } from '../../game/characters/avatarCatalog'
import bookshelf from '../../assets/scenarios/office/objects/bookshelf.png'
import lamp from '../../assets/scenarios/hotel/objects/table_lamp.png'
import { contextualObject, createManualBoard, legacyObject } from './manualCaseHelpers'
const reading = contextualObject('readingTable', 'readingTable', false, [{ row: 3, column: 3 }, { row: 3, column: 4 }])
const shelfA = legacyObject('shelfA', 'una estantería', bookshelf, false, 'tall'), shelfB = legacyObject('shelfB', 'otra estantería', bookshelf, false, 'tall'), tableLamp = legacyObject('tableLamp', 'una lámpara', lamp, false, 'compact')
const seatA = contextualObject('accessSeat', 'diningChair', true), seatB = contextualObject('readingSeat', 'diningChair', true), seatC = contextualObject('archiveSeat', 'officeChair', true), seatD = contextualObject('aisleSeat', 'stool', true), seatE = contextualObject('readingSeatB', 'diningChair', true)
const zoneAt = (r: number, c: number) => r <= 2 ? 'access' : c <= 2 ? 'stacks' : r <= 4 ? 'reading' : 'archive'
const board = createManualBoard(zoneAt, { '1:1': seatA, '2:2': seatE, '2:5': shelfA, '3:1': shelfB, '3:3': reading, '3:4': reading, '3:6': seatB, '4:4': tableLamp, '4:5': seatD, '5:3': seatC })
const avatar = (i: number) => avatarCatalog[i + 18].image
const characters: Character[] = [
  { id: 'monica', name: 'Mónica', avatar: '👤', avatarImage: avatar(0), isVictim: false, clues: [{ id: 'c11-monica-corner', type: 'cornerOfBoard', text: 'Estaba sentada en una esquina.' }, { id: 'c11-monica-seat', type: 'onObject', objectId: 'accessSeat', text: 'Estaba sentada en la silla de la entrada.' }] },
  { id: 'raul', name: 'Raúl', avatar: '👤', avatarImage: avatar(1), isVictim: false, clues: [{ id: 'c11-raul', type: 'onObject', objectId: 'archiveSeat', text: 'Estaba sentado en el archivo.' }] },
  { id: 'ismael', name: 'Ismael', avatar: '👤', avatarImage: avatar(2), isVictim: false, clues: [{ id: 'c11-ismael', type: 'onObject', objectId: 'readingSeat', text: 'Estaba sentado en la sala de lectura.' }] },
  { id: 'clara', name: 'Clara', avatar: '👤', avatarImage: avatar(3), isVictim: false, clues: [{ id: 'c11-clara', type: 'onObject', objectId: 'aisleSeat', text: 'Estaba sentada junto a la lámpara.' }, { id: 'c11-clara-lamp', type: 'besideObject', objectId: 'tableLamp', text: 'Estaba junto a la lámpara de mesa.' }] },
  { id: 'sofia', name: 'Sofía', avatar: '👤', avatarImage: avatar(4), isVictim: false, clues: [{ id: 'c11-sofia-seat', type: 'onObject', objectId: 'readingSeatB', text: 'Estaba sentada en una silla.' }, { id: 'c11-sofia-shelf', type: 'relativeToObject', objectId: 'shelfB', direction: 'northEast', zoneRelation: 'different', text: 'Estaba al noreste de una estantería.' }] },
  { id: 'lucia', name: 'Lucía', avatar: '👤', avatarImage: avatar(5), isVictim: true, clues: [] },
]
const solution: Placement[] = [{ characterId: 'monica', position: { row: 1, column: 1 } }, { characterId: 'raul', position: { row: 5, column: 3 } }, { characterId: 'ismael', position: { row: 3, column: 6 } }, { characterId: 'clara', position: { row: 4, column: 5 } }, { characterId: 'sofia', position: { row: 2, column: 2 } }, { characterId: 'lucia', position: { row: 6, column: 4 } }]
export const case011: GameCase = { id: 'case011', title: 'Silencio, por favor', intro: 'Lucía fue encontrada sin vida entre los archivos de la biblioteca. Usa las mesas, estanterías y pasillos para reconstruir el silencio final.', difficulty: 1, rows: 6, columns: 6, zones: [{ id: 'access', name: 'Acceso', tone: 'cafe', surface: 'wood', labelAnchor: { position: { row: 2, column: 3 } } }, { id: 'stacks', name: 'Estanterías', tone: 'storage', surface: 'wood', labelAnchor: { position: { row: 5, column: 1 } } }, { id: 'reading', name: 'Lectura', tone: 'kitchen', surface: 'carpet', labelAnchor: { position: { row: 4, column: 3 } } }, { id: 'archive', name: 'Archivo', tone: 'bathroom', surface: 'concrete', labelAnchor: { position: { row: 6, column: 5 } } }], board, characters, solution }
