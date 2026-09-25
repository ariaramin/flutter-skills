---
name: flutter-get-it-injectable-dependency-injection
description: Design, implement, review, debug, test, refactor, and optimize dependency injection in production Flutter/Dart repositories using get_it, injectable, or both. Use this skill whenever work involves adding or wiring services/repositories/API clients/databases/SDKs/Bloc/Cubit dependencies, choosing factory/singleton/lazy/async/scoped lifetimes, configuring injectable generation/modules/environments/named bindings, managing startup readiness, login/logout session scopes, disposal, DI tests/overrides, circular dependencies, or hidden GetIt.I lookups—even if the request is framed only as “register this service”, “fix DI”, “wire this dependency”, or “make startup cleaner”.
compatibility: Based on the supplied guide's current package baseline of get_it 9.2.1, injectable 3.0.0, and injectable_generator 3.1.1. Always inspect pubspec.lock, SDK constraints, generated configuration, and the repository's actual APIs before applying version-sensitive examples.
---

# Flutter Dependency Injection with get_it & injectable

## Mission

Build a dependency graph whose ownership, lifetime, readiness, environment, and cleanup are explicit.

Treat `get_it` as the runtime container, `injectable` as optional registration generation, and constructor injection as the application-facing dependency contract.

Do not introduce DI machinery when direct constructors are already clearer.

## Invariants

1. Define ownership before registration.
2. Prefer constructor injection in application/business code.
3. Keep direct `getIt<T>()` access at composition/framework boundaries.
4. Centralize registration in bootstrap or explicit scope initialization.
5. Choose lifetime from semantics, not convenience.
6. Do not make everything a singleton or every Bloc/Cubit a singleton.
7. Use scopes for real session/account/workflow lifetime boundaries.
8. Distinguish construction, async initialization, and readiness.
9. Define deterministic disposal for owned resources.
10. Keep environment selection centralized.
11. Use named registrations only when same-type instances genuinely coexist.
12. Do not hide circular dependencies with locator lookup.
13. Never edit generated `*.config.dart` manually.
14. Let narrow unit tests bypass the container.
15. Optimize eager work and retained graphs before lookup micro-performance.

## Reference routing

| Need | Read |
|---|---|
| DI choice, get_it vs injectable, lifetimes, constructor injection, modules, names, environments | `references/01-composition-lifetimes.md` |
| Async registration/readiness, scopes, session lifetime, disposal | `references/02-async-scopes-disposal.md` |
| Dio/Bloc/repository integration, startup, tests/overrides, codegen, registration diagnosis | `references/03-integrations-startup-testing.md` |
| Circular dependencies, performance, memory, hot reload, organization, anti-patterns | `references/04-architecture-performance-antipatterns.md` |
| Implementation/review/refactor workflows and production checklists | `references/05-workflows-checklists.md` |

Load the smallest combination that resolves the task.

## Repository inspection

Before editing, inspect:

- `pubspec.yaml`, `pubspec.lock`, SDK constraints, and locked DI package versions;
- `main`, bootstrap, `configureDependencies`, `@InjectableInit`;
- generated `*.config.dart` to understand current registrations, without editing it;
- every registration, scope, readiness, reset, and direct locator lookup;
- lifecycle owners for Dio, DBs, sockets, subscriptions, caches, SDKs, Bloc/Cubit;
- environment bindings, names, modules, async/pre-resolve/dispose annotations;
- tests that override, shadow, or reset registrations;
- the repository's generation commands.

For important registrations capture:

```text
Type / implementation
Owner / lifetime / scope
Name / environment
Async readiness
Disposal
Consumers
```

Do not refactor until the graph is understandable.

## Dependency decision workflow

### 1. Identify responsibility

State what the object does. If unclear, fix the responsibility before DI design.

### 2. Identify the smallest real owner

Choose application, session/account/tenant, feature/workflow, route/widget subtree, or one call.

Ownership determines lifetime and cleanup.

### 3. Decide whether DI is needed

Use direct construction for cheap pure/local helpers and transient values that do not belong to the application object graph.

### 4. Make dependencies explicit

Prefer constructor injection:

```dart
final class OrdersRepository {
  OrdersRepository(this.api, this.cache);
  final OrdersApi api;
  final Cache cache;
}
```

Avoid business classes that resolve `GetIt.I<T>()` internally.

Use method parameters for call-specific data.

### 5. Choose lifetime

| Semantics | Registration |
|---|---|
| Fresh object each resolution | factory |
| Fresh object + caller runtime args | factory parameter |
| One eager/already-created object | singleton |
| One shared object on first use | lazy singleton |
| Shared async-created object | async singleton |
| Shared async object only on demand | lazy async singleton |
| Session/account/workflow lifetime | scoped registration |
| Weak GC-driven reuse with no deterministic cleanup need | cached factory, rarely |

