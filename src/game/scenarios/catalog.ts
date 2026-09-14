import { createSeededRandom } from '../generation/random'
import type { ScenarioPack } from './types'
import { cafeteriaPack } from './cafeteria'
import { housePack } from './house'
import { officePack } from './office'
import { outdoorPack } from './outdoor'
import { hotelPack } from './hotel'
import { hospitalPack } from './hospital'

// Stable order is part of the procedural generation version contract.
export const scenarioPacks: readonly ScenarioPack[] = [cafeteriaPack, housePack, officePack, outdoorPack, hotelPack, hospitalPack]

export function selectScenarioPack(seed: number): ScenarioPack {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xFFFFFFFF) throw new Error('Scenario pack seed must be a uint32 integer.')
  // A separate seeded stream avoids coupling pack choice to layout random draws.
  const random = createSeededRandom((seed ^ 0x53434E50) >>> 0)
  return scenarioPacks[Math.floor(random() * scenarioPacks.length)]
}
