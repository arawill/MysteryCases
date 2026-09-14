import type { CharacterGender } from '../types'

export type { CharacterGender } from '../types'

export interface NameCatalogEntry {
  id: string
  name: string
  gender: CharacterGender
}
