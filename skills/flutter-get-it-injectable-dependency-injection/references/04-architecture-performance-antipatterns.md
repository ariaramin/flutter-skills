# Reference: Circular dependencies, performance, memory/lifecycle, project structure, and common anti-patterns

This file preserves the corresponding section of the user-supplied engineering guide. Use it when the active skill routes the task here.

## Contents
- Circular Dependency Prevention
  - Bad graph
  - Refactor by finding ownership
  - Example
- Performance Guidance
  - Lookup
  - `findAll`
  - Eager construction
  - Lazy singleton tradeoff
  - Factory tradeoff
  - Async initialization
  - Scopes
  - Generated registration
- Memory and Lifecycle Guidance
  - Singleton retains references
  - Long-lived subscriptions
  - Sockets
  - Bloc/Cubit
  - Weak cached factories
  - Hot reload
- Project Structure
  - Organization rules
- Common Anti-Patterns
  - 1. Calling `GetIt.I<T>()` throughout business logic
  - 2. Service locator inside entity/model
  - 3. Repository resolves dependencies internally
  - 4. Everything is a singleton
  - 5. Every Bloc/Cubit is singleton
  - 6. Eager expensive service with no startup need
  - 7. Factory for a shared connection resource
  - 8. Disposable singleton with no cleanup
  - 9. Session objects remain after logout
  - 10. Giant DI registration file
  - 11. Excessive names
  - 12. Circular dependency hidden with locator
  - 13. Dependency internally resolving another dependency
  - 14. Environment checks scattered across classes
  - 15. Editing generated config
  - 16. Stale generated registrations
  - 17. Mutable global test registration
  - 18. Forgetting test cleanup
  - 19. Mixing app and session lifetimes
  - 20. Business logic inside module
  - 21. Annotating every class
  - 22. Hiding architecture behind generated DI
  - 23. Registration from widget `build`
  - 24. Factory parameter used as global state
  - 25. `allReady` as a universal startup hammer
  - 26. Manual readiness when Future creation is enough
  - 27. Lazy async dependency resolved synchronously
  - 28. Scope used as a dumping ground

# Circular Dependency Prevention

## Bad graph

```text
AuthRepository
    ↓
SessionManager
    ↓
AuthRepository
```

Do not “solve” this with hidden locator resolution:

```dart
final class SessionManager {
  AuthRepository get auth =>
      GetIt.I<AuthRepository>();
}
```

The cycle still exists. It is merely hidden.

## Refactor by finding ownership

Possible:

```text
CredentialStore
      ↑       ↑
      │       │
AuthRepository  SessionManager
```

or:

```text
AuthRepository
      ↓
SessionCoordinator
      ↑
Application flow
```

## Example

Bad:

```dart
final class AuthRepository {
  AuthRepository(this.sessionManager);

  final SessionManager sessionManager;
}

final class SessionManager {
  SessionManager(this.authRepository);

  final AuthRepository authRepository;
}
```

Better:

```dart
abstract interface class CredentialStore {
  Future<void> clear();
}

final class AuthRepository {
  AuthRepository(
    this.api,
    this.credentials,
  );

  final AuthApi api;
  final CredentialStore credentials;

  Future<void> revoke() async {
    await api.revoke();
    await credentials.clear();
  }
}

final class SessionManager {
  SessionManager(
    this.credentials,
  );

  final CredentialStore credentials;

  Future<void> invalidate() {
    return credentials.clear();
  }
}
```

First-party `get_it` guidance treats circular dependencies as a design smell and recommends rethinking the responsibility graph rather than passing the locator around to bypass the cycle.

---

# Performance Guidance

## Lookup

Standard type/name lookup is O(1). Do not undertake architectural contortions to remove ordinary locator lookup solely for micro-performance.

Constructor injection is preferred for architecture/testability, not because one `getIt<T>()` call is inherently slow.

## `findAll`

Runtime scanning/introspection-style resolution is different from normal map lookup and should not be placed on hot rendering/event paths when avoidable.

## Eager construction

Potential cost:

```text
registerSingleton(
  ExpensiveThing(),
)
```

Construction happens before registration completes.

Use eager creation when startup needs it.

Otherwise prefer:

```text
registerLazySingleton(
  ExpensiveThing.new,
)
```

## Lazy singleton tradeoff

Benefit:

- lower initial startup work.

Cost:

- first-use latency;
- object remains strongly retained after creation unless reset/scope ends.

## Factory tradeoff

Benefit:

- no long-lived retained object;
- isolated mutable state.

Cost:

- repeated allocations/construction.

Choose according to semantics before allocation cost.

## Async initialization

Parallelize independent initialization naturally.

Do not introduce artificial `dependsOn` chains:

```text
A → B → C → D
```

when A, B, C, and D are independent.

Dependencies should express correctness, not force sequential startup.

## Scopes

Scopes help release:

- user caches;
- subscriptions;
- sockets;
- feature controllers;

at the correct boundary.

Their largest performance benefit is often memory/lifecycle correctness rather than resolution speed.

## Generated registration

`injectable` generated registration avoids reflection and manually repetitive graph wiring.

