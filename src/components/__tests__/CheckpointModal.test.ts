import { describe, expect, it, vi } from 'vitest'
import { executeCheckpointModalAction, type CheckpointModalCallbacks } from '../checkpointModalActions'

const callbacks = (): CheckpointModalCallbacks => ({
  onCreate: vi.fn(), onRestore: vi.fn(), onDelete: vi.fn(), onClose: vi.fn(),
})

describe('CheckpointModal actions', () => {
  it('restores the checkpoint and closes the modal', () => {
    const handlers = callbacks()
    executeCheckpointModalAction({ type: 'restore', id: 'checkpoint-1' }, handlers)
    expect(handlers.onRestore).toHaveBeenCalledWith('checkpoint-1')
    expect(handlers.onClose).toHaveBeenCalledOnce()
  })

  it('deletes a checkpoint without closing the modal', () => {
    const handlers = callbacks()
    executeCheckpointModalAction({ type: 'delete', id: 'checkpoint-1' }, handlers)
    expect(handlers.onDelete).toHaveBeenCalledWith('checkpoint-1')
    expect(handlers.onClose).not.toHaveBeenCalled()
  })

  it('creates a checkpoint without closing the modal', () => {
    const handlers = callbacks()
    executeCheckpointModalAction({ type: 'create', name: 'Hipótesis', description: 'Notas' }, handlers)
    expect(handlers.onCreate).toHaveBeenCalledWith('Hipótesis', 'Notas')
    expect(handlers.onClose).not.toHaveBeenCalled()
  })
})
