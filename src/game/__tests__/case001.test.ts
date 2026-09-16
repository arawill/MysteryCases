import { expect, it } from 'vitest'
import { case001 } from '../../data/cases/case001'
import { findKiller } from '../rules'
import { analyzeCase } from '../analysis'
it('case001 conserva a Bruno como asesino derivado de la solución', () => { const analysis = analyzeCase(case001); expect(analysis.solution).toBeDefined(); expect(findKiller(case001, analysis.solution ?? [])?.id).toBe('bruno') })
it('case001 conserva sus emojis legacy y usa seis retratos humanos distintos', () => {
  expect(case001.characters.map(character => character.avatar)).toEqual(['🦊', '🦉', '🐈', '🦬', '🦋', '🌙'])
  const images = case001.characters.map(character => character.avatarImage)
  expect(images.every((image): image is string => typeof image === 'string' && image.length > 0)).toBe(true)
  expect(new Set(images).size).toBe(6)
})
