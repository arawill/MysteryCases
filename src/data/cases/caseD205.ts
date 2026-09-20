import type { Character, GameCase, Placement } from '../../game/types'
import { avatarCatalog } from '../../game/characters/avatarCatalog'
import { contextualObject, createManualBoard } from './manualCaseHelpers'

const assemblyLine = contextualObject('assemblyLine', 'assemblyLine', false, [{ row: 3, column: 1 }, { row: 3, column: 2 }, { row: 3, column: 3 }])
const roboticArm = contextualObject('roboticArm', 'roboticArm', false)
const androidPod = contextualObject('androidPod', 'androidPod', false)
const calibrationStation = contextualObject('calibrationStation', 'calibrationStation', true, [{ row: 3, column: 5 }, { row: 3, column: 6 }], [{ row: 3, column: 5 }])
const partsTrolley = contextualObject('partsTrolley', 'partsTrolley', false)

const zoneAt = (row: number, column: number) => {
  if (row <= 3) return column <= 3 ? 'assembly' : 'calibration'
  return column <= 3 ? 'parts' : 'control'
}

const board = createManualBoard(zoneAt, {
  '3:1': assemblyLine,
  '3:2': assemblyLine,
  '3:3': assemblyLine,
  '2:2': roboticArm,
  '1:6': androidPod,
  '3:5': calibrationStation,
  '3:6': calibrationStation,
  '5:2': partsTrolley,
}, 7, 7)

const avatar = (index: number) => avatarCatalog[index + 14].image

const characters: Character[] = [
  { id: 'mario', name: 'Mario', avatar: avatar(0), avatarImage: avatar(0), isVictim: false, clues: [{ id: 'd2c05-mario-assembly', type: 'zone', zoneId: 'assembly', text: 'Estaba en montaje.' }, { id: 'd2c05-mario-corner', type: 'cornerOfZone', text: 'Estaba en una esquina de montaje.' }] },
  { id: 'laura', name: 'Laura', avatar: avatar(1), avatarImage: avatar(1), isVictim: false, clues: [{ id: 'd2c05-laura-calibration', type: 'zone', zoneId: 'calibration', text: 'Estaba en calibración.' }, { id: 'd2c05-laura-pod', type: 'besideObject', objectId: 'androidPod', text: 'Estaba junto a la cápsula de ensamblaje.' }] },
  { id: 'sergio', name: 'Sergio', avatar: avatar(2), avatarImage: avatar(2), isVictim: false, clues: [{ id: 'd2c05-sergio-calibration', type: 'zone', zoneId: 'calibration', text: 'Estaba en calibración.' }, { id: 'd2c05-sergio-station-column', type: 'sameColumnAsObject', objectId: 'calibrationStation', zoneRelation: 'same', text: 'Estaba en la misma columna que la estación de calibración.' }] },
  { id: 'paula', name: 'Paula', avatar: avatar(3), avatarImage: avatar(3), isVictim: false, clues: [{ id: 'd2c05-paula-parts', type: 'zone', zoneId: 'parts', text: 'Estaba en repuestos.' }, { id: 'd2c05-paula-arm', type: 'relativeToObject', objectId: 'roboticArm', direction: 'southEast', zoneRelation: 'different', text: 'Estaba al sureste del brazo robótico.' }, { id: 'd2c05-paula-berta-offset', type: 'rowOffsetFromCharacter', targetCharacterId: 'berta', rowOffset: -2, text: 'Estaba dos filas al norte de Berta.' }] },
  { id: 'victor', name: 'Víctor', avatar: avatar(4), avatarImage: avatar(4), isVictim: false, clues: [{ id: 'd2c05-victor-column', type: 'column', column: 4, text: 'Estaba en la cuarta columna.' }, { id: 'd2c05-victor-raquel-north', type: 'northOfCharacter', targetCharacterId: 'raquel', text: 'Estaba al norte de Raquel.' }] },
  { id: 'berta', name: 'Berta', avatar: avatar(5), avatarImage: avatar(5), isVictim: false, clues: [{ id: 'd2c05-berta-trolley', type: 'besideObject', objectId: 'partsTrolley', text: 'Estaba junto al carro de repuestos.' }, { id: 'd2c05-berta-arm-column', type: 'sameColumnAsObject', objectId: 'roboticArm', zoneRelation: 'different', text: 'Estaba en la misma columna que el brazo robótico.' }] },
  { id: 'raquel', name: 'Raquel', avatar: avatar(6), avatarImage: avatar(6), isVictim: true, clues: [] },
]

const solution: Placement[] = [
  { characterId: 'mario', position: { row: 1, column: 1 } },
  { characterId: 'laura', position: { row: 2, column: 6 } },
  { characterId: 'sergio', position: { row: 3, column: 5 } },
  { characterId: 'paula', position: { row: 4, column: 3 } },
  { characterId: 'victor', position: { row: 5, column: 4 } },
  { characterId: 'berta', position: { row: 6, column: 2 } },
  { characterId: 'raquel', position: { row: 7, column: 7 } },
]

export const caseD205: GameCase = {
  id: 'case-d2-05',
  title: 'La unidad defectuosa',
  intro: 'Una unidad recién ensamblada falló durante la inspección final. Raquel apareció sin vida entre los controles de la fábrica: reconstruye la escena y descubre quién saboteó la línea de producción.',
  difficulty: 2,
  rows: 7,
  columns: 7,
  zones: [
    { id: 'assembly', name: 'Montaje', tone: 'industrial', surface: 'concrete', labelAnchor: { position: { row: 1, column: 3 } } },
    { id: 'calibration', name: 'Calibración', tone: 'kitchen', surface: 'industrial', labelAnchor: { position: { row: 2, column: 4 } } },
    { id: 'parts', name: 'Repuestos', tone: 'storage', surface: 'concrete', labelAnchor: { position: { row: 7, column: 1 } } },
    { id: 'control', name: 'Control', tone: 'cafe', surface: 'industrial', labelAnchor: { position: { row: 6, column: 5 } } },
  ],
  board,
  characters,
  solution,
}
