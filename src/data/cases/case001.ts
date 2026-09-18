import type { BoardCell, Character, GameCase, Placement } from '../../game/types'
import { avatarCatalog } from '../../game/characters/avatarCatalog'
import cafeIcon from '../../assets/scenarios/cafeteria/zones/cafe.png'
import kitchenIcon from '../../assets/scenarios/cafeteria/zones/kitchen.png'
import storageIcon from '../../assets/scenarios/cafeteria/zones/storage.png'
import bathroomIcon from '../../assets/scenarios/cafeteria/zones/bathroom.png'
import plantIcon from '../../assets/scenarios/cafeteria/objects/plant.png'
import chairIcon from '../../assets/scenarios/cafeteria/objects/chair.png'
import tableIcon from '../../assets/scenarios/cafeteria/objects/table.png'
import registerIcon from '../../assets/scenarios/cafeteria/objects/register.png'
import crateIcon from '../../assets/scenarios/cafeteria/objects/crate.png'
import puddleIcon from '../../assets/scenarios/cafeteria/objects/puddle.png'

const zones = [
  { id: 'cafe', name: 'Cafetería', tone: 'cafe', icon: cafeIcon, labelAnchor: { position: { row: 3, column: 1 } } },
  { id: 'kitchen', name: 'Cocina', tone: 'kitchen', icon: kitchenIcon, labelAnchor: { position: { row: 1, column: 6 } } },
  { id: 'storage', name: 'Almacén', tone: 'storage', icon: storageIcon, labelAnchor: { position: { row: 5, column: 3 } } },
  { id: 'bathroom', name: 'Baño', tone: 'bathroom', icon: bathroomIcon, labelAnchor: { position: { row: 4, column: 6 } } },
]
const objects = { plant: { id: 'plant', label: 'una planta', icon: plantIcon, occupiable: false }, chair: { id: 'chair', label: 'una silla', icon: chairIcon, occupiable: true }, register: { id: 'register', label: 'una caja registradora', icon: registerIcon, occupiable: false }, table: { id: 'table', label: 'una mesa', icon: tableIcon, occupiable: false }, crate: { id: 'crate', label: 'una caja', icon: crateIcon, occupiable: false }, puddle: { id: 'puddle', label: 'un charco', icon: puddleIcon, occupiable: true } }
const zoneAt = (row: number, column: number) => row <= 3 ? (column <= 3 ? 'cafe' : 'kitchen') : (column <= 3 ? 'storage' : 'bathroom')
const objectsAt: Record<string, keyof typeof objects> = { '1-2': 'plant', '1-3': 'chair', '2-5': 'register', '2-2': 'table', '4-2': 'crate', '5-4': 'puddle' }
const board: BoardCell[] = Array.from({ length: 6 }, (_, rowIndex) => Array.from({ length: 6 }, (_, columnIndex) => { const row = rowIndex + 1, column = columnIndex + 1, objectKey = objectsAt[`${row}-${column}`]; return { row, column, zoneId: zoneAt(row, column), occupiable: objectKey ? objects[objectKey].occupiable : true, ...(objectKey ? { object: objects[objectKey] } : {}) } })).flat()
const legacyAvatarImages: Record<string, string> = {
  lucia: avatarCatalog.find(avatar => avatar.id === 'avatar_01')!.image,
  mateo: avatarCatalog.find(avatar => avatar.id === 'avatar_02')!.image,
  nora: avatarCatalog.find(avatar => avatar.id === 'avatar_03')!.image,
  bruno: avatarCatalog.find(avatar => avatar.id === 'avatar_04')!.image,
  ines: avatarCatalog.find(avatar => avatar.id === 'avatar_05')!.image,
  alma: avatarCatalog.find(avatar => avatar.id === 'avatar_07')!.image,
}
const baseCharacters: Character[] = [
  { id: 'lucia', name: 'Lucía', avatar: '🦊', isVictim: false, clues: [{ id: 'lucia-row', type: 'row', text: 'Estaba en la primera fila.', row: 1 }, { id: 'lucia-chair', type: 'onObject', text: 'Estaba sentada en una silla.', objectId: 'chair' }] },
  { id: 'mateo', name: 'Mateo', avatar: '🦉', isVictim: false, clues: [{ id: 'mateo-row', type: 'row', text: 'Estaba en la segunda fila.', row: 2 }, { id: 'mateo-register', type: 'besideObject', text: 'Estaba junto a la caja registradora.', objectId: 'register' }] },
  { id: 'nora', name: 'Nora', avatar: '🐈', isVictim: false, clues: [{ id: 'nora-row', type: 'row', text: 'Estaba en la tercera fila.', row: 3 }, { id: 'nora-column', type: 'column', text: 'Estaba en la sexta columna.', column: 6 }] },
  { id: 'bruno', name: 'Bruno', avatar: '🦬', isVictim: false, clues: [{ id: 'bruno-zone', type: 'zone', text: 'Estaba en el almacén.', zoneId: 'storage' }, { id: 'bruno-row', type: 'row', text: 'Estaba en la cuarta fila.', row: 4 }] },
  { id: 'ines', name: 'Inés', avatar: '🦋', isVictim: false, clues: [{ id: 'ines-zone', type: 'zone', text: 'Estaba en el baño.', zoneId: 'bathroom' }, { id: 'ines-column', type: 'column', text: 'Estaba en la quinta columna.', column: 5 }, { id: 'ines-row', type: 'row', text: 'Estaba en la quinta fila.', row: 5 }] },
  { id: 'alma', name: 'Alma', avatar: '🌙', isVictim: true, clues: [] },
]
const characters: Character[] = baseCharacters.map(character => ({ ...character, avatarImage: legacyAvatarImages[character.id] }))
const solution: Placement[] = [{ characterId: 'lucia', position: { row: 1, column: 3 } }, { characterId: 'mateo', position: { row: 2, column: 4 } }, { characterId: 'nora', position: { row: 3, column: 6 } }, { characterId: 'bruno', position: { row: 4, column: 1 } }, { characterId: 'ines', position: { row: 5, column: 5 } }, { characterId: 'alma', position: { row: 6, column: 2 } }]
export const case001: GameCase = { id: 'case001', title: 'La última taza', intro: 'Tras el cierre de la cafetería, Alma fue encontrada muerta en el local. Cinco personas estuvieron allí aquella noche. Reconstruye dónde se encontraba cada una y descubre quién se quedó a solas con la víctima.', difficulty: 1, rows: 6, columns: 6, zones, board, characters, solution }
