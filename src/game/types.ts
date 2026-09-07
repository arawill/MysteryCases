export interface Position { row: number; column: number }
export interface Zone { id: string; name: string; tone: string }
export interface BoardObject { id: string; label: string; icon: string; occupiable: boolean }
export interface BoardCell extends Position { zoneId: string; occupiable: boolean; object?: BoardObject }
export interface Character { id: string; name: string; avatar: string; clues: string[]; isVictim: boolean }
export interface Placement { characterId: string; position: Position }
export interface GameCase { id: string; title: string; intro: string; difficulty: string; rows: number; columns: number; zones: Zone[]; board: BoardCell[]; characters: Character[]; solution: Placement[] }
