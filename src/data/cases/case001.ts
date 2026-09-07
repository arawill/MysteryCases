import type { BoardCell, Character, GameCase, Placement } from '../../game/types'
import cafeIcon from '../../assets/zones/cafe.svg'
import kitchenIcon from '../../assets/zones/kitchen.svg'
import storageIcon from '../../assets/zones/storage.svg'
import bathroomIcon from '../../assets/zones/bathroom.svg'
import plantIcon from '../../assets/objects/plant.svg'
import chairIcon from '../../assets/objects/chair.svg'
import tableIcon from '../../assets/objects/table.svg'
import registerIcon from '../../assets/objects/register.svg'
import crateIcon from '../../assets/objects/crate.svg'
import puddleIcon from '../../assets/objects/puddle.svg'

const zones = [{ id: 'cafe', name: 'Cafetería', tone: 'cafe', icon: cafeIcon }, { id: 'kitchen', name: 'Cocina', tone: 'kitchen', icon: kitchenIcon }, { id: 'storage', name: 'Almacén', tone: 'storage', icon: storageIcon }, { id: 'bathroom', name: 'Baño', tone: 'bathroom', icon: bathroomIcon }]
const objects = { plant: { id: 'plant', label: 'una planta', icon: plantIcon, occupiable: false }, chair: { id: 'chair', label: 'una silla', icon: chairIcon, occupiable: true }, register: { id: 'register', label: 'una caja registradora', icon: registerIcon, occupiable: false }, table: { id: 'table', label: 'una mesa', icon: tableIcon, occupiable: false }, crate: { id: 'crate', label: 'una caja', icon: crateIcon, occupiable: false }, puddle: { id: 'puddle', label: 'un charco', icon: puddleIcon, occupiable: true } }
const zoneAt = (row: number, column: number) => row <= 3 ? (column <= 3 ? 'cafe' : 'kitchen') : (column <= 3 ? 'storage' : 'bathroom')
const objectsAt: Record<string, keyof typeof objects> = { '1-2': 'plant', '1-3': 'chair', '2-5': 'register', '2-2': 'table', '4-2': 'crate', '5-4': 'puddle' }
const board: BoardCell[] = Array.from({ length: 6 }, (_, rowIndex) => Array.from({ length: 6 }, (_, columnIndex) => { const row = rowIndex + 1, column = columnIndex + 1, objectKey = objectsAt[`${row}-${column}`]; return { row, column, zoneId: zoneAt(row, column), occupiable: objectKey ? objects[objectKey].occupiable : true, ...(objectKey ? { object: objects[objectKey] } : {}) } })).flat()
const characters: Character[] = [
  { id: 'lucia', name: 'Lucía', avatar: '🦊', isVictim: false, clues: [{ id: 'lucia-row', type: 'row', text: 'Estaba en la primera fila.', row: 1 }, { id: 'lucia-chair', type: 'onObject', text: 'Estaba sentada en una silla.', objectId: 'chair' }] },
  { id: 'mateo', name: 'Mateo', avatar: '🦉', isVictim: false, clues: [{ id: 'mateo-row', type: 'row', text: 'Estaba en la segunda fila.', row: 2 }, { id: 'mateo-register', type: 'besideObject', text: 'Estaba junto a la caja registradora.', objectId: 'register' }] },
  { id: 'nora', name: 'Nora', avatar: '🐈', isVictim: false, clues: [{ id: 'nora-row', type: 'row', text: 'Estaba en la tercera fila.', row: 3 }, { id: 'nora-column', type: 'column', text: 'Ocupaba la sexta columna.', column: 6 }] },
  { id: 'bruno', name: 'Bruno', avatar: '🦬', isVictim: false, clues: [{ id: 'bruno-zone', type: 'zone', text: 'Estaba en el almacén.', zoneId: 'storage' }, { id: 'bruno-row', type: 'row', text: 'Estaba en la cuarta fila.', row: 4 }] },
  { id: 'ines', name: 'Inés', avatar: '🦋', isVictim: false, clues: [{ id: 'ines-zone', type: 'zone', text: 'Estaba en el baño.', zoneId: 'bathroom' }, { id: 'ines-column', type: 'column', text: 'Ocupaba la quinta columna.', column: 5 }] },
  { id: 'alma', name: 'Alma', avatar: '🌙', isVictim: true, clues: [{ id: 'alma-zone', type: 'zone', text: 'Estaba en el almacén.', zoneId: 'storage' }, { id: 'alma-south-of-ines', type: 'southOfCharacter', text: 'Estaba al sur de Inés.', targetCharacterId: 'ines' }] },
]
const solution: Placement[] = [{ characterId: 'lucia', position: { row: 1, column: 3 } }, { characterId: 'mateo', position: { row: 2, column: 4 } }, { characterId: 'nora', position: { row: 3, column: 6 } }, { characterId: 'bruno', position: { row: 4, column: 1 } }, { characterId: 'ines', position: { row: 5, column: 5 } }, { characterId: 'alma', position: { row: 6, column: 2 } }]
export const case001: GameCase = { id: 'case001', title: 'La última taza', intro: 'Tras el cierre de la cafetería, Alma fue encontrada muerta en el local. Cinco personas estuvieron allí aquella noche. Reconstruye dónde se encontraba cada una y descubre quién se quedó a solas con la víctima.', difficulty: 'Fácil', rows: 6, columns: 6, zones, board, characters, solution }
