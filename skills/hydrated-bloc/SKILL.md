---
name: hydrated-bloc
description: Use when adding, reviewing, debugging, migrating, testing, or optimizing hydrated_bloc / HydratedCubit / HydratedBloc persistence in Flutter or Dart apps—especially initialization, storagePrefix/id, toJson/fromJson, schema evolution, logout/clear, encryption, web vs IO storage directories, or corrupted-state handling.
metadata:
  version: "1.0.0"
  source: official-hydrated_bloc-research
  analyzed_package: "hydrated_bloc 11.0.0"
---

# hydrated_bloc — Production Flutter Skill

## Purpose

Teach an AI coding agent how to use `hydrated_bloc` correctly in production Flutter apps: when to hydrate, how to initialize storage, how to serialize safely, how keys/identity work, how errors and schema changes behave, and how to test without leaking state—based on official package docs, API, source, tests, examples, and changelog (stable **11.0.0** as of research).

## Agent behavior rules (mandatory)

Before changing hydration-related code:

1. Inspect `pubspec.yaml` / lockfile for the installed `hydrated_bloc` (and `bloc`) version. Do not use APIs from a different major.
2. Inspect existing Bloc/Cubit architecture; reuse project patterns when correct.
3. Do **not** convert a normal Bloc/Cubit to hydrated without a real post-restart persistence need.
4. Identify exactly which fields must survive process death; persist only those.
5. Do not persist secrets/tokens through default storage without an explicit security design.
6. Before changing serialized shape, class names, `storagePrefix`, or `id`, consider already-installed app versions and existing persisted keys.
7. Prefer reconstructing derived values over persisting them.
8. Keep `toJson`/`fromJson` deterministic and defensive.
9. Avoid introducing a second source of truth (e.g. hydrating the same data the backend already owns).
10. Add/update tests whenever hydration, keys, schema, or clear/logout behavior changes.
11. Validate platform assumptions (especially web vs IO directory, and temporary vs durable paths).
12. Do not invent migration APIs, sync guarantees, or encryption properties the package does not provide.

## When to Use This Skill

- Persisting small durable UI/workflow state across app restarts (theme, filters, onboarding step, draft flags).
- Implementing or reviewing `HydratedCubit` / `HydratedBloc` / `HydratedMixin`.
- Fixing lost state after rename, minify/obfuscate, or web rebuild (`storagePrefix`).
- Logout / account switch / cache clear flows.
- Hydration errors, corrupted JSON, schema upgrades.
- Unit/widget tests that touch hydrated types.

## When NOT to Use It

| Need | Prefer instead |
|------|----------------|
| Auth tokens, passwords, refresh secrets | Platform secure storage / proper auth session design (default Hive box is not a vault) |
| Large datasets, queries, relations | sqlite / drift / isar / remote+cache layer |
| Authoritative server data that must stay fresh | Repository + network; hydrate only an optional stale-ok snapshot if product requires |
| High-frequency ticks (animations, sensors) | Non-hydrated Bloc/Cubit; or debounce/selectively persist |
| Transactional multi-key consistency | Real database with transactions |
| State that must never be lost to OS cache eviction | Durable directory (see Cross-Platform)—do not rely on temporary cache alone |

## Core Mental Model

`hydrated_bloc` is a **thin persistence layer on top of `bloc`**, not a database.

**What it persists:** the JSON map returned by `toJson(state)`, keyed by `storageToken` (`storagePrefix` + `id`), in a `Storage` implementation (default: Hive CE box named `hydrated_box`).

**Lifecycle (implementation-backed):**

1. App sets `HydratedBloc.storage` **before** any hydrated instance is constructed.
2. On construction, `hydrate()` **synchronously** `read`s `storageToken`.
3. If a map exists, `fromJson` builds state; on throw, falls back to `super` initial state and runs `onError` → `HydrationErrorBehavior`.
4. Unless behavior is `retain`, it **writes** the current state (restored or initial) back to storage.
5. Every subsequent `onChange` serializes `toJson(nextState)` and **asynchronously** `write`s (fire-and-forget; write failures go to `onError`).
6. In-memory state remains the Bloc/Cubit source of truth; disk is a snapshot.

**Responsibilities:**

| Piece | Role |
|-------|------|
| `HydratedBloc` / `HydratedCubit` | Bloc/Cubit + auto-`hydrate()` in constructor |
| `HydratedMixin` | Persistence logic; must call `hydrate()` if used alone |
| `Storage` | Abstract read/write/delete/clear/close |
| `HydratedStorage` | Default Hive CE backend + optional `encryptionCipher` |
| App `toJson` / `fromJson` | Own schema, migrations, null/skip semantics |

