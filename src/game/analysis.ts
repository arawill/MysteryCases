import { placementsEqual } from './rules'
import { solveCase } from './solver'
import type { SolveOptions, SolveResult } from './solver'
import { validateCaseDefinition } from './validation'
import type { GameCase, Placement } from './types'

export interface CaseAnalysis { status: 'none' | 'unique' | 'multiple'; solutionsFound: number; solution?: Placement[]; matchesCanonical?: boolean; validationErrors: string[] }
export interface AnalyzeCaseOptions { precomputed?: PrecomputedCaseAnalysis }
export interface PrecomputedCaseAnalysisInput {
  solvedCase: GameCase
  analyzedCase: GameCase
  result: SolveResult
  solveOptions: SolveOptions
}

const evidenceBrand = Symbol('precomputed-case-analysis')
const cloneSolution = (solution: readonly Placement[]): Placement[] => solution.map(placement => ({ characterId: placement.characterId, position: { ...placement.position } }))
const exactSnapshot = (caseData: GameCase) => {
  try { return JSON.stringify(caseData) } catch { return undefined }
}
const validPlacement = (value: unknown): value is Placement => {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<Placement>
  return typeof candidate.characterId === 'string' && typeof candidate.position === 'object' && candidate.position !== null && Number.isInteger(candidate.position.row) && Number.isInteger(candidate.position.column)
}

/**
 * Opaque evidence that a solver result is exhaustive and belongs to one exact,
 * ordered case snapshot. Only the case id may differ between the solved source
 * and the analyzed target, and that target id is bound into the snapshot.
 */
export class PrecomputedCaseAnalysis {
  readonly #brand = evidenceBrand
  readonly #caseSnapshot: string
  readonly #solution: Placement[]

  private constructor(caseSnapshot: string, solution: readonly Placement[]) {
    this.#caseSnapshot = caseSnapshot
    this.#solution = cloneSolution(solution)
    Object.freeze(this.#solution)
    Object.freeze(this)
  }

  static create(input: PrecomputedCaseAnalysisInput): PrecomputedCaseAnalysis | undefined {
    const { solvedCase, analyzedCase, result, solveOptions } = input
    const maxSolutions = solveOptions.maxSolutions ?? 2
    const validMaxNodes = solveOptions.maxNodes === undefined || (Number.isInteger(solveOptions.maxNodes) && solveOptions.maxNodes > 0)
    if (!Number.isInteger(maxSolutions) || maxSolutions < 2 || !validMaxNodes) return undefined
    if (result.truncated === true || (result.truncated !== undefined && result.truncated !== false)) return undefined
    if (result.solutionsFound !== 1 || result.solutions.length !== 1 || !result.solutions[0].every(validPlacement)) return undefined
    const analyzedSnapshot = exactSnapshot(analyzedCase)
    const solvedForTargetSnapshot = exactSnapshot({ ...solvedCase, id: analyzedCase.id })
    if (analyzedSnapshot === undefined || solvedForTargetSnapshot !== analyzedSnapshot) return undefined
    return new PrecomputedCaseAnalysis(analyzedSnapshot, result.solutions[0])
  }

  resultFor(caseData: GameCase): SolveResult | undefined {
    if (this.#brand !== evidenceBrand || exactSnapshot(caseData) !== this.#caseSnapshot) return undefined
    const solution = cloneSolution(this.#solution)
    return { solutions: [solution], solutionsFound: 1, truncated: false }
  }
}

export const createPrecomputedCaseAnalysis = (input: PrecomputedCaseAnalysisInput) => PrecomputedCaseAnalysis.create(input)

export function analyzeCase(caseData: GameCase, options: AnalyzeCaseOptions = {}): CaseAnalysis {
  const validationErrors = validateCaseDefinition(caseData)
  if (validationErrors.length > 0) return { status: 'none', solutionsFound: 0, validationErrors }
  const result = options.precomputed instanceof PrecomputedCaseAnalysis ? options.precomputed.resultFor(caseData) ?? solveCase(caseData) : solveCase(caseData)
  if (result.solutionsFound === 0) return { status: 'none', solutionsFound: 0, validationErrors }
  if (result.solutionsFound > 1) return { status: 'multiple', solutionsFound: result.solutionsFound, validationErrors }
  const solution = result.solutions[0]
  return { status: 'unique', solutionsFound: 1, solution, matchesCanonical: placementsEqual(solution, caseData.solution), validationErrors }
}
