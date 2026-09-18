import { describe, expect, it } from 'vitest'
import { objectAppearanceCatalog, resolveObjectAppearance } from '../appearanceCatalog'

describe('object appearance catalog', () => {
  it('registers every contextual object with a human label and a supported visual asset', () => {
    expect(Object.keys(objectAppearanceCatalog)).toHaveLength(54)
    for (const appearance of Object.values(objectAppearanceCatalog)) {
      expect(appearance.label.length).toBeGreaterThan(0)
      expect(appearance.src).toMatch(/^(data:image\/svg\+xml|.*\.(png|svg)$)/)
    }
    expect(objectAppearanceCatalog.cafeCounter).toMatchObject({ scale: 0.96, visualProfile: 'wide' })
    expect(objectAppearanceCatalog.gymBench).toMatchObject({ scale: 0.92, visualProfile: 'wide' })
    expect(objectAppearanceCatalog.lifeguardChair).toMatchObject({ scale: 0.86, visualProfile: 'tall' })
    expect(objectAppearanceCatalog.poolSurface).toMatchObject({ renderMode: 'coverFootprint' })
    expect(objectAppearanceCatalog.cargoLoader).toMatchObject({ label: 'Carretilla elevadora', visualProfile: 'wide' })
    expect(objectAppearanceCatalog.magneticPallet).toMatchObject({ label: 'Plataforma de contenedores', visualProfile: 'wide' })
    expect(objectAppearanceCatalog.freightConsole).toMatchObject({ label: 'Consola de control', visualProfile: 'standard' })
    expect(objectAppearanceCatalog.sealedContainer).toMatchObject({ label: 'Caja metálica', visualProfile: 'standard' })
    expect(objectAppearanceCatalog.maintenanceUnit).toMatchObject({ label: 'Robot de mantenimiento', visualProfile: 'tall' })
    expect(objectAppearanceCatalog.hydroponicBed).toMatchObject({ label: 'Cultivo de plantas', visualProfile: 'wide' })
    expect(objectAppearanceCatalog.growTower).toMatchObject({ label: 'Torre de cultivo', visualProfile: 'tall' })
    expect(objectAppearanceCatalog.nutrientTank).toMatchObject({ label: 'Depósito de agua', visualProfile: 'tall' })
    expect(objectAppearanceCatalog.irrigationConsole).toMatchObject({ label: 'Consola de riego', visualProfile: 'wide' })
    expect(objectAppearanceCatalog.harvestCart).toMatchObject({ label: 'Carro de cosecha', visualProfile: 'standard' })
  })

  it('uses the explicit appearance while preserving the legacy icon fallback safely', () => {
    const explicit = resolveObjectAppearance({ appearance: 'sunLounger', icon: 'legacy-chair.png', label: 'una silla' })
    expect(explicit).toMatchObject({ label: 'Tumbona' })
    expect(explicit.src).not.toBe('legacy-chair.png')
    expect(resolveObjectAppearance({ icon: 'legacy-chair.png', label: 'una silla' })).toEqual({ src: 'legacy-chair.png', label: 'una silla' })
    expect(resolveObjectAppearance({ appearance: 'unknown' as never, icon: 'legacy-chair.png', label: 'una silla' })).toEqual({ src: 'legacy-chair.png', label: 'una silla' })
  })
})
