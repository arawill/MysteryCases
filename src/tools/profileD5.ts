import { generateProceduralCase } from '../game/generation/proceduralCase'
import { getNormalCaseId, getNormalCaseSeed } from '../game/normal/ids'
import { selectScenarioPack } from '../game/scenarios/catalog'

const option = process.argv.find(argument => argument.startsWith('--samples='))?.slice('--samples='.length)
const count = Number(option ?? '20')
if (!Number.isInteger(count) || count < 1) throw new Error('--samples must be a positive integer.')
let successes = 0
let totalMs = 0
let maxMs = 0, maxCaseNumber = 0, totalSolverCalls = 0, maxSolverCalls = 0, totalSeedOffsets = 0, maxSeedOffset = 0, totalSelectedClues = 0
for (let caseNumber = 1; caseNumber <= count; caseNumber += 1) {
  const seed = getNormalCaseSeed(5, caseNumber)
  const start = performance.now()
  try {
    const generated = generateProceduralCase({ id: getNormalCaseId(5, caseNumber), title: `Perfil D5 ${caseNumber}`, intro: '', difficulty: 5, seed })
    const elapsed = performance.now() - start
    totalMs += elapsed; successes += 1; maxMs = Math.max(maxMs, elapsed); if (elapsed === maxMs) maxCaseNumber = caseNumber; totalSolverCalls += generated.stats.solverCalls; maxSolverCalls = Math.max(maxSolverCalls, generated.stats.solverCalls); totalSeedOffsets += generated.seedOffset; maxSeedOffset = Math.max(maxSeedOffset, generated.seedOffset); totalSelectedClues += generated.stats.selectedClues
    console.log(JSON.stringify({ caseNumber, scenarioPack: selectScenarioPack(seed).id, success: true, seedOffset: generated.seedOffset, effectiveSeed: generated.effectiveSeed, milliseconds: Math.round(elapsed), placementAttempts: generated.stats.placementAttempts, solverCalls: generated.stats.solverCalls, selectedClues: generated.stats.selectedClues, candidateClues: generated.stats.candidateClues }))
  } catch (error) {
    console.log(JSON.stringify({ caseNumber, scenarioPack: selectScenarioPack(seed).id, success: false, milliseconds: Math.round(performance.now() - start), reason: error instanceof Error ? error.message : String(error) }))
  }
}
console.log(JSON.stringify({ samples: count, successes, failures: count - successes, averageMilliseconds: successes === 0 ? 0 : Math.round(totalMs / successes), maxMilliseconds: Math.round(maxMs), slowestCaseNumber: maxCaseNumber, averageSolverCalls: successes === 0 ? 0 : totalSolverCalls / successes, maxSolverCalls, averageSeedOffset: successes === 0 ? 0 : totalSeedOffsets / successes, maxSeedOffset, averageSelectedClues: successes === 0 ? 0 : totalSelectedClues / successes }))
