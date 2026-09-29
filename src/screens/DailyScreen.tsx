import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { ProceduralGenerationStatus } from '../components/ProceduralGenerationStatus'
import { announceAchievements } from '../game/achievements/runtime'
import { formatDailyDate, getDailyCaseId, getDailyDateKey, getDateForDailyKey } from '../game/daily/date'
import { useDailyDate } from '../game/daily/useDailyDate'
import { formatDifficultyStars } from '../game/difficulty'
import { allDifficultyPresets } from '../game/difficultyPresets'
import { cleanupDailyRetention } from '../game/persistence/dailyRetention'
import { abandonDailySession, confirmDailySessionFromSnapshot, generateDailySnapshot, loadDailySession, type DailySession } from '../game/persistence/dailySession'
import { getUnlockedDifficulties, loadNormalProgress } from '../game/persistence/normalProgress'
import { isCaseCompleted } from '../game/persistence/progress'
import { useProceduralGeneration } from '../game/proceduralWorker/useProceduralGeneration'
import type { DifficultyRating } from '../game/types'
import { setupMountedRef } from './dailyScreenLifecycle'
import { GameScreen } from './GameScreen'

export function DailyScreen() {
  const navigate = useNavigate(), date = useDailyDate(), progress = loadNormalProgress()
  const [session, setSession] = useState(() => loadDailySession(date))
  const [selected, setSelected] = useState<DifficultyRating>(session?.difficulty ?? progress.selectedDifficulty)
  const [storageWarning, setStorageWarning] = useState('')
  const [rolloverWarning, setRolloverWarning] = useState('')
  const mounted = useRef(true)
  const generation = useProceduralGeneration<DailySession>({
    generateFallback: request => {
      if (request.mode !== 'daily') throw new Error('Invalid Daily request.')
      const requestDate = getDateForDailyKey(request.dateKey)
      if (!requestDate) throw new Error('Invalid Daily date.')
      return generateDailySnapshot(requestDate, request.difficulty)
    },
    persist: (request, snapshot) => {
      if (request.mode !== 'daily') return { ok: false, kind: 'generation' }
      const result = confirmDailySessionFromSnapshot(request.dateKey, request.difficulty, progress, snapshot)
      if (result.ok) return result
      return { ok: false, kind: result.kind === 'storage' ? 'storage' : 'generation' }
    },
    isCurrent: request => request.mode === 'daily' && request.dateKey === getDailyDateKey(new Date()),
    invalidatedMessage: 'Ha comenzado un nuevo día. Genera el caso diario vigente.',
    onSuccess: started => {
      setSession(started)
      if (!cleanupDailyRetention(date).ok) setStorageWarning('El caso se guardó, pero no se pudo completar la limpieza de partidas antiguas.')
    },
  })
  const currentDateKey = getDailyDateKey(date)

  useEffect(() => setupMountedRef(mounted), [])
  useEffect(() => {
    const request = 'request' in generation.state ? generation.state.request : null
    if (request?.mode === 'daily' && request.dateKey !== currentDateKey && generation.active) {
      generation.cancel()
      queueMicrotask(() => { if (mounted.current) setRolloverWarning('Ha comenzado un nuevo día. Ya puedes generar el caso diario vigente.') })
    }
  }, [currentDateKey, generation])

  const sessionDate = session ? getDateForDailyKey(session.dateKey) ?? date : date
  if (!session && isCaseCompleted(getDailyCaseId(date))) return <main className="simple-screen"><AppHeader back/><section className="simple-hero"><p className="eyebrow">CASO DIARIO COMPLETADO</p><h1>Expediente cerrado</h1><p>Ya has resuelto el expediente de hoy. Vuelve mañana para un nuevo caso.</p><Link className="primary" to="/">VOLVER AL INICIO</Link></section></main>
  if (!session) {
    const unlocked = getUnlockedDifficulties(progress)
    const begin = () => {
      if (generation.isBusy()) return
      setRolloverWarning('')
      setStorageWarning('')
      void generation.start({ mode: 'daily', dateKey: currentDateKey, difficulty: selected, includeMetrics: true })
    }
    return <main className="simple-screen"><AppHeader back/><section className="simple-hero"><p className="eyebrow">CASO DIARIO · {formatDailyDate(date).toUpperCase()}</p><h1>Elige la dificultad</h1><p>Una vez iniciado, el nivel del expediente quedará fijado hasta mañana.</p></section><section className="normal-difficulties" aria-busy={generation.active}>
      <div className="difficulty-tabs">{allDifficultyPresets.map(preset => { const available = unlocked.includes(preset.rating); return <button key={preset.rating} disabled={!available || generation.active} className={selected === preset.rating ? 'active' : ''} onClick={() => setSelected(preset.rating)} aria-pressed={selected === preset.rating}>{formatDifficultyStars(preset.rating)}<small>{preset.rows}×{preset.columns}</small>{available ? <em>Disponible</em> : <em>🔒</em>}</button> })}</div>
      <p className="unlock-note">Las dificultades bloqueadas se desbloquean jugando Casos Normales.</p>
      {rolloverWarning && <p className="feedback storage-warning" role="alert">{rolloverWarning}</p>}
      {storageWarning && <p className="feedback storage-warning" role="alert">{storageWarning}</p>}
      <ProceduralGenerationStatus state={generation.state} loadingText="Preparando el caso diario…" onRetry={() => { void generation.retry() }} onCancel={generation.cancel} />
      <button className="primary check" disabled={generation.active} onClick={begin}>{generation.active ? 'PREPARANDO…' : 'COMENZAR CASO'} <span>→</span></button>
    </section></main>
  }
  const oldSession = session.dateKey !== currentDateKey
  return <div className="case-route"><AppHeader back/>{oldSession && <div className="infinite-controls"><p>Estás continuando el caso diario de {formatDailyDate(sessionDate)}.</p><button onClick={() => { if (window.confirm('¿Descartar este caso diario anterior? Se perderá su progreso.')) { if (abandonDailySession()) { cleanupDailyRetention(date); setSession(null); setStorageWarning('') } else setStorageWarning('No se pudo descartar el caso de forma segura. Inténtalo de nuevo.') } }}>DESCARTAR CASO ANTERIOR</button></div>}{storageWarning && <p className="feedback storage-warning" role="alert">{storageWarning}</p>}<GameScreen gameCase={session.caseData} completionId={getDailyCaseId(sessionDate)} completionIdentity={{ mode: 'daily', logicalId: getDailyCaseId(sessionDate), difficulty: session.difficulty, dateKey: session.dateKey }} eyebrowLabel={`CASO DIARIO · ${formatDifficultyStars(session.difficulty)} · ${formatDailyDate(sessionDate).toUpperCase()}`} onCaseCompleted={(_assists, result) => { cleanupDailyRetention(date); announceAchievements(result?.newlyUnlocked ?? []) }} onCompletionAcknowledged={() => navigate('/')}/></div>
}
