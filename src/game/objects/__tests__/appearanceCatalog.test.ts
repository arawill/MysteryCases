import { describe, expect, it } from 'vitest'
import { objectAppearanceCatalog, resolveObjectAppearance } from '../appearanceCatalog'

describe('object appearance catalog', () => {
  it('registers every contextual object with a human label and PNG asset', () => {
    expect(Object.keys(objectAppearanceCatalog)).toHaveLength(33)
    for (const appearance of Object.values(objectAppearanceCatalog)) {
      expect(appearance.label.length).toBeGreaterThan(0)
      expect(appearance.src).toMatch(/\.png$/)
    }
    expect(objectAppearanceCatalog.cafeCounter).toMatchObject({ scale: 0.96, visualProfile: 'wide' })
    expect(objectAppearanceCatalog.gymBench).toMatchObject({ scale: 0.92, visualProfile: 'wide' })
    expect(objectAppearanceCatalog.lifeguardChair).toMatchObject({ scale: 0.86, visualProfile: 'tall' })
  })

  it('uses the explicit appearance while preserving the legacy icon fallback safely', () => {
    const explicit = resolveObjectAppearance({ appearance: 'sunLounger', icon: 'legacy-chair.png', label: 'una silla' })
    expect(explicit).toMatchObject({ label: 'Tumbona' })
    expect(explicit.src).not.toBe('legacy-chair.png')
    expect(resolveObjectAppearance({ icon: 'legacy-chair.png', label: 'una silla' })).toEqual({ src: 'legacy-chair.png', label: 'una silla' })
    expect(resolveObjectAppearance({ appearance: 'unknown' as never, icon: 'legacy-chair.png', label: 'una silla' })).toEqual({ src: 'legacy-chair.png', label: 'una silla' })
  })
})
