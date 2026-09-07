import { evaluateClue } from '../clues'
import { getCell, isBeside } from '../rules'
import type { Character, Clue, GameCase, Placement } from '../types'
import type { GenerationTemplate } from './types'

export interface CandidateClue { characterId: string; clue: Clue }
const objectIds = (template: GenerationTemplate) => [...new Set(template.board.flatMap(cell => cell.object ? [cell.object.id] : []))]
export const isObjectOccupiableSomewhere = (template: GenerationTemplate, objectId: string) => template.board.some(cell => cell.object?.id === objectId && cell.occupiable && cell.object.occupiable)
export const isZoneOccupiable = (template: GenerationTemplate, zoneId: string) => template.board.some(cell => cell.zoneId === zoneId && cell.occupiable)
export const canStandBesideObject = (template: GenerationTemplate, objectId: string) => template.board.filter(cell => cell.object?.id === objectId).some(objectCell => template.board.some(candidate => candidate.occupiable && isBeside(candidate, objectCell, template.board)))
const objectLabel = (template: GenerationTemplate, id: string) => template.board.find(cell => cell.object?.id === id)?.object?.label ?? `el objeto ${id}`
const zoneName = (template: GenerationTemplate, id: string) => template.zones.find(zone => zone.id === id)?.name ?? id
const clueCase = (template: GenerationTemplate, solution: Placement[]): GameCase => ({ ...template, zones: template.zones.map(zone => ({ ...zone })), board: template.board.map(cell => ({ ...cell, ...(cell.object ? { object: { ...cell.object } } : {}) })), characters: template.characters.map(character => ({ ...character, clues: [] })), solution: solution.map(placement => ({ characterId: placement.characterId, position: { ...placement.position } })) })
const add = (pool: CandidateClue[], characterId: string, clue: Clue) => pool.push({ characterId, clue })
export function buildTrueCluePool(template: GenerationTemplate, solution: Placement[]): CandidateClue[] {
  const pool: CandidateClue[] = []; const caseData = clueCase(template, solution); const ids = objectIds(template); const occupiableObjectIds = new Set(ids.filter(id => isObjectOccupiableSomewhere(template, id))); const occupiableZoneIds = new Set(template.zones.filter(zone => isZoneOccupiable(template, zone.id)).map(zone => zone.id)); const besidePossibleObjectIds = new Set(ids.filter(id => canStandBesideObject(template, id)))
  for (const subject of template.characters) {
    const placement = solution.find(candidate => candidate.characterId === subject.id); if (!placement) throw new Error(`Missing generated placement for ${subject.id}.`)
    const cell = getCell(template.board, placement.position); if (!cell) throw new Error(`Missing board cell for ${subject.id}.`)
    add(pool, subject.id, { id: `gen-${subject.id}-row-${cell.row}`, type: 'row', text: `Estaba en la fila ${cell.row}.`, row: cell.row })
    add(pool, subject.id, { id: `gen-${subject.id}-column-${cell.column}`, type: 'column', text: `Ocupaba la columna ${cell.column}.`, column: cell.column })
    add(pool, subject.id, { id: `gen-${subject.id}-zone-${cell.zoneId}`, type: 'zone', text: `Estaba en ${zoneName(template, cell.zoneId).toLowerCase()}.`, zoneId: cell.zoneId })
    if (cell.object) add(pool, subject.id, { id: `gen-${subject.id}-on-object-${cell.object.id}`, type: 'onObject', text: `Estaba en una casilla con ${objectLabel(template, cell.object.id)}.`, objectId: cell.object.id })
    for (const objectId of ids) {
      const beside = template.board.filter(candidate => candidate.object?.id === objectId).some(objectCell => isBeside(cell, objectCell, template.board))
      if (beside) add(pool, subject.id, { id: `gen-${subject.id}-beside-object-${objectId}`, type: 'besideObject', text: `Estaba junto a ${objectLabel(template, objectId)}.`, objectId })
      if (cell.object?.id !== objectId && occupiableObjectIds.has(objectId)) add(pool, subject.id, { id: `gen-${subject.id}-not-on-object-${objectId}`, type: 'notOnObject', text: `No estaba en una casilla con ${objectLabel(template, objectId)}.`, objectId })
      if (!beside && besidePossibleObjectIds.has(objectId)) add(pool, subject.id, { id: `gen-${subject.id}-not-beside-object-${objectId}`, type: 'notBesideObject', text: `No estaba junto a ${objectLabel(template, objectId)}.`, objectId })
    }
    for (const zone of template.zones) if (zone.id !== cell.zoneId && occupiableZoneIds.has(zone.id)) add(pool, subject.id, { id: `gen-${subject.id}-not-zone-${zone.id}`, type: 'notZone', text: `No estaba en ${zone.name.toLowerCase()}.`, zoneId: zone.id })
    for (const target of template.characters) {
      if (target.id === subject.id) continue
      const targetPlacement = solution.find(candidate => candidate.characterId === target.id); if (!targetPlacement) continue
      const targetCell = getCell(template.board, targetPlacement.position); if (!targetCell) continue
      if (cell.row < targetCell.row) add(pool, subject.id, { id: `gen-${subject.id}-north-of-${target.id}`, type: 'northOfCharacter', text: `Estaba al norte de ${target.name}.`, targetCharacterId: target.id })
      if (cell.row > targetCell.row) add(pool, subject.id, { id: `gen-${subject.id}-south-of-${target.id}`, type: 'southOfCharacter', text: `Estaba al sur de ${target.name}.`, targetCharacterId: target.id })
      if (cell.zoneId === targetCell.zoneId) add(pool, subject.id, { id: `gen-${subject.id}-same-zone-${target.id}`, type: 'sameZoneAsCharacter', text: `Estaba en la misma habitación que ${target.name}.`, targetCharacterId: target.id })
      if (isBeside(cell, targetCell, template.board)) add(pool, subject.id, { id: `gen-${subject.id}-beside-${target.id}`, type: 'besideCharacter', text: `Estaba junto a ${target.name}.`, targetCharacterId: target.id })
    }
  }
  for (const candidate of pool) if (evaluateClue(candidate.clue, candidate.characterId, caseData, solution) !== 'satisfied') throw new Error(`Generated an invalid clue: ${candidate.clue.id}.`)
  return pool
}
export function applyCandidates(template: GenerationTemplate, solution: Placement[], candidates: readonly CandidateClue[]): GameCase {
  const byCharacter = new Map<string, Clue[]>(); for (const candidate of candidates) byCharacter.set(candidate.characterId, [...(byCharacter.get(candidate.characterId) ?? []), candidate.clue])
  const characters: Character[] = template.characters.map(character => ({ ...character, clues: [...(byCharacter.get(character.id) ?? [])] }))
  return { id: template.id, title: template.title, intro: template.intro, difficulty: template.difficulty, rows: template.rows, columns: template.columns, zones: template.zones.map(zone => ({ ...zone })), board: template.board.map(cell => ({ ...cell, ...(cell.object ? { object: { ...cell.object } } : {}) })), characters, solution: solution.map(placement => ({ characterId: placement.characterId, position: { ...placement.position } })) }
}
