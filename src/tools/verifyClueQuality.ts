import { analyzeCase } from '../game/analysis'
import { validateHumanClueQuality } from '../game/generation/clueQuality'
import { generateProceduralCase } from '../game/generation/proceduralCase'
import { findKiller } from '../game/rules'
import { validateCaseDefinition } from '../game/validation'
import type { DifficultyRating } from '../game/types'

const option = (name: string) => process.argv.find(argument => argument.startsWith(`--${name}=`))?.slice(name.length + 3)
const parsedSamples = Number(option('samples') ?? '50')
const parsedDifficulty = option('difficulty')
const parsedDifficultyNumber = parsedDifficulty === undefined ? undefined : Number(parsedDifficulty)
if (!Number.isInteger(parsedSamples) || parsedSamples < 1) throw new Error('--samples must be a positive integer.')
if (parsedDifficultyNumber !== undefined && (!Number.isInteger(parsedDifficultyNumber) || parsedDifficultyNumber < 1 || parsedDifficultyNumber > 5)) throw new Error('--difficulty must be between 1 and 5.')
const difficulties: DifficultyRating[] = parsedDifficultyNumber === undefined ? [1, 2, 3, 4, 5] : [parsedDifficultyNumber as DifficultyRating]
let verified = 0
for (const difficulty of difficulties) {
  const started = performance.now()
  for (let sample = 0; sample < parsedSamples; sample += 1) {
    const seed = (Math.imul(difficulty, 0x9e3779b1) + Math.imul(sample + 1, 0x85ebca6b) + 0x13579bdf) >>> 0
    const generated = generateProceduralCase({ id: `quality-d${difficulty}-${sample}`, title: 'Verificación', intro: '', difficulty, seed })
    const errors = [...validateCaseDefinition(generated.caseData), ...validateHumanClueQuality(generated.caseData)]
    if (errors.length > 0) throw new Error(`D${difficulty}/S${sample}: ${errors.join(' ')}`)
    if (generated.caseData.characters.some(character => character.clues.some(clue => clue.type === 'row' || clue.type === 'column'))) throw new Error(`D${difficulty}/S${sample}: coordinate clue found.`)
    const analysis = analyzeCase(generated.caseData)
    if (analysis.status !== 'unique' || analysis.matchesCanonical !== true) throw new Error(`D${difficulty}/S${sample}: not uniquely canonical.`)
    if (findKiller(generated.caseData, generated.caseData.solution)?.id !== generated.killerId) throw new Error(`D${difficulty}/S${sample}: killer mismatch.`)
    verified += 1
    if ((sample + 1) % 5 === 0 || sample + 1 === parsedSamples) console.log(`D${difficulty} ${sample + 1}/${parsedSamples}`)
  }
  console.log(`D${difficulty} completed in ${Math.round(performance.now() - started)} ms.`)
}
console.log(`Verified human clue quality for ${verified} procedural puzzles.`)
