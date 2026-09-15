import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'
import './PwaUpdatePrompt.css'

export function PwaUpdatePrompt() {
  const [updateServiceWorker, setUpdateServiceWorker] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null)
  useEffect(() => {
    const update = registerSW({
      immediate: true,
      onNeedRefresh() { setUpdateServiceWorker(() => update) },
      onRegisterError() { /* The online app remains usable when SW registration fails. */ },
    })
  }, [])
  if (!updateServiceWorker) return null
  return <aside className="pwa-update" aria-live="polite" role="status"><strong>NUEVA VERSIÓN DISPONIBLE</strong><span>Hay una actualización de MysteryCases preparada.</span><button onClick={() => updateServiceWorker(true)}>ACTUALIZAR</button></aside>
}
