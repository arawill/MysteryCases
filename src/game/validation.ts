import { areAllCluesSatisfied } from './clues'
import { areCollinearContiguousEdgeSegments, edgeSegmentKey, isEdgeFeatureType, isEdgeSegmentOnWall, isWallSideValue } from './edgeFeatures'
import { isDifficultyRating } from './difficulty'
import { areAllGlobalCluesSatisfied } from './globalClues'
import { findKiller, getCell } from './rules'
import { charactersWithTrait } from './traits'
import type { Clue, EdgeFeature, EdgeSegment, GameCase, GlobalClue, Position } from './types'

const exhaustive = (clue: never): never => { throw new Error(`Unsupported clue type: ${(clue as { type: string }).type}`) }
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isPosition = (value: unknown): value is Position => isRecord(value) && Number.isInteger(value.row) && Number.isInteger(value.column)

export function validateCaseDefinition(caseData: GameCase): string[] {
  const errors: string[] = []
  if (!isDifficultyRating(caseData.difficulty)) errors.push('La dificultad debe ser un valor entre 1 y 5.')
  if (caseData.rows <= 0) errors.push('rows debe ser mayor que 0.')
  if (caseData.columns <= 0) errors.push('columns debe ser mayor que 0.')
  if (caseData.characters.length !== caseData.rows) errors.push('El número de personajes debe coincidir con rows.')
  if (caseData.characters.length !== caseData.columns) errors.push('El número de personajes debe coincidir con columns.')
  if (caseData.characters.filter(character => character.isVictim).length !== 1) errors.push('Debe existir exactamente una víctima.')
  const characterIds = new Set<string>(), zoneIds = new Set<string>(), coordinates = new Set<string>(), objectIds = new Set<string>(), clueIds = new Set<string>()
  for (const character of caseData.characters) { if (characterIds.has(character.id)) errors.push(`ID de personaje duplicado: ${character.id}.`); characterIds.add(character.id) }
  for (const zone of caseData.zones) { if (zoneIds.has(zone.id)) errors.push(`ID de zona duplicado: ${zone.id}.`); zoneIds.add(zone.id) }
  const traitIds = validateTraitDefinitions(caseData, errors)
  for (const character of caseData.characters) validateCharacterTraits(character, traitIds, errors)
  if (caseData.board.length !== caseData.rows * caseData.columns) errors.push('El tablero no contiene rows * columns celdas.')
  for (const cell of caseData.board) {
    const key = `${cell.row}:${cell.column}`
    if (coordinates.has(key)) errors.push(`Coordenada de celda duplicada: ${key}.`)
    coordinates.add(key)
    if (cell.row < 1 || cell.row > caseData.rows || cell.column < 1 || cell.column > caseData.columns) errors.push(`Celda fuera del tablero: ${key}.`)
    if (!zoneIds.has(cell.zoneId)) errors.push(`Zona inexistente en celda ${key}: ${cell.zoneId}.`)
    if (cell.object && cell.occupiable !== cell.object.occupiable) errors.push(`Incoherencia occupiable en celda ${key}: la celda y el objeto no coinciden.`)
    if (cell.object) objectIds.add(cell.object.id)
  }
  const edgeFeatureValidation = validateEdgeFeatures(caseData, errors)
  const edgeFeatureTypes = edgeFeatureValidation.types
  for (const character of caseData.characters) for (const clue of character.clues) { if (clueIds.has(clue.id)) errors.push(`ID de pista duplicado: ${clue.id}.`); clueIds.add(clue.id); validateClue(clue, character.id, caseData, zoneIds, objectIds, traitIds, edgeFeatureTypes, errors) }
  for (const clue of caseData.globalClues ?? []) { if (clueIds.has(clue.id)) errors.push(`ID de pista duplicado: ${clue.id}.`); clueIds.add(clue.id); validateGlobalClue(clue, caseData, zoneIds, objectIds, traitIds, errors) }
  const canonicalIds = new Set<string>(), canonicalRows = new Set<number>(), canonicalColumns = new Set<number>()
  if (caseData.solution.length !== caseData.characters.length) errors.push('La solución canónica debe contener una posición por personaje.')
  for (const placement of caseData.solution) {
    if (canonicalIds.has(placement.characterId)) errors.push(`Personaje repetido en solución canónica: ${placement.characterId}.`)
    canonicalIds.add(placement.characterId)
    if (!characterIds.has(placement.characterId)) errors.push(`Personaje inexistente en solución canónica: ${placement.characterId}.`)
    if (placement.position.row < 1 || placement.position.row > caseData.rows || placement.position.column < 1 || placement.position.column > caseData.columns) errors.push(`Posición canónica fuera del tablero: ${placement.characterId}.`)
    const cell = getCell(caseData.board, placement.position)
    if (!cell) errors.push(`La solución canónica apunta a una celda inexistente: ${placement.characterId}.`)
    else if (!cell.occupiable) errors.push(`La solución canónica usa una celda bloqueada: ${placement.characterId}.`)
    if (canonicalRows.has(placement.position.row)) errors.push(`Fila duplicada en solución canónica: ${placement.position.row}.`)
    canonicalRows.add(placement.position.row)
    if (canonicalColumns.has(placement.position.column)) errors.push(`Columna duplicada en solución canónica: ${placement.position.column}.`)
    canonicalColumns.add(placement.position.column)
  }
  for (const id of characterIds) if (!canonicalIds.has(id)) errors.push(`Falta personaje en solución canónica: ${id}.`)
  const evaluationCase: GameCase = { ...caseData, edgeFeatures: edgeFeatureValidation.safeFeatures }
  if (caseData.solution.length === caseData.characters.length && (!areAllCluesSatisfied(evaluationCase, caseData.solution) || !areAllGlobalCluesSatisfied(evaluationCase, caseData.solution))) errors.push('La solución canónica no satisface todas las pistas.')
  if (!findKiller(caseData, caseData.solution)) errors.push('La solución canónica no identifica un asesino único.')
  return errors
}

