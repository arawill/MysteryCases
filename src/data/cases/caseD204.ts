import type { Character, GameCase, Placement } from '../../game/types'
import { avatarCatalog } from '../../game/characters/avatarCatalog'
import { contextualObject, createManualBoard } from './manualCaseHelpers'

const irrigationConsole = contextualObject('irrigationConsole', 'irrigationConsole', false, [{ row: 1, column: 1 }, { row: 1, column: 2 }])
const hydroponicBed = contextualObject('hydroponicBed', 'hydroponicBed', false, [{ row: 3, column: 2 }, { row: 3, column: 3 }])
const nutrientTank = contextualObject('nutrientTank', 'nutrientTank', false)
const growTower = contextualObject('growTower', 'growTower', false)
const harvestCart = contextualObject('harvestCart', 'harvestCart', false)

const zoneAt = (row: number, column: number) => {
  if (row <= 2) return column <= 3 ? 'irrigation' : 'nursery'
  if (row <= 4) return column <= 4 ? 'cultivation' : 'reservoir'
  return column <= 3 ? 'storage' : 'control'
}

const board = createManualBoard(zoneAt, {
  '1:1': irrigationConsole,
  '1:2': irrigationConsole,
  '3:2': hydroponicBed,
  '3:3': hydroponicBed,
  '3:7': nutrientTank,
  '4:2': growTower,
  '6:2': harvestCart,
}, 7, 7)

const avatar = (index: number) => avatarCatalog[index + 7].image

const characters: Character[] = [
  { id: 'elena', name: 'Elena', avatar: avatar(0), avatarImage: avatar(0), isVictim: false, clues: [{ id: 'd2c04-elena-nursery', type: 'zone', zoneId: 'nursery', text: 'Estaba en el vivero.' }, { id: 'd2c04-elena-column', type: 'column', column: 4, text: 'Estaba en la cuarta columna.' }] },
  { id: 'hugo', name: 'Hugo', avatar: avatar(1), avatarImage: avatar(1), isVictim: false, clues: [{ id: 'd2c04-hugo-row', type: 'row', row: 2, text: 'Estaba en la segunda fila.' }, { id: 'd2c04-hugo-console', type: 'relativeToObject', objectId: 'irrigationConsole', direction: 'southEast', zoneRelation: 'same', text: 'Estaba al sureste de la consola de riego.' }] },
  { id: 'aitana', name: 'Aitana', avatar: avatar(2), avatarImage: avatar(2), isVictim: false, clues: [{ id: 'd2c04-aitana-row', type: 'row', row: 3, text: 'Estaba en la tercera fila.' }, { id: 'd2c04-aitana-tank', type: 'besideObject', objectId: 'nutrientTank', text: 'Estaba junto al depósito de agua.' }] },
  { id: 'ruben', name: 'Rubén', avatar: avatar(3), avatarImage: avatar(3), isVictim: false, clues: [{ id: 'd2c04-ruben-row', type: 'row', row: 4, text: 'Estaba en la cuarta fila.' }, { id: 'd2c04-ruben-tower', type: 'besideObject', objectId: 'growTower', text: 'Estaba junto a la torre de cultivo.' }, { id: 'd2c04-ruben-corner', type: 'cornerOfZone', text: 'Estaba en una esquina del cultivo.' }] },
  { id: 'joel', name: 'Joel', avatar: avatar(4), avatarImage: avatar(4), isVictim: false, clues: [{ id: 'd2c04-joel-row', type: 'row', row: 5, text: 'Estaba en la quinta fila.' }, { id: 'd2c04-joel-column', type: 'column', column: 7, text: 'Estaba en la séptima columna.' }] },
  { id: 'marta', name: 'Marta', avatar: avatar(5), avatarImage: avatar(5), isVictim: false, clues: [{ id: 'd2c04-marta-row', type: 'row', row: 6, text: 'Estaba en la sexta fila.' }, { id: 'd2c04-marta-cart', type: 'besideObject', objectId: 'harvestCart', text: 'Estaba junto al carro de cosecha.' }] },
  { id: 'iris', name: 'Iris', avatar: avatar(6), avatarImage: avatar(6), isVictim: true, clues: [] },
]

const solution: Placement[] = [
  { characterId: 'elena', position: { row: 1, column: 4 } },
  { characterId: 'hugo', position: { row: 2, column: 2 } },
  { characterId: 'aitana', position: { row: 3, column: 6 } },
  { characterId: 'ruben', position: { row: 4, column: 1 } },
  { characterId: 'joel', position: { row: 5, column: 7 } },
  { characterId: 'marta', position: { row: 6, column: 3 } },
  { characterId: 'iris', position: { row: 7, column: 5 } },
]

export const caseD204: GameCase = {
  id: 'case-d2-04',
  title: 'La cosecha de Marte',
  intro: 'La primera cosecha marciana estaba lista para enviarse a las colonias cuando el sistema de riego se detuvo y las reservas de semillas quedaron bloqueadas. Iris apareció sin vida en la sala de control: alguien había manipulado la instalación para ocultar un sabotaje.',
  difficulty: 2,
  rows: 7,
  columns: 7,
  zones: [
    { id: 'irrigation', name: 'Riego', tone: 'kitchen', surface: 'industrial', labelAnchor: { position: { row: 2, column: 1 } } },
    { id: 'nursery', name: 'Vivero', tone: 'cafe', surface: 'grass', labelAnchor: { position: { row: 2, column: 5 } } },
    { id: 'cultivation', name: 'Cultivo', tone: 'storage', surface: 'grass', labelAnchor: { position: { row: 3, column: 1 } } },
    { id: 'reservoir', name: 'Depósito', tone: 'bathroom', surface: 'tile', labelAnchor: { position: { row: 4, column: 5 } } },
    { id: 'storage', name: 'Almacén', tone: 'storage', surface: 'concrete', labelAnchor: { position: { row: 7, column: 2 } } },
    { id: 'control', name: 'Control', tone: 'industrial', surface: 'concrete', labelAnchor: { position: { row: 6, column: 5 } } },
  ],
  edgeFeatures: [{ id: 'd2c04-mars-window', type: 'window', label: 'Ventanal a Marte', segments: [{ position: { row: 1, column: 4 }, side: 'N' }, { position: { row: 1, column: 5 }, side: 'N' }, { position: { row: 1, column: 6 }, side: 'N' }, { position: { row: 1, column: 7 }, side: 'N' }] }],
  board,
  characters,
  solution,
}
