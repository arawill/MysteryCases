import type { Character, GameCase, Placement } from '../../game/types'
import { avatarCatalog } from '../../game/characters/avatarCatalog'
import { contextualObject, createManualBoard } from './manualCaseHelpers'

const bench = contextualObject('xenoLabBench', 'xenoLabBench', false, [{ row: 1, column: 1 }, { row: 1, column: 2 }])
const tank = contextualObject('specimenTank', 'specimenTank', false, [{ row: 1, column: 5 }, { row: 1, column: 6 }])
const pod = contextualObject('containmentPod', 'containmentPod', false)
const analyzer = contextualObject('sampleAnalyzer', 'sampleAnalyzer', false)
const arch = contextualObject('decontaminationArch', 'decontaminationArch', false)

const zoneAt = (row: number, column: number) => {
  if (row <= 2) return column <= 4 ? 'mainLab' : 'containment'
  if (row === 3) return column <= 3 ? 'mainLab' : column === 4 ? 'decontamination' : 'containment'
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
  { id: 'female-031', name: 'Claudia', avatar: '👤', avatarImage: avatar(0), isVictim: false, clues: [{ id: 'd2c02-claudia-column', type: 'column', column: 3, text: 'Estaba en la tercera columna.' }, { id: 'd2c02-claudia-diego-north', type: 'northOfCharacter', targetCharacterId: 'male-029', text: 'Estaba al norte de Diego.' }] },
  { id: 'male-049', name: 'Héctor', avatar: '👤', avatarImage: avatar(1), isVictim: false, clues: [{ id: 'd2c02-hector-column', type: 'column', column: 6, text: 'Estaba en la sexta columna.' }, { id: 'd2c02-hector-claudia-offset', type: 'rowOffsetFromCharacter', targetCharacterId: 'female-031', rowOffset: 1, text: 'Estaba una fila al sur de Claudia.' }] },
  { id: 'female-088', name: 'Miriam', avatar: '👤', avatarImage: avatar(2), isVictim: false, clues: [{ id: 'd2c02-miriam-column', type: 'column', column: 4, text: 'Estaba en la cuarta columna.' }, { id: 'd2c02-miriam-diego-offset', type: 'rowOffsetFromCharacter', targetCharacterId: 'male-029', rowOffset: -3, text: 'Estaba tres filas al norte de Diego.' }] },
  { id: 'male-041', name: 'Gabriel', avatar: '👤', avatarImage: avatar(3), isVictim: false, clues: [{ id: 'd2c02-gabriel-column', type: 'column', column: 5, text: 'Estaba en la quinta columna.' }, { id: 'd2c02-gabriel-alicia-offset', type: 'rowOffsetFromCharacter', targetCharacterId: 'female-037', rowOffset: -1, text: 'Estaba una fila al norte de Alicia.' }] },
  { id: 'female-037', name: 'Alicia', avatar: '👤', avatarImage: avatar(4), isVictim: false, clues: [{ id: 'd2c02-alicia-column', type: 'column', column: 1, text: 'Estaba en la primera columna.' }, { id: 'd2c02-alicia-hector-south', type: 'southOfCharacter', targetCharacterId: 'male-049', text: 'Estaba al sur de Héctor.' }] },
  { id: 'male-029', name: 'Diego', avatar: '👤', avatarImage: avatar(5), isVictim: false, clues: [{ id: 'd2c02-diego-column', type: 'column', column: 7, text: 'Estaba en la séptima columna.' }, { id: 'd2c02-diego-eva-zone', type: 'sameZoneAsCharacter', targetCharacterId: 'female-035', text: 'Estaba en la misma zona que Eva.' }] },
  { id: 'female-035', name: 'Eva', avatar: '👤', avatarImage: avatar(6), isVictim: true, clues: [] },
]

const solution: Placement[] = [
  { characterId: 'female-031', position: { row: 1, column: 3 } },
  { characterId: 'male-049', position: { row: 2, column: 6 } },
  { characterId: 'female-088', position: { row: 3, column: 4 } },
  { characterId: 'male-041', position: { row: 4, column: 5 } },
  { characterId: 'female-037', position: { row: 5, column: 1 } },
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
    { id: 'mainLab', name: 'Ensayos', tone: 'kitchen', surface: 'industrial', labelAnchor: { position: { row: 2, column: 3 } } },
    { id: 'containment', name: 'Cápsulas', tone: 'storage', surface: 'concrete', labelAnchor: { position: { row: 3, column: 7 } } },
    { id: 'analysis', name: 'Análisis', tone: 'cafe', surface: 'tile', labelAnchor: { position: { row: 4, column: 1 } } },
    { id: 'decontamination', name: 'Limpieza', tone: 'bathroom', surface: 'tile', labelAnchor: { position: { row: 5, column: 4 } } },
    { id: 'bioArchive', name: 'Archivo', tone: 'storage', surface: 'concrete', labelAnchor: { position: { row: 5, column: 6 } } },
    { id: 'observation', name: 'Control', tone: 'cafe', surface: 'carpet', labelAnchor: { position: { row: 7, column: 7 } } },
  ],
  board,
  characters,
  solution,
}
