---
name: flutter-plugin-style-architecture
description: Architect, implement, review, modularize, and optimize Flutter applications using compile-time assembled, contract-driven Plugin-Style Architecture across all supported platforms (Android, iOS, Web, Windows, macOS, Linux). Use when designing modular features, separating application capabilities into independent plugins, decoupling UI from domain and data layers, implementing explicit dependency injection and composition roots, establishing cross-platform capability abstractions, or auditing Flutter architectures for maintainability, testability, and AOT performance.
---

# Flutter Plugin-Style Architecture

## 1. Skill Metadata & Operating Scope

- **Role**: Senior Flutter Software Architect, Dart Performance Engineer, Cross-Platform Systems Specialist, and AI Skill Engineer.
- **Primary Objective**: Design, implement, maintain, and optimize robust, high-performance Flutter applications through compile-time assembled, contract-driven Plugin-Style Architecture.
- **Target Platforms**: Android (API 24+), iOS (15+), Web (JS/Wasm), Windows (10/11), macOS (12+), and Linux (Debian/Ubuntu LTS).
- **Core Distinction**: **Application Feature Plugins** are application-level architectural modules contributing cohesive business capabilities, UI views, and domain contracts via an application composition root. They are **not** native platform plugins (`flutter.plugin` platform channel bridges), though they may consume them.
- **Applicability**: Small modular apps, medium-sized multi-feature systems, and large enterprise Flutter monorepos/workspaces.
- **Deep References**:
  - Full source inventory and bibliography: [sources.md](references/sources.md)
  - Complete, compiling reference implementation: [reference-implementation.md](references/reference-implementation.md)
  - In-depth architectural synthesis: [research-architecture.md](references/research-architecture.md)
  - Cross-platform capability research: [research-platforms.md](references/research-platforms.md)
  - Asynchronous lifecycle and cleanup research: [research-async-cleanup.md](references/research-async-cleanup.md)

---

## 2. Core Architectural Philosophy

1. **Compiled-in, Explicit Assembly**: Flutter AOT compilation and tree shaking require explicit, statically reachable registration. Do not rely on dynamic reflection (`dart:mirrors`) or unverified runtime bytecode loading.
2. **Ports and Adapters (Cockburn)**: Define capability contracts (ports) in the application's domain vocabulary. Implement them via adapters (HTTP, persistence, native services, or test fakes). Consumers depend exclusively on contracts, never on concrete adapters.
3. **Configuration vs. Use (Fowler)**: Separate object creation and dependency wiring from feature execution. Feature modules receive explicit dependencies via constructor injection. The Application Composition Root owns assembly.
4. **Information Hiding (Parnas)**: Encapsulate volatile technology, storage formats, vendor SDKs, and platform APIs behind stable module interfaces. Expose only what consumers need to observe.
5. **Open/Closed Principle (Martin/Meyer)**: Introduce new capabilities or platform adapters by adding new classes and registration declarations without altering existing business logic or unrelated modules.
6. **Progressive Modularization**: Prefer library boundaries (`lib/src/` with curated exports) within a package first. Extract standalone packages or pub workspace members only when ownership, independent testing, or multi-app reuse justifies the manifest coordination overhead.

---

## 3. Architecture Decision Framework

Evaluate changes using the following decision matrix before introducing abstractions:

| Architectural Need | Recommended Mechanism | Justification / Trade-off |
| :--- | :--- | :--- |
| **Cohesive internal logic** | Concrete class in `lib/src/` | No volatile details or alternate implementations; avoids ceremonial indirection. |
| **Replaceable capability** | `abstract interface class` | Enables substitution for tests, platform alternatives, or vendor migrations. |
| **Closed state / result family** | `sealed class` | Guarantees exhaustive compiler pattern matching; prevents uncontrolled subtypes. |
| **Cohesive product feature** | Application Feature Plugin | Contributes routes, services, or background tasks via explicit host registration. |
| **Independent package/team** | Pub workspace member | Enables independent CI test suites and versioning; increases manifest maintenance. |
| **Platform-divergent code** | Capability query + conditional import | Isolates platform-incompatible SDKs (e.g., `dart:io` vs web) behind a shared API. |

