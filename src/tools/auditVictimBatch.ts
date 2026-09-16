import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateDailyCase } from '../game/daily/generator'
import { generateInfiniteCase } from '../game/infinite/generator'
import { generateNormalCase } from '../game/normal/generator'
import { findKiller, placementsEqual } from '../game/rules'
import { solveCase } from '../game/solver'
import type { DifficultyRating, GameCase } from '../game/types'

const [mode, rawDifficulty, rawStart, rawEnd] = process.argv.slice(2)
const difficulty = Number(rawDifficulty) as DifficultyRating, start = Number(rawStart), end = Number(rawEnd)
if (!['normal', 'daily', 'infinite'].includes(mode) || ![1,2,3,4,5].includes(difficulty) || !Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end - start > 9) throw new Error('Usage: <normal|daily|infinite> <1-5> <start> <end>; batches are limited to ten.')
const directory = join(process.env.TEMP ?? process.cwd(), 'mysterycases-victim-audit')
mkdirSync(directory, { recursive: true })
const output = join(directory, `${mode}-d${difficulty}-${start}-${end}.json`)
if (existsSync(output)) { console.log(`Reusing ${output}`); process.exit(0) }
const get = (index: number) => mode === 'normal' ? generateNormalCase({ difficulty, caseNumber: index }) : mode === 'daily' ? generateDailyCase(new Date(2026, 8, index, 12), difficulty) : generateInfiniteCase({ difficulty, seed: 1000 + (index - 1) * 7919 })
const records = []
for (let index = start; index <= end; index += 1) {
  const began = performance.now()
  try {
    const generated = get(index), original = generated.caseData, copy = structuredClone(original), victim = copy.characters.find(character => character.isVictim)
    if (!victim) throw new Error('Missing victim.')
    const clues = victim.clues.map(clue => ({ id: clue.id, type: clue.type, text: clue.text })); victim.clues = []
    const solved = solveCase(copy, { maxSolutions: 2 }), solution = solved.solutions[0], unique = solved.solutionsFound === 1, canonical = unique && placementsEqual(solution, original.solution)
    const status = solved.solutionsFound === 0 ? 'invalid' : !unique ? 'ambiguous' : !canonical ? 'canonicalMismatch' : 'unique'
    records.push({ mode, difficulty, index, caseId: original.id, scenario: original.zones.map(zone => zone.name).join(' / '), victimId: victim.id, victimName: victim.name, victimClues: clues, milliseconds: Math.round(performance.now() - began), solutionsFound: solved.solutionsFound, status, canonical, killerId: findKiller(original, original.solution)?.id ?? null })
    console.log(`${mode} D${difficulty} ${index}: ${status}`)
  } catch (error) { records.push({ mode, difficulty, index, status: 'error', error: error instanceof Error ? error.message : String(error), milliseconds: Math.round(performance.now() - began) }); console.log(`${mode} D${difficulty} ${index}: error`) }
}
writeFileSync(output, JSON.stringify(records))
console.log(output)
