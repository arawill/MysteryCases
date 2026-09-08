import { evaluateClue } from '../clues'
import { evaluateGlobalClue } from '../globalClues'
import { getCell, isBeside } from '../rules'
import { isBesideWall, isBoardCorner, isZoneCorner } from '../spatial'
import { isCellBesideEdgeFeature } from '../edgeFeatures'
import { characterHasTrait, getTraitLabel } from '../traits'
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
const edgeLabel = (type: 'window' | 'door') => type === 'window' ? 'ventana' : 'puerta'
const traitLabel = (caseData: GameCase, traitId: string) => getTraitLabel(caseData, traitId) ?? traitId
const clueCase = (template: GenerationTemplate, solution: Placement[]): GameCase => ({ ...template, zones: template.zones.map(zone => ({ ...zone })), board: template.board.map(cell => ({ ...cell, ...(cell.object ? { object: { ...cell.object } } : {}) })), characters: template.characters.map(character => ({ ...character, ...(character.traitIds ? { traitIds: [...character.traitIds] } : {}), clues: [] })), ...(template.edgeFeatures ? { edgeFeatures: template.edgeFeatures.map(feature => ({ ...feature, segments: feature.segments.map(segment => ({ position: { ...segment.position }, side: segment.side })) })) } : {}), ...(template.traitDefinitions ? { traitDefinitions: template.traitDefinitions.map(definition => ({ ...definition })) } : {}), solution: solution.map(placement => ({ characterId: placement.characterId, position: { ...placement.position } })) })
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
    const edgeTypes = [...new Set((template.edgeFeatures ?? []).map(feature => feature.type))]
    for (const featureType of edgeTypes) {
      const beside = (template.edgeFeatures ?? []).some(feature => feature.type === featureType && isCellBesideEdgeFeature(cell, feature, template.board))
      add(pool, subject.id, beside ? { id: `gen-${subject.id}-beside-${featureType}`, type: 'besideEdgeFeature', text: `Estaba junto a una ${edgeLabel(featureType)}.`, featureType } : { id: `gen-${subject.id}-not-beside-${featureType}`, type: 'notBesideEdgeFeature', text: `No estaba junto a ninguna ${edgeLabel(featureType)}.`, featureType })
    }
    for (const definition of template.traitDefinitions ?? []) {
      const companions = solution.filter(item => item.characterId !== subject.id && getCell(template.board, item.position)?.zoneId === cell.zoneId && characterHasTrait(template.characters.find(character => character.id === item.characterId) ?? { traitIds: [] }, definition.id)).length
      const label = traitLabel(caseData, definition.id)
      if (companions === 0) add(pool, subject.id, { id: `gen-${subject.id}-without-trait-${definition.id}`, type: 'withoutTraitInZone', text: `No hab\u00EDa ninguna otra persona con el rasgo \u00AB${label}\u00BB en su habitaci\u00F3n.`, traitId: definition.id })
      else {
        add(pool, subject.id, { id: `gen-${subject.id}-with-trait-${definition.id}`, type: 'withTraitInZone', text: `Compart\u00EDa habitaci\u00F3n con otra persona con el rasgo \u00AB${label}\u00BB.`, traitId: definition.id })
        const people = companions === 1 ? 'una persona m\u00E1s' : `${companions} personas m\u00E1s`
        add(pool, subject.id, { id: `gen-${subject.id}-trait-count-${definition.id}-${companions}`, type: 'companionTraitCount', text: `En su habitaci\u00F3n hab\u00EDa exactamente ${people} con el rasgo \u00AB${label}\u00BB.`, traitId: definition.id, count: companions })
      }
    }
    for (const target of template.characters) {
      if (target.id === subject.id) continue
      const targetPlacement = solution.find(candidate => candidate.characterId === target.id); if (!targetPlacement) continue
      const targetCell = getCell(template.board, targetPlacement.position); if (!targetCell) continue
      if (cell.row < targetCell.row) add(pool, subject.id, { id: `gen-${subject.id}-north-of-${target.id}`, type: 'northOfCharacter', text: `Estaba al norte de ${target.name}.`, targetCharacterId: target.id })
      if (cell.row > targetCell.row) add(pool, subject.id, { id: `gen-${subject.id}-south-of-${target.id}`, type: 'southOfCharacter', text: `Estaba al sur de ${target.name}.`, targetCharacterId: target.id })
      const offset = cell.row - targetCell.row, direction = offset > 0 ? 'al sur' : 'al norte', amount = Math.abs(offset), distance = amount === 1 ? 'una fila' : `${amount} filas`
      add(pool, subject.id, { id: `gen-${subject.id}-row-offset-${target.id}`, type: 'rowOffsetFromCharacter', text: `Estaba exactamente ${distance} ${direction} de ${target.name}.`, targetCharacterId: target.id, rowOffset: offset })
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
  pool.push({ kind: 'global', clue: { id: 'gen-global-empty-zones', type: 'emptyZoneCount', text: empty === 0 ? 'No había habitaciones vacías.' : empty === 1 ? 'Había exactamente una habitación vacía.' : `Había exactamente ${empty} habitaciones vacías.`, count: empty } })
  for (const zone of template.zones) { const count = solution.filter(item => getCell(template.board, item.position)?.zoneId === zone.id).length; const text = count === 0 ? `En ${zone.name.toLowerCase()} no había ninguna persona.` : count === 1 ? `En ${zone.name.toLowerCase()} había exactamente una persona.` : `En ${zone.name.toLowerCase()} había exactamente ${count} personas.`; pool.push({ kind: 'global', clue: { id: `gen-global-zone-${zone.id}`, type: 'zoneOccupancyCount', text, zoneId: zone.id, count } }) }
  for (const objectId of objectIds(template).filter(id => isObjectOccupiableSomewhere(template, id))) { const count = solution.filter(item => getCell(template.board, item.position)?.object?.id === objectId).length; const text = count === 0 ? `Ninguna persona estaba sobre ${objectLabel(template, objectId)}.` : count === 1 ? `Exactamente una persona estaba sobre ${objectLabel(template, objectId)}.` : `Exactamente ${count} personas estaban sobre ${objectLabel(template, objectId)}.`; pool.push({ kind: 'global', clue: { id: `gen-global-object-${objectId}`, type: 'objectOccupancyCount', text, objectId, count } }) }
  for (const zone of template.zones) for (const definition of template.traitDefinitions ?? []) {
    const count = solution.filter(item => getCell(template.board, item.position)?.zoneId === zone.id && characterHasTrait(template.characters.find(character => character.id === item.characterId) ?? { traitIds: [] }, definition.id)).length
    const label = traitLabel(caseData, definition.id)
    const text = count === 0 ? `En ${zone.name.toLowerCase()} no hab\u00EDa nadie con el rasgo \u00AB${label}\u00BB.` : count === 1 ? `En ${zone.name.toLowerCase()} hab\u00EDa exactamente una persona con el rasgo \u00AB${label}\u00BB.` : `En ${zone.name.toLowerCase()} hab\u00EDa exactamente ${count} personas con el rasgo \u00AB${label}\u00BB.`
    pool.push({ kind: 'global', clue: { id: `gen-global-zone-trait-${zone.id}-${definition.id}`, type: 'zoneTraitCount', text, zoneId: zone.id, traitId: definition.id, count } })
  }
  for (const candidate of pool) if (evaluateGlobalClue(candidate.clue, caseData, solution) !== 'satisfied') throw new Error(`Generated an invalid global clue: ${candidate.clue.id}.`)
  return pool
}
export const evaluateCandidateConstraint = (candidate: CandidateConstraint, caseData: GameCase, placements: Placement[]) => candidate.kind === 'character' ? evaluateClue(candidate.clue, candidate.characterId, caseData, placements) : evaluateGlobalClue(candidate.clue, caseData, placements)
export function applyCandidates(template: GenerationTemplate, solution: Placement[], candidates: readonly CandidateClue[]): GameCase {
  const byCharacter = new Map<string, Clue[]>(); for (const candidate of candidates) byCharacter.set(candidate.characterId, [...(byCharacter.get(candidate.characterId) ?? []), candidate.clue])
  const characters: Character[] = template.characters.map(character => ({ ...character, ...(character.traitIds ? { traitIds: [...character.traitIds] } : {}), clues: [...(byCharacter.get(character.id) ?? [])] }))
  return { id: template.id, title: template.title, intro: template.intro, difficulty: template.difficulty, rows: template.rows, columns: template.columns, zones: template.zones.map(zone => ({ ...zone })), board: template.board.map(cell => ({ ...cell, ...(cell.object ? { object: { ...cell.object } } : {}) })), characters, ...(template.edgeFeatures ? { edgeFeatures: template.edgeFeatures.map(feature => ({ ...feature, segments: feature.segments.map(segment => ({ position: { ...segment.position }, side: segment.side })) })) } : {}), ...(template.traitDefinitions ? { traitDefinitions: template.traitDefinitions.map(definition => ({ ...definition })) } : {}), solution: solution.map(placement => ({ characterId: placement.characterId, position: { ...placement.position } })) }
}
export function applyConstraints(template: GenerationTemplate, solution: Placement[], candidates: readonly CandidateConstraint[]): GameCase {
  const characters = candidates.filter((candidate): candidate is CandidateCharacterClue => candidate.kind === 'character')
  const globals = candidates.filter((candidate): candidate is CandidateGlobalClue => candidate.kind === 'global')
  const caseData = applyCandidates(template, solution, characters)
  return globals.length ? { ...caseData, globalClues: globals.map(candidate => candidate.clue) } : caseData
}
