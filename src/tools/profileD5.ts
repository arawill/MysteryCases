import { generateProceduralCase } from '../game/generation/proceduralCase'
import { getNormalCaseId, getNormalCaseSeed } from '../game/normal/ids'
import { selectScenarioPack } from '../game/scenarios/catalog'

const count = 20
let successes = 0
let totalMs = 0
for (let caseNumber = 1; caseNumber <= count; caseNumber += 1) {
  const seed = getNormalCaseSeed(5, caseNumber)
  const start = performance.now()
  try {
    const generated = generateProceduralCase({ id: getNormalCaseId(5, caseNumber), title: `Perfil D5 ${caseNumber}`, intro: '', difficulty: 5, seed })
    const elapsed = performance.now() - start
    totalMs += elapsed; successes += 1
    console.log(JSON.stringify({ caseNumber, scenarioPack: selectScenarioPack(seed).id, success: true, seedOffset: generated.seedOffset, effectiveSeed: generated.effectiveSeed, milliseconds: Math.round(elapsed), placementAttempts: generated.stats.placementAttempts, solverCalls: generated.stats.solverCalls, selectedClues: generated.stats.selectedClues, candidateClues: generated.stats.candidateClues }))
  } catch (error) {
    console.log(JSON.stringify({ caseNumber, scenarioPack: selectScenarioPack(seed).id, success: false, milliseconds: Math.round(performance.now() - start), reason: error instanceof Error ? error.message : String(error) }))
  }
}
console.log(JSON.stringify({ samples: count, successes, averageMilliseconds: successes === 0 ? 0 : Math.round(totalMs / successes) }))
