# Reference Guide

Selection, architecture, initialization, boxes, lifecycle, normal vs lazy boxes, and data modeling.

## Contents

- Hive & Hive CE Persistence Engineering Skill
  - Purpose
- When to Use This Skill
- Package Selection: Hive vs Hive CE
  - Decision table
  - Hive CE
  - Original Hive
  - Package ownership matters
- When NOT to Use Hive
  - Prefer SQLite/Drift or another relational store when
  - Prefer secure storage when
  - Prefer a preferences store when
  - Prefer file storage when
  - Prefer memory only when
- Core Principles
- Architecture
  - UI
  - State-management layer
  - Repository
  - Local data source
  - Hive/Hive CE
- Initialization
  - Hive CE Flutter
  - Pure Dart / custom native directory
  - Adapter registration must precede reads
  - CE generated registrar
  - Do not block startup unnecessarily
- Box Design
  - What is a box?
  - Box naming
  - How many boxes?
  - Box decision framework
- Box Ownership and Lifecycle
  - Reuse an open box
  - Important configuration rule
  - Application-lifetime boxes
  - Feature boxes
  - Session boxes
- Normal Box vs Lazy Box
  - Choose a normal box when
  - Choose a lazy box when
  - Do not use lazy boxes blindly
- Data Modeling
  - Primitive persistence
  - Custom object persistence
  - Persistent DTO vs domain entity
  - Avoid long-lived dynamic maps

---

# Hive & Hive CE Persistence Engineering Skill

## Purpose

Use this skill to design, implement, review, migrate, debug, secure, test, and optimize local persistence in production Flutter/Dart applications that use Hive or Hive CE.

Apply these instructions when deciding whether Hive-style key-value persistence is appropriate, choosing between Hive and Hive CE, defining boxes and persistent models, managing `TypeAdapter` compatibility, evolving schemas without data loss, implementing versioned migrations, handling encryption, integrating persistence into repositories and state management, supporting Flutter Web and isolates, diagnosing corruption, and reviewing storage performance.

The highest-priority rule is:

> **Persisted data is part of the application's long-lived external contract. A Dart model change is not safe merely because the new code compiles.**

This skill follows the supplied production persistence requirements.

### Current package baseline

As of this skill's research baseline:

- `hive_ce` stable is `2.19.3`, is published by the Hive CE community publisher, supports Android, iOS, Linux, macOS, web, and Windows, and describes itself as a continuation of Hive v2. Hive CE adds isolate support through `IsolatedHive`, Flutter Web/WASM support, `GenerateAdapters`, generated registrar support, a larger type-ID range, constructor defaults, `Set`, `Duration`, Freezed support, and other fixes.
- `hive_ce_generator` is actively released in the `1.11.x` line and currently includes `GenerateAdapters`, schema-migration tooling, `reservedTypeIds`, `ignoredFields`, and registrar generation.
- Original `hive` stable remains `2.2.3`, published four years ago; its latest published prerelease is the old `4.0.0-dev.2`. Original `hive_flutter` stable is `1.1.0`, published five years ago, while `hive_generator` stable is `2.0.1`, published two years ago.

**Architecture recommendation:** For a new Dart 3+ application where Hive's key-value model fits, prefer **Hive CE** unless a concrete project constraint requires original Hive. This recommendation is based on current first-party release activity, CE's continuation of Hive v2, its current fixes/features, and modern tooling; it is not a claim that the original Hive package has been formally deprecated by its publisher.

### Evidence terminology

Interpret guidance using these labels:

- **Hive behavior** — behavior documented by original Hive.
- **Hive CE behavior** — behavior documented by Hive CE or verified in its source.
- **Official recommendation** — guidance explicitly stated in first-party material.
- **Architecture recommendation** — production guidance inferred from documented behavior.
- **General persistence practice** — database/storage guidance that is not a Hive API guarantee.

Do not present architectural inference as a package guarantee.

---

# When to Use This Skill

Apply this skill for tasks involving:

