import { describe, expect, it } from 'vitest'
import { case001 } from '../../data/cases/case001'
import { validateCaseDefinition } from '../validation'
import type { GameCase } from '../types'
const clone = (): GameCase => structuredClone(case001)
describe('validateCaseDefinition', () => {
  it('acepta case001', () => expect(validateCaseDefinition(case001)).toEqual([]))
  it('detecta dos víctimas y referencias inválidas', () => { const invalid = clone(); invalid.characters[1].isVictim = true; invalid.characters[0].clues = [{ id: 'bad-zone', type: 'zone', text: '', zoneId: 'missing' }, { id: 'bad-target', type: 'southOfCharacter', text: '', targetCharacterId: 'missing' }, { id: 'bad-object', type: 'onObject', text: '', objectId: 'missing' }, { id: 'bad-row', type: 'row', text: '', row: 99 }]; const errors = validateCaseDefinition(invalid).join(' '); expect(errors).toContain('exactamente una víctima'); expect(errors).toContain('zona inexistente'); expect(errors).toContain('personaje inexistente'); expect(errors).toContain('objeto inexistente'); expect(errors).toContain('fila inválida') })
  it('detecta filas duplicadas y pistas incumplidas en la canónica', () => { const invalid = clone(); invalid.solution[1].position.row = invalid.solution[0].position.row; const errors = validateCaseDefinition(invalid).join(' '); expect(errors).toContain('Fila duplicada'); expect(errors).toContain('no satisface todas las pistas') })
})
