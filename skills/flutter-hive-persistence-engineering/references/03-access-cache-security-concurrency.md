# Reference Guide

Keys, reads/writes, repositories, caching, offline patterns, encryption, compaction, lifecycle, concurrency, and isolates.

## Contents

- Keys
  - Stable domain ID
  - Auto-increment keys
  - Composite-like key
  - Avoid positional identity
- Reading Data
  - Direct key read
  - Defaults
  - Existence checks
  - Avoid entire-box copies
- Writing Data
  - Await important writes
  - Flush
- Bulk Writes
- Deletion
  - Delete one key
  - Delete several
  - Clear box
  - Delete box from disk
- Reactive Updates
  - Repository stream
  - UI integration
  - Dispose subscriptions
- Repository Architecture
- Caching Patterns
  - Cache model
  - Cache-aside
  - Stale fallback
- Offline-First Patterns
  - Local mutation queue
- Encryption
  - Architecture
  - Example
  - Never do this
- Security Boundaries
  - Sensitive-data decision table
  - Web warning
- Encryption Key Rotation
- Compaction
  - Prefer defaults first
  - Consider custom/manual compaction when
  - Do not aggressively compact startup boxes
- Storage Growth
  - Diagnostic metrics
  - Media
- Large Datasets
  - Normal box
  - Lazy box
  - Alternative database
- Avoiding Excessive Writes
  - Bad
  - Better: debounced draft persistence
- Flutter Lifecycle
  - Startup
  - During app use
  - Pause/background
  - Termination
  - Logout
  - Account switch
- Concurrency
  - One-isolate application
  - Multi-isolate distinction
- Isolate Usage
  - Hive CE
  - Tradeoff
  - Unsupported CE features

---

# Keys

Choose keys according to identity semantics.

## Stable domain ID

Prefer:

```dart
await usersBox.put(
  user.id,
  user,
);
```

for server/domain entities.

Benefits:

- direct lookup;
- updates replace same identity;
- deduplication is natural.

## Auto-increment keys

Use `add` when persistent identity does not come from elsewhere.

```dart
final key = await eventsBox.add(
  event,
);
```

Suitable for append-like local records.

Do not use auto-index keys when data must synchronize to a stable remote identity unless you separately store that identity.

## Composite-like key

Prefer deterministic encoding:

```dart
String userPostKey(
  String userId,
  String postId,
) {
  return '${Uri.encodeComponent(userId)}:'
      '${Uri.encodeComponent(postId)}';
}
```

Do not concatenate ambiguous raw values if separators may occur in IDs.

## Avoid positional identity

Do not treat:

```dart
box.getAt(10)
```

as the identity of an entity.

Positions can change as records are removed.

---

# Reading Data

## Direct key read

```dart
final user = box.get(userId);
```

Normal boxes provide synchronous reads because values are retained in memory. Hive documents that write operations are asynchronous while newly written values are immediately visible to normal reads.

## Defaults

For primitive metadata:

```dart
final lastSyncEpochMs = box.get(
  'last_sync_epoch_ms',
  defaultValue: 0,
) as int;
```

Do not silently default a critical structured record if missing data must be distinguished from corruption.

## Existence checks

```dart
if (box.containsKey(userId)) {
  // ...
}
```

## Avoid entire-box copies

Bad for a large box:

```dart
final everything = box.toMap();
```

if one key is required.

Avoid:

```dart
box.values
    .where(...)
    .toList();
```

as the permanent query architecture for hundreds of thousands of records.

If broad scans dominate the application, reconsider the storage engine.

---

# Writing Data

## Await important writes

```dart
await box.put(
  user.id,
  user,
);
```

Hive normal boxes expose the value in memory immediately, but the Future represents completion of the backend write. Hive CE's write implementation rolls the in-memory operation back if backend persistence fails.

Therefore:

- critical persistence → await and handle errors;
- optional cache write → the architecture may choose best-effort behavior explicitly.

Never assume an unawaited write cannot fail.

## Flush

Use `flush()` when the application requires pending box changes to be pushed through the storage backend before crossing a critical boundary.

