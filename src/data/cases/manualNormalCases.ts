import { case002 } from './case002'
import { case003 } from './case003'
import type { GameCase } from '../../game/types'

export const manualNormalCases = new Map<string, GameCase>([['1:2', case002], ['1:3', case003]])
export const getManualNormalCase = (difficulty: number, caseNumber: number) => manualNormalCases.get(`${difficulty}:${caseNumber}`)