### Decision Rules
- **Rule 1 (The Single Caller Test)**: If an abstraction has only one implementation and no planned test fake or platform variant, keep it as a concrete class with constructor seams.
- **Rule 2 (No God Interfaces)**: A port must represent a single, cohesive capability. Do not aggregate unrelated operations into a monolithic interface.
- **Rule 3 (No Forwarding Use-Cases)**: If a ViewModel only calls a single repository method without orchestration or transformation, call the repository directly.

---

## 4. Project Structure (Small, Medium, Enterprise)

### Small Application (Single Package)
```text
lib/
├── main.dart                          # Composition root & entry point
└── src/
    ├── core/
    │   ├── capability.dart            # Capability status & base contracts
    │   ├── plugin_contract.dart       # ApplicationPlugin & PluginContext
    │   └── plugin_registry.dart       # Host registry & lifecycle manager
    └── features/
        ├── analytics/                 # Contracts, implementations, plugins
        └── documents/                 # UI views, ViewModels, feature plugins
```

### Medium Application (Single Package with Strict Boundaries)
```text
lib/
├── app.dart                           # Curated public exports
├── main.dart                          # Composition root
└── src/
    ├── core/                          # Contracts, registry, DI, capabilities
    ├── infrastructure/                # Database, HTTP, platform adapters
    └── features/                      # Modular features (data, domain, UI)
```

### Large Enterprise Monorepo (Pub Workspace)
```text
my_workspace/
├── pubspec.yaml                       # workspace: [packages/*, app]
├── packages/
│   ├── app_core/                      # Shared contracts, plugin interfaces, registry
│   ├── infrastructure_storage/        # Drift/Hive/SecureStorage adapters
│   ├── feature_auth/                  # Auth UI, ViewModel, plugin implementation
│   └── feature_documents/             # Documents UI, ViewModel, plugin implementation
└── app/
    ├── pubspec.yaml                   # Depends on core and required features
    └── lib/main.dart                  # Composition root wiring selected plugins
```

---

## 5. Implementation Guidelines

### 5.1 Contract Definition
- Declare ports as `abstract interface class` (Dart 3.0+) to prohibit external subclassing while allowing implementation.
- Return explicit `Result<T, E>` types or typed domain models. Never throw undocumented exceptions across module boundaries.

### 5.2 Application Plugin Interface
Every feature plugin must satisfy the core lifecycle contract:
```dart
abstract interface class ApplicationPlugin {
  String get id;
  Set<String> get dependencies;
  PluginLifecycleState get state;

  Future<void> initialize(PluginContext context);
  Future<void> dispose();
}
```

### 5.3 Composition Root & Lifecycle Orchestration
- **Topological Ordering**: The registry must perform cycle detection and initialize plugins in dependency order.
- **Synchronous State Guards**: Set state flags synchronously before awaiting any asynchronous initialization or disposal step to prevent reentrant race conditions.
- **Rollback on Failure**: If any plugin fails during `initializeAll()`, the host must immediately abort and dispose already-initialized plugins in reverse initialization order.
- **Reverse Teardown**: Shutdown must proceed in strict reverse dependency order (LIFO).

### 5.4 Feature Presentation & Dependency Injection
- Views depend on ViewModels; ViewModels depend on capability contracts.
- Dependencies are passed via constructor injection. Feature code must **never** reference `PluginRegistry` or global service locators directly.
- Use `ListenableBuilder` or scoped controllers to localize widget rebuilds.

### 5.5 Cross-Platform Capability Negotiation
- Check capability availability before invoking platform features:
```dart
enum CapabilityStatus { available, unsupported, permissionDenied, restricted, error }
```
- Provide graceful degradation or fallback UI when a capability is unsupported on the host platform.

---

## 6. Code Quality Standards

1. **Dart Class Modifiers**:
   - Use `abstract interface class` for public contracts.
   - Use `sealed class` for state hierarchies (e.g., `Result`, `PluginLifecycleState`).
   - Use `final class` for immutable value objects and configuration records.
