import {
  parseGenerateRequest,
  parseGenerateResponse,
  parseWorkerReadyMessage,
  type GenerateRequest,
  type GenerateResponse,
} from './protocol'

export class ProceduralWorkerInfrastructureError extends Error {
  constructor(message: string) { super(message); this.name = 'ProceduralWorkerInfrastructureError' }
}

export class ProceduralWorkerDomainError extends Error {
  readonly code: string
  readonly retryable: boolean
  constructor(code: string, message: string, retryable: boolean) { super(message); this.name = 'ProceduralWorkerDomainError'; this.code = code; this.retryable = retryable }
}

export class ProceduralWorkerCancelledError extends Error {
  constructor() { super('Procedural generation was cancelled.'); this.name = 'ProceduralWorkerCancelledError' }
}

export class ProceduralWorkerBusyError extends Error {
  constructor() { super('Another procedural generation is already active.'); this.name = 'ProceduralWorkerBusyError' }
}

export interface WorkerEventLike { data?: unknown }
export type WorkerEventListener = (event: WorkerEventLike) => void
export interface ProceduralWorkerPort {
  postMessage(message: GenerateRequest): void
  terminate(): void
  addEventListener(type: 'message' | 'messageerror' | 'error', listener: WorkerEventListener): void
  removeEventListener(type: 'message' | 'messageerror' | 'error', listener: WorkerEventListener): void
}

export interface ProceduralWorkerClientOptions {
  createWorker(): ProceduralWorkerPort
  handshakeTimeoutMilliseconds?: number
  setTimer?(callback: () => void, delay: number): unknown
  clearTimer?(handle: unknown): void
}

interface PendingGeneration {
  requestId: string
  resolve(response: Extract<GenerateResponse, { ok: true }>): void
  reject(error: Error): void
  signal?: AbortSignal
  abortListener?: () => void
}

interface WorkerRecord {
  port: ProceduralWorkerPort
  ready: boolean
  readyPromise: Promise<void>
  resolveReady(): void
  rejectReady(error: Error): void
  handshakeTimer: unknown
  onMessage: WorkerEventListener
  onError: WorkerEventListener
  onMessageError: WorkerEventListener
}

const defaultWorkerFactory = (): ProceduralWorkerPort => {
  if (typeof Worker === 'undefined') throw new ProceduralWorkerInfrastructureError('Web Worker no está disponible.')
  return new Worker(new URL('./proceduralGeneration.worker.ts', import.meta.url), { type: 'module', name: 'mystery-cases-procedural' }) as unknown as ProceduralWorkerPort
}

export class ProceduralWorkerClient {
  private readonly options: Required<Pick<ProceduralWorkerClientOptions, 'createWorker' | 'handshakeTimeoutMilliseconds' | 'setTimer' | 'clearTimer'>>
  private worker: WorkerRecord | null = null
  private pending: PendingGeneration | null = null

  constructor(options: ProceduralWorkerClientOptions = { createWorker: defaultWorkerFactory }) {
    this.options = {
      createWorker: options.createWorker,
      handshakeTimeoutMilliseconds: options.handshakeTimeoutMilliseconds ?? 10_000,
      setTimer: options.setTimer ?? ((callback, delay) => setTimeout(callback, delay)),
      clearTimer: options.clearTimer ?? (handle => clearTimeout(handle as ReturnType<typeof setTimeout>)),
    }
  }

  get hasActiveRequest() { return this.pending !== null }

  async generate(requestValue: GenerateRequest, signal?: AbortSignal): Promise<Extract<GenerateResponse, { ok: true }>> {
    const request = parseGenerateRequest(requestValue)
    if (!request) throw new ProceduralWorkerDomainError('INVALID_REQUEST', 'La solicitud de generación no es válida.', false)
    if (this.pending) throw new ProceduralWorkerBusyError()
    if (signal?.aborted) throw new ProceduralWorkerCancelledError()

    let resolvePending!: PendingGeneration['resolve']
    let rejectPending!: PendingGeneration['reject']
    const result = new Promise<Extract<GenerateResponse, { ok: true }>>((resolve, reject) => { resolvePending = resolve; rejectPending = reject })
    const pending: PendingGeneration = { requestId: request.requestId, resolve: resolvePending, reject: rejectPending, ...(signal ? { signal } : {}) }
    if (signal) {
      pending.abortListener = () => this.cancelActiveRequest()
      signal.addEventListener('abort', pending.abortListener, { once: true })
    }
    this.pending = pending

    try {
      const worker = this.ensureWorker()
      await worker.readyPromise
      if (this.pending !== pending || signal?.aborted) throw new ProceduralWorkerCancelledError()
      worker.port.postMessage(request)
    } catch (error) {
      if (this.pending === pending) {
        const safeError = error instanceof ProceduralWorkerCancelledError || error instanceof ProceduralWorkerInfrastructureError
          ? error
          : new ProceduralWorkerInfrastructureError('No se pudo iniciar el Worker procedural.')
        this.rejectPending(safeError)
        if (safeError instanceof ProceduralWorkerInfrastructureError) this.disposeWorker()
      }
    }
    return result
  }

