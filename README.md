<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../assets/branding/dust_white.png">
    <source media="(prefers-color-scheme: light)" srcset="../assets/branding/dust_black.png">
    <img alt="dust" src="../assets/branding/dust_black.png" width="200">
  </picture>
</p>

<p align="center"><strong>Device Unified Serving Toolkit</strong></p>

# capacitor-core

ML contract library for Capacitor — shared protocols, interfaces, and value types for on-device ML plugins.

**Current version: 0.1.0** — protocols for model servers, sessions, vector stores, and embedding services + singleton registry for service discovery.

## Architecture overview

```
                          ┌─────────────────────┐
                          │   capacitor-core   │  Capacitor bridge (thin wrapper)
                          │   CorePlugin only  │  @_exported import DustCore
                          └─────────┬───────────┘
                                    │ depends on
                    ┌───────────────┼───────────────┐
                    ▼                               ▼
          ┌─────────────────┐             ┌─────────────────┐
          │  dust-core-kotlin   │             │  dust-core-swift    │
          │  (pure JVM)      │             │  (pure Swift)    │
          │  35 tests        │             │  29 tests        │
          └─────────────────┘             └─────────────────┘
                    ▲                               ▲
                    │ import io.t6x.dust.capacitor.core  │ import DustCore
                    │                               │
     ┌──────────────┼──────────────┐    ┌───────────┼──────────────┐
     │              │              │    │           │              │
capacitor-llm  capacitor-onnx  dust-serve-kotlin  capacitor-serve
```

The native types, protocols, and registry have **zero Capacitor dependency**. They live in standalone packages (`dust-core-kotlin`, `dust-core-swift`) that can be consumed by pure Kotlin/JVM or pure Swift projects without pulling in Capacitor.

`capacitor-core` is now a **thin Capacitor bridge** containing only `CorePlugin.kt` (Android) and `CorePlugin.swift` (iOS). It re-exports the standalone packages so downstream Capacitor plugins get the types transitively.

## Project structure

```
capacitor-core/                        # Capacitor bridge (this package)
├── package.json                         # v0.1.0, peer deps: @capacitor/core ^7||^8
├── Package.swift                        # SPM: CorePlugin target, depends on dust-core-swift
├── DustCapacitorCore.podspec              # CocoaPods: depends on DustCore
├── src/                                 # TypeScript layer (unchanged)
│   ├── definitions.ts                   # Enums, discriminated unions, value types, 4 protocol interfaces
│   ├── plugin.ts                        # WebPlugin stub (getContractVersion only)
│   ├── registry.ts                      # DustCoreRegistry singleton
│   └── index.ts                         # Barrel export
├── ios/Sources/CorePlugin/
│   └── CorePlugin.swift               # CAPPlugin bridge + @_exported import DustCore
├── android/
│   ├── build.gradle                     # api project(':dust-core-kotlin') for transitive exposure
│   └── src/main/java/.../CorePlugin.kt
├── tests/unit/                          # TypeScript unit tests (Vitest) — 32 tests
└── verification/
    ├── android-downstream/              # Android integration verification
    └── spm-downstream/                  # SPM integration verification

dust-core-kotlin/                           # Standalone Kotlin/JVM package
├── build.gradle                         # java-library + kotlin-jvm, JVM 17, coroutines 1.10.2
├── settings.gradle                      # pluginManagement for standalone builds
├── src/main/kotlin/io/t6x/dust/core/
│   ├── DustCore.kt                        # VERSION constant
│   ├── Types.kt                         # Enums, data classes
│   ├── DustCoreError.kt                   # Sealed class hierarchy (17 error cases)
│   ├── ModelServer.kt                   # suspend interface
│   ├── ModelSession.kt                  # suspend interface
│   ├── VectorStore.kt                   # suspend interface
│   ├── EmbeddingService.kt              # suspend interface
│   └── DustCoreRegistry.kt               # Thread-safe singleton (ReentrantReadWriteLock)
└── src/test/                            # JUnit 4 — 35 tests


dust-core-swift/                            # Standalone Swift package
├── Package.swift                        # SPM: product "DustCore", iOS 14+
├── DustCore.podspec                       # CocoaPods spec
├── Sources/DustCore/
│   ├── DustCoreVersion.swift              # Version constant
│   ├── Types.swift                      # Enums, structs (Sendable/Equatable/Hashable)
│   ├── Protocols.swift                  # async/await protocols
│   └── DustCoreRegistry.swift             # Thread-safe singleton (NSLock)
└── Tests/DustCoreTests/                   # XCTest — 29 tests
```

