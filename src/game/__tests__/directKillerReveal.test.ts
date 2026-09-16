import { describe, expect, it } from 'vitest'
import { findDirectKillerRevealClues, isDirectKillerRevealRelation } from '../generation/directKillerReveal'
import { validateHumanClueQuality } from '../generation/clueQuality'
import { case001 } from '../../data/cases/case001'

const relation = (type: 'sameZoneAsCharacter' | 'besideCharacter', targetCharacterId: string) => ({ id: 'test', type, text: '', targetCharacterId })
describe('direct killer reveal clues', () => {
  it.each([['victim', relation('sameZoneAsCharacter', 'other')], ['other', relation('sameZoneAsCharacter', 'victim')], ['victim', relation('besideCharacter', 'other')], ['other', relation('besideCharacter', 'victim')]] as const)('rejects %s %s relations involving the victim', (sourceCharacterId, clue) => expect(isDirectKillerRevealRelation({ sourceCharacterId, clue, victimId: 'victim' })).toBe(true))
  it('permits unrelated and directional relations', () => { expect(isDirectKillerRevealRelation({ sourceCharacterId: 'other', clue: relation('sameZoneAsCharacter', 'third'), victimId: 'victim' })).toBe(false); expect(isDirectKillerRevealRelation({ sourceCharacterId: 'victim', clue: { id: 'north', type: 'northOfCharacter', text: '', targetCharacterId: 'other' }, victimId: 'victim' })).toBe(false) })
  it('reports the invalid source through human clue quality', () => { const broken = structuredClone(case001); broken.characters.find(character => character.id === 'alma')!.clues.push(relation('sameZoneAsCharacter', 'bruno')); expect(findDirectKillerRevealClues(broken)).toHaveLength(1); expect(validateHumanClueQuality(broken).some(error => error.includes('alma: pista revela directamente al culpable'))).toBe(true) })
})