**Guarantees (documented or clearly implemented):** JSON map persistence per key; restore on next construction; `toJson == null` skips write. **Not guarantees:** durability of temporary directories, encryption by default, schema migration framework, transactional multi-bloc writes, or sync write completion before process kill.

## Package and Version Awareness

**Researched stable:** `hydrated_bloc` **11.0.0**

| Constraint | Value (11.0.0) |
|------------|----------------|
| Dart SDK | `>=2.14.0 <4.0.0` |
| `bloc` | `^9.0.0` |
| Storage engine | `hive_ce` `^2.0.0` |
| Flutter dependency | **None** (pure Dart); Flutter apps add `path_provider` / binding themselves |
| Platforms | android, ios, linux, macos, web, windows |

**Version-sensitive facts:**

- **≥10.0.0:** `HydratedStorage.build` requires `HydratedStorageDirectory` (not `dart:io` `Directory`). Web: `HydratedStorageDirectory.web`. WASM support.
- **≥10.0.0:** per-instance `storage:` override (named).
- **≥10.1.0:** `hydrate(onError:)` + `HydrationErrorBehavior` (`overwrite` default, `retain`).
- **11.0.0:** `HydratedCubit`/`HydratedBloc` storage override is a **named** parameter; non-string map keys serialized via `toString()`.
- **Obsolete (do not teach):** `HydratedBlocOverrides` (removed 9.0.0); `HydratedBlocDelegate`; passing raw `Directory` to `build` (pre-10); assuming `HydratedCubit.storage` (use `HydratedBloc.storage`).

**Stale README pitfall:** some “custom storage directory” snippets still show `storageDirectory: await getApplicationDocumentsDirectory()`. For ≥10, wrap the **path**:

```dart
HydratedStorageDirectory((await getApplicationDocumentsDirectory()).path)
```

## Production Initialization

Canonical pattern from official docs/example (v10+ API):

```dart
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:hydrated_bloc/hydrated_bloc.dart';
import 'package:path_provider/path_provider.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  HydratedBloc.storage = await HydratedStorage.build(
    storageDirectory: kIsWeb
        ? HydratedStorageDirectory.web
        : HydratedStorageDirectory(
            // Official example uses getTemporaryDirectory().
            // For durable user prefs, prefer documents/support (see Cross-Platform).
            (await getApplicationSupportDirectory()).path,
          ),
    // optional: encryptionCipher: HydratedAesCipher(...),
  );

  runApp(const App());
}
```

**Ordering rules:**

1. `ensureInitialized()` before path_provider / plugins.
2. Assign `HydratedBloc.storage` **before** creating any hydrated Bloc/Cubit (else `StorageNotFound`).
3. `HydratedStorage.build` is async and lock-synchronized; do not race multiple builds assuming a shared singleton cache (as of 10.0.0 it does **not** cache a single instance—caller owns the instance assigned to `HydratedBloc.storage`).
4. DI: treat storage as app-bootstrap infrastructure; inject repositories into hydrated blocs as usual—do not hide storage behind domain layers unless testing demands it.

**Engineering note (label clearly):** Official README/example use `getTemporaryDirectory()`. Flutter `path_provider` documents that temporary/cache files **may be cleared at any time**. For durable preferences, use `getApplicationSupportDirectory()` or `getApplicationDocumentsDirectory()` via the custom-directory API the package documents.

## HydratedCubit Pattern

```dart
import 'package:hydrated_bloc/hydrated_bloc.dart';

class ThemeCubit extends HydratedCubit<AppThemeMode> {
  ThemeCubit() : super(AppThemeMode.system);

  void setMode(AppThemeMode mode) => emit(mode);

  @override
  String get storagePrefix => 'ThemeCubit'; // stable under minify/obfuscate

  @override
  AppThemeMode fromJson(Map<String, dynamic> json) {
    final raw = json['mode'] as String?;
    return AppThemeMode.values.firstWhere(
      (m) => m.name == raw,
      orElse: () => AppThemeMode.system,
    );
  }

  @override
  Map<String, dynamic> toJson(AppThemeMode state) => {'mode': state.name};
}

enum AppThemeMode { system, light, dark }
```

## HydratedBloc Pattern

