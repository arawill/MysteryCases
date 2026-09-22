import type { BoardCell, BoardObject, Character, GameCase, Zone } from '../types'
import type { CaseAssetKey } from './caseAssetRegistry'
import type { CURRENT_CASE_SCHEMA_VERSION } from './schemaVersion'

export type SerializedZone = Omit<Zone, 'icon'> & {
  iconAsset?: CaseAssetKey
}

export type SerializedBoardObject = Omit<BoardObject, 'icon'> & {
  iconAsset: CaseAssetKey
}

export type SerializedBoardCell = Omit<BoardCell, 'object'> & {
  objectId?: string
}

export type SerializedCharacter = Omit<Character, 'avatarImage'> & {
  avatarAsset?: CaseAssetKey
}

/** JSON-compatible case data. Runtime-only asset URLs are deliberately excluded. */
export type SerializedGameCase = Omit<GameCase, 'zones' | 'board' | 'characters'> & {
  schemaVersion: typeof CURRENT_CASE_SCHEMA_VERSION
  zones: SerializedZone[]
  objects: SerializedBoardObject[]
  board: SerializedBoardCell[]
  characters: SerializedCharacter[]
}
