import type { Character, GameCase, Placement } from '../../game/types'
import { avatarCatalog } from '../../game/characters/avatarCatalog'
import { contextualObject, createManualBoard } from './manualCaseHelpers'

const piano = contextualObject(
  'piano',
  'piano',
  true,
  [{ row: 1, column: 2 }, { row: 1, column: 3 }],
  [{ row: 1, column: 2 }],
)
const dressingTable = contextualObject(
  'dressingTable',
  'dressingTable',
  false,
  [{ row: 5, column: 5 }, { row: 5, column: 6 }],
)
const cinemaSeats = contextualObject(
  'cinemaSeats',
  'cinemaSeatRow',
  true,
  [{ row: 3, column: 5 }, { row: 3, column: 6 }],
  [{ row: 3, column: 6 }],
)
const stageSpotlight = contextualObject('stageSpotlight', 'stageSpotlight', false)
const coatRack = contextualObject('coatRack', 'coatRack', false)
const storageStool = contextualObject('storageStool', 'stool', true)
const dressingSeat = contextualObject('dressingSeat', 'diningChair', true)
const costumeSeat = contextualObject('costumeSeat', 'diningChair', true)

const zoneAt = (row: number, column: number): string => {
  if (row === 1 || row === 2 && column >= 2) return 'stage'
  if (column === 1 || row <= 4 && column <= 3) return 'storage'
  if (row <= 4) return 'auditorium'
  return 'dressingRoom'
}

const board = createManualBoard(zoneAt, {
  '1:2': piano,
  '1:3': piano,
  '2:1': storageStool,
  '2:2': stageSpotlight,
  '3:5': cinemaSeats,
  '3:6': cinemaSeats,
  '5:4': dressingSeat,
  '5:5': dressingTable,
  '5:6': dressingTable,
  '6:5': costumeSeat,
  '6:6': coatRack,
})

const avatar = (index: number) => avatarCatalog[(index + 2) % avatarCatalog.length].image

const characters: Character[] = [
  {
    id: 'irene',
    name: 'Irene',
    avatar: '👤',
    avatarImage: avatar(0),
    isVictim: false,
    clues: [
      { id: 'c15-irene-piano', type: 'onObject', objectId: 'piano', text: 'Estaba sentada al piano.' },
    ],
  },
  {
    id: 'mateo',
    name: 'Mateo',
    avatar: '👤',
    avatarImage: avatar(1),
    isVictim: false,
    clues: [
      { id: 'c15-mateo-stool', type: 'onObject', objectId: 'storageStool', text: 'Estaba sentado en el taburete del almacén.' },
    ],
  },
  {
    id: 'nadia',
    name: 'Nadia',
    avatar: '👤',
    avatarImage: avatar(2),
    isVictim: false,
    clues: [
      { id: 'c15-nadia-seat', type: 'onObject', objectId: 'cinemaSeats', text: 'Estaba sentada en el patio de butacas.' },
    ],
  },
  {
    id: 'oliver',
    name: 'Óliver',
    avatar: '👤',
    avatarImage: avatar(3),
    isVictim: false,
    clues: [
      { id: 'c15-oliver-seat', type: 'onObject', objectId: 'dressingSeat', text: 'Estaba sentado en el camerino.' },
    ],
  },
  {
    id: 'rocio',
    name: 'Rocío',
    avatar: '👤',
    avatarImage: avatar(4),
    isVictim: false,
    clues: [
      { id: 'c15-rocio-rack', type: 'besideObject', objectId: 'coatRack', text: 'Estaba junto al perchero.' },
    ],
  },
  { id: 'clara', name: 'Clara', avatar: '👤', avatarImage: avatar(5), isVictim: true, clues: [] },
]

const solution: Placement[] = [
  { characterId: 'irene', position: { row: 1, column: 2 } },
  { characterId: 'mateo', position: { row: 2, column: 1 } },
  { characterId: 'nadia', position: { row: 3, column: 6 } },
  { characterId: 'clara', position: { row: 4, column: 3 } },
  { characterId: 'oliver', position: { row: 5, column: 4 } },
  { characterId: 'rocio', position: { row: 6, column: 5 } },
]

export const case015: GameCase = {
  id: 'case015',
  title: 'Ensayo general',
  intro: 'Clara fue encontrada sin vida al terminar el ensayo. Reconstruye el último reparto de posiciones y descubre quién se quedó a solas con ella.',
  difficulty: 1,
  rows: 6,
  columns: 6,
  zones: [
    { id: 'stage', name: 'Escenario', tone: 'cafe', surface: 'wood', labelAnchor: { position: { row: 1, column: 6 } } },
    { id: 'storage', name: 'Almacén', tone: 'storage', surface: 'concrete', labelAnchor: { position: { row: 3, column: 2 } } },
    { id: 'auditorium', name: 'Patio de butacas', tone: 'bathroom', surface: 'carpet', labelAnchor: { position: { row: 4, column: 5 } } },
    { id: 'dressingRoom', name: 'Camerinos', tone: 'kitchen', surface: 'tile', labelAnchor: { position: { row: 6, column: 2 } } },
  ],
  edgeFeatures: [
    {
      id: 'stage-curtain',
      type: 'door',
      label: 'Cortina de escenario',
      segments: [
        { position: { row: 1, column: 4 }, side: 'N' },
        { position: { row: 1, column: 5 }, side: 'N' },
      ],
    },
  ],
  board,
  characters,
  solution,
}
