import type { ScenarioPack } from './types'
import zone_reception_medical from '../../assets/scenarios/hospital/zones/reception_medical.png'
import zone_exam_room from '../../assets/scenarios/hospital/zones/exam_room.png'
import zone_patient_room from '../../assets/scenarios/hospital/zones/patient_room.png'
import zone_laboratory from '../../assets/scenarios/hospital/zones/laboratory.png'
import object_hospital_bed from '../../assets/scenarios/hospital/objects/hospital_bed.png'
import object_stool from '../../assets/scenarios/hospital/objects/stool.png'
import object_patient_monitor from '../../assets/scenarios/hospital/objects/patient_monitor.png'
import object_medical_cart from '../../assets/scenarios/hospital/objects/medical_cart.png'
import object_privacy_screen from '../../assets/scenarios/hospital/objects/privacy_screen.png'
import object_sink from '../../assets/scenarios/hospital/objects/sink.png'
import object_medicine_cabinet from '../../assets/scenarios/hospital/objects/medicine_cabinet.png'
import object_instrument_tray from '../../assets/scenarios/hospital/objects/instrument_tray.png'

export const hospitalPack: ScenarioPack = {
  id: 'hospital',
  name: 'Clínica',
  zones: [
    { id: 'reception_medical', name: 'Recepción', tone: 'cafe', surface: 'tile', icon: zone_reception_medical },
    { id: 'exam_room', name: 'Consulta', tone: 'kitchen', surface: 'tile', icon: zone_exam_room },
    { id: 'patient_room', name: 'Habitación', tone: 'bathroom', surface: 'tile', icon: zone_patient_room },
    { id: 'laboratory', name: 'Laboratorio', tone: 'storage', surface: 'industrial', icon: zone_laboratory },
  ],
  objects: [
    { id: 'hospital_bed', label: 'una cama de hospital', occupiable: true, icon: object_hospital_bed },
    { id: 'stool', label: 'un taburete', occupiable: true, icon: object_stool },
    { id: 'patient_monitor', label: 'un monitor médico', occupiable: false, icon: object_patient_monitor },
    { id: 'medical_cart', label: 'un carro médico', occupiable: false, icon: object_medical_cart },
    { id: 'privacy_screen', label: 'un biombo', occupiable: false, icon: object_privacy_screen },
    { id: 'sink', label: 'un lavabo', occupiable: false, icon: object_sink },
    { id: 'medicine_cabinet', label: 'un armario de medicinas', occupiable: false, icon: object_medicine_cabinet },
    { id: 'instrument_tray', label: 'una bandeja de instrumental', occupiable: false, icon: object_instrument_tray },
  ],
}
