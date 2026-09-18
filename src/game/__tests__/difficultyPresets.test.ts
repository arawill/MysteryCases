import { describe, expect, it } from 'vitest'
import { allDifficultyPresets } from '../difficultyPresets'

describe('difficulty presets', () => {
  it('keeps the campaign progression from D1 6×6 to D5 10×10 with one person per row and column', () => {
    expect(allDifficultyPresets).toEqual([
      { rating: 1, rows: 6, columns: 6, characterCount: 6 },
      { rating: 2, rows: 7, columns: 7, characterCount: 7 },
      { rating: 3, rows: 8, columns: 8, characterCount: 8 },
      { rating: 4, rows: 9, columns: 9, characterCount: 9 },
      { rating: 5, rows: 10, columns: 10, characterCount: 10 },
    ])
  })
})
