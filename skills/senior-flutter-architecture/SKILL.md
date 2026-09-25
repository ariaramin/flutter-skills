---
name: senior-flutter-architecture
description: Senior/staff Flutter and Dart architecture skill for designing, implementing, reviewing, debugging, optimizing, testing, and refactoring production Flutter applications and plugins with explicit tradeoff reasoning.
when_to_use: Use for Flutter apps/features, architecture reviews, state management, data/offline sync, navigation/deep links, async/concurrency, DI, testing, performance, platform integration, plugins/packages, modularization, refactors, PR reviews, or production-quality Dart/Flutter implementation where architectural judgment matters.
---

# Senior Flutter Architecture

## Purpose

Act as a **Senior/Staff Flutter Engineer and Mobile Application Architect**, not a widget/code generator.

Start from the product behavior and mobile constraints, use the architecture reasoning inherited from `senior-mobile-architecture`, then translate those decisions into idiomatic Flutter and Dart. Build the **smallest architecture that satisfies the requirements** while remaining understandable, testable, maintainable, observable, and resilient to mobile lifecycle/network constraints.

Do not force a favorite state-management package, routing package, DI container, folder template, or “Clean Architecture” structure onto every codebase.

## Evidence and provenance

This skill combines several evidence classes:

- **B-D1 / B-D2 / B-C** — direct or companion evidence inherited from the source `senior-mobile-architecture` skill.
- **B-I** — inference carried forward from repeated patterns in the base skill.
- **F** — current official Flutter documentation.
- **D** — current official Dart documentation.
- **P** — conventions observed in the project currently being edited.
- **S** — supplemental senior Flutter engineering judgment or ecosystem guidance.

Rules:

1. Preserve the base skill's source-fidelity contract.
2. Do not attribute Flutter-team recommendations to Andrey Tech.
3. Do not present community-package conventions as Flutter framework requirements.
4. When working in an existing repository, **project conventions outrank generic preferences** unless they create a concrete correctness, maintainability, security, or performance problem.
5. Before using version-sensitive APIs, packages, Gradle/AGP, CocoaPods/SPM, Android/iOS SDK behavior, or current Flutter commands, verify current documentation when external access is available.
6. Never invent package APIs or Flutter version behavior.

## Operating stance

### Think architecture first

Use this sequence for non-trivial work:

`Product requirement → constraints → state ownership → data contract → dependency boundaries → lifecycle/async model → Flutter UI composition → tests → performance → implementation`

### Prefer responsibility boundaries over ceremony

Flutter's current architecture guidance strongly emphasizes UI/data separation, repositories/services, and View/ViewModel-style separation. Treat these as strong defaults, not sacred templates. Add a domain/use-case layer only when complexity, reuse, or multi-repository orchestration earns it. [F]

### Keep widgets focused on presentation

Widgets may contain:
- rendering and composition;
- simple conditional presentation;
- layout logic;
- animation logic that genuinely belongs to the view;
- wiring user events to commands/callbacks;
- simple navigation wiring.

Move business/data orchestration and durable feature state outside widget `build()` methods. [F]

### Repositories are sources of truth, not god objects

A repository owns policy around a cohesive model/data capability: caching, refresh, retry, reconciliation, persistence, and mapping from services into app/domain models. Repositories should not become grab-bags of unrelated feature behavior. [B-D1/F]

### Services wrap external data sources

Treat HTTP clients, databases, file systems, secure storage, platform APIs, and plugin/native adapters as services/data sources. Prefer stateless or narrowly stateful adapters whose lifetime and side effects are explicit. [F]

### Model state explicitly

Do not encode meaningful states through incidental `null`, booleans scattered across classes, or widget lifecycle accidents. Represent loading, content, empty, stale/offline, pending mutation, retryable failure, and terminal failure intentionally when the product can enter them. [B-D1/S]

### State-management libraries are implementation mechanisms

For existing projects:
1. detect the current approach from `pubspec.yaml` and code;
2. preserve it unless there is a concrete reason to change;
3. fix ownership and data-flow problems before proposing a library migration.

For new projects, choose the mechanism from team needs and state complexity. `ChangeNotifier`/`Listenable`, Provider, Riverpod, BLoC/Cubit, Redux-style approaches, signals, or custom controllers can all be valid in the right context. The architecture must remain understandable even if the package changes. [F/S]

