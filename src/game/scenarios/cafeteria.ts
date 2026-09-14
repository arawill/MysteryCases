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
  roles: [
    { id: 'barista', maleLabel: 'Barista', femaleLabel: 'Barista', maxPerCase: 2 },
    { id: 'waiter', maleLabel: 'Camarero', femaleLabel: 'Camarera', maxPerCase: 2 },
    { id: 'cook', maleLabel: 'Cocinero', femaleLabel: 'Cocinera', maxPerCase: 2 },
    { id: 'manager', maleLabel: 'Encargado', femaleLabel: 'Encargada', maxPerCase: 1 },
    { id: 'delivery', maleLabel: 'Repartidor', femaleLabel: 'Repartidora', maxPerCase: 2 },
    { id: 'customer', maleLabel: 'Cliente', femaleLabel: 'Cliente', maxPerCase: 4 },
    { id: 'supplier', maleLabel: 'Proveedor', femaleLabel: 'Proveedora', maxPerCase: 2 },
    { id: 'cleaner', maleLabel: 'Personal de limpieza', femaleLabel: 'Personal de limpieza', maxPerCase: 2 },
    { id: 'technician', maleLabel: 'Técnico', femaleLabel: 'Técnica', maxPerCase: 1 },
    { id: 'owner', maleLabel: 'Propietario', femaleLabel: 'Propietaria', maxPerCase: 1 },
    { id: 'baker', maleLabel: 'Repostero', femaleLabel: 'Repostera', maxPerCase: 1 },
    { id: 'security', maleLabel: 'Vigilante', femaleLabel: 'Vigilante', maxPerCase: 1 },
  ],
}
