# Reference: Implementation, existing-code review, refactoring, code review, performance/testing/production checklists, and quick reference

This file preserves the corresponding section of the user-supplied engineering guide. Use it when the active skill routes the task here.

## Contents
- Implementation Workflow
  - 1. Identify responsibility
  - 2. Identify owner
  - 3. Determine lifetime
  - 4. Check whether DI is necessary
  - 5. Decide abstraction
  - 6. Prefer constructor injection
  - 7. Identify runtime constructor values
  - 8. Decide environment policy
  - 9. Identify async initialization
  - 10. Define disposal
  - 11. Choose manual or generated registration
  - 12. Add module if third-party
  - 13. Generate if using injectable
  - 14. Wire consumers through constructors
  - 15. Verify scope
  - 16. Test directly
  - 17. Test graph if needed
  - 18. Review startup
  - 19. Review memory
  - 20. Verify cleanup
- Existing-Code Review Workflow
  - 1. Find the composition root
  - 2. Inventory registrations
  - 3. Inspect generated configuration
  - 4. Inspect modules
  - 5. Search direct locator usage
  - 6. Inspect lifetimes
  - 7. Inspect scopes
  - 8. Inspect async registrations
  - 9. Inspect environment graph
  - 10. Inspect tests
  - 11. Inspect state management
  - 12. Inspect infrastructure
- Refactoring Workflow
  - Initial code
  - Step 1: expose constructor dependencies
  - Step 2: update registration
  - Step 3: add direct unit test
  - Step 4: repeat outward
- Code Review Checklist
  - Dependency direction
  - Composition
  - Lifetimes
  - Ownership
  - Async
  - Environments
  - Names
  - Scopes
  - Testability
  - Circular dependencies
- Performance Checklist
- Testing Checklist
- Production Readiness Checklist
  - Graph
  - Lifetime
  - Async
  - Environment
  - Testing
  - Memory
  - Maintainability
- Quick Reference

# Implementation Workflow

Before adding any dependency:

## 1. Identify responsibility

What does the object do?

Do not register a class whose role is unclear.

## 2. Identify owner

Choose:

- application;
- session;
- feature;
- route;
- request/call.

## 3. Determine lifetime

Ask:

- one shared instance?
- new instance each consumer?
- lazy?
- async?
- scoped?

## 4. Check whether DI is necessary

A small pure helper may simply be constructed where used.

## 5. Decide abstraction

Add an interface only if it creates a useful boundary.

## 6. Prefer constructor injection

Make dependencies explicit before writing registration code.

## 7. Identify runtime constructor values

Use ordinary method/constructor arguments or `factoryParam` rather than turning transient values into global services.

## 8. Decide environment policy

Is the implementation different in:

- dev;
- staging;
- production;
- test?

If yes, centralize that selection.

## 9. Identify async initialization

Ask:

```text
Can object construction be synchronous?
Does it need initialize()?
Must startup wait?
Can use be lazy?
```

## 10. Define disposal

For:

- sockets;
- stream subscriptions;
- DBs;
- controllers;
- clients;

define the cleanup owner now.

## 11. Choose manual or generated registration

Keep project convention unless there is a reason to migrate.

## 12. Add module if third-party

Do not wrap an SDK in a fake injectable class solely to annotate it.

## 13. Generate if using injectable

Regenerate configuration.

## 14. Wire consumers through constructors

Do not add new internal `getIt<T>()` calls.

## 15. Verify scope

Make sure user/feature state cannot outlive its owner.

## 16. Test directly

Construct consumer with a fake dependency.

## 17. Test graph if needed

Verify environment, name, async readiness, or scope registration.

## 18. Review startup

Ensure the new registration has not accidentally become an eager startup cost.

## 19. Review memory

A newly added singleton is a retained object graph.

## 20. Verify cleanup

Exercise logout, route disposal, test teardown, or scope pop.

---

# Existing-Code Review Workflow

