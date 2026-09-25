# Reference: Composition, get_it vs injectable, registration lifetimes, constructor injection, modules, bindings, names, and environments

This file preserves the corresponding section of the user-supplied engineering guide. Use it when the active skill routes the task here.

## Contents
- Flutter Dependency Injection with get_it & injectable
  - Purpose
  - When to Use This Skill
- Core Principles
- Mental Model
  - Constructor injection
  - get_it
  - injectable
  - Runtime lookup
- get_it vs injectable
- Composition Root
  - Manual root
  - Generated root
  - Composition-root rules
- Registration Lifetimes
  - Decision table
  - Factory
  - Factory with parameters
  - Singleton
  - Lazy singleton
  - Cached factory
- Constructor Injection
  - Good
  - Bad
  - Method injection
- get_it Configuration
  - Named registration
  - Introspection
- injectable Configuration
  - Dependencies
  - Root configuration
  - Factory
  - Singleton
  - Lazy singleton
  - Cached factory
  - Factory constructor/static creation
  - Post-construction
- Injectable Modules
  - Third-party module
  - Pre-resolved third-party dependency
  - Module rules
- Abstract Types and Implementations
  - Abstract when
  - Do not create an interface automatically
- Named Dependencies
  - Injectable example
  - Good named-registration cases
  - Prefer environments instead when implementations are mutually exclusive
  - Multiple unnamed registrations
- Environment Configuration
  - Environment-specific implementation
  - Environment rules
  - Advanced filters

# Flutter Dependency Injection with get_it & injectable

## Purpose

Use this skill to design, implement, review, debug, test, refactor, and optimize dependency injection in production Flutter/Dart repositories that use `get_it`, `injectable`, or both.

Apply these instructions to make dependency ownership explicit, choose correct lifetimes, centralize application composition, manage asynchronous startup safely, isolate user/session state, dispose resources deterministically, integrate infrastructure such as Dio and databases, construct Bloc/Cubit dependencies correctly, and keep tests isolated.

This skill targets the current first-party package APIs: `get_it` 9.2.1, `injectable` 3.0.0, and `injectable_generator` 3.1.1. `get_it` remains the runtime service-locator/container, while `injectable` is a generator that produces `get_it` registration code.

The scope follows the supplied production DI requirements.

### Evidence terminology

Interpret guidance using these labels:

- **get_it behavior** — documented runtime behavior of `get_it`.
- **injectable behavior** — documented annotation/generator behavior.
- **Official recommendation** — explicitly recommended by first-party documentation.
- **Architecture recommendation** — production design guidance inferred from documented behavior.
- **General DI practice** — dependency-injection principle that is not a package requirement.

When the existing repository follows a different valid convention, preserve it unless it causes correctness, lifecycle, testability, or maintainability problems.

---

## When to Use This Skill

Apply this skill when:

- adding a service, repository, API client, database, SDK, or controller;
- choosing factory vs singleton vs lazy singleton;
- deciding whether something belongs in app, session, feature, route, or request scope;
- adding `get_it`;
- adding or changing `injectable`;
- configuring generated dependency registration;
- adding third-party dependencies through modules;
- creating environment-specific implementations;
- resolving multiple implementations of one abstraction;
- managing async initialization;
- implementing login/logout dependency scopes;
- wiring Dio;
- wiring Bloc/Cubit;
- debugging missing/duplicate registrations;
- debugging `allReady` or async startup;
- debugging named-instance mismatches;
- debugging circular dependencies;
- reviewing service-locator usage;
- refactoring hidden `GetIt.I<T>()` lookups to constructor injection;
- writing tests that override production dependencies;
- diagnosing cross-test state leakage;
- improving startup time or memory retention;
- implementing deterministic resource cleanup;
- upgrading old `get_it`/`injectable` code.

Do not introduce a DI container merely because a project has more than one class. For small graphs, plain constructors can be clearer than registration machinery.

---

# Core Principles

