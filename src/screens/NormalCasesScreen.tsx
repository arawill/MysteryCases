import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { formatDifficultyStars } from '../game/difficulty'
import { allDifficultyPresets } from '../game/difficultyPresets'
import { NORMAL_CASE_COUNT, NORMAL_UNLOCK_CASE_COUNT } from '../game/normal/constants'
import { countCompletedUnlockCases, getUnlockedDifficulties, isDifficultyUnlocked, isNormalCaseCompleted, loadNormalProgress, setSelectedDifficulty, type NormalModeProgress } from '../game/persistence/normalProgress'

export function NormalCasesScreen() {
  const [progress, setProgress] = useState<NormalModeProgress>(() => loadNormalProgress())
  const selected = progress.selectedDifficulty, unlocked = getUnlockedDifficulties(progress)
  return <main className="simple-screen normal-screen"><AppHeader back />
    <section className="simple-hero"><p className="eyebrow">ARCHIVO PRINCIPAL</p><h1>Casos normales</h1><p>Elige una dificultad y abre uno de los {NORMAL_CASE_COUNT} expedientes. Las dificultades superiores se desbloquean al resolver la dificultad anterior.</p></section>
    <section className="normal-difficulties"><p className="eyebrow">DIFICULTAD</p><div className="difficulty-tabs">{allDifficultyPresets.map(preset => { const available = isDifficultyUnlocked(preset.rating, progress); return <button key={preset.rating} disabled={!available} className={selected === preset.rating ? 'active' : ''} aria-pressed={selected === preset.rating} onClick={() => setProgress(setSelectedDifficulty(preset.rating))}>{formatDifficultyStars(preset.rating)}<small>{preset.rows}×{preset.columns}</small>{!available && <em>🔒</em>}</button> })}</div>{unlocked.length < 5 && <p className="unlock-note">Desbloquea {formatDifficultyStars((unlocked.length + 1) as typeof selected)} completando {NORMAL_UNLOCK_CASE_COUNT} casos en {formatDifficultyStars(unlocked.at(-1) ?? 1)} ({countCompletedUnlockCases(unlocked.at(-1) ?? 1, progress)}/{NORMAL_UNLOCK_CASE_COUNT}).</p>}</section>
    <section><div className="section-heading"><div><p className="eyebrow">EXPEDIENTES</p><h2>{formatDifficultyStars(selected)} · {NORMAL_CASE_COUNT} casos</h2></div></div><div className="normal-case-grid">{Array.from({ length: NORMAL_CASE_COUNT }, (_, index) => { const number = index + 1, completed = isNormalCaseCompleted(selected, number, progress); return <Link key={number} to={`/normal/${selected}/${number}`} className={`normal-case-card ${completed ? 'completed' : ''}`}><span>CASO</span><strong>{String(number).padStart(2, '0')}</strong><small>{completed ? 'RESUELTO' : 'INVESTIGAR'}</small></Link> })}</div></section>
  </main>
}
