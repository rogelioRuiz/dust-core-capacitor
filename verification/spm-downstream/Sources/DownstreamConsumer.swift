import DustCore

// M3-T1: Verify protocol is accessible and implementable
final class TestVectorStore: DustVectorStore {
    func open(config: [String: String]) async throws {}
    func search(query: [Float], limit: Int) async throws -> [DustVectorSearchResult] { [] }
    func upsert(id: String, vector: [Float], metadata: [String: String]?) async throws {}
    func delete(id: String) async throws {}
    func close() async throws {}
}

// M3-T4: Verify version constant is accessible
let _version = DustCoreVersion.current

// M3-T1: Verify registry is accessible
func _registerDownstream() {
    DustCoreRegistry.shared.register(vectorStore: TestVectorStore())
}