- persistent local data;
- local caches;
- offline application data;
- Hive/Hive CE setup;
- box creation or refactoring;
- model persistence;
- `TypeAdapter` changes;
- type-ID allocation;
- field-ID changes;
- schema migration;
- cache invalidation;
- encryption;
- compaction;
- storage growth;
- lazy boxes;
- watchers;
- repository integration;
- Bloc/Cubit persistence integration;
- Flutter Web persistence;
- isolate access;
- package migration from Hive to Hive CE;
- corrupted boxes;
- migration failures;
- backwards-compatibility tests;
- storage performance;
- write-frequency problems;
- logout/account-switch cleanup.

Do not automatically apply Hive merely because data needs to survive a widget rebuild. First decide whether persistence is actually required and which storage technology fits the access pattern.

---

# Package Selection: Hive vs Hive CE

## Decision table

| Situation | Preferred decision |
|---|---|
| New Dart 3+ project needing simple fast key-value/object persistence | Prefer Hive CE |
| Existing healthy Hive CE project | Stay on Hive CE and update deliberately |
| Existing original Hive 2 production project | Do not migrate blindly; evaluate CE migration with production fixtures |
| Existing Hive project needs multi-isolate access | Strong reason to evaluate Hive CE `IsolatedHive` or another database |
| Existing project requires Dart 2 compatibility | Original Hive 2 may remain necessary |
| New project needs relational joins/foreign-key-style integrity | Use a relational database instead |
| New project needs rich indexed filtering/query language | Evaluate SQLite/Drift, Isar, or another query-oriented database |
| Only a few primitive preferences | Prefer a lighter preferences API |
| Authentication secrets/private cryptographic material | Prefer secure platform storage |
| Large binary/media storage | Use the file system/object storage + metadata |
| Temporary runtime state | Keep it in memory |
| Existing Hive app with irreplaceable local data | Treat package migration as a production data migration even if APIs look compatible |

## Hive CE

Prefer Hive CE for new suitable applications because current first-party evidence shows active stable releases and modern features, including:

- `IsolatedHive`;
- Flutter Web/WASM support;
- automatic adapter generation with `GenerateAdapters`;
- generated `HiveRegistrar`;
- larger type-ID range (`65439` instead of original Hive v2's `223`);
- constructor parameter defaults;
- `Set`;
- built-in `Duration`;
- current fixes around isolates and serialization.

Hive CE currently requires Dart 3; current stable releases on pub.dev require a modern Dart 3 SDK.

## Original Hive

Do not describe original Hive as identical to Hive CE.

Original stable Hive 2.2.3 remains available and may still be valid for an established application where:

- existing production storage is stable;
- Dart 2 support remains necessary;
- migration risk is greater than the immediate benefit;
- no unsupported concurrency/query requirement exists.

However, original Hive's stable package line and Flutter extension have not seen recent stable releases compared with Hive CE.

## Package ownership matters

Treat the packages as separate dependencies maintained by separate publishers.

Do not assume:

```text
hive == hive_ce
```

at the package-management level merely because APIs are related.

Imports, generator dependencies, Flutter bindings, changelogs, fixes, and future compatibility are separate.

---

# When NOT to Use Hive

Choose another persistence technology when the problem does not match a key-value/object store.

## Prefer SQLite/Drift or another relational store when

The application relies heavily on:

- joins;
- relational constraints;
- many-to-many relationships;
- complex predicates;
- indexed sorting/filtering;
- aggregate queries;
- transactional multi-table invariants;
- reporting queries;
- foreign-key semantics.

Do not load an entire Hive box and repeatedly implement a database query engine in Dart.

## Prefer secure storage when

The data is primarily:

- refresh tokens;
- private keys;
- cryptographic secrets;
- short PIN-derived secrets;
- credential material.

Encrypted Hive can be useful for larger encrypted datasets, but secure platform storage is generally a better boundary for small high-value secrets and encryption keys.

## Prefer a preferences store when

You only need values such as:

- selected theme;
- onboarding-completed flag;
- language preference;
- a small timestamp;
- one feature toggle.

Do not introduce adapters and migration infrastructure for five trivial settings unless the project already standardizes on Hive for good reason.

## Prefer file storage when

The data is:

- images;
- video;
- audio;
- documents;
- large binary archives.

Persist metadata in Hive if useful:

```text
asset ID
file path
hash
MIME type
size
download timestamp
```

Keep the large binary payload in the file system.

## Prefer memory only when

State does not need to survive process termination.

Examples:

- selected tab;
- current animation;
- temporary filter menu state;
- transient form focus;
- request progress.

---

# Core Principles

1. **Treat type IDs and field IDs as persisted schema identifiers.**
2. **Never casually reuse a retired type ID.**
3. **Never change an existing field ID because a field moved in source code.**
4. **Design migrations before shipping incompatible schema changes.**
5. **Keep adapter registration deterministic and centralized.**
6. **Open boxes through a deliberate owner; do not scatter `Hive.openBox` throughout the codebase.**
7. **Reuse already-open boxes.**
8. **Use typed boxes for persistent custom-object collections where practical.**
9. **Use `dynamic` only at intentionally untyped boundaries such as migration metadata or a small preferences box.**
10. **Keep persistence behind repositories/local data sources in nontrivial applications.**
11. **Do not leak `Box` into unrelated presentation/business layers.**
12. **Choose normal vs lazy boxes from measured memory/access requirements.**
13. **Do not treat Hive as a relational query engine.**
14. **Do not assume multiple application writes form one atomic transaction.**
15. **Await important writes and handle failures.**
16. **Do not rely on application termination callbacks to persist critical information.**
17. **Use encryption only with separately protected keys.**
18. **Do not store the Hive encryption key inside the Hive box it encrypts.**
19. **Classify data before choosing a corruption-recovery strategy.**
20. **Test the current application against old persisted formats.**
21. **Keep migration operations restartable/idempotent.**
22. **Do not clear valuable data because migration code is inconvenient.**
23. **Use `IsolatedHive` when Hive CE persistence genuinely needs supported multi-isolate access.**
24. **Do not use direct original Hive access across isolates as if it were supported multi-isolate storage.**
25. **Debounce high-frequency persistence.**
26. **Use compaction intentionally; more compaction is not automatically better.**
27. **Separate database schema changes from unrelated refactors where possible.**
28. **For CE's generated schema tooling, preserve generated schema metadata in source control.**

Original Hive's `TypeRegistry` documentation explicitly states that type IDs must be unique and must not change.

---

# Architecture

Use this default flow:

```text
UI
↓
Bloc / Cubit / ViewModel
↓
Repository
↓
Local Data Source
↓
Hive / Hive CE
```

## UI

Own:

- rendering;
- user interaction;
- transient UI state.

Avoid:

```dart
final box = Hive.box<UserCache>('users');
final user = box.get(userId);
```

throughout widgets.

## State-management layer

Own:

- loading states;
- user intent;
- feature state;
- synchronization decisions at presentation level.

Do not make Bloc/Cubit responsible for:

- adapter registration;
- box paths;
- type IDs;
- encryption-key handling.

## Repository

Own:

- application-facing persistence behavior;
- combining remote and local data;
- cache policy;
- offline strategy;
- mapping persistence failures into application failures.

## Local data source

Own:

- box reads/writes;
- persistent keys;
- storage models;
- raw persistence exceptions;
- storage-specific migration helpers.

## Hive/Hive CE

Own:

- binary serialization;
- box storage;
- registered adapters;
- low-level reads/writes;
- compaction;
- encryption cipher execution;
- reactive box events.

---

# Initialization

## Hive CE Flutter

Use `hive_ce_flutter` for Flutter-specific initialization.

```dart
import 'package:flutter/material.dart';
import 'package:hive_ce_flutter/hive_flutter.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Hive.initFlutter();

  runApp(const App());
}

final class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      home: Scaffold(
        body: Center(
          child: Text('App'),
        ),
      ),
    );
  }
}
```

`Hive.initFlutter()` initializes Hive using the application's documents location on supported native Flutter platforms; Hive CE's Flutter extension also supports backend selection for current web behavior. Original `hive_flutter` exposes a similar helper with the older signature.

## Pure Dart / custom native directory

Use explicit initialization when the application owns the storage path:

```dart
import 'package:hive_ce/hive_ce.dart';

Future<void> initializeStorage(String directoryPath) async {
  Hive.init(directoryPath);
  await Hive.openBox<String>('settings');
}
```

Do not invent custom file paths in Flutter if platform application directories already solve the requirement.

## Adapter registration must precede reads

Register every custom adapter before opening boxes that contain those types.

```dart
Hive.registerAdapter(UserCacheAdapter());

final users = await Hive.openBox<UserCache>(
  'user_cache',
);
```

## CE generated registrar

With current Hive CE generation, register generated adapters centrally:

```dart
import 'package:flutter/material.dart';
import 'package:hive_ce_flutter/hive_flutter.dart';

import 'hive/hive_registrar.g.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Hive.initFlutter();
  Hive.registerAdapters();

  runApp(const App());
}

final class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      home: SizedBox.shrink(),
    );
  }
}
```

Hive CE officially includes a generated `HiveRegistrar` capability intended to register generated adapters in one operation.

## Do not block startup unnecessarily

### Open before `runApp` when

The initial UI cannot be built correctly without storage.

Examples:

- locale/theme is needed before constructing the root app;
- encrypted database setup determines whether login can proceed;
- critical migration must finish before any feature can access data.

### Defer when

Storage is feature-specific:

```text
App starts
↓
User opens catalog feature
↓
Catalog storage service opens catalog box
```

Do not open 20 large boxes during startup merely because they may be used later.

---

# Box Design

## What is a box?

Hive boxes are key-value containers.

On native/non-browser platforms, each box is stored separately in Hive's storage directory. In browsers, boxes are backed by IndexedDB storage rather than native files.

## Box naming

Use stable machine-oriented names:

```text
app_settings
catalog_cache
profile_cache
sync_queue
storage_meta
```

Avoid names derived from translated UI text.

Hive CE normalizes box names and applies box-name constraints internally. Treat names as case-insensitive identifiers and do not rely on `"Users"` and `"users"` being different boxes.

## How many boxes?

Group data by:

- lifecycle;
- security policy;
- access pattern;
- migration ownership;
- expected size.

Good:

```text
app_settings
auth_public_metadata
catalog_cache
sync_queue
```

Potentially good session design:

```text
user_42_cache
```

if lifecycle/deletion requirements justify per-user boxes.

### Avoid one giant box

Bad:

```text
app_data
  ├── theme
  ├── 50,000 products
  ├── session secrets
  ├── drafts
  ├── analytics
  ├── chat messages
  └── migration metadata
```

Problems:

- unrelated migrations become coupled;
- encryption policy becomes all-or-nothing;
- startup/memory characteristics become coupled;
- logout cleanup becomes dangerous.

### Avoid hundreds of tiny boxes

Bad:

```text
theme_box
language_box
font_size_box
sort_mode_box
last_tab_box
```

Box management/storage overhead becomes harder to reason about without providing meaningful lifecycle separation.

## Box decision framework

Create a separate box when at least one is materially different:

- lifecycle;
- encryption policy;
- size/access strategy;
- migration ownership;
- cleanup/reconstruction policy.

---

# Box Ownership and Lifecycle

Assign one owner.

Example:

```dart
import 'package:hive_ce/hive_ce.dart';

final class AppLocalStorage {
  AppLocalStorage();

  static const settingsBoxName = 'app_settings';

  Box<Object?>? _settings;

  Future<void> open() async {
    if (_settings != null && _settings!.isOpen) {
      return;
    }

    _settings = await Hive.openBox<Object?>(
      settingsBoxName,
    );
  }

  Box<Object?> get settings {
    final box = _settings;

    if (box == null || !box.isOpen) {
      throw StateError(
        'AppLocalStorage.open() must complete before use.',
      );
    }

    return box;
  }

  Future<void> close() async {
    final box = _settings;

    if (box != null && box.isOpen) {
      await box.close();
    }

    _settings = null;
  }
}
```

## Reuse an open box

Hive CE's current implementation returns an existing open box when the same box is requested again with a compatible generic type. It also coordinates concurrent opens. Do not repeatedly call `openBox` as normal read behavior.

Prefer:

```dart
final box = Hive.box<UserCache>('user_cache');
```

after centralized initialization.

## Important configuration rule

Because reopening an already-open box returns that existing instance, do not expect a second `openBox` call to replace:

- encryption cipher;
- compaction strategy;
- lazy/normal semantics;
- generic type.

Configure a box correctly at first ownership/open.

## Application-lifetime boxes

Appropriate for:

- settings;
- small persistent app metadata;
- frequently accessed cache metadata.

Open once; keep open; close during controlled test shutdown or storage teardown.

## Feature boxes

Use feature ownership if the box is:

- large;
- rarely used;
- feature-specific.

Opening lazily can reduce startup work.

## Session boxes

On logout/account switch:

- close relevant boxes;
- clear or delete user-specific data according to product policy;
- ensure next account cannot read the previous account's cached data;
- preserve intentionally retained offline data only when account identity remains encoded safely.

---

# Normal Box vs Lazy Box

Hive's normal boxes keep values in memory and provide synchronous reads. `LazyBox` does not keep values in memory; each value read is loaded from the backend and is therefore asynchronous.

| Concern | `Box<T>` | `LazyBox<T>` |
|---|---|---|
| Values retained in memory | Yes | No |
| Read API | Synchronous | Asynchronous |
| Repeated same-value reads | Fast in-memory | Backend read each time |
| Initial value loading | Reads values during box open | Avoids loading all values |
| Large values | Can consume substantial memory | Better candidate |
| Frequently accessed dataset | Usually preferable | Repeated I/O may hurt |
| Small settings box | Prefer normal | Usually unnecessary |
| Large infrequently-read archive/cache | May be memory-heavy | Strong candidate |
| UI synchronous access | Easy | Requires async architecture |
| Keys/index metadata | Still managed | Lazy does not eliminate all metadata cost |

## Choose a normal box when

- dataset fits comfortably in memory;
- reads are frequent;
- synchronous reads simplify the feature;
- startup/open cost is acceptable.

## Choose a lazy box when

- values are large;
- only a small subset is read per session;
- reducing resident value memory matters;
- async reads are acceptable.

## Do not use lazy boxes blindly

A lazy box can turn:

```text
100 repeated memory reads
```

into:

```text
100 backend reads
```

Cache frequently used values at the repository/application layer when justified.

---

# Data Modeling

## Primitive persistence

Prefer primitives for simple stable settings.

```dart
await settingsBox.put(
  'dark_mode_enabled',
  true,
);
```

Suitable for:

- booleans;
- strings;
- numbers;
- simple lists/maps with controlled structure.

Hive CE also supports additional built-in types such as `Set` and `Duration` compared with original Hive v2.

## Custom object persistence

Use a typed adapter when a record has a durable schema.

```dart
final class UserCache {
  const UserCache({
    required this.id,
    required this.displayName,
    required this.cachedAtEpochMs,
  });

  final String id;
  final String displayName;
  final int cachedAtEpochMs;
}
```

## Persistent DTO vs domain entity

Prefer a persistence-specific model when:

- server/domain model evolves independently;
- cache metadata is storage-specific;
- domain contains computed values;
- migrations should not dictate domain architecture.

Example:

```text
User DTO from API
↓
Domain User
↓
UserCache persistence model
```

One class can serve multiple roles only when the schemas genuinely align and future coupling is acceptable.

## Avoid long-lived dynamic maps

Bad:

```dart
final Map<dynamic, dynamic> user = {
  'id': '42',
  'name': 'Ada',
  'whatever': true,
};
```

used throughout the app.

Dynamic records move schema errors from generation/compilation into runtime.

Use raw maps for:

- migration staging;
- truly schemaless metadata;
- very small internal values.

---