```dart
import 'package:hydrated_bloc/hydrated_bloc.dart';

sealed class OnboardingEvent {}
final class OnboardingStepCompleted extends OnboardingEvent {
  OnboardingStepCompleted(this.step);
  final int step;
}

class OnboardingState {
  const OnboardingState({this.step = 0, this.schemaVersion = 1});
  final int step;
  final int schemaVersion;

  OnboardingState copyWith({int? step}) =>
      OnboardingState(step: step ?? this.step, schemaVersion: schemaVersion);
}

class OnboardingBloc extends HydratedBloc<OnboardingEvent, OnboardingState> {
  OnboardingBloc() : super(const OnboardingState()) {
    on<OnboardingStepCompleted>((event, emit) {
      emit(state.copyWith(step: event.step));
    });
  }

  @override
  String get storagePrefix => 'OnboardingBloc';

  @override
  OnboardingState? fromJson(Map<String, dynamic> json) {
    try {
      final version = json['schemaVersion'] as int? ?? 0;
      if (version < 1) return const OnboardingState(); // reset incompatible
      return OnboardingState(
        step: json['step'] as int? ?? 0,
        schemaVersion: 1,
      );
    } catch (_) {
      return null; // falls back to initial state via getter semantics
    }
  }

  @override
  Map<String, dynamic>? toJson(OnboardingState state) => {
        'schemaVersion': state.schemaVersion,
        'step': state.step,
      };
}
```

## Serialization Rules

`fromJson` / `toJson` operate on `Map<String, dynamic>` (package traverses nested maps/lists and normalizes types).

**DO:**

- Persist JSON-safe leaves: `null`, `bool`, finite `num`, `String`, `List`, `Map` (non-string keys become `key.toString()` as of 11.0.0).
- Convert `DateTime` → ISO-8601 `String` (or epoch `int`) yourself; `DateTime` is not an atomic JSON type in the traverser.
- Convert enums → `name` or stable `int` code; prefer `name` over `index` if reorder risk matters.
- Use Freezed / `json_serializable` for nested models (official tests cover both).
- Make `fromJson` tolerant: missing keys → defaults; wrong types → catch and return `null`/safe default.
- Return `null` from `toJson` to **skip** persisting that emission (documented). Useful for “don’t persist loading/error shells.”

**DON'T:**

- Put non-encodable objects (`Object()`, cyclic graphs, UI/`BuildContext`, controllers) into the JSON tree—triggers `HydratedUnsupportedError` / `HydratedCyclicError`.
- Call `jsonEncode` yourself for the map you return—storage expects a map; nested custom objects should expose `toJson()` maps (traverser may call `.toJson()` on non-atomic values).
- Assume `fromJson` failure soft-migrates—default path overwrites cache with initial state (`HydrationErrorBehavior.overwrite`).

**`fromJson` returns `null`:** stored `_state` is null; `state` getter uses `_state ?? super.state`, so non-nullable state falls back to the constructor initial state (covered by package tests).

## Persist Only What Matters

Minimize the persistence surface:

1. List fields required after cold start.
2. Exclude loading flags, errors, controllers, derived counts, full remote lists if refetchable.
3. Prefer a dedicated “persisted slice” type over dumping the entire UI state class.
4. High-churn fields: either don’t hydrate that Cubit, or gate writes with `toJson → null` until a durable checkpoint.

**Mechanism:** every successful `emit` that changes state runs `toJson` + async `write`. Smaller maps → less encode/write work (engineering consequence of the onChange hook—not a published benchmark).

## Schema Evolution and Migrations

**Package capability:** none for app schema versions. Only an internal one-time migrate of legacy `.hydrated_bloc.json` → Hive box on IO.

**App-owned strategies:**

| Change | Safe approach |
|--------|----------------|
| Add field | Default in `fromJson` when key absent |
| Remove field | Ignore unknown keys |
| Rename field | Read old key, write new key; optional dual-read window |
| Type change | Branch on `schemaVersion` or try/parse |
| Incompatible | Return initial state / call `clear()`; with default `overwrite`, next write replaces bad cache |
| Downgrade | Version gate; if future version unknown, reset or keep last compatible |

Embed `schemaVersion` in the persisted map when the shape will evolve.

## Storage Identity / Keys

```
storageToken = '$storagePrefix$id'
```

Defaults: `storagePrefix = runtimeType.toString()`, `id = ''`.