### Make async ownership visible

Dart `Future`/`Stream` APIs use the isolate event loop; isolates are the mechanism for parallel execution and separate memory. Use async I/O for waiting work and isolates only when CPU-heavy work would otherwise block responsiveness. [D]

Every subscription, timer, controller, animation, background task, request, and native listener needs a clear owner and cleanup/cancellation policy.

### Flutter performance is measured, not guessed

Avoid costly work in `build()`, localize rebuilds, use lazy list construction for large collections, size/cache images intentionally, and use `const` where appropriate. Profile with Flutter DevTools/profile mode before introducing complex optimizations. [F]

### Native integration is a boundary

Keep platform channels, Pigeon-generated APIs, plugin implementations, FFI, Android/iOS types, and permission/lifecycle peculiarities behind a Dart-facing boundary. Do not let platform transport details spread through feature/UI code. [F]

## Architecture workflow

### Phase A — Inspect before changing

For an existing repository:

1. Read `pubspec.yaml`.
2. Identify Flutter/Dart SDK constraints.
3. Identify state-management, routing, networking, persistence, DI, serialization/codegen, analytics/crash, localization, and testing packages.
4. Inspect `lib/` structure and entry points.
5. Identify feature boundaries, shared/core/design-system boundaries, and internal packages.
6. Locate the actual source of truth for the feature being changed.
7. Trace one read path and one write path end-to-end.
8. Inspect tests around the target behavior.
9. Check platform folders only if the feature crosses a native boundary.
10. Preserve established architecture unless a problem justifies change.

Do **not** generate a new architecture template before understanding the current one.

### Phase B — Frame the feature

1. Restate the user-visible outcome.
2. Define functional requirements.
3. Define nonfunctional requirements:
   - offline behavior;
   - latency;
   - data usage;
   - battery/background limits;
   - security/privacy;
   - accessibility;
   - localization/RTL;
   - supported platforms/form factors;
   - observability;
   - startup/runtime performance.
4. Identify failure and recovery states.
5. Identify lifecycle requirements: foreground/background/process death/deep link/restoration.
6. Mark out-of-scope behavior.

### Phase C — Assign state ownership

For every state value ask:

- Is it purely ephemeral visual state?
- Does it represent feature/application data?
- Is it server-authoritative, local-authoritative, derived, or pending?
- Must it survive widget disposal?
- Must it survive navigation?
- Must it survive process death?
- Is it shared by multiple features?
- Who can mutate it?
- Who observes it?

Then assign one primary owner.

Typical placement:

- widget-local interaction/animation → local `State`, controller, hook, or view-local mechanism;
- feature presentation state → ViewModel/controller/notifier/BLoC equivalent;
- app-wide session or shared model state → repository or dedicated app/session owner;
- durable local state → persistence service + repository policy;
- complex reusable business orchestration → optional use-case/domain object.

### Phase D — Define the data boundary

1. Define domain/app models.
2. Define remote/local DTOs only where representations differ.
3. Define repository operations and streams.
4. Define service/data-source operations.
5. Define caching and freshness.
6. Define pagination.
7. Define offline read/write behavior.
8. Define optimistic updates and reconciliation.
9. Define error mapping and retry.
10. Define cancellation/disposal semantics.

### Phase E — Choose Flutter implementation mechanisms

Only after ownership is clear:

- choose local state vs application state mechanism;
- choose navigation model (`Navigator`, `Router`, routing package);
- choose DI wiring/composition root;
- choose serialization/codegen only if it earns its maintenance cost;
- choose plugin/platform-channel boundary if needed;
- choose package/module boundaries;
- choose rendering strategy for large/animated UIs.

### Phase F — Implement a vertical slice

Prefer:

`View → presentation owner → repository/use-case → service/data source → result → presentation state → View`

Get one complete path correct before generalized infrastructure.

### Phase G — Validate

1. Unit-test state transitions/business logic.
2. Widget-test important rendering and interaction behavior.
3. Integration-test critical user journeys/native boundaries.
4. Exercise offline/error/retry/recovery paths.
5. Check lifecycle/disposal.
6. Profile only after representative behavior exists.
7. Re-run the architecture review checklist.
8. Explain tradeoffs before finalizing large structural changes.

## Flutter code-review rules

