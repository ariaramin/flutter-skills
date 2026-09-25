# Reference Guide

Type adapters, type/field IDs, schema evolution, migration architecture, crash safety, and Hive → Hive CE migration.

## Contents

- Type Adapters
- Original Hive Adapter Generation
- Hive CE Adapter Generation
  - Preferred modern CE setup
  - Preserve generated schema metadata
  - Do not mix ID strategies casually
- Manual Adapters
- Type ID Registry
  - Rules
  - Why never reuse?
- Field IDs
  - Never renumber for aesthetics
- Schema Evolution Rules
- Adding a New Persisted Property
  - Legacy annotation approach
- Removing a Field
- Renaming a Field
  - Manual/HiveField strategy
  - CE `GenerateAdapters`
- Changing a Field Type
- Migration Architecture
  - Migration requirements
  - Migration runner
  - Why persist version last?
- Crash-Safe Migration Design
- Migration Example: Rename Keys
- Migration Example: Move Between Boxes
- Large Migrations
- Application-Level Atomicity
  - If an invariant requires all-or-nothing multi-record updates
- Package Migration: Hive → Hive CE
  - Safe migration procedure
  - CE automatic-adapter migration
  - Compatibility claim discipline

---

# Type Adapters

A `TypeAdapter<T>` encodes and decodes a custom type.

Original Hive and Hive CE support adapters with:

```dart
abstract class TypeAdapter<T> {
  int get typeId;

  T read(BinaryReader reader);

  void write(BinaryWriter writer, T obj);
}
```

The registered `typeId` is persisted into stored data and therefore forms part of the schema. Hive documentation explicitly requires type IDs to remain unique and stable.

---

# Original Hive Adapter Generation

Use `hive_generator`.

```dart
import 'package:hive/hive.dart';

part 'user_cache.g.dart';

@HiveType(typeId: 10)
final class UserCache {
  const UserCache({
    required this.id,
    required this.displayName,
    this.avatarUrl,
  });

  @HiveField(0)
  final String id;

  @HiveField(1)
  final String displayName;

  @HiveField(2)
  final String? avatarUrl;
}
```

Generate:

```bash
dart run build_runner build --delete-conflicting-outputs
```

Register:

```dart
Hive.registerAdapter(UserCacheAdapter());
```

Original `HiveField` supports an index and default value.

---

# Hive CE Adapter Generation

Hive CE supports the legacy Hive-style annotation path and adds `GenerateAdapters`, generated registration, schema tracking, reserved type IDs, and support for generating adapters for classes that do not carry Hive annotations.

## Preferred modern CE setup

Model:

```dart
final class UserCache {
  const UserCache({
    required this.id,
    required this.displayName,
    this.avatarUrl,
  });

  final String id;
  final String displayName;
  final String? avatarUrl;
}
```

Adapter declaration:

```dart
import 'package:hive_ce/hive_ce.dart';

import '../models/user_cache.dart';

part 'hive_adapters.g.dart';

@GenerateAdapters(
  [
    AdapterSpec<UserCache>(),
  ],
  firstTypeId: 32,
  reservedTypeIds: {
    0,
    1,
    2,
    3,
  },
)
final class HiveAdapters {}
```

Generate:

```bash
dart run build_runner build --delete-conflicting-outputs
```

The CE generator produces adapter output and registrar/schema metadata. The generated registrar lets code call:

```dart
Hive.registerAdapters();
```

after importing its generated registrar file. `reservedTypeIds` is supported specifically to prevent generator allocation into IDs that must remain unavailable.

## Preserve generated schema metadata

**Architecture rule for CE `GenerateAdapters`:** Check the generated schema metadata file into source control and treat it as part of the persistent schema.

Do not:

```text
delete generated schema
regenerate fresh IDs
ship
```

without first proving compatibility.

The CE generator's schema machinery exists specifically to keep automatic field/type allocation stable across generations.

## Do not mix ID strategies casually

If a project contains:

- legacy manually allocated adapters;
- CE automatically allocated adapters;

