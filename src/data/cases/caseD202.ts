import type { Character, GameCase, Placement } from '../../game/types'
import { avatarCatalog } from '../../game/characters/avatarCatalog'
import { contextualObject, createManualBoard } from './manualCaseHelpers'

const bench = contextualObject('xenoLabBench', 'xenoLabBench', false, [{ row: 1, column: 1 }, { row: 1, column: 2 }])
const tank = contextualObject('specimenTank', 'specimenTank', false, [{ row: 1, column: 5 }, { row: 1, column: 6 }])
const pod = contextualObject('containmentPod', 'containmentPod', false)
const analyzer = contextualObject('sampleAnalyzer', 'sampleAnalyzer', false)
const arch = contextualObject('decontaminationArch', 'decontaminationArch', false)

const zoneAt = (row: number, column: number) => {
  if (row <= 3) return column <= 4 ? 'mainLab' : 'containment'
  if (row <= 5) return column <= 3 ? 'analysis' : column === 4 ? 'decontamination' : 'bioArchive'
  return 'observation'
}

const board = createManualBoard(zoneAt, {
  '1:1': bench,
  '1:2': bench,
  '1:5': tank,
  '1:6': tank,
  '2:7': pod,
  '4:2': analyzer,
  '4:4': arch,
}, 7, 7)

const avatar = (index: number) => avatarCatalog[index].image

const characters: Character[] = [
  { id: 'female-031', name: 'Claudia', avatar: '👤', avatarImage: avatar(0), isVictim: false, clues: [{ id: 'd2c02-claudia-row', type: 'row', row: 1, text: 'Estaba en la primera fila.' }, { id: 'd2c02-claudia-lab', type: 'zone', zoneId: 'mainLab', text: 'Estaba en el laboratorio principal.' }, { id: 'd2c02-claudia-not-bench', type: 'notBesideObject', objectId: 'xenoLabBench', text: 'No estaba junto a la mesa de xenobiología.' }] },
  { id: 'male-049', name: 'Héctor', avatar: '👤', avatarImage: avatar(1), isVictim: false, clues: [{ id: 'd2c02-hector-tank', type: 'besideObject', objectId: 'specimenTank', text: 'Estaba junto al tanque de espécimen.' }, { id: 'd2c02-hector-column', type: 'column', column: 6, text: 'Estaba en la sexta columna.' }] },
  { id: 'female-088', name: 'Miriam', avatar: '👤', avatarImage: avatar(2), isVictim: false, clues: [{ id: 'd2c02-miriam-row', type: 'row', row: 3, text: 'Estaba en la tercera fila.' }, { id: 'd2c02-miriam-corner', type: 'cornerOfZone', text: 'Estaba en una esquina de su zona.' }] },
  { id: 'male-041', name: 'Gabriel', avatar: '👤', avatarImage: avatar(3), isVictim: false, clues: [{ id: 'd2c02-gabriel-row', type: 'row', row: 4, text: 'Estaba en la cuarta fila.' }, { id: 'd2c02-gabriel-archive', type: 'zone', zoneId: 'bioArchive', text: 'Estaba en el archivo biológico.' }] },
  { id: 'female-037', name: 'Alicia', avatar: '👤', avatarImage: avatar(4), isVictim: false, clues: [{ id: 'd2c02-alicia-analyzer', type: 'relativeToObject', objectId: 'sampleAnalyzer', direction: 'southEast', zoneRelation: 'same', text: 'Estaba al sureste del analizador de muestras.' }] },
  { id: 'male-029', name: 'Diego', avatar: '👤', avatarImage: avatar(5), isVictim: false, clues: [{ id: 'd2c02-diego-row', type: 'row', row: 6, text: 'Estaba en la sexta fila.' }, { id: 'd2c02-diego-pod-column', type: 'sameColumnAsObject', objectId: 'containmentPod', zoneRelation: 'different', text: 'Estaba en la misma columna que la cápsula de contención.' }] },
  { id: 'female-035', name: 'Eva', avatar: '👤', avatarImage: avatar(6), isVictim: true, clues: [] },
]

const solution: Placement[] = [
  { characterId: 'female-031', position: { row: 1, column: 4 } },
  { characterId: 'male-049', position: { row: 2, column: 6 } },
  { characterId: 'female-088', position: { row: 3, column: 1 } },
  { characterId: 'male-041', position: { row: 4, column: 5 } },
  { characterId: 'female-037', position: { row: 5, column: 3 } },
  { characterId: 'male-029', position: { row: 6, column: 7 } },
  { characterId: 'female-035', position: { row: 7, column: 2 } },
]

export const caseD202: GameCase = {
  id: 'case-d2-02',
  title: 'Protocolo Quimera',
  intro: 'Durante el estudio de una forma de vida extraterrestre, se activó el protocolo de contención. Eva apareció muerta: reconstruye la posición del equipo y descubre quién se quedó a solas con ella.',
  difficulty: 2,
  rows: 7,
  columns: 7,
  zones: [
    { id: 'mainLab', name: 'Laboratorio principal', tone: 'kitchen', surface: 'industrial', labelAnchor: { position: { row: 2, column: 3 } } },
    { id: 'containment', name: 'Sala de contención', tone: 'storage', surface: 'concrete', labelAnchor: { position: { row: 3, column: 7 } } },
    { id: 'analysis', name: 'Área de análisis', tone: 'cafe', surface: 'tile', labelAnchor: { position: { row: 5, column: 1 } } },
    { id: 'decontamination', name: 'Descontaminación', tone: 'bathroom', surface: 'tile', labelAnchor: { position: { row: 5, column: 4 } } },
    { id: 'bioArchive', name: 'Archivo biológico', tone: 'storage', surface: 'concrete', labelAnchor: { position: { row: 5, column: 6 } } },
    { id: 'observation', name: 'Observación', tone: 'cafe', surface: 'carpet', labelAnchor: { position: { row: 7, column: 7 } } },
  ],
  board,
  characters,
  solution,
}
