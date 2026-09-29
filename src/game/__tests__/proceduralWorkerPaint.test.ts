import { describe, expect, it } from 'vitest'
import { waitForPaintBeforeSynchronousWork, type PaintEnvironment } from '../proceduralWorker/waitForPaint'

class FakePaintEnvironment implements PaintEnvironment {
  frames: Array<() => void> = []
  timers: Array<() => void> = []
  private readonly visible: boolean
  constructor(visible: boolean) { this.visible = visible }
  isVisible() { return this.visible }
  requestFrame(callback: () => void) { this.frames.push(callback); return this.frames.length }
  cancelFrame() {}
  setTimer(callback: () => void) { this.timers.push(callback); return this.timers.length }
  clearTimer() {}
}

describe('fallback paint barrier', () => {
  it('waits for a frame and then a task while visible', async () => {
    const environment = new FakePaintEnvironment(true)
    let resolved = false
    const pending = waitForPaintBeforeSynchronousWork(environment).then(() => { resolved = true })
    expect(resolved).toBe(false)
    environment.frames.shift()?.()
    await Promise.resolve()
    expect(resolved).toBe(false)
    environment.timers.at(-1)?.()
    await pending
    expect(resolved).toBe(true)
  })

  it('does not depend on requestAnimationFrame while hidden', async () => {
    const environment = new FakePaintEnvironment(false)
    const pending = waitForPaintBeforeSynchronousWork(environment)
    expect(environment.frames).toHaveLength(0)
    environment.timers.shift()?.()
    await Promise.resolve()
    environment.timers.shift()?.()
    await pending
  })
})