Do not choose singleton merely to avoid wiring constructors.

### 6. Choose manual or generated composition

Use constructors/manual `get_it` when the graph remains easy to read.

Use `injectable` when generated ordering, modules, environments, scopes, or many transitive registrations meaningfully reduce boilerplate.

Preserve a valid existing convention unless migration solves a concrete problem.

### 7. Handle runtime values correctly

Use factory params or ordinary constructor/method arguments for route IDs, workflow values, or call data.

Do not turn changing IDs/user input into global singleton registrations.

### 8. Centralize environment selection

Bind dev/staging/prod/test implementations at composition time. Avoid scattered environment branches in repositories/services.

### 9. Model async behavior precisely

Ask separately:

- Does creation itself return a Future?
- Does a created object need `initialize()`?
- Must consumers wait?
- Must `runApp` wait?

Prefer Future-based async registration to manual readiness signals when possible.

### 10. Define cleanup now

For sockets, DBs, streams, subscriptions, SDK clients, and other resources, decide who closes/disposes them before registration.

Factory-created resources are normally consumer-owned.

## Composition root

Keep composition discoverable:

```text
main()
→ bootstrap()
→ configureDependencies(environment)
→ await only critical readiness
→ runApp()
```

Direct locator use is acceptable here and at narrow framework creation seams.

Never register from widget `build`, repository methods, or opportunistic business flows.

## get_it rules

### Factory

Use for route/feature-local mutable objects and most Bloc/Cubit registrations. Let the requesting owner dispose them.

### Lazy singleton

Use for shared services/repositories/infrastructure that need one instance but not eager startup creation. Remember the graph remains retained after first use.

### Async

Use `registerSingletonAsync` for shared async creation.

Use `dependsOn` only for real dependency ordering; keep independent startup work parallel.

Use `registerSingletonWithDependencies` when construction is synchronous but prerequisites are async.

Resolve lazy async registrations with `getAsync<T>()` unless pre-resolved.

### Readiness

Use `allReady()` only for the required async graph and consider a timeout. Use `isReady<T>()` when only one dependency matters.

Do not use manual `signalReady` where a Future can represent readiness.

### Scopes

Use scopes for coherent lifetime groups:

```text
push authenticated session
→ register UserSession + user repositories/socket/cache
→ logout/account switch
→ pop scope and await disposal
```

Scope teardown does not automatically revoke server tokens or erase persistent data; perform domain/security cleanup separately.

### Names / multiple registrations

Use names for same-type objects that genuinely coexist, such as public and authenticated Dio.

Use environment bindings for mutually exclusive implementations.

Enable `getAll<T>()`-style multiple registrations only for intentional extension lists.

## injectable rules

Treat annotations as registration metadata, not architecture.

- `@injectable`: factory-style generated construction.
- `@singleton`: intentional eager shared lifetime.
- `@lazySingleton`: intentional lazy shared lifetime.
- `@module`: construction of third-party/unowned dependencies.
- `as:`: abstraction binding where the interface is meaningful.
- `@Named`: genuine same-type coexistence.
- environment annotations: mutually exclusive implementations.
- `@factoryMethod`: non-default/static factory construction.
- `@preResolve`: startup must await the Future and later synchronous resolution is needed.
- `@disposeMethod`: cleanup for container-owned singleton-like objects.
- scopes: use only when application flow still owns explicit scope entry/exit.

Regenerate after graph changes. Never hand-edit generated config.

## Startup policy

Block `runApp` only for dependencies required to construct or safely use the application.

Often critical: backend-defining config, required encryption/database prerequisites, mandatory migration.

Often deferrable: analytics warm-up, optional cache warming, secondary SDKs, later feature data.

Render a bootstrap/loading state when non-critical initialization can occur after the Flutter tree starts.

Do not use `allReady()` as a universal startup hammer.

## Session/account isolation

Keep app-global infrastructure separate from user-specific state.

Typical app scope:

- environment config;
- logger/crash reporter;
- secure credential store;
- public auth API/infrastructure.

Typical session scope:

- `UserSession`;
- authenticated API façade;
- current-user repositories/caches;
- user-specific socket/services.

On logout/account switch, stop session work, pop/await scope cleanup, clear/revoke credentials and persistent user data according to policy, then create a fresh scope for the next identity.

## Bloc/Cubit integration

Typical ownership:

```text
shared repository (lazy singleton)
→ route Cubit/Bloc (factory)
→ BlocProvider creates it
→ BlocProvider closes it
```

Use app-lifetime Bloc/Cubit only when state truly has application lifetime.

Do not inject `GetIt` into Bloc/Cubit business logic.

## Infrastructure integration