1. **Prefer explicit constructor dependencies.**

   Use:

   ```dart
   final class UserRepository {
     UserRepository(this._api);

     final UserApi _api;
   }
   ```

   instead of:

   ```dart
   final class UserRepository {
     final UserApi _api = GetIt.I<UserApi>();
   }
   ```

2. **Keep the service locator at composition boundaries.**

   Good places for direct `getIt<T>()` access include:

   - the composition root;
   - framework glue;
   - route/widget creation boundaries;
   - generated `injectable` configuration;
   - carefully isolated legacy seams.

   Avoid direct locator access inside:

   - entities;
   - value objects;
   - repositories;
   - use cases;
   - API clients;
   - business services;
   - Bloc/Cubit implementations.

3. **Centralize composition.**

   Register application dependencies during bootstrap or explicit scope initialization, not opportunistically from widgets or business methods. First-party `get_it` guidance recommends registering before use and warns against registration from widget lifecycle/build paths, which can also cause duplicate registrations during development.

4. **Choose lifetime from ownership, not convenience.**

   Ask:

   - Who owns this object?
   - How long must it live?
   - Can it retain mutable state?
   - Does it require disposal?
   - Should multiple consumers share it?

5. **Do not make everything a singleton.**

6. **Do not register every Bloc/Cubit as a singleton.**

7. **Keep business logic independent of DI tooling where practical.**

   A repository should normally compile and work when constructed directly in a unit test without any `GetIt` involvement.

8. **Treat `injectable` as registration generation, not dependency design.**

   An annotation cannot make an incorrect lifetime or dependency direction correct.

9. **Use scopes for real lifetime boundaries.**

   Examples:

   - authenticated session;
   - active account/tenant;
   - temporary checkout workflow;
   - nested feature context.

10. **Dispose resources according to ownership.**

11. **Keep environment selection centralized.**

12. **Use named registrations only when multiple instances of the same type genuinely coexist.**

13. **Prefer lazy creation for expensive shared services that may never be needed, but do not make initialization lazy if application correctness requires it before use.**

14. **Distinguish construction from readiness.**

   An object can exist before its asynchronous initialization is complete.

15. **Do not hide circular architecture behind locator lookups.**

16. **Keep generated files reproducible.**

   Do not manually edit `*.config.dart`.

17. **Optimize architecture before lookup micro-performance.**

   Standard `get_it` lookup uses constant-time map-based lookup; startup work, retained singletons, resource lifetimes, and async initialization are usually more important performance concerns.

---

# Mental Model

Use this model:

```text
            Explicit object dependencies
                      ↑
            Constructor Injection
                      ↑
          ┌───────────┴───────────┐
          │                       │
     Manual wiring           injectable
          │                   generator
          │                       │
          └───────────┬───────────┘
                      ↓
                    get_it
                      ↓
             Runtime Object Graph
```

## Constructor injection

Defines what an object needs.

```dart
final class ProfileRepository {
  ProfileRepository(
    this._remote,
    this._cache,
  );

  final ProfileApi _remote;
  final ProfileCache _cache;
}
```

This is the architectural contract.

## get_it

`get_it` stores registrations and resolves runtime instances. It supports factories, singletons, lazy singletons, async registrations, parameters, scopes, named registrations, readiness synchronization, disposal, and inspection.

It is a service locator.

It does **not** decide where your architectural boundaries should be.

## injectable

`injectable` analyzes constructors and annotations and generates `get_it` registration calls. It supports lifecycle annotations, environments, modules, scopes, names, async factories, pre-resolution, disposal metadata, factory parameters, and abstract bindings.

It does **not** replace `get_it`; generated code configures it.

## Runtime lookup

Runtime lookup should be concentrated near composition/framework boundaries.

Do not turn:

```dart
GetIt.I<Foo>()
```

into an invisible global import mechanism used from every class.

---

# get_it vs injectable

