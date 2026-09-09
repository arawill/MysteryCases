import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Capacitor } from '@capacitor/core'
import { AndroidDownloadCard } from '../AndroidDownloadCard'
import { ANDROID_APK_DOWNLOAD_URL } from '../../config/android'

describe('AndroidDownloadCard', () => {
  afterEach(() => vi.restoreAllMocks())

  it('appears on the web with the stable APK download URL', () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false)
    const markup = renderToStaticMarkup(<AndroidDownloadCard />)

    expect(markup).toContain('MysteryCases para Android')
    expect(markup).toContain(`href="${ANDROID_APK_DOWNLOAD_URL}"`)
  })

  it('does not render inside a native Capacitor platform', () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)

    expect(renderToStaticMarkup(<AndroidDownloadCard />)).toBe('')
  })
})
