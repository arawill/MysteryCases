import { useState } from 'react'
import { AppHeader } from '../components/AppHeader'
import { ProceduralGenerationStatus } from '../components/ProceduralGenerationStatus'
import { announceAchievements } from '../game/achievements/runtime'
import { formatDifficultyStars } from '../game/difficulty'
import { allDifficultyPresets } from '../game/difficultyPresets'
import { getInfiniteCaseId } from '../game/infinite/generator'
import { clearCaseSave } from '../game/persistence/caseSave'
import { clearInfiniteSession, confirmInfiniteSessionFromSnapshot, createInfiniteSeed, generateInfiniteSnapshot, loadInfiniteSession, type InfiniteSession } from '../game/persistence/infiniteSession'
import { getUnlockedDifficulties, loadNormalProgress } from '../game/persistence/normalProgress'
import { useProceduralGeneration } from '../game/proceduralWorker/useProceduralGeneration'
import type { DifficultyRating } from '../game/types'
import { GameScreen } from './GameScreen'

export function InfiniteScreen() {
  const progress = loadNormalProgress()
  const [session, setSession] = useState(() => loadInfiniteSession())
  const [previousSeed, setPreviousSeed] = useState<number | undefined>()
  const [selected, setSelected] = useState<DifficultyRating>(progress.selectedDifficulty)
  const [seedError, setSeedError] = useState('')
  const unlocked = getUnlockedDifficulties(progress)
  const generation = useProceduralGeneration<InfiniteSession>({
    generateFallback: request => {
      if (request.mode !== 'infinite') throw new Error('Invalid Infinite request.')
      return generateInfiniteSnapshot(request.difficulty, request.seed)
    },
    persist: (request, snapshot) => {
      if (request.mode !== 'infinite') return { ok: false, kind: 'generation' }
      const result = confirmInfiniteSessionFromSnapshot(request.difficulty, request.seed, progress, snapshot)
      if (result.ok) return result
      return { ok: false, kind: result.kind === 'storage' ? 'storage' : 'generation' }
    },
    onSuccess: setSession,
  })

  const startNew = (excludedSeed = previousSeed) => {
    if (generation.isBusy()) return
    setSeedError('')
    try {
      const seed = createInfiniteSeed(excludedSeed)
      void generation.start({ mode: 'infinite', seed, difficulty: selected, includeMetrics: true })
    } catch {
      setSeedError('No se pudo generar el caso. Inténtalo de nuevo.')
    }
  }
  const generateAnotherAfterError = () => {
    const request = generation.state.status === 'error' ? generation.state.request : null
    startNew(request?.mode === 'infinite' ? request.seed : previousSeed)
  }

  if (!session) return <main className="simple-screen">
    <AppHeader back />
    <section className="simple-hero"><p className="eyebrow">CASO INFINITO</p><h1>Genera un expediente</h1><p>Genera un nuevo expediente procedural y resuélvelo a tu ritmo.</p></section>
    <section className="normal-difficulties" aria-busy={generation.active}>
      <div className="difficulty-tabs">{allDifficultyPresets.map(preset => <button key={preset.rating} disabled={!unlocked.includes(preset.rating) || generation.active} className={selected === preset.rating ? 'active' : ''} onClick={() => setSelected(preset.rating)}>{formatDifficultyStars(preset.rating)}<small>{preset.rows}×{preset.columns}</small>{!unlocked.includes(preset.rating) && <em>🔒</em>}</button>)}</div>
      {seedError && <p className="feedback storage-warning" role="alert">{seedError}</p>}
      <ProceduralGenerationStatus state={generation.state} loadingText="Generando un expediente…" onRetry={() => { void generation.retry() }} onCancel={generation.cancel} onGenerateAnother={generation.state.status === 'error' ? generateAnotherAfterError : undefined} />
      <button className="primary check" disabled={generation.active} onClick={() => startNew()}>{generation.active ? 'GENERANDO…' : 'GENERAR CASO'} <span>→</span></button>
    </section>
  </main>

  if (session.status === 'completed') return <main className="simple-screen">
    <AppHeader back />
    <section className="simple-hero"><p className="eyebrow">CASO RESUELTO</p><h1>Expediente cerrado</h1><button className="primary" onClick={() => { setPreviousSeed(session.seed); clearCaseSave(session.caseData.id); clearInfiniteSession(); setSession(null) }}>GENERAR OTRO CASO</button></section>
  </main>

  return <div className="case-route">
    <AppHeader back />
    <div className="infinite-controls"><button onClick={() => { if (window.confirm('¿Descartar este expediente? Se perderá su progreso.')) { setPreviousSeed(session.seed); clearCaseSave(session.caseData.id); clearInfiniteSession(); setSession(null) } }}>DESCARTAR CASO</button></div>
    <GameScreen
      gameCase={session.caseData}
      eyebrowLabel={`CASO INFINITO · ${formatDifficultyStars(session.difficulty)}`}
      recordGlobalCompletion={false}
      completionIdentity={{ mode: 'infinite', logicalId: getInfiniteCaseId(session.difficulty, session.seed), difficulty: session.difficulty, seed: session.seed }}
      onCaseCompleted={(_assists, result) => announceAchievements(result?.newlyUnlocked ?? [])}
      onCompletionAcknowledged={() => setSession(current => current ? { ...current, status: 'completed' } : null)}
    />
  </div>
}
