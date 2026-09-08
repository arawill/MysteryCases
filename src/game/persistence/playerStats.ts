import type { HintUsage } from './caseSave'

export const PLAYER_STATS_KEY = 'mystery-cases-player-stats'

export interface PlayerStats {
  saveVersion: 1
  completedInfiniteCaseIds: string[]
  hintsUsed: HintUsage
}

const emptyHints = (): HintUsage => ({ review: 0, exclusion: 0, reveal: 0 })
const empty = (): PlayerStats => ({ saveVersion: 1, completedInfiniteCaseIds: [], hintsUsed: emptyHints() })
const isCounter = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0

export function isInfiniteCaseId(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = /^infinite-d([1-5])-s(\d+)$/.exec(value)
  if (!match) return false
  const seed = Number(match[2])
  return Number.isInteger(seed) && seed >= 0 && seed <= 0xffff_ffff && String(seed) === match[2]
}

function normalise(value: unknown): PlayerStats {
  if (!value || typeof value !== 'object') return empty()
  const stats = value as Partial<PlayerStats>
  if (stats.saveVersion !== 1) return empty()
  const hints = stats.hintsUsed
  return {
    saveVersion: 1,
    completedInfiniteCaseIds: Array.isArray(stats.completedInfiniteCaseIds)
      ? [...new Set(stats.completedInfiniteCaseIds.filter(isInfiniteCaseId))]
      : [],
    hintsUsed: hints && isCounter(hints.review) && isCounter(hints.exclusion) && isCounter(hints.reveal)
      ? { review: hints.review, exclusion: hints.exclusion, reveal: hints.reveal }
      : emptyHints(),
  }
}

export function loadPlayerStats(storage: Storage = localStorage): PlayerStats {
  try { return normalise(JSON.parse(storage.getItem(PLAYER_STATS_KEY) ?? 'null')) } catch { return empty() }
}

export function savePlayerStats(stats: PlayerStats, storage: Storage = localStorage): PlayerStats {
  const safe = normalise(stats)
  storage.setItem(PLAYER_STATS_KEY, JSON.stringify(safe))
  return safe
}

export function recordInfiniteCompletion(caseId: string, storage: Storage = localStorage): PlayerStats {
  const stats = loadPlayerStats(storage)
  if (!isInfiniteCaseId(caseId)) return stats
  return savePlayerStats({ ...stats, completedInfiniteCaseIds: [...new Set([...stats.completedInfiniteCaseIds, caseId])] }, storage)
}

export function recordHintUse(type: keyof HintUsage, storage: Storage = localStorage): PlayerStats {
  const stats = loadPlayerStats(storage)
  return savePlayerStats({ ...stats, hintsUsed: { ...stats.hintsUsed, [type]: stats.hintsUsed[type] + 1 } }, storage)
}
