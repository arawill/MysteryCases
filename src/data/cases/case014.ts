import type { Character, GameCase, Placement } from '../../game/types'
import { avatarCatalog } from '../../game/characters/avatarCatalog'
import statueIcon from '../../assets/scenarios/hotel/objects/statue.png'
import { contextualObject, createManualBoard, legacyObject } from './manualCaseHelpers'

const displayCase = contextualObject(
  'displayCase',
  'displayCase',
  false,
  [{ row: 3, column: 4 }, { row: 3, column: 5 }],
)
const restorationTable = contextualObject(
  'restorationTable',
  'restorationTable',
  false,
  [{ row: 5, column: 5 }, { row: 5, column: 6 }],
)
const statue = legacyObject('statue', 'una estatua', statueIcon, false, 'tall')
const lobbySeat = contextualObject('lobbySeat', 'diningChair', true)
const storageStool = contextualObject('storageStool', 'stool', true)
const gallerySeat = contextualObject('gallerySeat', 'diningChair', true)
const restorationSeat = contextualObject('restorationSeat', 'diningChair', true)
const curatorSeat = contextualObject('curatorSeat', 'officeChair', true)

const zoneAt = (row: number, column: number): string => {
  if (row === 1 && column <= 3) return 'lobby'
  if (column <= 3) return 'storage'
  if (row >= 4) return 'restoration'
  return 'gallery'
}

const board = createManualBoard(zoneAt, {
  '1:2': lobbySeat,
  '2:1': storageStool,
  '3:4': displayCase,
  '3:5': displayCase,
  '3:6': gallerySeat,
  '5:4': restorationSeat,
  '5:5': restorationTable,
  '5:6': restorationTable,
  '6:5': curatorSeat,
  '6:6': statue,
})

const avatar = (index: number) => avatarCatalog[index + 18].image

const characters: Character[] = [
  {
    id: 'amelia',
    name: 'Amelia',
    avatar: '👤',
    avatarImage: avatar(0),
    isVictim: false,
    clues: [
      { id: 'c14-amelia-seat', type: 'onObject', objectId: 'lobbySeat', text: 'Estaba sentada en el vestíbulo.' },
      { id: 'c14-amelia-lobby', type: 'zone', zoneId: 'lobby', text: 'Estaba junto a la entrada del museo.' },
    ],
  },
  {
    id: 'hector',
    name: 'Héctor',
    avatar: '👤',
    avatarImage: avatar(1),
    isVictim: false,
    clues: [
      { id: 'c14-hector-stool', type: 'onObject', objectId: 'storageStool', text: 'Estaba sentado en el taburete del almacén.' },
    ],
  },
  {
    id: 'simon',
    name: 'Simón',
    avatar: '👤',
    avatarImage: avatar(2),
    isVictim: false,
    clues: [
      { id: 'c14-simon-display', type: 'besideObject', objectId: 'displayCase', text: 'Estaba junto a la vitrina.' },
    ],
  },
  {
    id: 'iria',
    name: 'Iria',
    avatar: '👤',
    avatarImage: avatar(3),
    isVictim: false,
    clues: [
      { id: 'c14-iria-table', type: 'besideObject', objectId: 'restorationTable', text: 'Estaba junto a la mesa de restauración.' },
    ],
  },
  {
    id: 'gael',
    name: 'Gael',
    avatar: '👤',
    avatarImage: avatar(4),
    isVictim: false,
    clues: [
      { id: 'c14-gael-statue', type: 'besideObject', objectId: 'statue', text: 'Estaba junto a la estatua.' },
    ],
  },
  { id: 'noa', name: 'Noa', avatar: '👤', avatarImage: avatar(5), isVictim: true, clues: [] },
]

const solution: Placement[] = [
  { characterId: 'amelia', position: { row: 1, column: 2 } },
  { characterId: 'hector', position: { row: 2, column: 1 } },
  { characterId: 'simon', position: { row: 3, column: 6 } },
  { characterId: 'noa', position: { row: 4, column: 3 } },
  { characterId: 'iria', position: { row: 5, column: 4 } },
  { characterId: 'gael', position: { row: 6, column: 5 } },
]

export const case014: GameCase = {
  id: 'case014',
  title: 'Después del cierre',
  intro: 'Noa fue encontrada sin vida al cerrar el museo. Reconstruye las posiciones de la galería y descubre quién se quedó a solas con ella.',
  difficulty: 1,
  rows: 6,
  columns: 6,
  zones: [
    { id: 'lobby', name: 'Vestíbulo', tone: 'cafe', surface: 'tile', labelAnchor: { position: { row: 1, column: 3 } } },
    { id: 'gallery', name: 'Galería', tone: 'kitchen', surface: 'wood', labelAnchor: { position: { row: 1, column: 6 } } },
    { id: 'storage', name: 'Almacén', tone: 'storage', surface: 'concrete', labelAnchor: { position: { row: 2, column: 2 } } },
    { id: 'restoration', name: 'Restauración', tone: 'bathroom', surface: 'tile', labelAnchor: { position: { row: 4, column: 4 } } },
  ],
  edgeFeatures: [
    { id: 'gallery-painting-north', type: 'window', label: 'Cuadro de la galería', segments: [{ position: { row: 1, column: 5 }, side: 'N' }] },
    { id: 'gallery-painting-east', type: 'window', label: 'Cuadro de la galería', segments: [{ position: { row: 2, column: 6 }, side: 'E' }] },
  ],
  board,
  characters,
  solution,
}