Register Dio, DBs, sockets, SDKs according to actual shared lifetime.

For Dio, one backend/networking policy usually maps to one shared client; use separate named/types when base URL, auth, TLS, adapter, or lifetime materially differs.

Inject interceptor dependencies through constructors.

Do not close app-level infrastructure from a route.

## Circular dependencies

Treat `A → B → A` as a design smell.

Do not hide the cycle using lazy `GetIt.I` getters. Refactor responsibility, introduce a smaller shared abstraction, or move coordination to the actual workflow owner.

## Testing

### Narrow unit test

Construct directly with fakes. A business class should normally be testable without initializing global `GetIt`.

### Container test

Use `GetIt.asNewInstance()` for an isolated graph. Await cleanup/reset.

Use scope shadowing for bounded overrides of an existing graph.

Important: shadowing a lower dependency does not rebuild an already-created singleton that captured the old dependency. Recreate/shadow the dependent object or use a fresh graph.

### Generated graph test

Use a generated test environment when testing environment/configuration behavior, not ordinary business logic.

Avoid `allowReassignment` as the default testing strategy because it can mask duplicate-registration mistakes.

## Code generation

Use the repository's established generation command, commonly:

```bash
dart run build_runner build
```

Regenerate after constructor, annotation, module, scope, environment, name, binding, or lifecycle changes.

CI should detect stale generated output through the repository's normal generate/format/analyze/test workflow.

After DI graph changes during Flutter development, use hot restart when the running container must be rebuilt; hot reload usually preserves runtime state.

## Performance and memory

Optimize lifetime semantics:

- eager singleton → startup cost;
- lazy singleton → first-use cost + retained graph;
- factory → repeated construction but no shared retained instance;
- app singleton → retains everything reachable from it;
- session scope → releases user caches/sockets/subscriptions together;
- unnecessary readiness chains → serialize startup.

Do not micro-optimize ordinary type/name lookup before these costs.

Do not use weak cached factories for resources requiring deterministic disposal.

## Failure diagnosis

### Not registered

Check composition init, generated freshness, binding type, environment, scope, name, and async initialization.

### Duplicate registration

Check bootstrap called twice, widget/runtime registration, manual + generated duplication, overlapping environments, duplicate names, or preserved development runtime state. Fix composition before enabling reassignment.

### Async not ready

Check `get<T>()` vs `getAsync<T>()`, missing awaited generated init/pre-resolution, `dependsOn`, manual readiness, and async cycles.

### Wrong scoped implementation

Inspect active scope, shadowing, and whether session/test scopes were pushed or popped correctly.

### `allReady` hangs

Inspect every async/readiness registration and dependency cycle. Prefer Future-based readiness over manual signaling.

## Refactoring locator-heavy code

1. Add characterization tests.
2. Expose hidden dependencies in constructors.
3. Update manual/generated registration.
4. Add a direct constructor unit test.
5. Repeat one boundary at a time.
6. Remove legacy locator access after consumers are migrated.

Keep DI refactoring separate from unrelated domain behavior changes where possible.

## Review output

Report:

```text
Current graph/symptom
Ownership + lifetime finding
Root cause/risk
Change made/recommended
Async/readiness impact
Scope/disposal impact
Environment/name impact
Testing performed
Startup/memory impact
Residual version-sensitive risk
```

## Production gates

### Graph and direction

- all required dependencies resolve;
- no accidental duplicate or hidden cycle;
- composition root is discoverable;
- generated config matches source;
- business classes expose constructor dependencies;
- modules contain construction, not business workflow.

### Lifetime and ownership

- app/session/feature/route ownership is explicit;
- route state is not accidentally singleton;
- user-specific state ends on logout/account switch;
- shared resources are not accidentally factories;
- every disposable resource has a known owner.

### Async/readiness

- required initialization is deterministic;
- startup blocks only on critical dependencies;
- sync/async resolution APIs match registration type;
- readiness cannot hang silently.

### Environment/names

- one explicit environment is selected at bootstrap;
- production graph contains no fake/test binding;
- named registrations are limited and consistent.

### Testing

- core units can be constructed directly;
- container tests isolate and tear down state;
- session/environment/readiness behavior is tested where material.

### Performance/memory

- expensive optional services are not eagerly created without need;
- app-global retention is intentional;
- session caches/sockets/subscriptions are released;
- independent startup work is not unnecessarily serialized.

## Final decision rule

Before accepting any registration, answer:

```text
What does this object do?
Who owns it?
How long should it live?
Should consumers share it?
Does creation/readiness require await?
Who disposes it?
Does environment or runtime input change construction?
Can the consumer be unit-tested without the container?
```

Only then choose plain construction, factory, singleton, lazy singleton, async registration, scope, module, environment binding, or name.
