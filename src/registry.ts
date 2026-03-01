import type { EmbeddingService, DustCoreError, ModelServer, VectorStore } from './definitions'

export class DustCoreRegistryError extends Error {
  readonly dustCoreError: DustCoreError

  constructor(serviceName: string) {
    super(`Service not registered: ${serviceName}`)
    this.name = 'DustCoreRegistryError'
    this.dustCoreError = { code: 'serviceNotRegistered', serviceName }
  }
}

export class DustCoreRegistry {
  private static instance: DustCoreRegistry | null = null

  private vectorStore: VectorStore | null = null
  private modelServer: ModelServer | null = null
  private embeddingService: EmbeddingService | null = null

  private constructor() {}

  static getInstance(): DustCoreRegistry {
    if (!DustCoreRegistry.instance) {
      DustCoreRegistry.instance = new DustCoreRegistry()
    }
    return DustCoreRegistry.instance
  }

  registerVectorStore(store: VectorStore): void {
    this.vectorStore = store
  }

  registerModelServer(server: ModelServer): void {
    this.modelServer = server
  }

  registerEmbeddingService(service: EmbeddingService): void {
    this.embeddingService = service
  }

  resolveVectorStore(): VectorStore {
    if (!this.vectorStore) {
      throw new DustCoreRegistryError('VectorStore')
    }
    return this.vectorStore
  }

  resolveModelServer(): ModelServer {
    if (!this.modelServer) {
      throw new DustCoreRegistryError('ModelServer')
    }
    return this.modelServer
  }

  resolveEmbeddingService(): EmbeddingService {
    if (!this.embeddingService) {
      throw new DustCoreRegistryError('EmbeddingService')
    }
    return this.embeddingService
  }

  /** @internal Test-only: resets the singleton to fresh state */
  static resetForTesting(): void {
    DustCoreRegistry.instance = null
  }
}