| Situation | Preferred approach | Reason |
|---|---|---|
| Very small application | Plain constructor wiring | Lowest complexity |
| Small graph with a few shared services | Manual `get_it` | Registration remains readable |
| Large graph with many transitive dependencies | `get_it` + `injectable` | Generated registration reduces boilerplate |
| Business object under unit test | Direct constructor injection | No global state |
| Third-party dependency cannot be annotated | `@module` | `injectable` can generate provider registration |
| Need runtime lookup | `get_it` | `injectable` only generates registration |
| Need compile-time registration generation | `injectable` | Its purpose is code generation around `get_it` |
| Need session hierarchy | `get_it` scopes, optionally generated by `injectable` | Runtime lifetime feature belongs to `get_it` |
| One temporary object with trivial construction | Plain `new`/constructor | Container adds little value |
| Need different implementations by environment | `injectable` environments | Centralized generated selection |
| Need runtime value during construction | Factory parameter | Container supplies graph; caller supplies runtime data |
| Need a dependency only as a method argument | Method parameter | Do not elevate call data into container state |
| Existing project uses manual `get_it` cleanly | Keep manual configuration | Code generation is optional |
| Many packages/features independently contribute registrations | `injectable` modules/micro-package strategy or explicit composition functions | Scales registration ownership |
| Unit test needs fake repository | Direct constructor | Usually simpler than container override |

`get_it` explicitly works without code generation, while `injectable` describes itself as a convenient generator for `get_it`.

### Use `get_it` alone when

- the graph is easy to understand manually;
- dependencies are few;
- dynamic registration/scopes are central;
- generator complexity would outweigh registration boilerplate.

### Add `injectable` when

- constructor graphs are large;
- environments create significant registration variants;
- many injectable classes exist;
- modules and generated ordering reduce repetitive code;
- generated missing-dependency diagnostics improve maintainability.

### Use neither when

```dart
final api = UserApi(client);
final repository = UserRepository(api);
final service = UserService(repository);
```

is already clear enough.

---

# Composition Root

The composition root is the small part of the application responsible for constructing the object graph.

Prefer:

```text
main()
  ↓
bootstrap()
  ↓
configureDependencies()
  ↓
runApp()
```

Do not spread registration across arbitrary widgets and services.

## Manual root

```dart
import 'package:get_it/get_it.dart';

final getIt = GetIt.instance;

void configureDependencies() {
  getIt.registerLazySingleton<AppLogger>(
    AppLogger.new,
  );

  getIt.registerLazySingleton<UserRepository>(
    () => UserRepositoryImpl(
      getIt<UserApi>(),
      getIt<AppLogger>(),
    ),
  );
}
```

## Generated root

```dart
import 'package:get_it/get_it.dart';
import 'package:injectable/injectable.dart';

import 'injection.config.dart';

final getIt = GetIt.instance;

@InjectableInit(
  preferRelativeImports: true,
  throwOnMissingDependencies: true,
)
Future<GetIt> configureDependencies({
  String? environment,
}) {
  return getIt.init(
    environment: environment,
  );
}
```

Current `InjectableInit` supports configuration including initializer naming, relative imports, missing-dependency handling, environment generation, generated accessors, external modules, and multiple registrations.

## Composition-root rules

- Register once during startup.
- Initialize new scope registrations at scope boundaries.
- Keep environment selection here.
- Keep dependency overrides for tests in test composition.
- Do not register from `build`.
- Do not register from repository constructors.
- Do not pass `GetIt` itself into business classes unless implementing infrastructure whose explicit responsibility is container integration.

---

# Registration Lifetimes

## Decision table

