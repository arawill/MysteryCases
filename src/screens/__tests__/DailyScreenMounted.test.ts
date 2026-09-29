import { describe, expect, it } from 'vitest'
import { setupMountedRef } from '../dailyScreenLifecycle'

describe('DailyScreen mounted lifecycle', () => {
  it('sets the ref on every setup and clears it on every cleanup', () => {
    const mounted = { current: false }

    const firstCleanup = setupMountedRef(mounted)
    expect(mounted.current).toBe(true)
    firstCleanup()
    expect(mounted.current).toBe(false)

    const strictModeSetupCleanup = setupMountedRef(mounted)
    expect(mounted.current).toBe(true)
    strictModeSetupCleanup()
    expect(mounted.current).toBe(false)
  })
})
