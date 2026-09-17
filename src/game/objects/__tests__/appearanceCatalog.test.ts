import { describe, expect, it } from 'vitest'
import { objectAppearanceCatalog, resolveObjectAppearance } from '../appearanceCatalog'

describe('object appearance catalog', () => {
  it('registers every contextual object with a human label and PNG asset', () => {
    expect(Object.keys(objectAppearanceCatalog).sort()).toEqual(['bathtub', 'diningChair', 'officeChair', 'outdoorBench', 'sofa', 'stool', 'sunLounger', 'toilet'])
    for (const appearance of Object.values(objectAppearanceCatalog)) {
      expect(appearance.label.length).toBeGreaterThan(0)
      expect(appearance.src).toMatch(/\.png$/)
    }
  })

  it('uses the explicit appearance while preserving the legacy icon fallback safely', () => {
    const explicit = resolveObjectAppearance({ appearance: 'sunLounger', icon: 'legacy-chair.png', label: 'una silla' })
    expect(explicit).toMatchObject({ label: 'Tumbona' })
    expect(explicit.src).not.toBe('legacy-chair.png')
    expect(resolveObjectAppearance({ icon: 'legacy-chair.png', label: 'una silla' })).toEqual({ src: 'legacy-chair.png', label: 'una silla' })
    expect(resolveObjectAppearance({ appearance: 'unknown' as never, icon: 'legacy-chair.png', label: 'una silla' })).toEqual({ src: 'legacy-chair.png', label: 'una silla' })
  })
})
