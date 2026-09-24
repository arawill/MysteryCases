import { analyzeCase } from '../analysis'
import { findKiller } from '../rules'
import type { GameCase } from '../types'
import { validateCaseDefinition } from '../validation'
import { validateHumanClueQuality } from './clueQuality'

export function validateProceduralGameCase(caseData: GameCase, expectedKillerId?: string): string[] {
  try {
    const definitionErrors = validateCaseDefinition(caseData)
    if (definitionErrors.length > 0) return definitionErrors
    const qualityErrors = validateHumanClueQuality(caseData)
    if (qualityErrors.length > 0) return qualityErrors
    const analysis = analyzeCase(caseData)
    const errors: string[] = []
    if (analysis.status !== 'unique') errors.push('El caso procedural no tiene una solución única.')
    if (analysis.matchesCanonical !== true) errors.push('La solución única no coincide con la solución canónica.')
    const killer = findKiller(caseData, caseData.solution)
    if (!killer) errors.push('La solución canónica no identifica un culpable único.')
    else if (expectedKillerId !== undefined && killer.id !== expectedKillerId) errors.push('El culpable no coincide con los metadatos de generación.')
    return errors
  } catch {
    return ['La estructura del caso procedural no se pudo validar.']
  }
}
