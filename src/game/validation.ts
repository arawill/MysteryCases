import { areAllCluesSatisfied } from './clues'
import { isDifficultyRating } from './difficulty'
import { findKiller, getCell } from './rules'
import { areAllGlobalCluesSatisfied } from './globalClues'
import type { Clue, GameCase, GlobalClue } from './types'

const exhaustive = (clue: never): never => { throw new Error(`Unsupported clue type: ${(clue as { type: string }).type}`) }

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
  if (caseData.board.length !== caseData.rows * caseData.columns) errors.push('El tablero no contiene rows * columns celdas.')
  for (const cell of caseData.board) { const key = `${cell.row}:${cell.column}`; if (coordinates.has(key)) errors.push(`Coordenada de celda duplicada: ${key}.`); coordinates.add(key); if (cell.row < 1 || cell.row > caseData.rows || cell.column < 1 || cell.column > caseData.columns) errors.push(`Celda fuera del tablero: ${key}.`); if (!zoneIds.has(cell.zoneId)) errors.push(`Zona inexistente en celda ${key}: ${cell.zoneId}.`); if (cell.object && cell.occupiable !== cell.object.occupiable) errors.push(`Incoherencia occupiable en celda ${key}: la celda y el objeto no coinciden.`); if (cell.object) objectIds.add(cell.object.id) }
  for (const character of caseData.characters) for (const clue of character.clues) { if (clueIds.has(clue.id)) errors.push(`ID de pista duplicado: ${clue.id}.`); clueIds.add(clue.id); validateClue(clue, character.id, caseData, zoneIds, objectIds, errors) }
  for (const clue of caseData.globalClues ?? []) { if (clueIds.has(clue.id)) errors.push(`ID de pista duplicado: ${clue.id}.`); clueIds.add(clue.id); validateGlobalClue(clue, caseData, zoneIds, objectIds, errors) }
  const canonicalIds = new Set<string>(), canonicalRows = new Set<number>(), canonicalColumns = new Set<number>()
  if (caseData.solution.length !== caseData.characters.length) errors.push('La solución canónica debe contener una posición por personaje.')
  for (const placement of caseData.solution) { if (canonicalIds.has(placement.characterId)) errors.push(`Personaje repetido en solución canónica: ${placement.characterId}.`); canonicalIds.add(placement.characterId); if (!characterIds.has(placement.characterId)) errors.push(`Personaje inexistente en solución canónica: ${placement.characterId}.`); if (placement.position.row < 1 || placement.position.row > caseData.rows || placement.position.column < 1 || placement.position.column > caseData.columns) errors.push(`Posición canónica fuera del tablero: ${placement.characterId}.`); const cell = getCell(caseData.board, placement.position); if (!cell) errors.push(`La solución canónica apunta a una celda inexistente: ${placement.characterId}.`); else if (!cell.occupiable) errors.push(`La solución canónica usa una celda bloqueada: ${placement.characterId}.`); if (canonicalRows.has(placement.position.row)) errors.push(`Fila duplicada en solución canónica: ${placement.position.row}.`); canonicalRows.add(placement.position.row); if (canonicalColumns.has(placement.position.column)) errors.push(`Columna duplicada en solución canónica: ${placement.position.column}.`); canonicalColumns.add(placement.position.column) }
  for (const id of characterIds) if (!canonicalIds.has(id)) errors.push(`Falta personaje en solución canónica: ${id}.`)
  if (caseData.solution.length === caseData.characters.length && (!areAllCluesSatisfied(caseData, caseData.solution) || !areAllGlobalCluesSatisfied(caseData, caseData.solution))) errors.push('La solución canónica no satisface todas las pistas.')
  if (!findKiller(caseData, caseData.solution)) errors.push('La solución canónica no identifica un asesino único.')
  return errors
}

function validateClue(clue: Clue, subjectId: string, caseData: GameCase, zoneIds: Set<string>, objectIds: Set<string>, errors: string[]) {
  const target = (id: string) => { if (!caseData.characters.some(character => character.id === id)) errors.push(`La pista ${clue.id} referencia un personaje inexistente: ${id}.`); if (id === subjectId) errors.push(`La pista ${clue.id} no puede referirse al propio personaje.`) }
  const object = (id: string) => { if (!objectIds.has(id)) errors.push(`La pista ${clue.id} referencia un objeto inexistente: ${id}.`) }
  const zone = (id: string) => { if (!zoneIds.has(id)) errors.push(`La pista ${clue.id} referencia una zona inexistente: ${id}.`) }
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
    case 'rowOffsetFromCharacter': target(clue.targetCharacterId); if (!Number.isInteger(clue.rowOffset) || clue.rowOffset === 0 || Math.abs(clue.rowOffset) >= caseData.rows) errors.push(`La pista ${clue.id} tiene un offset de fila inválido.`); return
    case 'northOfCharacter': case 'southOfCharacter': case 'sameZoneAsCharacter': case 'besideCharacter': target(clue.targetCharacterId); return
    default: return exhaustive(clue)
  }
}

function validateGlobalClue(clue: GlobalClue, caseData: GameCase, zoneIds: Set<string>, objectIds: Set<string>, errors: string[]) {
  const count = (value: number, maximum: number) => Number.isInteger(value) && value >= 0 && value <= maximum
  switch (clue.type) {
    case 'emptyZoneCount': if (!count(clue.count, caseData.zones.length)) errors.push(`La evidencia ${clue.id} tiene un conteo de zonas vacías inválido.`); return
    case 'zoneOccupancyCount': if (!zoneIds.has(clue.zoneId)) errors.push(`La evidencia ${clue.id} referencia una zona inexistente: ${clue.zoneId}.`); if (!count(clue.count, caseData.characters.length)) errors.push(`La evidencia ${clue.id} tiene un conteo de ocupación inválido.`); return
    case 'objectOccupancyCount': { const maximum = caseData.board.filter(cell => cell.occupiable && cell.object?.id === clue.objectId).length; if (!objectIds.has(clue.objectId)) errors.push(`La evidencia ${clue.id} referencia un objeto inexistente: ${clue.objectId}.`); if (!count(clue.count, Math.min(maximum, caseData.characters.length))) errors.push(`La evidencia ${clue.id} tiene un conteo de objeto inválido.`); return }
    default: return exhaustive(clue)
  }
}