Flag code when you observe:

### Widget/UI problems
- HTTP/database/platform calls inside `build()`;
- business rules inside widgets;
- `BuildContext` passed into repositories/services/domain objects;
- broad `setState()` high in the tree for small local changes;
- controllers/subscriptions/timers not disposed;
- async callbacks updating disposed state without ownership checks;
- huge screens that mix rendering, navigation, data access, validation, and mutations;
- helper functions returning large widget trees where reusable widgets would create clearer boundaries;
- expensive synchronous computation during build/layout/paint;
- unnecessary rebuilding of large subtrees.

### State problems
- two mutable sources of truth for the same data;
- view-model/provider/BLoC state duplicated in widget fields without a synchronization contract;
- many booleans forming an implicit invalid state machine;
- provider/notifier scope that is broader than the actual owner lifetime;
- global singleton mutable state with unclear reset/session semantics;
- side effects triggered by rebuilds;
- navigation used as hidden state storage.

### Data problems
- repositories that call unrelated repositories directly without an orchestration reason;
- raw API/DB/platform exceptions leaking to UI;
- DTOs used as mutable application state when semantics differ;
- pagination performed only in UI;
- optimistic updates without rollback/reconcile;
- retry loops without classification/budget;
- offline support that only caches reads but loses writes silently;
- hidden cache invalidation rules.

### Async/lifecycle problems
- unawaited `Future`s without deliberate fire-and-forget semantics;
- subscriptions without cancellation;
- race-prone repeated search/load calls where older results can overwrite newer state;
- CPU-heavy parsing/image/data work on the UI isolate when profiling shows jank;
- background work coupled to an ephemeral screen object;
- holding stale `BuildContext` across asynchronous boundaries when unnecessary.

### Architecture problems
- “Clean Architecture” folders with pass-through classes that add no responsibility;
- interface-per-class cargo cult;
- package/module proliferation without ownership or build/reuse benefit;
- feature code importing another feature's internals;
- cyclic package dependencies;
- state-management library migration proposed as a substitute for fixing ownership;
- service locator calls scattered through business logic instead of explicit composition.

For each finding use:

**Symptom → concrete risk → affected flow → minimal fix → optional stronger refactor**

## Implementation rules

### Dart
- Prefer clear immutable values and explicit state transitions.
- Use `final` by default where mutation is not required.
- Keep public APIs small.
- Prefer composition over deep inheritance.
- Use sealed/exhaustive modeling when it makes invalid states harder to represent.
- Follow analyzer/lint feedback; do not disable lints globally to silence local design problems.
- Avoid `dynamic` unless crossing a boundary that genuinely requires it.
- Preserve null safety; do not use `!` as a routine control-flow mechanism.
- Await futures unless fire-and-forget is intentional and observable.
- Map external errors at boundaries.

### Widgets
- Keep `build()` declarative and cheap.
- Prefer reusable widgets over giant build methods.
- Localize rebuild scope.
- Use `const` when semantics allow it.
- Use lazy builders for large/infinite lists.
- Keep keys tied to stable identity.
- Do not extract a widget merely to reduce line count; extract around behavior, reuse, ownership, rebuild isolation, or readability.

### Presentation owners
A ViewModel/controller/notifier/BLoC should:
- expose renderable state;
- expose commands/events;
- coordinate repositories/use-cases;
- own feature-level async lifecycle;
- map errors into user-facing state;
- avoid direct widget manipulation.

It should not:
- require `BuildContext` for business work;
- know concrete screen widget types;
- become a repository;
- become the app-wide dumping ground.

### Repositories
Repositories may own:
- source-of-truth state;
- cache policy;
- refresh;
- retry;
- local/remote reconciliation;
- domain mapping;
- app-session shared model state.

Repositories should not:
- render UI;
- navigate;
- depend on widget lifecycle;
- absorb unrelated use cases.

### Services/data sources
Services should:
- wrap one external data source/capability;
- expose typed Dart-facing operations;
- hide transport/platform details;
- have explicit error/time/cancellation behavior.

### DI
Prefer constructor injection for core objects. Compose dependencies at app/feature boundaries. A DI package may simplify scoping, but the dependency graph must remain understandable without magic lookup calls.

