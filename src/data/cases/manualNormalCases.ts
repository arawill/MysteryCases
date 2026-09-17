import { case002 } from './case002'
import type { GameCase } from '../../game/types'

export const manualNormalCases = new Map<string, GameCase>([['1:2', case002]])
export const getManualNormalCase = (difficulty: number, caseNumber: number) => manualNormalCases.get(`${difficulty}:${caseNumber}`)
