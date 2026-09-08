import { createSeededRandom, shuffle } from '../random'
import type { GenerationCharacter } from '../types'
import type { TraitDefinition } from '../../types'

const catalog: TraitDefinition[] = [{ id: 'staff', label: 'Personal' }, { id: 'glasses', label: 'Gafas' }, { id: 'hat', label: 'Sombrero' }, { id: 'visitor', label: 'Visitante' }, { id: 'credential', label: 'Credencial' }]
export interface ScenarioTraitAssignment { definitions?: TraitDefinition[]; characters: GenerationCharacter[] }
const cloneCharacters = (characters: readonly GenerationCharacter[]) => characters.map(character => ({ ...character, ...(character.traitIds ? { traitIds: [...character.traitIds] } : {}) }))

/** Difficulty five either receives a complete bounded trait assignment or rejects its scenario attempt. */
export function assignScenarioTraits(characters: GenerationCharacter[], difficulty: number, seed: number): ScenarioTraitAssignment | undefined {
  if (difficulty < 5) return { characters: cloneCharacters(characters) }
  if (characters.length < 3) return undefined
  const random = createSeededRandom((seed ^ 0xa31f9d71) >>> 0), definitions = shuffle(catalog, random).slice(0, 3), assignments = new Map(characters.map(character => [character.id, [] as string[]]))
  for (const trait of definitions) {
    const eligible = shuffle(characters.filter(character => (assignments.get(character.id)?.length ?? 0) < 2), random)
    const maximumOwners = Math.min(5, characters.length - 1, eligible.length)
    if (maximumOwners < 2) return undefined
    const ownerCount = 2 + Math.floor(random() * (maximumOwners - 1))
    for (const character of eligible.slice(0, ownerCount)) assignments.get(character.id)?.push(trait.id)
  }
  const assignedCharacters = characters.map(character => { const traitIds = assignments.get(character.id) ?? []; return { ...character, ...(traitIds.length ? { traitIds: [...new Set(traitIds)] } : {}) } })
  if (definitions.length !== 3 || assignedCharacters.some(character => (character.traitIds?.length ?? 0) > 2)) return undefined
  return { definitions: definitions.map(item => ({ ...item })), characters: assignedCharacters }
}
