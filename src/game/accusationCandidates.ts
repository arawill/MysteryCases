import type { Character } from './types'

const caseSeed = (caseId: string) => {
  let hash = 0x811c9dc5
  for (let index = 0; index < caseId.length; index += 1) {
    hash ^= caseId.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

const nextRandom = (state: number) => {
  let value = state + 0x6d2b79f5
  value = Math.imul(value ^ value >>> 15, value | 1)
  value ^= value + Math.imul(value ^ value >>> 7, value | 61)
  return { state: value >>> 0, value: ((value ^ value >>> 14) >>> 0) / 0x100000000 }
}

/**
 * Presents every non-victim exactly once without consulting the solution or
 * killer identity. The public case ID keeps the order stable for a session.
 */
export function getAccusationCandidates(caseId: string, characters: readonly Character[]): Character[] {
  const candidates = characters.filter(character => !character.isVictim)
  let state = caseSeed(caseId)
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const random = nextRandom(state)
    state = random.state
    const swapIndex = Math.floor(random.value * (index + 1))
    ;[candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]]
  }
  return candidates
}
