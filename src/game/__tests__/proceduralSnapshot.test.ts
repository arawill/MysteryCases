import { describe, expect, it } from 'vitest'
import { generateDailyCase } from '../daily/generator'
import { generateInfiniteCase } from '../infinite/generator'
import { createProceduralCaseSnapshot, PROCEDURAL_SNAPSHOT_FORMAT_VERSION, restoreProceduralCaseSnapshot } from '../persistence/proceduralSnapshot'
import { PROCEDURAL_GENERATION_VERSION } from '../generation/version'

describe('procedural case snapshots', () => {
  it('round-trips every field and stores stable asset identities instead of bundle URLs', () => {
    const generated = generateDailyCase(new Date(2026, 8, 8, 12), 3)
    const snapshot = createProceduralCaseSnapshot('daily', generated, { dailyDateKey: generated.dateKey })
    const serialized = JSON.stringify(snapshot)
    const restored = restoreProceduralCaseSnapshot(JSON.parse(serialized), { mode: 'daily', dailyDateKey: generated.dateKey, difficulty: 3, originalSeed: generated.baseSeed })
    expect(restored?.caseData).toEqual(generated.caseData)
    expect(snapshot).toMatchObject({ formatVersion: PROCEDURAL_SNAPSHOT_FORMAT_VERSION, generatorVersion: PROCEDURAL_GENERATION_VERSION, mode: 'daily', originalSeed: generated.baseSeed, difficulty: 3, dailyDateKey: generated.dateKey, effectiveSeed: generated.effectiveSeed, seedOffset: generated.seedOffset, killerId: generated.killerId })
    expect(serialized).not.toContain('.png')
    expect(serialized.length).toBeLessThan(1_000_000)
  }, 30_000)

  it('round-trips Infinite without a Daily date', () => {
    const generated = generateInfiniteCase({ difficulty: 2, seed: 0x10203040 })
    const snapshot = createProceduralCaseSnapshot('infinite', generated)
    const restored = restoreProceduralCaseSnapshot(JSON.parse(JSON.stringify(snapshot)), { mode: 'infinite', difficulty: 2, originalSeed: 0x10203040 })
    expect(restored?.caseData).toEqual(generated.caseData)
    expect(snapshot.dailyDateKey).toBeUndefined()
  }, 30_000)

  it('rejects corrupt metadata, assets, cases, and unsupported formats without throwing', () => {
    const generated = generateInfiniteCase({ difficulty: 1, seed: 12345 })
    const snapshot = createProceduralCaseSnapshot('infinite', generated)
    const corruptValues: unknown[] = [
      null,
      '{bad json',
      { ...snapshot, formatVersion: 99 },
      { ...snapshot, effectiveSeed: snapshot.effectiveSeed + 1 },
      { ...snapshot, caseData: { ...snapshot.caseData, id: 'normal-c01' } },
      { ...snapshot, caseData: { ...snapshot.caseData, zones: [{ ...snapshot.caseData.zones[0], assetId: 'missing' }, ...snapshot.caseData.zones.slice(1)] } },
      { ...snapshot, caseData: { ...snapshot.caseData, solution: [] } },
    ]
    for (const value of corruptValues) expect(() => restoreProceduralCaseSnapshot(value)).not.toThrow()
    for (const value of corruptValues) expect(restoreProceduralCaseSnapshot(value)).toBeNull()
  }, 30_000)
})
