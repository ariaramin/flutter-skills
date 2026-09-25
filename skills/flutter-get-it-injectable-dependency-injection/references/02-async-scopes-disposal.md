# Reference: Async construction/readiness, injectable async registration, scopes, authenticated-session lifetime, and deterministic disposal

This file preserves the corresponding section of the user-supplied engineering guide. Use it when the active skill routes the task here.

## Contents
- Async Dependencies
  - 1. Construction
  - 2. Initialization
  - 3. Readiness
  - `registerSingletonAsync`
  - Dependency ordering
  - Synchronous singleton depending on async readiness
  - `allReady`
  - `isReady`
  - Lazy async singleton
  - Manual readiness signaling
- Async Dependencies with injectable
  - Async factory
  - Pre-resolution
  - When not to pre-resolve
- Scopes
  - Push scope
  - Pop scope
  - Final scope
  - Shadowing
  - Scopes over manual unregister/re-register
- Injectable Scopes
- Authentication Session Scope
  - Manual example
  - Put inside session scope
  - Keep outside session scope
  - Security implication
- Resource Disposal
  - Manual singleton disposal
  - `Disposable`
  - Injectable `@disposeMethod`
  - Important factory rule
  - Unregister
  - Reset
  - Lazy-singleton reset

# Async Dependencies

Distinguish three concepts.

## 1. Construction

Does obtaining the object require `await`?

Example:

```dart
Future<AppDatabase> openDatabase();
```

## 2. Initialization

Can the object be constructed synchronously but require startup work afterward?

```dart
final service = SyncService();
await service.initialize();
```

## 3. Readiness

May other objects resolve before initialization is complete?

Do not conflate these.

---

## `registerSingletonAsync`

Use when a shared dependency must be initialized asynchronously.

```dart
getIt.registerSingletonAsync<AppDatabase>(
  () async {
    final database = AppDatabase();
    await database.open();
    return database;
  },
  dispose: (database) => database.close(),
);
```

`registerSingletonAsync` participates in readiness. Dependencies can be ordered using `dependsOn`; the async factory is considered ready when its Future completes unless manual readiness signaling is explicitly configured.

## Dependency ordering

```dart
getIt.registerSingletonAsync<AppConfigService>(
  () async {
    final service = AppConfigService();
    await service.load();
    return service;
  },
);

getIt.registerSingletonAsync<ApiBootstrap>(
  () async {
    return ApiBootstrap(
      getIt<AppConfigService>(),
    );
  },
  dependsOn: [
    AppConfigService,
  ],
);
```

Prefer `dependsOn` when the dependency graph itself defines the ordering.

Do not manually scatter:

```dart
await getIt.isReady<A>();
await getIt.isReady<B>();
```

through initialization code if registration dependencies can express it.

## Synchronous singleton depending on async readiness

Use `registerSingletonWithDependencies` when construction itself is synchronous but must not happen until async dependencies are ready.

```dart
getIt.registerSingletonAsync<AppConfigService>(
  () async {
    final service = AppConfigService();
    await service.load();
    return service;
  },
);

getIt.registerSingletonWithDependencies<ApiClient>(
  () => ApiClient(
    getIt<AppConfigService>(),
  ),
  dependsOn: [
    AppConfigService,
  ],
);
```

## `allReady`

```dart
await getIt.allReady(
  timeout: const Duration(seconds: 15),
);
```

Current `get_it` `allReady()` waits for registered async/signal-ready singletons. Since 9.2.0 it caches its Future and invalidates that cache when new async singletons are registered, including registrations added later by scopes.

Use a timeout when failure to initialize should produce a controlled startup failure rather than an indefinite splash screen.

## `isReady`

Wait for one registration:

```dart
await getIt.isReady<AppDatabase>();
```

Use when only one dependency is required and blocking on the entire application graph would be unnecessary.

## Lazy async singleton

```dart
getIt.registerLazySingletonAsync<LargeOfflineIndex>(
  () async {
    final index = LargeOfflineIndex();
    await index.load();
    return index;
  },
);
```

Resolve:

```dart
final index =
    await getIt.getAsync<LargeOfflineIndex>();
```

Important: an async lazy singleton does not automatically become part of ordinary startup `allReady()` simply because it is registered; it begins when explicitly requested through async resolution/readiness. Treat it as an on-demand dependency.

Use it rarely.

## Manual readiness signaling