Do not refactor DI before understanding the graph.

## 1. Find the composition root

Search:

```text
GetIt.instance
GetIt.I
@InjectableInit
configureDependencies
.config.dart
```

## 2. Inventory registrations

For each:

```text
Type:
Implementation:
Lifetime:
Scope:
Name:
Environment:
Async:
Disposal:
Consumers:
```

## 3. Inspect generated configuration

Read it to understand what the generator currently does.

Do not edit it.

## 4. Inspect modules

Identify:

- third-party construction;
- custom initializers;
- names;
- pre-resolution;
- environment bindings.

## 5. Search direct locator usage

Search:

```text
getIt<
GetIt.I<
GetIt.instance
```

Classify each occurrence:

```text
composition boundary → likely acceptable
business code         → candidate for refactor
```

## 6. Inspect lifetimes

Find app-global registrations that contain:

- route state;
- current-user state;
- feature subscriptions;
- sockets;
- large caches.

## 7. Inspect scopes

Understand:

- who pushes;
- who pops;
- what nested scopes exist;
- what happens on logout/account switch.

## 8. Inspect async registrations

Map:

```text
registerSingletonAsync
registerLazySingletonAsync
allReady
isReady
signalsReady
@preResolve
@PostConstruct
```

## 9. Inspect environment graph

Confirm each implementation's dependencies exist in the same active environment.

## 10. Inspect tests

Find:

- resets;
- scopes;
- reassignment;
- global setup;
- leaked registrations.

## 11. Inspect state management

Check whether factories vs singletons match Bloc/Cubit ownership.

## 12. Inspect infrastructure

Ensure Dio, DBs, secure storage, sockets, etc. have deliberate lifetimes/disposal.

Only then change the graph.

---

# Refactoring Workflow

Migrate locator-heavy business code incrementally.

## Initial code

```dart
final class OrdersRepository {
  final OrdersApi api =
      getIt<OrdersApi>();

  final Cache cache =
      getIt<Cache>();
}
```

## Step 1: expose constructor dependencies

```dart
final class OrdersRepository {
  OrdersRepository(
    this.api,
    this.cache,
  );

  final OrdersApi api;
  final Cache cache;
}
```

## Step 2: update registration

Manual:

```dart
getIt.registerLazySingleton<OrdersRepository>(
  () => OrdersRepository(
    getIt<OrdersApi>(),
    getIt<Cache>(),
  ),
);
```

Injectable:

```dart
@lazySingleton
final class OrdersRepository {
  OrdersRepository(
    this.api,
    this.cache,
  );

  final OrdersApi api;
  final Cache cache;
}
```

## Step 3: add direct unit test

```dart
final repository = OrdersRepository(
  FakeOrdersApi(),
  MemoryCache(),
);
```

## Step 4: repeat outward

Refactor one dependency boundary at a time.

Do not rewrite the entire object graph in one change unless the graph is tiny and fully tested.

---

# Code Review Checklist

## Dependency direction

- [ ] Business code does not depend on `get_it`.
- [ ] Constructor dependencies are visible.
- [ ] Higher-level application logic depends on abstractions where useful.
- [ ] Infrastructure does not import presentation code.

## Composition

- [ ] Registration is centralized.
- [ ] No registration in widget `build`.
- [ ] No hidden runtime registration in repository methods.
- [ ] Generated configuration is not manually edited.

## Lifetimes

- [ ] Factory objects actually need fresh instances.
- [ ] Singleton state genuinely has shared lifetime.
- [ ] Expensive optional service is not eagerly created without reason.
- [ ] Route Bloc/Cubit is not accidentally singleton.
- [ ] Session state is not app-global.

## Ownership

- [ ] Every disposable resource has an owner.
- [ ] Factory result cleanup belongs to consumer.
- [ ] Scope cleanup matches feature/session lifecycle.

## Async

