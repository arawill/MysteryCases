import { isRecord, sanitiseBoardState, type InvestigationBoardState } from '../boardState'
import { sanitiseCheckpoints, type CaseCheckpoint } from '../checkpoints'
import type { GameCase } from '../types'
export interface HintUsage { review: number; exclusion: number; reveal: number }
export interface CaseSave extends InvestigationBoardState {
  saveVersion: 4
  hintsUsed: HintUsage
  checkpoints: CaseCheckpoint[]
  positionChecksUsed: number
}
const hints = (): HintUsage => ({ review: 0, exclusion: 0, reveal: 0 })
const empty = (): CaseSave => ({ saveVersion: 4, placements: [], manualExcludedCells: [], hintsUsed: hints(), checkpoints: [], positionChecksUsed: 0 })
const isCounter = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0
export const getCaseSaveKey = (caseId: string) => `mystery-cases-${caseId}`
function normalise(value: unknown, gameCase?: GameCase): CaseSave {
  if (!isRecord(value) || ![1, 2, 3, 4].some(version => value.saveVersion === version) || !Array.isArray(value.placements)) return empty()
  const usage = isRecord(value.hintsUsed) ? value.hintsUsed : {}
  return {
    saveVersion: 4,
    ...sanitiseBoardState(value.placements, value.saveVersion === 1 ? value.excludedCells : value.manualExcludedCells, gameCase),
    hintsUsed: {
      review: isCounter(usage.review) ? usage.review : 0,
      exclusion: isCounter(usage.exclusion) ? usage.exclusion : 0,
      reveal: isCounter(usage.reveal) ? usage.reveal : 0,
    },
    checkpoints: value.saveVersion === 4 ? sanitiseCheckpoints(value.checkpoints, gameCase) : [],
    positionChecksUsed: value.saveVersion === 4 && isCounter(value.positionChecksUsed) ? value.positionChecksUsed : 0,
  }
}

export function loadCaseSave(caseId: string, storage: Storage = localStorage, gameCase?: GameCase): CaseSave {
  try { return normalise(JSON.parse(storage.getItem(getCaseSaveKey(caseId)) ?? 'null'), gameCase) } catch { return empty() }
}

type SaveInput = InvestigationBoardState & Partial<Pick<CaseSave, 'hintsUsed' | 'checkpoints' | 'positionChecksUsed'>>

export function saveCase(caseId: string, save: SaveInput, storage: Storage = localStorage) {
  // Partial callers must not accidentally replenish checks or remove saved hypotheses.
  const current = loadCaseSave(caseId, storage)
  const safe = normalise({ ...current, ...save, saveVersion: 4 })
  storage.setItem(getCaseSaveKey(caseId), JSON.stringify(safe))
}
export function clearCaseSave(caseId: string, storage: Storage = localStorage) { storage.removeItem(getCaseSaveKey(caseId)) }