| Registration | Creation | Reuse | Container-owned disposal | Ideal use |
|---|---|---|---|---|
| `registerFactory` | Each resolution | No | No instance-level ownership | Short-lived stateless/stateful objects |
| `registerFactoryParam` | Each resolution with caller arguments | No | No | Route/item/workflow object requiring runtime ID |
| `registerCachedFactory` | Factory + weakly cached result | Reused while reachable | GC-dependent | Specialized cache-like construction |
| `registerSingleton` | Before registration or eager registration call | Same instance | Yes, if disposal configured | Required app/session-wide instance |
| `registerLazySingleton` | First access | Same instance afterward | Yes, if disposal configured | Shared service not needed at startup |
| `registerSingletonAsync` | Async creation starts according to registration dependencies | Same instance | Yes | Shared service requiring async startup |
| `registerLazySingletonAsync` | First `getAsync`/readiness request | Same after creation | Yes | Rare expensive shared async service |
| scoped factory/singleton | According to registration inside scope | Limited by scope | Scope cleanup | Session/feature/account context |

Official `get_it` registration documentation distinguishes eager singletons, lazy singletons, factories, parameterized factories, and cached factories. Factory parameter functions support up to two runtime parameters.

## Factory

Use when each consumer needs a fresh instance.

```dart
getIt.registerFactory<ProfileController>(
  () => ProfileController(
    getIt<UserRepository>(),
  ),
);
```

Good for:

- route controllers;
- Bloc/Cubit;
- transient coordinators;
- stateful feature objects.

The consumer owns each factory-created object.

If it has `close()`/`dispose()`, the consumer that requested it must normally clean it up.

## Factory with parameters

Use when construction needs runtime information that is not itself an application service.

```dart
final class ConversationController {
  ConversationController(
    this.conversationId,
    this.repository,
  );

  final String conversationId;
  final MessagesRepository repository;
}

void registerConversationController() {
  getIt.registerFactoryParam<
      ConversationController,
      String,
      void>(
    (conversationId, _) => ConversationController(
      conversationId,
      getIt<MessagesRepository>(),
    ),
  );
}
```

Resolve:

```dart
final controller = getIt<ConversationController>(
  param1: 'conversation-42',
);
```

`get_it` parameterized factory APIs support up to two caller-provided parameters; use `void` for the unused second type when only one is required.

If you need many runtime fields, prefer one arguments object:

```dart
final class CheckoutArgs {
  const CheckoutArgs({
    required this.cartId,
    required this.promoCode,
    required this.currency,
  });

  final String cartId;
  final String? promoCode;
  final String currency;
}
```

Do not register every route ID or user input value globally.

## Singleton

Use when:

- exactly one instance for the registration lifetime is intended;
- creation must occur eagerly or an already-created instance is being registered;
- memory retention is intentional.

```dart
final database = AppDatabase();

getIt.registerSingleton<AppDatabase>(
  database,
  dispose: (database) => database.close(),
);
```

Avoid eager singleton construction for an expensive dependency that may never be used.

## Lazy singleton

Often the best default for shared stateless infrastructure/repositories.

```dart
getIt.registerLazySingleton<UserRepository>(
  () => UserRepositoryImpl(
    getIt<UserApi>(),
  ),
);
```

Use for:

- repositories shared across features;
- shared API clients;
- analytics;
- logging;
- stateless application services.

Do not use a lazy singleton merely because it is easy. If it contains route-specific mutable state, it probably has the wrong lifetime.

## Cached factory

Current `get_it` supports cached factories using weak references. The object may be reused while still strongly reachable and recreated after garbage collection.

**Architecture recommendation:** use this only when GC-driven reuse semantics are actually appropriate.

Do not use weak caching for:

- sockets;
- transactions;
- controllers that require deterministic `dispose`;
- resources whose lifetime must be explicit.

Garbage collection is not a lifecycle protocol.

---

# Constructor Injection

Make constructor injection the default for application code.

## Good

```dart
abstract interface class UserApi {
  Future<UserDto> load(String id);
}

final class UserRepository {
  UserRepository(
    this._api,
    this._cache,
  );

  final UserApi _api;
  final UserCache _cache;

  Future<User> load(String id) async {
    final dto = await _api.load(id);
    final user = dto.toDomain();
    await _cache.save(user);
    return user;
  }
}
```

Dependencies are visible from the constructor.

## Bad