| Scenario | Practice |
|----------|----------|
| Production / web / obfuscation | **Override `storagePrefix`** to a stable string (official docs) |
| Multiple instances of same type | Override `id` to unique stable ids (official docs) |
| Rename class without override | **Cache miss** — state appears “lost” |
| Generics | `runtimeType` string may include type args—override `storagePrefix` |
| Debug vs release | Obfuscation changes `runtimeType`—override `storagePrefix` |

Changing `storagePrefix`/`id` orphans old keys unless you migrate (read old token once, write new, delete old)—app-owned.

## Cross-Platform Considerations

| Platform | Backend behavior |
|----------|------------------|
| Android / iOS / macOS / Windows / Linux | Hive box under `HydratedStorageDirectory(path)` after `hive.init(path)` |
| Web | `HydratedStorageDirectory.web` (empty-path sentinel); opens box without filesystem init (Hive CE web storage) |

**Directory durability (Flutter `path_provider`, not hydrated_bloc):**

- `getTemporaryDirectory()`: cache; **may be cleared anytime** (iOS `NSCachesDirectory`, Android `getCacheDir`).
- `getApplicationSupportDirectory()` / `getApplicationDocumentsDirectory()`: durable app data (documents intended for user-generated / hard-to-recreate data).

**Web / browser:** persistence follows browser storage rules. Private/incognito and user clearing site data can drop state—product expectation, not a hydrated_bloc API guarantee.

**Hot restart / kill:** package docs state state is retained across hot restart and complete app restarts when storage still holds the key.

## Performance Rules

Justified by lifecycle (sync read + `fromJson` once; `toJson` + async write on each change; Hive writes lock-serialized):

**DO:**

- Keep payloads small (preferences / progress, not catalogs).
- Serialize only durable source state.
- Keep `toJson`/`fromJson` cheap (no I/O, no network, no huge deep copies beyond necessity).
- For chatty Cubits, avoid hydration or skip writes via `toJson == null` until debounce/checkpoint.
- Override stable `storagePrefix` early to avoid “lost state” support costs.

**DON'T:**

- Persist enormous graphs or images-as-bytes in hydrated state.
- Duplicate reconstructible/derived data.
- Treat the Hive box as a general-purpose DB (no queries, no relations, no multi-key transactions across blocs).
- Claim specific ms/MB numbers without measuring the app.

Writes are async; a kill immediately after `emit` can lose the last write—acceptable for preferences, not for critical ledgers.

## Security Rules

| Claim | Status |
|-------|--------|
| Default storage encrypted | **No** |
| Optional AES-256 CBC via `HydratedAesCipher` / `encryptionCipher` | **Yes** (Hive cipher; documented) |
| Cipher key management | **App responsibility** (docs show deriving key from password via SHA-256—demo only; do not hardcode production secrets) |
| Persisted values inspectable without cipher | **Yes** (plaintext in box / browser storage) |
| Suitable for tokens/passwords by default | **No** |

Threat model: local filesystem access, backups, rooted/jailbroken devices, browser devtools. Encryption-at-rest helps against casual inspection; it is not full DRM or server-grade secret storage.

## Error and Corruption Handling

**Hydration read/`fromJson` failure:**

1. `BlocBase.onError` notified.
2. State becomes constructor initial (`super.state`).
3. `onError` callback (default `defaultOnHydrationError`) returns:
   - `HydrationErrorBehavior.overwrite` (**default**): subsequent states persist; bad cache gets overwritten by initial/new state.
   - `HydrationErrorBehavior.retain`: **no writes** until a later successful hydrate—preserves bad/old cache on disk.

Prefer `overwrite` for most apps (self-heal). Use `retain` only when losing disk data is worse than staying non-persistent after failure (rare).

**`toJson` / write failure:** reported via `onError`; hydrate path rethrows `StorageNotFound`.

**Production pattern:** defensive `fromJson`; optional logging in `onHydrationError`; ensure product tolerates reset to defaults.

```dart
class SettingsCubit extends HydratedCubit<Settings> {
  SettingsCubit()
      : super(
          Settings.defaults(),
          onHydrationError: (error, stack) {
            // log/report
            return HydrationErrorBehavior.overwrite;
          },
        );
  // ...
}
```

With `HydratedMixin`, pass `onError:` to `hydrate(...)`.

## Clearing and Resetting State

| API | Effect |
|-----|--------|
| `await cubit.clear()` | `storage.delete(storageToken)` — **disk only**; in-memory state unchanged |
| `await HydratedBloc.storage.clear()` | Clears **entire** box (all hydrated keys)—see official example wipe button |
| `storage.delete(key)` / custom Storage | Selective key ops |
| `storage.close()` | Releases resources; instance unusable after |

