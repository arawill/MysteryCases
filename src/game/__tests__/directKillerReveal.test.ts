import { describe, expect, it } from 'vitest'
import { findDirectKillerRevealClues, isDirectKillerRevealRelation } from '../generation/directKillerReveal'
import { validateHumanClueQuality } from '../generation/clueQuality'
import { generateInfiniteCase } from '../infinite/generator'
import { case001 } from '../../data/cases/case001'

const relation = (type: 'sameZoneAsCharacter' | 'besideCharacter', targetCharacterId: string) => ({ id: 'test', type, text: '', targetCharacterId })
describe('direct killer reveal clues', () => {
  it.each([['victim', relation('sameZoneAsCharacter', 'other')], ['other', relation('sameZoneAsCharacter', 'victim')], ['victim', relation('besideCharacter', 'other')], ['other', relation('besideCharacter', 'victim')]] as const)('rejects %s %s relations involving the victim', (sourceCharacterId, clue) => expect(isDirectKillerRevealRelation({ sourceCharacterId, clue, victimId: 'victim' })).toBe(true))
  it('permits unrelated and directional relations', () => { expect(isDirectKillerRevealRelation({ sourceCharacterId: 'other', clue: relation('sameZoneAsCharacter', 'third'), victimId: 'victim' })).toBe(false); expect(isDirectKillerRevealRelation({ sourceCharacterId: 'victim', clue: { id: 'north', type: 'northOfCharacter', text: '', targetCharacterId: 'other' }, victimId: 'victim' })).toBe(false) })
  it('reports the invalid source through human clue quality', () => { const broken = structuredClone(case001); broken.characters.find(character => character.id === 'alma')!.clues.push(relation('sameZoneAsCharacter', 'bruno')); expect(findDirectKillerRevealClues(broken)).toHaveLength(1); expect(validateHumanClueQuality(broken).some(error => error.includes('alma: pista revela directamente al culpable'))).toBe(true) })
  it('requires an empty victim and rejects every non-victim relation targeting her', () => {
    const generated = generateInfiniteCase({ difficulty: 1, seed: 12001 }).caseData
    expect(validateHumanClueQuality(generated)).toEqual([])
    const withVictimClue = structuredClone(generated), victim = withVictimClue.characters.find(character => character.isVictim)!, source = withVictimClue.characters.find(character => !character.isVictim)!
    victim.clues = [structuredClone(source.clues[0])]
    expect(validateHumanClueQuality(withVictimClue)).toContain('La víctima no puede tener pistas lógicas.')
    const withVictimTarget = structuredClone(generated), nonVictim = withVictimTarget.characters.find(character => !character.isVictim)!, target = withVictimTarget.characters.find(character => character.isVictim)!
    nonVictim.clues.push({ id: 'test-target-victim', type: 'northOfCharacter', text: '', targetCharacterId: target.id })
    expect(validateHumanClueQuality(withVictimTarget).some(error => error.includes('relación con la víctima prohibida'))).toBe(true)
  })
  it('evaluates connectivity only across non-victims', () => {
    const generated = generateInfiniteCase({ difficulty: 1, seed: 12002 }).caseData
    const disconnected = structuredClone(generated)
    for (const character of disconnected.characters) if (!character.isVictim) character.clues = []
    expect(validateHumanClueQuality(disconnected)).toContain(`${disconnected.characters.find(character => !character.isVictim)!.id}: componente sin anchor.`)
    expect(disconnected.characters.find(character => character.isVictim)?.clues).toEqual([])
  })
})
