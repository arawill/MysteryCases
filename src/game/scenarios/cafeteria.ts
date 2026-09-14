import type { ScenarioPack } from './types'
import zone_cafe from '../../assets/scenarios/cafeteria/zones/cafe.png'
import zone_kitchen from '../../assets/scenarios/cafeteria/zones/kitchen.png'
import zone_storage from '../../assets/scenarios/cafeteria/zones/storage.png'
import zone_bathroom from '../../assets/scenarios/cafeteria/zones/bathroom.png'
import object_chair from '../../assets/scenarios/cafeteria/objects/chair.png'
import object_table from '../../assets/scenarios/cafeteria/objects/table.png'
import object_plant from '../../assets/scenarios/cafeteria/objects/plant.png'
import object_crate from '../../assets/scenarios/cafeteria/objects/crate.png'
import object_register from '../../assets/scenarios/cafeteria/objects/register.png'
import object_puddle from '../../assets/scenarios/cafeteria/objects/puddle.png'

export const cafeteriaPack: ScenarioPack = {
  id: 'cafeteria',
  name: 'Cafetería',
  zones: [
    { id: 'cafe', name: 'Cafetería', tone: 'cafe', surface: 'wood', icon: zone_cafe },
    { id: 'kitchen', name: 'Cocina', tone: 'kitchen', surface: 'kitchenTile', icon: zone_kitchen },
    { id: 'storage', name: 'Almacén', tone: 'storage', surface: 'industrial', icon: zone_storage },
    { id: 'bathroom', name: 'Baño', tone: 'bathroom', surface: 'tile', icon: zone_bathroom },
  ],
  objects: [
    { id: 'chair', label: 'una silla', occupiable: true, icon: object_chair },
    { id: 'table', label: 'una mesa', occupiable: false, icon: object_table },
    { id: 'plant', label: 'una planta', occupiable: false, icon: object_plant },
    { id: 'crate', label: 'una caja', occupiable: false, icon: object_crate },
    { id: 'register', label: 'una caja registradora', occupiable: false, icon: object_register },
    { id: 'puddle', label: 'un charco', occupiable: true, icon: object_puddle },
  ],
}
