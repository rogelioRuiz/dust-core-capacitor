// ─── Enums ──────────────────────────────────────────────────────────────────

export const ModelFormat = {
  ONNX: 'onnx',
  CoreML: 'coreml',
  TFLite: 'tflite',
  GGUF: 'gguf',
  Custom: 'custom',
} as const
export type ModelFormat = (typeof ModelFormat)[keyof typeof ModelFormat]

export const SessionPriority = {
  Background: 0,
  Interactive: 1,
} as const
export type SessionPriority = (typeof SessionPriority)[keyof typeof SessionPriority]

export const EmbeddingStatus = {
  Idle: 'idle',
  Computing: 'computing',
  Ready: 'ready',
  Failed: 'failed',
} as const
export type EmbeddingStatus = (typeof EmbeddingStatus)[keyof typeof EmbeddingStatus]

// ─── ModelStatus (discriminated union for associated values) ────────────────

export type ModelStatus =
  | { kind: 'notLoaded' }
  | { kind: 'downloading'; progress: number }
  | { kind: 'verifying' }
  | { kind: 'loading' }
  | { kind: 'ready'; path?: string }
  | { kind: 'failed'; error: DustCoreError }
  | { kind: 'unloading' }

// ─── DustCoreError ────────────────────────────────────────────────────────────

export type DustCoreError =
  | { code: 'modelNotFound' }
  | { code: 'modelNotReady' }
  | { code: 'modelCorrupted' }
  | { code: 'formatUnsupported' }
  | { code: 'sessionClosed' }
  | { code: 'sessionLimitReached' }
  | { code: 'invalidInput'; detail?: string }
  | { code: 'inferenceFailed'; detail?: string }
  | { code: 'memoryExhausted' }
  | { code: 'downloadFailed'; detail?: string }
  | { code: 'storageFull'; detail?: string }
  | { code: 'networkPolicyBlocked'; detail?: string }
  | { code: 'verificationFailed'; detail?: string }
  | { code: 'cancelled' }
  | { code: 'timeout' }
  | { code: 'serviceNotRegistered'; serviceName: string }
  | { code: 'unknownError'; message?: string }

// ─── Value Types ────────────────────────────────────────────────────────────

export interface ModelDescriptor {
  id: string
  name: string
  format: ModelFormat
  sizeBytes: number
  version: string
  url?: string
  sha256?: string
  quantization?: string
  metadata?: Record<string, string>
}

export interface VectorSearchResult {
  id: string
  score: number
  metadata?: Record<string, string>
}

export interface DustInputTensor {
  name: string
  data: number[]
  shape: number[]
}

export interface DustOutputTensor {
  name: string
  data: number[]
  shape: number[]
}

// ─── Protocol Interfaces ────────────────────────────────────────────────────

export interface VectorStore {
  open(config: Record<string, string>): Promise<void>
  search(query: number[], limit: number): Promise<VectorSearchResult[]>
  upsert(id: string, vector: number[], metadata?: Record<string, string>): Promise<void>
  delete(id: string): Promise<void>
  close(): Promise<void>
}

export interface ModelSession {
  predict(inputs: DustInputTensor[]): Promise<DustOutputTensor[]>
  status(): ModelStatus
  priority(): SessionPriority
  close(): Promise<void>
}

export interface EmbeddingService {
  embed(texts: string[]): Promise<number[][]>
  embeddingDimension(): number
  status(): EmbeddingStatus
}

export interface ModelServer {
  loadModel(descriptor: ModelDescriptor, priority: SessionPriority): Promise<ModelSession>
  unloadModel(id: string): Promise<void>
  listModels(): Promise<ModelDescriptor[]>
  modelStatus(id: string): Promise<ModelStatus>
}

// ─── Capacitor Plugin Interface (minimal — types-only plugin) ───────────────

export interface CorePlugin {
  getContractVersion(): Promise<{ version: string }>
}

// ─── Utility: ModelDescriptor equality ──────────────────────────────────────

export function modelDescriptorEquals(a: ModelDescriptor, b: ModelDescriptor): boolean {
  if (a.id !== b.id) return false
  if (a.name !== b.name) return false
  if (a.format !== b.format) return false
  if (a.sizeBytes !== b.sizeBytes) return false
  if (a.version !== b.version) return false
  if (a.url !== b.url) return false
  if (a.sha256 !== b.sha256) return false
  if (a.quantization !== b.quantization) return false
  const aKeys = Object.keys(a.metadata ?? {})
  const bKeys = Object.keys(b.metadata ?? {})
  if (aKeys.length !== bKeys.length) return false
  for (const k of aKeys) {
    if (a.metadata?.[k] !== b.metadata?.[k]) return false
  }
  return true
}
