import { useCallback, useEffect, useRef, useState } from 'react'
import type { ProceduralCaseSnapshot } from '../persistence/proceduralSnapshot'
import {
  ProceduralWorkerCancelledError,
  ProceduralWorkerDomainError,
  ProceduralWorkerInfrastructureError,
  proceduralWorkerClient,
  type ProceduralWorkerClient,
} from './client'
import { PROCEDURAL_WORKER_PROTOCOL_VERSION, type DailyGenerateRequest, type GenerateRequest, type InfiniteGenerateRequest } from './protocol'
import { waitForPaintBeforeSynchronousWork } from './waitForPaint'

export type DailyGenerationInput = Omit<DailyGenerateRequest, 'protocolVersion' | 'requestId'>
export type InfiniteGenerationInput = Omit<InfiniteGenerateRequest, 'protocolVersion' | 'requestId'>
export type GenerationInput = DailyGenerationInput | InfiniteGenerationInput
export type GenerationTransport = 'worker' | 'fallback'

export type GenerationState =
  | { status: 'idle' }
  | { status: 'generating'; request: GenerateRequest; transport: GenerationTransport }
  | { status: 'persisting'; request: GenerateRequest; transport: GenerationTransport }
  | { status: 'error'; request: GenerateRequest; kind: 'generation' | 'storage' | 'infrastructure'; message: string }

export type PersistGeneratedSnapshotResult<TSession> =
  | { ok: true; session: TSession }
  | { ok: false; kind: 'generation' | 'storage'; message?: string }

export interface ProceduralGenerationOptions<TSession> {
  client?: ProceduralWorkerClient
  waitForPaint?: () => Promise<void>
  generateFallback(request: GenerateRequest): ProceduralCaseSnapshot
  persist(request: GenerateRequest, snapshot: ProceduralCaseSnapshot): PersistGeneratedSnapshotResult<TSession>
  isCurrent?(request: GenerateRequest): boolean
  invalidatedMessage?: string
  onSuccess(session: TSession): void
}

let activeOwner: symbol | null = null
let requestSequence = 0
const nextRequestId = () => `procedural-${Date.now().toString(36)}-${(++requestSequence).toString(36)}`
const generationMessage = 'No se pudo generar el caso. Inténtalo de nuevo.'
const storageMessage = 'El caso se generó, pero no pudo guardarse. Libera espacio e inténtalo de nuevo.'

export function useProceduralGeneration<TSession>(options: ProceduralGenerationOptions<TSession>) {
  const [state, setState] = useState<GenerationState>({ status: 'idle' })
  const mounted = useRef(true)
  const active = useRef<{ owner: symbol; controller: AbortController; request: GenerateRequest } | null>(null)
  const optionsRef = useRef(options)
  useEffect(() => { optionsRef.current = options }, [options])

  const release = useCallback((owner: symbol) => {
    if (activeOwner === owner) activeOwner = null
    if (active.current?.owner === owner) active.current = null
  }, [])

  const execute = useCallback(async (request: GenerateRequest) => {
    if (active.current || activeOwner) return false
    const owner = Symbol(request.requestId)
    const controller = new AbortController()
    activeOwner = owner
    active.current = { owner, controller, request }
    let transport: GenerationTransport = 'worker'
    if (mounted.current) setState({ status: 'generating', request, transport })
    try {
      let snapshot: ProceduralCaseSnapshot
      try {
        const response = await (optionsRef.current.client ?? proceduralWorkerClient).generate(request, controller.signal)
        snapshot = response.snapshot
      } catch (error) {
        if (error instanceof ProceduralWorkerCancelledError || controller.signal.aborted) return false
        if (error instanceof ProceduralWorkerDomainError) {
          if (mounted.current) setState({ status: 'error', request, kind: 'generation', message: generationMessage })
          return false
        }
        if (!(error instanceof ProceduralWorkerInfrastructureError)) {
          if (mounted.current) setState({ status: 'error', request, kind: 'infrastructure', message: generationMessage })
          return false
        }
        transport = 'fallback'
        if (mounted.current) setState({ status: 'generating', request, transport })
        try {
          await (optionsRef.current.waitForPaint ?? waitForPaintBeforeSynchronousWork)()
          if (controller.signal.aborted || !mounted.current) return false
          snapshot = optionsRef.current.generateFallback(request)
        } catch {
          if (controller.signal.aborted) return false
          if (mounted.current) setState({ status: 'error', request, kind: 'generation', message: generationMessage })
          return false
        }
      }
      if (controller.signal.aborted || !mounted.current) return false
      if (optionsRef.current.isCurrent && !optionsRef.current.isCurrent(request)) {
        if (mounted.current) setState({ status: 'error', request, kind: 'generation', message: optionsRef.current.invalidatedMessage ?? generationMessage })
        return false
      }
      setState({ status: 'persisting', request, transport })
      let persisted: PersistGeneratedSnapshotResult<TSession>
      try { persisted = optionsRef.current.persist(request, snapshot) } catch {
        if (mounted.current) setState({ status: 'error', request, kind: 'generation', message: generationMessage })
        return false
      }
      if (!persisted.ok) {
        if (mounted.current) setState({ status: 'error', request, kind: persisted.kind, message: persisted.message ?? (persisted.kind === 'storage' ? storageMessage : generationMessage) })
        return false
      }
      if (controller.signal.aborted || !mounted.current) return false
      optionsRef.current.onSuccess(persisted.session)
      return true
    } finally {
      release(owner)
    }
  }, [release])

  const start = useCallback((input: GenerationInput) => execute({ ...input, protocolVersion: PROCEDURAL_WORKER_PROTOCOL_VERSION, requestId: nextRequestId() } as GenerateRequest), [execute])

  const retry = useCallback(() => {
    if (state.status !== 'error') return Promise.resolve(false)
    const { requestId: _requestId, protocolVersion: _protocolVersion, ...input } = state.request
    return start(input as GenerationInput)
  }, [start, state])

  const cancel = useCallback(() => {
    const current = active.current
    if (!current) return
    current.controller.abort()
    release(current.owner)
    if (mounted.current) setState({ status: 'idle' })
  }, [release])

  const reset = useCallback(() => { if (!active.current && mounted.current) setState({ status: 'idle' }) }, [])
  const isBusy = useCallback(() => active.current !== null || activeOwner !== null, [])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      const current = active.current
      if (current) {
        current.controller.abort()
        release(current.owner)
      }
    }
  }, [release])

  return { state, start, retry, cancel, reset, isBusy, active: state.status === 'generating' || state.status === 'persisting' }
}