Use `signalsReady` only when an object genuinely controls a readiness event that cannot be represented by its async construction Future.

Prefer:

```dart
registerSingletonAsync(...)
```

over manual `signalReady` for ordinary async initialization.

Manual readiness increases the risk of startup deadlocks.

---

# Async Dependencies with injectable

## Async factory

```dart
@lazySingleton
final class AppDatabase {
  AppDatabase._();

  @factoryMethod
  static Future<AppDatabase> open() async {
    final database = AppDatabase._();
    await database.initialize();
    return database;
  }

  Future<void> initialize() async {}

  Future<void> close() async {}
}
```

The generator detects the Future-returning factory and produces an async registration.

## Pre-resolution

Use when startup must await a dependency and later consumers should resolve it normally.

```dart
@module
abstract class PreferencesModule {
  @preResolve
  @singleton
  Future<SharedPreferences> get preferences {
    return SharedPreferences.getInstance();
  }
}
```

Then bootstrap must await generated initialization:

```dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await configureDependencies(
    environment: AppEnvironment.production,
  );

  runApp(const App());
}
```

## When not to pre-resolve

Do not block `runApp` for:

- optional analytics setup;
- cache warming;
- secondary feature initialization;
- dependencies unused until much later;

unless product correctness specifically requires them first.

**Architecture recommendation:** render an application startup/loading state when non-critical dependencies can initialize after the Flutter tree starts.

---

# Scopes

`get_it` scopes create hierarchical registration lifetimes independent of the widget tree. A registration in a higher scope can shadow one with the same type/name in a lower scope; when the scope is popped, its objects are cleaned up and lower registrations become visible again.

Use scopes for:

- login/logout;
- currently selected account;
- active tenant;
- onboarding transaction;
- checkout workflow;
- temporary feature runtime.

## Push scope

```dart
getIt.pushNewScope(
  scopeName: 'checkout',
  init: (scope) {
    scope.registerSingleton<CheckoutContext>(
      CheckoutContext(),
    );

    scope.registerLazySingleton<CheckoutRepository>(
      () => CheckoutRepository(
        getIt<CartRepository>(),
        getIt<CheckoutContext>(),
      ),
    );
  },
);
```

## Pop scope

```dart
await getIt.popScope();
```

Objects requiring cleanup are disposed according to registration lifecycle.

Modern `get_it` uses deterministic reverse registration order for disposal.

## Final scope

Use `isFinal: true` when all registrations are known during scope initialization and no later code should mutate that scope.

```dart
getIt.pushNewScope(
  scopeName: 'session',
  isFinal: true,
  init: (scope) {
    scope.registerSingleton<UserSession>(
      session,
    );

    scope.registerLazySingleton<SessionRepository>(
      () => SessionRepository(
        getIt<UserSession>(),
      ),
    );
  },
);
```

This can prevent accidental late registration and some initialization races.

## Shadowing

Suppose app scope contains:

```text
AnonymousUserService
```

and session scope registers the same abstraction as:

```text
AuthenticatedUserService
```

Resolving the abstraction while the session scope is active returns the scoped registration.

After the scope is popped, the lower registration is visible again.

For objects needing explicit notification when shadowed/unshadowed, `get_it` exposes shadow-change handling APIs.

## Scopes over manual unregister/re-register

Prefer scopes when a coherent group of dependencies shares a lifetime.

This:

```text
push session
→ register session graph
→ use
→ pop session
```

is easier to reason about than independently unregistering and replacing many services.

---

# Injectable Scopes

Annotate scope-specific dependencies:

```dart
@Injectable(scope: 'session')
final class SessionRepository {
  SessionRepository(
    this.session,
    this.api,
  );

  final UserSession session;
  final UserApi api;
}
```

or:

```dart
@Scope('session')
@lazySingleton
final class SessionCache {
  SessionCache();
}
```

The generator creates scope initialization methods for dependencies assigned to that scope. Official `injectable` documentation supports both `@Scope('name')` and the `scope:` property on injectable lifecycle annotations.

Use generated scopes only when their lifecycle is still explicit in application flow.

Do not hide login/logout lifetime transitions behind incidental resolution.

---

# Authentication Session Scope

Use this architecture:

```text
Application Scope
├── EnvironmentConfig
├── Logger
├── SecureCredentialStore
├── Public Dio
├── Public API clients
└── AuthRepository
      │
      └── login succeeds
              ↓
        Session Scope
        ├── UserSession
        ├── Authenticated API client
        ├── Session repositories
        ├── Session cache
        ├── WebSocket connection
        └── user-specific services
```

