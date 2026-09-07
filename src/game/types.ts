export interface Position { row: number; column: number }
export interface Zone { id: string; name: string; tone: string; icon?: string }
export interface BoardObject { id: string; label: string; icon: string; occupiable: boolean }
export interface BoardCell extends Position { zoneId: string; occupiable: boolean; object?: BoardObject }
export interface BaseClue { id: string; text: string }
export interface RowClue extends BaseClue { type: 'row'; row: number }
export interface ColumnClue extends BaseClue { type: 'column'; column: number }
export interface ZoneClue extends BaseClue { type: 'zone'; zoneId: string }
export interface OnObjectClue extends BaseClue { type: 'onObject'; objectId: string }
export interface BesideObjectClue extends BaseClue { type: 'besideObject'; objectId: string }
export interface NorthOfCharacterClue extends BaseClue { type: 'northOfCharacter'; targetCharacterId: string }
export interface SouthOfCharacterClue extends BaseClue { type: 'southOfCharacter'; targetCharacterId: string }
export interface SameZoneAsCharacterClue extends BaseClue { type: 'sameZoneAsCharacter'; targetCharacterId: string }
export interface BesideCharacterClue extends BaseClue { type: 'besideCharacter'; targetCharacterId: string }
export interface NotZoneClue extends BaseClue { type: 'notZone'; zoneId: string }
export interface NotOnObjectClue extends BaseClue { type: 'notOnObject'; objectId: string }
export interface NotBesideObjectClue extends BaseClue { type: 'notBesideObject'; objectId: string }
export type Clue = RowClue | ColumnClue | ZoneClue | OnObjectClue | BesideObjectClue | NorthOfCharacterClue | SouthOfCharacterClue | SameZoneAsCharacterClue | BesideCharacterClue | NotZoneClue | NotOnObjectClue | NotBesideObjectClue
export interface Character { id: string; name: string; avatar: string; clues: Clue[]; isVictim: boolean }
export interface Placement { characterId: string; position: Position }
export interface GameCase { id: string; title: string; intro: string; difficulty: string; rows: number; columns: number; zones: Zone[]; board: BoardCell[]; characters: Character[]; solution: Placement[] }
