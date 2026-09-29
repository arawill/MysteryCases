export interface PaintEnvironment {
  isVisible(): boolean
  requestFrame(callback: () => void): number
  cancelFrame(handle: number): void
  setTimer(callback: () => void, delay: number): number
  clearTimer(handle: number): void
}

const browserPaintEnvironment = (): PaintEnvironment => ({
  isVisible: () => document.visibilityState !== 'hidden',
  requestFrame: callback => window.requestAnimationFrame(callback),
  cancelFrame: handle => window.cancelAnimationFrame(handle),
  setTimer: (callback, delay) => window.setTimeout(callback, delay),
  clearTimer: handle => window.clearTimeout(handle),
})

const nextTask = (environment: PaintEnvironment) => new Promise<void>(resolve => environment.setTimer(resolve, 0))

export async function waitForPaintBeforeSynchronousWork(environment: PaintEnvironment = browserPaintEnvironment()): Promise<void> {
  if (!environment.isVisible()) {
    await nextTask(environment)
    await nextTask(environment)
    return
  }
  await new Promise<void>(resolve => {
    let settled = false
    let frame = 0
    let fallback = 0
    const finishAfterTask = () => {
      if (settled) return
      settled = true
      environment.clearTimer(fallback)
      if (frame) environment.cancelFrame(frame)
      environment.setTimer(resolve, 0)
    }
    frame = environment.requestFrame(finishAfterTask)
    fallback = environment.setTimer(finishAfterTask, 250)
  })
}