**Logout / account switch (engineering pattern):**

1. Emit logged-out in-memory state (or close blocs).
2. `clear()` each user-scoped hydrated instance **or** `storage.clear()` if all keys are user-scoped.
3. If keys encode `userId` in `id`, ensure next session uses the new `id` so accounts don’t share caches.
4. Recreate blocs after storage reset when providers cache instances.

Incompatible schema: defensive `fromJson` + default `overwrite`, or explicit `clear()` then emit defaults.

## Dependency Injection and Architecture

- Bootstrap storage in `main` (or testable `bootstrap()`), not inside feature widgets.
- Provide hydrated Cubits/Blocs via `BlocProvider` / `MultiBlocProvider` like any other bloc.
- Keep domain models free of Hive types; serialization stays in the Cubit/Bloc (or mapper).
- Repositories remain source of truth for remote data; hydrated state holds **local** durable UI/session preferences.
- Per-instance `storage:` override is for encrypted/test/alternate backends—not required for normal apps.
- Do not force Clean Architecture ceremony the project doesn’t use; only separate persistence when it clarifies boundaries.

## Testing

Official guidance: stub `Storage` with `mocktail`; assign `HydratedBloc.storage` in `setUp`.

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:hydrated_bloc/hydrated_bloc.dart';
import 'package:mocktail/mocktail.dart';

class MockStorage extends Mock implements Storage {}

void main() {
  late MockStorage storage;

  setUp(() {
    storage = MockStorage();
    when(() => storage.write(any(), any<dynamic>())).thenAnswer((_) async {});
    when(() => storage.delete(any())).thenAnswer((_) async {});
    when(() => storage.clear()).thenAnswer((_) async {});
    when(() => storage.read(any())).thenReturn(null);
    HydratedBloc.storage = storage;
  });

  test('fresh launch uses initial state', () {
    when(() => storage.read('ThemeCubit')).thenReturn(null);
    expect(ThemeCubit().state, AppThemeMode.system);
  });

  test('restores persisted state', () {
    when(() => storage.read('ThemeCubit')).thenReturn({'mode': 'dark'});
    expect(ThemeCubit().state, AppThemeMode.dark);
  });

  test('serialization round-trip contract', () {
    final cubit = ThemeCubit();
    final json = cubit.toJson(AppThemeMode.light);
    expect(cubit.fromJson(json!), AppThemeMode.light);
  });

  test('malformed cache falls back', () {
    when(() => storage.read('ThemeCubit')).thenReturn({'mode': 123});
    expect(ThemeCubit().state, AppThemeMode.system);
  });
}
```

**Isolation:** new mock + `HydratedBloc.storage =` every test; never share a real Hive directory across tests without `clear` + delete (package e2e tests clear/tearDown disk cache).

**Integration:** build real `HydratedStorage` in a temp directory; await a short delay after emit before constructing a new instance (writes are async—package e2e uses ~100ms sleep).

**Migrations:** unit-test `fromJson` with old fixtures (v0 maps, missing keys, bad types).

## Advanced Patterns

- **Selective persistence:** `toJson` returns `null` for non-durable states.
- **Custom Storage:** implement `Storage` for memory/test/secure backends; assign globally or per instance.
- **Encrypted box:** `HydratedStorage.build(..., encryptionCipher: HydratedAesCipher(keyBytes))` with securely provisioned key material.
- **Flavor/environment separation:** different `storageDirectory` paths per flavor so data doesn’t collide.
- **Account scoping:** put user id in `id` getter; clear on logout.
- **Debugging:** inspect Hive box `hydrated_box` / Hive CE inspector; log `storageToken` and JSON in debug only.
- **Mixin:** only when you cannot extend `HydratedBloc`/`HydratedCubit`; always call `hydrate()`.

## Anti-Patterns

| Bad | Why | Prefer |
|-----|-----|--------|
| Hydrate every Bloc | Write amplification, schema debt, secrets risk | Hydrate only restart-critical slices |
| Persist huge lists/binaries | Startup `fromJson` cost, disk churn | DB / files / network cache |
| Store tokens in default box | Plaintext / weak threat model | Secure storage + auth design |
| Persist loading/error/derived fields | Noise, brittle restores | Persist source prefs only |
| Brittle `as` casts in `fromJson` | One bad install wipes or crashes hydrate path | Defaults + try/catch |
| Rely on `runtimeType` in prod | Obfuscation/web minify loses state | Stable `storagePrefix` |
| Skip storage init in tests | Flaky `StorageNotFound` / cross-test leaks | Mock storage per `setUp` |
| Treat as database | No query/transaction model | Proper persistence layer |
| Copy pre-v10 `Directory` init | Won’t match ≥10 API | `HydratedStorageDirectory` |
| Change keys without migration plan | Silent empty state for upgrades | Dual-read or versioned reset |

## Decision Framework

```
Need state after process death?
  No → normal Bloc/Cubit. Stop.
  Yes ↓

