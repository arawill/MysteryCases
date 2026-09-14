import type { ScenarioPack } from './types'
import zone_lobby from '../../assets/scenarios/hotel/zones/lobby.png'
import zone_guest_room from '../../assets/scenarios/hotel/zones/guest_room.png'
import zone_hallway from '../../assets/scenarios/hotel/zones/hallway.png'
import zone_hotel_bathroom from '../../assets/scenarios/hotel/zones/hotel_bathroom.png'
import object_armchair_hotel from '../../assets/scenarios/hotel/objects/armchair_hotel.png'
import object_suitcase from '../../assets/scenarios/hotel/objects/suitcase.png'
import object_luxury_bed from '../../assets/scenarios/hotel/objects/luxury_bed.png'
import object_luggage_cart from '../../assets/scenarios/hotel/objects/luggage_cart.png'
import object_mirror from '../../assets/scenarios/hotel/objects/mirror.png'
import object_statue from '../../assets/scenarios/hotel/objects/statue.png'
import object_side_table from '../../assets/scenarios/hotel/objects/side_table.png'
import object_table_lamp from '../../assets/scenarios/hotel/objects/table_lamp.png'

export const hotelPack: ScenarioPack = {
  id: 'hotel',
  name: 'Hotel',
  zones: [
    { id: 'lobby', name: 'Vestíbulo', tone: 'cafe', surface: 'tile', icon: zone_lobby },
    { id: 'guest_room', name: 'Habitación', tone: 'storage', surface: 'carpet', icon: zone_guest_room },
    { id: 'hallway', name: 'Pasillo', tone: 'kitchen', surface: 'carpet', icon: zone_hallway },
    { id: 'hotel_bathroom', name: 'Baño', tone: 'bathroom', surface: 'tile', icon: zone_hotel_bathroom },
  ],
  objects: [
    { id: 'armchair_hotel', label: 'un sillón', occupiable: true, icon: object_armchair_hotel },
    { id: 'suitcase', label: 'una maleta', occupiable: false, icon: object_suitcase },
    { id: 'luxury_bed', label: 'una cama', occupiable: true, icon: object_luxury_bed },
    { id: 'luggage_cart', label: 'un carro de equipaje', occupiable: false, icon: object_luggage_cart },
    { id: 'mirror', label: 'un espejo', occupiable: false, icon: object_mirror },
    { id: 'statue', label: 'una estatua', occupiable: false, icon: object_statue },
    { id: 'side_table', label: 'una mesa auxiliar', occupiable: false, icon: object_side_table },
    { id: 'table_lamp', label: 'una lámpara de mesa', occupiable: false, icon: object_table_lamp },
  ],
  roles: [
    { id: 'guest', maleLabel: 'Huésped', femaleLabel: 'Huésped', maxPerCase: 5 },
    { id: 'receptionist', maleLabel: 'Recepcionista', femaleLabel: 'Recepcionista', maxPerCase: 2 },
    { id: 'bellhop', maleLabel: 'Botones', femaleLabel: 'Botones', maxPerCase: 2 },
    { id: 'waiter', maleLabel: 'Camarero', femaleLabel: 'Camarera', maxPerCase: 3 },
    { id: 'cook', maleLabel: 'Cocinero', femaleLabel: 'Cocinera', maxPerCase: 2 },
    { id: 'cleaner', maleLabel: 'Personal de limpieza', femaleLabel: 'Personal de limpieza', maxPerCase: 3 },
    { id: 'manager', maleLabel: 'Gerente', femaleLabel: 'Gerente', maxPerCase: 1 },
    { id: 'security', maleLabel: 'Vigilante', femaleLabel: 'Vigilante', maxPerCase: 2 },
    { id: 'maintenance', maleLabel: 'Personal de mantenimiento', femaleLabel: 'Personal de mantenimiento', maxPerCase: 2 },
    { id: 'concierge', maleLabel: 'Conserje', femaleLabel: 'Conserje', maxPerCase: 2 },
    { id: 'supplier', maleLabel: 'Proveedor', femaleLabel: 'Proveedora', maxPerCase: 2 },
    { id: 'event_staff', maleLabel: 'Personal de eventos', femaleLabel: 'Personal de eventos', maxPerCase: 3 },
  ],
}