## Dependency wiring

### Android (Gradle)

`capacitor-core` uses `api project(':dust-core-kotlin')` so types flow transitively to all downstream consumers. Every `capacitor.settings.gradle` that includes `:capacitor-core` must also include `:dust-core-kotlin`.

```groovy
// capacitor.settings.gradle
include ':dust-core-kotlin'
project(':dust-core-kotlin').projectDir = new File('../../../../dust-core-kotlin')

include ':capacitor-core'
project(':capacitor-core').projectDir = new File('../../../../capacitor-core/android')
```

No `build.gradle` changes needed in downstream consumers — `api` makes `io.t6x.dust.capacitor.core.*` transitive.

### iOS (SPM)

`capacitor-core` uses `@_exported import DustCore` to re-export all symbols. Downstream consumers that do `import DustCore` directly should also declare `dust-core-swift` as a direct SPM dependency for explicit resolution.

```swift
// Downstream Package.swift
.package(name: "DustCapacitorCore", path: "../capacitor-core"),
.package(name: "dust-core-swift", path: "../dust-core-swift"),
```

### iOS (CocoaPods)

Downstream podspecs add `s.dependency 'DustCore'` alongside the existing `s.dependency 'DustCapacitorCore'`.

### TypeScript / npm

No changes. The TypeScript layer (`capacitor-core/src/`) is unaffected. Downstream `package.json` peer/dev dependencies on `capacitor-core` remain valid.

## Four protocol interfaces

| Protocol | Methods | Purpose |
|----------|---------|---------|
| **ModelServer** | `loadModel`, `unloadModel`, `listModels`, `modelStatus` | Model lifecycle management |
| **ModelSession** | `predict`, `status`, `priority`, `close` | Single inference session |
| **VectorStore** | `open`, `search`, `upsert`, `delete`, `close` | Semantic search & vector persistence |
| **EmbeddingService** | `embed`, `embeddingDimension`, `status` | Text-to-vector conversion |

All long-running methods are async (`Promise` in TS, `async throws` in Swift, `suspend` in Kotlin).

## DustCoreRegistry — service discovery

Singleton registry with explicit registration and resolution. Thread-safe on all platforms.

```
┌──────────────────────┐     register()     ┌──────────────────┐
│  capacitor-llm       │ ─────────────────► │  DustCoreRegistry  │
│  (ModelServer impl)  │                    │                  │
└──────────────────────┘                    │  - modelServer   │
                                            │  - vectorStore   │
┌──────────────────────┐     resolve()      │  - embedding     │
│  consumer plugin     │ ◄───────────────── │                  │
│  (e.g., chat UI)     │                    └──────────────────┘
└──────────────────────┘
```

- **Registration** happens once at plugin `load()` time
- **Resolution** throws `serviceNotRegistered` if the service was never registered
- **Last-write-wins** — re-registering replaces the previous instance
- **Thread safety**: `NSLock` (iOS), `ReentrantReadWriteLock` (Android), single-threaded (TS)
- **`resetForTesting()`** clears all registrations for test isolation

## ModelStatus (discriminated union)

```
notLoaded → downloading(progress) → verifying → loading → ready
                                                           ↕
                                                        unloading
                                                           ↓
                                                       notLoaded

Any state → failed(error)
```

