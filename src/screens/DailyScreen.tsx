import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { formatDifficultyStars } from '../game/difficulty'
import { allDifficultyPresets } from '../game/difficultyPresets'
import { formatDailyDate, getDailyCaseId, getDateForDailyKey } from '../game/daily/date'
import { useDailyDate } from '../game/daily/useDailyDate'
import { loadDailySession, startDailySession } from '../game/persistence/dailySession'
import { getUnlockedDifficulties, loadNormalProgress } from '../game/persistence/normalProgress'
import { isCaseCompleted } from '../game/persistence/progress'
import type { DifficultyRating } from '../game/types'
import { GameScreen } from './GameScreen'
import { recordInvestigationCompletion } from '../game/persistence/investigationHistory'
import { announceAchievements, reconcileCurrentAchievements } from '../game/achievements/runtime'

export function DailyScreen() {
  const navigate = useNavigate(), date = useDailyDate(), progress = loadNormalProgress()
  const [session, setSession] = useState(() => loadDailySession(date))
  const [selected, setSelected] = useState<DifficultyRating>(session?.difficulty ?? progress.selectedDifficulty)
  const sessionDate = session ? getDateForDailyKey(session.dateKey) ?? date : date
  if (!session && isCaseCompleted(getDailyCaseId(date))) return <main className="simple-screen"><AppHeader back/><section className="simple-hero"><p className="eyebrow">CASO DIARIO COMPLETADO</p><h1>Expediente cerrado</h1><p>Ya has resuelto el expediente de hoy. Vuelve mañana para un nuevo caso.</p><Link className="primary" to="/">VOLVER AL INICIO</Link></section></main>
  if (!session) { const unlocked = getUnlockedDifficulties(progress); return <main className="simple-screen"><AppHeader back/><section className="simple-hero"><p className="eyebrow">CASO DIARIO · {formatDailyDate(date).toUpperCase()}</p><h1>Elige la dificultad</h1><p>Una vez iniciado, el nivel del expediente quedará fijado hasta mañana.</p></section><section className="normal-difficulties"><div className="difficulty-tabs">{allDifficultyPresets.map(preset => { const available = unlocked.includes(preset.rating); return <button key={preset.rating} disabled={!available} className={selected === preset.rating ? 'active' : ''} onClick={() => setSelected(preset.rating)} aria-pressed={selected === preset.rating}>{formatDifficultyStars(preset.rating)}<small>{preset.rows}×{preset.columns}</small>{available ? <em>Disponible</em> : <em>🔒</em>}</button> })}</div><p className="unlock-note">Las dificultades bloqueadas se desbloquean jugando Casos Normales.</p><button className="primary check" onClick={() => { const started = startDailySession(date, selected, progress); if (started) setSession(started) }}>COMENZAR CASO <span>→</span></button></section></main> }
  return <div className="case-route"><AppHeader back/><GameScreen gameCase={session.caseData} completionId={getDailyCaseId(sessionDate)} eyebrowLabel={`CASO DIARIO · ${formatDifficultyStars(session.difficulty)} · ${formatDailyDate(sessionDate).toUpperCase()}`} onCaseCompleted={assists => { recordInvestigationCompletion({ mode: 'daily', logicalId: getDailyCaseId(sessionDate), difficulty: session.difficulty, assists }); announceAchievements(reconcileCurrentAchievements().newlyUnlocked) }} onCompletionAcknowledged={() => navigate('/')}/></div>
}
