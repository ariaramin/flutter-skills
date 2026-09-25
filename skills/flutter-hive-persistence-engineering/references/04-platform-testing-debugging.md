# Reference Guide

Flutter Web, errors/recovery, diagnostics, DI/Bloc integration, testing, code generation, monorepos, and debugging.

## Contents

- Flutter Web
  - Consequences
  - Hive CE advantages
  - Browser storage limits
  - Web performance
- Error Handling
  - Preserve diagnostics
  - Do not catch and return null universally
- Data Corruption and Recovery
  - 1. Disposable cache
  - 2. Reconstructable server data
  - 3. Critical local user-generated data
  - Box-open failure is not automatically corruption
- Logging and Diagnostics
- Dependency Injection
  - Good graph
  - get_it example
  - Do not make everything global
  - Async DI
- Bloc/Cubit Integration
  - Good
  - Avoid
  - Simple exception
- Testing Strategy
  - Native test isolation
  - Repository tests
  - Adapter tests
- Migration Test Strategy
  - Fixture test
  - Required migration cases
  - Do not generate all fixtures with current code
- Encrypted Box Tests
- Code Generation Workflow
  - Original Hive
  - Hive CE legacy annotation style
  - Hive CE modern generation
  - Generated-file rules
- Schema Metadata in Monorepos
  - Manual IDs
  - CE automatic generation
- Debugging Workflow
  - Box fails to open
  - “Unknown type ID”
  - Unexpected null/default value
  - Corrupted value/adapter exception
  - Migration failure
  - Excessive storage size
  - Slow startup
  - High memory usage
  - Stale cache
  - Web-only failure

---

# Flutter Web

Hive/Hive CE does not use native file semantics in the browser.

Browser boxes are backed by IndexedDB.

## Consequences

Do not assume:

- a real filesystem path exists;
- native file permissions apply;
- browser storage is never evicted;
- private/incognito persistence is durable;
- user-cleared site data will survive;
- native secure storage exists.

## Hive CE advantages

Hive CE explicitly supports Flutter Web/WASM.

Recent Hive CE changelogs also include warnings/fixes around integer behavior in WASM environments. Test values above JavaScript's exact integer range if the application expects very large integer identifiers.

For exact very large numeric identity, consider:

- string IDs;
- `BigInt` where supported and appropriate;
- explicit serialization.

## Browser storage limits

Quotas and eviction behavior are browser-controlled.

Do not make IndexedDB the sole irreplaceable copy of critical user-generated data without:

- server synchronization;
- export/backup;
- explicit product acceptance of browser-local durability.

## Web performance

Measure on actual browsers.

Do not extrapolate native file benchmarks to IndexedDB.

---

# Error Handling

Map low-level storage failures into persistence/application failures.

```dart
sealed class LocalStorageFailure
    implements Exception {
  const LocalStorageFailure();
}

final class StorageUnavailableFailure
    extends LocalStorageFailure {
  const StorageUnavailableFailure();
}

final class StorageCorruptedFailure
    extends LocalStorageFailure {
  const StorageCorruptedFailure();
}

final class StorageMigrationFailure
    extends LocalStorageFailure {
  const StorageMigrationFailure(
    this.fromVersion,
    this.toVersion,
  );

  final int fromVersion;
  final int toVersion;
}

final class StorageWriteFailure
    extends LocalStorageFailure {
  const StorageWriteFailure();
}

final class StorageDecodeFailure
    extends LocalStorageFailure {
  const StorageDecodeFailure();
}
```

## Preserve diagnostics

Internally capture:

- box name;
- operation;
- schema version;
- migration step;
- adapter/type ID if known;
- package version;
- stack trace.

Do not expose raw box errors to UI.

## Do not catch and return null universally

Bad:

```dart
Future<UserCache?> load() async {
  try {
    return box.get('user');
  } catch (_) {
    return null;
  }
}
```

This makes:

```text
missing user
```

indistinguishable from:

```text
corrupted database
wrong encryption key
adapter missing
I/O failure
```

---

# Data Corruption and Recovery

Classify data first.

## 1. Disposable cache

Examples:

- product catalog copy;
- avatars metadata;
- search results.

Recovery can be:

```text
detect unreadable cache
↓
telemetry
↓
close/delete affected cache box
↓
recreate
↓
refetch from server
```

Only if the server is authoritative.

## 2. Reconstructable server data

Similar to cache, but preserve:

- sync version;
- account identity;
- pending local mutations;

before deleting anything.

Do not wipe unsynchronized changes along with a corrupt server cache.

## 3. Critical local user-generated data

Examples:

- unsynced journal;
- offline document;
- locally authored draft;
- pending financial record.

Do **not** auto-delete.

Prefer:

```text
stop destructive writes
↓
preserve original storage file/data
↓
collect sanitized diagnostics
↓
attempt compatible adapter/key recovery
↓
offer export/recovery path
```

## Box-open failure is not automatically corruption

Check first:

1. adapters registered?
2. same type ID?
3. correct encryption key?
4. correct box generic type?
5. correct package/migration version?
6. previous migration interrupted?
7. storage path changed?

