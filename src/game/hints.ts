import { evaluateAllClues } from './clues'
import type { GameCase, Placement, Position } from './types'

export type ReviewHint =
  | { status: 'contradiction'; characterId: string }
  | { status: 'clear' }

export interface PositionHint {
  characterId: string
  position: Position
}

export function reviewInvestigation(caseData: GameCase, placements: Placement[]): ReviewHint {
  const violated = evaluateAllClues(caseData, placements).find(item => item.evaluation === 'violated')
  return violated ? { status: 'contradiction', characterId: violated.characterId } : { status: 'clear' }
}

export function getExclusionHint(
  caseData: GameCase,
  placements: Placement[],
  excluded: Position[],
): PositionHint | null {
  const usedRows = new Set(placements.map(item => item.position.row))
  const usedColumns = new Set(placements.map(item => item.position.column))

  for (const character of caseData.characters) {
    const canonical = caseData.solution.find(item => item.characterId === character.id)
    for (const cell of caseData.board) {
      const isCanonical = canonical?.position.row === cell.row && canonical.position.column === cell.column
      const isOccupied = placements.some(item => item.position.row === cell.row && item.position.column === cell.column)
      const isExcluded = excluded.some(item => item.row === cell.row && item.column === cell.column)
      if (!cell.occupiable || isCanonical || isOccupied || isExcluded || usedRows.has(cell.row) || usedColumns.has(cell.column)) continue
      return { characterId: character.id, position: { row: cell.row, column: cell.column } }
    }
  }
  return null
}

export function getRevealHint(
  caseData: GameCase,
  placements: Placement[],
  selectedId: string | null,
): PositionHint | null {
  const isUnresolved = (characterId: string) => {
    const canonical = caseData.solution.find(item => item.characterId === characterId)
    const current = placements.find(item => item.characterId === characterId)
    return !canonical || !current || canonical.position.row !== current.position.row || canonical.position.column !== current.position.column
  }
  const character = selectedId && isUnresolved(selectedId)
    ? caseData.characters.find(item => item.id === selectedId)
    : caseData.characters.find(item => isUnresolved(item.id))
  const placement = character && caseData.solution.find(item => item.characterId === character.id)
  return character && placement ? { characterId: character.id, position: { ...placement.position } } : null
}
