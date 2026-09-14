export type CharacterGender = 'female' | 'male'

export interface NameCatalogEntry {
  id: string
  name: string
  gender: CharacterGender
}
