import type { BoardCell, Character, GameCase, Placement } from '../../game/types'
import { avatarCatalog } from '../../game/characters/avatarCatalog'
import { isObjectPositionOccupiable } from '../../game/objects/footprints'
import sofaIcon from '../../assets/objects/contextual/sofa.png'
import bookshelfIcon from '../../assets/scenarios/office/objects/bookshelf.png'
import plantIcon from '../../assets/scenarios/house/objects/house_plant.png'
import sideTableIcon from '../../assets/scenarios/hotel/objects/side_table.png'
import lampIcon from '../../assets/scenarios/hotel/objects/table_lamp.png'

const zones = [
  { id: 'vestibule', name: 'Vestíbulo', tone: 'cafe', surface: 'wood' as const, labelAnchor: { position: { row: 1, column: 4 }, placement: 'top' as const } },
  { id: 'lounge', name: 'Salón', tone: 'storage', surface: 'carpet' as const, labelAnchor: { position: { row: 4, column: 2 }, placement: 'bottom' as const } },
  { id: 'study', name: 'Estudio', tone: 'kitchen', surface: 'concrete' as const, labelAnchor: { position: { row: 2, column: 4 }, placement: 'top' as const } },
  { id: 'rooms', name: 'Dormitorios', tone: 'bathroom', surface: 'tile' as const, labelAnchor: { position: { row: 6, column: 3 }, placement: 'bottom' as const } },
]

const sofaFootprint = { id: 'case003-lounge-sofa', positions: [{ row: 2, column: 1 }, { row: 2, column: 2 }] }
const objects = {
  sofa: { id: 'sofa', label: 'un sofá', icon: sofaIcon, occupiable: true, appearance: 'sofa' as const, visualProfile: 'wide' as const, footprint: sofaFootprint, occupiablePositions: [{ row: 2, column: 1 }] },
  plant: { id: 'plant', label: 'una planta', icon: plantIcon, occupiable: false, visualProfile: 'standard' as const },
  bookshelf: { id: 'bookshelf', label: 'una estantería', icon: bookshelfIcon, occupiable: false, visualProfile: 'tall' as const },
  sideTable: { id: 'sideTable', label: 'una mesa auxiliar', icon: sideTableIcon, occupiable: false, visualProfile: 'compact' as const },
  lamp: { id: 'lamp', label: 'una lámpara', icon: lampIcon, occupiable: false, visualProfile: 'compact' as const },
}

const zoneAt = (row: number, column: number) => row === 1 ? 'vestibule' : row <= 4 ? (column <= 3 ? 'lounge' : 'study') : 'rooms'
const objectAt: Record<string, keyof typeof objects> = { '1-3': 'plant', '2-1': 'sofa', '2-2': 'sofa', '4-5': 'bookshelf', '5-5': 'sideTable', '6-4': 'lamp' }
const board: BoardCell[] = Array.from({ length: 6 }, (_, rowIndex) => Array.from({ length: 6 }, (_, columnIndex) => {
  const row = rowIndex + 1, column = columnIndex + 1, objectKey = objectAt[`${row}-${column}`], object = objectKey ? objects[objectKey] : undefined
  return { row, column, zoneId: zoneAt(row, column), occupiable: object ? isObjectPositionOccupiable(object, { row, column }) : true, ...(object ? { object } : {}) }
})).flat()

const avatar = (id: string) => avatarCatalog.find(item => item.id === id)!.image
const characters: Character[] = [
  { id: 'elisa', name: 'Elisa', avatar: '👤', avatarImage: avatar('avatar_14'), isVictim: false, clues: [{ id: 'elisa-row', type: 'row', row: 1, text: 'Estaba en la primera fila.' }, { id: 'elisa-plant', type: 'besideObject', objectId: 'plant', text: 'Estaba junto a una planta.' }] },
  { id: 'tomas', name: 'Tomás', avatar: '👤', avatarImage: avatar('avatar_15'), isVictim: false, clues: [{ id: 'tomas-sofa', type: 'onObject', objectId: 'sofa', text: 'Estaba sentado en el sofá.' }] },
  { id: 'bruno', name: 'Bruno', avatar: '👤', avatarImage: avatar('avatar_16'), isVictim: false, clues: [{ id: 'bruno-study', type: 'zone', zoneId: 'study', text: 'Estaba en el estudio.' }, { id: 'bruno-bookshelf', type: 'relativeToObject', objectId: 'bookshelf', direction: 'northEast', zoneRelation: 'same', text: 'Estaba al noreste de la estantería.' }] },
  { id: 'marta', name: 'Marta', avatar: '👤', avatarImage: avatar('avatar_17'), isVictim: false, clues: [{ id: 'marta-rooms', type: 'zone', zoneId: 'rooms', text: 'Estaba en los dormitorios.' }, { id: 'marta-lamp', type: 'sameColumnAsObject', objectId: 'lamp', zoneRelation: 'same', text: 'Estaba en la misma columna que la lámpara.' }] },
  { id: 'raul', name: 'Raúl', avatar: '👤', avatarImage: avatar('avatar_18'), isVictim: false, clues: [{ id: 'raul-rooms', type: 'zone', zoneId: 'rooms', text: 'Estaba en los dormitorios.' }, { id: 'raul-side-table', type: 'sameColumnAsObject', objectId: 'sideTable', zoneRelation: 'same', text: 'Estaba en la misma columna que la mesa auxiliar.' }] },
  { id: 'eva', name: 'Eva', avatar: '👤', avatarImage: avatar('avatar_19'), isVictim: true, clues: [] },
]

const solution: Placement[] = [
  { characterId: 'elisa', position: { row: 1, column: 2 } },
  { characterId: 'tomas', position: { row: 2, column: 1 } },
  { characterId: 'bruno', position: { row: 3, column: 6 } },
  { characterId: 'eva', position: { row: 4, column: 3 } },
  { characterId: 'marta', position: { row: 5, column: 4 } },
  { characterId: 'raul', position: { row: 6, column: 5 } },
]

export const case003: GameCase = {
  id: 'case003',
  title: 'El salón en silencio',
  intro: 'Al amanecer, Eva fue encontrada sin vida en el salón de una pequeña casa de huéspedes. Cinco personas seguían allí. Reconstruye dónde estaba cada una y descubre quién se quedó a solas con la víctima.',
  difficulty: 1,
  rows: 6,
  columns: 6,
  zones,
  edgeFeatures: [{
    id: 'case003-vestibule-entrance',
    type: 'door',
    label: 'Puerta de entrada',
    segments: [{ position: { row: 1, column: 5 }, side: 'N' }],
  }],
  board,
  characters,
  solution,
}
