import { areAllCluesSatisfied, evaluateClue } from './clues'
import type { BoardCell, Clue, GameCase, Placement } from './types'

export interface SolveOptions { maxSolutions?: number }
export interface SolveResult { solutions: Placement[][]; solutionsFound: number }
export interface SolveStats { nodesVisited: number; candidateChecks: number; prunedByStaticDomain: number; prunedByRelation: number; forwardCheckPrunes: number }
export interface SolveResultWithStats extends SolveResult { stats: SolveStats }
type RelationalClue = Extract<Clue, { targetCharacterId: string }>
const relational = (clue: Clue): clue is RelationalClue => clue.type === 'northOfCharacter' || clue.type === 'southOfCharacter' || clue.type === 'sameZoneAsCharacter' || clue.type === 'besideCharacter' || clue.type === 'rowOffsetFromCharacter'
const emptyStats = (): SolveStats => ({ nodesVisited: 0, candidateChecks: 0, prunedByStaticDomain: 0, prunedByRelation: 0, forwardCheckPrunes: 0 })

export function solveCaseWithStats(caseData: GameCase, options: SolveOptions = {}): SolveResultWithStats {
  const maxSolutions = options.maxSolutions ?? 2
  if (!Number.isInteger(maxSolutions) || maxSolutions < 1) throw new Error('maxSolutions must be a positive integer.')
  const cells = caseData.board.filter(cell => cell.occupiable)
  const cluesByCharacter = new Map(caseData.characters.map(character => [character.id, character.clues]))
  const domains = new Map<string, BoardCell[]>()
  const stats = emptyStats()
  for (const character of caseData.characters) {
    const staticClues = character.clues.filter(clue => !relational(clue))
    domains.set(character.id, cells.filter(cell => staticClues.every(clue => evaluateClue(clue, character.id, caseData, [{ characterId: character.id, position: { row: cell.row, column: cell.column } }]) === 'satisfied')))
  }
  const solutions: Placement[][] = [], placements: Placement[] = [], positions = new Map<string, Placement>(), usedRows = new Set<number>(), usedColumns = new Set<number>()
  const relationValid = (characterId: string, cell: BoardCell) => {
    const proposed = { characterId, position: { row: cell.row, column: cell.column } }
    const relevant: Array<{ owner: string; clue: RelationalClue }> = []
    for (const clue of cluesByCharacter.get(characterId) ?? []) if (relational(clue)) relevant.push({ owner: characterId, clue })
    for (const [owner, ownerClues] of cluesByCharacter) for (const clue of ownerClues) if (relational(clue) && clue.targetCharacterId === characterId && positions.has(owner)) relevant.push({ owner, clue })
    const next = [...placements, proposed]
    return relevant.every(({ owner, clue }) => evaluateClue(clue, owner, caseData, next) !== 'violated')
  }
  const candidates = (characterId: string) => (domains.get(characterId) ?? []).filter(cell => { stats.candidateChecks += 1; if (usedRows.has(cell.row) || usedColumns.has(cell.column)) return false; if (!relationValid(characterId, cell)) { stats.prunedByRelation += 1; return false } return true })
  const search = () => {
    if (solutions.length >= maxSolutions) return
    stats.nodesVisited += 1
    if (placements.length === caseData.characters.length) { if (areAllCluesSatisfied(caseData, placements)) solutions.push(placements.map(item => ({ characterId: item.characterId, position: { ...item.position } }))); return }
    const ranked = caseData.characters.filter(character => !positions.has(character.id)).map((character, index) => ({ character, candidates: candidates(character.id), index })).sort((a, b) => a.candidates.length - b.candidates.length || a.index - b.index)
    const choice = ranked[0]
    if (!choice || choice.candidates.length === 0) return
    for (const cell of choice.candidates) {
      const placement = { characterId: choice.character.id, position: { row: cell.row, column: cell.column } }
      placements.push(placement); positions.set(placement.characterId, placement); usedRows.add(cell.row); usedColumns.add(cell.column)
      const impossible = caseData.characters.filter(character => !positions.has(character.id)).some(character => candidates(character.id).length === 0)
      if (impossible) stats.forwardCheckPrunes += 1; else search()
      usedRows.delete(cell.row); usedColumns.delete(cell.column); positions.delete(placement.characterId); placements.pop()
      if (solutions.length >= maxSolutions) return
    }
  }
  search()
  return { solutions, solutionsFound: solutions.length, stats }
}
export function solveCase(caseData: GameCase, options: SolveOptions = {}): SolveResult { const { solutions, solutionsFound } = solveCaseWithStats(caseData, options); return { solutions, solutionsFound } }
