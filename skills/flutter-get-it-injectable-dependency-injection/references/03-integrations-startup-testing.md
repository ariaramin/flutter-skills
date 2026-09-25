# Reference: Dio, Bloc/Cubit, repositories, Flutter startup, testing/overrides, code generation, modularity, and dependency-resolution diagnosis

This file preserves the corresponding section of the user-supplied engineering guide. Use it when the active skill routes the task here.

## Contents
- Dio Integration
  - One backend
  - Multiple clients
  - Interceptor dependencies
  - Dio disposal
- Bloc/Cubit Integration
  - Default rule
  - Shared repository
  - Avoid singleton Bloc by default
  - App-wide Bloc
- Repository Integration
- Flutter Startup
  - Synchronous graph
  - Pre-resolved/critical async graph
  - Render-before-ready strategy
- Testing Strategy
  - Unit test: bypass DI first
  - Local GetIt instance
  - Official scope-based override pattern
  - Injectable test environment
- Dependency Overrides
  - Prefer scope shadowing
  - Fresh graph
  - `allowReassignment`
  - `skipDoubleRegistration`
- Code Generation Workflow
  - Annotate
  - Generate
  - Generated files
  - Regenerate after
  - CI
  - Injectable 3 migration note
- Feature Modularity and External Modules
  - Injectable micro-package support
- Error Diagnosis
  - “Type X is not registered”
  - Duplicate registration
  - Wrong environment
  - Named mismatch
  - Async dependency not ready
  - `allReady` never completes
  - Scope resolution is wrong
  - Generated config has wrong/stale graph
  - Debugging graph

# Dio Integration

Focus DI on ownership, not networking policy.

Recommended graph:

```text
EnvironmentConfig
       ↓
      Dio
       ↓
Transport Interceptors
       ↓
 API Clients
       ↓
 Repositories
       ↓
Bloc/Cubit/ViewModel
```

## One backend

Usually register one shared Dio client as a lazy singleton:

```dart
@module
abstract class NetworkModule {
  @lazySingleton
  Dio dio(
    AppConfig config,
    AuthInterceptor authInterceptor,
  ) {
    final dio = Dio(
      BaseOptions(
        baseUrl: config.apiBaseUrl,
      ),
    );

    dio.interceptors.add(
      authInterceptor,
    );

    return dio;
  }
}
```

## Multiple clients

Use separate registrations when:

- base URLs differ;
- authentication policy differs;
- TLS/adapters differ;
- client lifetime differs.

```dart
const publicDio = Named('publicDio');
const authDio = Named('authDio');

@module
abstract class NetworkModule {
  @publicDio
  @lazySingleton
  Dio createPublicDio(
    AppConfig config,
  ) {
    return Dio(
      BaseOptions(
        baseUrl: config.apiBaseUrl,
      ),
    );
  }

  @authDio
  @lazySingleton
  Dio createAuthDio(
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
```

## Interceptor dependencies

Inject what an interceptor needs:

```dart
@lazySingleton
final class AuthInterceptor extends Interceptor {
  AuthInterceptor(
    this.credentialStore,
  );

  final CredentialStore credentialStore;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token =
        await credentialStore.readAccessToken();

    if (token != null) {
      options.headers[
          Headers.authorizationHeader] =
          'Bearer $token';
    }

    handler.next(options);
  }
}
```

Do not let an interceptor resolve dependencies internally through `GetIt`.

## Dio disposal

If a dedicated Dio client's adapter/resources need lifecycle cleanup, register a disposal strategy according to the ownership boundary.

Do not close an app-level Dio from a route.

---

# Bloc/Cubit Integration

## Default rule

Feature/route Bloc/Cubit should usually be a factory.

```dart
@injectable
final class ProfileCubit extends Cubit<ProfileState> {
  ProfileCubit(
    this.repository,
  ) : super(const ProfileState());

  final UserRepository repository;
}
```

Default `@injectable` produces factory registration.

UI:

```dart
BlocProvider(
  create: (_) => getIt<ProfileCubit>(),
  child: const ProfilePage(),
);
```

This creates a new Cubit for the provider and lets `BlocProvider` own its lifecycle.

## Shared repository

Repository:

```dart
@lazySingleton
final class UserRepository {
  UserRepository(this.api);

  final UserApi api;
}
```

The Cubit gets a shared repository but remains route-local.

## Avoid singleton Bloc by default

Bad:

```dart
@singleton
final class ProductDetailsCubit
    extends Cubit<ProductDetailsState> {
  // ...
}
```

if product details belongs to one route.

Problems:

- state survives after route exit;
- stale IDs/data remain;
- subscriptions stay alive;
- simultaneous routes share one mutable state unexpectedly.

## App-wide Bloc

A singleton/app-scope Bloc may be reasonable only when state genuinely has application lifetime:

- authentication/session coordinator;
- application settings;
- global connectivity policy.

