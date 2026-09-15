export interface CaseCompletionPerformance {
  review: number
  exclusion: number
  positionChecks: number
}

export interface CompletionRecordState {
  current: boolean
}

export function notifyCaseCompletionOnce(
  state: CompletionRecordState,
  performance: CaseCompletionPerformance,
  callback?: (performance: CaseCompletionPerformance) => void,
) {
  if (state.current) return false
  state.current = true
  callback?.(performance)
  return true
}
