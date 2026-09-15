import { achievementCatalog, type AchievementCategory, type AchievementDefinition, type AchievementId } from './catalog'
import type { AchievementProgress } from '../persistence/achievementProgress'
import type { AchievementContext } from './evaluator'
import { buildPlayerStatistics } from '../statistics'
import { getUnlockedDifficulties, NORMAL_CASE_COUNT } from '../persistence/normalProgress'
import { isPerfectInvestigation } from '../persistence/investigationHistory'

export interface AchievementDisplayProgress { current: number; target: number; label: string }
export const achievementCategoryLabel = (category: AchievementCategory) => ({ progress: 'PROGRESO', skill: 'HABILIDAD', daily: 'DIARIO', infinite: 'INFINITO' })[category]
export function achievementDisplayProgress(id: AchievementId, context: AchievementContext): AchievementDisplayProgress | null {
  const stats = buildPlayerStatistics(context), normal = context.normalProgress.completedCaseNumbersByDifficulty, perfect = context.investigationHistory.records.filter(isPerfectInvestigation), value = (current: number, target: number, label: string) => ({ current: Math.min(current, target), target, label })
  if (id === 'first-investigation') return value(stats.totalSolved, 1, 'expedientes distintos')
  if (id === 'investigations-10') return value(stats.totalSolved, 10, 'expedientes distintos')
  if (id === 'investigations-50') return value(stats.totalSolved, 50, 'expedientes distintos')
  if (id === 'investigations-100') return value(stats.totalSolved, 100, 'expedientes distintos')
  if (id === 'all-difficulties-unlocked') return value(getUnlockedDifficulties(context.normalProgress).length, 5, 'dificultades')
  const normalMatch = /^normal-d([1-5])-complete$/.exec(id); if (normalMatch) return value(normal[Number(normalMatch[1]) as 1 | 2 | 3 | 4 | 5].length, NORMAL_CASE_COUNT, 'casos normales')
  if (id === 'normal-all-400') return value(stats.normal.total, 400, 'casos normales')
  if (id === 'first-perfect') return value(perfect.length, 1, 'expedientes impecables')
  if (id === 'perfect-10') return value(perfect.length, 10, 'expedientes impecables')
  if (id === 'perfect-d5') return value(perfect.some(item => item.difficulty === 5) ? 1 : 0, 1, 'expediente D5')
  if (id === 'first-daily') return value(stats.daily.completed, 1, 'casos diarios')
  if (id === 'daily-streak-3') return value(stats.daily.bestStreak, 3, 'mejor racha')
  if (id === 'daily-streak-7') return value(stats.daily.bestStreak, 7, 'mejor racha')
  if (id === 'daily-streak-30') return value(stats.daily.bestStreak, 30, 'mejor racha')
  if (id === 'first-infinite') return value(stats.infinite.completed, 1, 'casos infinitos')
  if (id === 'infinite-10') return value(stats.infinite.completed, 10, 'casos infinitos')
  if (id === 'infinite-50') return value(stats.infinite.completed, 50, 'casos infinitos')
  return null
}
export function getRecentAchievements(progress: AchievementProgress, maximum = 3) { return [...progress.unlocked].sort((left, right) => Date.parse(right.unlockedAt) - Date.parse(left.unlockedAt)).slice(0, maximum).map(item => ({ ...item, definition: achievementCatalog.find(achievement => achievement.id === item.id)! })) }
export function buildProfileSummary(context: AchievementContext, achievements: AchievementProgress) { const stats = buildPlayerStatistics(context), infinitePerfect = context.investigationHistory.records.filter(record => record.mode === 'infinite' && isPerfectInvestigation(record)).length; return { statistics: stats, unlocked: achievements.unlocked.length, normalPercent: Math.round(stats.normal.total / 400 * 100), perfectRate: stats.performance.trackedUnique ? Math.round(stats.performance.perfectUnique / stats.performance.trackedUnique * 100) : null, infinitePerfect } }
export const getAchievementDefinition = (id: AchievementId): AchievementDefinition => achievementCatalog.find(item => item.id === id)!
