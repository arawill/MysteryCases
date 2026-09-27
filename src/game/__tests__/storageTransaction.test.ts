import { describe, expect, it } from 'vitest'
import { MemoryStorage } from './storage'
import { STORAGE_TRANSACTION_KEY } from '../persistence/storageCatalog'
import { executeStorageTransaction, recoverStorageTransaction } from '../persistence/storageTransaction'

class FaultStorage extends MemoryStorage {
  operations = 0
  failAt?: number
  override setItem(key: string, value: string) { this.operations += 1; if (this.operations === this.failAt) throw new DOMException('full', 'QuotaExceededError'); super.setItem(key, value) }
  override removeItem(key: string) { this.operations += 1; if (this.operations === this.failAt) throw new Error('interrupted'); super.removeItem(key) }
}

describe('recoverable storage transactions', () => {
  it('rolls back a failed mutation and can retry idempotently', () => {
    for (let failAt = 1; failAt <= 4; failAt += 1) {
      const storage = new FaultStorage()
      storage.setItem('a', 'old-a'); storage.setItem('b', 'old-b')
      storage.operations = 0; storage.failAt = failAt
      const result = executeStorageTransaction('test', [{ key: 'a', after: 'new-a' }, { key: 'b', after: 'new-b' }], storage)
      storage.failAt = undefined
      recoverStorageTransaction(storage)
      const pair = [storage.getItem('a'), storage.getItem('b')]
      expect([['old-a', 'old-b'], ['new-a', 'new-b']]).toContainEqual(pair)
      expect(storage.getItem(STORAGE_TRANSACTION_KEY)).toBeNull()
      expect(executeStorageTransaction('test', [{ key: 'a', after: 'new-a' }, { key: 'b', after: 'new-b' }], storage).ok).toBe(true)
      expect([storage.getItem('a'), storage.getItem('b')]).toEqual(['new-a', 'new-b'])
      expect(result.ok || failAt === 4).toBe(failAt > 3)
    }
  })

  it('discards corrupt and unknown journals without touching data', () => {
    for (const journal of ['{broken', JSON.stringify({ saveVersion: 99, mutations: [{ key: 'a', before: 'old', after: 'new' }] })]) {
      const storage = new MemoryStorage()
      storage.setItem('a', 'old'); storage.setItem(STORAGE_TRANSACTION_KEY, journal)
      expect(recoverStorageTransaction(storage)).toMatchObject({ ok: true, recovered: 'discarded' })
      expect(storage.getItem('a')).toBe('old')
      expect(storage.getItem(STORAGE_TRANSACTION_KEY)).toBeNull()
      expect(recoverStorageTransaction(storage)).toEqual({ ok: true })
    }
  })

  it('recovers the same prepared journal repeatedly without duplicate effects', () => {
    const storage = new MemoryStorage()
    storage.setItem('counter', '1')
    storage.setItem(STORAGE_TRANSACTION_KEY, JSON.stringify({ saveVersion: 1, id: 'counter-once', kind: 'test', mutations: [{ key: 'counter', before: '1', after: '2' }] }))
    expect(recoverStorageTransaction(storage).ok).toBe(true)
    expect(recoverStorageTransaction(storage).ok).toBe(true)
    expect(storage.getItem('counter')).toBe('2')
  })
})