```dart
await box.put(
  'migration_complete',
  true,
);

await box.flush();
```

Do not call `flush()` after every trivial write as a superstition. Measure the durability/performance need.

---

# Bulk Writes

Prefer bulk APIs when many records are logically updated together.

```dart
final updates = <String, UserCache>{
  for (final user in users)
    user.id: user,
};

await usersBox.putAll(updates);
```

Benefits include:

- fewer API/backend operations;
- clearer migration intent;
- reduced repeated overhead.

Do not describe `putAll` across a normal box as a general cross-box transactional guarantee.

Use bulk operations for:

- API-page cache replacement;
- migration batches;
- import operations.

---

# Deletion

## Delete one key

```dart
await box.delete(userId);
```

## Delete several

```dart
await box.deleteAll(
  obsoleteIds,
);
```

## Clear box

```dart
await box.clear();
```

Use `clear()` only when every record in the box shares the same deletion policy.

## Delete box from disk

Use when:

- the box is temporary/reconstructable;
- account data must be permanently removed locally;
- a migration has safely retired the old box.

Do not delete a box as generic exception handling.

---

# Reactive Updates

Hive exposes box change streams, including key-specific watching. Flutter extensions can also expose box listenables.

## Repository stream

Prefer:

```dart
import 'dart:async';

import 'package:hive_ce/hive_ce.dart';

final class SettingsLocalDataSource {
  SettingsLocalDataSource(
    this.box,
  );

  static const themeKey = 'theme_mode';

  final Box<String> box;

  String? readTheme() {
    return box.get(themeKey);
  }

  Stream<String?> watchTheme() async* {
    yield box.get(themeKey);

    yield* box
        .watch(key: themeKey)
        .map(
          (_) => box.get(themeKey),
        );
  }

  Future<void> saveTheme(
    String value,
  ) {
    return box.put(
      themeKey,
      value,
    );
  }
}
```

This keeps Hive-specific `BoxEvent` from propagating through the entire application.

## UI integration

Simple preference-only widgets can reasonably use Hive's Flutter listenable directly.

For larger features, prefer:

```text
Hive watch
↓
Local data source
↓
Repository stream
↓
Bloc/Cubit/Riverpod
↓
Widget
```

## Dispose subscriptions

If a repository/controller calls:

```dart
box.watch().listen(...)
```

store and cancel the subscription when its owner ends.

---

# Repository Architecture

Define a local-data abstraction.

```dart
abstract interface class UserLocalDataSource {
  UserCache? readUser(String id);

  Future<void> saveUser(
    UserCache user,
  );

  Future<void> deleteUser(
    String id,
  );

  Stream<UserCache?> watchUser(
    String id,
  );
}
```

Hive CE implementation:

```dart
import 'package:hive_ce/hive_ce.dart';

final class HiveUserLocalDataSource
    implements UserLocalDataSource {
  HiveUserLocalDataSource(
    this._box,
  );

  final Box<UserCache> _box;

  @override
  UserCache? readUser(String id) {
    return _box.get(id);
  }

  @override
  Future<void> saveUser(
    UserCache user,
  ) {
    return _box.put(
      user.id,
      user,
    );
  }

  @override
  Future<void> deleteUser(
    String id,
  ) {
    return _box.delete(id);
  }

  @override
  Stream<UserCache?> watchUser(
    String id,
  ) async* {
    yield _box.get(id);

    yield* _box
        .watch(key: id)
        .map(
          (_) => _box.get(id),
        );
  }
}
```

Repository:

```dart
abstract interface class UserRemoteDataSource {
  Future<User> loadUser(
    String id,
  );
}

final class User {
  const User({
    required this.id,
    required this.displayName,
  });

  final String id;
  final String displayName;
}

final class UserRepository {
  UserRepository({
    required UserRemoteDataSource remote,
    required UserLocalDataSource local,
  })  : _remote = remote,
        _local = local;

  final UserRemoteDataSource _remote;
  final UserLocalDataSource _local;

  Future<User> loadUser(
    String id,
  ) async {
    try {
      final user =
          await _remote.loadUser(id);

      await _local.saveUser(
        UserCache(
          id: user.id,
          displayName:
              user.displayName,
          cachedAtEpochMs:
              DateTime.now()
                  .millisecondsSinceEpoch,
        ),
      );

      return user;
    } catch (_) {
      final cached =
          _local.readUser(id);

      if (cached == null) {
        rethrow;
      }

      return User(
        id: cached.id,
        displayName:
            cached.displayName,
      );
    }
  }
}
```