## DustCoreError (17 error cases)

| Category | Codes |
|----------|-------|
| Model lifecycle | `modelNotFound`, `modelNotReady`, `modelCorrupted` |
| Format | `formatUnsupported` |
| Sessions | `sessionClosed`, `sessionLimitReached` |
| Inference | `invalidInput`, `inferenceFailed`, `timeout` |
| Resources | `memoryExhausted`, `storageFull` |
| Network | `networkPolicyBlocked`, `downloadFailed` |
| Integrity | `verificationFailed` |
| Lifecycle | `cancelled` |
| Registry | `serviceNotRegistered` |
| Fallback | `unknownError` |

## Test results (Phase 3 verification)

### Standalone packages

| Package | Command | Tests | Result |
|---------|---------|-------|--------|
| dust-core-kotlin | `./gradlew test` | 35/35 | PASS |
| dust-core-swift | `swift test` (Mac) | 29/29 | PASS |

### capacitor-core (bridge)

| Platform | Command | Tests | Result |
|----------|---------|-------|--------|
| TypeScript | `npm test` | 32/32 | PASS |
| Android | `./gradlew assembleDebug` | build | PASS |
| iOS SPM | `xcodebuild build -scheme SPMDownstreamTest-Package -destination 'generic/platform=iOS Simulator'` | build | PASS |

### Downstream consumers — Swift (iOS)

| Package | Tests | Result |
|---------|-------|--------|
| capacitor-llm | 50 (2 skipped) | PASS |
| capacitor-onnx | 26 | PASS |
| capacitor-serve | build only | PASS |

### Downstream consumers — Kotlin (Android)

| Package | Tests | Result |
|---------|-------|--------|
| capacitor-llm | 52 (2 skipped) | PASS |
| capacitor-onnx | 26 | PASS |
| dust-serve-kotlin | 46 | PASS |

**Total: 296 tests, 0 failures**

## Running tests

### TypeScript

```bash
cd capacitor-core
npm install
npm test            # vitest run — 32 tests
```

### Standalone Kotlin

```bash
cd dust-core-kotlin
./gradlew test      # 35 JUnit tests, no emulator needed
```

### Standalone Swift (requires macOS)

```bash
cd dust-core-swift
swift test           # 29 XCTest tests
```

### Android unit tests

Android tests require a host Capacitor project to resolve `:capacitor-android`.

```bash
cd capacitor-llm/example/android
./gradlew :capacitor-llm:testDebugUnitTest      # 52 tests
./gradlew :capacitor-core:testDebugUnitTest    # (bridge-only, no tests)
```

### iOS unit tests (requires macOS + Xcode)

SPM verification build (no Xcode project needed):

```bash
cd capacitor-core/verification/spm-downstream
xcodebuild build \
  -scheme 'SPMDownstreamTest-Package' \
  -destination 'generic/platform=iOS Simulator'
```

Downstream Swift tests:

```bash
cd capacitor-llm
xcodebuild test -scheme DustCapacitorLlm \
  -destination 'platform=iOS Simulator,name=iPhone 16e' \
  -only-testing LLMPluginTests
```

## JS API

```typescript
import { Core } from '@dust/capacitor-core';
import type {
  ModelServer, ModelSession, ModelDescriptor,
  VectorStore, EmbeddingService,
  ModelFormat, SessionPriority, ModelStatus, DustCoreError,
  DustInputTensor, DustOutputTensor, VectorSearchResult,
} from '@dust/capacitor-core';
import { DustCoreRegistry } from '@dust/capacitor-core';

// Get contract version
const { version } = await Core.getContractVersion();

// Register and resolve
const myServer: ModelServer = { /* ... */ };
DustCoreRegistry.getInstance().registerModelServer(myServer);
const server = DustCoreRegistry.getInstance().resolveModelServer();

// Load, predict, clean up
const session = await server.loadModel(descriptor, 1);
const outputs = await session.predict([{ name: 'input', data: [1.0], shape: [1] }]);
await session.close();
```

