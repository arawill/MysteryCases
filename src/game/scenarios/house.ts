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
  roles: [
    { id: 'owner', maleLabel: 'Propietario', femaleLabel: 'Propietaria', maxPerCase: 2 },
    { id: 'relative', maleLabel: 'Familiar', femaleLabel: 'Familiar', maxPerCase: 4 },
    { id: 'guest', maleLabel: 'Invitado', femaleLabel: 'Invitada', maxPerCase: 4 },
    { id: 'neighbor', maleLabel: 'Vecino', femaleLabel: 'Vecina', maxPerCase: 2 },
    { id: 'gardener', maleLabel: 'Jardinero', femaleLabel: 'Jardinera', maxPerCase: 1 },
    { id: 'cleaner', maleLabel: 'Personal de limpieza', femaleLabel: 'Personal de limpieza', maxPerCase: 2 },
    { id: 'caregiver', maleLabel: 'Cuidador', femaleLabel: 'Cuidadora', maxPerCase: 2 },
    { id: 'delivery', maleLabel: 'Repartidor', femaleLabel: 'Repartidora', maxPerCase: 2 },
    { id: 'technician', maleLabel: 'Técnico', femaleLabel: 'Técnica', maxPerCase: 2 },
    { id: 'family_friend', maleLabel: 'Amigo de la familia', femaleLabel: 'Amiga de la familia', maxPerCase: 4 },
    { id: 'decorator', maleLabel: 'Decorador', femaleLabel: 'Decoradora', maxPerCase: 1 },
    { id: 'maintenance', maleLabel: 'Personal de mantenimiento', femaleLabel: 'Personal de mantenimiento', maxPerCase: 2 },
  ],
}