reserve every existing/manual type ID from automatic generation.

---

# Manual Adapters

Use a manual adapter when:

- data must decode multiple historical binary shapes;
- an incompatible migration needs transitional reading;
- generated adapter behavior is insufficient;
- storage representation must be independent of class structure.

Example:

```dart
import 'package:hive_ce/hive_ce.dart';

final class ProfileCache {
  const ProfileCache({
    required this.id,
    required this.displayName,
  });

  final String id;
  final String displayName;
}

final class ProfileCacheAdapter
    extends TypeAdapter<ProfileCache> {
  @override
  int get typeId => 40;

  @override
  ProfileCache read(BinaryReader reader) {
    final fieldCount = reader.readByte();
    final fields = <int, dynamic>{
      for (var i = 0; i < fieldCount; i++)
        reader.readByte(): reader.read(),
    };

    final id = fields[0];
    final displayName = fields[1];

    if (id is! String || displayName is! String) {
      throw StateError(
        'Invalid persisted ProfileCache record.',
      );
    }

    return ProfileCache(
      id: id,
      displayName: displayName,
    );
  }

  @override
  void write(
    BinaryWriter writer,
    ProfileCache obj,
  ) {
    writer
      ..writeByte(2)
      ..writeByte(0)
      ..write(obj.id)
      ..writeByte(1)
      ..write(obj.displayName);
  }
}
```

Do not create a manual binary format casually. Once deployed, it becomes another schema contract you must maintain.

---

# Type ID Registry

For legacy/manual adapter strategies, centralize IDs.

```dart
abstract final class HiveTypeIds {
  static const userCache = 10;
  static const productCache = 11;
  static const pendingMutation = 12;

  // Retired. Never reuse.
  static const legacyProfile = 13;

  static const settingsSnapshot = 14;
}
```

## Rules

1. A type ID is globally unique within one Hive type registry.
2. Once shipped, treat it as reserved permanently.
3. Do not assign the old type ID to a different Dart type.
4. Keep retired IDs documented.
5. For monorepos, allocate ranges or central coordination.
6. For CE `GenerateAdapters`, use its schema and `reservedTypeIds` rather than duplicating uncontrolled manual allocation.

Original Hive's API documentation explicitly states that type IDs have to be unique and must not change.

## Why never reuse?

Suppose version 1 stores:

```text
typeId 12 → PendingUpload
```

Version 5 deletes that class.

If version 8 reuses:

```text
typeId 12 → PaymentDraft
```

an old record may be decoded by the wrong adapter.

This is data corruption by schema collision.

---

# Field IDs

Field IDs are persistent wire identifiers.

The following is safe:

```dart
@HiveField(0)
final String id;

@HiveField(1)
final String name;
```

Source code ordering may change:

```dart
@HiveField(1)
final String name;

@HiveField(0)
final String id;
```

because the IDs, not declaration order, define persisted fields.

## Never renumber for aesthetics

Bad:

```text
old:
id       = field 0
name     = field 4
email    = field 9

refactor:
id       = field 0
name     = field 1
email    = field 2
```

Do not renumber gaps.

Gaps are harmless.

Incorrect decoding is not.

---

# Schema Evolution Rules

| Change | Risk | Required action |
|---|---:|---|
| Add nullable/defaulted field with new unused field ID | Low–Medium | Preserve old IDs; define missing-value behavior |
| Add required field | Medium | Provide migration/default for old records |
| Remove field | Medium | Stop using it but retire ID permanently |
| Rename Dart field while preserving manual field ID | Usually low | Keep field ID and persisted semantics |
| Rename field under CE automatic schema tracking | Medium–High | Verify generated schema mapping; do not assume rename is detected as same field |
| Change field type | High | Migrate or implement backwards-compatible reader |
| Change nullable → non-nullable | High | Migrate/default all old records first |
| Change enum representation/order | High | Verify adapter representation; provide migration |
| Change type ID | Critical | Treat as new persisted type + migration |
| Reuse old type ID | Critical | Do not do it |
| Reuse retired field ID | Critical | Do not do it |
| Split one model into two | High | Explicit migration |
| Merge models | High | Explicit migration |
| Rename box | High | Copy/migrate keys, validate, then retire old box |
| Change key scheme | High | Key migration |
| Change encryption key | High | Controlled decrypt/re-encrypt migration |
| Dynamic map → typed model | High | Parse/validate/transform every legacy value |
| Switch adapter-generation strategy | High | Verify old binary compatibility with fixtures before release |

