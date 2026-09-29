import type { GenerationState } from '../game/proceduralWorker/useProceduralGeneration'

export function ProceduralGenerationStatus({ state, loadingText, onRetry, onCancel, onGenerateAnother }: {
  state: GenerationState
  loadingText: string
  onRetry(): void
  onCancel(): void
  onGenerateAnother?: () => void
}) {
  if (state.status === 'generating' || state.status === 'persisting') return <div className="procedural-generation-status" role="status" aria-live="polite">
    <span className="procedural-generation-spinner" aria-hidden="true" />
    <p>{state.status === 'persisting' ? 'Guardando el expediente…' : loadingText}</p>
    {state.status === 'generating' && state.transport === 'worker' && <button type="button" onClick={onCancel}>CANCELAR</button>}
  </div>
  if (state.status === 'error') return <div className="procedural-generation-error" role="alert">
    <p>{state.message}</p>
    <div className="procedural-generation-actions"><button type="button" onClick={onRetry}>REINTENTAR</button>{onGenerateAnother && <button type="button" onClick={onGenerateAnother}>GENERAR OTRO</button>}</div>
  </div>
  return null
}
