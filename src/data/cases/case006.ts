import type { Character, GameCase, Placement } from '../../game/types'
import { avatarCatalog } from '../../game/characters/avatarCatalog'
import toolboxIcon from '../../assets/scenarios/outdoor/objects/toolbox.png'
import deskIcon from '../../assets/scenarios/office/objects/desk.png'
import { contextualObject, createManualBoard, legacyObject } from './manualCaseHelpers'

const workbench = contextualObject('workbench', 'workbench', false, [{ row: 1, column: 3 }, { row: 1, column: 4 }])
const tires = contextualObject('tires', 'tires', false), toolbox = legacyObject('toolbox', 'una caja de herramientas', toolboxIcon, false, 'standard'), desk = legacyObject('officeDesk', 'un escritorio', deskIcon, false, 'standard')
const seatA = contextualObject('receptionSeat', 'diningChair', true), seatB = contextualObject('storageSeat', 'stool', true), seatC = contextualObject('officeSeat', 'officeChair', true), seatD = contextualObject('boxSeat', 'diningChair', true), seatE = contextualObject('archiveSeat', 'stool', true)
const zoneAt = (row: number, column: number) => row <= 3 ? (column === 1 ? 'reception' : column <= 5 ? 'bays' : 'office') : column <= 3 ? 'storage' : 'office'
const board = createManualBoard(zoneAt, { '1:2': seatA, '1:3': workbench, '1:4': workbench, '2:6': seatC, '3:4': tires, '3:5': seatD, '4:3': seatB, '4:5': toolbox, '5:4': seatE, '6:6': desk })
const avatar = (index: number) => avatarCatalog[index + 12].image
const characters: Character[] = [
  { id: 'mara', name: 'Mara', avatar: '👤', avatarImage: avatar(0), isVictim: false, clues: [{ id: 'c06-mara-seat', type: 'onObject', objectId: 'receptionSeat', text: 'Estaba sentada en la silla junto a recepción.' }, { id: 'c06-mara-bays', type: 'zone', zoneId: 'bays', text: 'Estaba en los boxes.' }] },
  { id: 'ivan', name: 'Iván', avatar: '👤', avatarImage: avatar(1), isVictim: false, clues: [{ id: 'c06-ivan-seat', type: 'onObject', objectId: 'storageSeat', text: 'Estaba sentado en el taburete del almacén.' }, { id: 'c06-ivan-storage', type: 'zone', zoneId: 'storage', text: 'Estaba en el almacén.' }] },
  { id: 'oscar', name: 'Óscar', avatar: '👤', avatarImage: avatar(2), isVictim: false, clues: [{ id: 'c06-oscar-seat', type: 'onObject', objectId: 'officeSeat', text: 'Estaba sentado en la silla de oficina.' }, { id: 'c06-oscar-office', type: 'zone', zoneId: 'office', text: 'Estaba en la oficina.' }] },
  { id: 'lidia', name: 'Lidia', avatar: '👤', avatarImage: avatar(3), isVictim: false, clues: [{ id: 'c06-lidia-seat', type: 'onObject', objectId: 'boxSeat', text: 'Estaba sentada junto a los boxes.' }, { id: 'c06-lidia-tires', type: 'besideObject', objectId: 'tires', text: 'Estaba junto a los neumáticos.' }] },
  { id: 'hugo', name: 'Hugo', avatar: '👤', avatarImage: avatar(4), isVictim: false, clues: [{ id: 'c06-hugo-seat', type: 'onObject', objectId: 'archiveSeat', text: 'Estaba sentado en un taburete.' }, { id: 'c06-hugo-office', type: 'zone', zoneId: 'office', text: 'Estaba en la oficina.' }] },
  { id: 'carla', name: 'Carla', avatar: '👤', avatarImage: avatar(5), isVictim: true, clues: [] },
]
const solution: Placement[] = [{ characterId: 'mara', position: { row: 1, column: 2 } }, { characterId: 'ivan', position: { row: 4, column: 3 } }, { characterId: 'oscar', position: { row: 2, column: 6 } }, { characterId: 'lidia', position: { row: 3, column: 5 } }, { characterId: 'hugo', position: { row: 5, column: 4 } }, { characterId: 'carla', position: { row: 6, column: 1 } }]
export const case006: GameCase = { id: 'case006', title: 'Motor en frío', intro: 'Carla apareció sin vida en el taller antes de abrir. Usa los apoyos y objetos de cada sala para reconstruir la última ronda.', difficulty: 1, rows: 6, columns: 6, zones: [{ id: 'reception', name: 'Recepción', tone: 'cafe', surface: 'tile', labelAnchor: { position: { row: 3, column: 1 } } }, { id: 'bays', name: 'Boxes', tone: 'storage', surface: 'industrial', labelAnchor: { position: { row: 2, column: 4 } } }, { id: 'office', name: 'Oficina', tone: 'kitchen', surface: 'wood', labelAnchor: { position: { row: 6, column: 5 } } }, { id: 'storage', name: 'Almacén', tone: 'bathroom', surface: 'concrete', labelAnchor: { position: { row: 5, column: 2 } } }], board, characters, solution }