Do not expect code generation to fix expensive constructors.

---

# Memory and Lifecycle Guidance

Incorrect lifetime is a major source of DI-related memory retention.

## Singleton retains references

```text
Singleton
↓
Repository
↓
Cache
↓
Large user dataset
```

As long as the singleton is alive, the graph remains reachable.

Do not make user-specific repositories app-global if they should disappear on logout.

## Long-lived subscriptions

A singleton containing:

```dart
stream.listen(...)
```

can retain:

- stream;
- callbacks;
- caches;
- indirectly referenced feature state.

Give it deterministic cleanup.

## Sockets

Scope/own sockets explicitly.

Do not rely on garbage collection to close them.

## Bloc/Cubit

A singleton Bloc may retain:

- current route state;
- repository subscriptions;
- timers;
- streams.

Prefer route/provider ownership unless state is truly global.

## Weak cached factories

Do not use GC-driven cached factories for resources requiring explicit cleanup.

## Hot reload

**General Flutter behavior:** hot reload preserves Dart runtime state, so existing `GetIt` registrations/instances normally remain alive. Registration/configuration changes may therefore not reconstruct the graph.

After changing:

- DI annotations;
- generated configuration;
- constructor graph;
- lifecycle;

regenerate code and use a hot restart when the running container must be reconstructed.

Hot restart reruns bootstrap and recreates the application graph.

Do not put registration into widget methods to try to “make hot reload work.”

---

# Project Structure

A scalable option:

```text
lib/
  app/
    app.dart
    bootstrap.dart

  core/
    config/
      app_config.dart

    di/
      injection.dart
      injection.config.dart
      modules/
        network_module.dart
        storage_module.dart
        analytics_module.dart

    network/
      auth_interceptor.dart

    storage/
      credential_store.dart

  features/
    auth/
      data/
      domain/
      presentation/

    profile/
      data/
      presentation/
```

This is a convention, not a requirement.

For a simpler application:

```text
lib/
  di/
    injection.dart
    modules.dart
  services/
  repositories/
  features/
```

is adequate.

## Organization rules

- Keep composition discoverable.
- Group third-party construction logically.
- Do not make one 2,000-line module.
- Do not create one module file per trivial dependency.
- Prefer feature/package boundaries that reflect actual ownership.

---

# Common Anti-Patterns

## 1. Calling `GetIt.I<T>()` throughout business logic

**Bad**

```dart
final class CheckoutService {
  final PaymentGateway gateway =
      GetIt.I<PaymentGateway>();

  Future<void> checkout() {
    return gateway.charge();
  }
}
```

**Why it is problematic**

Dependency is hidden and business logic is container-coupled.

**Better**

```dart
final class CheckoutService {
  CheckoutService(this.gateway);

  final PaymentGateway gateway;

  Future<void> checkout() {
    return gateway.charge();
  }
}
```

---

## 2. Service locator inside entity/model

**Bad**

```dart
final class Order {
  Future<String> formattedPrice() {
    return GetIt.I<CurrencyService>()
        .format(total);
  }

  final num total = 0;
}
```

**Why it is problematic**

A domain value now requires global runtime infrastructure.

**Better**

Keep the model pure and format through a service outside the entity.

---

## 3. Repository resolves dependencies internally

**Bad**

```dart
final class ProductRepository {
  final ProductApi api =
      getIt<ProductApi>();
}
```

**Better**

```dart
final class ProductRepository {
  ProductRepository(this.api);

  final ProductApi api;
}
```

---

## 4. Everything is a singleton

**Bad**

```dart
getIt.registerSingleton(
  ProductDetailsController(),
);

getIt.registerSingleton(
  SearchController(),
);

getIt.registerSingleton(
  CheckoutController(),
);
```

**Why it is problematic**

Short-lived mutable state survives far beyond its owners.

**Better**

Use factories/scopes for temporary objects.

---

## 5. Every Bloc/Cubit is singleton

**Bad**

```dart
@singleton
final class ProductCubit
    extends Cubit<ProductState> {
  // ...
}
```

**Better**

```dart
@injectable
final class ProductCubit
    extends Cubit<ProductState> {
  // ...
}
```

and let `BlocProvider` own the factory instance.

---

## 6. Eager expensive service with no startup need

**Bad**

```dart
getIt.registerSingleton(
  HugeSearchIndex.loadSynchronously(),
);
```

**Better**

Use lazy/async initialization based on actual readiness requirements.

---

## 7. Factory for a shared connection resource

**Bad**

```dart
getIt.registerFactory<AppDatabase>(
  AppDatabase.open,
);
```

**Why it is problematic**

Every resolution creates another database resource.

**Better**

Use singleton/lazy/async singleton when one shared database is the intended architecture.

---

## 8. Disposable singleton with no cleanup

**Bad**

```dart
getIt.registerLazySingleton<WebSocketClient>(
  WebSocketClient.new,
);
```

when the socket needs explicit close.

**Better**

```dart
getIt.registerLazySingleton<WebSocketClient>(
  WebSocketClient.new,
  dispose: (socket) => socket.close(),
);
```

---

