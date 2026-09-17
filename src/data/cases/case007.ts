import type { Character, GameCase, Placement } from '../../game/types'
import { avatarCatalog } from '../../game/characters/avatarCatalog'
import deskIcon from '../../assets/scenarios/office/objects/desk.png'
import printerIcon from '../../assets/scenarios/office/objects/printer.png'
import filingIcon from '../../assets/scenarios/office/objects/filing_cabinet.png'
import { contextualObject, createManualBoard, legacyObject } from './manualCaseHelpers'

const meeting = contextualObject('meetingTable', 'meetingTable', false, [{ row: 4, column: 3 }, { row: 4, column: 4 }])
const lockers = contextualObject('lockerBank', 'lockerBank', false)
const desk = legacyObject('desk', 'un escritorio', deskIcon, false, 'standard'), printer = legacyObject('printer', 'una impresora', printerIcon, false, 'standard'), filing = legacyObject('filingCabinet', 'un archivador', filingIcon, false, 'tall')
const seatA = contextualObject('officeSeatA', 'officeChair', true), seatB = contextualObject('archiveSeat', 'officeChair', true), seatC = contextualObject('officeSeatC', 'diningChair', true), seatD = contextualObject('meetingSeatA', 'officeChair', true), seatE = contextualObject('meetingSeatB', 'diningChair', true)
const zoneAt = (row: number, column: number) => row <= 2 ? (column <= 2 ? 'reception' : 'offices') : column <= 2 ? 'archive' : 'meeting'
const board = createManualBoard(zoneAt, { '1:3': seatA, '1:6': desk, '2:6': seatC, '3:1': filing, '3:2': lockers, '4:1': seatB, '3:4': seatD, '4:3': meeting, '4:4': meeting, '5:5': seatE, '5:4': printer })
const avatar = (index: number) => avatarCatalog[index + 18].image
const characters: Character[] = [
  { id: 'paula', name: 'Paula', avatar: '👤', avatarImage: avatar(0), isVictim: false, clues: [{ id: 'c07-paula-seat', type: 'onObject', objectId: 'officeSeatA', text: 'Estaba sentada en una silla de oficina.' }, { id: 'c07-paula-office', type: 'zone', zoneId: 'offices', text: 'Estaba en los despachos.' }] },
  { id: 'marcos', name: 'Marcos', avatar: '👤', avatarImage: avatar(1), isVictim: false, clues: [{ id: 'c07-marcos-seat', type: 'onObject', objectId: 'archiveSeat', text: 'Estaba sentado en la silla del archivo.' }, { id: 'c07-marcos-filing', type: 'besideObject', objectId: 'filingCabinet', text: 'Estaba junto al archivador.' }] },
  { id: 'ernesto', name: 'Ernesto', avatar: '👤', avatarImage: avatar(2), isVictim: false, clues: [{ id: 'c07-ernesto-seat', type: 'onObject', objectId: 'officeSeatC', text: 'Estaba sentado en una silla.' }, { id: 'c07-ernesto-desk', type: 'besideObject', objectId: 'desk', text: 'Estaba junto al escritorio.' }] },
  { id: 'noelia', name: 'Noelia', avatar: '👤', avatarImage: avatar(3), isVictim: false, clues: [{ id: 'c07-noelia-seat', type: 'onObject', objectId: 'meetingSeatA', text: 'Estaba sentada en la sala de reuniones.' }, { id: 'c07-noelia-meeting', type: 'zone', zoneId: 'meeting', text: 'Estaba en la sala de reuniones.' }] },
  { id: 'bruno', name: 'Bruno', avatar: '👤', avatarImage: avatar(4), isVictim: false, clues: [{ id: 'c07-bruno-seat', type: 'onObject', objectId: 'meetingSeatB', text: 'Estaba sentado junto a la mesa de reuniones.' }, { id: 'c07-bruno-printer', type: 'besideObject', objectId: 'printer', text: 'Estaba junto a la impresora.' }] },
  { id: 'julia', name: 'Julia', avatar: '👤', avatarImage: avatar(5), isVictim: true, clues: [] },
]
const solution: Placement[] = [{ characterId: 'paula', position: { row: 1, column: 3 } }, { characterId: 'marcos', position: { row: 4, column: 1 } }, { characterId: 'ernesto', position: { row: 2, column: 6 } }, { characterId: 'noelia', position: { row: 3, column: 4 } }, { characterId: 'bruno', position: { row: 5, column: 5 } }, { characterId: 'julia', position: { row: 6, column: 2 } }]
export const case007: GameCase = { id: 'case007', title: 'Horas extra', intro: 'Julia murió en una oficina vacía tras la jornada. Reconstruye el plano y descubre quién se quedó a solas con ella en el archivo.', difficulty: 1, rows: 6, columns: 6, zones: [{ id: 'reception', name: 'Recepción', tone: 'cafe', surface: 'tile', labelAnchor: { position: { row: 2, column: 1 } } }, { id: 'offices', name: 'Despachos', tone: 'kitchen', surface: 'wood', labelAnchor: { position: { row: 1, column: 4 } } }, { id: 'archive', name: 'Archivo', tone: 'storage', surface: 'concrete', labelAnchor: { position: { row: 5, column: 1 } } }, { id: 'meeting', name: 'Sala de reuniones', tone: 'bathroom', surface: 'carpet', labelAnchor: { position: { row: 6, column: 4 } } }], board, characters, solution }
