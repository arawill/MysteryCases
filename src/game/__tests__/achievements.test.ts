import { describe, expect, it } from 'vitest'
import { achievementCatalog } from '../achievements/catalog'
import { evaluateAchievements } from '../achievements/evaluator'
import { ACHIEVEMENT_PROGRESS_KEY, loadAchievementProgress, reconcileAchievements } from '../persistence/achievementProgress'
import { loadNormalProgress, NORMAL_CASE_COUNT, type NormalModeProgress } from '../persistence/normalProgress'
import { type Progress } from '../persistence/progress'
import { type PlayerStats } from '../persistence/playerStats'
import { type InvestigationHistory } from '../persistence/investigationHistory'
import { MemoryStorage } from './storage'

const normal = (counts: Partial<Record<1 | 2 | 3 | 4 | 5, number>> = {}): NormalModeProgress => ({ saveVersion: 1, selectedDifficulty: 1, completedCaseNumbersByDifficulty: { 1: Array.from({ length: counts[1] ?? 0 }, (_, index) => index + 1), 2: Array.from({ length: counts[2] ?? 0 }, (_, index) => index + 1), 3: Array.from({ length: counts[3] ?? 0 }, (_, index) => index + 1), 4: Array.from({ length: counts[4] ?? 0 }, (_, index) => index + 1), 5: Array.from({ length: counts[5] ?? 0 }, (_, index) => index + 1) } })
const context = (overrides: Partial<{ normalProgress: NormalModeProgress; progress: Progress; playerStats: PlayerStats; investigationHistory: InvestigationHistory }> = {}) => ({ normalProgress: normal(), progress: { saveVersion: 1 as const, completedCaseIds: [] }, playerStats: { saveVersion: 1 as const, completedInfiniteCaseIds: [], hintsUsed: { review: 0, exclusion: 0, reveal: 0 } }, investigationHistory: { saveVersion: 1 as const, records: [] }, today: new Date('2026-09-15T12:00:00Z'), ...overrides })
const ids = (value: ReturnType<typeof context>) => evaluateAchievements(value).map(item => item.id)

describe('achievements', () => {
  it('has exactly 21 unique, complete catalog definitions', () => { expect(achievementCatalog).toHaveLength(21); expect(new Set(achievementCatalog.map(item => item.id)).size).toBe(21); expect(achievementCatalog.every(item => item.title && item.description && ['progress', 'skill', 'daily', 'infinite'].includes(item.category))).toBe(true) })
  it.each([[1, 'first-investigation'], [10, 'investigations-10'], [50, 'investigations-50'], [100, 'investigations-100']] as const)('unlocks unique investigation threshold %i without counting replays', (count, achievement) => {
    const completed = Array.from({ length: count }, (_, index) => `infinite-d1-s${index}`)
    const before = count > 1 ? completed.slice(0, -1) : []
    const playerStats = (caseIds: string[]): PlayerStats => ({ saveVersion: 1, completedInfiniteCaseIds: caseIds, hintsUsed: { review: 0, exclusion: 0, reveal: 0 } })
    expect(ids(context({ playerStats: playerStats(before) }))).not.toContain(achievement)
    expect(ids(context({ playerStats: playerStats(completed) }))).toContain(achievement)
  })
  it('requires all 80 cases for each Normal difficulty and all five for the archive', () => { expect(ids(context({ normalProgress: normal({ 1: 79 }) }))).not.toContain('normal-d1-complete'); expect(ids(context({ normalProgress: normal({ 1: NORMAL_CASE_COUNT }) }))).toContain('normal-d1-complete'); expect(ids(context({ normalProgress: normal({ 5: NORMAL_CASE_COUNT }) }))).toContain('normal-d5-complete'); expect(ids(context({ normalProgress: normal({ 1: 80, 2: 80, 3: 80, 4: 80 }) }))).not.toContain('normal-all-400'); expect(ids(context({ normalProgress: normal({ 1: 80, 2: 80, 3: 80, 4: 80, 5: 80 }) }))).toContain('normal-all-400') })
  it('uses only distinct perfect history records for skill achievements', () => {
    const record = (id: string, difficulty = 1) => ({ logicalId: id, mode: 'normal' as const, difficulty: difficulty as 1 | 5, firstCompletedAt: '2026-09-15T00:00:00Z', lastCompletedAt: '2026-09-15T00:00:00Z', completions: 10, perfectCompletions: 10, lastAssistUsage: { review: 0, exclusion: 0, positionChecks: 0, total: 0 }, bestAssistUsage: { review: 0, exclusion: 0, positionChecks: 0, total: 0 } })
    const single = { saveVersion: 1 as const, records: [record('normal-d1-c01')] }
    const ten = { saveVersion: 1 as const, records: Array.from({ length: 10 }, (_, index) => record(`normal-d1-c${String(index + 1).padStart(2, '0')}`)) }
    expect(ids(context({ investigationHistory: single }))).toContain('first-perfect')
    expect(ids(context({ investigationHistory: single }))).not.toContain('perfect-10')
    expect(ids(context({ investigationHistory: ten }))).toContain('perfect-10')
    expect(ids(context({ investigationHistory: { saveVersion: 1, records: [record('infinite-d5-s1', 5)] } }))).toContain('perfect-d5')
  })
  it('persists valid unlocks once, keeps the earliest duplicate date and rejects corrupt saves', () => { const storage = new MemoryStorage(), eligible = achievementCatalog.slice(0, 2); const first = reconcileAchievements(eligible, storage, new Date('2026-09-15T10:00:00Z')); expect(first.newlyUnlocked.map(item => item.id)).toEqual(eligible.map(item => item.id)); expect(reconcileAchievements(eligible, storage, new Date()).newlyUnlocked).toEqual([]); storage.setItem(ACHIEVEMENT_PROGRESS_KEY, JSON.stringify({ saveVersion: 1, unlocked: [{ id: 'first-investigation', unlockedAt: '2026-09-16T00:00:00Z' }, { id: 'first-investigation', unlockedAt: '2026-09-14T00:00:00Z' }, { id: 'fake', unlockedAt: '2026-09-01T00:00:00Z' }] })); expect(loadAchievementProgress(storage).unlocked).toEqual([{ id: 'first-investigation', unlockedAt: '2026-09-14T00:00:00Z' }]); storage.setItem(ACHIEVEMENT_PROGRESS_KEY, '{'); expect(loadAchievementProgress(storage).unlocked).toEqual([]) })
  it('keeps legacy progress available for a silent backfill without mutating it', () => { const storage = new MemoryStorage(), legacy = context({ normalProgress: normal({ 1: 50 }), progress: { saveVersion: 1, completedCaseIds: Array.from({ length: 50 }, (_, index) => `daily-2026-01-${String(index + 1).padStart(2, '0')}`) } }); const result = reconcileAchievements(evaluateAchievements(legacy), storage, new Date('2026-09-15T00:00:00Z')); expect(result.newlyUnlocked.map(item => item.id)).toEqual(expect.arrayContaining(['first-investigation', 'investigations-10', 'investigations-50'])); expect(loadNormalProgress(storage)).toEqual(loadNormalProgress(storage)) })
})
