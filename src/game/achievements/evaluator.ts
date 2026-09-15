import { getUnlockedDifficulties, NORMAL_CASE_COUNT, type NormalModeProgress } from '../persistence/normalProgress'
import type { Progress } from '../persistence/progress'
import type { PlayerStats } from '../persistence/playerStats'
import { isPerfectInvestigation, type InvestigationHistory } from '../persistence/investigationHistory'
import { buildPlayerStatistics } from '../statistics'
import { achievementCatalog, type AchievementDefinition, type AchievementId } from './catalog'

export interface AchievementContext { normalProgress: NormalModeProgress; progress: Progress; playerStats: PlayerStats; investigationHistory: InvestigationHistory; today: Date }
export const buildAchievementContext = (context: AchievementContext) => context

export function evaluateAchievements(context: AchievementContext): AchievementDefinition[] {
  const statistics = buildPlayerStatistics(context)
  const normal = context.normalProgress.completedCaseNumbersByDifficulty
  const perfect = context.investigationHistory.records.filter(record => isPerfectInvestigation(record))
  const conditions: Record<AchievementId, boolean> = {
    'first-investigation': statistics.totalSolved >= 1,
    'investigations-10': statistics.totalSolved >= 10,
    'investigations-50': statistics.totalSolved >= 50,
    'investigations-100': statistics.totalSolved >= 100,
    'all-difficulties-unlocked': getUnlockedDifficulties(context.normalProgress).includes(5),
    'normal-d1-complete': normal[1].length === NORMAL_CASE_COUNT,
    'normal-d2-complete': normal[2].length === NORMAL_CASE_COUNT,
    'normal-d3-complete': normal[3].length === NORMAL_CASE_COUNT,
    'normal-d4-complete': normal[4].length === NORMAL_CASE_COUNT,
    'normal-d5-complete': normal[5].length === NORMAL_CASE_COUNT,
    'normal-all-400': ([1, 2, 3, 4, 5] as const).every(difficulty => normal[difficulty].length === NORMAL_CASE_COUNT),
    'first-perfect': perfect.length >= 1,
    'perfect-10': perfect.length >= 10,
    'perfect-d5': perfect.some(record => record.difficulty === 5),
    'first-daily': statistics.daily.completed >= 1,
    'daily-streak-3': statistics.daily.bestStreak >= 3,
    'daily-streak-7': statistics.daily.bestStreak >= 7,
    'daily-streak-30': statistics.daily.bestStreak >= 30,
    'first-infinite': statistics.infinite.completed >= 1,
    'infinite-10': statistics.infinite.completed >= 10,
    'infinite-50': statistics.infinite.completed >= 50,
  }
  return achievementCatalog.filter(achievement => conditions[achievement.id])
}
