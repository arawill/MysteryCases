import { describe, expect, it, vi } from 'vitest'
import { generateInfiniteCase } from '../infinite/generator'
import { createProceduralCaseSnapshot } from '../persistence/proceduralSnapshot'
import { ProceduralWorkerBusyError, ProceduralWorkerCancelledError, ProceduralWorkerClient, ProceduralWorkerDomainError, ProceduralWorkerInfrastructureError, type ProceduralWorkerPort, type WorkerEventLike, type WorkerEventListener } from '../proceduralWorker/client'
import { PROCEDURAL_WORKER_PROTOCOL_VERSION, type GenerateRequest } from '../proceduralWorker/protocol'

class FakeWorker implements ProceduralWorkerPort {
  readonly listeners = new Map<string, Set<WorkerEventListener>>()
  readonly posted: GenerateRequest[] = []
  terminated = false
  postMessage(message: GenerateRequest) { this.posted.push(message) }
  terminate() { this.terminated = true }
  addEventListener(type: 'message' | 'messageerror' | 'error', listener: WorkerEventListener) { const listeners = this.listeners.get(type) ?? new Set(); listeners.add(listener); this.listeners.set(type, listeners) }
  removeEventListener(type: 'message' | 'messageerror' | 'error', listener: WorkerEventListener) { this.listeners.get(type)?.delete(listener) }
  emit(type: 'message' | 'messageerror' | 'error', event: WorkerEventLike = {}) { for (const listener of this.listeners.get(type) ?? []) listener(event) }
}

const request = (requestId: string): GenerateRequest => ({ protocolVersion: 1, requestId, mode: 'infinite', difficulty: 1, seed: 123 })
const snapshot = createProceduralCaseSnapshot('infinite', generateInfiniteCase({ difficulty: 1, seed: 123 }))
const ready = { protocolVersion: PROCEDURAL_WORKER_PROTOCOL_VERSION, type: 'ready' }
const success = (requestId: string) => ({ protocolVersion: PROCEDURAL_WORKER_PROTOCOL_VERSION, requestId, ok: true as const, snapshot })

describe('persistent lazy procedural Worker client', () => {
  it('creates lazily, handshakes, reuses the Worker and enforces one active request', async () => {
    const workers: FakeWorker[] = []
    const client = new ProceduralWorkerClient({ createWorker: () => { const worker = new FakeWorker(); workers.push(worker); return worker } })
    expect(workers).toHaveLength(0)
    const first = client.generate(request('one'))
    expect(workers).toHaveLength(1)
    await expect(client.generate(request('two'))).rejects.toBeInstanceOf(ProceduralWorkerBusyError)
    workers[0].emit('message', { data: ready })
    await Promise.resolve()
    expect(workers[0].posted).toEqual([request('one')])
    workers[0].emit('message', { data: success('stale') })
    workers[0].emit('message', { data: success('one') })
    await expect(first).resolves.toMatchObject({ requestId: 'one', ok: true })
    const second = client.generate(request('two'))
    await Promise.resolve()
    expect(workers).toHaveLength(1)
    expect(workers[0].posted.at(-1)).toEqual(request('two'))
    workers[0].emit('message', { data: success('two') })
    await expect(second).resolves.toMatchObject({ requestId: 'two' })
  })

  it('terminates on cancellation, cleans listeners and recreates later', async () => {
    const workers: FakeWorker[] = []
    const client = new ProceduralWorkerClient({ createWorker: () => { const worker = new FakeWorker(); workers.push(worker); return worker } })
    const controller = new AbortController()
    const pending = client.generate(request('cancel'), controller.signal)
    workers[0].emit('message', { data: ready })
    await Promise.resolve()
    controller.abort()
    await expect(pending).rejects.toBeInstanceOf(ProceduralWorkerCancelledError)
    expect(workers[0].terminated).toBe(true)
    expect([...workers[0].listeners.values()].every(listeners => listeners.size === 0)).toBe(true)
    const next = client.generate(request('next'))
    expect(workers).toHaveLength(2)
    workers[1].emit('message', { data: ready })
    await Promise.resolve()
    workers[1].emit('message', { data: success('next') })
    await expect(next).resolves.toMatchObject({ requestId: 'next' })
  })

  it('distinguishes constructor, load, message and domain failures', async () => {
    const constructorClient = new ProceduralWorkerClient({ createWorker: () => { throw new Error('unsupported') } })
    await expect(constructorClient.generate(request('constructor'))).rejects.toBeInstanceOf(ProceduralWorkerInfrastructureError)

    for (const eventType of ['error', 'messageerror'] as const) {
      const worker = new FakeWorker(), client = new ProceduralWorkerClient({ createWorker: () => worker })
      const pending = client.generate(request(eventType))
      worker.emit(eventType)
      await expect(pending).rejects.toBeInstanceOf(ProceduralWorkerInfrastructureError)
      expect(worker.terminated).toBe(true)
    }

    const incompatible = new FakeWorker(), incompatibleClient = new ProceduralWorkerClient({ createWorker: () => incompatible })
    const incompatiblePending = incompatibleClient.generate(request('incompatible'))
    incompatible.emit('message', { data: { protocolVersion: 2, type: 'ready' } })
    await expect(incompatiblePending).rejects.toBeInstanceOf(ProceduralWorkerInfrastructureError)

    const domain = new FakeWorker(), domainClient = new ProceduralWorkerClient({ createWorker: () => domain })
    const domainPending = domainClient.generate(request('domain'))
    domain.emit('message', { data: ready })
    await Promise.resolve()
    domain.emit('message', { data: { protocolVersion: 1, requestId: 'domain', ok: false, error: { code: 'GENERATION_FAILED', message: 'failed', retryable: true } } })
    await expect(domainPending).rejects.toBeInstanceOf(ProceduralWorkerDomainError)
    expect(domain.terminated).toBe(false)
  })

  it('fails a silent active request when explicitly terminated', async () => {
    const worker = new FakeWorker(), client = new ProceduralWorkerClient({ createWorker: () => worker })
    const pending = client.generate(request('terminate'))
    worker.emit('message', { data: ready })
    await Promise.resolve()
    client.terminate()
    await expect(pending).rejects.toBeInstanceOf(ProceduralWorkerInfrastructureError)
    expect(worker.terminated).toBe(true)
    expect(vi.fn()).not.toHaveBeenCalled()
  })
})