Do not make repository abstractions mandatory for a two-setting hobby app.

---

# Caching Patterns

Hive stores values.

Hive does **not** automatically implement:

- TTL;
- cache invalidation;
- stale-while-revalidate;
- ETag logic;
- synchronization;
- conflict resolution.

The application must implement those policies.

## Cache model

```dart
final class CachedArticle {
  const CachedArticle({
    required this.id,
    required this.title,
    required this.cachedAtEpochMs,
    required this.expiresAtEpochMs,
  });

  final String id;
  final String title;
  final int cachedAtEpochMs;
  final int expiresAtEpochMs;

  bool isFreshAt(
    DateTime now,
  ) {
    return now.millisecondsSinceEpoch <
        expiresAtEpochMs;
  }
}
```

## Cache-aside

```text
Request
↓
Read cache
↓
fresh?
 ├─ yes → return
 └─ no
      ↓
    network
      ↓
    persist
      ↓
    return
```

## Stale fallback

A repository may decide:

```text
network fails
↓
stale cached copy exists
↓
return stale copy with stale metadata
```

This is an application policy.

Do not silently return stale data when the product requires authoritative current values.

---

# Offline-First Patterns

Hive/Hive CE can persist:

- local state;
- server snapshots;
- pending mutations;
- sync cursors.

They do not implement synchronization.

## Local mutation queue

Example model:

```dart
enum PendingOperationType {
  create,
  update,
  delete,
}

final class PendingOperation {
  const PendingOperation({
    required this.operationId,
    required this.entityId,
    required this.type,
    required this.payload,
    required this.createdAtEpochMs,
  });

  final String operationId;
  final String entityId;
  final PendingOperationType type;
  final Map<String, dynamic> payload;
  final int createdAtEpochMs;
}
```

Application still needs:

- retry policy;
- server idempotency;
- conflict detection;
- operation ordering;
- account scoping;
- failure resolution.

Do not market:

```text
Hive + cached models = offline synchronization
```

as true.

---

# Encryption

Hive/Hive CE support encrypted boxes through a `HiveCipher`, including `HiveAesCipher`.

Hive CE exposes secure-key generation and supports encrypted box opening; its current AES cipher implementation uses AES-256-style 32-byte keys. Hive CE presents built-in strong encryption as a package feature.

## Architecture

```text
Secure platform storage
↓
32-byte Hive encryption key
↓
HiveAesCipher
↓
Encrypted box
```

## Example

```dart
import 'package:hive_ce/hive_ce.dart';

abstract interface class EncryptionKeyStore {
  Future<List<int>?> readHiveKey();

  Future<void> saveHiveKey(
    List<int> key,
  );
}

final class SecureBoxFactory {
  SecureBoxFactory(
    this._keyStore,
  );

  final EncryptionKeyStore _keyStore;

  Future<Box<Object?>> open(
    String boxName,
  ) async {
    var key =
        await _keyStore.readHiveKey();

    if (key == null) {
      key = Hive.generateSecureKey();

      await _keyStore.saveHiveKey(
        key,
      );
    }

    if (key.length != 32) {
      throw StateError(
        'Invalid Hive encryption key length.',
      );
    }

    return Hive.openBox<Object?>(
      boxName,
      encryptionCipher:
          HiveAesCipher(key),
    );
  }
}
```

The `EncryptionKeyStore` should normally be backed by an appropriate platform-secure facility.

## Never do this

```dart
const key = [
  1,
  2,
  3,
  // ...
];
```

in source code.

Never store:

```text
encrypted_database.hive
encryption_key.txt
```

side-by-side in ordinary app storage.

Never log a key.

---

# Security Boundaries

Encrypted Hive protects persisted bytes at rest only within the limits of the platform and key handling.