Only then classify corruption.

Hive CE's storage implementation includes crash-recovery handling for damaged trailing data on native storage, but that is not a substitute for application migration/recovery logic.

---

# Logging and Diagnostics

Useful:

```text
storage_initialized
box_open_failed
box_open_duration
migration_started
migration_completed
migration_failed
schema_version
compaction_started
compaction_completed
cache_reset
storage_bytes
entry_count
```

Do not log:

- encryption key;
- refresh token;
- access token;
- entire encrypted records after decryption;
- private user documents;
- raw credentials.

Use identifiers only when privacy policy allows it.

---

# Dependency Injection

Treat storage as a resource with explicit ownership.

## Good graph

```text
StorageBootstrap
↓
Box<UserCache>
↓
HiveUserLocalDataSource
↓
UserRepository
```

or:

```text
StorageService
↓
Local Data Sources
```

## get_it example

```dart
import 'package:get_it/get_it.dart';
import 'package:hive_ce/hive_ce.dart';

final getIt = GetIt.instance;

Future<void> registerUserStorage() async {
  final box =
      await Hive.openBox<UserCache>(
    'user_cache',
  );

  getIt.registerSingleton<
      Box<UserCache>>(
    box,
    dispose: (box) => box.close(),
  );

  getIt.registerLazySingleton<
      UserLocalDataSource>(
    () => HiveUserLocalDataSource(
      getIt<Box<UserCache>>(),
    ),
  );
}
```

Only let one layer own the box's close lifecycle.

## Do not make everything global

A feature-specific lazy box does not need application-global lifetime just because a DI container exists.

## Async DI

Pre-resolve:

- migration metadata;
- startup-critical boxes.

Lazy-open:

- large feature-only boxes.

---

# Bloc/Cubit Integration

Prefer:

```text
Widget
↓
Cubit
↓
Repository
↓
HiveLocalDataSource
↓
Box
```

## Good

```dart
final class SettingsCubit
    extends Cubit<SettingsState> {
  SettingsCubit(
    this._repository,
  ) : super(
          const SettingsState(),
        );

  final SettingsRepository
      _repository;

  Future<void> setDarkMode(
    bool enabled,
  ) async {
    await _repository.setDarkMode(
      enabled,
    );

    emit(
      state.copyWith(
        darkMode: enabled,
      ),
    );
  }
}
```

## Avoid

```dart
final class SettingsCubit
    extends Cubit<SettingsState> {
  final Box<dynamic> box =
      Hive.box('settings');
}
```

This ties state management directly to storage implementation and makes error mapping/testing harder.

## Simple exception

For a one-screen utility storing a trivial preference, direct Hive listenable use can be acceptable.

Do not introduce five architectural layers for one boolean.

---

# Testing Strategy

A persistence layer must be tested against:

1. fresh storage;
2. old storage;
3. malformed storage;
4. migration paths;
5. cleanup behavior.

## Native test isolation

Use a unique temporary directory for each test or test group.

```dart
import 'dart:io';

import 'package:hive_ce/hive_ce.dart';
import 'package:test/test.dart';

void main() {
  late Directory directory;

  setUp(() async {
    directory =
        await Directory.systemTemp
            .createTemp(
      'hive_test_',
    );

    Hive.init(directory.path);

    Hive.registerAdapter(
      UserCacheAdapter(),
    );
  });

  tearDown(() async {
    await Hive.close();

    if (await directory.exists()) {
      await directory.delete(
        recursive: true,
      );
    }
  });

  test(
    'persists and reloads user',
    () async {
      var box =
          await Hive.openBox<UserCache>(
        'users',
      );

      await box.put(
        '42',
        const UserCache(
          id: '42',
          displayName: 'Ada',
          cachedAtEpochMs: 1,
        ),
      );

      await box.close();

      box =
          await Hive.openBox<UserCache>(
        'users',
      );

      expect(
        box.get('42')?.displayName,
        'Ada',
      );
    },
  );
}
```

Do not share one persistent directory across parallel tests.

## Repository tests

Where possible, mock/fake the local data source rather than Hive itself.

Unit test business cache policy separately from storage encoding.

## Adapter tests

At minimum:

```text
write current model
↓
close
↓
reopen
↓
read
↓
assert every field
```

More important:

```text
write using previous adapter/schema fixture
↓
open with current app
↓
read/migrate
↓
assert preserved data
```

---

# Migration Test Strategy

This is mandatory for valuable production data.

## Fixture test

Maintain representative persisted data produced by previous released versions.

```text
fixtures/
  storage_v1/
  storage_v2/
  storage_v3/
```

Test:

```text
copy fixture to temporary directory
↓
initialize current Hive/Hive CE
↓
register current + migration adapters
↓
run migrations
↓
open current typed boxes
↓
validate records
↓
restart storage
↓
validate again
```

## Required migration cases

- oldest supported version → current;
- previous version → current;
- migration interrupted/resumed;
- missing optional field;
- retired field;
- bad record when policy allows partial recovery;
- encrypted old fixture;
- large migration if performance-sensitive.