Even then, consider letting the widget tree own the Bloc while injecting its repositories.

Container lifetime and Flutter provider lifetime are separate decisions.

---

# Repository Integration

Recommended direction:

```text
UI
↓
Bloc / Cubit / ViewModel
↓
Repository
↓
Remote / Local Data Sources
↓
Dio / Database / Storage
```

Example:

```dart
abstract interface class ProfileRepository {
  Future<Profile> load();
}

@LazySingleton(as: ProfileRepository)
final class ProfileRepositoryImpl
    implements ProfileRepository {
  ProfileRepositoryImpl(
    this.remote,
    this.cache,
  );

  final ProfileRemoteDataSource remote;
  final ProfileCache cache;

  @override
  Future<Profile> load() async {
    try {
      final remoteProfile =
          await remote.load();

      await cache.save(remoteProfile);
      return remoteProfile;
    } catch (_) {
      final cached = await cache.read();
      if (cached != null) {
        return cached;
      }
      rethrow;
    }
  }
}
```

DI constructs this graph.

DI should not implement the fallback behavior.

---

# Flutter Startup

## Synchronous graph

```dart
void main() {
  WidgetsFlutterBinding.ensureInitialized();

  configureDependenciesSynchronously();

  runApp(const App());
}
```

Do not mark `main` async without a reason.

## Pre-resolved/critical async graph

```dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await configureDependencies(
    environment: AppEnvironment.production,
  );

  await getIt.allReady();

  runApp(const App());
}
```

Only call both generated initialization and `allReady` if the graph actually contains readiness registrations not already pre-resolved.

## Render-before-ready strategy

For non-critical initialization:

```dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await configureDependencies(
    environment: AppEnvironment.production,
  );

  runApp(
    const BootstrapApp(),
  );
}
```

Then an application bootstrap controller can await non-critical services while showing a loading UI.

### Startup rule

Block `runApp` only for dependencies required to construct the application safely.

Examples that may require pre-start readiness:

- encryption key needed before database open;
- configuration that determines the entire backend;
- database migration that all screens require.

Examples often suitable after `runApp`:

- analytics warm-up;
- optional cache warming;
- remote recommendations;
- secondary SDK initialization.

---

# Testing Strategy

## Unit test: bypass DI first

Preferred:

```dart
void main() {
  test(
    'UserRepository returns mapped user',
    () async {
      final api = FakeUserApi();
      final repository =
          UserRepositoryImpl(api);

      final user =
          await repository.load('42');

      expect(user.id, '42');
    },
  );
}
```

A unit test for one business class usually does not need `GetIt`.

This is one of the strongest benefits of constructor injection.

## Local GetIt instance

When testing registration behavior:

```dart
void main() {
  late GetIt testGetIt;

  setUp(() {
    testGetIt =
        GetIt.asNewInstance();
  });

  tearDown(() async {
    await testGetIt.reset();
  });

  test(
    'resolves repository graph',
    () {
      testGetIt.registerSingleton<UserApi>(
        FakeUserApi(),
      );

      testGetIt
          .registerLazySingleton<UserRepository>(
        () => UserRepositoryImpl(
          testGetIt<UserApi>(),
        ),
      );

      expect(
        testGetIt<UserRepository>(),
        isA<UserRepositoryImpl>(),
      );
    },
  );
}
```

`GetIt.asNewInstance()` creates a separate locator instance, useful where complete isolation is desirable. The normal application generally uses `GetIt.instance`.

## Official scope-based override pattern

Current `get_it` testing guidance recommends scopes for shadowing production registrations and popping them in teardown rather than repeatedly mutating base registrations.

```dart
setUp(() {
  getIt.pushNewScope(
    scopeName: 'testOverride',
    init: (scope) {
      scope.registerSingleton<UserApi>(
        FakeUserApi(),
      );
    },
  );
});

tearDown(() async {
  await getIt.popScope();
});
```

### Critical scope nuance

Shadowing `UserApi` does not magically reconstruct a base-scope singleton `UserRepository` that was already created with the real API.

If the dependent singleton already exists, also:

- shadow the repository;
- reset/recreate it;
- or use a fresh test graph.

Understand object construction time.

## Injectable test environment

```dart
final testGetIt =
    GetIt.asNewInstance();

await testGetIt.init(
  environment: AppEnvironment.test,
);
```

This works when the generated extension is imported and test bindings were generated.

Use environments for graph-level integration tests.

Use direct constructors for narrow unit tests.

---

# Dependency Overrides

## Prefer scope shadowing

```dart
getIt.pushNewScope(
  scopeName: 'mockPayments',
  init: (scope) {
    scope.registerSingleton<PaymentGateway>(
      FakePaymentGateway(),
    );
  },
);
```

Cleanup:

```dart
await getIt.popScope();
```

## Fresh graph

For tests that own the full graph:

```dart
final testGetIt =
    GetIt.asNewInstance();
```

This avoids cross-test contamination.

## `allowReassignment`

`get_it` exposes reassignment configuration, but do not make it the default testing mechanism.

Why:

- duplicate production registration bugs may become invisible;
- test ordering can accidentally matter;
- ownership becomes ambiguous.

## `skipDoubleRegistration`

Treat as a specialized testing convenience, not production registration policy.

---

# Code Generation Workflow

## Annotate

Example:

```dart
@lazySingleton
final class SearchRepository {
  SearchRepository(this.api);

  final SearchApi api;
}
```

## Generate

Follow the repository's established generator command.

Typical modern Build Runner workflow:

```bash
dart run build_runner build
```

Watch:

```bash
dart run build_runner watch
```

If the project already uses Flutter-specific wrappers/scripts, preserve them.

Current `injectable_generator` also has LeanBuilder integration, but do not migrate generator tooling merely to add one dependency.

## Generated files

Normally:

```text
injection.dart
injection.config.dart
```

Never hand-edit:

```text
*.config.dart
```

Change:

- annotation;
- constructor;
- module;
- root configuration;

then regenerate.

## Regenerate after

- constructor dependency changes;
- new injectable class;
- lifecycle annotation changes;
- environment changes;
- module changes;
- scope changes;
- named dependency changes;
- abstraction binding changes.

## CI

CI should fail when generated code is stale.

A robust pipeline commonly:

```bash
dart run build_runner build --delete-conflicting-outputs
dart format --output=none --set-exit-if-changed .
flutter analyze
flutter test
```

Use repository-specific commands where applicable.

## Injectable 3 migration note

`injectable_generator` 3.0 removed the old `includeMicroPackages` option. Micro-package modules must now be explicitly supplied through `externalPackageModulesBefore` / `externalPackageModulesAfter`. Null-safety configuration is also no longer optional.

Do not copy old `includeMicroPackages` configuration into current projects.

---

# Feature Modularity and External Modules

For a monorepo or feature package, prefer an explicit dependency contract.

Avoid package code that silently calls the application's global:

```dart
GetIt.I<AppSpecificService>()
```

Instead expose constructors/interfaces.

## Injectable micro-package support

`InjectableInit.microPackage`/micro-package modules can let packages contribute generated registrations. In injectable 3.x, include external package modules explicitly from the application's root configuration.

Use this when packages intentionally participate in the composition graph.

Do not turn every small package into a DI module.

---

# Error Diagnosis

## “Type X is not registered”

Check:

1. Was `configureDependencies()` called?
2. Was generated initialization awaited where required?
3. Was `X` annotated?
4. Did generation run?
5. Are you registering `Implementation` but resolving `Interface`?
6. Is `as:` missing?
7. Is the registration environment active?
8. Is the registration in a scope not yet pushed?
9. Was its scope popped?
10. Does the registration have an `instanceName`?
11. Is the consumer requesting the same name?
12. Is generated code stale?

Inspect:

```dart
getIt.isRegistered<MyService>();
```

## Duplicate registration

Check:

- initialization called twice;
- registration inside widget lifecycle;
- manual + generated registration both exist;
- two environment annotations overlap;
- same named registration appears twice;
- hot-reload path executed registration code again.

Do not solve a genuine duplicate by immediately enabling reassignment.

## Wrong environment

Inspect bootstrap:

```dart
await configureDependencies(
  environment: AppEnvironment.staging,
);
```

Then inspect annotations on both the implementation **and its dependencies**.

An environment-specific class can depend only on registrations available in the active environment.

## Named mismatch

Producer:

```dart
@Named('primaryApi')
```

Consumer:

```dart
@Named('primaryAPI')
```

These are different keys.

Prefer constants:

```dart
const primaryApi =
    Named('primaryApi');
```

## Async dependency not ready

Check:

- async factory vs pre-resolved dependency;
- `get<T>()` vs `getAsync<T>()`;
- `allReady()`;
- `dependsOn`;
- missing manual `signalReady`;
- `@PostConstruct(preResolve: true)` expectation;
- generated init not awaited.

## `allReady` never completes

Check every registration with:

- `signalsReady: true`;
- async creation that never completes;
- dependency cycle;
- startup operation awaiting itself indirectly.

Prefer async creation Futures over manual signaling where possible.

## Scope resolution is wrong

Inspect:

```dart
getIt.currentScopeName
```

Then verify:

- scope is active;
- type/name is registered in expected scope;
- a higher scope is shadowing it;
- logout popped all nested session scopes;
- test cleanup popped override scope.

## Generated config has wrong/stale graph

Run generator again.

If the generator cache is corrupted/stale according to the repository workflow, clean/rebuild generated output rather than editing `.config.dart`.

## Debugging graph

Current `get_it` supports DevTools registration inspection when debug events are enabled. Use it during diagnosis, not as runtime business logic.

---

