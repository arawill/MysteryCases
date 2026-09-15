import { useEffect, useState } from 'react'
import { ACHIEVEMENT_EVENT } from '../game/achievements/runtime'
import type { AchievementDefinition } from '../game/achievements/catalog'
import './AchievementToastHost.css'

export function AchievementToastHost() {
  const [queue, setQueue] = useState<AchievementDefinition[]>([])
  useEffect(() => {
    const receive = (event: Event) => setQueue(current => [...current, ...((event as CustomEvent<AchievementDefinition[]>).detail ?? [])])
    window.addEventListener(ACHIEVEMENT_EVENT, receive)
    return () => window.removeEventListener(ACHIEVEMENT_EVENT, receive)
  }, [])
  const current = queue[0]
  useEffect(() => {
    if (!current) return
    const timer = window.setTimeout(() => setQueue(items => items.slice(1)), 4000)
    return () => window.clearTimeout(timer)
  }, [current])
  if (!current) return null
  return <aside className="achievement-toast-host" aria-live="polite" aria-atomic="true"><section className="achievement-toast" role="status"><button aria-label="Cerrar logro desbloqueado" onClick={() => setQueue(items => items.slice(1))}>×</button><p>🏆 LOGRO DESBLOQUEADO</p><strong>{current.title}</strong><span>{current.description}</span></section></aside>
}
