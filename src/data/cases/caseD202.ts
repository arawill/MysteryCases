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
  { id: 'female-031', name: 'Claudia', avatar: '👤', avatarImage: avatar(0), isVictim: false, clues: [{ id: 'd2c02-claudia-lab', type: 'zone', zoneId: 'mainLab', text: 'Estaba en ensayos.' }, { id: 'd2c02-claudia-bench', type: 'besideObject', objectId: 'xenoLabBench', text: 'Estaba junto a la mesa de laboratorio.' }] },
  { id: 'male-049', name: 'Héctor', avatar: '👤', avatarImage: avatar(1), isVictim: false, clues: [{ id: 'd2c02-hector-containment', type: 'zone', zoneId: 'containment', text: 'Estaba en cápsulas.' }, { id: 'd2c02-hector-pod', type: 'besideObject', objectId: 'containmentPod', text: 'Estaba junto a la cápsula de cristal.' }] },
  { id: 'female-088', name: 'Miriam', avatar: '👤', avatarImage: avatar(2), isVictim: false, clues: [{ id: 'd2c02-miriam-cleaning', type: 'zone', zoneId: 'decontamination', text: 'Estaba en limpieza.' }, { id: 'd2c02-miriam-arch', type: 'besideObject', objectId: 'decontaminationArch', text: 'Estaba junto al arco de limpieza.' }] },
  { id: 'male-041', name: 'Gabriel', avatar: '👤', avatarImage: avatar(3), isVictim: false, clues: [{ id: 'd2c02-gabriel-row', type: 'row', row: 4, text: 'Estaba en la cuarta fila.' }, { id: 'd2c02-gabriel-archive', type: 'zone', zoneId: 'bioArchive', text: 'Estaba en el archivo.' }] },
  { id: 'female-037', name: 'Alicia', avatar: '👤', avatarImage: avatar(4), isVictim: false, clues: [{ id: 'd2c02-alicia-column', type: 'column', column: 1, text: 'Estaba en la primera columna.' }, { id: 'd2c02-alicia-analysis', type: 'zone', zoneId: 'analysis', text: 'Estaba en análisis.' }] },
  { id: 'male-029', name: 'Diego', avatar: '👤', avatarImage: avatar(5), isVictim: false, clues: [{ id: 'd2c02-diego-column', type: 'column', column: 7, text: 'Estaba en la séptima columna.' }, { id: 'd2c02-diego-eva-north', type: 'northOfCharacter', targetCharacterId: 'female-035', text: 'Estaba al norte de Eva.' }] },
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
