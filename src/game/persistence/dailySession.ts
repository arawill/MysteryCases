import { isDifficultyRating } from '../difficulty'
import { getDailyDateKey } from '../daily/date'
import { isDifficultyUnlocked, type NormalModeProgress } from './normalProgress'
import type { DifficultyRating } from '../types'
export interface DailySession { saveVersion: 1; dateKey: string; difficulty: DifficultyRating }
export const DAILY_SESSION_KEY = 'mystery-cases-daily-session'
export function loadDailySession(date: Date, storage: Storage = localStorage): DailySession | null { try { const value: unknown = JSON.parse(storage.getItem(DAILY_SESSION_KEY) ?? 'null'); if (!value || typeof value !== 'object') return null; const session = value as Partial<DailySession>; return session.saveVersion === 1 && session.dateKey === getDailyDateKey(date) && isDifficultyRating(session.difficulty) ? { saveVersion: 1, dateKey: session.dateKey, difficulty: session.difficulty } : null } catch { return null } }
export function startDailySession(date: Date, difficulty: DifficultyRating, progress: NormalModeProgress, storage: Storage = localStorage): DailySession | null { const existing = loadDailySession(date, storage); if (existing) return existing; if (!isDifficultyUnlocked(difficulty, progress)) return null; const session = { saveVersion: 1 as const, dateKey: getDailyDateKey(date), difficulty }; storage.setItem(DAILY_SESSION_KEY, JSON.stringify(session)); return session }