  cancelActiveRequest(): void {
    if (!this.pending) return
    this.rejectPending(new ProceduralWorkerCancelledError())
    this.disposeWorker()
  }

  terminate(): void {
    if (this.pending) this.rejectPending(new ProceduralWorkerInfrastructureError('El Worker procedural terminó sin respuesta.'))
    this.disposeWorker()
  }

  private ensureWorker(): WorkerRecord {
    if (this.worker) return this.worker
    let port: ProceduralWorkerPort
    try { port = this.options.createWorker() } catch (error) {
      if (error instanceof ProceduralWorkerInfrastructureError) throw error
      throw new ProceduralWorkerInfrastructureError('No se pudo crear el Worker procedural.')
    }
    let resolveReady!: () => void
    let rejectReady!: (error: Error) => void
    const readyPromise = new Promise<void>((resolve, reject) => { resolveReady = resolve; rejectReady = reject })
    const record: WorkerRecord = {
      port,
      ready: false,
      readyPromise,
      resolveReady,
      rejectReady,
      handshakeTimer: undefined,
      onMessage: (event: WorkerEventLike) => this.handleMessage(record, event.data),
      onError: () => this.failInfrastructure(record, 'El Worker procedural no pudo cargarse.'),
      onMessageError: () => this.failInfrastructure(record, 'El Worker procedural devolvió un mensaje ilegible.'),
    }
    port.addEventListener('message', record.onMessage)
    port.addEventListener('error', record.onError)
    port.addEventListener('messageerror', record.onMessageError)
    record.handshakeTimer = this.options.setTimer(() => this.failInfrastructure(record, 'El Worker procedural no respondió al iniciar.'), this.options.handshakeTimeoutMilliseconds)
    this.worker = record
    return record
  }

  private handleMessage(record: WorkerRecord, value: unknown): void {
    if (this.worker !== record) return
    if (!record.ready) {
      if (!parseWorkerReadyMessage(value)) { this.failInfrastructure(record, 'El Worker procedural usa un protocolo incompatible.'); return }
      record.ready = true
      this.options.clearTimer(record.handshakeTimer)
      record.resolveReady()
      return
    }
    const response = parseGenerateResponse(value)
    if (!response) { this.failInfrastructure(record, 'El Worker procedural devolvió una respuesta incompatible.'); return }
    if (!this.pending || response.requestId !== this.pending.requestId) return
    if (!response.ok) {
      this.rejectPending(new ProceduralWorkerDomainError(response.error.code, response.error.message, response.error.retryable))
      return
    }
    const pending = this.pending
    this.cleanupPending()
    pending.resolve(response)
  }

  private failInfrastructure(record: WorkerRecord, message: string): void {
    if (this.worker !== record) return
    const error = new ProceduralWorkerInfrastructureError(message)
    if (!record.ready) record.rejectReady(error)
    if (this.pending) this.rejectPending(error)
    this.disposeWorker()
  }

  private rejectPending(error: Error): void {
    const pending = this.pending
    if (!pending) return
    this.cleanupPending()
    pending.reject(error)
  }

  private cleanupPending(): void {
    const pending = this.pending
    if (pending?.signal && pending.abortListener) pending.signal.removeEventListener('abort', pending.abortListener)
    this.pending = null
  }

  private disposeWorker(): void {
    const record = this.worker
    if (!record) return
    this.worker = null
    this.options.clearTimer(record.handshakeTimer)
    record.port.removeEventListener('message', record.onMessage)
    record.port.removeEventListener('error', record.onError)
    record.port.removeEventListener('messageerror', record.onMessageError)
    record.port.terminate()
  }
}

export const proceduralWorkerClient = new ProceduralWorkerClient()
