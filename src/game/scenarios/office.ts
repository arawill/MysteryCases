import type { ScenarioPack } from './types'
import zone_reception from '../../assets/scenarios/office/zones/reception.png'
import zone_office from '../../assets/scenarios/office/zones/office.png'
import zone_meeting_room from '../../assets/scenarios/office/zones/meeting_room.png'
import zone_archive from '../../assets/scenarios/office/zones/archive.png'
import object_desk from '../../assets/scenarios/office/objects/desk.png'
import object_office_chair from '../../assets/scenarios/office/objects/office_chair.png'
import object_laptop from '../../assets/scenarios/office/objects/laptop.png'
import object_printer from '../../assets/scenarios/office/objects/printer.png'
import object_filing_cabinet from '../../assets/scenarios/office/objects/filing_cabinet.png'
import object_bookshelf from '../../assets/scenarios/office/objects/bookshelf.png'
import object_bin from '../../assets/scenarios/office/objects/bin.png'
import object_office_plant from '../../assets/scenarios/office/objects/office_plant.png'

export const officePack: ScenarioPack = {
  id: 'office',
  name: 'Oficina',
  zones: [
    { id: 'reception', name: 'Recepción', tone: 'cafe', surface: 'concrete', icon: zone_reception },
    { id: 'office', name: 'Despacho', tone: 'kitchen', surface: 'carpet', icon: zone_office },
    { id: 'meeting_room', name: 'Sala de reuniones', tone: 'bathroom', surface: 'carpet', icon: zone_meeting_room },
    { id: 'archive', name: 'Archivo', tone: 'storage', surface: 'industrial', icon: zone_archive },
  ],
  objects: [
    { id: 'desk', label: 'un escritorio', occupiable: false, icon: object_desk },
    { id: 'office_chair', label: 'una silla de oficina', occupiable: true, icon: object_office_chair },
    { id: 'laptop', label: 'un portátil', occupiable: false, icon: object_laptop },
    { id: 'printer', label: 'una impresora', occupiable: false, icon: object_printer },
    { id: 'filing_cabinet', label: 'un archivador', occupiable: false, icon: object_filing_cabinet },
    { id: 'bookshelf', label: 'una estantería', occupiable: false, icon: object_bookshelf },
    { id: 'bin', label: 'una papelera', occupiable: false, icon: object_bin },
    { id: 'office_plant', label: 'una planta', occupiable: false, icon: object_office_plant },
  ],
}