It does not automatically protect against:

- compromised application runtime;
- attacker who can invoke application code after unlock;
- rooted/jailbroken device with additional runtime capabilities;
- debug logging;
- screenshots;
- in-memory values;
- malicious dependencies;
- XSS in a web application;
- insecure backup/export logic.

## Sensitive-data decision table

| Data | Recommended storage |
|---|---|
| Theme preference | Preferences or ordinary Hive box |
| Non-sensitive API cache | Hive/Hive CE |
| Sensitive PII cache | Minimize; encrypted Hive when justified |
| Access token | Usually platform secure storage |
| Refresh token | Platform secure storage |
| Hive encryption key | Platform secure storage |
| Private cryptographic key | Secure/keychain/keystore facility |
| Offline user document metadata | Hive CE if access model fits |
| Large image/video | File system + Hive metadata |
| Temporary password | Memory only; avoid persistence |
| PIN verifier/secret | Dedicated security design, not plain Hive |
| Public feature configuration | Ordinary persistence |
| Pending authenticated sync operations | Consider encrypted user-scoped storage |

## Web warning

A web app cannot assume mobile hardware-backed secret semantics.

IndexedDB and JavaScript/WASM runtime security are subject to browser origin and application compromise. Do not claim that an encrypted Hive CE web box is equivalent to Keychain/Keystore-backed native storage.

---

# Encryption Key Rotation

Hive does not provide an application-level transparent key-rotation workflow that eliminates migration design.

If rotation is required:

```text
Open old encrypted box with old key
↓
Create/open new box with new key
↓
Copy records
↓
Validate
↓
Switch active metadata/version
↓
Retire old data/key after policy allows
```

Do not overwrite/delete the old key before the old data is successfully migrated.

For large critical datasets, design rotation as a resumable migration.

---

# Compaction

Hive's append-oriented storage can accumulate obsolete frames from overwrites/deletions.

Compaction rewrites live data to reclaim storage.

Hive CE includes an automatic default compaction strategy and manual `compact()` support. Its current source uses a threshold strategy rather than compacting after every deletion.

## Prefer defaults first

Do not call:

```dart
await box.compact();
```

every time a record is deleted.

Compaction itself costs:

- I/O;
- CPU;
- temporary storage;
- time.

## Consider custom/manual compaction when

- a high-churn cache grows far beyond live-data size;
- disk diagnostics show excessive stale storage;
- maintenance can run away from critical startup paths.

## Do not aggressively compact startup boxes

Bad:

```text
app launch
↓
compact every box
↓
open UI
```

unless measurements prove it is necessary.

---

# Storage Growth

Investigate these causes:

1. large live values;
2. many deleted/overwritten frames awaiting compaction;
3. cache invalidation never removing stale entities;
4. redundant snapshots;
5. binary/media values;
6. per-user data never deleted;
7. migration copies left forever.

## Diagnostic metrics

Track safely:

```text
box name
logical entry count
file/storage size where platform allows
last compaction
migration version
cache oldest timestamp
```

Do not log sensitive values.

## Media

Strongly prefer:

```text
Hive:
asset metadata

File system:
actual 100 MB video
```

rather than a giant `Uint8List` in a general-purpose box.

---

# Large Datasets

Hive is appropriate when access is primarily:

```text
key → value
```

and scans remain manageable.

## Normal box

Use for:

- moderate dataset;
- frequently accessed values;
- enough memory.

## Lazy box

Use for:

- large values;
- infrequent access;
- memory pressure.

## Alternative database

Use another database when the application frequently asks:

```text
all rows where:
status = active
AND createdAt > ...
AND category IN (...)
ORDER BY score
LIMIT 100
```

especially if the dataset is large.

A Hive solution often means O(n)-style application scanning unless you build and maintain your own indexes.

That may be acceptable for 200 records.

It may be a poor architecture for 500,000.

---

# Avoiding Excessive Writes

Do not persist every transient UI mutation.

## Bad

```dart
onChanged: (value) {
  box.put(
    'draft',
    value,
  );
}
```

for every keystroke without considering write volume.

## Better: debounced draft persistence

