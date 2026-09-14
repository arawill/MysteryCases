import type { GameCase, Placement, Position } from './types'

export interface InvestigationBoardState {
  placements: Placement[]
  manualExcludedCells: Position[]
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const isPosition = (value: unknown): value is Position => isRecord(value)
  && Number.isSafeInteger(value.row) && Number(value.row) > 0
  && Number.isSafeInteger(value.column) && Number(value.column) > 0

export function copyBoardState(state: InvestigationBoardState): InvestigationBoardState {
  return {
    placements: state.placements.map(item => ({ characterId: item.characterId, position: { ...item.position } })),
    manualExcludedCells: state.manualExcludedCells.map(position => ({ ...position })),
  }
}

export function recordBoardState(
  history: readonly InvestigationBoardState[],
  state: InvestigationBoardState,
): InvestigationBoardState[] {
  return [...history, copyBoardState(state)]
}

export function undoBoardState<T extends InvestigationBoardState>(
  state: T,
  history: readonly InvestigationBoardState[],
): { state: T; history: InvestigationBoardState[] } | null {
  const previous = history.at(-1)
  if (!previous) return null
  return {
    state: { ...state, ...copyBoardState(previous) },
    history: history.slice(0, -1).map(copyBoardState),
  }
}

/** Accepts only legal coordinates; case context additionally checks IDs and the actual board. */
export function sanitiseBoardState(placements: unknown, excluded: unknown, gameCase?: GameCase): InvestigationBoardState {
  const safePlacements: Placement[] = []
  const ids = new Set<string>(), rows = new Set<number>(), columns = new Set<number>()
  const board = gameCase && new Map(gameCase.board.map(cell => [`${cell.row}:${cell.column}`, cell]))
  const characters = gameCase && new Set(gameCase.characters.map(character => character.id))

  if (Array.isArray(placements)) for (const item of placements) {
    if (!isRecord(item) || typeof item.characterId !== 'string' || !item.characterId.trim() || !isPosition(item.position)) continue
    const { characterId, position } = item
    if (ids.has(characterId) || rows.has(position.row) || columns.has(position.column)) continue
    if (characters && (!characters.has(characterId) || !board?.get(`${position.row}:${position.column}`)?.occupiable)) continue
    ids.add(characterId); rows.add(position.row); columns.add(position.column)
    safePlacements.push({ characterId, position: { row: position.row, column: position.column } })
  }

  const occupied = new Set(safePlacements.map(item => `${item.position.row}:${item.position.column}`))
  const safeExcluded = new Map<string, Position>()
  if (Array.isArray(excluded)) for (const position of excluded) {
    if (!isPosition(position)) continue
    const key = `${position.row}:${position.column}`
    if (occupied.has(key) || (board && !board.get(key)?.occupiable)) continue
    safeExcluded.set(key, { row: position.row, column: position.column })
  }

  return { placements: safePlacements, manualExcludedCells: [...safeExcluded.values()] }
}
