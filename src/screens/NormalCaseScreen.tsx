import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { formatDifficultyStars, isDifficultyRating } from '../game/difficulty'
import { getCachedNormalCase } from '../game/normal/generator'
import { getNormalCaseNavigation, type NormalCaseDestination } from '../game/normal/navigation'
import { isDifficultyUnlocked, loadNormalProgress, markNormalCaseCompleted, setSelectedDifficulty } from '../game/persistence/normalProgress'
import type { DifficultyRating } from '../game/types'
import { GameScreen } from './GameScreen'
import { recordInvestigationCompletion } from '../game/persistence/investigationHistory'
import { clearCaseSave } from '../game/persistence/caseSave'
import { announceAchievements, reconcileCurrentAchievements } from '../game/achievements/runtime'

const casePath = ({ difficulty, caseNumber }: NormalCaseDestination) => `/normal/${difficulty}/${caseNumber}`
const caseLabel = (destination: NormalCaseDestination) => `CASO ${String(destination.caseNumber).padStart(2, '0')}`

function NormalCaseNavigation({ previous, next }: { previous: NormalCaseDestination | null; next: NormalCaseDestination | null }) {
  const prepareNavigation = (destination: NormalCaseDestination) => {
    setSelectedDifficulty(destination.difficulty)
    window.scrollTo(0, 0)
  }
  return <nav className="normal-case-navigation" aria-label="Navegación entre casos">
    {previous ? <Link to={casePath(previous)} onClick={() => prepareNavigation(previous)}>← {caseLabel(previous)}</Link> : <span aria-disabled="true">SIN CASO ANTERIOR</span>}
    <Link to="/normal">TODOS LOS CASOS</Link>
    {next ? <Link to={casePath(next)} onClick={() => prepareNavigation(next)}>{caseLabel(next)} →</Link> : <span aria-disabled="true">SIN CASO SIGUIENTE</span>}
  </nav>
}

function LoadedNormalCase({ difficulty, caseNumber }: { difficulty: DifficultyRating; caseNumber: number }) {
  const generated = useMemo(() => getCachedNormalCase({ difficulty, caseNumber }), [difficulty, caseNumber])
  const [notice, setNotice] = useState('')
  const progress = loadNormalProgress()
  const navigation = getNormalCaseNavigation({ difficulty, caseNumber, progress })

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [generated.caseData.id])

  const complete = (assists: { review: number; exclusion: number; positionChecks: number }) => {
    const before = loadNormalProgress()
    const wasNextLocked = difficulty < 5 && !isDifficultyUnlocked((difficulty + 1) as DifficultyRating, before)
    const next = markNormalCaseCompleted(difficulty, caseNumber)
    recordInvestigationCompletion({ mode: 'normal', logicalId: `normal-d${difficulty}-c${String(caseNumber).padStart(2, '0')}`, difficulty, assists })
    clearCaseSave(generated.caseData.id)
    if (wasNextLocked && difficulty < 5 && isDifficultyUnlocked((difficulty + 1) as DifficultyRating, next)) setNotice(`Has desbloqueado la dificultad ${formatDifficultyStars((difficulty + 1) as DifficultyRating)}.`)
    announceAchievements(reconcileCurrentAchievements().newlyUnlocked)
  }

  return <div className="case-route">
    <AppHeader back />
    <div className="normal-case-notice">{notice && <p className="unlock-banner" role="status">{notice}</p>}</div>
    <GameScreen key={generated.caseData.id} gameCase={generated.caseData} eyebrowLabel={`CASOS NORMALES · ${formatDifficultyStars(difficulty)} · EXPEDIENTE ${String(caseNumber).padStart(2, '0')}`} onCaseCompleted={complete} recordGlobalCompletion={false} />
    <NormalCaseNavigation previous={navigation.previous} next={navigation.next} />
  </div>
}

export function NormalCaseScreen() {
  const { difficulty: rawDifficulty, caseNumber: rawCaseNumber } = useParams()
  const difficulty = Number(rawDifficulty)
  const caseNumber = Number(rawCaseNumber)
  const valid = isDifficultyRating(difficulty) && Number.isInteger(caseNumber) && caseNumber >= 1 && caseNumber <= 80
  const progress = loadNormalProgress()
  if (!valid || !isDifficultyUnlocked(difficulty, progress)) return <Navigate to="/normal" replace />
  return <LoadedNormalCase key={`${difficulty}-${caseNumber}`} difficulty={difficulty} caseNumber={caseNumber} />
}
