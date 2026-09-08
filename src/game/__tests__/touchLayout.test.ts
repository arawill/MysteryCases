import { describe, expect, it } from 'vitest'
import { isTouchBoardLayout } from '../touchLayout'

describe('touch board layout', () => {
  it('keeps touch controls available on phones, landscape phones and touch tablets', () => {
    expect(isTouchBoardLayout(390, false)).toBe(true)
    expect(isTouchBoardLayout(844, true)).toBe(true)
    expect(isTouchBoardLayout(768, true)).toBe(true)
    expect(isTouchBoardLayout(1200, false)).toBe(false)
  })
})
