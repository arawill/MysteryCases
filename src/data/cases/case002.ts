import type { BoardCell, Character, GameCase, Placement } from '../../game/types'
import { avatarCatalog } from '../../game/characters/avatarCatalog'
import chairIcon from '../../assets/scenarios/cafeteria/objects/chair.png'
import crateIcon from '../../assets/scenarios/cafeteria/objects/crate.png'
import plantIcon from '../../assets/scenarios/cafeteria/objects/plant.png'
import tableIcon from '../../assets/scenarios/cafeteria/objects/table.png'

const zones = [{ id: 'gallery', name: 'Galería', tone: 'cafe', surface: 'wood' as const }, { id: 'workshop', name: 'Taller', tone: 'kitchen', surface: 'concrete' as const }, { id: 'archive', name: 'Archivo', tone: 'storage', surface: 'carpet' as const }, { id: 'patio', name: 'Patio', tone: 'bathroom', surface: 'tile' as const }]
const objects = { chair: { id: 'chair', label: 'una silla', icon: chairIcon, occupiable: true }, stool: { id: 'stool', label: 'un taburete', icon: chairIcon, occupiable: true }, crate: { id: 'crate', label: 'una caja', icon: crateIcon, occupiable: false }, plant: { id: 'plant', label: 'una planta', icon: plantIcon, occupiable: false }, table: { id: 'table', label: 'una mesa', icon: tableIcon, occupiable: false } }
const zoneAt = (row: number, column: number) => row <= 3 ? (column <= 3 ? 'gallery' : 'workshop') : (column <= 3 ? 'patio' : 'archive')
const objectAt: Record<string, keyof typeof objects> = { '1-2': 'chair', '2-5': 'stool', '3-5': 'plant', '4-1': 'chair', '5-4': 'chair', '6-1': 'crate', '6-5': 'table' }
const board: BoardCell[] = Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (_, c) => { const row = r + 1, column = c + 1, key = objectAt[`${row}-${column}`]; return { row, column, zoneId: zoneAt(row, column), occupiable: key ? objects[key].occupiable : true, ...(key ? { object: objects[key] } : {}) } })).flat()
const avatar = (id: string) => avatarCatalog.find(item => item.id === id)!.image
const characters: Character[] = [
  { id: 'vera', name: 'Vera', avatar: '👤', avatarImage: avatar('avatar_08'), isVictim: false, clues: [{ id: 'vera-chair', type: 'onObject', objectId: 'chair', text: 'Estaba sentada en una silla.' }, { id: 'vera-gallery', type: 'zone', zoneId: 'gallery', text: 'Estaba en la galería.' }] },
  { id: 'dario', name: 'Darío', avatar: '👤', avatarImage: avatar('avatar_09'), isVictim: false, clues: [{ id: 'dario-stool', type: 'onObject', objectId: 'stool', text: 'Estaba sentado en un taburete.' }, { id: 'dario-workshop', type: 'zone', zoneId: 'workshop', text: 'Estaba en el taller.' }] },
  { id: 'clara', name: 'Clara', avatar: '👤', avatarImage: avatar('avatar_10'), isVictim: false, clues: [{ id: 'clara-plant', type: 'besideObject', objectId: 'plant', text: 'Estaba junto a una planta.' }, { id: 'clara-workshop', type: 'zone', zoneId: 'workshop', text: 'Estaba en el taller.' }] },
  { id: 'tomas', name: 'Tomás', avatar: '👤', avatarImage: avatar('avatar_11'), isVictim: false, clues: [{ id: 'tomas-chair', type: 'onObject', objectId: 'chair', text: 'Estaba sentado en una silla.' }, { id: 'tomas-patio', type: 'zone', zoneId: 'patio', text: 'Estaba en el patio.' }] },
  { id: 'lidia', name: 'Lidia', avatar: '👤', avatarImage: avatar('avatar_12'), isVictim: false, clues: [{ id: 'lidia-chair', type: 'onObject', objectId: 'chair', text: 'Estaba sentada en una silla.' }, { id: 'lidia-archive', type: 'zone', zoneId: 'archive', text: 'Estaba en el archivo.' }] },
  { id: 'noa', name: 'Noa', avatar: '👤', avatarImage: avatar('avatar_13'), isVictim: true, clues: [] },
]
const solution: Placement[] = [{ characterId: 'vera', position: { row: 1, column: 2 } }, { characterId: 'dario', position: { row: 2, column: 5 } }, { characterId: 'clara', position: { row: 3, column: 6 } }, { characterId: 'tomas', position: { row: 4, column: 1 } }, { characterId: 'lidia', position: { row: 5, column: 4 } }, { characterId: 'noa', position: { row: 6, column: 3 } }]
export const case002: GameCase = { id: 'case002', title: 'El marco vacío', intro: 'Al cerrar la galería, Noa apareció sin vida junto al archivo. Reconstruye los últimos movimientos y descubre quién quedó a solas con ella.', difficulty: 1, rows: 6, columns: 6, zones, board, characters, solution }