function validateEdgeFeatures(caseData: GameCase, errors: string[]): { types: Set<EdgeFeature['type']>; safeFeatures: EdgeFeature[] } {
  const types = new Set<EdgeFeature['type']>(), rawFeatures: unknown = caseData.edgeFeatures
  const safeFeatures: EdgeFeature[] = []
  if (rawFeatures === undefined) return { types, safeFeatures }
  if (!Array.isArray(rawFeatures)) { errors.push('edgeFeatures debe ser un array.'); return { types, safeFeatures } }
  const ids = new Set<string>(), occupiedSegments = new Set<string>()
  rawFeatures.forEach((rawFeature, index) => {
    const prefix = `Edge feature ${index + 1}`
    if (!isRecord(rawFeature)) { errors.push(`${prefix} debe ser un objeto válido.`); return }
    const id = rawFeature.id
    if (typeof id !== 'string' || id.trim().length === 0) errors.push(`${prefix} tiene un id inválido.`)
    else { if (ids.has(id)) errors.push(`ID de edge feature duplicado: ${id}.`); ids.add(id) }
    if (typeof rawFeature.label !== 'string' || rawFeature.label.trim().length === 0) errors.push(`${prefix} tiene un label inválido.`)
    if (!isEdgeFeatureType(rawFeature.type)) errors.push(`${prefix} tiene un type inválido.`)
    else types.add(rawFeature.type)
    if (!Array.isArray(rawFeature.segments)) { errors.push(`${prefix} debe incluir un array de segmentos.`); return }
    if (rawFeature.segments.length < 1 || rawFeature.segments.length > 2) errors.push(`${prefix} debe tener uno o dos segmentos.`)
    const segments: EdgeSegment[] = []
    rawFeature.segments.forEach((rawSegment, segmentIndex) => {
      if (!isRecord(rawSegment) || !isPosition(rawSegment.position) || !isWallSideValue(rawSegment.side)) { errors.push(`${prefix}, segmento ${segmentIndex + 1} es inválido.`); return }
      const segment: EdgeSegment = { position: rawSegment.position, side: rawSegment.side }
      const cell = getCell(caseData.board, segment.position)
      if (!cell) errors.push(`${prefix}, segmento ${segmentIndex + 1} apunta a una celda inexistente.`)
      else if (!isEdgeSegmentOnWall(segment, caseData.board)) errors.push(`${prefix}, segmento ${segmentIndex + 1} no está sobre una pared.`)
      const key = edgeSegmentKey(segment)
      if (occupiedSegments.has(key)) errors.push(`${prefix}, segmento ${segmentIndex + 1} duplica un borde físico.`)
      occupiedSegments.add(key)
      segments.push(segment)
    })
    if (isEdgeFeatureType(rawFeature.type)) safeFeatures.push({ id: typeof id === 'string' ? id : '', type: rawFeature.type, label: typeof rawFeature.label === 'string' ? rawFeature.label : '', segments })
    if (segments.length === 2 && !areCollinearContiguousEdgeSegments(segments[0], segments[1])) errors.push(`${prefix} debe usar dos segmentos colineales y contiguos.`)
  })
  return { types, safeFeatures }
}