---

# Adding a New Persisted Property

## Legacy annotation approach

Old:

```dart
@HiveType(typeId: 10)
final class UserCache {
  const UserCache({
    required this.id,
    required this.name,
  });

  @HiveField(0)
  final String id;

  @HiveField(1)
  final String name;
}
```

New:

```dart
@HiveType(typeId: 10)
final class UserCache {
  const UserCache({
    required this.id,
    required this.name,
    this.avatarUrl,
  });

  @HiveField(0)
  final String id;

  @HiveField(1)
  final String name;

  @HiveField(2)
  final String? avatarUrl;
}
```

Do not change `0` or `1`.

For a non-null field, supply safe old-record behavior:

```dart
@HiveField(
  2,
  defaultValue: false,
)
final bool isPremium;
```

Hive/Hive CE field annotations support defaults; Hive CE additionally supports constructor-default-aware generation.

---

# Removing a Field

Old:

```text
0 → id
1 → name
2 → avatarUrl
```

New:

```text
0 → id
1 → name

2 → RETIRED
```

Do **not** later do:

```text
2 → creditCardToken
```

Maintain a schema comment/registry or CE schema metadata.

---

# Renaming a Field

## Manual/HiveField strategy

A Dart name can change while keeping the field ID:

```dart
@HiveField(1)
final String displayName;
```

If old field ID `1` previously represented `name` with the same semantics and type, existing binary data can still map through ID `1`.

## CE `GenerateAdapters`

Automatic generation uses schema metadata to track field allocation.

A source-code rename can appear to the generator as:

```text
old field disappeared
new field appeared
```

unless the migration/schema tooling is explicitly used.

Therefore:

> **Before renaming a CE automatically generated persistent property, inspect the generated schema diff and prove that old field identity remains mapped correctly.**

Do not rely on the compiler to detect this persistence change.

---

# Changing a Field Type

Bad:

```text
v1:
field 3 → int cents

v2:
field 3 → String formattedPrice
```

Old stored binary still contains an `int`.

Use one of:

1. Keep old field `3`, add new field `4`, migrate, then retire `3`.
2. Write a backwards-compatible manual adapter able to read both shapes.
3. Run an application-level migration before switching the active model.

Prefer a new field ID for semantically different representation.

---

# Migration Architecture

Hive does not provide a general relational-style application schema migration engine.

Create one.

Use a metadata box:

```text
storage_meta
  schema_version → 5
  migration_cursor → ...
```

Recommended flow:

```text
Initialize Hive
↓
Register adapters required to read current + legacy data
↓
Open migration metadata
↓
Read schema version
↓
Run vN → vN+1
↓
Validate result
↓
Persist version N+1
↓
Repeat
↓
Open normal application storage
```

## Migration requirements

Every production migration should be:

- versioned;
- sequential;
- idempotent or resumable;
- validated;
- tested with old data;
- observable;
- bounded in memory.

## Migration runner

