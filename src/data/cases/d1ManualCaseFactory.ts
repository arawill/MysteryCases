import { avatarCatalog } from '../../game/characters/avatarCatalog'
import { objectAppearanceCatalog } from '../../game/objects/appearanceCatalog'
import { isObjectPositionOccupiable } from '../../game/objects/footprints'
import type { BoardCell, BoardObject, Character, GameCase, ObjectAppearance, Placement } from '../../game/types'

export interface D1ManualCaseConfig {
  id: string; title: string; scenario: string; victim: string; killer: string; names: readonly [string, string, string, string, string, string]
  primary: ObjectAppearance; primaryOccupiable: boolean; accents: readonly [ObjectAppearance, ObjectAppearance, ObjectAppearance, ObjectAppearance]
}

const avatar = (index: number) => avatarCatalog[index % avatarCatalog.length].image
const iconFor = (appearance: ObjectAppearance) => objectAppearanceCatalog[appearance].src
const object = (id: string, appearance: ObjectAppearance, occupiable: boolean, footprint?: BoardObject['footprint'], occupiablePositions?: BoardObject['occupiablePositions']): BoardObject => ({
  id, label: objectAppearanceCatalog[appearance].label.toLowerCase(), icon: iconFor(appearance), occupiable, appearance, footprint, occupiablePositions,
})