function validateTraitDefinitions(caseData: GameCase, errors: string[]): Set<string> {
  const rawDefinitions: unknown = caseData.traitDefinitions
  const ids = new Set<string>()
  if (rawDefinitions === undefined) return ids
  if (!Array.isArray(rawDefinitions)) { errors.push('traitDefinitions debe ser un array.'); return ids }
  rawDefinitions.forEach((definition, index) => {
    const prefix = `Trait ${index + 1}`
    if (!isRecord(definition)) { errors.push(`${prefix} debe ser un objeto válido.`); return }
    if (typeof definition.id !== 'string' || definition.id.trim().length === 0) errors.push(`${prefix} tiene un id inválido.`)
    else { if (ids.has(definition.id)) errors.push(`ID de trait duplicado: ${definition.id}.`); ids.add(definition.id) }
    if (typeof definition.label !== 'string' || definition.label.trim().length === 0) errors.push(`${prefix} tiene un label inválido.`)
  })
  return ids
}

function validateCharacterTraits(character: GameCase['characters'][number], traitIds: Set<string>, errors: string[]) {
  const rawTraitIds: unknown = character.traitIds
  if (rawTraitIds === undefined) return
  if (!Array.isArray(rawTraitIds)) { errors.push(`traitIds de ${character.id} debe ser un array.`); return }
  const assigned = new Set<string>()
  rawTraitIds.forEach((traitId, index) => {
    if (typeof traitId !== 'string' || traitId.trim().length === 0) { errors.push(`traitIds de ${character.id} contiene un valor inválido en posición ${index + 1}.`); return }
    if (assigned.has(traitId)) errors.push(`traitIds de ${character.id} repite ${traitId}.`)
    assigned.add(traitId)
    if (!traitIds.has(traitId)) errors.push(`traitIds de ${character.id} referencia un trait inexistente: ${traitId}.`)
  })
}

