import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { formatDifficultyStars } from '../game/difficulty'
import { allDifficultyPresets } from '../game/difficultyPresets'
import { formatDailyDate, getDailyCaseId, getDailyDateKey, getDateForDailyKey } from '../game/daily/date'
import { useDailyDate } from '../game/daily/useDailyDate'
import { abandonDailySession, loadDailySession, startDailySession } from '../game/persistence/dailySession'
import { getUnlockedDifficulties, loadNormalProgress } from '../game/persistence/normalProgress'
import { isCaseCompleted } from '../game/persistence/progress'
import type { DifficultyRating } from '../game/types'
import { GameScreen } from './GameScreen'
import { announceAchievements } from '../game/achievements/runtime'
import { cleanupDailyRetention } from '../game/persistence/dailyRetention'

export function DailyScreen() {
  const navigate = useNavigate(), date = useDailyDate(), progress = loadNormalProgress()
  const [session, setSession] = useState(() => loadDailySession(date))
  const [selected, setSelected] = useState<DifficultyRating>(session?.difficulty ?? progress.selectedDifficulty)
  const [storageWarning, setStorageWarning] = useState('')
  const sessionDate = session ? getDateForDailyKey(session.dateKey) ?? date : date
  if (!session && isCaseCompleted(getDailyCaseId(date))) return <main className="simple-screen"><AppHeader back/><section className="simple-hero"><p className="eyebrow">CASO DIARIO COMPLETADO</p><h1>Expediente cerrado</h1><p>Ya has resuelto el expediente de hoy. Vuelve mañana para un nuevo caso.</p><Link className="primary" to="/">VOLVER AL INICIO</Link></section></main>
  if (!session) { const unlocked = getUnlockedDifficulties(progress); return <main className="simple-screen"><AppHeader back/><section className="simple-hero"><p className="eyebrow">CASO DIARIO · {formatDailyDate(date).toUpperCase()}</p><h1>Elige la dificultad</h1><p>Una vez iniciado, el nivel del expediente quedará fijado hasta mañana.</p></section><section className="normal-difficulties"><div className="difficulty-tabs">{allDifficultyPresets.map(preset => { const available = unlocked.includes(preset.rating); return <button key={preset.rating} disabled={!available} className={selected === preset.rating ? 'active' : ''} onClick={() => setSelected(preset.rating)} aria-pressed={selected === preset.rating}>{formatDifficultyStars(preset.rating)}<small>{preset.rows}×{preset.columns}</small>{available ? <em>Disponible</em> : <em>🔒</em>}</button> })}</div><p className="unlock-note">Las dificultades bloqueadas se desbloquean jugando Casos Normales.</p>{storageWarning && <p className="feedback storage-warning" role="alert">{storageWarning}</p>}<button className="primary check" onClick={() => { const started = startDailySession(date, selected, progress); if (started) { setSession(started); if (!cleanupDailyRetention(date).ok) setStorageWarning('El caso se guardó, pero no se pudo completar la limpieza de partidas antiguas.') } else setStorageWarning('No se pudo guardar el caso. Libera espacio e inténtalo de nuevo.') }}>COMENZAR CASO <span>→</span></button></section></main> }
  const oldSession = session.dateKey !== getDailyDateKey(date)
  return <div className="case-route"><AppHeader back/>{oldSession && <div className="infinite-controls"><p>Estás continuando el caso diario de {formatDailyDate(sessionDate)}.</p><button onClick={() => { if (window.confirm('¿Descartar este caso diario anterior? Se perderá su progreso.')) { if (abandonDailySession()) { cleanupDailyRetention(date); setSession(null); setStorageWarning('') } else setStorageWarning('No se pudo descartar el caso de forma segura. Inténtalo de nuevo.') } }}>DESCARTAR CASO ANTERIOR</button></div>}{storageWarning && <p className="feedback storage-warning" role="alert">{storageWarning}</p>}<GameScreen gameCase={session.caseData} completionId={getDailyCaseId(sessionDate)} completionIdentity={{ mode: 'daily', logicalId: getDailyCaseId(sessionDate), difficulty: session.difficulty, dateKey: session.dateKey }} eyebrowLabel={`CASO DIARIO · ${formatDifficultyStars(session.difficulty)} · ${formatDailyDate(sessionDate).toUpperCase()}`} onCaseCompleted={(_assists, result) => { cleanupDailyRetention(date); announceAchievements(result?.newlyUnlocked ?? []) }} onCompletionAcknowledged={() => navigate('/')}/></div>
}