```dart
final class UserRepository {
  UserRepository();

  final UserApi _api = GetIt.I<UserApi>();
  final UserCache _cache = GetIt.I<UserCache>();
}
```

### Why hidden lookup is worse

It:

- hides dependencies from the type's API;
- couples business code to `get_it`;
- makes direct unit construction harder;
- makes circular dependencies easier to conceal;
- lets dependencies change without constructor review;
- encourages ambient global state.

## Method injection

Use method parameters for call-specific data:

```dart
Future<void> send(
  Message message, {
  required CancellationSignal cancellation,
}) {
  // ...
}
```

Do not register a message or cancellation signal globally merely to avoid passing it.

---

# get_it Configuration

A clean manual configuration can look like:

```dart
import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';

final getIt = GetIt.instance;

final class AppConfig {
  const AppConfig({
    required this.apiBaseUrl,
  });

  final String apiBaseUrl;
}

final class UserApi {
  UserApi(this.dio);

  final Dio dio;
}

abstract interface class UserRepository {
  Future<void> refresh();
}

final class UserRepositoryImpl implements UserRepository {
  UserRepositoryImpl(this.api);

  final UserApi api;

  @override
  Future<void> refresh() async {
    await api.dio.get<void>('/users/me');
  }
}

final class ProfileController {
  ProfileController(this.repository);

  final UserRepository repository;

  Future<void> refresh() => repository.refresh();
}

void configureAppDependencies(AppConfig config) {
  getIt.registerSingleton<AppConfig>(config);

  getIt.registerLazySingleton<Dio>(
    () => Dio(
      BaseOptions(
        baseUrl: getIt<AppConfig>().apiBaseUrl,
      ),
    ),
    dispose: (dio) => dio.close(force: true),
  );

  getIt.registerLazySingleton<UserApi>(
    () => UserApi(
      getIt<Dio>(),
    ),
  );

  getIt.registerLazySingleton<UserRepository>(
    () => UserRepositoryImpl(
      getIt<UserApi>(),
    ),
  );

  getIt.registerFactory<ProfileController>(
    () => ProfileController(
      getIt<UserRepository>(),
    ),
  );
}
```

## Named registration

```dart
getIt.registerLazySingleton<Dio>(
  createPublicDio,
  instanceName: 'publicApi',
);

getIt.registerLazySingleton<Dio>(
  createAuthenticatedDio,
  instanceName: 'authenticatedApi',
);
```

Resolve:

```dart
final dio = getIt<Dio>(
  instanceName: 'authenticatedApi',
);
```

Prefer named instances only when both objects must coexist.

## Introspection

Use current diagnostics when debugging:

```dart
final registered =
    getIt.isRegistered<UserRepository>();

final currentScope =
    getIt.currentScopeName;
```

`get_it` 9.1 added a DevTools extension that can display registrations, scope, registration mode, and state when `debugEventsEnabled` is enabled.

Development-only setup:

```dart
assert(() {
  getIt.debugEventsEnabled = true;
  return true;
}());
```

Do not rely on debugging introspection as normal application logic.

---

# injectable Configuration

## Dependencies

Typical package setup:

```yaml
dependencies:
  get_it:
  injectable:

dev_dependencies:
  build_runner:
  injectable_generator:
```

Pin versions according to the repository's package policy.

Current `injectable_generator` 3.1.x requires Dart 3.12, while earlier current 3.0.x releases supported Dart 3.8; verify the repository SDK constraint before upgrading generator versions.

## Root configuration

```dart
import 'package:get_it/get_it.dart';
import 'package:injectable/injectable.dart';

import 'injection.config.dart';

final getIt = GetIt.instance;

@InjectableInit(
  preferRelativeImports: true,
  throwOnMissingDependencies: true,
)
Future<GetIt> configureDependencies({
  String? environment,
}) {
  return getIt.init(
    environment: environment,
  );
}
```

The generated extension initializes registrations and returns the configured `GetIt` instance; async/pre-resolved dependencies can make initialization asynchronous.

## Factory

Default `@injectable` generates factory-style registration.