## Do not generate all fixtures with current code

That only proves the current code can read what it just wrote.

The fixture must represent **historical deployed data**.

---

# Encrypted Box Tests

Use a deterministic test-only key:

```dart
final testKey =
    List<int>.generate(
  32,
  (index) => index,
);

final box =
    await Hive.openBox<String>(
  'encrypted',
  encryptionCipher:
      HiveAesCipher(testKey),
);
```

This key is test fixture data, not a production secret.

Test:

1. write;
2. close;
3. reopen with same key;
4. read;
5. prove wrong key fails;
6. test migration with the real encryption configuration shape.

---

# Code Generation Workflow

## Original Hive

Typical dependencies:

```yaml
dependencies:
  hive: ^2.2.3
  hive_flutter: ^1.1.0

dev_dependencies:
  hive_generator: ^2.0.1
  build_runner: any
```

Use repository-approved version constraints rather than blindly copying the example.

Model:

```dart
@HiveType(typeId: 10)
final class UserCache {
  @HiveField(0)
  final String id;

  @HiveField(1)
  final String name;

  const UserCache({
    required this.id,
    required this.name,
  });
}
```

Generate:

```bash
dart run build_runner build --delete-conflicting-outputs
```

## Hive CE legacy annotation style

Replace generator/runtime packages with CE equivalents while preserving IDs.

## Hive CE modern generation

```dart
@GenerateAdapters(
  [
    AdapterSpec<UserCache>(),
    AdapterSpec<ProductCache>(),
  ],
  firstTypeId: 32,
  reservedTypeIds: {
    0,
    1,
    10,
    11,
  },
)
final class HiveAdapters {}
```

Run:

```bash
dart run build_runner build --delete-conflicting-outputs
```

Register generated adapters:

```dart
Hive.registerAdapters();
```

Hive CE's generator explicitly supports automatic adapter generation, schema migration tooling, a registrar, `reservedTypeIds`, and `ignoredFields`.

## Generated-file rules

Do not manually edit generated adapter code.

Do not delete the CE schema metadata because you dislike its diff.

Regenerate after persistent-model changes.

CI should catch stale generated files.

Example CI sequence:

```bash
dart run build_runner build --delete-conflicting-outputs
dart format --output=none --set-exit-if-changed .
flutter analyze
flutter test
```

Adapt to the repository's actual commands.

---

# Schema Metadata in Monorepos

If multiple packages contribute persistent adapters:

## Manual IDs

Allocate ranges:

```text
core:       0–99
profile:  100–199
catalog:  200–299
sync:     300–399
```

Do not make packages independently assume type ID `1` is available.

## CE automatic generation

Prefer one coordinated adapter schema at an application/package boundary.

If several generation roots are necessary:

- explicitly reserve IDs allocated elsewhere;
- document ownership;
- test combined registrar startup.

Type-ID collisions are a data-schema defect, not merely a generator warning.

---

# Debugging Workflow

## Box fails to open

Check:

1. Was Hive initialized?
2. Correct storage path?
3. Required adapter registered?
4. Correct type ID?
5. Correct box generic type?
6. Is it already open as a lazy box?
7. Is it already open with another generic type?
8. Correct encryption key?
9. Migration interrupted?
10. Package changed?
11. File/storage corruption?

Do not delete the box before answering those questions.

## “Unknown type ID”

Likely causes:

- adapter not registered;
- type ID changed;
- wrong generated registrar;
- schema metadata regenerated incorrectly;
- package migration omitted adapter registration.

Search the old production schema before assigning a new adapter.

## Unexpected null/default value

Check:

- old record lacks new field;
- new field has no default;
- field ID changed;
- automatic schema treated rename as new property;
- wrong box key;
- migration did not run.

## Corrupted value/adapter exception

Determine:

- all records or one key?
- recent model change?
- type changed?
- wrong encryption key?
- legacy adapter removed?
- field index reused?

For cache data, isolate/reset affected data after diagnosis.

For user-owned data, preserve the original.

## Migration failure

Log:

```text
from version
to version
migration ID
current key/cursor
box
exception class
```

Then resume or fail safely.

Do not mark the new schema version if validation failed.

## Excessive storage size

Check:

- entry count;
- average record size;
- media blobs;
- deleted/overwritten churn;
- compaction;
- expired cache;
- orphaned user boxes.

## Slow startup

Measure:

```text
Hive init
adapter registration
box open per box
migration duration
compaction
domain hydration
```

Do not blame Hive generally before identifying which phase is slow.

## High memory usage

Check:

- large normal boxes;
- entire-box copies;
- large object graphs;
- duplicate caches;
- binary blobs;
- application caches in addition to Hive's normal in-memory values.

Consider `LazyBox` where access pattern fits.

## Stale cache

Check application cache metadata.

Hive does not expire records automatically.

## Web-only failure

Check:

- IndexedDB availability;
- browser private mode;
- quota;
- site-data clearing;
- WASM integer assumptions;
- browser-specific persistence behavior.

Test in the affected browser.

---