```dart
import 'package:hive_ce/hive_ce.dart';

abstract interface class StorageMigration {
  int get fromVersion;
  int get toVersion;

  Future<void> run();

  Future<void> validate();
}

final class StorageMigrator {
  StorageMigrator({
    required this.metaBox,
    required List<StorageMigration> migrations,
  }) : _migrations = {
          for (final migration in migrations)
            migration.fromVersion: migration,
        };

  static const schemaVersionKey =
      'schema_version';

  final Box<Object?> metaBox;
  final Map<int, StorageMigration> _migrations;

  Future<void> migrateTo(
    int targetVersion,
  ) async {
    var current =
        metaBox.get(
          schemaVersionKey,
          defaultValue: 0,
        ) as int;

    while (current < targetVersion) {
      final migration = _migrations[current];

      if (migration == null) {
        throw StateError(
          'Missing storage migration from version $current.',
        );
      }

      if (migration.toVersion != current + 1) {
        throw StateError(
          'Migration ${migration.fromVersion}'
          ' → ${migration.toVersion} is not sequential.',
        );
      }

      await migration.run();
      await migration.validate();

      await metaBox.put(
        schemaVersionKey,
        migration.toVersion,
      );
      await metaBox.flush();

      current = migration.toVersion;
    }

    if (current > targetVersion) {
      throw StateError(
        'Stored schema $current is newer than'
        ' supported schema $targetVersion.',
      );
    }
  }
}
```

## Why persist version last?

If the migration crashes before validation completes, the old schema version remains.

On restart, the migration runs again.

That only works if migration steps are idempotent/resumable.

---

# Crash-Safe Migration Design

A sequence such as:

```dart
await oldBox.delete(key);
await newBox.put(key, transformed);
```

is unsafe.

If the process stops between operations, the record is lost.

Prefer:

```text
read old
↓
write new
↓
validate new
↓
mark migration progress
↓
delete old later
```

For critical data:

```text
Old box remains authoritative
↓
Copy to new box
↓
Validate every required invariant
↓
Commit metadata pointer/version
↓
Retain old data for at least one successful release/migration window when feasible
↓
Delete obsolete box in a later controlled migration
```

This is an architecture strategy, not an atomic Hive transaction guarantee.

---

# Migration Example: Rename Keys

Suppose old keys:

```text
"profile:<userId>"
```

must become:

```text
"user-profile:<userId>"
```

```dart
import 'package:hive_ce/hive_ce.dart';

final class RenameProfileKeysMigration
    implements StorageMigration {
  RenameProfileKeysMigration(this.box);

  final Box<Object?> box;

  @override
  int get fromVersion => 2;

  @override
  int get toVersion => 3;

  @override
  Future<void> run() async {
    final oldKeys = box.keys
        .whereType<String>()
        .where(
          (key) =>
              key.startsWith('profile:'),
        )
        .toList(growable: false);

    for (final oldKey in oldKeys) {
      final suffix = oldKey.substring(
        'profile:'.length,
      );
      final newKey =
          'user-profile:$suffix';

      if (!box.containsKey(newKey)) {
        final value = box.get(oldKey);

        await box.put(
          newKey,
          value,
        );
      }

      if (box.containsKey(newKey)) {
        await box.delete(oldKey);
      }
    }
  }

  @override
  Future<void> validate() async {
    final hasOldKey = box.keys
        .whereType<String>()
        .any(
          (key) =>
              key.startsWith('profile:'),
        );

    if (hasOldKey) {
      throw StateError(
        'Profile-key migration incomplete.',
      );
    }
  }
}
```

This is restartable because an existing migrated key is recognized.

---

# Migration Example: Move Between Boxes

```dart
import 'package:hive_ce/hive_ce.dart';

final class MoveDraftsMigration
    implements StorageMigration {
  MoveDraftsMigration({
    required this.legacyBox,
    required this.draftsBox,
  });

  final Box<Object?> legacyBox;
  final Box<Object?> draftsBox;

  @override
  int get fromVersion => 3;

  @override
  int get toVersion => 4;

  @override
  Future<void> run() async {
    final draftKeys = legacyBox.keys
        .whereType<String>()
        .where(
          (key) =>
              key.startsWith('draft:'),
        )
        .toList(growable: false);

    for (final key in draftKeys) {
      final value = legacyBox.get(key);

      if (!draftsBox.containsKey(key)) {
        await draftsBox.put(key, value);
      }

      if (draftsBox.containsKey(key)) {
        await legacyBox.delete(key);
      }
    }
  }

  @override
  Future<void> validate() async {
    final remaining = legacyBox.keys
        .whereType<String>()
        .any(
          (key) =>
              key.startsWith('draft:'),
        );

    if (remaining) {
      throw StateError(
        'Legacy draft values remain.',
      );
    }
  }
}
```

