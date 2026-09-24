import { useState } from 'react'
import { AppHeader } from '../components/AppHeader'
import { formatDifficultyStars } from '../game/difficulty'
import { allDifficultyPresets } from '../game/difficultyPresets'
import { getInfiniteCaseId } from '../game/infinite/generator'
import { clearCaseSave } from '../game/persistence/caseSave'
import { clearInfiniteSession, createInfiniteSeed, loadInfiniteSession, markInfiniteSessionCompleted, startInfiniteSession } from '../game/persistence/infiniteSession'
import { getUnlockedDifficulties, loadNormalProgress } from '../game/persistence/normalProgress'
import { recordInfiniteCompletion } from '../game/persistence/playerStats'
import type { DifficultyRating } from '../game/types'
import { GameScreen } from './GameScreen'
import { recordInvestigationCompletion } from '../game/persistence/investigationHistory'
import { announceAchievements, reconcileCurrentAchievements } from '../game/achievements/runtime'

export function InfiniteScreen() {
  const progress = loadNormalProgress()
  const [session, setSession] = useState(() => loadInfiniteSession())
  const [previousSeed, setPreviousSeed] = useState<number | undefined>()
  const [selected, setSelected] = useState<DifficultyRating>(progress.selectedDifficulty)
  const unlocked = getUnlockedDifficulties(progress)

  if (!session) return <main className="simple-screen">
    <AppHeader back />
    <section className="simple-hero"><p className="eyebrow">CASO INFINITO</p><h1>Genera un expediente</h1><p>Genera un nuevo expediente procedural y resuélvelo a tu ritmo.</p></section>
    <section className="normal-difficulties"><div className="difficulty-tabs">{allDifficultyPresets.map(preset => <button key={preset.rating} disabled={!unlocked.includes(preset.rating)} className={selected === preset.rating ? 'active' : ''} onClick={() => setSelected(preset.rating)}>{formatDifficultyStars(preset.rating)}<small>{preset.rows}×{preset.columns}</small>{!unlocked.includes(preset.rating) && <em>🔒</em>}</button>)}</div><button className="primary check" onClick={() => { const started = startInfiniteSession(selected, createInfiniteSeed(previousSeed), progress); if (started) setSession(started) }}>GENERAR CASO <span>→</span></button></section>
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
      onCaseCompleted={assists => { markInfiniteSessionCompleted(); recordInfiniteCompletion(getInfiniteCaseId(session.difficulty, session.seed)); recordInvestigationCompletion({ mode: 'infinite', logicalId: getInfiniteCaseId(session.difficulty, session.seed), difficulty: session.difficulty, assists }); announceAchievements(reconcileCurrentAchievements().newlyUnlocked) }}
      onCompletionAcknowledged={() => setSession(current => current ? { ...current, status: 'completed' } : null)}
    />
  </div>
}
