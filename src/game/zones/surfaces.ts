import type { Zone, ZoneSurface } from '../types'

const surfaces: readonly ZoneSurface[] = ['tile', 'kitchenTile', 'grass', 'stairs', 'asphalt', 'wood', 'carpet', 'industrial', 'concrete', 'generic']
const defaults: Record<string, ZoneSurface> = { cafe: 'wood', kitchen: 'kitchenTile', storage: 'industrial', bathroom: 'tile' }

export function resolveZoneSurface(zone?: Pick<Zone, 'surface' | 'tone'>): ZoneSurface {
  if (zone?.surface !== undefined) return surfaces.some(surface => surface === zone.surface) ? zone.surface : 'generic'
  return defaults[zone?.tone ?? ''] ?? 'generic'
}
