import type { Character, GameCase, Placement } from '../../game/types'
import { avatarCatalog } from '../../game/characters/avatarCatalog'
import { contextualObject, createManualBoard } from './manualCaseHelpers'

const lunarDrill = contextualObject('lunarDrill', 'lunarDrill', false, [{ row: 1, column: 1 }, { row: 1, column: 2 }, { row: 2, column: 1 }, { row: 2, column: 2 }])
const oreCart = contextualObject('oreCart', 'oreCart', false, [{ row: 1, column: 4 }, { row: 1, column: 5 }])
const oreCrusher = contextualObject('oreCrusher', 'oreCrusher', false)
const surveyConsole = contextualObject('surveyConsole', 'surveyConsole', true, undefined, [{ row: 2, column: 5 }])
const pressureLocker = contextualObject('pressureLocker', 'pressureLocker', false)
const lunarExcavation = contextualObject('lunarExcavation', 'lunarExcavation', true, [{ row: 5, column: 1 }, { row: 5, column: 2 }, { row: 6, column: 1 }, { row: 6, column: 2 }])

const zoneAt = (row: number, column: number) => row <= 3 ? column <= 3 ? 'extraction' : 'processing' : column <= 3 ? 'access' : 'maintenance'
const board = createManualBoard(zoneAt, {
  '1:1': lunarDrill, '1:2': lunarDrill, '2:1': lunarDrill, '2:2': lunarDrill,
  '1:4': oreCart, '1:5': oreCart, '3:3': oreCrusher, '2:5': surveyConsole, '1:7': pressureLocker,
  '5:1': lunarExcavation, '5:2': lunarExcavation, '6:1': lunarExcavation, '6:2': lunarExcavation,
}, 7, 7)
const avatar = (index: number) => avatarCatalog[index + 3].image

const characters: Character[] = [
  { id: 'daniel', name: 'Daniel', avatar: avatar(0), avatarImage: avatar(0), isVictim: false, clues: [{ id: 'd2c06-daniel-processing', type: 'zone', zoneId: 'processing', text: 'Estaba en procesamiento.' }, { id: 'd2c06-daniel-locker', type: 'besideObject', objectId: 'pressureLocker', text: 'Estaba junto al armario presurizado.' }, { id: 'd2c06-daniel-pablo-north', type: 'northOfCharacter', targetCharacterId: 'pablo', text: 'Estaba al norte de Pablo.' }] },
  { id: 'ines', name: 'Inés', avatar: avatar(1), avatarImage: avatar(1), isVictim: false, clues: [{ id: 'd2c06-ines-processing', type: 'zone', zoneId: 'processing', text: 'Estaba en procesamiento.' }, { id: 'd2c06-ines-console-column', type: 'sameColumnAsObject', objectId: 'surveyConsole', zoneRelation: 'same', text: 'Estaba en la misma columna que la consola topográfica.' }] },
  { id: 'pablo', name: 'Pablo', avatar: avatar(2), avatarImage: avatar(2), isVictim: false, clues: [{ id: 'd2c06-pablo-extraction', type: 'zone', zoneId: 'extraction', text: 'Estaba en extracción.' }, { id: 'd2c06-pablo-corner', type: 'cornerOfZone', text: 'Estaba en una esquina de extracción.' }] },
  { id: 'celia', name: 'Celia', avatar: avatar(3), avatarImage: avatar(3), isVictim: false, clues: [{ id: 'd2c06-celia-row', type: 'row', row: 4, text: 'Estaba en la cuarta fila.' }, { id: 'd2c06-celia-excavation', type: 'besideObject', objectId: 'lunarExcavation', text: 'Estaba junto a la zona de excavación lunar.' }] },
  { id: 'nicolas', name: 'Nicolás', avatar: avatar(4), avatarImage: avatar(4), isVictim: false, clues: [{ id: 'd2c06-nicolas-column', type: 'column', column: 4, text: 'Estaba en la cuarta columna.' }, { id: 'd2c06-nicolas-julieta-north', type: 'northOfCharacter', targetCharacterId: 'julieta', text: 'Estaba al norte de Julieta.' }] },
  { id: 'teresa', name: 'Teresa', avatar: avatar(5), avatarImage: avatar(5), isVictim: false, clues: [{ id: 'd2c06-teresa-row', type: 'row', row: 6, text: 'Estaba en la sexta fila.' }, { id: 'd2c06-teresa-maintenance', type: 'zone', zoneId: 'maintenance', text: 'Estaba en mantenimiento.' }] },
  { id: 'julieta', name: 'Julieta', avatar: avatar(6), avatarImage: avatar(6), isVictim: true, clues: [] },
]
const solution: Placement[] = [
  { characterId: 'daniel', position: { row: 1, column: 6 } }, { characterId: 'ines', position: { row: 2, column: 5 } }, { characterId: 'pablo', position: { row: 3, column: 1 } }, { characterId: 'celia', position: { row: 4, column: 2 } }, { characterId: 'nicolas', position: { row: 5, column: 4 } }, { characterId: 'teresa', position: { row: 6, column: 7 } }, { characterId: 'julieta', position: { row: 7, column: 3 } },
]
export const caseD206: GameCase = { id: 'case-d2-06', title: 'Ecos bajo el regolito', intro: 'Una alarma sacudió la mina lunar cuando Julieta apareció sin vida junto al acceso. Reconstruye el turno y descubre quién saboteó la extracción.', difficulty: 2, rows: 7, columns: 7, zones: [
  { id: 'extraction', name: 'Extracción', tone: 'industrial', surface: 'concrete', labelAnchor: { position: { row: 2, column: 3 } } },
  { id: 'processing', name: 'Procesamiento', tone: 'storage', surface: 'industrial', labelAnchor: { position: { row: 3, column: 4 } } },
  { id: 'access', name: 'Acceso', tone: 'cafe', surface: 'concrete', labelAnchor: { position: { row: 6, column: 3 } } },
  { id: 'maintenance', name: 'Mantenimiento', tone: 'kitchen', surface: 'industrial', labelAnchor: { position: { row: 7, column: 5 } } },
], board, characters, solution }
