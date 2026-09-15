import { describe, expect, it } from 'vitest'
import { countPerfectInvestigations, countPerfectUniqueInvestigations, countTrackedCompletions, getBestAssistUsage, getRecordsByMode, INVESTIGATION_HISTORY_KEY, isInvestigationLogicalId, isPerfectInvestigation, loadInvestigationHistory, recordInvestigationCompletion } from '../persistence/investigationHistory'

const storage = () => { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) }, clear: () => { values.clear() }, get length() { return values.size }, key: (index: number) => [...values.keys()][index] ?? null } as Storage }
const input = (assists = { review: 1, exclusion: 1, positionChecks: 1 }) => ({ logicalId: 'normal-d1-c02', mode: 'normal' as const, difficulty: 1 as const, assists })

describe('investigation history', () => {
  it('starts safely for missing, corrupt and unknown saves', () => { const memory = storage(); expect(loadInvestigationHistory(memory)).toEqual({ saveVersion: 1, records: [] }); for (const value of ['{', 'null', JSON.stringify({ saveVersion: 9, records: [] })]) { memory.setItem(INVESTIGATION_HISTORY_KEY, value); expect(loadInvestigationHistory(memory)).toEqual({ saveVersion: 1, records: [] }) } })
  it('records separate runs, retains first time and updates last time', () => { const memory = storage(), first = new Date('2026-09-15T10:00:00.000Z'), second = new Date('2026-09-16T10:00:00.000Z'); recordInvestigationCompletion(input({ review: 3, exclusion: 0, positionChecks: 0 }), memory, first); recordInvestigationCompletion(input({ review: 0, exclusion: 0, positionChecks: 0 }), memory, second); const record = loadInvestigationHistory(memory).records[0]; expect(record).toMatchObject({ completions: 2, perfectCompletions: 1, firstCompletedAt: first.toISOString(), lastCompletedAt: second.toISOString(), lastAssistUsage: { review: 0, exclusion: 0, positionChecks: 0, total: 0 }, bestAssistUsage: { review: 0, exclusion: 0, positionChecks: 0, total: 0 } }) })
  it('keeps best usage from a real run with documented tie breaks', () => { const memory = storage(), now = new Date('2026-09-15T10:00:00.000Z'); recordInvestigationCompletion(input({ review: 0, exclusion: 2, positionChecks: 1 }), memory, now); recordInvestigationCompletion(input({ review: 3, exclusion: 0, positionChecks: 1 }), memory, now); recordInvestigationCompletion(input({ review: 1, exclusion: 1, positionChecks: 1 }), memory, now); expect(getBestAssistUsage('normal-d1-c02', loadInvestigationHistory(memory))).toEqual({ review: 1, exclusion: 1, positionChecks: 1, total: 3 }) })
  it('rejects malformed records and validates logical IDs', () => { const memory = storage(); memory.setItem(INVESTIGATION_HISTORY_KEY, JSON.stringify({ saveVersion: 1, records: [{ logicalId: 'normal-d1-c02', mode: 'normal', difficulty: 1, firstCompletedAt: 'bad', lastCompletedAt: 'bad', completions: -1 }] })); expect(loadInvestigationHistory(memory).records).toEqual([]); expect(['normal-d1-c01', 'daily-2026-09-15', 'infinite-d3-s123456', 'infinite-d5-s4294967295'].every(value => isInvestigationLogicalId(value))).toBe(true); expect(['normal-d1-c02-g7', 'daily-nope', 'daily-2026-02-29', 'daily-2026-13-01', 'infinite-d6-s1', 'infinite-d3-s4294967296'].some(value => isInvestigationLogicalId(value))).toBe(false) })
  it('drops records whose logical identity, difficulty or perfect counters are incoherent', () => {
    const memory = storage()
    const usage = { review: 1, exclusion: 0, positionChecks: 0, total: 1 }
    const perfect = { review: 0, exclusion: 0, positionChecks: 0, total: 0 }
    const base = { firstCompletedAt: '2026-09-15T10:00:00.000Z', lastCompletedAt: '2026-09-15T10:00:00.000Z', completions: 1, perfectCompletions: 0, lastAssistUsage: usage, bestAssistUsage: usage }
    memory.setItem(INVESTIGATION_HISTORY_KEY, JSON.stringify({ saveVersion: 1, records: [
      { ...base, logicalId: 'normal-d2-c01', mode: 'normal', difficulty: 1 },
      { ...base, logicalId: 'infinite-d3-s9', mode: 'normal', difficulty: 3 },
      { ...base, logicalId: 'daily-2026-02-30', mode: 'daily', difficulty: 1 },
      { ...base, logicalId: 'infinite-d1-s9', mode: 'infinite', difficulty: 1, perfectCompletions: 1 },
      { ...base, logicalId: 'normal-d1-c03', mode: 'normal', difficulty: 1, bestAssistUsage: perfect },
    ] }))
    expect(loadInvestigationHistory(memory).records).toEqual([])
  })
  it('refuses completion inputs with an incoherent mode, ID or difficulty', () => {
    const memory = storage()
    const assists = { review: 0, exclusion: 0, positionChecks: 0 }
    recordInvestigationCompletion({ logicalId: 'normal-d2-c01', mode: 'normal', difficulty: 1, assists }, memory)
    recordInvestigationCompletion({ logicalId: 'daily-2026-02-30', mode: 'daily', difficulty: 1, assists }, memory)
    recordInvestigationCompletion({ logicalId: 'infinite-d1-s4294967296', mode: 'infinite', difficulty: 1, assists }, memory)
    expect(loadInvestigationHistory(memory).records).toEqual([])
  })
  it('keeps Normal, Daily and Infinite records isolated by their logical IDs', () => {
    const memory = storage(), assists = { review: 0, exclusion: 0, positionChecks: 0 }
    recordInvestigationCompletion({ logicalId: 'normal-d2-c12', mode: 'normal', difficulty: 2, assists }, memory)
    recordInvestigationCompletion({ logicalId: 'daily-2026-09-15', mode: 'daily', difficulty: 4, assists }, memory)
    recordInvestigationCompletion({ logicalId: 'infinite-d5-s4294967295', mode: 'infinite', difficulty: 5, assists }, memory)
    expect(loadInvestigationHistory(memory).records.map(record => [record.logicalId, record.mode, record.difficulty])).toEqual([
      ['normal-d2-c12', 'normal', 2],
      ['daily-2026-09-15', 'daily', 4],
      ['infinite-d5-s4294967295', 'infinite', 5],
    ])
  })
  it('summarises perfect runs and mode records without inventing legacy history', () => { const memory = storage(), now = new Date('2026-09-15T10:00:00.000Z'); recordInvestigationCompletion(input({ review: 0, exclusion: 0, positionChecks: 0 }), memory, now); recordInvestigationCompletion({ logicalId: 'infinite-d2-s42', mode: 'infinite', difficulty: 2, assists: { review: 1, exclusion: 0, positionChecks: 0 } }, memory, now); const history = loadInvestigationHistory(memory); expect(countTrackedCompletions(history)).toBe(2); expect(countPerfectUniqueInvestigations(history)).toBe(1); expect(countPerfectInvestigations(history)).toBe(1); expect(getRecordsByMode('infinite', history)).toHaveLength(1); expect(isPerfectInvestigation(history.records[0])).toBe(true) })
})
