import { formatDifficultyStars } from './difficulty'
import { countCompletedFirstForty, countCompletedNormalCases, getUnlockedDifficulties, NORMAL_CASE_COUNT, type NormalModeProgress } from './persistence/normalProgress'
import type { PlayerStats } from './persistence/playerStats'
import type { Progress } from './persistence/progress'
import type { DifficultyRating } from './types'

const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/

function parseDateKey(value: string): string | null {
  const match = datePattern.exec(value)
  if (!match) return null
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? value : null
}

export function parseDailyDateKey(value: string): string | null {
  return value.startsWith('daily-') ? parseDateKey(value.slice(6)) : null
}

export function getCompletedDailyDateKeys(progress: Progress): string[] {
  return [...new Set(progress.completedCaseIds.map(parseDailyDateKey).filter((key): key is string => key !== null))].sort()
}

const dayIndex = (key: string) => {
  const [year, month, day] = key.split('-').map(Number)
  return Date.UTC(year, month - 1, day) / 86_400_000
}
const localKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function calculateDailyStreaks(dateKeys: string[], today: Date) {
  const days = [...new Set(dateKeys.map(parseDateKey).filter((key): key is string => key !== null).map(dayIndex))].sort((a, b) => a - b)
  if (!days.length) return { current: 0, best: 0 }
  let best = 1, run = 1
  for (let index = 1; index < days.length; index += 1) {
    run = days[index] === days[index - 1] + 1 ? run + 1 : 1
    best = Math.max(best, run)
  }
  const todayIndex = dayIndex(localKey(today))
  const finalDay = days.at(-1) as number
  if (finalDay !== todayIndex && finalDay !== todayIndex - 1) return { current: 0, best }
  let current = 1
  for (let index = days.length - 1; index > 0 && days[index] === days[index - 1] + 1; index -= 1) current += 1
  return { current, best }
}

export function buildPlayerStatistics({ normalProgress, progress, playerStats, today }: { normalProgress: NormalModeProgress; progress: Progress; playerStats: PlayerStats; today: Date }) {
  const unlocked = getUnlockedDifficulties(normalProgress)
  const byDifficulty = ([1, 2, 3, 4, 5] as DifficultyRating[]).map(difficulty => ({
    difficulty,
    stars: formatDifficultyStars(difficulty),
    completed: countCompletedNormalCases(difficulty, normalProgress),
    firstForty: countCompletedFirstForty(difficulty, normalProgress),
    max: NORMAL_CASE_COUNT,
    unlocked: unlocked.includes(difficulty),
  }))
  const normalTotal = byDifficulty.reduce((total, item) => total + item.completed, 0)
  const dateKeys = getCompletedDailyDateKeys(progress)
  const daily = calculateDailyStreaks(dateKeys, today)
  const hints = playerStats.hintsUsed
  return {
    totalSolved: normalTotal + dateKeys.length + playerStats.completedInfiniteCaseIds.length,
    normal: { total: normalTotal, byDifficulty, highestUnlocked: unlocked.at(-1) ?? 1 },
    daily: { completed: dateKeys.length, currentStreak: daily.current, bestStreak: daily.best },
    infinite: { completed: playerStats.completedInfiniteCaseIds.length },
    hints: { ...hints, total: hints.review + hints.exclusion + hints.reveal },
  }
}