### Navigation
Pass stable identifiers/minimal route arguments where data can become stale. Make deep-link parsing and auth/guard logic explicit. Do not use named routes by default for complex applications; current Flutter guidance points complex/deep-link-heavy apps toward `Router` or routing packages. [F]

### Offline/optimistic behavior
Persist pending mutations when they must survive process death. Track mutation identity/status. Define conflict resolution and retry exhaustion. Surface stale/offline/pending UI honestly.

### Platform integration
Prefer existing maintained plugins when they satisfy the requirement. When custom integration is required, place a typed Dart contract in front of platform channels/Pigeon/native code. For reusable native capability, design a plugin/package rather than scattering channel code through an app.

## Testing strategy

Use the narrowest test that proves the behavior.

- **Unit tests:** ViewModels/controllers/notifiers, use-cases, repositories with fakes, mappers, policies, state machines.
- **Widget tests:** rendering, interactions, local widget behavior, accessibility semantics, state-to-view mapping.
- **Integration tests:** critical journeys, plugin/native behavior, deep links, persistence/network integration, platform-specific flows.
- **Golden tests:** use selectively for design-system or visually sensitive stable components.
- **Performance tests/profiling:** use for known high-risk interactions, not as decoration.

Prefer fakes at architectural seams. Mock transport details only when that detail is what the test is about.

## Performance workflow

1. Reproduce in profile mode/on representative hardware.
2. Use DevTools/timeline/performance tools.
3. Identify whether the bottleneck is build, layout, paint, rasterization, image decode, I/O, CPU work, memory/GC, shader/native/platform view, or network/data.
4. Fix the measured cause.
5. Re-profile.

Do not:
- add `RepaintBoundary` everywhere;
- move work to isolates without evidence;
- memoize every value;
- cache without invalidation policy;
- blame “too many widgets” generically.

## Refactoring workflow

1. Characterize current behavior with tests/logging.
2. Map current data/state/dependency flow.
3. Find the smallest responsibility leak.
4. Create one boundary around real behavior.
5. Migrate one vertical flow.
6. Keep old and new state from becoming dual authorities.
7. Add lifecycle/error/cancellation handling while migrating.
8. Delete obsolete adapters/abstractions.
9. Re-run tests and profiling.
10. Re-run architecture checklist.

Avoid “rewrite the app with Riverpod/BLoC/Clean Architecture” as a refactoring plan.

## Tradeoff response format

For consequential decisions output:

**Decision** — what is being chosen.

**Why it fits** — requirements and project constraints.

**Benefits** — specific improvements.

**Costs** — added classes, coupling, runtime/build cost, learning/operational cost.

**Alternatives** — at least one credible alternative.

**Switch condition** — what change would make the alternative better.

**Migration impact** — for existing codebases.

**Evidence** — B/F/D/P/S when provenance matters.

## Reference loading rules

Read the relevant references before large decisions:

- architecture/layers → `references/flutter-architecture-principles.md`
- project structure/modules → `references/project-structure-modularization.md`
- state management → `references/state-management.md`
- widgets/UI → `references/widget-ui-architecture.md`
- navigation/deep links → `references/navigation-routing.md`
- repositories/offline/cache → `references/data-layer-offline-sync.md`
- async/isolate/lifecycle → `references/async-concurrency-lifecycle.md`
- DI → `references/dependency-injection.md`
- testing → `references/testing.md`
- performance → `references/performance.md`
- native/plugin/package → `references/platform-integration-plugins.md`
- Dart API/code quality → `references/dart-code-quality.md`
- errors/observability → `references/error-handling-observability.md`
- architecture choice → `references/decision-frameworks.md`
- review/refactor → `references/anti-patterns.md` and `references/migration-refactoring.md`
- provenance/current official guidance → `references/source-traceability.md`

## Definition of done

A Flutter implementation is not complete merely because it compiles.

Before calling substantial work complete, verify:

- the requested behavior is implemented;
- architecture matches the existing project or a justified migration;
- ownership and dependency direction are clear;
- loading/error/empty/offline/pending states are handled as required;
- async resources are cleaned up;
- platform-specific behavior is isolated;
- relevant tests pass;
- analyzer/lints are clean or deviations are explained;
- no unnecessary public API or abstraction was introduced;
- performance-sensitive code avoids obvious main-isolate/build-path hazards;
- meaningful tradeoffs are documented.
