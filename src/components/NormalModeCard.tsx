import { Link } from 'react-router-dom'
import { formatDifficultyStars } from '../game/difficulty'
import { countCompletedNormalCases, getUnlockedDifficulties, type NormalModeProgress } from '../game/persistence/normalProgress'

export function NormalModeCard({ progress }: { progress: NormalModeProgress }) { const difficulty = progress.selectedDifficulty; return <article className="case-card normal-mode-card"><div><p className="eyebrow">CASOS NORMALES</p><h2>Archivo principal</h2><p>80 expedientes numerados para reconstruir a tu ritmo.</p></div><div className="case-card-footer"><div><span className="available">{getUnlockedDifficulties(progress).map(formatDifficultyStars).join(' / ')}</span><p>{countCompletedNormalCases(difficulty, progress)}/80 resueltos en {formatDifficultyStars(difficulty)}</p></div><Link className="primary" to="/normal">Ver casos <span>→</span></Link></div></article> }