```dart
import 'dart:async';

final class DraftPersistence {
  DraftPersistence({
    required Future<void> Function(
      String text,
    ) save,
    this.delay =
        const Duration(
          milliseconds: 500,
        ),
  }) : _save = save;

  final Future<void> Function(
    String text,
  ) _save;

  final Duration delay;

  Timer? _timer;
  String? _pending;

  void changed(String text) {
    _pending = text;
    _timer?.cancel();

    _timer = Timer(
      delay,
      () {
        final value = _pending;

        if (value != null) {
          unawaited(
            _save(value),
          );
        }
      },
    );
  }

  Future<void> flush() async {
    _timer?.cancel();
    _timer = null;

    final value = _pending;

    if (value != null) {
      await _save(value);
    }
  }

  void dispose() {
    _timer?.cancel();
  }
}
```

The exact debounce window depends on:

- acceptable crash-loss window;
- data importance;
- typing frequency;
- storage performance.

Do not use a universal debounce duration blindly.

For truly critical edits, persist at meaningful checkpoints rather than only on route exit.

---

# Flutter Lifecycle

## Startup

- initialize Hive;
- register adapters;
- run critical migration;
- open required boxes.

## During app use

Persist important data when it changes.

Do not postpone everything until termination.

## Pause/background

A lifecycle callback can be an opportunity to:

- flush debounced drafts;
- flush selected boxes.

But it is not guaranteed to run before every process kill or crash.

## Termination

Do not depend on:

```text
“onDispose/onDetached will save it”
```

as the only persistence path.

## Logout

Explicitly:

- flush/cancel pending user writes;
- close user-specific boxes if needed;
- clear/delete account data according to policy;
- release encryption/session keys from memory where practical;
- ensure a new account cannot resolve the old account's box service.

## Account switch

Treat it like logout + new session initialization.

Never reuse a box service whose in-memory assumptions still belong to the previous user unless the box is deliberately multi-user and every key is correctly namespaced.

---

# Concurrency

## One-isolate application

Hive's async methods handle their own storage I/O, but application-level read-modify-write sequences can still race.

Bad:

```dart
final current =
    box.get(
      'counter',
      defaultValue: 0,
    ) as int;

await Future<void>.delayed(
  const Duration(milliseconds: 20),
);

await box.put(
  'counter',
  current + 1,
);
```

Two callers can both read `10` and both write `11`.

Hive cannot infer that the application intended an atomic increment.

Serialize logical mutations at a repository/service boundary when needed.

## Multi-isolate distinction

Original Hive stable should not be treated as a general supported multi-isolate shared database. Original Hive's own guidance historically pointed users needing multiple-isolate/query capabilities toward alternative databases.

Hive CE adds explicit isolate support through `IsolatedHive`. CE describes ordinary `IsolatedHive` access as slower than direct Hive because of isolate communication but provides it specifically for safe multiple-isolate use.

---

# Isolate Usage

## Hive CE

Use `IsolatedHive` when multiple Dart isolates genuinely need access to the persistence layer.

Do not:

```text
isolate A → Hive.openBox("x")
isolate B → Hive.openBox("x")
```

and assume this is safe merely because both calls compile.

Hive CE's runtime includes warnings around unsafe direct isolate use, while `IsolatedHive` provides a supported isolate delegation mechanism. Recent CE releases include isolate encryption and hot-restart fixes, reinforcing that isolate behavior is a distinct supported feature with its own lifecycle.

## Tradeoff

Prefer ordinary `Hive` when:

- all persistence lives in one isolate;
- background work can send messages back to the storage owner;
- isolate overhead offers no benefit.

Prefer `IsolatedHive` when:

- multiple isolates must call the persistence API independently;
- centralized message delegation is otherwise being reimplemented.

## Unsupported CE features

Do not assume every Hive convenience abstraction is available through isolated mode exactly as ordinary Hive. Verify `IsolatedHive` API documentation when using:

- Hive objects;
- lazy semantics;
- generated registrar;
- encryption;
- box lifecycle.

The CE generator now also generates an `IsolatedHiveRegistrar` extension for generated adapters.

---
