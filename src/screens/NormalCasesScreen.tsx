import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { formatDifficultyStars } from '../game/difficulty'
import { allDifficultyPresets } from '../game/difficultyPresets'
import { getPublishedNormalCount, getPublishedNormalNumbers, isNormalDifficultyAvailable, PUBLISHED_NORMAL_TOTAL } from '../game/normal/availability'
import { countCompletedUnlockCases, getUnlockedDifficulties, isDifficultyUnlocked, isNormalCaseCompleted, loadNormalProgress, setSelectedDifficulty, type NormalModeProgress } from '../game/persistence/normalProgress'

export function NormalCasesScreen() {
  const [progress, setProgress] = useState<NormalModeProgress>(() => loadNormalProgress())
  const selected = progress.selectedDifficulty, unlocked = getUnlockedDifficulties(progress)
  return <main className="simple-screen normal-screen"><AppHeader back />
    <section className="simple-hero"><p className="eyebrow">ARCHIVO PRINCIPAL</p><h1>Casos normales</h1><p>Elige una dificultad y abre uno de los {PUBLISHED_NORMAL_TOTAL} expedientes publicados. Las dificultades superiores se desbloquean al resolver la dificultad anterior.</p></section>
    <section className="normal-difficulties"><p className="eyebrow">DIFICULTAD</p><div className="difficulty-tabs">{allDifficultyPresets.map(preset => { const available = isDifficultyUnlocked(preset.rating, progress); return <button key={preset.rating} disabled={!available} className={selected === preset.rating ? 'active' : ''} aria-pressed={selected === preset.rating} onClick={() => setProgress(setSelectedDifficulty(preset.rating))}>{formatDifficultyStars(preset.rating)}<small>{isNormalDifficultyAvailable(preset.rating) ? `${preset.rows}×${preset.columns}` : "Próximamente"}</small>{!available && <em>🔒</em>}</button> })}</div>{allDifficultyPresets.some(preset => isNormalDifficultyAvailable(preset.rating) && !isDifficultyUnlocked(preset.rating, progress)) && <p className="unlock-note">Desbloquea {formatDifficultyStars((unlocked.length + 1) as typeof selected)} completando {getPublishedNormalCount(unlocked.at(-1) ?? 1)} casos en {formatDifficultyStars(unlocked.at(-1) ?? 1)} ({countCompletedUnlockCases(unlocked.at(-1) ?? 1, progress)}/{getPublishedNormalCount(unlocked.at(-1) ?? 1)}).</p>}</section>
    <section><div className="section-heading"><div><p className="eyebrow">EXPEDIENTES</p><h2>{formatDifficultyStars(selected)} · {getPublishedNormalCount(selected)} casos</h2></div></div><div className="normal-case-grid">{getPublishedNormalNumbers(selected).map(number => { const completed = isNormalCaseCompleted(selected, number, progress); return <Link key={number} to={`/normal/${selected}/${number}`} className={`normal-case-card ${completed ? 'completed' : ''}`}><span>CASO</span><strong>{String(number).padStart(2, '0')}</strong><small>{completed ? 'RESUELTO' : 'INVESTIGAR'}</small></Link> })}</div></section>
  </main>
}
