import type { Character, GameCase, TraitDefinition } from './types'

type TraitCarrier = Pick<Character, 'traitIds'>

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** Defensive against optional JSON-loaded traitIds while retaining the public model. */
export const getCharacterTraitIds = (character: TraitCarrier): string[] => {
  const traitIds: unknown = character.traitIds
  return Array.isArray(traitIds) ? traitIds.filter((traitId): traitId is string => typeof traitId === 'string') : []
}

export const characterHasTrait = (character: TraitCarrier, traitId: string) => getCharacterTraitIds(character).includes(traitId)

const findTraitDefinition = (definitions: GameCase['traitDefinitions'], traitId: string): TraitDefinition | undefined => {
  if (!Array.isArray(definitions)) return undefined
  const definition = definitions.find(candidate => isRecord(candidate) && candidate.id === traitId && typeof candidate.label === 'string')
  return definition && isRecord(definition) ? { id: traitId, label: definition.label } : undefined
}

export const getTraitDefinition = (caseData: GameCase, traitId: string) => findTraitDefinition(caseData.traitDefinitions, traitId)
export const getTraitLabel = (caseData: GameCase, traitId: string) => getTraitDefinition(caseData, traitId)?.label
export const getCharacterTraitLabels = (character: Character, definitions: GameCase['traitDefinitions']) => {
  return getCharacterTraitIds(character).flatMap(traitId => { const label = findTraitDefinition(definitions, traitId)?.label; return label ? [label] : [] })
}
export const charactersWithTrait = (caseData: GameCase, traitId: string) => caseData.characters.filter(character => characterHasTrait(character, traitId))
