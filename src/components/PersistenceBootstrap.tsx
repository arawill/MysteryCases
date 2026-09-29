import { useEffect, useState, type ReactNode } from 'react'
import { cleanupDailyRetention } from '../game/persistence/dailyRetention'
import { initializePersistence } from '../game/persistence/initializePersistence'
import { discardPendingLegacyMigration, inspectPendingLegacyMigrations, migratePendingLegacySessions, type LegacyMigrationResult } from '../game/proceduralWorker/legacyMigration'
import { waitForPaintBeforeSynchronousWork } from '../game/proceduralWorker/waitForPaint'

let activeMigration: Promise<LegacyMigrationResult> | null = null
const ensureMigration = () => {
  if (!activeMigration) {
    const current = migratePendingLegacySessions()
    activeMigration = current
    void current.finally(() => { if (activeMigration === current) activeMigration = null })
  }
  return activeMigration
}
const resetMigration = () => { activeMigration = null }

type BootstrapState = { status: 'ready' } | { status: 'migrating' } | { status: 'recovery-error' } | { status: 'error'; result: Extract<LegacyMigrationResult, { ok: false }> }

export function PersistenceBootstrap({ children, recoverySucceeded = true }: { children: ReactNode; recoverySucceeded?: boolean }) {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<BootstrapState>(() => !recoverySucceeded ? { status: 'recovery-error' } : inspectPendingLegacyMigrations().length > 0 ? { status: 'migrating' } : { status: 'ready' })

  useEffect(() => {
    if (state.status === 'ready') { cleanupDailyRetention(); return }
    if (state.status !== 'migrating') return
    let subscribed = true
    void waitForPaintBeforeSynchronousWork().then(ensureMigration).then(result => {
      if (!subscribed) return
      if (result.ok) {
        cleanupDailyRetention()
        setState({ status: 'ready' })
      } else setState({ status: 'error', result })
    })
    return () => { subscribed = false }
  }, [attempt, state.status])

  if (state.status === 'ready') return children
  if (state.status === 'migrating') return <main className="simple-screen persistence-bootstrap" aria-busy="true"><section className="simple-hero"><p className="eyebrow">MYSTERYCASES</p><h1>Actualizando partida</h1><div className="procedural-generation-status" role="status" aria-live="polite"><span className="procedural-generation-spinner" aria-hidden="true"/><p>Actualizando partida guardada…</p></div></section></main>
  if (state.status === 'recovery-error') return <main className="simple-screen persistence-bootstrap"><section className="simple-hero"><p className="eyebrow">MYSTERYCASES</p><h1>No se pudo recuperar el almacenamiento</h1><div className="procedural-generation-error" role="alert"><p>La recuperación segura de la partida no ha podido completarse.</p><div className="procedural-generation-actions"><button type="button" onClick={() => { if (initializePersistence()) setState(inspectPendingLegacyMigrations().length > 0 ? { status: 'migrating' } : { status: 'ready' }) }}>REINTENTAR</button></div></div></section></main>
  const retry = () => { resetMigration(); setAttempt(value => value + 1); setState({ status: 'migrating' }) }
  const discard = () => {
    if (!discardPendingLegacyMigration(state.result.pending)) return
    resetMigration()
    setAttempt(value => value + 1)
    setState({ status: 'migrating' })
  }
  return <main className="simple-screen persistence-bootstrap"><section className="simple-hero"><p className="eyebrow">MYSTERYCASES</p><h1>No se pudo actualizar la partida</h1><div className="procedural-generation-error" role="alert"><p>{state.result.message}</p><div className="procedural-generation-actions"><button type="button" onClick={retry}>REINTENTAR</button><button type="button" onClick={discard}>DESCARTAR PARTIDA</button></div></div></section></main>
}
