import { AppHeader } from '../components/AppHeader'
import './StatsScreen.css'
import { formatDifficultyStars } from '../game/difficulty'
import { loadNormalProgress } from '../game/persistence/normalProgress'
import { loadPlayerStats } from '../game/persistence/playerStats'
import { loadProgress } from '../game/persistence/progress'
import { loadInvestigationHistory } from '../game/persistence/investigationHistory'
import { buildPlayerStatistics } from '../game/statistics'
import { achievementCatalog } from '../game/achievements/catalog'
import { loadAchievementProgress } from '../game/persistence/achievementProgress'

export function StatsScreen() {
  const statistics = buildPlayerStatistics({ normalProgress: loadNormalProgress(), progress: loadProgress(), playerStats: loadPlayerStats(), investigationHistory: loadInvestigationHistory(), today: new Date() })
  const achievements = loadAchievementProgress().unlocked
  const recentAchievements = [...achievements].sort((left, right) => Date.parse(right.unlockedAt) - Date.parse(left.unlockedAt)).slice(0, 3).map(item => ({ ...item, definition: achievementCatalog.find(achievement => achievement.id === item.id)! }))
  return <main className="simple-screen stats-screen">
    <AppHeader back />
    <section className="simple-hero"><p className="eyebrow">ARCHIVO DEL INVESTIGADOR</p><h1>ESTADÍSTICAS</h1><p>Tu historial de investigaciones hasta ahora.</p></section>
    <section className="stats-summary" aria-label="Resumen de investigaciones">
      <article className="stats-card"><span>EXPEDIENTES CERRADOS</span><strong>{statistics.totalSolved}</strong></article><article className="stats-card"><span>DIFICULTAD MÁXIMA</span><strong>{formatDifficultyStars(statistics.normal.highestUnlocked)}</strong></article><article className="stats-card"><span>CASOS DIARIOS</span><strong>{statistics.daily.completed}</strong></article><article className="stats-card"><span>CASOS INFINITOS</span><strong>{statistics.infinite.completed}</strong></article>
    </section>
    <section className="stats-section"><p className="eyebrow">PROGRESO · CASOS NORMALES</p><div className="stats-grid">{statistics.normal.byDifficulty.map(item => <article className="stats-card progress-card" key={item.difficulty}><h2>{item.stars} {!item.unlocked && <small>🔒 BLOQUEADA</small>}</h2><p>{item.completed} / {item.max} expedientes</p><progress value={item.completed} max={item.max} aria-label={`Dificultad ${item.difficulty}: ${item.completed} de ${item.max}`} />{item.difficulty < 5 && <small>Desbloqueo siguiente: {item.firstForty} / 40</small>}</article>)}</div></section>
    <div className="stats-grid"><section className="stats-card"><p className="eyebrow">CASO DIARIO</p><h2>Rachas</h2><p>Resueltos: <strong>{statistics.daily.completed}</strong></p><p>Racha actual: <strong>{statistics.daily.currentStreak} días</strong></p><p>Mejor racha: <strong>{statistics.daily.bestStreak} días</strong></p></section><section className="stats-card"><p className="eyebrow">CASO INFINITO</p><h2>Expedientes</h2><p>Expedientes resueltos: <strong>{statistics.infinite.completed}</strong></p></section><section className="stats-card"><p className="eyebrow">AYUDAS DE INVESTIGACIÓN</p><h2>Consultas</h2><p>Revisiones: <strong>{statistics.hints.review}</strong></p><p>Pistas: <strong>{statistics.hints.exclusion}</strong></p><p>Comprobaciones de posición: <strong>{statistics.hints.reveal}</strong></p><p>Total de ayudas: <strong>{statistics.hints.total}</strong></p></section></div>
    <section className="stats-section"><p className="eyebrow">RENDIMIENTO REGISTRADO</p><article className="stats-card"><p>Investigaciones registradas: <strong>{statistics.performance.trackedUnique}</strong></p><p>Resoluciones registradas: <strong>{statistics.performance.trackedCompletions}</strong></p><p>Expedientes impecables: <strong>{statistics.performance.perfectUnique}</strong></p><small>El rendimiento detallado se registra desde esta versión.</small></article></section>
    <section className="stats-section"><p className="eyebrow">LOGROS</p><article className="stats-card"><h2>{achievements.length} / {achievementCatalog.length} desbloqueados</h2>{recentAchievements.length ? <ul className="achievement-recent">{recentAchievements.map(item => <li key={item.id}><strong>{item.definition.title}</strong><small>{item.definition.category} · {new Date(item.unlockedAt).toLocaleDateString()}</small></li>)}</ul> : <p>Aún no has desbloqueado logros.</p>}</article></section>
  </main>
}
