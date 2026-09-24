export interface LocalCalendarDate { getFullYear(): number; getMonth(): number; getDate(): number }
export interface DailyDateParts { year: number; month: number; day: number }

const pad = (value: number, length = 2) => String(value).padStart(length, '0')
const dailyDateKeyPattern = /^(\d{4})-(\d{2})-(\d{2})$/

export function getDailyDateKeyFromParts({ year, month, day }: DailyDateParts): string {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`
}

export function getDailyDateKey(date: LocalCalendarDate): string {
  return getDailyDateKeyFromParts({ year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() })
}

export function parseDailyDateKey(dateKey: string): DailyDateParts | null {
  const match = dailyDateKeyPattern.exec(dateKey)
  if (!match) return null
  const parts = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
  const leap = parts.year % 4 === 0 && (parts.year % 100 !== 0 || parts.year % 400 === 0)
  const daysInMonth = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return parts.month >= 1 && parts.month <= 12 && parts.day >= 1 && parts.day <= daysInMonth[parts.month - 1] ? parts : null
}

export function getDateForDailyKey(dateKey: string): Date | null {
  const parts = parseDailyDateKey(dateKey)
  if (!parts) return null
  const date = new Date(0)
  date.setHours(12, 0, 0, 0)
  date.setFullYear(parts.year, parts.month - 1, parts.day)
  return date
}

export function getDailyCaseIdFromKey(dateKey: string): string { return `daily-${dateKey}` }
export function getDailyCaseId(date: LocalCalendarDate): string { return getDailyCaseIdFromKey(getDailyDateKey(date)) }
export function getDailyPuzzleIdFromKey(dateKey: string, difficulty: number): string { return `${getDailyCaseIdFromKey(dateKey)}-d${difficulty}` }
export function getDailyPuzzleId(date: LocalCalendarDate, difficulty: number): string { return getDailyPuzzleIdFromKey(getDailyDateKey(date), difficulty) }

// Gregorian civil date to days since 1970-01-01. This preserves the established
// seed contract without converting the device's local date through UTC.
function civilDayNumber({ year, month, day }: DailyDateParts): number {
  const adjustedYear = year - (month <= 2 ? 1 : 0)
  const era = Math.floor(adjustedYear / 400)
  const yearOfEra = adjustedYear - era * 400
  const adjustedMonth = month + (month > 2 ? -3 : 9)
  const dayOfYear = Math.floor((153 * adjustedMonth + 2) / 5) + day - 1
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear
  return era * 146097 + dayOfEra - 719468
}

export function getDailySeedFromKey(dateKey: string): number {
  const parts = parseDailyDateKey(dateKey)
  if (!parts) throw new Error(`Invalid Daily date key: ${dateKey}`)
  return (Math.imul(civilDayNumber(parts), 2654435761) + 2246822519) >>> 0
}

export function getDailySeed(date: LocalCalendarDate): number { return getDailySeedFromKey(getDailyDateKey(date)) }
export function getDailyDifficultySeedFromKey(dateKey: string, difficulty: number): number { const seed = getDailySeedFromKey(dateKey); return difficulty === 1 ? seed : (seed + Math.imul(difficulty, 0x9e3779b1)) >>> 0 }
export function getDailyDifficultySeed(date: LocalCalendarDate, difficulty: number): number { return getDailyDifficultySeedFromKey(getDailyDateKey(date), difficulty) }
export function formatDailyDate(date: Date): string { return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).format(date) }