2. **Encapsulation**: Place all implementation classes under `lib/src/`. Expose contracts and composition entry points via curated barrel files in `lib/`.
3. **No Container Leakage**: Do not pass service locators, dependency containers, or `BuildContext` into domain or data layers.
4. **Lint Enforcement**: Enable and adhere to `package:flutter_lints` or `very_good_analysis`. Strictly enforce the `implementation_imports` lint rule.
5. **Null Safety**: Eliminate unsafe null assertions (`!`). Use pattern matching, exhaustive switches, and explicit null checks.

---

## 7. Performance Engineering

1. **AOT Compilation & Tree Shaking**:
   - Flutter compiles release binaries ahead-of-time (AOT) to machine code (mobile/desktop) or JavaScript/Wasm (web).
   - Dynamic reflection (`dart:mirrors`) is disabled in Flutter. Plugin discovery must be static via explicit registration.
2. **Deferred Components & Code Splitting**:
   - Use deferred imports (`import '...' deferred as ...`) and `loadLibrary()` for heavy, rarely used features on Web and Android.
   - Types needed across the deferred boundary must reside in a shared non-deferred core package.
3. **Widget Rebuild Optimization**:
   - Mark static widgets and subtree leaves as `const`.
   - Never place I/O, heavy transformations, or repository fetches inside `Widget.build()`.
   - Use `ListenableBuilder` or fine-grained selectors to confine rebuilds to the exact widgets displaying mutable data.
4. **Isolate Offloading**:
   - Long-running CPU-heavy computations (>16ms) must be offloaded via `Isolate.run()` to prevent UI jank.
5. **Asynchronous Teardown & Leak Prevention**:
   - Always await `StreamSubscription.cancel()` before releasing related resources.
   - Close `StreamController`s and cancel active `Timer`s during plugin `dispose()`. Note: `Future.timeout` does **not** cancel the underlying operation.

---

## 8. Testing Strategy

Maintain an automated testing pyramid for all plugin modules:

1. **Contract Tests**:
   - Reusable test suites testing contract invariants across all implementations (in-memory fake, production adapter, mock).
   - See [reference-implementation.md](references/reference-implementation.md#automated-tests-unit-contract-and-widget) for the canonical `DocumentStorage` contract suite.
2. **Unit Tests**:
   - Verify ViewModels, domain policies, and registry algorithms in isolation using plain test fakes.
3. **Widget Tests**:
   - Verify UI rendering, interaction states, and error presentation with fake contracts using `WidgetTester` without real I/O.
4. **Lifecycle & Graph Tests**:
   - Verify dependency sorting, circular dependency rejection, failure rollback, and clean shutdown.

---

## 9. AI Agent Workflow

Follow this 15-step repeatable workflow when architecting, adding, or refactoring features:

```text
 1. Inspect existing project structure, SDK versions, and dependency declarations.
 2. Identify the active architecture pattern, state management, and conventions.
 3. Determine if the requested capability requires a new abstraction or plugin.
 4. Define the smallest necessary contract as an `abstract interface class`.
 5. Implement domain logic and models, keeping them free of UI and vendor dependencies.
 6. Implement the concrete feature adapter or plugin under `lib/src/`.
 7. Register the plugin within the Application Composition Root (`main.dart` or registry).
 8. Implement the ViewModel with explicit constructor injection.
 9. Build the UI view using `ListenableBuilder` and `const` constructors.
10. Implement reusable contract tests against both fake and concrete implementations.
11. Implement ViewModel unit tests and UI widget tests.
12. Verify lifecycle behavior: async initialization, failure rollback, and disposal.
13. Run static analysis (`dart analyze`) — must pass with zero errors and warnings.
14. Run the automated test suite (`flutter test`) — all tests must pass.
15. Verify memory ownership and ensure no resources are leaked upon disposal.
```

---

## 10. Anti-Patterns and Failure Prevention

- **Anti-Pattern 1: God Registry / Service Locator Abuse**: Injecting the registry or locator into feature classes. *Fix*: Pass specific dependencies via constructors.
- **Anti-Pattern 2: Missing Cleanup Await**: Assuming `dispose()` synchronously cleans up async resources. *Fix*: Design lifecycle methods to return `Future<void>` and await subscription cancellation.
- **Anti-Pattern 3: Unhandled Async Timeout**: Relying on `.timeout()` to cancel in-flight network requests or disk writes. *Fix*: Implement cooperative cancellation tokens or check generation counters.
- **Anti-Pattern 4: Platform Leakage**: Importing `dart:io` in shared cross-platform code without conditional compilation. *Fix*: Use conditional imports or platform capability abstractions.
- **Anti-Pattern 5: Circular Plugin Dependencies**: Plugin A depends on B, while B depends on A. *Fix*: Enforce DAG validation during registration and extract shared contracts to Core.
- **Anti-Pattern 6: Layering Ceremonies**: Adding forwarding UseCases and DTO mappers for simple, stable data queries. *Fix*: Allow ViewModels to consume Repositories directly when no multi-source orchestration exists.

---

## 11. Reference Implementations

Consult the complete, tested reference implementation in [reference-implementation.md](references/reference-implementation.md) for full code listings:

- **Capability Contract**: [lib/src/core/capability.dart](references/reference-implementation.md#core-contracts--capabilities)
- **Plugin Lifecycle Contract**: [lib/src/core/plugin_contract.dart](references/reference-implementation.md#core-contracts--capabilities)
- **Host Registry & DAG Resolver**: [lib/src/core/plugin_registry.dart](references/reference-implementation.md#composition-root--lifecycle-registry)
- **Concrete Plugin (Analytics)**: [lib/src/features/analytics/](references/reference-implementation.md#feature-1-analytics-capability)
- **Dependent Plugin (Storage)**: [lib/src/features/storage/](references/reference-implementation.md#feature-2-document-storage-capability)
- **Presentation ViewModel & View**: [lib/src/features/documents/](references/reference-implementation.md#presentation-layer-viewmodel--view)
- **Composition Root Entrypoint**: [lib/main.dart](references/reference-implementation.md#application-entrypoint)
- **Automated Tests (Contract, Registry, ViewModel, Widget)**: [test/](references/reference-implementation.md#automated-tests-unit-contract-and-widget)

---

## 12. Verification and Compliance Checklist

Before completing an architectural change, verify compliance against this checklist:

- [ ] **Contract Integrity**: Are all capability contracts declared as `abstract interface class` with narrow, typed signatures?
- [ ] **Encapsulation**: Are implementation classes located in `lib/src/` with only contracts and factories exported in public barrel files?
- [ ] **Explicit Injection**: Do all ViewModels and services receive dependencies via constructor arguments without accessing global state?
- [ ] **DAG Validation**: Does the plugin registry validate dependencies and reject circular graphs?
- [ ] **Rollback Protection**: Does initialization failure properly trigger reverse disposal of already-initialized plugins?
- [ ] **Teardown Safety**: Are all subscriptions, timers, and controllers awaited or closed during disposal?
- [ ] **Cross-Platform Safety**: Are platform-specific APIs guarded by capability checks or conditional imports?
- [ ] **Rebuild Efficiency**: Are widget rebuilds localized and static widgets marked `const`?
- [ ] **Zero Diagnostics**: Does `dart analyze` report zero errors, warnings, or lint violations?
- [ ] **Pyramid Coverage**: Do contract tests, unit tests, and widget tests all pass under `flutter test`?

---

## 13. Research References

Authoritative sources and documentation establishing this architectural standard:

- **Official Flutter Architecture Guide**: [docs.flutter.dev/app-architecture/guide](https://docs.flutter.dev/app-architecture/guide)
- **Architecture Recommendations & Best Practices**: [docs.flutter.dev/app-architecture/recommendations](https://docs.flutter.dev/app-architecture/recommendations)
- **Flutter Architectural Overview**: [docs.flutter.dev/resources/architectural-overview](https://docs.flutter.dev/resources/architectural-overview)
- **Dart Class Modifiers Specification**: [dart.dev/language/class-modifiers](https://dart.dev/language/class-modifiers)
- **Dart Effective Design**: [dart.dev/effective-dart/design](https://dart.dev/effective-dart/design)
- **Pub Workspaces Documentation**: [dart.dev/tools/pub/workspaces](https://dart.dev/tools/pub/workspaces)
- **Asynchronous Cleanup & Cancellation**: [api.dart.dev/dart-async/StreamSubscription/cancel.html](https://api.dart.dev/dart-async/StreamSubscription/cancel.html)
- **Primary Source Catalog & Findings**: [references/sources.md](references/sources.md)
