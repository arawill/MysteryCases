import type { ScenarioPack } from './types'
import zone_garden from '../../assets/scenarios/outdoor/zones/garden.png'
import zone_garage from '../../assets/scenarios/outdoor/zones/garage.png'
import zone_patio from '../../assets/scenarios/outdoor/zones/patio.png'
import zone_porch from '../../assets/scenarios/outdoor/zones/porch.png'
import object_tree from '../../assets/scenarios/outdoor/objects/tree.png'
import object_bench from '../../assets/scenarios/outdoor/objects/bench.png'
import object_car from '../../assets/scenarios/outdoor/objects/car.png'
import object_flower_pot from '../../assets/scenarios/outdoor/objects/flower_pot.png'
import object_toolbox from '../../assets/scenarios/outdoor/objects/toolbox.png'
import object_street_lamp from '../../assets/scenarios/outdoor/objects/street_lamp.png'
import object_hose from '../../assets/scenarios/outdoor/objects/hose.png'
import object_mud_puddle from '../../assets/scenarios/outdoor/objects/mud_puddle.png'

export const outdoorPack: ScenarioPack = {
  id: 'outdoor',
  name: 'Exterior',
  zones: [
    { id: 'garden', name: 'Jardín', tone: 'storage', surface: 'grass', icon: zone_garden },
    { id: 'garage', name: 'Garaje', tone: 'kitchen', surface: 'concrete', icon: zone_garage },
    { id: 'patio', name: 'Patio', tone: 'bathroom', surface: 'concrete', icon: zone_patio },
    { id: 'porch', name: 'Porche', tone: 'cafe', surface: 'wood', icon: zone_porch },
  ],
  objects: [
    { id: 'tree', label: 'un árbol', occupiable: false, icon: object_tree },
    { id: 'bench', label: 'un banco', occupiable: true, icon: object_bench },
    { id: 'car', label: 'un coche', occupiable: false, icon: object_car },
    { id: 'flower_pot', label: 'una maceta', occupiable: false, icon: object_flower_pot },
    { id: 'toolbox', label: 'una caja de herramientas', occupiable: false, icon: object_toolbox },
    { id: 'street_lamp', label: 'una farola', occupiable: false, icon: object_street_lamp },
    { id: 'hose', label: 'una manguera', occupiable: false, icon: object_hose },
    { id: 'mud_puddle', label: 'un charco de barro', occupiable: true, icon: object_mud_puddle },
  ],
  roles: [
    { id: 'gardener', maleLabel: 'Jardinero', femaleLabel: 'Jardinera', maxPerCase: 2 },
    { id: 'mechanic', maleLabel: 'Mecánico', femaleLabel: 'Mecánica', maxPerCase: 2 },
    { id: 'security', maleLabel: 'Vigilante', femaleLabel: 'Vigilante', maxPerCase: 2 },
    { id: 'driver', maleLabel: 'Conductor', femaleLabel: 'Conductora', maxPerCase: 3 },
    { id: 'delivery', maleLabel: 'Repartidor', femaleLabel: 'Repartidora', maxPerCase: 2 },
    { id: 'neighbor', maleLabel: 'Vecino', femaleLabel: 'Vecina', maxPerCase: 3 },
    { id: 'technician', maleLabel: 'Técnico', femaleLabel: 'Técnica', maxPerCase: 2 },
    { id: 'owner', maleLabel: 'Propietario', femaleLabel: 'Propietaria', maxPerCase: 2 },
    { id: 'visitor', maleLabel: 'Visitante', femaleLabel: 'Visitante', maxPerCase: 4 },
    { id: 'maintenance', maleLabel: 'Personal de mantenimiento', femaleLabel: 'Personal de mantenimiento', maxPerCase: 3 },
    { id: 'landscaper', maleLabel: 'Paisajista', femaleLabel: 'Paisajista', maxPerCase: 2 },
    { id: 'courier', maleLabel: 'Mensajero', femaleLabel: 'Mensajera', maxPerCase: 2 },
  ],
}