For irreplaceable data, delay deletion until stronger validation or a later release.

---

# Large Migrations

Do not transform a million values into one in-memory list.

Use progress metadata:

```text
schema_version = 4
migration_4_5_last_key = "..."
```

Process chunks:

```text
1000 records
↓
persist cursor
↓
yield
↓
next chunk
```

On restart, resume from the cursor.

For a feature-specific large migration, consider gating only that feature rather than blocking the entire application startup.

---

# Application-Level Atomicity

Do not claim relational transaction semantics for arbitrary Hive operations.

A single Hive write API can be internally grouped and durable according to Hive's storage implementation, but:

```dart
await boxA.put('a', valueA);
await boxB.put('b', valueB);
```

is not one application-level cross-box transaction.

The process can terminate after the first operation.

## If an invariant requires all-or-nothing multi-record updates

Consider:

- storing one aggregate record instead;
- using a write-ahead application operation record;
- designing idempotent recovery;
- choosing a transactional database.

Do not emulate a bank ledger with loosely coordinated key-value writes if strong atomicity is a core requirement.

---

# Package Migration: Hive → Hive CE

Hive CE explicitly describes itself as a continuation of Hive v2 and has included a first-party migration guide from `hive` since its 2.4.x line.

Treat migration as compatibility-sensitive even when the APIs look nearly interchangeable.

## Safe migration procedure

### 1. Inventory the existing installation

Record:

- `hive` version;
- `hive_flutter` version;
- `hive_generator` version;
- every box name;
- normal vs lazy;
- encrypted boxes;
- adapters;
- type IDs;
- field IDs;
- manual adapters;
- custom compaction;
- production schema/migration version.

### 2. Capture fixtures

Before modifying packages, preserve representative production-format data created with the original Hive version.

Include:

- each important box;
- oldest supported schema;
- current schema;
- encrypted samples using test-only keys;
- records with removed/legacy fields.

### 3. Replace packages deliberately

Typical Flutter dependency direction becomes:

```text
hive              → hive_ce
hive_flutter      → hive_ce_flutter
hive_generator    → hive_ce_generator
```

Update imports accordingly.

Do not mix original and CE `TypeAdapter` types accidentally across API boundaries.

### 4. Preserve IDs

Do not change:

- existing type IDs;
- existing field IDs;
- box names;
- key formats;

during the package migration unless a separate data migration is implemented.

### 5. Preserve encryption configuration

The box must still use the correct existing encryption key/cipher policy.

Do not regenerate an encryption key when upgrading a package.

### 6. Preserve adapter behavior first

Do not combine:

```text
Hive → Hive CE
+
manual adapter → new generated adapter
+
box rename
+
schema refactor
```

into one release if valuable user data exists.

First prove package compatibility.

Then refactor adapter generation separately.

### 7. Test old fixtures under Hive CE

Test:

```text
Hive-created data
↓
register same logical adapters in Hive CE
↓
open
↓
read every critical record
↓
write new record
↓
restart/reopen
↓
verify
```

### 8. Roll out defensively

For non-reconstructable user data:

- preserve backup/recovery strategy;
- add migration diagnostics;
- never auto-delete the box solely because open failed.

## CE automatic-adapter migration

If an original Hive project uses manual `@HiveType` / `@HiveField` IDs, do not immediately let automatic CE generation allocate new IDs without feeding/reserving the established schema.

The CE generator includes schema-migration tooling and `reservedTypeIds`; use them to preserve existing allocation.

## Compatibility claim discipline

Do not promise:

```text
“Changing package imports is zero-risk for every Hive app.”
```

without validating:

- adapters;
- encryption;
- current package versions;
- box format;
- legacy records.

---
