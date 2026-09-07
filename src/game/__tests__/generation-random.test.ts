import { describe, expect, it } from 'vitest'
import { createSeededRandom, shuffle } from '../generation/random'
describe('seeded random utilities', () => {
  it('repite la misma secuencia para la misma seed y cambia con otra', () => { const first = createSeededRandom(123); const second = createSeededRandom(123); const third = createSeededRandom(456); const sequence = (random: () => number) => Array.from({ length: 5 }, () => random()); expect(sequence(first)).toEqual(sequence(second)); expect(sequence(createSeededRandom(123))).not.toEqual(sequence(third)) })
  it('shuffle es reproducible y no muta el input', () => { const input = [1, 2, 3, 4, 5]; expect(shuffle(input, createSeededRandom(7))).toEqual(shuffle(input, createSeededRandom(7))); expect(input).toEqual([1, 2, 3, 4, 5]) })
})
