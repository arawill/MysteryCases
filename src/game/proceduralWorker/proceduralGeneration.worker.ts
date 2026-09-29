import { createProceduralWorkerDispatcher } from './handler'
import { PROCEDURAL_WORKER_PROTOCOL_VERSION, type GenerateResponse, type WorkerReadyMessage } from './protocol'

interface WorkerScope {
  postMessage(message: GenerateResponse | WorkerReadyMessage): void
  addEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void
}

const scope = self as unknown as WorkerScope
const dispatch = createProceduralWorkerDispatcher()

scope.addEventListener('message', event => {
  scope.postMessage(dispatch(event.data))
})

scope.postMessage({ protocolVersion: PROCEDURAL_WORKER_PROTOCOL_VERSION, type: 'ready' })
