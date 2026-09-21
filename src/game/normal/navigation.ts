import { isPublishedNormalCase, getPublishedNormalCount } from './availability'
import { isDifficultyRating } from '../difficulty'
import { isDifficultyUnlocked, type NormalModeProgress } from '../persistence/normalProgress'
import type { DifficultyRating } from '../types'

export interface NormalCaseDestination {
  difficulty: DifficultyRating
  caseNumber: number
}

export interface NormalCaseNavigation {
  previous: NormalCaseDestination | null
  next: NormalCaseDestination | null
}

export function getNormalCaseNavigation({ difficulty, caseNumber, progress }: { difficulty: DifficultyRating; caseNumber: number; progress: NormalModeProgress }): NormalCaseNavigation {
  if (!isDifficultyRating(difficulty) || !isPublishedNormalCase(difficulty, caseNumber) || !isDifficultyUnlocked(difficulty, progress)) return { previous: null, next: null }
  const previous = caseNumber > 1
    ? { difficulty, caseNumber: caseNumber - 1 }
    : difficulty > 1 && isDifficultyUnlocked((difficulty - 1) as DifficultyRating, progress)
      ? { difficulty: (difficulty - 1) as DifficultyRating, caseNumber: getPublishedNormalCount((difficulty - 1) as DifficultyRating) }
      : null
  const next = caseNumber < getPublishedNormalCount(difficulty)
    ? { difficulty, caseNumber: caseNumber + 1 }
    : difficulty < 5 && isDifficultyUnlocked((difficulty + 1) as DifficultyRating, progress)
      ? { difficulty: (difficulty + 1) as DifficultyRating, caseNumber: 1 }
      : null
  return { previous, next }
}
