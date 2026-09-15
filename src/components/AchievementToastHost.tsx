import { useEffect, useState } from 'react'
import { ACHIEVEMENT_EVENT } from '../game/achievements/runtime'
import type { AchievementDefinition } from '../game/achievements/catalog'
import { ACHIEVEMENT_TOAST_DURATION_MS, dequeueAchievement, enqueueAchievements, getCurrentAchievement } from '../game/achievements/toastQueue'
import './AchievementToastHost.css'

export function AchievementToastHost() {
  const [queue, setQueue] = useState<AchievementDefinition[]>([])
  useEffect(() => {
    const receive = (event: Event) => setQueue(current => enqueueAchievements(current, (event as CustomEvent<AchievementDefinition[]>).detail ?? []))
    window.addEventListener(ACHIEVEMENT_EVENT, receive)
    return () => window.removeEventListener(ACHIEVEMENT_EVENT, receive)
  }, [])
  const current = getCurrentAchievement(queue)
  useEffect(() => {
    if (!current) return
    const timer = window.setTimeout(() => setQueue(dequeueAchievement), ACHIEVEMENT_TOAST_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [current])
  if (!current) return null
  return <aside className="achievement-toast-host" aria-live="polite" aria-atomic="true"><section className="achievement-toast" role="status"><button aria-label="Cerrar logro desbloqueado" onClick={() => setQueue(dequeueAchievement)}>×</button><p>🏆 LOGRO DESBLOQUEADO</p><strong>{current.title}</strong><span>{current.description}</span></section></aside>
}
