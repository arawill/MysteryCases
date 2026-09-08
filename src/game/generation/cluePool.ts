import { evaluateClue } from '../clues'
import { evaluateGlobalClue } from '../globalClues'
import { getCell, isBeside } from '../rules'
import { isBesideWall, isBoardCorner, isZoneCorner } from '../spatial'
import type { Character, Clue, GameCase, GlobalClue, Placement } from '../types'
import type { GenerationTemplate } from './types'

export interface CandidateCharacterClue { kind: 'character'; characterId: string; clue: Clue }
export interface CandidateGlobalClue { kind: 'global'; clue: GlobalClue }
export type CandidateConstraint = CandidateCharacterClue | CandidateGlobalClue
export type CandidateClue = CandidateCharacterClue
const objectIds = (template: GenerationTemplate) => [...new Set(template.board.flatMap(cell => cell.object ? [cell.object.id] : []))]
export const isObjectOccupiableSomewhere = (template: GenerationTemplate, objectId: string) => template.board.some(cell => cell.object?.id === objectId && cell.occupiable && cell.object.occupiable)
export const isZoneOccupiable = (template: GenerationTemplate, zoneId: string) => template.board.some(cell => cell.zoneId === zoneId && cell.occupiable)
export const canStandBesideObject = (template: GenerationTemplate, objectId: string) => template.board.filter(cell => cell.object?.id === objectId).some(objectCell => template.board.some(candidate => candidate.occupiable && isBeside(candidate, objectCell, template.board)))
const objectLabel = (template: GenerationTemplate, id: string) => template.board.find(cell => cell.object?.id === id)?.object?.label ?? `el objeto ${id}`
const zoneName = (template: GenerationTemplate, id: string) => template.zones.find(zone => zone.id === id)?.name ?? id
const clueCase = (template: GenerationTemplate, solution: Placement[]): GameCase => ({ ...template, zones: template.zones.map(zone => ({ ...zone })), board: template.board.map(cell => ({ ...cell, ...(cell.object ? { object: { ...cell.object } } : {}) })), characters: template.characters.map(character => ({ ...character, clues: [] })), solution: solution.map(placement => ({ characterId: placement.characterId, position: { ...placement.position } })) })
const add = (pool: CandidateClue[], characterId: string, clue: Clue) => pool.push({ kind: 'character', characterId, clue })
export function buildTrueCluePool(template: GenerationTemplate, solution: Placement[]): CandidateClue[] {
  const pool: CandidateClue[] = []; const caseData = clueCase(template, solution); const ids = objectIds(template); const occupiableObjectIds = new Set(ids.filter(id => isObjectOccupiableSomewhere(template, id))); const occupiableZoneIds = new Set(template.zones.filter(zone => isZoneOccupiable(template, zone.id)).map(zone => zone.id)); const besidePossibleObjectIds = new Set(ids.filter(id => canStandBesideObject(template, id)))
  for (const subject of template.characters) {
    const placement = solution.find(candidate => candidate.characterId === subject.id); if (!placement) throw new Error(`Missing generated placement for ${subject.id}.`)
    const cell = getCell(template.board, placement.position); if (!cell) throw new Error(`Missing board cell for ${subject.id}.`)
    add(pool, subject.id, { id: `gen-${subject.id}-row-${cell.row}`, type: 'row', text: `Estaba en la fila ${cell.row}.`, row: cell.row })
    add(pool, subject.id, { id: `gen-${subject.id}-column-${cell.column}`, type: 'column', text: `Ocupaba la columna ${cell.column}.`, column: cell.column })
    add(pool, subject.id, { id: `gen-${subject.id}-zone-${cell.zoneId}`, type: 'zone', text: `Estaba en ${zoneName(template, cell.zoneId).toLowerCase()}.`, zoneId: cell.zoneId })
    if (cell.object) add(pool, subject.id, { id: `gen-${subject.id}-on-object-${cell.object.id}`, type: 'onObject', text: `Estaba en una casilla con ${objectLabel(template, cell.object.id)}.`, objectId: cell.object.id })
    if (isBoardCorner(cell, template.rows, template.columns)) add(pool, subject.id, { id: `gen-${subject.id}-board-corner`, type: 'cornerOfBoard', text: 'Estaba en una esquina del plano.', })
    if (isZoneCorner(cell, template.board)) add(pool, subject.id, { id: `gen-${subject.id}-zone-corner`, type: 'cornerOfZone', text: 'Estaba en una esquina de su habitación.', })
    add(pool, subject.id, isBesideWall(cell, template.board) ? { id: `gen-${subject.id}-beside-wall`, type: 'besideWall', text: 'Estaba junto a una pared.' } : { id: `gen-${subject.id}-not-beside-wall`, type: 'notBesideWall', text: 'No estaba junto a una pared.' })
    const otherZones = template.zones.filter(zone => zone.id !== cell.zoneId && isZoneOccupiable(template, zone.id))
    if (otherZones[0]) { const zoneIds = [cell.zoneId, otherZones[0].id].sort(); add(pool, subject.id, { id: `gen-${subject.id}-one-of-zones-${zoneIds.join('-')}`, type: 'oneOfZones', text: `Estaba en ${zoneName(template, zoneIds[0]).toLowerCase()} o ${zoneName(template, zoneIds[1]).toLowerCase()}.`, zoneIds }) }
    if (cell.object?.occupiable) { const alternative = ids.find(id => id !== cell.object?.id && occupiableObjectIds.has(id)); if (alternative) { const objectIds = [cell.object.id, alternative].sort(); add(pool, subject.id, { id: `gen-${subject.id}-one-of-objects-${objectIds.join('-')}`, type: 'oneOfObjects', text: `Estaba sobre ${objectLabel(template, objectIds[0])} o ${objectLabel(template, objectIds[1])}.`, objectIds }) } }
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
      const offset = cell.row - targetCell.row, direction = offset > 0 ? 'al sur' : 'al norte', amount = Math.abs(offset), rows = amount === 1 ? 'fila' : 'filas'
      add(pool, subject.id, { id: `gen-${subject.id}-row-offset-${target.id}`, type: 'rowOffsetFromCharacter', text: `Estaba exactamente ${amount} ${rows} ${direction} de ${target.name}.`, targetCharacterId: target.id, rowOffset: offset })
      if (cell.zoneId === targetCell.zoneId) add(pool, subject.id, { id: `gen-${subject.id}-same-zone-${target.id}`, type: 'sameZoneAsCharacter', text: `Estaba en la misma habitación que ${target.name}.`, targetCharacterId: target.id })
      if (isBeside(cell, targetCell, template.board)) add(pool, subject.id, { id: `gen-${subject.id}-beside-${target.id}`, type: 'besideCharacter', text: `Estaba junto a ${target.name}.`, targetCharacterId: target.id })
    }
  }
  for (const subject of template.characters) { const placement = solution.find(item => item.characterId === subject.id); const cell = placement && getCell(template.board, placement.position); if (!cell) continue; const occupancy = solution.filter(item => getCell(template.board, item.position)?.zoneId === cell.zoneId).length; if (occupancy === 1) add(pool, subject.id, { id: `gen-${subject.id}-alone`, type: 'aloneInZone', text: 'No había nadie más en su habitación.' }); else { add(pool, subject.id, { id: `gen-${subject.id}-not-alone`, type: 'notAloneInZone', text: 'Había al menos otra persona en su habitación.' }); add(pool, subject.id, { id: `gen-${subject.id}-zone-count-${occupancy}`, type: 'ownZoneOccupancyCount', text: `En su habitación había exactamente ${occupancy} personas.`, count: occupancy }) } }
  for (const candidate of pool) if (evaluateClue(candidate.clue, candidate.characterId, caseData, solution) !== 'satisfied') throw new Error(`Generated an invalid clue: ${candidate.clue.id}.`)
  return pool
}
export function buildTrueGlobalCluePool(template: GenerationTemplate, solution: Placement[]): CandidateGlobalClue[] {
  const caseData = clueCase(template, solution), pool: CandidateGlobalClue[] = []
  const empty = template.zones.filter(zone => !solution.some(item => getCell(template.board, item.position)?.zoneId === zone.id)).length
  pool.push({ kind: 'global', clue: { id: 'gen-global-empty-zones', type: 'emptyZoneCount', text: empty === 0 ? 'No había habitaciones vacías.' : `Había exactamente ${empty} habitaciones vacías.`, count: empty } })
  for (const zone of template.zones) { const count = solution.filter(item => getCell(template.board, item.position)?.zoneId === zone.id).length; pool.push({ kind: 'global', clue: { id: `gen-global-zone-${zone.id}`, type: 'zoneOccupancyCount', text: `En ${zone.name.toLowerCase()} había exactamente ${count} personas.`, zoneId: zone.id, count } }) }
  for (const objectId of objectIds(template).filter(id => isObjectOccupiableSomewhere(template, id))) { const count = solution.filter(item => getCell(template.board, item.position)?.object?.id === objectId).length; pool.push({ kind: 'global', clue: { id: `gen-global-object-${objectId}`, type: 'objectOccupancyCount', text: `Exactamente ${count} personas estaban sobre ${objectLabel(template, objectId)}.`, objectId, count } }) }
  for (const candidate of pool) if (evaluateGlobalClue(candidate.clue, caseData, solution) !== 'satisfied') throw new Error(`Generated an invalid global clue: ${candidate.clue.id}.`)
  return pool
}
export const evaluateCandidateConstraint = (candidate: CandidateConstraint, caseData: GameCase, placements: Placement[]) => candidate.kind === 'character' ? evaluateClue(candidate.clue, candidate.characterId, caseData, placements) : evaluateGlobalClue(candidate.clue, caseData, placements)
export function applyCandidates(template: GenerationTemplate, solution: Placement[], candidates: readonly CandidateClue[]): GameCase {
  const byCharacter = new Map<string, Clue[]>(); for (const candidate of candidates) byCharacter.set(candidate.characterId, [...(byCharacter.get(candidate.characterId) ?? []), candidate.clue])
  const characters: Character[] = template.characters.map(character => ({ ...character, clues: [...(byCharacter.get(character.id) ?? [])] }))
  return { id: template.id, title: template.title, intro: template.intro, difficulty: template.difficulty, rows: template.rows, columns: template.columns, zones: template.zones.map(zone => ({ ...zone })), board: template.board.map(cell => ({ ...cell, ...(cell.object ? { object: { ...cell.object } } : {}) })), characters, solution: solution.map(placement => ({ characterId: placement.characterId, position: { ...placement.position } })) }
}
export function applyConstraints(template: GenerationTemplate, solution: Placement[], candidates: readonly CandidateConstraint[]): GameCase {
  const characters = candidates.filter((candidate): candidate is CandidateCharacterClue => candidate.kind === 'character')
  const globals = candidates.filter((candidate): candidate is CandidateGlobalClue => candidate.kind === 'global')
  const caseData = applyCandidates(template, solution, characters)
  return globals.length ? { ...caseData, globalClues: globals.map(candidate => candidate.clue) } : caseData
}
