import { markCaseCompleted } from './progress'

export function recordCaseCompletion(caseId: string, recordGlobalCompletion = true, storage: Storage = localStorage) { if (recordGlobalCompletion) markCaseCompleted(caseId, storage) }
