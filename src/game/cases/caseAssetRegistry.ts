import avatar01 from '../../assets/avatar/individuals/avatar_01.png'
import avatar02 from '../../assets/avatar/individuals/avatar_02.png'
import avatar03 from '../../assets/avatar/individuals/avatar_03.png'
import avatar04 from '../../assets/avatar/individuals/avatar_04.png'
import avatar05 from '../../assets/avatar/individuals/avatar_05.png'
import avatar07 from '../../assets/avatar/individuals/avatar_07.png'
import avatar08 from '../../assets/avatar/individuals/avatar_08.png'
import avatar09 from '../../assets/avatar/individuals/avatar_09.png'
import avatar10 from '../../assets/avatar/individuals/avatar_10.png'
import avatar11 from '../../assets/avatar/individuals/avatar_11.png'
import avatar12 from '../../assets/avatar/individuals/avatar_12.png'
import avatar13 from '../../assets/avatar/individuals/avatar_13.png'
import bathroomIcon from '../../assets/scenarios/cafeteria/zones/bathroom.png'
import cafeIcon from '../../assets/scenarios/cafeteria/zones/cafe.png'
import kitchenIcon from '../../assets/scenarios/cafeteria/zones/kitchen.png'
import storageIcon from '../../assets/scenarios/cafeteria/zones/storage.png'
import chairIcon from '../../assets/scenarios/cafeteria/objects/chair.png'
import crateIcon from '../../assets/scenarios/cafeteria/objects/crate.png'
import plantIcon from '../../assets/scenarios/cafeteria/objects/plant.png'
import puddleIcon from '../../assets/scenarios/cafeteria/objects/puddle.png'
import registerIcon from '../../assets/scenarios/cafeteria/objects/register.png'
import tableIcon from '../../assets/scenarios/cafeteria/objects/table.png'

/** Runtime boundary between stable case-data keys and bundler-managed asset imports. */
export const caseAssetRegistry = {
  'avatar.avatar_01': avatar01,
  'avatar.avatar_02': avatar02,
  'avatar.avatar_03': avatar03,
  'avatar.avatar_04': avatar04,
  'avatar.avatar_05': avatar05,
  'avatar.avatar_07': avatar07,
  'avatar.avatar_08': avatar08,
  'avatar.avatar_09': avatar09,
  'avatar.avatar_10': avatar10,
  'avatar.avatar_11': avatar11,
  'avatar.avatar_12': avatar12,
  'avatar.avatar_13': avatar13,
  'cafeteria.zone.cafe': cafeIcon,
  'cafeteria.zone.kitchen': kitchenIcon,
  'cafeteria.zone.storage': storageIcon,
  'cafeteria.zone.bathroom': bathroomIcon,
  'cafeteria.object.plant': plantIcon,
  'cafeteria.object.chair': chairIcon,
  'cafeteria.object.table': tableIcon,
  'cafeteria.object.register': registerIcon,
  'cafeteria.object.crate': crateIcon,
  'cafeteria.object.puddle': puddleIcon,
} as const satisfies Record<string, string>

export type CaseAssetKey = keyof typeof caseAssetRegistry

export function resolveCaseAsset(assetKey: string): string {
  if (!Object.prototype.hasOwnProperty.call(caseAssetRegistry, assetKey)) {
    throw new Error(`Asset de caso inexistente: ${assetKey}.`)
  }
  return caseAssetRegistry[assetKey as CaseAssetKey]
}
