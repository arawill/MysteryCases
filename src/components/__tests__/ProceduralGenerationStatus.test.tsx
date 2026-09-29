import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ProceduralGenerationStatus } from '../ProceduralGenerationStatus'

const request = { protocolVersion: 1 as const, requestId: 'ui', mode: 'infinite' as const, seed: 1, difficulty: 1 as const }

describe('procedural generation accessible status', () => {
  it('renders immediate polite status and Worker cancellation', () => {
    const markup = renderToStaticMarkup(<ProceduralGenerationStatus state={{ status: 'generating', request, transport: 'worker' }} loadingText="Generando un expediente…" onRetry={vi.fn()} onCancel={vi.fn()} />)
    expect(markup).toContain('role="status"')
    expect(markup).toContain('aria-live="polite"')
    expect(markup).toContain('Generando un expediente…')
    expect(markup).toContain('CANCELAR')
  })

  it('does not promise cancellation in fallback and exposes retry errors as alerts', () => {
    const fallback = renderToStaticMarkup(<ProceduralGenerationStatus state={{ status: 'generating', request, transport: 'fallback' }} loadingText="Generando un expediente…" onRetry={vi.fn()} onCancel={vi.fn()} />)
    expect(fallback).not.toContain('CANCELAR')
    const error = renderToStaticMarkup(<ProceduralGenerationStatus state={{ status: 'error', request, kind: 'storage', message: 'storage failed' }} loadingText="loading" onRetry={vi.fn()} onCancel={vi.fn()} />)
    expect(error).toContain('role="alert"')
    expect(error).toContain('REINTENTAR')
  })
})