Sensitive (tokens, passwords, PII needing stronger protection)?
  Yes → do not use default hydrated storage; secure design / custom Storage+cipher with real KMS story. Stop or redesign.
  No ↓

Large, relational, or query-heavy?
  Yes → database / repository. Optionally hydrate a tiny preference key only.
  No ↓

Volatile / high-frequency updates?
  Yes → don’t hydrate, or persist checkpoints only (toJson null / debounce).
  No ↓

Authoritative copy lives on server and must be fresh?
  Yes → fetch on start; hydrate only if product accepts stale-ok local snapshot.
  No ↓

hydrated_bloc is appropriate → stable storagePrefix, minimal JSON, defensive fromJson, durable directory if loss is unacceptable, tests for fresh/restore/corrupt/clear.
```

## Implementation Checklist

- [ ] `pubspec` version checked; APIs match major
- [ ] Storage built with `HydratedStorageDirectory`; assigned before first hydrated instance
- [ ] Directory choice matches durability needs (not accidental temp if durable required)
- [ ] Stable `storagePrefix`; `id` if multi-instance
- [ ] Persisted field list minimized; derived data excluded
- [ ] `toJson`/`fromJson` defensive; schemaVersion if evolving
- [ ] No secrets in default box without explicit crypto design
- [ ] Logout/account clear path defined
- [ ] Tests: fresh, restored, corrupt, clear; mock storage isolated
- [ ] Web path uses `HydratedStorageDirectory.web`

## Code Review Checklist

- [ ] Correctness: hydrate only where restart persistence is required
- [ ] Schema: backward-compatible `fromJson` or intentional reset
- [ ] Scope: no huge/remote-authoritative dumps
- [ ] Init: binding + storage order; ≥10 directory type
- [ ] Keys: stable prefix; multi-instance ids; rename impact
- [ ] Security: no plaintext secrets; cipher key not hardcoded
- [ ] Performance: small payloads; chatty emitters not blindly hydrated
- [ ] Testing: mocks, no shared disk leakage
- [ ] Account/logout: clear or scoped ids

## Troubleshooting Guide

| Symptom | Likely cause |
|---------|----------------|
| `StorageNotFound` | Storage not set before hydrated construction |
| State resets every launch | Temp directory cleared; `fromJson` failing (overwrite); wrong `storageToken`; web storage cleared |
| Lost state after release/web deploy | `runtimeType` changed—override `storagePrefix` |
| Two instances share/clobber state | Missing unique `id` |
| State not saving | `toJson` returns `null`; `retain` after hydrate error; storage closed; write errors |
| Tests flake / leak | Shared real Hive path; storage not reset in `setUp` |
| Hydrate error then never persists | `HydrationErrorBehavior.retain` |
| Compile error on `Directory` arg | Pre-v10 snippet on ≥10 package—wrap path in `HydratedStorageDirectory` |
| `HydratedUnsupportedError` | Non-JSON object in tree (fix/DateTime/custom without map `toJson`) |

## Official References

- Package: https://pub.dev/packages/hydrated_bloc
- Changelog: https://pub.dev/packages/hydrated_bloc/changelog
- API: https://pub.dev/documentation/hydrated_bloc/latest/
- Source: https://github.com/felangel/bloc/tree/master/packages/hydrated_bloc
- Example: `packages/hydrated_bloc/example/lib/main.dart`
- Bloc ecosystem: https://bloclibrary.dev/getting-started/
- `path_provider` temp vs documents: https://docs.flutter.dev/cookbook/persistence/reading-writing-files
- Hive CE (default engine): https://pub.dev/packages/hive_ce

Evidence labels used above: **documented** (README/API), **implementation/tests** (mixin write/read, error behaviors, key composition), **engineering recommendation** (durable directories, minimize payload, account scoping).