function validateClue(clue: Clue, subjectId: string, caseData: GameCase, zoneIds: Set<string>, objectIds: Set<string>, traitIds: Set<string>, edgeFeatureTypes: Set<EdgeFeature['type']>, errors: string[]) {
  const target = (id: string) => { if (!caseData.characters.some(character => character.id === id)) errors.push(`La pista ${clue.id} referencia un personaje inexistente: ${id}.`); if (id === subjectId) errors.push(`La pista ${clue.id} no puede referirse al propio personaje.`) }
  const object = (id: string) => { if (!objectIds.has(id)) errors.push(`La pista ${clue.id} referencia un objeto inexistente: ${id}.`) }
  const zone = (id: string) => { if (!zoneIds.has(id)) errors.push(`La pista ${clue.id} referencia una zona inexistente: ${id}.`) }
  const featureType = (type: unknown) => { if (!isEdgeFeatureType(type)) errors.push(`La pista ${clue.id} tiene un tipo de edge feature inválido.`); else if (!edgeFeatureTypes.has(type)) errors.push(`La pista ${clue.id} referencia un edge feature inexistente: ${type}.`) }
  const trait = (id: string, companion: boolean) => {
    if (!traitIds.has(id)) errors.push(`La pista ${clue.id} referencia un trait inexistente: ${id}.`)
    const owners = charactersWithTrait(caseData, id)
    if (owners.length === 0) errors.push(`La pista ${clue.id} usa un trait no asignado: ${id}.`)
    if (companion && !owners.some(character => character.id !== subjectId)) errors.push(`La pista ${clue.id} necesita otro personaje con el trait: ${id}.`)
    return owners.filter(character => character.id !== subjectId).length
  }
  const choices = (ids: string[], kind: 'zona' | 'objeto') => { if (ids.length < 2) errors.push(`La pista ${clue.id} debe incluir al menos dos ${kind}s.`); if (new Set(ids).size !== ids.length) errors.push(`La pista ${clue.id} no puede repetir ${kind}s.`); ids.forEach(kind === 'zona' ? zone : object) }
  switch (clue.type) {
    case 'row': if (clue.row < 1 || clue.row > caseData.rows) errors.push(`La pista ${clue.id} tiene una fila inválida.`); return
    case 'column': if (clue.column < 1 || clue.column > caseData.columns) errors.push(`La pista ${clue.id} tiene una columna inválida.`); return
    case 'zone': case 'notZone': zone(clue.zoneId); return
    case 'onObject': case 'besideObject': case 'notOnObject': case 'notBesideObject': object(clue.objectId); return
    case 'oneOfZones': choices(clue.zoneIds, 'zona'); return
    case 'oneOfObjects': choices(clue.objectIds, 'objeto'); return
    case 'aloneInZone': case 'notAloneInZone': return
    case 'ownZoneOccupancyCount': if (!Number.isInteger(clue.count) || clue.count < 1 || clue.count > caseData.characters.length) errors.push(`La pista ${clue.id} tiene un conteo de ocupación inválido.`); return
    case 'cornerOfBoard': case 'cornerOfZone': case 'besideWall': case 'notBesideWall': return
    case 'besideEdgeFeature': case 'notBesideEdgeFeature': featureType(clue.featureType); return
    case 'withTraitInZone': case 'withoutTraitInZone': trait(clue.traitId, true); return
    case 'companionTraitCount': { const maximum = trait(clue.traitId, true); if (!Number.isInteger(clue.count) || clue.count < 1 || clue.count > maximum) errors.push(`La pista ${clue.id} tiene un conteo de compañeros con trait inválido.`); return }
    case 'rowOffsetFromCharacter': target(clue.targetCharacterId); if (!Number.isInteger(clue.rowOffset) || clue.rowOffset === 0 || Math.abs(clue.rowOffset) >= caseData.rows) errors.push(`La pista ${clue.id} tiene un offset de fila inválido.`); return
    case 'northOfCharacter': case 'southOfCharacter': case 'sameZoneAsCharacter': case 'besideCharacter': target(clue.targetCharacterId); return
    default: return exhaustive(clue)
  }
}

function validateGlobalClue(clue: GlobalClue, caseData: GameCase, zoneIds: Set<string>, objectIds: Set<string>, traitIds: Set<string>, errors: string[]) {
  const count = (value: number, maximum: number) => Number.isInteger(value) && value >= 0 && value <= maximum
  switch (clue.type) {
    case 'emptyZoneCount': if (!count(clue.count, caseData.zones.length)) errors.push(`La evidencia ${clue.id} tiene un conteo de zonas vacías inválido.`); return
    case 'zoneOccupancyCount': if (!zoneIds.has(clue.zoneId)) errors.push(`La evidencia ${clue.id} referencia una zona inexistente: ${clue.zoneId}.`); if (!count(clue.count, caseData.characters.length)) errors.push(`La evidencia ${clue.id} tiene un conteo de ocupación inválido.`); return
    case 'objectOccupancyCount': { const maximum = caseData.board.filter(cell => cell.occupiable && cell.object?.id === clue.objectId).length; if (!objectIds.has(clue.objectId)) errors.push(`La evidencia ${clue.id} referencia un objeto inexistente: ${clue.objectId}.`); if (!count(clue.count, Math.min(maximum, caseData.characters.length))) errors.push(`La evidencia ${clue.id} tiene un conteo de objeto inválido.`); return }
    case 'zoneTraitCount': { const maximum = charactersWithTrait(caseData, clue.traitId).length; if (!zoneIds.has(clue.zoneId)) errors.push(`La evidencia ${clue.id} referencia una zona inexistente: ${clue.zoneId}.`); if (!traitIds.has(clue.traitId)) errors.push(`La evidencia ${clue.id} referencia un trait inexistente: ${clue.traitId}.`); if (maximum === 0) errors.push(`La evidencia ${clue.id} usa un trait no asignado: ${clue.traitId}.`); if (!count(clue.count, maximum)) errors.push(`La evidencia ${clue.id} tiene un conteo de trait inválido.`); return }
    default: return exhaustive(clue)
  }
}
