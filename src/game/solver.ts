import { areAllCluesSatisfied, hasViolatedClue } from './clues'
import type { BoardCell, GameCase, Placement } from './types'

export interface SolveOptions { maxSolutions?: number }
export interface SolveResult { solutions: Placement[][]; solutionsFound: number }
const defaultOptions: Required<SolveOptions> = { maxSolutions: 2 }
const candidatesFor = (characterId: string, caseData: GameCase, placements: Placement[], cells: BoardCell[]) => {
  const rows = new Set(placements.map(placement => placement.position.row)); const columns = new Set(placements.map(placement => placement.position.column))
  return cells.filter(cell => !rows.has(cell.row) && !columns.has(cell.column)).filter(cell => !hasViolatedClue(caseData, [...placements, { characterId, position: { row: cell.row, column: cell.column } }]))
}
export function solveCase(caseData: GameCase, options: SolveOptions = {}): SolveResult {
  const maxSolutions = options.maxSolutions ?? defaultOptions.maxSolutions
  const cells = caseData.board.filter(cell => cell.occupiable)
  const solutions: Placement[][] = []
  const search = (placements: Placement[]) => {
    if (solutions.length >= maxSolutions) return
    if (placements.length === caseData.characters.length) { if (areAllCluesSatisfied(caseData, placements)) solutions.push(placements.map(placement => ({ characterId: placement.characterId, position: { ...placement.position } }))); return }
    const unassigned = caseData.characters.filter(character => !placements.some(placement => placement.characterId === character.id))
    const ranked = unassigned.map(character => ({ character, candidates: candidatesFor(character.id, caseData, placements, cells) })).sort((a, b) => a.candidates.length - b.candidates.length || caseData.characters.indexOf(a.character) - caseData.characters.indexOf(b.character))
    const choice = ranked[0]
    if (!choice || choice.candidates.length === 0) return
    for (const cell of choice.candidates) { if (solutions.length >= maxSolutions) return; search([...placements, { characterId: choice.character.id, position: { row: cell.row, column: cell.column } }]) }
  }
  if (maxSolutions > 0) search([])
  return { solutions, solutionsFound: solutions.length }
}
