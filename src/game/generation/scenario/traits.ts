import { createSeededRandom, shuffle } from '../random'
import type { GenerationCharacter } from '../types'
import type { TraitDefinition } from '../../types'

const catalog: TraitDefinition[] = [{ id: 'staff', label: 'Personal' }, { id: 'glasses', label: 'Gafas' }, { id: 'hat', label: 'Sombrero' }, { id: 'visitor', label: 'Visitante' }, { id: 'credential', label: 'Credencial' }]
export function assignScenarioTraits(characters: GenerationCharacter[], difficulty: number, seed: number): { definitions?: TraitDefinition[]; characters: GenerationCharacter[] } {
  if (difficulty < 5) return { characters: characters.map(character => ({ ...character })) }
  const random = createSeededRandom((seed ^ 0xa31f9d71) >>> 0), definitions = shuffle(catalog, random).slice(0, 3), assignments = new Map(characters.map(character => [character.id, [] as string[]]))
  for (const trait of definitions) { const owners = shuffle(characters.filter(character => (assignments.get(character.id)?.length ?? 0) < 2), random).slice(0, Math.min(2 + Math.floor(random() * 4), characters.length - 1)); if (owners.length < 2) return { characters: characters.map(character => ({ ...character })) }; for (const character of owners) assignments.get(character.id)?.push(trait.id) }
  return { definitions: definitions.map(item => ({ ...item })), characters: characters.map(character => ({ ...character, ...(assignments.get(character.id)?.length ? { traitIds: [...new Set(assignments.get(character.id)!)] } : {}) })) }
}