## 9. Session objects remain after logout

**Bad**

```text
App-global:
UserCache
AuthenticatedSocket
CurrentUserRepository
```

**Better**

Place user-specific services in session scope and pop it on logout.

---

## 10. Giant DI registration file

**Bad**

```text
configureEverything() {
  // 800 registrations
}
```

**Better**

Keep one composition root that delegates to coherent module/feature registration functions or generated modules.

---

## 11. Excessive names

**Bad**

```text
"repo1"
"repo2"
"repo3"
"newApi"
"oldApi"
```

**Why it is problematic**

Type information loses meaning and runtime string keys spread.

**Better**

Use distinct abstractions or environment bindings where possible; centralize names when coexistence is real.

---

## 12. Circular dependency hidden with locator

**Bad**

```dart
class A {
  B get b => getIt<B>();
}

class B {
  A get a => getIt<A>();
}
```

**Better**

Redesign responsibility boundaries.

---

## 13. Dependency internally resolving another dependency

**Bad**

```dart
final class UserApi {
  UserApi();

  Dio get dio => getIt<Dio>();
}
```

**Better**

```dart
final class UserApi {
  UserApi(this.dio);

  final Dio dio;
}
```

---

## 14. Environment checks scattered across classes

**Bad**

```dart
if (environment == 'prod') {
  return RealService();
}

return FakeService();
```

in multiple repositories.

**Better**

Bind implementations once during composition.

---

## 15. Editing generated config

**Bad**

```text
Edit injection.config.dart to add one registration.
```

**Why it is problematic**

Next generator run overwrites the change.

**Better**

Change source annotations/modules and regenerate.

---

## 16. Stale generated registrations

**Bad**

Constructor changes:

```dart
Foo(A a, B b)
```

but generated code still constructs:

```dart
Foo(getIt<A>())
```

**Better**

Regenerate after graph changes and enforce freshness in CI.

---

## 17. Mutable global test registration

**Bad**

```dart
getIt.allowReassignment = true;
// Every test replaces random registrations.
```

**Why it is problematic**

Tests can influence later tests.

**Better**

Use direct constructors, a fresh `GetIt`, or test scopes with deterministic teardown.

---

## 18. Forgetting test cleanup

**Bad**

```dart
setUp(() {
  getIt.registerSingleton<Api>(
    FakeApi(),
  );
});
```

with no teardown.

**Better**

```dart
tearDown(() async {
  await getIt.reset();
});
```

when the test owns the graph, or pop its override scope.

---

## 19. Mixing app and session lifetimes

**Bad**

```dart
@singleton
final class CurrentUserCache {
  // ...
}
```

survives logout.

**Better**

Session-scope it.

---

## 20. Business logic inside module

**Bad**

```dart
@module
abstract class AppModule {
  UserRepository repository(
    Api api,
  ) {
    if (someBusinessCondition) {
      // Domain workflow.
    }

    return UserRepository(api);
  }
}
```

**Better**

Module constructs objects; repository owns business/data logic.

---

## 21. Annotating every class

**Bad**

Annotating:

- value objects;
- DTOs;
- entities;
- small pure helpers;

without any container need.

**Better**

Only register classes whose construction/lifetime belongs to the application object graph.

---

## 22. Hiding architecture behind generated DI

**Bad**

```text
“Generator resolves it, therefore the dependency direction is okay.”
```

**Better**

Review generated graph conceptually:

```text
Presentation
→ application/domain
→ repositories
→ infrastructure
```

No generator can make a dependency cycle or inappropriate lifetime clean.

---

## 23. Registration from widget `build`

**Bad**

```dart
Widget build(BuildContext context) {
  getIt.registerLazySingleton<Service>(
    Service.new,
  );

  return const View();
}
```

**Why it is problematic**

Build can execute repeatedly and development reload behavior can lead to duplicate registration.

**Better**

Register in bootstrap/scope initialization.

---

## 24. Factory parameter used as global state

**Bad**

```dart
getIt.registerSingleton<String>(
  currentUserId,
  instanceName: 'currentUserId',
);
```

for every changing workflow value.

**Better**

Pass runtime IDs through factory params/constructors or put coherent session identity in a session scope.

---

## 25. `allReady` as a universal startup hammer

**Bad**

```dart
await getIt.allReady();
```

before `runApp` even though optional analytics/cache services take seconds.

**Better**

Block only on dependencies required before UI startup.

---

## 26. Manual readiness when Future creation is enough

**Bad**

A singleton sets `signalsReady: true`, then some unrelated callback must remember to call `signalReady`.

**Better**

Represent initialization with `registerSingletonAsync` whenever practical.

---

## 27. Lazy async dependency resolved synchronously

**Bad**

```dart
final database =
    getIt<AppDatabase>();
```

when registered async.

**Better**

```dart
final database =
    await getIt.getAsync<AppDatabase>();
```

or pre-resolve during startup.

---

## 28. Scope used as a dumping ground

**Bad**

```text
session scope contains:
Logger
Crash reporter
Global app config
Theme constants
User repository
Socket
```

**Better**

Scope only objects whose lifetime truly matches the session.

---

