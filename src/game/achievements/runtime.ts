import { evaluateAchievements, type AchievementContext } from './evaluator'
import { reconcileAchievements } from '../persistence/achievementProgress'
import { loadNormalProgress } from '../persistence/normalProgress'
import { loadProgress } from '../persistence/progress'
import { loadPlayerStats } from '../persistence/playerStats'
import { loadInvestigationHistory } from '../persistence/investigationHistory'
import type { AchievementDefinition } from './catalog'

export const ACHIEVEMENT_EVENT = 'mystery-achievements-unlocked'
export function reconcileCurrentAchievements(storage: Storage = localStorage, now: Date = new Date()) {
  const context: AchievementContext = { normalProgress: loadNormalProgress(storage), progress: loadProgress(storage), playerStats: loadPlayerStats(storage), investigationHistory: loadInvestigationHistory(storage), today: now }
  return reconcileAchievements(evaluateAchievements(context), storage, now)
}
export function announceAchievements(achievements: readonly AchievementDefinition[]) {
  if (achievements.length) window.dispatchEvent(new CustomEvent<AchievementDefinition[]>(ACHIEVEMENT_EVENT, { detail: [...achievements] }))
}
