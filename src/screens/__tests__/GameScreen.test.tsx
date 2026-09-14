import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
})
