import { analyzeCase } from '../game/analysis'
import { validateHumanClueQuality } from '../game/generation/clueQuality'
import { generateProceduralCase } from '../game/generation/proceduralCase'
import { findKiller } from '../game/rules'
import { validateCaseDefinition } from '../game/validation'

const samplesPerDifficulty = 50
let verified = 0
for (const difficulty of [1, 2, 3, 4, 5] as const) for (let sample = 0; sample < samplesPerDifficulty; sample += 1) {
  const seed = (Math.imul(difficulty, 0x9e3779b1) + Math.imul(sample + 1, 0x85ebca6b) + 0x13579bdf) >>> 0
  const generated = generateProceduralCase({ id: `quality-d${difficulty}-${sample}`, title: 'Verificación', intro: '', difficulty, seed })
  const errors = [...validateCaseDefinition(generated.caseData), ...validateHumanClueQuality(generated.caseData)]
  if (errors.length > 0) throw new Error(`D${difficulty}/S${sample}: ${errors.join(' ')}`)
  if (generated.caseData.characters.some(character => character.clues.some(clue => clue.type === 'row' || clue.type === 'column'))) throw new Error(`D${difficulty}/S${sample}: coordinate clue found.`)
  const analysis = analyzeCase(generated.caseData)
  if (analysis.status !== 'unique' || analysis.matchesCanonical !== true) throw new Error(`D${difficulty}/S${sample}: not uniquely canonical.`)
  if (findKiller(generated.caseData, generated.caseData.solution)?.id !== generated.killerId) throw new Error(`D${difficulty}/S${sample}: killer mismatch.`)
  verified += 1
}
console.log(`Verified human clue quality for ${verified} procedural puzzles.`)
