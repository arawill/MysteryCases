export interface Progress { saveVersion: 1; completedCaseIds: string[] }
export const PROGRESS_KEY = 'mystery-cases-progress'
const empty = (): Progress => ({ saveVersion: 1, completedCaseIds: [] })
export function loadProgress(storage: Storage = localStorage): Progress { try { const value: unknown = JSON.parse(storage.getItem(PROGRESS_KEY) ?? 'null'); if (!value || typeof value !== 'object' || !Array.isArray((value as Progress).completedCaseIds)) return empty(); return { saveVersion: 1, completedCaseIds: [...new Set((value as Progress).completedCaseIds.filter(id => typeof id === 'string'))] } } catch { return empty() } }
export function saveProgress(progress: Progress, storage: Storage = localStorage) { storage.setItem(PROGRESS_KEY, JSON.stringify({ saveVersion: 1, completedCaseIds: [...new Set(progress.completedCaseIds) ] })) }
export function markCaseCompleted(caseId: string, storage: Storage = localStorage) { const progress = loadProgress(storage); const next = { ...progress, completedCaseIds: [...new Set([...progress.completedCaseIds, caseId])] }; saveProgress(next, storage); return next }
export function isCaseCompleted(caseId: string, storage: Storage = localStorage) { return loadProgress(storage).completedCaseIds.includes(caseId) }
