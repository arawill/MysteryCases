import type { BoardCell, GameCase, Placement } from '../../game/types'
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

const zones = [
  { id: 'cafe', name: 'Cafetería', tone: 'cafe', icon: cafeIcon }, { id: 'kitchen', name: 'Cocina', tone: 'kitchen', icon: kitchenIcon },
  { id: 'storage', name: 'Almacén', tone: 'storage', icon: storageIcon }, { id: 'bathroom', name: 'Baño', tone: 'bathroom', icon: bathroomIcon },
]
const objects = {
  plant: { id: 'plant', label: 'una planta', icon: plantIcon, occupiable: false }, chair: { id: 'chair', label: 'una silla', icon: chairIcon, occupiable: true },
  register: { id: 'register', label: 'una caja registradora', icon: registerIcon, occupiable: false }, table: { id: 'table', label: 'una mesa', icon: tableIcon, occupiable: false },
  crate: { id: 'crate', label: 'una caja', icon: crateIcon, occupiable: false }, puddle: { id: 'puddle', label: 'un charco', icon: puddleIcon, occupiable: true },
}
const zoneAt = (row: number, column: number) => row <= 3 ? (column <= 3 ? 'cafe' : 'kitchen') : (column <= 3 ? 'storage' : 'bathroom')
const blocked: Record<string, keyof typeof objects> = { '1-2': 'plant', '1-3': 'chair', '2-5': 'register', '2-2': 'table', '4-2': 'crate', '5-4': 'puddle' }
const board: BoardCell[] = Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (_, c) => { const row = r + 1, column = c + 1, object = blocked[`${row}-${column}`]; return { row, column, zoneId: zoneAt(row, column), occupiable: object ? objects[object].occupiable : true, ...(object ? { object: objects[object] } : {}) } })).flat()
const characters = [
  { id: 'lucia', name: 'Lucía', avatar: '🦊', clues: ['Estaba en la primera fila.', 'Estaba sentada en una silla.'], isVictim: false }, { id: 'mateo', name: 'Mateo', avatar: '🦉', clues: ['Estaba en la segunda fila.', 'Estaba junto a la caja registradora.'], isVictim: false },
  { id: 'nora', name: 'Nora', avatar: '🐈', clues: ['Estaba en la tercera fila.', 'Ocupaba la sexta columna.'], isVictim: false }, { id: 'bruno', name: 'Bruno', avatar: '🦬', clues: ['Estaba en el almacén.', 'Estaba en la cuarta fila.'], isVictim: false },
  { id: 'ines', name: 'Inés', avatar: '🦋', clues: ['Estaba en el baño.', 'Ocupaba la quinta columna.'], isVictim: false }, { id: 'alma', name: 'Alma', avatar: '🌙', clues: ['Estaba en el almacén.', 'Estaba al sur de Inés.'], isVictim: true },
]
const solution: Placement[] = [{ characterId: 'lucia', position: { row: 1, column: 3 } }, { characterId: 'mateo', position: { row: 2, column: 4 } }, { characterId: 'nora', position: { row: 3, column: 6 } }, { characterId: 'bruno', position: { row: 4, column: 1 } }, { characterId: 'ines', position: { row: 5, column: 5 } }, { characterId: 'alma', position: { row: 6, column: 2 } }]
export const case001: GameCase = { id: 'case001', title: 'La última taza', intro: 'Cuando el local cerró, una taza seguía caliente. Seis siluetas pasaron por la cafetería, pero solo una salió del almacén con la verdad.', difficulty: 'Fácil', rows: 6, columns: 6, zones, board, characters, solution }
case001.intro = 'Tras el cierre de la cafetería, Alma fue encontrada muerta en el local. Cinco personas estuvieron allí aquella noche. Reconstruye dónde se encontraba cada una y descubre quién se quedó a solas con la víctima.'
