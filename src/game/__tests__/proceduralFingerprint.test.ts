import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { generateDailyCase } from '../daily/generator'
import { generateInfiniteCase } from '../infinite/generator'
import type { DifficultyRating } from '../types'

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const references = [
  { difficulty: 1, daily: 'e3d6051674abd39409220038b0fd12e2114c415d50c8c1064ba0a173e9bba8cc', infinite: '97a76fb8d7d83e6a629e9ac6d9f4f7da131f892fb15dee6d06e7c1e58458f462' },
  { difficulty: 2, daily: '475e3308b6a20a144c0c1d6e035b3663795d6f5f520a3ae98d567a11bf14155e', infinite: '737210dc311e6bbf8fa46daba9655139e9fed7da50fc8c6ce344d7db010257ef' },
  { difficulty: 3, daily: '30e92c9673995d64f29cb382121db80c048546afc8531e0832076604b50ac6f5', infinite: '028231d9bd49f3ffc414b9701a07dd547b8fee9f6f86038b586081977661196f' },
  { difficulty: 4, daily: '84559e895df0c3f6b10ad4f65788ec79f8da080a487aea8d37d04f22f9e5d769', infinite: '01bece51d3f42f42c63190a107f16ee736d34a46e979bfd17738a6213dd1e621' },
  { difficulty: 5, daily: 'c0e00c1d347d06b0df6f5bb7009d60d9cdcaa25c477fefa6b1af082fa22b0220', infinite: '16546afef80cd76189aa0aeeb7d556bcebb54a2ebecf3da757f37146617e01e7' },
] as const

describe('procedural generator g7 fingerprints', () => {
  it.each(references)('preserves the pre-hardening Daily and Infinite output for D$difficulty', reference => {
    const difficulty = reference.difficulty as DifficultyRating
    const daily = generateDailyCase(new Date(2026, 0, difficulty, 12), difficulty)
    const infinite = generateInfiniteCase({ difficulty, seed: (0x10203040 + difficulty * 0x01010101) >>> 0 })
    expect(hash(daily)).toBe(reference.daily)
    expect(hash(infinite)).toBe(reference.infinite)
  }, 30_000)
})