- [ ] Async construction uses correct API.
- [ ] `getAsync` used when needed.
- [ ] Critical startup dependencies are awaited.
- [ ] Non-critical dependencies do not unnecessarily block startup.
- [ ] `dependsOn` reflects real dependency relationships.
- [ ] Manual readiness is justified.

## Environments

- [ ] Bootstrap chooses one explicit environment.
- [ ] Active implementation has all dependencies.
- [ ] No environment checks are scattered through business code.
- [ ] No confidential secrets embedded in generated DI.

## Names

- [ ] Named instances are genuinely required.
- [ ] Name constants prevent string drift.
- [ ] Same type could not be modeled more clearly with distinct abstractions.

## Scopes

- [ ] Scope push/pop owner is clear.
- [ ] Session scope is popped on logout.
- [ ] Nested scopes do not leak after account change.
- [ ] Shadowed registrations behave intentionally.

## Testability

- [ ] Core class can be constructed directly.
- [ ] Tests do not require application-global graph unnecessarily.
- [ ] Container tests have deterministic teardown.

## Circular dependencies

- [ ] No hidden GetIt resolution is being used to break a cycle.
- [ ] Graph has no architecture cycle.

---

# Performance Checklist

- [ ] No expensive singleton created eagerly without startup need.
- [ ] Shared expensive resources are not factories accidentally.
- [ ] Transient mutable objects are not retained as singletons.
- [ ] Independent async startup operations are not artificially serialized.
- [ ] `allReady()` is not waiting on optional services unnecessarily.
- [ ] Lazy singleton first-use latency is acceptable.
- [ ] Large session caches are released when the session scope ends.
- [ ] WebSockets/subscriptions are disposed.
- [ ] Standard `get_it` resolution is not being micro-optimized without evidence.
- [ ] Runtime scanning/introspection is not on a hot path.
- [ ] Generated registration complexity reflects actual graph complexity.
- [ ] Multiple registered implementations are only enabled when needed.

---

# Testing Checklist

- [ ] Narrow unit tests use constructors first.
- [ ] Test doubles implement meaningful abstraction boundaries.
- [ ] Test GetIt state is isolated.
- [ ] Scope overrides are popped.
- [ ] Full test-owned containers are reset/closed.
- [ ] Async cleanup is awaited.
- [ ] Environment-specific graph tested where relevant.
- [ ] Named dependencies are verified.
- [ ] Async readiness has a deterministic test.
- [ ] Login/logout scope behavior is tested.
- [ ] Already-created lower-scope singleton is not mistakenly assumed to rewire after shadowing.
- [ ] Tests do not rely on execution order.
- [ ] `allowReassignment` is not masking duplicates.
- [ ] Generated config is current before CI tests.

---

# Production Readiness Checklist

## Graph

- [ ] Every dependency resolves.
- [ ] No duplicate registrations.
- [ ] No circular dependency.
- [ ] Composition root is discoverable.
- [ ] Generated config matches source.

## Lifetime

- [ ] Application dependencies are app-owned.
- [ ] Session dependencies end on logout.
- [ ] Feature dependencies end with feature.
- [ ] Route state is not retained globally.
- [ ] Disposable resources have cleanup.

## Async

- [ ] Required startup initialization is deterministic.
- [ ] `allReady` cannot hang indefinitely without diagnostics.
- [ ] Lazy async dependencies are resolved asynchronously.
- [ ] Pre-resolved dependencies are intentionally startup-blocking.

## Environment

- [ ] Development/staging/production/test selection is centralized.
- [ ] Environment-specific implementations are complete.
- [ ] Production graph contains no fake/test services.

## Testing

- [ ] Unit tests can bypass global DI.
- [ ] Container tests have clean setup/teardown.
- [ ] Session scope teardown is tested.

## Memory

- [ ] No stale user graph after logout.
- [ ] No abandoned sockets/subscriptions.
- [ ] Large caches have appropriate lifetime.
- [ ] Singleton retention is intentional.