```dart
@injectable
final class ProfileController {
  ProfileController(this.repository);

  final UserRepository repository;
}
```

## Singleton

```dart
@singleton
final class AnalyticsService {
  AnalyticsService();
}
```

Use only for intentional eager shared lifetime.

## Lazy singleton

```dart
@lazySingleton
final class UserRepository {
  UserRepository(this.api);

  final UserApi api;
}
```

## Cached factory

Current `Injectable` supports `cache: true` for generated cached factory registrations.

```dart
@Injectable(cache: true)
final class ExpensiveFormatter {
  ExpensiveFormatter();
}
```

Use sparingly for objects where weak cache semantics make sense.

## Factory constructor/static creation

Use `@factoryMethod` when the default constructor is not the creation path.

```dart
@injectable
final class ClientIdentity {
  ClientIdentity._(this.value);

  final String value;

  @factoryMethod
  static ClientIdentity create() {
    return ClientIdentity._('mobile');
  }
}
```

For async creation:

```dart
@lazySingleton
final class LocalDatabase {
  LocalDatabase._();

  @factoryMethod
  static Future<LocalDatabase> open() async {
    final database = LocalDatabase._();
    await database.initialize();
    return database;
  }

  Future<void> initialize() async {}

  Future<void> close() async {}
}
```

`injectable` recognizes a `Future<T>` factory method and generates an async `get_it` registration.

## Post-construction

Use `@PostConstruct` only when construction and initialization cannot reasonably be represented by the constructor/factory.

```dart
@lazySingleton
final class SearchIndex {
  SearchIndex();

  bool _initialized = false;

  @PostConstruct()
  Future<void> initialize() async {
    _initialized = true;
  }

  bool get initialized => _initialized;
}
```

If initialization must complete before registration becomes synchronously usable, consider `preResolve: true`. Do not add post-construction hooks merely to hide complicated initialization.

---

# Injectable Modules

Use `@module` for objects you do not own or whose construction needs custom logic.

Official module behavior treats unannotated accessors as factories unless a singleton lifecycle annotation is added.

## Third-party module

```dart
import 'package:dio/dio.dart';
import 'package:injectable/injectable.dart';

@module
abstract class NetworkModule {
  @lazySingleton
  Dio dio(AppConfig config) {
    return Dio(
      BaseOptions(
        baseUrl: config.apiBaseUrl,
      ),
    );
  }
}
```

## Pre-resolved third-party dependency

```dart
import 'package:injectable/injectable.dart';
import 'package:shared_preferences/shared_preferences.dart';

@module
abstract class StorageModule {
  @preResolve
  @singleton
  Future<SharedPreferences> get preferences {
    return SharedPreferences.getInstance();
  }
}
```

`@preResolve` causes the future to be awaited during generated initialization so the resolved object is registered afterward. This makes generated initialization asynchronous and must be awaited where readiness is required.

## Module rules

Use modules for:

- Dio;
- SharedPreferences;
- database constructors;
- platform SDKs;
- analytics SDKs;
- external clients.

Do not put:

- business decisions;
- repository algorithms;
- feature workflows;
- navigation;

inside a module.

A module is object-construction configuration.

---

# Abstract Types and Implementations

Bind an abstraction when the abstraction has architectural value.

```dart
abstract interface class AnalyticsService {
  Future<void> track(String event);
}

@LazySingleton(as: AnalyticsService)
final class FirebaseAnalyticsService
    implements AnalyticsService {
  FirebaseAnalyticsService();

  @override
  Future<void> track(String event) async {
    // Forward to SDK.
  }
}
```

`Injectable(as: ...)`, `Singleton(as: ...)`, and `LazySingleton(as: ...)` are current supported binding patterns.

## Abstract when

- multiple implementations exist;
- infrastructure should be replaceable;
- package boundaries need a stable contract;
- test fakes benefit from a contract;
- domain code should not know the concrete SDK.

## Do not create an interface automatically

This adds little value:

