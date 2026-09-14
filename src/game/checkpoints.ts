import { copyBoardState, isRecord, sanitiseBoardState, type InvestigationBoardState } from './boardState'
import type { CaseSave } from './persistence/caseSave'
import type { GameCase } from './types'

export const CHECKPOINT_NAME_LIMIT = 40
export const CHECKPOINT_DESCRIPTION_LIMIT = 160
export const MAX_CHECKPOINTS_PER_CASE = 20
export const CHECKPOINT_LIMIT_MESSAGE = 'Has alcanzado el límite de 20 puntos de guardado. Elimina uno para crear otro.'

export interface CaseCheckpoint extends InvestigationBoardState {
  id: string
  name: string
  description?: string
  createdAt: string
}

export function createCheckpoint(state: InvestigationBoardState, name: string, description = ''): CaseCheckpoint {
  const trimmedName = name.trim(), trimmedDescription = description.trim()
  if (!trimmedName || trimmedName.length > CHECKPOINT_NAME_LIMIT) throw new Error('El nombre debe tener entre 1 y 40 caracteres.')
  if (trimmedDescription.length > CHECKPOINT_DESCRIPTION_LIMIT) throw new Error('La descripción no puede superar 160 caracteres.')
  return {
    id: crypto.randomUUID(), name: trimmedName, createdAt: new Date().toISOString(),
    ...(trimmedDescription ? { description: trimmedDescription } : {}),
    ...copyBoardState(state),
  }
}

export function addCheckpoint(
  checkpoints: readonly CaseCheckpoint[],
  state: InvestigationBoardState,
  name: string,
  description = '',
): CaseCheckpoint[] {
  if (checkpoints.length >= MAX_CHECKPOINTS_PER_CASE) throw new Error(CHECKPOINT_LIMIT_MESSAGE)
  return [createCheckpoint(state, name, description), ...checkpoints]
}

export function sanitiseCheckpoints(value: unknown, gameCase?: GameCase): CaseCheckpoint[] {
  if (!Array.isArray(value)) return []
  const checkpoints: CaseCheckpoint[] = []
  for (const item of value) {
    if (!isRecord(item) || typeof item.id !== 'string' || !item.id.trim() || item.id.length > 100) continue
    if (typeof item.name !== 'string' || !item.name.trim() || item.name.trim().length > CHECKPOINT_NAME_LIMIT) continue
    if (item.description !== undefined && (typeof item.description !== 'string' || item.description.length > CHECKPOINT_DESCRIPTION_LIMIT)) continue
    if (typeof item.createdAt !== 'string' || !Number.isFinite(Date.parse(item.createdAt)) || new Date(item.createdAt).toISOString() !== item.createdAt) continue
    if (!Array.isArray(item.placements) || !Array.isArray(item.manualExcludedCells)) continue
    const board = sanitiseBoardState(item.placements, item.manualExcludedCells, gameCase)
    // A corrupt snapshot is discarded as a whole rather than restoring a different hypothesis.
    if (board.placements.length !== item.placements.length || board.manualExcludedCells.length !== item.manualExcludedCells.length) continue
    checkpoints.push({
      id: item.id, name: item.name.trim(), createdAt: item.createdAt,
      ...(typeof item.description === 'string' && item.description.trim() ? { description: item.description.trim() } : {}),
      ...board,
    })
  }
  const ids = new Set<string>()
  return checkpoints
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .filter(checkpoint => {
      if (ids.has(checkpoint.id)) return false
      ids.add(checkpoint.id)
      return true
    })
    .slice(0, MAX_CHECKPOINTS_PER_CASE)
}

export function deleteCheckpoint(checkpoints: readonly CaseCheckpoint[], id: string): CaseCheckpoint[] {
  return checkpoints.filter(checkpoint => checkpoint.id !== id)
    .map(checkpoint => ({ ...checkpoint, ...copyBoardState(checkpoint) }))
}

/** Only the hypothesis is restored. Usage counters and checkpoints belong to the current save. */
export function restoreCheckpoint(save: CaseSave, id: string): CaseSave {
  const checkpoint = save.checkpoints.find(item => item.id === id)
  return { ...save, ...copyBoardState(checkpoint ?? save) }
}

export function resetInvestigationBoard(save: CaseSave): CaseSave {
  return { ...save, placements: [], manualExcludedCells: [] }
}
