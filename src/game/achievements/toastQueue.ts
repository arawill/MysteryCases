import type { AchievementDefinition } from './catalog'

export const ACHIEVEMENT_TOAST_DURATION_MS = 4000
export const enqueueAchievements = (queue: readonly AchievementDefinition[], incoming: readonly AchievementDefinition[]) => [...queue, ...incoming]
export const dequeueAchievement = (queue: readonly AchievementDefinition[]) => queue.slice(1)
export const getCurrentAchievement = (queue: readonly AchievementDefinition[]) => queue[0]
