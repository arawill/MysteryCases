import type { Character, GameCase, Placement } from '../../game/types'
import { avatarCatalog } from '../../game/characters/avatarCatalog'
import hospitalBed from '../../assets/scenarios/hospital/objects/hospital_bed.png'
import medicalCart from '../../assets/scenarios/hospital/objects/medical_cart.png'
import { contextualObject, createManualBoard, legacyObject } from './manualCaseHelpers'

const bed = legacyObject('hospitalBed', 'una cama hospitalaria', hospitalBed, true, 'tall', [{ row: 3, column: 2 }, { row: 4, column: 2 }], [{ row: 3, column: 2 }])
const wheelchair = contextualObject('wheelchair', 'wheelchair', true)
const cart = legacyObject('medicalCart', 'un carrito médico', medicalCart, false, 'tall')
const stool = contextualObject('examStool', 'stool', true)
const chair = contextualObject('labChair', 'officeChair', true)
const zoneAt = (row: number, column: number) => row <= 2 ? (column <= 3 ? 'reception' : 'exam') : column <= 3 ? 'wards' : 'laboratory'
const board = createManualBoard(zoneAt, { '1:1': wheelchair, '2:5': stool, '3:2': bed, '4:2': bed, '4:6': chair, '4:5': cart })
const avatar = (index: number) => avatarCatalog[index].image
const characters: Character[] = [
  { id: 'lola', name: 'Lola', avatar: '👤', avatarImage: avatar(0), isVictim: false, clues: [{ id: 'c04-lola-zone', type: 'zone', zoneId: 'reception', text: 'Estaba en recepción.' }, { id: 'c04-lola-wheelchair', type: 'onObject', objectId: 'wheelchair', text: 'Estaba en la silla de ruedas.' }] },
  { id: 'sergio', name: 'Sergio', avatar: '👤', avatarImage: avatar(1), isVictim: false, clues: [{ id: 'c04-sergio-bed', type: 'onObject', objectId: 'hospitalBed', text: 'Estaba en la cama hospitalaria.' }, { id: 'c04-sergio-wards', type: 'zone', zoneId: 'wards', text: 'Estaba en las habitaciones.' }] },
  { id: 'daniel', name: 'Daniel', avatar: '👤', avatarImage: avatar(2), isVictim: false, clues: [{ id: 'c04-daniel-stool', type: 'onObject', objectId: 'examStool', text: 'Estaba sentado en el taburete.' }, { id: 'c04-daniel-exam', type: 'zone', zoneId: 'exam', text: 'Estaba en exploración.' }] },
  { id: 'monica', name: 'Mónica', avatar: '👤', avatarImage: avatar(3), isVictim: false, clues: [{ id: 'c04-monica-chair', type: 'onObject', objectId: 'labChair', text: 'Estaba sentada en la silla de laboratorio.' }, { id: 'c04-monica-cart', type: 'besideObject', objectId: 'medicalCart', text: 'Estaba junto al carrito médico.' }] },
  { id: 'ruben', name: 'Rubén', avatar: '👤', avatarImage: avatar(4), isVictim: false, clues: [{ id: 'c04-ruben-column', type: 'column', column: 4, text: 'Ocupaba la cuarta columna.' }, { id: 'c04-ruben-row', type: 'row', row: 5, text: 'Estaba en la quinta fila.' }, { id: 'c04-ruben-lab', type: 'zone', zoneId: 'laboratory', text: 'Estaba en el laboratorio.' }] },
  { id: 'irene', name: 'Irene', avatar: '👤', avatarImage: avatar(5), isVictim: true, clues: [] },
]
const solution: Placement[] = [{ characterId: 'lola', position: { row: 1, column: 1 } }, { characterId: 'sergio', position: { row: 3, column: 2 } }, { characterId: 'daniel', position: { row: 2, column: 5 } }, { characterId: 'monica', position: { row: 4, column: 6 } }, { characterId: 'ruben', position: { row: 5, column: 4 } }, { characterId: 'irene', position: { row: 6, column: 3 } }]
export const case004: GameCase = { id: 'case004', title: 'Turno de noche', intro: 'Irene fue hallada sin vida tras el turno de noche del hospital. Reconstruye dónde estaba cada persona y descubre quién quedó a solas con ella.', difficulty: 1, rows: 6, columns: 6, zones: [{ id: 'reception', name: 'Recepción', tone: 'cafe', surface: 'tile', labelAnchor: { position: { row: 2, column: 2 } } }, { id: 'exam', name: 'Exploración', tone: 'kitchen', surface: 'tile', labelAnchor: { position: { row: 1, column: 6 } } }, { id: 'wards', name: 'Habitaciones', tone: 'bathroom', surface: 'carpet', labelAnchor: { position: { row: 5, column: 1 } } }, { id: 'laboratory', name: 'Laboratorio', tone: 'storage', surface: 'concrete', labelAnchor: { position: { row: 6, column: 6 } } }], board, characters, solution }
