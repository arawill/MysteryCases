import type { GameCase, Placement } from '../types'

const stable = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stable(record[key])}`).join(',')}}`
}

export const boardSignature = (caseData: Pick<GameCase, 'rows' | 'columns' | 'board' | 'edgeFeatures'>) => stable({
  rows: caseData.rows,
  columns: caseData.columns,
  board: [...caseData.board].sort((a, b) => a.row - b.row || a.column - b.column).map(cell => ({ row: cell.row, column: cell.column, zoneId: cell.zoneId, occupiable: cell.occupiable, objectId: cell.object?.id })),
  edgeFeatures: [...(caseData.edgeFeatures ?? [])].sort((a, b) => a.id.localeCompare(b.id)).map(feature => ({ ...feature, segments: [...feature.segments].sort((a, b) => a.position.row - b.position.row || a.position.column - b.position.column || a.side.localeCompare(b.side)) })),
})
export const solutionSignature = (solution: Placement[]) => stable([...solution].sort((a, b) => a.characterId.localeCompare(b.characterId)).map(item => ({ characterId: item.characterId, row: item.position.row, column: item.position.column })))
export const clueSignature = (caseData: Pick<GameCase, 'characters' | 'globalClues' | 'traitDefinitions'>) => stable({
  characters: [...caseData.characters].sort((a, b) => a.id.localeCompare(b.id)).map(character => ({ characterId: character.id, clues: [...character.clues].sort((a, b) => a.id.localeCompare(b.id)) })),
  globalClues: [...(caseData.globalClues ?? [])].sort((a, b) => a.id.localeCompare(b.id)),
  traitDefinitions: [...(caseData.traitDefinitions ?? [])].sort((a, b) => a.id.localeCompare(b.id)),
})
export const rosterSignature = (roster: readonly { id: string; gender?: string; name: string; avatarId?: string; roleId?: string; isVictim: boolean }[]) => stable([...roster].sort((a, b) => a.id.localeCompare(b.id)).map(({ id, gender, name, avatarId, roleId, isVictim }) => ({ id, gender, name, avatarId, roleId, isVictim })))
export const caseFingerprint = (caseData: GameCase, scenarioPackId: string, killerId: string, roster: Parameters<typeof rosterSignature>[0]) => stable({ difficulty: caseData.difficulty, scenarioPackId, board: boardSignature(caseData), roster: rosterSignature(roster), solution: solutionSignature(caseData.solution), clues: clueSignature(caseData), victimId: caseData.characters.find(character => character.isVictim)?.id, killerId })
export const boardSimilarity = (left: Pick<GameCase, 'board'>, right: Pick<GameCase, 'board'>) => {
  const rightCells = new Map(right.board.map(cell => [`${cell.row}:${cell.column}`, cell]))
  const matching = left.board.filter(cell => { const other = rightCells.get(`${cell.row}:${cell.column}`); return other?.zoneId === cell.zoneId && other.occupiable === cell.occupiable && other.object?.id === cell.object?.id }).length
  return left.board.length === 0 ? 0 : matching / left.board.length
}
