import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { case001 } from '../../data/cases/case001'
import { getAccusationCandidates } from '../../game/accusationCandidates'
import { generateProceduralCase } from '../../game/generation/proceduralCase'
import { GameScreen } from '../GameScreen'

const storage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {}, key: () => null, length: 0 } as Storage
afterEach(() => vi.unstubAllGlobals())

describe('compact character selector', () => {
  it('retains a procedural role in title and aria-label without displaying it in the compact button', () => {
    vi.stubGlobal('localStorage', storage)
    const gameCase = generateProceduralCase({ id: 'selector-test', title: 'Test', intro: 'Test', difficulty: 1, seed: 42 }).caseData
    const character = gameCase.characters.find(person => person.roleLabel && !person.isVictim)
    expect(character).toBeDefined()
    const markup = renderToStaticMarkup(<GameScreen gameCase={gameCase} />)
    const descriptor = `${character!.name} · ${character!.roleLabel}`
    expect(markup).toContain(`title="${descriptor}"`)
    expect(markup).toContain(`aria-label="${descriptor}`)
    const victim = gameCase.characters.find(person => person.isVictim)
    expect(markup).toContain(`aria-label="${victim!.name} · ${victim!.roleLabel} · Víctima"`)
  }, 30000)

  it('renders the stable public accusation order and excludes the victim', () => {
    vi.stubGlobal('localStorage', storage)
    const markup = renderToStaticMarkup(<GameScreen gameCase={case001} />)
    const accusationMarkup = markup.slice(markup.indexOf('killer-options'))
    const candidates = getAccusationCandidates(case001.id, case001.characters)
    const candidateIndexes = candidates.map(character => accusationMarkup.indexOf(`data-candidate-id="${character.id}"`))

    expect(candidateIndexes.every(index => index >= 0)).toBe(true)
    expect(candidateIndexes.every((index, position) => position === 0 || candidateIndexes[position - 1] < index)).toBe(true)
    expect(accusationMarkup).not.toContain(`data-candidate-id="${case001.characters.find(character => character.isVictim)!.id}"`)
  })
})
