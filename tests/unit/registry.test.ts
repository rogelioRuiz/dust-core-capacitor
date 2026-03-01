import { beforeEach, describe, expect, it } from 'vitest'
import type { EmbeddingService, ModelServer, VectorStore } from '../../src/definitions'
import { EmbeddingStatus, SessionPriority } from '../../src/definitions'
import { DustCoreRegistry, DustCoreRegistryError } from '../../src/registry'

// ─── Mock factories ──────────────────────────────────────────────────────────

function mockVectorStore(): VectorStore {
  return {
    open: async () => {},
    search: async () => [],
    upsert: async () => {},
    delete: async () => {},
    close: async () => {},
  }
}

function mockModelServer(): ModelServer {
  return {
    loadModel: async () => ({
      predict: async () => [],
      status: () => ({ kind: 'ready' }),
      priority: () => SessionPriority.Interactive,
      close: async () => {},
    }),
    unloadModel: async () => {},
    listModels: async () => [],
    modelStatus: async () => ({ kind: 'notLoaded' }),
  }
}

function mockEmbeddingService(): EmbeddingService {
  return {
    embed: async () => [],
    embeddingDimension: () => 1536,
    status: () => EmbeddingStatus.Idle,
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DustCoreRegistry', () => {
  beforeEach(() => {
    DustCoreRegistry.resetForTesting()
  })

  // ── Singleton ────────────────────────────────────────────────────────────

  it('getInstance returns same instance', () => {
    expect(DustCoreRegistry.getInstance()).toBe(DustCoreRegistry.getInstance())
  })

  // ── M2-T1: Resolve unregistered throws serviceNotRegistered ──────────────

  describe('M2-T1: Resolve unregistered throws', () => {
    it('resolveVectorStore throws DustCoreRegistryError', () => {
      const registry = DustCoreRegistry.getInstance()
      expect(() => registry.resolveVectorStore()).toThrow(DustCoreRegistryError)
    })

    it('resolveVectorStore error has correct serviceName', () => {
      const registry = DustCoreRegistry.getInstance()
      try {
        registry.resolveVectorStore()
        expect.unreachable('should have thrown')
      } catch (e) {
        const err = e as DustCoreRegistryError
        expect(err.dustCoreError).toEqual({ code: 'serviceNotRegistered', serviceName: 'VectorStore' })
      }
    })

    it('resolveModelServer throws DustCoreRegistryError', () => {
      const registry = DustCoreRegistry.getInstance()
      expect(() => registry.resolveModelServer()).toThrow(DustCoreRegistryError)
    })

    it('resolveEmbeddingService throws DustCoreRegistryError', () => {
      const registry = DustCoreRegistry.getInstance()
      expect(() => registry.resolveEmbeddingService()).toThrow(DustCoreRegistryError)
    })
  })

  // ── M2-T2: Register and resolve round-trip (identity equality) ───────────

  describe('M2-T2: Register and resolve round-trip', () => {
    it('resolves same VectorStore instance', () => {
      const registry = DustCoreRegistry.getInstance()
      const mock = mockVectorStore()
      registry.registerVectorStore(mock)
      expect(registry.resolveVectorStore()).toBe(mock)
    })

    it('resolves same ModelServer instance', () => {
      const registry = DustCoreRegistry.getInstance()
      const mock = mockModelServer()
      registry.registerModelServer(mock)
      expect(registry.resolveModelServer()).toBe(mock)
    })

    it('resolves same EmbeddingService instance', () => {
      const registry = DustCoreRegistry.getInstance()
      const mock = mockEmbeddingService()
      registry.registerEmbeddingService(mock)
      expect(registry.resolveEmbeddingService()).toBe(mock)
    })
  })

  // ── M2-T3: Re-registration replaces previous (last-write-wins) ──────────

  describe('M2-T3: Re-registration replaces previous', () => {
    it('VectorStore last-write-wins', () => {
      const registry = DustCoreRegistry.getInstance()
      const first = mockVectorStore()
      const second = mockVectorStore()
      registry.registerVectorStore(first)
      registry.registerVectorStore(second)
      expect(registry.resolveVectorStore()).toBe(second)
      expect(registry.resolveVectorStore()).not.toBe(first)
    })

    it('ModelServer last-write-wins', () => {
      const registry = DustCoreRegistry.getInstance()
      const first = mockModelServer()
      const second = mockModelServer()
      registry.registerModelServer(first)
      registry.registerModelServer(second)
      expect(registry.resolveModelServer()).toBe(second)
    })

    it('EmbeddingService last-write-wins', () => {
      const registry = DustCoreRegistry.getInstance()
      const first = mockEmbeddingService()
      const second = mockEmbeddingService()
      registry.registerEmbeddingService(first)
      registry.registerEmbeddingService(second)
      expect(registry.resolveEmbeddingService()).toBe(second)
    })
  })

  // ── M2-T4: Concurrent registration (simulated) ──────────────────────────

  describe('M2-T4: Concurrent registration', () => {
    it('100 concurrent registerVectorStore calls do not corrupt state', async () => {
      const registry = DustCoreRegistry.getInstance()
      const stores = Array.from({ length: 100 }, () => mockVectorStore())
      await Promise.all(stores.map((s) => Promise.resolve().then(() => registry.registerVectorStore(s))))
      const resolved = registry.resolveVectorStore()
      expect(stores).toContain(resolved)
    })
  })

  // ── M2-T5: Concurrent resolve (simulated) ───────────────────────────────

  describe('M2-T5: Concurrent resolve', () => {
    it('1000 concurrent resolveVectorStore calls return same instance', async () => {
      const registry = DustCoreRegistry.getInstance()
      const mock = mockVectorStore()
      registry.registerVectorStore(mock)
      const results = await Promise.all(
        Array.from({ length: 1000 }, () => Promise.resolve().then(() => registry.resolveVectorStore())),
      )
      for (const r of results) {
        expect(r).toBe(mock)
      }
    })
  })
})
