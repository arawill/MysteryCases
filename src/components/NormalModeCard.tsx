import { Link } from 'react-router-dom'
import { formatDifficultyStars } from '../game/difficulty'
import { NORMAL_CASE_COUNT } from '../game/normal/constants'
import { countCompletedNormalCases, getUnlockedDifficulties, type NormalModeProgress } from '../game/persistence/normalProgress'

export function NormalModeCard({ progress }: { progress: NormalModeProgress }) {
  const difficulty = progress.selectedDifficulty
  return <article className="case-card normal-mode-card"><div><p className="eyebrow">CASOS NORMALES</p><h2>Archivo principal</h2><p>{NORMAL_CASE_COUNT} expedientes numerados para reconstruir a tu ritmo.</p></div><div className="case-card-footer"><div><span className="available">{getUnlockedDifficulties(progress).map(formatDifficultyStars).join(' / ')}</span><p>{countCompletedNormalCases(difficulty, progress)}/{NORMAL_CASE_COUNT} resueltos en {formatDifficultyStars(difficulty)}</p></div><Link className="primary" to="/normal">Ver casos <span>→</span></Link></div></article>
}
