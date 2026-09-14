import type { ScenarioPack } from './types'
import zone_living_room from '../../assets/scenarios/house/zones/living_room.png'
import zone_bedroom from '../../assets/scenarios/house/zones/bedroom.png'
import zone_bathroom from '../../assets/scenarios/house/zones/bathroom.png'
import zone_dining_room from '../../assets/scenarios/house/zones/dining_room.png'
import object_sofa from '../../assets/scenarios/house/objects/sofa.png'
import object_tv from '../../assets/scenarios/house/objects/tv.png'
import object_bed from '../../assets/scenarios/house/objects/bed.png'
import object_nightstand from '../../assets/scenarios/house/objects/nightstand.png'
import object_wardrobe from '../../assets/scenarios/house/objects/wardrobe.png'
import object_lamp from '../../assets/scenarios/house/objects/lamp.png'
import object_house_plant from '../../assets/scenarios/house/objects/house_plant.png'
import object_armchair from '../../assets/scenarios/house/objects/armchair.png'

export const housePack: ScenarioPack = {
  id: 'house',
  name: 'Casa',
  zones: [
    { id: 'living_room', name: 'Salón', tone: 'cafe', surface: 'carpet', icon: zone_living_room },
    { id: 'bedroom', name: 'Dormitorio', tone: 'storage', surface: 'carpet', icon: zone_bedroom },
    { id: 'bathroom', name: 'Baño', tone: 'bathroom', surface: 'tile', icon: zone_bathroom },
    { id: 'dining_room', name: 'Comedor', tone: 'kitchen', surface: 'wood', icon: zone_dining_room },
  ],
  objects: [
    { id: 'sofa', label: 'un sofá', occupiable: false, icon: object_sofa },
    { id: 'tv', label: 'un televisor', occupiable: false, icon: object_tv },
    { id: 'bed', label: 'una cama', occupiable: true, icon: object_bed },
    { id: 'nightstand', label: 'una mesita de noche', occupiable: false, icon: object_nightstand },
    { id: 'wardrobe', label: 'un armario', occupiable: false, icon: object_wardrobe },
    { id: 'lamp', label: 'una lámpara', occupiable: false, icon: object_lamp },
    { id: 'house_plant', label: 'una planta', occupiable: false, icon: object_house_plant },
    { id: 'armchair', label: 'un sillón', occupiable: true, icon: object_armchair },
  ],
}
