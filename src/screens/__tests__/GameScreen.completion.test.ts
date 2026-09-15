import { describe, expect, it, vi } from 'vitest'
import { notifyCaseCompletionOnce } from '../../game/completionNotification'

describe('GameScreen completion callback', () => {
  it('forwards the exact assist payload once for a resolved case', () => {
    const callback = vi.fn(), state = { current: false }
    const performance = { review: 2, exclusion: 1, positionChecks: 3 }

    expect(notifyCaseCompletionOnce(state, performance, callback)).toBe(true)
    expect(notifyCaseCompletionOnce(state, { review: 0, exclusion: 0, positionChecks: 0 }, callback)).toBe(false)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(performance)
  })
})
