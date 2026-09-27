import { describe, expect, it, vi } from 'vitest'

const randomTrace = vi.hoisted(() => ({ active: [] as number[] | undefined }))
vi.mock('../generation/random', async importOriginal => {
  const original = await importOriginal<typeof import('../generation/random')>()
  return {
    ...original,
    createSeededRandom(seed: number) {
      const random = original.createSeededRandom(seed)
      return () => { const value = random(); randomTrace.active?.push(value); return value }
    },
  }
})

import { generateInfiniteCase } from '../infinite/generator'

describe('procedural observability RNG invariance', () => {
  it('preserves the exact number and order of RNG values', () => {
    randomTrace.active = []
    const withoutObserver = generateInfiniteCase({ difficulty: 2, seed: 0x10203040 })
    const baselineTrace = [...randomTrace.active]
    randomTrace.active = []
    const withObserver = generateInfiniteCase({ difficulty: 2, seed: 0x10203040 }, { observer: () => undefined })
    expect(randomTrace.active).toEqual(baselineTrace)
    expect(withObserver).toEqual(withoutObserver)
  })
})