## Maintainability

- [ ] Business classes expose dependencies.
- [ ] Named registrations are limited.
- [ ] Modules contain construction, not business logic.
- [ ] DI annotations do not dominate pure domain/data types.
- [ ] Package boundaries do not depend on hidden application-global locator state.

---

# Quick Reference

| Situation | Preferred approach |
|---|---|
| Simple pure helper | Direct construction |
| Small app graph | Constructors/manual `get_it` |
| Large repetitive graph | `get_it` + `injectable` |
| Business class needs dependency | Constructor injection |
| Per-call value needed | Method parameter |
| Runtime construction argument | `registerFactoryParam` / `@factoryParam` |
| New object per consumer | Factory |
| Route Bloc/Cubit | Factory + `BlocProvider` ownership |
| Shared stateless repository | Usually lazy singleton |
| Shared Dio client | Usually lazy singleton |
| Shared database | Singleton/async singleton based on initialization |
| Expensive optional shared service | Lazy singleton |
| Required async app service | `registerSingletonAsync` |
| Sync object depends on async service | `registerSingletonWithDependencies` |
| Async object created only on first use | `registerLazySingletonAsync` |
| Wait entire required async graph | `allReady()` |
| Wait one dependency | `isReady<T>()` |
| Manual readiness callback | Use only when Future construction cannot model readiness |
| Third-party dependency | Injectable `@module` |
| Async third-party dependency needed synchronously afterward | `@preResolve` |
| Class uses non-default constructor/static factory | `@factoryMethod` |
| Cleanup method on injectable singleton | `@disposeMethod` |
| Abstract → implementation | `Injectable(as:)` / singleton variants |
| Mutually exclusive implementation by build/runtime environment | Injectable environment |
| Two same-type clients coexist | Named registration |
| Plugin list of same interface | Multiple registrations + `getAll`, only if justified |
| Current user/session graph | `get_it` scope |
| Temporary workflow graph | Scope |
| Logout | Pop session scope + perform credential/domain cleanup |
| Resource needs deterministic close | Disposal callback / `@disposeMethod` |
| Factory-created disposable | Consumer disposes it |
| Unit test of one class | Direct constructor |
| Test production graph with one override | Scope shadowing |
| Completely isolated container test | `GetIt.asNewInstance()` |
| Test owns global graph | `await reset()` in teardown |
| Replace service by environment | Environment binding |
| Need production/test fake selection | Test environment or direct constructor |
| Dependency registration missing | Check init, annotation, environment, scope, name, generated code |
| Duplicate registration | Fix composition; do not immediately enable reassignment |
| Circular dependency | Refactor responsibilities |
| DI code changed during Flutter development | Regenerate + hot restart when graph must rebuild |
| Generated registration file | Never edit manually |
| Monorepo dependency package | Explicit package contract / injectable external module if warranted |
| Secret/config value | External secure configuration; do not embed confidential secrets in DI |
| Business service calls `GetIt.I<T>()` | Refactor to constructor injection |
| App-global state used only by one screen | Reduce lifetime to feature/route |
| Same service changes on login | Scope/shadow if lifetime semantics fit |
| Need debugging of live registrations | `isRegistered`, scope inspection, GetIt DevTools |
| Concerned about ordinary lookup speed | Do not micro-optimize; standard lookup is O(1) |
| Concerned about startup | Review eager objects and async blocking first |
| Concerned about memory | Review singleton retention and scope disposal first |

Before accepting a dependency graph, verify:

```text
Dependency is explicit
        ↓
Owner is known
        ↓
Lifetime matches owner
        ↓
Registration matches lifetime
        ↓
Async readiness is deliberate
        ↓
Disposal is deterministic
        ↓
Environment is centralized
        ↓
Tests can substitute dependencies
        ↓
Scopes cannot leak stale state
        ↓
Business code does not depend on DI tooling
```