/** Shared D1 layout: all individual case modules supply their own narrative cast and assets. */
export function createD1ManualCase(config: D1ManualCaseConfig): GameCase {
  const zones = [
    { id: 'entrance', name: 'Entrada', tone: 'cafe', surface: 'wood' as const, labelAnchor: { position: { row: 1, column: 5 }, placement: 'top' as const } },
    { id: 'main', name: config.scenario, tone: 'storage', surface: 'concrete' as const, labelAnchor: { position: { row: 4, column: 2 }, placement: 'bottom' as const } },
    { id: 'annex', name: 'Sala contigua', tone: 'kitchen', surface: 'tile' as const, labelAnchor: { position: { row: 2, column: 4 }, placement: 'top' as const } },
    { id: 'back', name: 'Zona trasera', tone: 'bathroom', surface: 'carpet' as const, labelAnchor: { position: { row: 6, column: 3 }, placement: 'bottom' as const } },
  ]
  const primaryFootprint = config.primaryOccupiable ? undefined : { id: `${config.id}-primary`, positions: [{ row: 2, column: 2 }, { row: 2, column: 3 }] }
  const objects = {
    primary: object('primary', config.primary, config.primaryOccupiable, primaryFootprint, config.primaryOccupiable ? [{ row: 2, column: 1 }] : undefined),
    killerAnchor: object('killerAnchor', config.accents[0], false),
    entranceAnchor: object('entranceAnchor', config.accents[1], false),
    fourthAnchor: object('fourthAnchor', config.accents[2], false),
    fifthAnchor: object('fifthAnchor', config.accents[3], false),
  }
  const objectAt: Record<string, keyof typeof objects> = config.primaryOccupiable
    ? { '1-3': 'entranceAnchor', '2-1': 'primary', '4-5': 'killerAnchor', '5-5': 'fifthAnchor', '6-4': 'fourthAnchor' }
    : { '1-3': 'entranceAnchor', '2-2': 'primary', '2-3': 'primary', '3-1': 'killerAnchor', '4-5': 'killerAnchor', '5-5': 'fifthAnchor', '6-4': 'fourthAnchor' }
  const zoneAt = (row: number, column: number) => row === 1 ? 'entrance' : row <= 4 ? (column <= 3 ? 'main' : 'annex') : 'back'
  const board: BoardCell[] = Array.from({ length: 6 }, (_, rowIndex) => Array.from({ length: 6 }, (_, columnIndex) => {
    const row = rowIndex + 1, column = columnIndex + 1, key = objectAt[`${row}-${column}`], item = key ? objects[key] : undefined
    return { row, column, zoneId: zoneAt(row, column), occupiable: item ? isObjectPositionOccupiable(item, { row, column }) : true, ...(item ? { object: item } : {}) }
  })).flat()
  const [first, , third, fourth, fifth, victimName] = config.names
  const killerId = config.killer.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const characterId = (name: string) => name.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const characters: Character[] = [
    { id: characterId(first), name: first, avatar: '👤', avatarImage: avatar(0), isVictim: false, clues: [{ id: `${config.id}-first-row`, type: 'row', row: 1, text: 'Estaba en la primera fila.' }, { id: `${config.id}-first-object`, type: 'besideObject', objectId: 'entranceAnchor', text: `Estaba junto a ${objects.entranceAnchor.label}.` }] },
    { id: killerId, name: config.killer, avatar: '👤', avatarImage: avatar(1), isVictim: false, clues: config.primaryOccupiable ? [{ id: `${config.id}-killer-object`, type: 'onObject', objectId: 'primary', text: `Estaba sobre ${objects.primary.label}.` }] : [{ id: `${config.id}-killer-zone`, type: 'zone', zoneId: 'main', text: `Estaba en ${config.scenario.toLocaleLowerCase('es')}.` }, { id: `${config.id}-killer-corner`, type: 'cornerOfZone', text: 'Estaba en una esquina de la sala.' }, { id: `${config.id}-killer-anchor`, type: 'besideObject', objectId: 'killerAnchor', text: `Estaba junto a ${objects.killerAnchor.label}.` }, { id: `${config.id}-killer-column`, type: 'column', column: 1, text: 'Ocupaba la primera columna.' }] },
    { id: characterId(third), name: third, avatar: '👤', avatarImage: avatar(2), isVictim: false, clues: [{ id: `${config.id}-third-zone`, type: 'zone', zoneId: 'annex', text: 'Estaba en la sala contigua.' }, { id: `${config.id}-third-relative`, type: 'relativeToObject', objectId: 'killerAnchor', direction: 'northEast', zoneRelation: 'same', text: `Estaba al noreste de ${objects.killerAnchor.label}.` }, { id: `${config.id}-third-row`, type: 'row', row: 3, text: 'Estaba en la tercera fila.' }] },
    { id: characterId(fourth), name: fourth, avatar: '👤', avatarImage: avatar(3), isVictim: false, clues: [{ id: `${config.id}-fourth-zone`, type: 'zone', zoneId: 'back', text: 'Estaba en la zona trasera.' }, { id: `${config.id}-fourth-column`, type: 'sameColumnAsObject', objectId: 'fourthAnchor', zoneRelation: 'same', text: `Estaba en la misma columna que ${objects.fourthAnchor.label}.` }] },
    { id: characterId(fifth), name: fifth, avatar: '👤', avatarImage: avatar(4), isVictim: false, clues: [{ id: `${config.id}-fifth-zone`, type: 'zone', zoneId: 'back', text: 'Estaba en la zona trasera.' }, { id: `${config.id}-fifth-column`, type: 'sameColumnAsObject', objectId: 'fifthAnchor', zoneRelation: 'same', text: `Estaba en la misma columna que ${objects.fifthAnchor.label}.` }] },
    { id: characterId(victimName), name: victimName, avatar: '👤', avatarImage: avatar(5), isVictim: true, clues: [] },
  ]
  const solution: Placement[] = [
    { characterId: characterId(first), position: { row: 1, column: 2 } }, { characterId: killerId, position: { row: 2, column: 1 } }, { characterId: characterId(third), position: { row: 3, column: 6 } },
    { characterId: characterId(victimName), position: { row: 4, column: 3 } }, { characterId: characterId(fourth), position: { row: 5, column: 4 } }, { characterId: characterId(fifth), position: { row: 6, column: 5 } },
  ]
  return { id: config.id, title: config.title, intro: `Tras el cierre de ${config.scenario.toLocaleLowerCase('es')}, ${victimName} fue encontrada sin vida. Reconstruye la posición de las seis personas y descubre quién quedó a solas con la víctima.`, difficulty: 1, rows: 6, columns: 6, zones, board, characters, solution }
}
