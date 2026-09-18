import type { Character, GameCase, Placement } from '../../game/types'
import { avatarCatalog } from '../../game/characters/avatarCatalog'
import { contextualObject, createManualBoard } from './manualCaseHelpers'

const gymBench = contextualObject(
  'gymBench',
  'gymBench',
  true,
  [{ row: 1, column: 3 }, { row: 1, column: 4 }],
  [{ row: 1, column: 3 }],
)
const treadmill = contextualObject('treadmill', 'treadmill', false)
const dumbbells = contextualObject('dumbbells', 'dumbbells', false)
const lockerBank = contextualObject('lockerBank', 'lockerBank', false)
const machineSeat = contextualObject('machineSeat', 'diningChair', true)
const weightsSeat = contextualObject('weightsSeat', 'diningChair', true)
const storageStool = contextualObject('storageStool', 'stool', true)
const receptionSeat = contextualObject('receptionSeat', 'officeChair', true)

const zoneAt = (row: number, column: number): string => {
  if (row <= 2 && column <= 2) return 'reception'
  if (row <= 2 || (row <= 4 && column >= 5) || (row >= 5 && column >= 3)) return 'machines'
  if (row <= 4 && column <= 2) return 'lockers'
  if (row <= 4 && column <= 4) return 'weights'
  return 'storage'
}

const board = createManualBoard(zoneAt, {
  '1:3': gymBench,
  '1:4': gymBench,
  '2:6': machineSeat,
  '3:1': lockerBank,
  '3:4': weightsSeat,
  '3:5': treadmill,
  '4:4': dumbbells,
  '4:5': receptionSeat,
  '5:2': storageStool,
})

const avatar = (index: number) => avatarCatalog[index + 12].image

const characters: Character[] = [
  {
    id: 'violeta',
    name: 'Violeta',
    avatar: '👤',
    avatarImage: avatar(0),
    isVictim: false,
    clues: [
      { id: 'c13-violeta-bench', type: 'onObject', objectId: 'gymBench', text: 'Estaba sentada en el banco de gimnasio.' },
    ],
  },
  {
    id: 'dario',
    name: 'Darío',
    avatar: '👤',
    avatarImage: avatar(1),
    isVictim: false,
    clues: [
      { id: 'c13-dario-stool', type: 'onObject', objectId: 'storageStool', text: 'Estaba sentado en el taburete del almacén.' },
    ],
  },
  {
    id: 'pedro',
    name: 'Pedro',
    avatar: '👤',
    avatarImage: avatar(2),
    isVictim: false,
    clues: [
      { id: 'c13-pedro-seat', type: 'onObject', objectId: 'machineSeat', text: 'Estaba sentado junto a las máquinas.' },
      { id: 'c13-pedro-north', type: 'northOfCharacter', targetCharacterId: 'alex', text: 'Estaba al norte de Álex.' },
    ],
  },
  {
    id: 'lara',
    name: 'Lara',
    avatar: '👤',
    avatarImage: avatar(3),
    isVictim: false,
    clues: [
      { id: 'c13-lara-dumbbells', type: 'besideObject', objectId: 'dumbbells', text: 'Estaba junto a las mancuernas.' },
    ],
  },
  {
    id: 'alex',
    name: 'Álex',
    avatar: '👤',
    avatarImage: avatar(4),
    isVictim: false,
    clues: [
      { id: 'c13-alex-treadmill', type: 'besideObject', objectId: 'treadmill', text: 'Estaba junto a la cinta de correr.' },
      { id: 'c13-alex-machines', type: 'zone', zoneId: 'machines', text: 'Estaba en la sala de máquinas.' },
    ],
  },
  { id: 'ines', name: 'Inés', avatar: '👤', avatarImage: avatar(5), isVictim: true, clues: [] },
]

const solution: Placement[] = [
  { characterId: 'violeta', position: { row: 1, column: 3 } },
  { characterId: 'pedro', position: { row: 2, column: 6 } },
  { characterId: 'lara', position: { row: 3, column: 4 } },
  { characterId: 'alex', position: { row: 4, column: 5 } },
  { characterId: 'dario', position: { row: 5, column: 2 } },
  { characterId: 'ines', position: { row: 6, column: 1 } },
]

export const case013: GameCase = {
  id: 'case013',
  title: 'Vestuario vacío',
  intro: 'Inés fue encontrada sin vida tras el cierre del gimnasio. Reconstruye dónde se encontraba cada persona para descubrir quién se quedó a solas con ella.',
  difficulty: 1,
  rows: 6,
  columns: 6,
  zones: [
    { id: 'reception', name: 'Recepción', tone: 'cafe', surface: 'tile', labelAnchor: { position: { row: 1, column: 1 } } },
    { id: 'machines', name: 'Sala de máquinas', tone: 'kitchen', surface: 'concrete', labelAnchor: { position: { row: 1, column: 6 } } },
    { id: 'lockers', name: 'Vestuarios', tone: 'bathroom', surface: 'tile', labelAnchor: { position: { row: 4, column: 1 } } },
    { id: 'weights', name: 'Peso libre', tone: 'storage', surface: 'wood', labelAnchor: { position: { row: 4, column: 3 } } },
    { id: 'storage', name: 'Almacén', tone: 'storage', surface: 'concrete', labelAnchor: { position: { row: 5, column: 1 } } },
  ],
  board,
  characters,
  solution,
}
