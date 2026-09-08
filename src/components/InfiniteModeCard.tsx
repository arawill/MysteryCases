import { Link } from 'react-router-dom'
import { formatDifficultyStars } from '../game/difficulty'
import type { InfiniteSession } from '../game/persistence/infiniteSession'
import type { DifficultyRating } from '../game/types'
export function InfiniteModeCard({ session, maxDifficulty }: { session: InfiniteSession | null; maxDifficulty: DifficultyRating }) { return <article className="case-card"><div><p className="eyebrow">CASO INFINITO</p><h2>{session?.status === 'completed' ? 'Expediente resuelto' : session ? 'Expediente en curso' : 'Sin límite'}</h2><p>{session ? `Dificultad: ${formatDifficultyStars(session.difficulty)}` : `Genera expedientes sin límite. Disponibles hasta ${formatDifficultyStars(maxDifficulty)}.`}</p></div><Link className="primary" to="/infinite">{session?.status === 'active' ? 'CONTINUAR' : session?.status === 'completed' ? 'NUEVO CASO' : 'GENERAR CASO'} <span>→</span></Link></article> }