## Downstream usage

### Implementing a ModelServer (iOS)

```swift
import DustCore   // standalone module — no Capacitor dependency

class MyModelServer: DustModelServer {
    func loadModel(descriptor: DustModelDescriptor,
                   priority: DustSessionPriority) async throws -> DustModelSession { /* ... */ }
    func unloadModel(id: String) async throws { /* ... */ }
    func listModels() async throws -> [DustModelDescriptor] { /* ... */ }
    func modelStatus(id: String) async throws -> DustModelStatus { /* ... */ }
}

DustCoreRegistry.shared.register(modelServer: MyModelServer())
```

### Implementing a ModelServer (Android)

```kotlin
import io.t6x.dust.core.*   // standalone module — no Capacitor dependency

class MyModelServer : ModelServer {
    override suspend fun loadModel(descriptor: ModelDescriptor,
                                   priority: SessionPriority): ModelSession { /* ... */ }
    override suspend fun unloadModel(id: String) { /* ... */ }
    override suspend fun listModels(): List<ModelDescriptor> { /* ... */ }
    override suspend fun modelStatus(id: String): ModelStatus { /* ... */ }
}

DustCoreRegistry.getInstance().registerModelServer(MyModelServer())
```

## Platform differences

| Aspect | TypeScript | iOS (Swift) | Android (Kotlin) |
|--------|-----------|-------------|------------------|
| Async model | `Promise<T>` | `async throws -> T` | `suspend fun(): T` |
| Error type | Discriminated union | Enum with associated values | Sealed class hierarchy |
| Registry thread safety | Single-threaded (JS) | `NSLock` | `ReentrantReadWriteLock` |
| Value types | Interfaces | Structs (`Sendable`) | Data classes |
| Native package | n/a | `dust-core-swift` (SPM) | `dust-core-kotlin` (Gradle) |
| Capacitor bridge | `registerPlugin('Core')` | `CorePlugin.swift` | `CorePlugin.kt` |
| Build system | npm + tsc | SPM or CocoaPods | Gradle |
| Deployment target | Node >= 20 | iOS 14.0+ | SDK 23+ |

## Phase 4: remaining work

### 4a. Publishing standalone packages

- [ ] Publish `dust-core-kotlin` to Maven (group `io.t6x.dust`, artifact `dust-core`)
- [ ] Publish `dust-core-swift` to a Swift package registry or ensure git-based SPM resolution works for CI
- [ ] Publish `DustCore` podspec to a CocoaPods spec repo (or use local path pods for now)

### 4b. Capacitor CLI integration

- [ ] Update `capacitor update` / `cap sync` to auto-generate `:dust-core-kotlin` in `capacitor.settings.gradle` when `:capacitor-core` is present
- [ ] Ensure `cap sync ios` resolves `dust-core-swift` SPM dependency correctly

### 4c. CI pipeline

- [ ] Add `dust-core-kotlin` standalone test job (Gradle, no Android SDK needed)
- [ ] Add `dust-core-swift` standalone test job (macOS runner, `swift test`)
- [ ] Update existing `capacitor-core` CI to depend on standalone package jobs

### 4d. Version synchronization

- [ ] Decide versioning strategy: lock all three packages to same version, or allow independent versioning
- [ ] Add version compatibility check (e.g., `dust-core-kotlin` 0.1.x is compatible with `capacitor-core` 0.1.x)

### 4e. Documentation

- [ ] Create `dust-core-kotlin/README.md` with standalone usage examples (no Capacitor)
- [ ] Create `dust-core-swift/README.md` with standalone usage examples (no Capacitor)
- [ ] Add migration guide for existing consumers upgrading from bundled to decoupled architecture

---

<p align="center">
  Part of <a href="../README.md"><strong>dust</strong></a> — Device Unified Serving Toolkit
</p>
