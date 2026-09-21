import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes, matchRoutes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { case002 } from '../../data/cases/case002'
import { getManualNormalCase } from '../../data/cases/manualNormalCases'
import { NormalCaseScreen } from '../../screens/NormalCaseScreen'
import { getEffectiveNormalCatalog, validateEffectiveNormalClues } from '../normal/catalogValidation'
import { getFrozenNormalGeneratedCase } from '../normal/frozen'
import { clearNormalCaseCache, generateNormalCase } from '../normal/generator'
import { getCaseSaveKey, loadCaseSave, saveCase } from '../persistence/caseSave'
import type { GameCase } from '../types'
import * as generator from '../normal/generator'
import * as frozen from '../normal/frozen'
import { getPublishedNormalNumbers, getLastPublishedNormalCase } from '../normal/availability'
import { NormalCasesScreen } from '../../screens/NormalCasesScreen'
import { NORMAL_PROGRESS_KEY, loadNormalProgress, markNormalCaseCompleted } from '../persistence/normalProgress'
import { getNormalCaseNavigation } from '../normal/navigation'
import { buildPlayerStatistics } from '../statistics'

vi.mock('../../screens/GameScreen', () => ({ GameScreen: ({ gameCase }: { gameCase: GameCase }) =>
  <div>{gameCase.id}:{loadCaseSave(gameCase.id, localStorage, gameCase).placements.length}</div> }))

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); clearNormalCaseCache() })

const publishedStorage = (selectedDifficulty = 2) => {
  const values = new Map<string, string>([[NORMAL_PROGRESS_KEY, JSON.stringify({ saveVersion: 2, selectedDifficulty, completedCaseNumbersByDifficulty: { 1: Array.from({ length: 80 }, (_, index) => index + 1), 2: [7, 80], 3: [1], 4: [], 5: [] } })]])
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: vi.fn() } as unknown as Storage
}

describe('public release availability', () => {
  it('publishes exactly the approved numbers and final case', () => {
    expect(getPublishedNormalNumbers(1)).toEqual(Array.from({ length: 15 }, (_, index) => index + 1))
    expect(getPublishedNormalNumbers(2)).toEqual([1, 2, 3, 4, 5, 6])
    for (const difficulty of [3, 4, 5] as const) expect(getPublishedNormalNumbers(difficulty)).toEqual([])
    expect(getLastPublishedNormalCase()).toEqual({ difficulty: 2, caseNumber: 6 })
  })

  it.each(['/normal/1/16', '/normal/2/7', '/normal/3/1', '/normal/4/1', '/normal/5/1', '/normal/1/0', '/normal/1/-1', '/normal/1/no', '/normal/2/81'])('blocks %s before resolving any case or touching saves', path => {
    const storage = publishedStorage()
    vi.stubGlobal('localStorage', storage)
    const before = storage.getItem(NORMAL_PROGRESS_KEY)
    const resolve = vi.spyOn(generator, 'getCachedNormalCase')
    const hydrate = vi.spyOn(frozen, 'getFrozenNormalGeneratedCase')
    const markup = renderToStaticMarkup(<MemoryRouter initialEntries={[path]}><Routes><Route path="/normal/:difficulty/:caseNumber" element={<NormalCaseScreen />} /></Routes></MemoryRouter>)
    expect(markup).toBe('')
    expect(resolve).not.toHaveBeenCalled()
    expect(hydrate).not.toHaveBeenCalled()
    expect(storage.getItem(NORMAL_PROGRESS_KEY)).toBe(before)
    expect(storage.removeItem).not.toHaveBeenCalled()
  })

  it.each([[1, 15], [2, 6]] as const)('opens the published endpoint %i/%i', (difficulty, caseNumber) => {
    vi.stubGlobal('localStorage', publishedStorage())
    const markup = renderToStaticMarkup(<MemoryRouter initialEntries={[`/normal/${difficulty}/${caseNumber}`]}><Routes><Route path="/normal/:difficulty/:caseNumber" element={<NormalCaseScreen />} /></Routes></MemoryRouter>)
    expect(markup).toContain(getManualNormalCase(difficulty, caseNumber)!.id)
    expect(markup).not.toContain(`href="/normal/${difficulty}/${caseNumber + 1}"`)
  })

  it.each([[1, 15], [2, 6]])('renders only published links for difficulty %i', (difficulty, count) => {
    vi.stubGlobal('localStorage', publishedStorage(difficulty))
    const markup = renderToStaticMarkup(<MemoryRouter><NormalCasesScreen /></MemoryRouter>)
    expect([...markup.matchAll(/href="\/normal\/\d\/\d+"/g)]).toHaveLength(count)
    expect(markup).not.toContain(`href="/normal/${difficulty}/${count + 1}"`)
    expect([...markup.matchAll(/Próximamente/g)]).toHaveLength(3)
  })

  it('preserves historical completions on writes while ending public navigation and counts at 21', () => {
    const storage = publishedStorage()
    const progress = markNormalCaseCompleted(2, 6, storage)
    expect(loadNormalProgress(storage).completedCaseNumbersByDifficulty).toMatchObject({ 2: [6, 7, 80], 3: [1] })
    expect(progress.completedCaseNumbersByDifficulty[1]).toHaveLength(80)
    expect(getNormalCaseNavigation({ difficulty: 2, caseNumber: 6, progress }).next).toBeNull()
    const stats = buildPlayerStatistics({ normalProgress: progress, progress: { saveVersion: 1, completedCaseIds: [] }, playerStats: { saveVersion: 1, completedInfiniteCaseIds: [], hintsUsed: { review: 0, exclusion: 0, reveal: 0 } }, today: new Date() })
    expect(stats.normal.total).toBe(16)
    expect(stats.normal.byDifficulty.map(item => item.max)).toEqual([15, 6, 0, 0, 0])
  })
})

