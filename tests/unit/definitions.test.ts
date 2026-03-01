import { describe, expect, it } from 'vitest'
import {
  EmbeddingStatus,
  ModelFormat,
  SessionPriority,
  modelDescriptorEquals,
} from '../../src/definitions'
import type {
  EmbeddingService,
  DustCoreError,
  ModelDescriptor,
  ModelServer,
  ModelSession,
  ModelStatus,
  VectorStore,
} from '../../src/definitions'
import { DUST_CORE_VERSION } from '../../src/plugin'

// ─── M3-T4: Version constant ─────────────────────────────────────────────────

describe('DUST_CORE_VERSION constant (M3-T4)', () => {
  it('returns current version string', () => {
    expect(DUST_CORE_VERSION).toBe('0.1.0')
  })

  it('is a non-empty string', () => {
    expect(typeof DUST_CORE_VERSION).toBe('string')
    expect(DUST_CORE_VERSION.length).toBeGreaterThan(0)
  })
})

// ─── M1-T3: ModelDescriptor value semantics ─────────────────────────────────

describe('ModelDescriptor value semantics (M1-T3)', () => {
  const base: ModelDescriptor = {
    id: 'llama-3.2-1b',
    name: 'Llama 3.2 1B',
    format: ModelFormat.GGUF,
    sizeBytes: 1_200_000_000,
    version: '1.0.0',
    quantization: 'Q4_K_M',
    metadata: { source: 'huggingface' },
  }

  it('two identical descriptors compare equal', () => {
    const a = { ...base }
    const b = { ...base }
    expect(modelDescriptorEquals(a, b)).toBe(true)
  })

  it('different id breaks equality', () => {
    const a = { ...base }
    const b = { ...base, id: 'different' }
    expect(modelDescriptorEquals(a, b)).toBe(false)
  })

  it('different format breaks equality', () => {
    const a = { ...base }
    const b = { ...base, format: ModelFormat.ONNX }
    expect(modelDescriptorEquals(a, b)).toBe(false)
  })

  it('different metadata breaks equality', () => {
    const a = { ...base }
    const b = { ...base, metadata: { source: 'local' } }
    expect(modelDescriptorEquals(a, b)).toBe(false)
  })

  it('both undefined metadata compares equal', () => {
    const a = { ...base, metadata: undefined }
    const b = { ...base, metadata: undefined }
    expect(modelDescriptorEquals(a, b)).toBe(true)
  })
})

// ─── M1-T4: SessionPriority ordering ────────────────────────────────────────

describe('SessionPriority ordering (M1-T4)', () => {
  it('background (0) < interactive (1)', () => {
    expect(SessionPriority.Background).toBeLessThan(SessionPriority.Interactive)
  })

  it('background raw value is 0', () => {
    expect(SessionPriority.Background).toBe(0)
  })

  it('interactive raw value is 1', () => {
    expect(SessionPriority.Interactive).toBe(1)
  })
})

// ─── M1-T5: ModelStatus associated values ───────────────────────────────────

describe('ModelStatus associated values (M1-T5)', () => {
  it('downloading status extracts progress 0.47', () => {
    const status: ModelStatus = { kind: 'downloading', progress: 0.47 }
    if (status.kind === 'downloading') {
      expect(status.progress).toBeCloseTo(0.47)
    } else {
      throw new Error('Expected downloading status')
    }
  })

  it('failed status extracts error', () => {
    const err: DustCoreError = { code: 'memoryExhausted' }
    const status: ModelStatus = { kind: 'failed', error: err }
    if (status.kind === 'failed') {
      expect(status.error.code).toBe('memoryExhausted')
    } else {
      throw new Error('Expected failed status')
    }
  })

  it('pattern matching over all status kinds compiles', () => {
    const statuses: ModelStatus[] = [
      { kind: 'notLoaded' },
      { kind: 'downloading', progress: 0.5 },
      { kind: 'verifying' },
      { kind: 'loading' },
      { kind: 'ready' },
      { kind: 'failed', error: { code: 'timeout' } },
      { kind: 'unloading' },
    ]
    for (const s of statuses) {
      switch (s.kind) {
        case 'notLoaded':
          break
        case 'downloading':
          expect(s.progress).toBeGreaterThanOrEqual(0)
          break
        case 'verifying':
          break
        case 'loading':
          break
        case 'ready':
          break
        case 'failed':
          expect(s.error).toBeDefined()
          break
        case 'unloading':
          break
      }
    }
  })
})

// ─── Enum values ────────────────────────────────────────────────────────────

describe('ModelFormat enum values', () => {
  it('has expected cases', () => {
    expect(ModelFormat.ONNX).toBe('onnx')
    expect(ModelFormat.CoreML).toBe('coreml')
    expect(ModelFormat.TFLite).toBe('tflite')
    expect(ModelFormat.GGUF).toBe('gguf')
    expect(ModelFormat.Custom).toBe('custom')
  })
})

describe('EmbeddingStatus enum values', () => {
  it('has expected cases', () => {
    expect(EmbeddingStatus.Idle).toBe('idle')
    expect(EmbeddingStatus.Computing).toBe('computing')
    expect(EmbeddingStatus.Ready).toBe('ready')
    expect(EmbeddingStatus.Failed).toBe('failed')
  })
})

// ─── Protocol compilation checks (M1-T1/T2 TS equivalent) ──────────────────

describe('Protocol compilation checks', () => {
  it('VectorStore interface is structurally valid', () => {
    const mock: VectorStore = {
      open: async () => {},
      search: async () => [],
      upsert: async () => {},
      delete: async () => {},
      close: async () => {},
    }
    expect(mock).toBeDefined()
  })

  it('ModelSession interface is structurally valid', () => {
    const mock: ModelSession = {
      predict: async () => [],
      status: () => ({ kind: 'ready' }),
      priority: () => SessionPriority.Interactive,
      close: async () => {},
    }
    expect(mock).toBeDefined()
  })

  it('EmbeddingService interface is structurally valid', () => {
    const mock: EmbeddingService = {
      embed: async () => [],
      embeddingDimension: () => 1536,
      status: () => EmbeddingStatus.Idle,
    }
    expect(mock).toBeDefined()
  })

  it('ModelServer interface is structurally valid', () => {
    const mock: ModelServer = {
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
    expect(mock).toBeDefined()
  })
})
