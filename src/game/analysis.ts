import { placementsEqual } from './rules'
import { solveCase } from './solver'
import { validateCaseDefinition } from './validation'
import type { GameCase, Placement } from './types'
export interface CaseAnalysis { status: 'none' | 'unique' | 'multiple'; solutionsFound: number; solution?: Placement[]; matchesCanonical?: boolean; validationErrors: string[] }
export function analyzeCase(caseData: GameCase): CaseAnalysis { const validationErrors = validateCaseDefinition(caseData); if (validationErrors.length > 0) return { status: 'none', solutionsFound: 0, validationErrors }; const result = solveCase(caseData); if (result.solutionsFound === 0) return { status: 'none', solutionsFound: 0, validationErrors }; if (result.solutionsFound > 1) return { status: 'multiple', solutionsFound: result.solutionsFound, validationErrors }; const solution = result.solutions[0]; return { status: 'unique', solutionsFound: 1, solution, matchesCanonical: placementsEqual(solution, caseData.solution), validationErrors } }