describe('effective Normal catalog and historical saves', () => {
  it('resolves all 21 published descriptors through production and excludes replaced generations', () => {
    const catalog = getEffectiveNormalCatalog()
    expect(catalog).toHaveLength(21)
    expect(new Set(catalog.map(item => `${item.difficulty}:${item.caseNumber}`)).size).toBe(21)
    expect(catalog.find(item => item.difficulty === 1 && item.caseNumber === 2)?.caseData).toBe(case002)
    expect(catalog.some(item => item.caseData.id === getFrozenNormalGeneratedCase(1, 2)!.caseData.id)).toBe(false)
    for (let caseNumber = 1; caseNumber <= 6; caseNumber++) {
      expect(catalog.find(item => item.difficulty === 2 && item.caseNumber === caseNumber)?.caseData).toBe(getManualNormalCase(2, caseNumber))
    }
    expect(generateNormalCase({ difficulty: 2, caseNumber: 7 }).caseData).toEqual(getFrozenNormalGeneratedCase(2, 7)!.caseData)
  })

  it('does not import historical saves into the manual route or remove their stored data', () => {
    const data = new Map<string, string>()
    const reads: string[] = []
    const storage = { getItem: (key: string) => { reads.push(key); return data.get(key) ?? null }, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) } as unknown as Storage
    vi.stubGlobal('localStorage', storage)
    const historical = getFrozenNormalGeneratedCase(1, 2)!.caseData
    saveCase(historical.id, { placements: [historical.solution[0]], manualExcludedCells: [] }, storage)
    const saved = data.get(getCaseSaveKey(historical.id))
    reads.length = 0
    const markup = renderToStaticMarkup(<MemoryRouter initialEntries={['/normal/1/2']}><Routes><Route path="/normal/:difficulty/:caseNumber" element={<NormalCaseScreen />} /></Routes></MemoryRouter>)
    expect(markup).toContain(`${case002.id}:0`)
    expect(reads).toContain(getCaseSaveKey(case002.id))
    expect(reads).not.toContain(getCaseSaveKey(historical.id))
    expect(data.get(getCaseSaveKey(historical.id))).toBe(saved)
    expect(loadCaseSave(historical.id, storage, historical).placements).toEqual([historical.solution[0]])
  })

  it('has no public route accepting a historical generation ID', () => {
    const source = readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8')
    const routes = [...source.matchAll(/<Route path="([^"]+)"/g)].map(match => ({ path: match[1] }))
    expect(routes.length).toBeGreaterThan(5)
    expect(matchRoutes(routes, '/normal/1/2')?.[0].route.path).toBe('/normal/:difficulty/:caseNumber')
    for (const path of ['/case/normal-d1-c02-g7', '/normal-d1-c02-g7', '/normal/normal-d1-c02-g7']) {
      expect(matchRoutes(routes, path)?.[0].route.path).toBe('*')
    }
  })

  it('applies strict modern quality to effective frozen cases, including victim clues', () => {
    const request = { difficulty: 2 as const, caseNumber: 7 }
    const effective = structuredClone(generateNormalCase(request).caseData)
    const victim = effective.characters.find(character => character.isVictim)!
    victim.clues = [effective.characters.find(character => !character.isVictim)!.clues[0]]
    expect(validateEffectiveNormalClues(request, effective)).toContain('Victim must have no logical clues.')
    expect(validateEffectiveNormalClues({ difficulty: 1, caseNumber: 2 }, case002)).toEqual([])
  })
})
