import type { BoardCell, GameCase, Placement } from '../../game/types'

const zones = [
  { id: 'cafe', name: 'Cafetería', tone: 'cafe' },
  { id: 'kitchen', name: 'Cocina', tone: 'kitchen' },
  { id: 'storage', name: 'Almacén', tone: 'storage' },
  { id: 'bathroom', name: 'Baño', tone: 'bathroom' },
]
const objects = {
  plant: { id: 'plant', label: 'una planta', icon: '🪴', occupiable: false }, chair: { id: 'chair', label: 'una silla', icon: '🪑', occupiable: true },
  register: { id: 'register', label: 'una caja registradora', icon: '▣', occupiable: false }, table: { id: 'table', label: 'una mesa', icon: '▤', occupiable: false },
  crate: { id: 'crate', label: 'una caja', icon: '▧', occupiable: false }, puddle: { id: 'puddle', label: 'un charco', icon: '◌', occupiable: true },
}
const zoneAt = (row: number, column: number) => row <= 3 ? (column <= 3 ? 'cafe' : 'kitchen') : (column <= 3 ? 'storage' : 'bathroom')
const blocked: Record<string, keyof typeof objects> = { '1-2': 'plant', '1-3': 'chair', '2-5': 'register', '2-2': 'table', '4-2': 'crate', '5-4': 'puddle' }
const board: BoardCell[] = Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (_, c) => { const row = r + 1, column = c + 1, object = blocked[`${row}-${column}`]; return { row, column, zoneId: zoneAt(row, column), occupiable: object ? objects[object].occupiable : true, ...(object ? { object: objects[object] } : {}) } })).flat()
const characters = [
  { id: 'lucia', name: 'Lucía Ferrer', avatar: '🦊', clues: ['Estaba en la primera fila.', 'Estaba sentada en una silla.'], isVictim: false },
  { id: 'mateo', name: 'Mateo Soler', avatar: '🦉', clues: ['Estaba en la segunda fila.', 'Estaba junto a la caja registradora.'], isVictim: false },
  { id: 'nora', name: 'Nora Vidal', avatar: '🐈', clues: ['Estaba en la tercera fila.', 'Ocupaba la sexta columna.'], isVictim: false },
  { id: 'bruno', name: 'Bruno Leal', avatar: '🦬', clues: ['Estaba en el almacén.', 'Estaba en la cuarta fila.'], isVictim: false },
  { id: 'ines', name: 'Inés Roca', avatar: '🦋', clues: ['Estaba en el baño.', 'Ocupaba la quinta columna.'], isVictim: false },
  { id: 'alma', name: 'Alma Ríos', avatar: '🌙', clues: ['Estaba en el almacén.', 'Estaba al sur de Inés.'], isVictim: true },
]
const solution: Placement[] = [
  { characterId: 'lucia', position: { row: 1, column: 3 } }, { characterId: 'mateo', position: { row: 2, column: 4 } },
  { characterId: 'nora', position: { row: 3, column: 6 } }, { characterId: 'bruno', position: { row: 4, column: 1 } },
  { characterId: 'ines', position: { row: 5, column: 5 } }, { characterId: 'alma', position: { row: 6, column: 2 } },
]
export const case001: GameCase = { id: 'case001', title: 'La última taza', intro: 'Cuando el local cerró, una taza seguía caliente. Seis siluetas pasaron por la cafetería, pero solo una salió del almacén con la verdad.', difficulty: 'Fácil', rows: 6, columns: 6, zones, board, characters, solution }
