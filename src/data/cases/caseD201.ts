import type { Character, GameCase, Placement } from '../../game/types'
import { avatarCatalog } from '../../game/characters/avatarCatalog'
import { contextualObject, createManualBoard } from './manualCaseHelpers'

const conveyor = contextualObject('baggageConveyor', 'baggageConveyor', false, [{ row: 1, column: 1 }, { row: 1, column: 2 }])
const scanner = contextualObject('securityScanner', 'securityScanner', false)
const kiosk = contextualObject('checkinKiosk', 'checkinKiosk', false)
const bench = contextualObject('departureBench', 'departureBench', true, [{ row: 3, column: 2 }, { row: 3, column: 3 }], [{ row: 3, column: 2 }, { row: 3, column: 3 }])
const drone = contextualObject('luggageDrone', 'luggageDrone', false)

const zoneAt = (row: number, column: number) => {
  if (row <= 2) return column <= 3 ? 'checkin' : 'security'
  if (row <= 5) return column <= 4 ? 'departureLounge' : 'baggageClaim'
  return 'arrivals'
}

const board = createManualBoard(zoneAt, {
  '1:1': conveyor,
  '1:2': conveyor,
  '1:5': scanner,
  '2:3': kiosk,
  '3:2': bench,
  '3:3': bench,
  '4:7': drone,
}, 7, 7)

const avatar = (index: number) => avatarCatalog[index + 17].image

const characters: Character[] = [
  { id: 'lina', name: 'Lina', avatar: '👤', avatarImage: avatar(0), isVictim: false, clues: [{ id: 'd2c01-lina-column', type: 'column', column: 6, text: 'Estaba en la sexta columna.' }, { id: 'd2c01-lina-oscar-north', type: 'northOfCharacter', targetCharacterId: 'oscar', text: 'Estaba al norte de Óscar.' }] },
  { id: 'oscar', name: 'Óscar', avatar: '👤', avatarImage: avatar(1), isVictim: false, clues: [{ id: 'd2c01-oscar-checkin', type: 'zone', zoneId: 'checkin', text: 'Estaba en facturación.' }, { id: 'd2c01-oscar-conveyor', type: 'besideObject', objectId: 'baggageConveyor', text: 'Estaba junto a la cinta de equipajes.' }] },
  { id: 'nerea', name: 'Nerea', avatar: '👤', avatarImage: avatar(2), isVictim: false, clues: [{ id: 'd2c01-nerea-bench', type: 'onObject', objectId: 'departureBench', text: 'Estaba sentada en el banco de salidas.' }] },
  { id: 'tomas', name: 'Tomás', avatar: '👤', avatarImage: avatar(3), isVictim: false, clues: [{ id: 'd2c01-tomas-row', type: 'row', row: 4, text: 'Estaba en la cuarta fila.' }, { id: 'd2c01-tomas-baggage', type: 'zone', zoneId: 'baggageClaim', text: 'Estaba en recogida de equipajes.' }] },
  { id: 'gael', name: 'Gael', avatar: '👤', avatarImage: avatar(4), isVictim: false, clues: [{ id: 'd2c01-gael-baggage', type: 'zone', zoneId: 'baggageClaim', text: 'Estaba en recogida de equipajes.' }, { id: 'd2c01-gael-drone', type: 'besideObject', objectId: 'luggageDrone', text: 'Estaba junto al dron portaequipajes.' }] },
  { id: 'irene', name: 'Irene', avatar: '👤', avatarImage: avatar(5), isVictim: false, clues: [{ id: 'd2c01-irene-column', type: 'column', column: 1, text: 'Estaba en la primera columna.' }, { id: 'd2c01-irene-alma-north', type: 'northOfCharacter', targetCharacterId: 'alma', text: 'Estaba al norte de Alma.' }] },
  { id: 'alma', name: 'Alma', avatar: '👤', avatarImage: avatar(6), isVictim: true, clues: [] },
]

const solution: Placement[] = [
  { characterId: 'lina', position: { row: 1, column: 6 } },
  { characterId: 'oscar', position: { row: 2, column: 2 } },
  { characterId: 'nerea', position: { row: 3, column: 3 } },
  { characterId: 'tomas', position: { row: 4, column: 5 } },
  { characterId: 'gael', position: { row: 5, column: 7 } },
  { characterId: 'irene', position: { row: 6, column: 1 } },
  { characterId: 'alma', position: { row: 7, column: 4 } },
]

export const caseD201: GameCase = {
  id: 'case-d2-01',
  title: 'Última escala orbital',
  intro: 'Alma fue encontrada sin vida en la terminal orbital después del último embarque. Reconstruye la escena y descubre quién se quedó a solas con ella.',
  difficulty: 2,
  rows: 7,
  columns: 7,
  zones: [
    { id: 'checkin', name: 'Facturación', tone: 'industrial', surface: 'concrete', labelAnchor: { position: { row: 2, column: 1 } } },
    { id: 'security', name: 'Control de seguridad', tone: 'kitchen', surface: 'industrial', labelAnchor: { position: { row: 2, column: 5 } } },
    { id: 'departureLounge', name: 'Sala de embarque', tone: 'cafe', surface: 'carpet', labelAnchor: { position: { row: 4, column: 4 } } },
    { id: 'baggageClaim', name: 'Recogida de equipajes', tone: 'storage', surface: 'concrete', labelAnchor: { position: { row: 3, column: 7 } } },
    { id: 'arrivals', name: 'Llegadas', tone: 'bathroom', surface: 'tile', labelAnchor: { position: { row: 7, column: 7 } } },
  ],
  board,
  characters,
  solution,
}
