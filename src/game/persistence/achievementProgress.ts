import { achievementCatalog, getAchievement, isAchievementId, type AchievementDefinition, type AchievementId } from '../achievements/catalog'

export const ACHIEVEMENT_PROGRESS_KEY = 'mystery-cases-achievements'
export interface AchievementUnlock { id: AchievementId; unlockedAt: string }
export interface AchievementProgress { saveVersion: 1; unlocked: AchievementUnlock[] }
const empty = (): AchievementProgress => ({ saveVersion: 1, unlocked: [] })
const validDate = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value))
const normalise = (value: unknown): AchievementProgress => {
  if (!value || typeof value !== 'object' || (value as AchievementProgress).saveVersion !== 1 || !Array.isArray((value as AchievementProgress).unlocked)) return empty()
  const earliest = new Map<AchievementId, string>()
  for (const entry of (value as AchievementProgress).unlocked) {
    if (!entry || typeof entry !== 'object') continue
    const unlock = entry as Partial<AchievementUnlock>
    if (!isAchievementId(unlock.id) || !validDate(unlock.unlockedAt)) continue
    const previous = earliest.get(unlock.id)
    if (!previous || Date.parse(unlock.unlockedAt) < Date.parse(previous)) earliest.set(unlock.id, unlock.unlockedAt)
  }
  return { saveVersion: 1, unlocked: achievementCatalog.filter(item => earliest.has(item.id)).map(item => ({ id: item.id, unlockedAt: earliest.get(item.id)! })) }
}
export function loadAchievementProgress(storage: Storage = localStorage): AchievementProgress { try { return normalise(JSON.parse(storage.getItem(ACHIEVEMENT_PROGRESS_KEY) ?? 'null')) } catch { return empty() } }
export function saveAchievementProgress(progress: AchievementProgress, storage: Storage = localStorage) { const safe = normalise(progress); storage.setItem(ACHIEVEMENT_PROGRESS_KEY, JSON.stringify(safe)); return safe }
export function reconcileAchievements(eligible: readonly AchievementDefinition[], storage: Storage = localStorage, now: Date = new Date()) {
  const progress = loadAchievementProgress(storage), known = new Set(progress.unlocked.map(item => item.id)), unlockedAt = Number.isFinite(now.getTime()) ? now.toISOString() : new Date().toISOString()
  const newlyUnlocked = eligible.filter(item => !known.has(item.id))
  if (!newlyUnlocked.length) return { progress, newlyUnlocked }
  const next = saveAchievementProgress({ saveVersion: 1, unlocked: [...progress.unlocked, ...newlyUnlocked.map(item => ({ id: item.id, unlockedAt }))] }, storage)
  return { progress: next, newlyUnlocked }
}
export { getAchievement }