```dart
abstract interface class UserNameFormatter {
  String format(String value);
}

final class UserNameFormatterImpl
    implements UserNameFormatter {
  @override
  String format(String value) => value.trim();
}
```

when there will only ever be one tiny pure implementation.

Use abstraction to create a meaningful boundary, not file-count inflation.

---

# Named Dependencies

Use names when two or more registrations of the same type intentionally coexist.

## Injectable example

```dart
const publicApi = Named('publicApi');
const authenticatedApi = Named('authenticatedApi');

@module
abstract class NetworkModule {
  @publicApi
  @lazySingleton
  Dio publicDio(AppConfig config) {
    return Dio(
      BaseOptions(
        baseUrl: config.apiBaseUrl,
      ),
    );
  }

  @authenticatedApi
  @lazySingleton
  Dio authenticatedDio(
    AppConfig config,
    AuthInterceptor interceptor,
  ) {
    final dio = Dio(
      BaseOptions(
        baseUrl: config.apiBaseUrl,
      ),
    );

    dio.interceptors.add(interceptor);
    return dio;
  }
}

@lazySingleton
final class ProfileApi {
  ProfileApi(
    @authenticatedApi this.dio,
  );

  final Dio dio;
}
```

Current `injectable` supports `@Named('name')`, shorthand named annotations, and named constructor dependency selection.

## Good named-registration cases

- public Dio vs authenticated Dio;
- backend A vs backend B;
- primary database vs analytics database;
- two implementations consumed simultaneously.

## Prefer environments instead when implementations are mutually exclusive

If development should use FakeAnalytics and production FirebaseAnalytics, an environment binding is clearer than resolving `"devAnalytics"` manually.

## Multiple unnamed registrations

Current `get_it` supports registering multiple implementations of one type after explicitly enabling that mode and retrieving them with `getAll<T>()`. `injectable` 3.0 added `allowMultipleRegistrations` to generate that enablement.

Use this for plugin/list extension points:

```text
List<PaymentValidator>
List<AppStartupHook>
List<AnalyticsSink>
```

Do not enable multiple registration to paper over ordinary dependency ambiguity.

---

# Environment Configuration

Centralize environment selection.

```dart
abstract final class AppEnvironment {
  static const development = 'dev';
  static const staging = 'staging';
  static const production = 'prod';
  static const test = 'test';
}

const development =
    Environment(AppEnvironment.development);

const staging =
    Environment(AppEnvironment.staging);

const production =
    Environment(AppEnvironment.production);

const testing =
    Environment(AppEnvironment.test);
```

## Environment-specific implementation

```dart
abstract interface class PaymentGateway {
  Future<void> charge();
}

@testing
@LazySingleton(as: PaymentGateway)
final class FakePaymentGateway
    implements PaymentGateway {
  @override
  Future<void> charge() async {}
}

@production
@LazySingleton(as: PaymentGateway)
final class ProductionPaymentGateway
    implements PaymentGateway {
  ProductionPaymentGateway(this.api);

  final PaymentApi api;

  @override
  Future<void> charge() {
    return api.charge();
  }
}
```

Configure:

```dart
await configureDependencies(
  environment: AppEnvironment.production,
);
```

`injectable` supports environment annotations, environment lists, and configurable `EnvironmentFilter` implementations.

## Environment rules

- Keep environment selection in bootstrap.
- Prefer environment-specific binding over scattered:

  ```dart
  if (isProd) {
    ...
  } else {
    ...
  }
  ```

- Do not put secrets in generated registration configuration.
- Base URLs may be configuration; confidential backend secrets must not be embedded in a Flutter client.
- Tests may use a generated test environment, but direct constructor tests usually do not need generated DI.

## Advanced filters

Current `injectable` exposes environment filters including:

- `SimpleEnvironmentFilter`;
- `NoEnvOrContains`;
- `NoEnvOrContainsAll`;
- `NoEnvOrContainsAny`.

Use custom filters only when environment-selection semantics truly require them.

---

