import type { Character, GameCase, Placement } from '../../game/types'
import { avatarCatalog } from '../../game/characters/avatarCatalog'
import { contextualObject, createManualBoard } from './manualCaseHelpers'

const freightConsole = contextualObject('freightConsole', 'freightConsole', false)
const magneticPallet = contextualObject('magneticPallet', 'magneticPallet', false, [{ row: 1, column: 6 }, { row: 1, column: 7 }])
const cargoLoader = contextualObject('cargoLoader', 'cargoLoader', false, [{ row: 3, column: 2 }, { row: 3, column: 3 }])
const maintenanceUnit = contextualObject('maintenanceUnit', 'maintenanceUnit', false)
const sealedContainer = contextualObject('sealedContainer', 'sealedContainer', false)

const zoneAt = (row: number, column: number) => {
  if (row <= 2) return column <= 3 ? 'control' : 'dock'
  if (row <= 5 && column <= 4) return 'cargoHold'
  if (row <= 4) return 'workshop'
  return column >= 5 ? 'cryogenics' : 'airlock'
}

const board = createManualBoard(zoneAt, {
  '1:1': freightConsole,
  '1:6': magneticPallet,
  '1:7': magneticPallet,
  '3:2': cargoLoader,
  '3:3': cargoLoader,
  '3:5': maintenanceUnit,
  '5:7': sealedContainer,
}, 7, 7)

const avatar = (index: number) => avatarCatalog[index].image

const characters: Character[] = [
  { id: 'sara', name: 'Sara', avatar: avatar(0), avatarImage: avatar(0), isVictim: false, clues: [{ id: 'd2c03-sara-dock', type: 'zone', zoneId: 'dock', text: 'Estaba en el muelle.' }, { id: 'd2c03-sara-pallet', type: 'besideObject', objectId: 'magneticPallet', text: 'Estaba junto a la plataforma de contenedores.' }] },
  { id: 'bruno', name: 'Bruno', avatar: avatar(1), avatarImage: avatar(1), isVictim: false, clues: [{ id: 'd2c03-bruno-column', type: 'column', column: 2, text: 'Estaba en la segunda columna.' }, { id: 'd2c03-bruno-console', type: 'relativeToObject', objectId: 'freightConsole', direction: 'southEast', zoneRelation: 'same', text: 'Estaba al sureste de la consola de control.' }] },
  { id: 'leire', name: 'Leire', avatar: avatar(2), avatarImage: avatar(2), isVictim: false, clues: [{ id: 'd2c03-leire-workshop', type: 'zone', zoneId: 'workshop', text: 'Estaba en el taller.' }, { id: 'd2c03-leire-column', type: 'column', column: 7, text: 'Estaba en la séptima columna.' }] },
  { id: 'marcos', name: 'Marcos', avatar: avatar(3), avatarImage: avatar(3), isVictim: false, clues: [{ id: 'd2c03-marcos-row', type: 'row', row: 4, text: 'Estaba en la cuarta fila.' }, { id: 'd2c03-marcos-loader', type: 'relativeToObject', objectId: 'cargoLoader', direction: 'southEast', zoneRelation: 'same', text: 'Estaba al sureste de la carretilla elevadora.' }, { id: 'd2c03-marcos-wall', type: 'besideWall', text: 'Estaba junto a la pared del taller.' }] },
  { id: 'noa', name: 'Noa', avatar: avatar(4), avatarImage: avatar(4), isVictim: false, clues: [{ id: 'd2c03-noa-row', type: 'row', row: 5, text: 'Estaba en la quinta fila.' }, { id: 'd2c03-noa-container', type: 'besideObject', objectId: 'sealedContainer', text: 'Estaba junto a la caja metálica.' }] },
  { id: 'adrian', name: 'Adrián', avatar: avatar(5), avatarImage: avatar(5), isVictim: false, clues: [{ id: 'd2c03-adrian-row', type: 'row', row: 6, text: 'Estaba en la sexta fila.' }, { id: 'd2c03-adrian-column', type: 'column', column: 1, text: 'Estaba en la primera columna.' }] },
  { id: 'vega', name: 'Vega', avatar: avatar(6), avatarImage: avatar(6), isVictim: true, clues: [] },
]

const solution: Placement[] = [
  { characterId: 'sara', position: { row: 1, column: 5 } },
  { characterId: 'bruno', position: { row: 2, column: 2 } },
  { characterId: 'leire', position: { row: 3, column: 7 } },
  { characterId: 'marcos', position: { row: 4, column: 4 } },
  { characterId: 'noa', position: { row: 5, column: 6 } },
  { characterId: 'adrian', position: { row: 6, column: 1 } },
  { characterId: 'vega', position: { row: 7, column: 3 } },
]

export const caseD203: GameCase = {
  id: 'case-d2-03',
  title: 'Carga sin destinatario',
  intro: 'La nave carguera Argos llegó a la estación con una mercancía que no figuraba en ningún manifiesto. Al abrir la bodega, la tripulación encontró a Vega sin vida junto a la esclusa: alguien había borrado el registro de la carga y manipulado los controles de acceso.',
  difficulty: 2,
  rows: 7,
  columns: 7,
  zones: [
    { id: 'control', name: 'Control', tone: 'industrial', surface: 'concrete', labelAnchor: { position: { row: 1, column: 3 } } },
    { id: 'dock', name: 'Muelle', tone: 'kitchen', surface: 'industrial', labelAnchor: { position: { row: 2, column: 4 } } },
    { id: 'cargoHold', name: 'Bodega', tone: 'storage', surface: 'concrete', labelAnchor: { position: { row: 5, column: 1 } } },
    { id: 'workshop', name: 'Taller', tone: 'cafe', surface: 'industrial', labelAnchor: { position: { row: 4, column: 5 } } },
    { id: 'cryogenics', name: 'Criogenia', tone: 'bathroom', surface: 'tile', labelAnchor: { position: { row: 6, column: 5 } } },
    { id: 'airlock', name: 'Esclusa', tone: 'storage', surface: 'concrete', labelAnchor: { position: { row: 6, column: 2 } } },
  ],
  board,
  characters,
  solution,
}
