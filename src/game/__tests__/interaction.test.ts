import { describe, expect, it } from 'vitest'
import { resolveBoardPrimaryAction } from '../interaction'

describe('board interaction mode', () => {
  it('maps placement mode to placing and exclusion mode to manual X notes', () => {
    expect(resolveBoardPrimaryAction('place')).toBe('place')
    expect(resolveBoardPrimaryAction('exclude')).toBe('toggle')
  })
})