Logout:

```text
pop Session Scope
↓
dispose session sockets/subscriptions/resources
↓
app-level infrastructure survives
```

## Manual example

```dart
import 'package:get_it/get_it.dart';

const sessionScopeName = 'authenticatedSession';

final class UserSession {
  const UserSession({
    required this.userId,
    required this.accessToken,
  });

  final String userId;
  final String accessToken;
}

final class SessionSocket {
  SessionSocket(this.session);

  final UserSession session;
  bool _closed = false;

  Future<void> connect() async {
    if (_closed) {
      throw StateError('Socket is closed.');
    }
  }

  Future<void> close() async {
    _closed = true;
  }
}

final class SessionProfileRepository {
  SessionProfileRepository(
    this.session,
  );

  final UserSession session;
}

Future<void> openAuthenticatedSession(
  UserSession session,
) async {
  if (getIt.hasScope(sessionScopeName)) {
    await getIt.popScopesTill(
      sessionScopeName,
      inclusive: true,
    );
  }

  getIt.pushNewScope(
    scopeName: sessionScopeName,
    isFinal: true,
    init: (scope) {
      scope.registerSingleton<UserSession>(
        session,
      );

      scope.registerLazySingleton<SessionSocket>(
        () => SessionSocket(
          getIt<UserSession>(),
        ),
        dispose: (socket) => socket.close(),
      );

      scope.registerLazySingleton<
          SessionProfileRepository>(
        () => SessionProfileRepository(
          getIt<UserSession>(),
        ),
      );
    },
  );
}

Future<void> closeAuthenticatedSession() async {
  if (!getIt.hasScope(sessionScopeName)) {
    return;
  }

  await getIt.popScopesTill(
    sessionScopeName,
    inclusive: true,
  );
}
```

## Put inside session scope

Good candidates:

- current-user repositories holding user cache;
- user-specific WebSocket;
- account-scoped database view;
- user-specific feature flags;
- access-controlled API façade;
- session context.

## Keep outside session scope

Usually:

- global logger;
- crash reporter;
- environment configuration;
- secure credential store;
- public authentication API;
- application database engine if it serves multiple sessions and manages per-user data separately.

The exact boundary depends on ownership.

## Security implication

Popping the DI scope only disposes runtime objects.

It does **not** automatically:

- erase secure-storage credentials;
- delete database user rows;
- revoke server tokens.

Session cleanup must separately execute those security operations.

---

# Resource Disposal

A registration requiring cleanup needs an explicit owner.

## Manual singleton disposal

```dart
getIt.registerLazySingleton<SocketClient>(
  SocketClient.new,
  dispose: (client) => client.close(),
);
```

## `Disposable`

Current `get_it` also recognizes objects implementing its `Disposable` contract when registrations are removed/reset/scopes are popped.

Prefer one consistent disposal strategy per project.

## Injectable `@disposeMethod`

```dart
@lazySingleton
final class RealtimeClient {
  RealtimeClient();

  bool _closed = false;

  @disposeMethod
  Future<void> dispose() async {
    _closed = true;
  }
}
```

`injectable` passes such singleton/lazy-singleton disposal callbacks into generated `get_it` registration. It also supports top-level disposal callbacks through `Singleton(dispose: ...)` and `LazySingleton(dispose: ...)`.

## Important factory rule

A factory creates a new object per resolution.

The container cannot generally know when each consumer has finished using every factory-created object.

Therefore:

```text
Factory instance
→ owned/disposed by consumer
```

Example with Bloc:

```dart
BlocProvider(
  create: (_) => getIt<ProfileCubit>(),
  child: const ProfilePage(),
);
```

`BlocProvider` owns and closes that newly created Cubit.

Do not expect `GetIt.reset()` to discover arbitrary factory results and close them.

## Unregister

Use when one registration is deliberately removed:

```dart
await getIt.unregister<LegacyService>();
```

Do not routinely unregister individual application dependencies to simulate a scope.

## Reset

Full container reset:

```dart
await getIt.reset();
```

Current `reset` supports disposal and disposes registrations in reverse registration order. Because disposal may be asynchronous, always await it when deterministic cleanup matters.

## Lazy-singleton reset

Use when the registration should remain but its current cached instance should be discarded/recreated.

Do not use this as ordinary application state mutation.

---

