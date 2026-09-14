import type { GameCase } from './types'
import type { CaseSave } from './persistence/caseSave'

export const getPositionCheckLimit = (gameCase: Pick<GameCase, 'characters'>): number => Math.max(1, gameCase.characters.length - 5)

export type PositionCheckStatus = 'correct' | 'incorrect' | 'noSelection' | 'unplaced' | 'exhausted' | 'unavailable'
export interface PositionCheckResult { status: PositionCheckStatus; positionChecksUsed: number }

/** Returns only a verdict, never the canonical coordinates or a direction. */
export function checkCharacterPosition(gameCase: GameCase, save: Pick<CaseSave, 'placements' | 'positionChecksUsed'>, selectedId: string | null): PositionCheckResult {
  const unchanged = (status: PositionCheckStatus): PositionCheckResult => ({ status, positionChecksUsed: save.positionChecksUsed })
  if (!selectedId || !gameCase.characters.some(character => character.id === selectedId)) return unchanged('noSelection')
  const current = save.placements.find(item => item.characterId === selectedId)
  if (!current) return unchanged('unplaced')
  if (save.positionChecksUsed >= getPositionCheckLimit(gameCase)) return unchanged('exhausted')
  const canonical = gameCase.solution.find(item => item.characterId === selectedId)
  if (!canonical) return unchanged('unavailable')
  const correct = current.position.row === canonical.position.row && current.position.column === canonical.position.column
  return { status: correct ? 'correct' : 'incorrect', positionChecksUsed: save.positionChecksUsed + 1 }
}
