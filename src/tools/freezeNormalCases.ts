import { mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { case001 } from '../data/cases/case001'
import type { FrozenNormalCase, FrozenNormalCaseSet } from '../data/normal/types'
import { avatarCatalog } from '../game/characters/avatarCatalog'
import { generateProceduralCase } from '../game/generation/proceduralCase'
import { PROCEDURAL_GENERATION_VERSION } from '../game/generation/version'
import { analyzeCase } from '../game/analysis'
import { findKiller } from '../game/rules'
import { getNormalCaseId, getNormalCaseSeed } from '../game/normal/ids'
import { hydrateFrozenNormalCase } from '../game/normal/frozen'
import { boardSignature, boardSimilarity, caseFingerprint, clueSignature, solutionSignature } from '../game/normal/signatures'
import { selectScenarioPack } from '../game/scenarios/catalog'
import type { DifficultyRating, GameCase } from '../game/types'
import { validateCaseDefinition } from '../game/validation'
import { validateHumanClueQuality } from '../game/generation/clueQuality'

const ROOT = resolve(import.meta.dirname, '../..')
const FROZEN_PATH = resolve(ROOT, 'src/data/normal/frozen.ts')
const REPORT_PATH = resolve(ROOT, 'art-source/normal-cases-report.json')
const INTRO = 'Reconstruye la escena a partir de las declaraciones y descubre quién se quedó a solas con la víctima.'
const PACK_IDS = ['cafeteria', 'house', 'office', 'outdoor', 'hotel', 'hospital'] as const
type PackId = typeof PACK_IDS[number]
const distribution: Record<DifficultyRating, Record<PackId, number>> = {
  1: { cafeteria: 14, house: 14, office: 13, outdoor: 13, hotel: 13, hospital: 13 },
  2: { cafeteria: 13, house: 13, office: 14, outdoor: 14, hotel: 13, hospital: 13 },
  3: { cafeteria: 13, house: 13, office: 13, outdoor: 13, hotel: 14, hospital: 14 },
  4: { cafeteria: 14, house: 13, office: 14, outdoor: 13, hotel: 13, hospital: 13 },
  5: { cafeteria: 13, house: 14, office: 13, outdoor: 14, hotel: 13, hospital: 13 },
}
const createSchedule = (difficulty: DifficultyRating): PackId[] => {
  const remaining = { ...distribution[difficulty] }
  const schedule: PackId[] = difficulty === 1 ? ['cafeteria'] : []
  if (difficulty === 1) remaining.cafeteria -= 1
  let previous: PackId | undefined = schedule.at(-1)
  while (schedule.length < 80) {
    const candidates = PACK_IDS.filter(id => id !== previous && remaining[id] > 0)
    if (candidates.length === 0) throw new Error(`Unable to create pack schedule for difficulty ${difficulty}.`)
    const max = Math.max(...candidates.map(id => remaining[id]))
    const selected = candidates.filter(id => remaining[id] === max)[(schedule.length + difficulty * 3) % candidates.filter(id => remaining[id] === max).length]
    schedule.push(selected); remaining[selected] -= 1; previous = selected
  }
  return schedule
}
const candidateSeed = (baseSeed: number, attempt: number) => attempt === 0 ? baseSeed : (baseSeed + Math.imul(attempt, 0x9e3779b1)) >>> 0
const toFrozen = (caseData: GameCase, scenarioPackId: string, caseNumber: number, generated: ReturnType<typeof generateProceduralCase>, originalSeed: number, acceptedSeed: number, candidateAttempt: number): FrozenNormalCase => ({
  difficulty: caseData.difficulty, caseNumber, id: caseData.id, title: caseData.title, intro: caseData.intro, scenarioPackId, rows: caseData.rows, columns: caseData.columns,
  zoneIds: caseData.zones.map(zone => zone.id),
  board: caseData.board.map(cell => ({ row: cell.row, column: cell.column, zoneId: cell.zoneId, occupiable: cell.occupiable, ...(cell.object ? { objectId: cell.object.id } : {}) })),
  characters: caseData.characters.map(character => ({ id: character.id, name: character.name, ...(character.gender ? { gender: character.gender } : {}), ...(character.avatarImage ? { avatarId: avatarCatalog.find(avatar => avatar.image === character.avatarImage)?.id } : {}), ...(character.roleId ? { roleId: character.roleId } : {}), isVictim: character.isVictim, ...(character.traitIds ? { traitIds: [...character.traitIds] } : {}), clues: structuredClone(character.clues) })),
  solution: structuredClone(caseData.solution), ...(caseData.globalClues ? { globalClues: structuredClone(caseData.globalClues) } : {}), ...(caseData.edgeFeatures ? { edgeFeatures: structuredClone(caseData.edgeFeatures) } : {}), ...(caseData.traitDefinitions ? { traitDefinitions: structuredClone(caseData.traitDefinitions) } : {}),
  killerId: generated.killerId,
  generation: { originalSeed, acceptedSeed, effectiveSeed: generated.effectiveSeed, seedOffset: generated.seedOffset, candidateAttempt, scenarioAttempts: generated.scenarioAttempts, stats: structuredClone(generated.stats) },
})
const frozenRoster = (frozen: FrozenNormalCase) => frozen.characters.map(character => ({ id: character.id, name: character.name, gender: character.gender, avatarId: character.avatarId, roleId: character.roleId, isVictim: character.isVictim }))
const source = (data: FrozenNormalCaseSet) => `import type { FrozenNormalCaseSet } from './types'\n\n/** Generated by npm run freeze:normal-cases. Do not edit manually. */\nexport const frozenNormalCaseSet: FrozenNormalCaseSet = ${JSON.stringify(data, null, 2)}\n`
const replaceAtomically = (path: string, contents: string) => { const temp = `${path}.tmp`; const backup = `${path}.bak`; mkdirSync(dirname(path), { recursive: true }); writeFileSync(temp, contents, 'utf8'); if (readFileSync(temp, 'utf8') !== contents) throw new Error(`Could not verify temporary output: ${path}`); rmSync(backup, { force: true }); try { renameSync(path, backup) } catch { /* first generation */ }; renameSync(temp, path); rmSync(backup, { force: true }) }

const rejects: Record<string, number> = { wrongPack: 0, generationFailure: 0, humanClueQuality: 0, boardDuplicate: 0, nearDuplicate: 0, rosterTooSimilar: 0, avatarTooSimilar: 0, repeatedVictim: 0, repeatedKiller: 0, solutionDuplicate: 0, clueDuplicate: 0 }
const allFrozen: FrozenNormalCase[] = []
const fingerprints = new Set<string>()
const perDifficulty = new Map<DifficultyRating, FrozenNormalCase[]>()
let candidatesEvaluated = 0

for (const difficulty of [1, 2, 3, 4, 5] as const) {
  const accepted: FrozenNormalCase[] = []
  if (difficulty === 1) accepted.push({ difficulty: 1, caseNumber: 1, id: case001.id, title: case001.title, intro: case001.intro, scenarioPackId: 'cafeteria', rows: case001.rows, columns: case001.columns, zoneIds: case001.zones.map(zone => zone.id), board: case001.board.map(cell => ({ row: cell.row, column: cell.column, zoneId: cell.zoneId, occupiable: cell.occupiable, ...(cell.object ? { objectId: cell.object.id } : {}) })), characters: case001.characters.map(character => ({ id: character.id, name: character.name, isVictim: character.isVictim, clues: structuredClone(character.clues) })), solution: structuredClone(case001.solution), killerId: 'bruno', generation: { originalSeed: getNormalCaseSeed(1, 1), acceptedSeed: getNormalCaseSeed(1, 1), effectiveSeed: getNormalCaseSeed(1, 1), seedOffset: 0, candidateAttempt: 0, scenarioAttempts: 0, stats: { placementAttempts: 0, candidateClues: 0, selectedClues: case001.characters.reduce((total, character) => total + character.clues.length, 0), removedClues: 0, solverCalls: 0 } } })
  const start = difficulty === 1 ? 2 : 1
  const schedule = createSchedule(difficulty)
  for (let caseNumber = start; caseNumber <= 80; caseNumber += 1) {
    const targetPack = schedule[caseNumber - 1], originalSeed = getNormalCaseSeed(difficulty, caseNumber)
    let acceptedCase: FrozenNormalCase | undefined
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const seed = candidateSeed(originalSeed, attempt); candidatesEvaluated += 1
      if (selectScenarioPack(seed).id !== targetPack) { rejects.wrongPack += 1; continue }
      let generated: ReturnType<typeof generateProceduralCase>
      try { generated = generateProceduralCase({ id: getNormalCaseId(difficulty, caseNumber), title: `Expediente ${String(caseNumber).padStart(2, '0')}`, intro: INTRO, difficulty, seed }) } catch { rejects.generationFailure += 1; continue }
      if (validateHumanClueQuality(generated.caseData).length > 0) { rejects.humanClueQuality += 1; continue }
      const frozen = toFrozen(generated.caseData, targetPack, caseNumber, generated, originalSeed, seed, attempt)
      const previous = accepted.at(-1)
      const boardDuplicate = accepted.some(item => boardSignature(hydrateFrozenNormalCase(item)) === boardSignature(generated.caseData))
      if (boardDuplicate) { rejects.boardDuplicate += 1; continue }
      if (accepted.filter(item => item.scenarioPackId === targetPack).some(item => boardSimilarity(hydrateFrozenNormalCase(item), generated.caseData) >= .9)) { rejects.nearDuplicate += 1; continue }
      if (previous) {
        const names = new Set(previous.characters.map(character => character.name)), sharedNames = frozen.characters.filter(character => names.has(character.name)).length
        if (sharedNames > frozen.characters.length / 2) { rejects.rosterTooSimilar += 1; continue }
        const avatars = new Set(previous.characters.map(character => character.avatarId)), sharedAvatars = frozen.characters.filter(character => avatars.has(character.avatarId)).length
        if (sharedAvatars > frozen.characters.length * .75) { rejects.avatarTooSimilar += 1; continue }
        const previousVictim = previous.characters.find(character => character.isVictim)?.name, currentVictim = frozen.characters.find(character => character.isVictim)?.name
        if (previousVictim === currentVictim) { rejects.repeatedVictim += 1; continue }
        const previousKiller = previous.characters.find(character => character.id === previous.killerId)?.name, currentKiller = frozen.characters.find(character => character.id === frozen.killerId)?.name
        if (previousKiller === currentKiller) { rejects.repeatedKiller += 1; continue }
      }
      if (accepted.some(item => solutionSignature(item.solution) === solutionSignature(frozen.solution))) { rejects.solutionDuplicate += 1; continue }
      if (accepted.some(item => clueSignature(hydrateFrozenNormalCase(item)) === clueSignature(generated.caseData))) { rejects.clueDuplicate += 1; continue }
      const fingerprint = caseFingerprint(generated.caseData, targetPack, generated.killerId, frozenRoster(frozen))
      if (fingerprints.has(fingerprint)) throw new Error(`Duplicate global fingerprint for ${frozen.id}.`)
      fingerprints.add(fingerprint); acceptedCase = frozen; break
    }
    if (!acceptedCase) throw new Error(`Unable to freeze Normal case D${difficulty}/C${caseNumber} after 500 candidates.`)
    accepted.push(acceptedCase)
    process.stdout.write(`Frozen D${difficulty}/C${String(caseNumber).padStart(2, '0')} (${targetPack})\n`)
  }
  if (accepted.length !== 80) throw new Error(`Difficulty ${difficulty} did not produce 80 cases.`)
  const packCounts = Object.fromEntries(PACK_IDS.map(pack => [pack, accepted.filter(item => item.scenarioPackId === pack).length]))
  if (JSON.stringify(packCounts) !== JSON.stringify(distribution[difficulty])) throw new Error(`Scenario distribution mismatch for difficulty ${difficulty}.`)
  perDifficulty.set(difficulty, accepted); allFrozen.push(...accepted)
}
if (allFrozen.length !== 400 || fingerprints.size !== 399) throw new Error('Frozen set did not produce the expected case count.')
const data: FrozenNormalCaseSet = { formatVersion: 1, caseSetVersion: 2, proceduralGenerationVersion: PROCEDURAL_GENERATION_VERSION, cases: allFrozen.filter(item => !(item.difficulty === 1 && item.caseNumber === 1)) }
const fullFingerprints = new Set<string>()
for (const frozen of allFrozen) {
  const caseData = frozen.difficulty === 1 && frozen.caseNumber === 1 ? case001 : hydrateFrozenNormalCase(frozen)
  const errors = validateCaseDefinition(caseData)
  if (errors.length > 0) throw new Error(`Case ${frozen.id} is invalid: ${errors.join('; ')}`)
  const analysis = analyzeCase(caseData)
  if (analysis.status !== 'unique' || analysis.matchesCanonical !== true) throw new Error(`Case ${frozen.id} is not uniquely canonical.`)
  if (findKiller(caseData, caseData.solution)?.id !== frozen.killerId) throw new Error(`Case ${frozen.id} has an invalid frozen killer.`)
  const fingerprint = caseFingerprint(caseData, frozen.scenarioPackId, frozen.killerId, frozenRoster(frozen))
  if (fullFingerprints.has(fingerprint)) throw new Error(`Duplicate frozen fingerprint: ${frozen.id}`)
  fullFingerprints.add(fingerprint)
}
const summary = (cases: FrozenNormalCase[]) => { const clues = cases.flatMap(item => item.characters.flatMap(character => character.clues)); return { totalClues: clues.length, averageCluesPerCharacter: clues.length / cases.reduce((total, item) => total + item.characters.length, 0), clueTypeCounts: Object.fromEntries([...new Set(clues.map(clue => clue.type))].map(type => [type, clues.filter(clue => clue.type === type).length])), negativeClueCount: clues.filter(clue => ['notZone', 'notOnObject', 'notBesideObject', 'notBesideWall', 'notBesideEdgeFeature', 'withoutTraitInZone'].includes(clue.type)).length } }
const report = { freezeFormatVersion: 1, normalCaseSetVersion: 2, proceduralGenerationVersion: PROCEDURAL_GENERATION_VERSION, totalCases: 400, generatedCases: 399, manualCases: 1, candidatesEvaluated, rejects, humanClueQualityRejects: rejects.humanClueQuality, difficulties: Object.fromEntries([...perDifficulty.entries()].map(([difficulty, cases]) => [difficulty, { count: cases.length, packs: Object.fromEntries(PACK_IDS.map(pack => [pack, cases.filter(item => item.scenarioPackId === pack).length])), candidateAttempts: cases.map(item => item.generation.candidateAttempt), seedOffsets: cases.map(item => item.generation.seedOffset), ...summary(cases) }])), globalPacks: Object.fromEntries(PACK_IDS.map(pack => [pack, allFrozen.filter(item => item.scenarioPackId === pack).length])), fingerprints: [...fullFingerprints], duplicateCount: 0, nearDuplicateRejects: rejects.nearDuplicate, frozenSourceBytes: Buffer.byteLength(source(data)) }
replaceAtomically(FROZEN_PATH, source(data)); replaceAtomically(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`)
process.stdout.write(`Frozen 399 generated cases plus case001. Source: ${statSync(FROZEN_PATH).size} bytes.\n`)
