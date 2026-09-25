# Reference Guide

Anti-patterns, implementation/review workflows, migration/performance/security checklists, and production gates.

## Contents

- Common Anti-Patterns
  - 1. Calling `Hive.box(...)` throughout widgets
  - 2. Opening the same box repeatedly
  - 3. One giant box
  - 4. Excessive tiny boxes
  - 5. Persisting domain/UI classes without schema thought
  - 6. Reusing type IDs
  - 7. Accidentally changing field IDs
  - 8. Changing persisted field type directly
  - 9. Deleting data because migration is hard
  - 10. Using `dynamic` everywhere
  - 11. Raw maps as permanent application model
  - 12. Secrets in plain Hive
  - 13. Hardcoded encryption key
  - 14. Logging encryption key
  - 15. Huge media in a box
  - 16. Loading huge box into memory unnecessarily
  - 17. Lazy box everywhere
  - 18. Persisting every keystroke
  - 19. No test cleanup
  - 20. Clearing critical data as generic recovery
  - 21. Saving only on app termination
  - 22. Assuming automatic cache expiration
  - 23. Assuming automatic offline sync
  - 24. Large migration without validation
  - 25. Editing generated adapters
  - 26. Shipping adapter change without old-data test
  - 27. Bloc/Cubit talks directly to Hive
  - 28. Unrelated layers access boxes
  - 29. Assuming cross-box operations are atomic
  - 30. Direct multi-isolate box access
- New Feature Implementation Workflow
  - 1. Determine whether persistence is required
  - 2. Choose persistence technology
  - 3. Choose Hive or Hive CE
  - 4. Classify the data
  - 5. Define access/query patterns
  - 6. Design boxes
  - 7. Choose normal or lazy
  - 8. Design persistence model
  - 9. Allocate schema IDs
  - 10. Define key strategy
  - 11. Define security
  - 12. Define ownership
  - 13. Implement local data source
  - 14. Integrate repository
  - 15. Design migration before incompatible change
  - 16. Add tests
  - 17. Add historical compatibility test
  - 18. Review write frequency
  - 19. Review memory/storage growth
  - 20. Review corruption recovery
  - 21. Generate adapters
  - 22. Run analysis/tests
- Existing-Code Review Workflow
  - Package baseline
  - Initialization
  - Boxes
  - Adapters
  - Field IDs
  - Generated schema
  - Migrations
  - Encryption
  - Keys
  - UI access
  - Watchers
  - Writes
  - Large records
  - Compaction
  - Tests
- Refactoring Rules
- Code Review Checklist
  - Package selection
  - Architecture
  - Boxes
  - Schema
  - Generation
  - Migrations
  - Security
  - Writes
  - Performance
  - Lifecycle
  - Tests
- Migration Checklist
- Performance Checklist
- Security Checklist
- Production Readiness Checklist
  - Selection
  - Initialization
  - Schema
  - Migration
  - Security
  - Data integrity
  - Performance
  - Concurrency
  - Platform
  - Tests
- Quick Reference

---

# Common Anti-Patterns

## 1. Calling `Hive.box(...)` throughout widgets

**Bad**

```dart
Widget build(BuildContext context) {
  final box =
      Hive.box<UserCache>('users');

  final user =
      box.get('42');

  return Text(
    user?.displayName ?? '',
  );
}
```

**Why it is problematic**

Presentation is coupled to storage naming, model, lifecycle, and error behavior.

**Better**

Consume repository/state-management state.

---

## 2. Opening the same box repeatedly

**Bad**

```dart
Future<UserCache?> loadUser(
  String id,
) async {
  final box =
      await Hive.openBox<UserCache>(
    'users',
  );

  return box.get(id);
}
```

for every read.

**Why it is problematic**

Box opening is lifecycle configuration, not query behavior.

**Better**

Open once through the box/storage owner and inject the box/data source.

---

## 3. One giant box

**Bad**

```text
everything
```

contains every application concern.

**Why it is problematic**

Unrelated lifetimes, migration policies, encryption requirements, and memory profiles become coupled.

**Better**

Group by meaningful persistence boundary.

---

## 4. Excessive tiny boxes

**Bad**

One box for every setting.

**Why it is problematic**

Operational complexity rises without lifecycle benefit.

**Better**

Use one cohesive settings box.

---

## 5. Persisting domain/UI classes without schema thought

**Bad**

Annotate every current domain field merely because it exists.

**Why it is problematic**

A UI/domain refactor becomes a database migration.

**Better**

Use a persistence DTO when schemas should evolve independently.

---

## 6. Reusing type IDs

**Bad**

```dart
// v1
typeId 12 = OldProfile

// v5
typeId 12 = PaymentRecord
```

**Why it is problematic**

Old data can be decoded with the wrong adapter.

**Better**

Retire ID `12` permanently.

---

## 7. Accidentally changing field IDs

**Bad**

```dart
// Before
@HiveField(5)
final String email;

// After
@HiveField(2)
final String email;
```

**Why it is problematic**

Persisted field identity changed.

**Better**

Keep `5`.

---

## 8. Changing persisted field type directly

**Bad**

```text
field 2: int → String
```

without migration.

**Why it is problematic**

Old records still contain the old representation.

**Better**

Add a new field/migrate or implement backwards-compatible decoding.

---

## 9. Deleting data because migration is hard

**Bad**

```dart
try {
  await Hive.openBox('data');
} catch (_) {
  await Hive.deleteBoxFromDisk(
    'data',
  );
}
```

**Why it is problematic**

A temporary adapter/configuration error can destroy irreplaceable data.

**Better**

Classify data and diagnose first.

---

## 10. Using `dynamic` everywhere

**Bad**

```dart
Box<dynamic>
Map<dynamic, dynamic>
```

throughout repositories and UI.

**Why it is problematic**

Schema failures become runtime bugs.

**Better**

Use typed boxes/models for durable structured data.

---

## 11. Raw maps as permanent application model

**Bad**

```dart
final name =
    record['profile']['name'];
```

throughout the app.

**Better**

Decode at the persistence boundary.

---

## 12. Secrets in plain Hive

**Bad**

```dart
await box.put(
  'refresh_token',
  token,
);
```

in an ordinary box.

**Better**

Use platform secure storage or a carefully justified encrypted-storage architecture.

---

## 13. Hardcoded encryption key

**Bad**

```dart
const hiveKey = [
  // 32 static bytes
];
```

**Better**

Generate/store key through a secure key-storage boundary.

---

## 14. Logging encryption key

**Bad**

```dart
debugPrint(
  'Hive key: $key',
);
```

**Better**

Never log it.

---

## 15. Huge media in a box

**Bad**

```dart
await box.put(
  videoId,
  enormousVideoBytes,
);
```

**Better**

Use a file and persist metadata/path/hash.

---

## 16. Loading huge box into memory unnecessarily

**Bad**

```dart
final all =
    box.toMap();
```

for one lookup.

**Better**

Use keyed access, lazy box, or a more query-appropriate store.

---

## 17. Lazy box everywhere

**Bad**

Every box is lazy “for performance.”

**Why it is problematic**

Frequently accessed values now require repeated backend reads.

**Better**

Choose from actual access pattern.

---

## 18. Persisting every keystroke

**Bad**

```dart
onChanged: (text) async {
  await box.put(
    'draft',
    text,
  );
}
```

**Better**

Debounce/batch according to acceptable data-loss window.

---

## 19. No test cleanup

**Bad**

Tests share the same box directory indefinitely.

**Better**

Unique temporary directory + `Hive.close()` + deletion.

---

## 20. Clearing critical data as generic recovery

**Bad**

```dart
if (migrationFailed) {
  await box.clear();
}
```

**Better**

Preserve critical records and report migration failure.

---

## 21. Saving only on app termination

**Bad**

Critical form data only saved in lifecycle shutdown callback.

**Better**

Persist while the user works, with a meaningful debounce/checkpoint strategy.

---

## 22. Assuming automatic cache expiration

**Bad**

```text
Hive stored it yesterday,
therefore Hive knows it is stale today.
```

**Better**

Store and evaluate TTL metadata.

---

## 23. Assuming automatic offline sync

**Bad**

```text
persist local mutation → Hive syncs later
```

**Better**

Implement explicit pending-operation/synchronization logic.

---

## 24. Large migration without validation

**Bad**

```text
transform
↓
set schemaVersion = 5
```

without checking results.

**Better**

Transform → validate → commit version.

---

## 25. Editing generated adapters

**Bad**

Modify `*.g.dart` to handle an old field.

**Better**

Change source schema/manual compatibility logic and regenerate.

---

## 26. Shipping adapter change without old-data test

**Bad**

Only test a fresh install.

**Better**

Run old persisted fixtures through the new build.

---

## 27. Bloc/Cubit talks directly to Hive

**Bad**

```dart
final box =
    Hive.box<ProductCache>(
  'products',
);
```

inside every event handler.

**Better**

Inject repository/local data source.

---

## 28. Unrelated layers access boxes

**Bad**

```text
Widget
Analytics
API client
Cubit
Domain entity
```

all reach the same box directly.

**Better**

Define storage ownership.

---

## 29. Assuming cross-box operations are atomic

**Bad**

```dart
await accounts.put(...);
await balances.put(...);
```

followed by assumption both must have committed.

**Better**

Use recovery/idempotency or a transactional database where invariant requires it.

---

## 30. Direct multi-isolate box access

**Bad**

Several isolates independently use ordinary Hive CE or original Hive boxes.

**Better**

For CE, use `IsolatedHive` or centralize storage access through one isolate.

---

# New Feature Implementation Workflow

## 1. Determine whether persistence is required

Ask:

- must it survive process death?
- must it work offline?
- is it reconstructable?

## 2. Choose persistence technology

Evaluate:

- key-value access;
- query complexity;
- relationships;
- transaction needs;
- secret sensitivity;
- payload size.

## 3. Choose Hive or Hive CE

For new compatible Dart 3+ work, default toward Hive CE.

For existing Hive production data, preserve compatibility first.

## 4. Classify the data

Choose one:

```text
disposable cache
reconstructable server data
critical local data
secret
```

This determines recovery/security/migration rigor.

## 5. Define access/query patterns

List actual operations:

```text
get by ID
all recent records
filter by status
sort by date
search text
```

If most are complex scans, Hive may be wrong.

## 6. Design boxes

Group by:

- lifecycle;
- size;
- encryption;
- migration responsibility.

## 7. Choose normal or lazy

Estimate:

- record count;
- average value size;
- access frequency;
- memory budget.

## 8. Design persistence model

Do not simply annotate domain model automatically.

## 9. Allocate schema IDs

For manual adapters:

- assign type ID;
- assign field IDs;
- document retired IDs.

For CE automatic generation:

- configure schema generation;
- reserve existing IDs;
- preserve generated schema metadata.

## 10. Define key strategy

Use stable entity/domain IDs where possible.

## 11. Define security

If encrypted:

```text
secure key storage
↓
cipher
↓
box
```

## 12. Define ownership

Which service:

- opens;
- exposes;
- closes;
- deletes?

## 13. Implement local data source

Keep Hive out of business/presentation code.

## 14. Integrate repository

Define cache/offline behavior explicitly.

## 15. Design migration before incompatible change

Do this **before** shipping the original schema whenever future evolution can be anticipated.

## 16. Add tests

Include:

- CRUD;
- reopen;
- error;
- adapter;
- repository.

## 17. Add historical compatibility test

If the feature ships persistence, future changes will require it.

## 18. Review write frequency

Debounce if needed.

## 19. Review memory/storage growth

Large values? normal vs lazy? compaction?

## 20. Review corruption recovery

What can safely be discarded?

## 21. Generate adapters

Verify generated diff.

## 22. Run analysis/tests

```bash
dart run build_runner build --delete-conflicting-outputs
dart format .
flutter analyze
flutter test
```

Use repository-specific commands where different.

---

# Existing-Code Review Workflow

Before modifying persistent code, inspect all of the following.

## Package baseline

Record:

```text
hive / hive_ce
hive_flutter / hive_ce_flutter
generator
Dart SDK
Flutter SDK
```

## Initialization

Find:

```text
Hive.init
Hive.initFlutter
IsolatedHive
```

Identify storage path/backend.

## Boxes

Inventory:

```text
box name
generic type
normal/lazy
encryption
owner
open time
close time
data importance
```

## Adapters

Record:

```text
type
typeId
generation strategy
manual/generated
registration location
```

## Field IDs

Create a historical table.

## Generated schema

For CE automatic generation, inspect the schema metadata and version-control history.

## Migrations

Determine:

- current schema version;
- every supported migration;
- restart behavior.

## Encryption

Find:

```text
HiveAesCipher
generateSecureKey
encryptionCipher
```

Then locate key storage.

## Keys

Determine identity conventions.

## UI access

Search:

```text
Hive.box
Hive.openBox
```

inside widgets/state management.

## Watchers

Find long-lived subscriptions and lifecycle ownership.

## Writes

Identify:

- unawaited writes;
- high-frequency writes;
- multi-record invariants.

## Large records

Search for:

- `Uint8List`;
- base64;
- blobs;
- giant maps.

## Compaction

Determine custom strategy/manual compaction.

## Tests

Look specifically for old-schema fixtures.

If they do not exist, add characterization fixtures before changing schema.

---

# Refactoring Rules

1. **Preserve persisted compatibility before improving code style.**
2. Do not rename persistent fields and regenerate blindly.
3. Do not renumber IDs to make them sequential.
4. Do not change box names without migration.
5. Do not change encryption configuration without a re-encryption plan.
6. Do not combine package migration and major schema redesign unless unavoidable.
7. Add migration tests before adapter refactors.
8. Refactor UI direct-box access behind a local data source without changing storage layout first.
9. Separate behavior-preserving architecture refactor from schema migration.
10. Keep old adapters/read logic until all supported old data is migrated.
11. Retire IDs rather than reuse them.
12. Keep a rollback/recovery strategy for user-owned data.
13. Do not make a normal box lazy or vice versa solely for style; evaluate API/lifecycle changes.
14. Never assume a fresh-install test proves upgrade safety.

---

# Code Review Checklist

## Package selection

- [ ] Hive vs Hive CE was chosen intentionally.
- [ ] Current package constraints are known.
- [ ] Migration implications were considered.
- [ ] New code does not accidentally import both package families.

## Architecture

- [ ] Box access is localized.
- [ ] Presentation does not own persistence internals.
- [ ] Repository/local-data boundaries are reasonable for project size.
- [ ] No giant generic storage service hides every schema.

## Boxes

- [ ] Box names are stable.
- [ ] Box grouping follows lifecycle/security/access.
- [ ] Normal vs lazy choice is deliberate.
- [ ] Boxes are not reopened per read.
- [ ] Ownership/closing is clear.

## Schema

- [ ] Type IDs are unique.
- [ ] Existing type IDs did not change.
- [ ] Retired type IDs remain reserved.
- [ ] Existing field IDs did not change.
- [ ] Retired field IDs remain reserved.
- [ ] Defaults cover old records where required.
- [ ] Type changes have migration.

## Generation

- [ ] Generated files are current.
- [ ] Generated files were not hand-edited.
- [ ] CE schema metadata is preserved.
- [ ] Existing IDs are reserved from automatic allocation.

## Migrations

- [ ] Schema version is explicit.
- [ ] Steps are sequential.
- [ ] Migrations are resumable/idempotent.
- [ ] Validation happens before version commit.
- [ ] Critical data is not deleted eagerly.
- [ ] Historical fixtures cover migration.

## Security

- [ ] Secrets are not in plain boxes without justification.
- [ ] Encryption key is external/protected.
- [ ] Key not hardcoded.
- [ ] Key not logged.
- [ ] Web security limitations understood.

## Writes

- [ ] Important writes are awaited.
- [ ] High-frequency writes are throttled.
- [ ] Cross-box atomicity is not assumed.
- [ ] Multi-record invariants have recovery strategy.

## Performance

- [ ] Large normal boxes fit memory.
- [ ] Lazy boxes are used only where beneficial.
- [ ] Huge scans do not masquerade as queries.
- [ ] Large binary payloads are stored appropriately.
- [ ] Compaction policy is reasonable.

## Lifecycle

- [ ] Logout/account-switch cleanup is safe.
- [ ] User data cannot cross accounts.
- [ ] Critical data is persisted before termination.
- [ ] Watch subscriptions are disposed.

## Tests

- [ ] Fresh storage test.
- [ ] Reopen persistence test.
- [ ] Historical fixture test.
- [ ] Migration test.
- [ ] Encryption test if applicable.
- [ ] Corruption/failure test.
- [ ] Test directories isolated and cleaned.

---

# Migration Checklist

Before shipping any persisted-schema change:

- [ ] Identify every deployed version that may upgrade.
- [ ] Preserve old type IDs.
- [ ] Preserve old field IDs.
- [ ] Mark removed IDs retired.
- [ ] Determine whether old records decode before migration.
- [ ] Determine whether a transitional adapter is needed.
- [ ] Add schema-version step.
- [ ] Make migration restart-safe.
- [ ] Avoid destructive source deletion before destination validation.
- [ ] Handle partially migrated datasets.
- [ ] Handle large data incrementally.
- [ ] Preserve encryption key/configuration.
- [ ] Validate data after migration.
- [ ] Write schema version only after successful validation.
- [ ] Test oldest supported fixture.
- [ ] Test immediately previous fixture.
- [ ] Test interrupted/restarted migration.
- [ ] Test current app restart after migration.
- [ ] Add sanitized migration telemetry.
- [ ] Define failure/recovery UX for critical data.
- [ ] Verify downgrade assumptions; Hive migrations are not automatically reversible.

---

# Performance Checklist

- [ ] Only necessary boxes block startup.
- [ ] Frequently accessed moderate data uses normal box where appropriate.
- [ ] Large infrequently-read values considered for lazy box.
- [ ] No unnecessary `toMap()`/whole-box materialization.
- [ ] Keyed access is used where possible.
- [ ] Query-heavy dataset is not forced into Hive.
- [ ] Writes are batched where sensible.
- [ ] High-frequency UI persistence is debounced.
- [ ] Large blobs/media are externalized.
- [ ] Cache TTL removes stale records.
- [ ] Compaction is not overly aggressive.
- [ ] Storage size is monitored for churn-heavy boxes.
- [ ] Watchers are key-scoped when possible.
- [ ] UI does not rebuild for unrelated box events.
- [ ] Multi-isolate mode is used only when required; CE itself documents additional isolate overhead.
- [ ] Web is measured independently from native.
- [ ] Migration does not load entire huge datasets into memory.
- [ ] App startup does not eagerly hydrate data unused by the initial route.

---

# Security Checklist

- [ ] Data sensitivity is classified.
- [ ] Secrets use secure storage where possible.
- [ ] Encryption required for sensitive box data.
- [ ] Hive encryption key generated securely.
- [ ] Key stored outside Hive in appropriate secure storage.
- [ ] Key not embedded in source.
- [ ] Key not logged.
- [ ] Key backup/rotation policy understood.
- [ ] Logout cleanup removes data according to policy.
- [ ] Multi-user caches are isolated/namespaced.
- [ ] Decrypted sensitive values are not logged.
- [ ] Cache diagnostics omit payloads.
- [ ] Browser persistence not treated as native secure enclave.
- [ ] Critical local data has backup/sync/export strategy where required.
- [ ] Box deletion is never generic exception recovery for valuable data.

---

# Production Readiness Checklist

## Selection

- [ ] Package and version selected intentionally.
- [ ] Hive CE used for new suitable Dart 3 projects unless a real constraint says otherwise.
- [ ] Existing Hive production app migration validated rather than assumed.

## Initialization

- [ ] Hive initialized exactly once per storage owner/isolate strategy.
- [ ] Custom adapters registered before box open.
- [ ] Required migrations finish before consumers access new schema.
- [ ] Non-critical boxes do not unnecessarily block startup.

## Schema

- [ ] Type IDs stable.
- [ ] Field IDs stable.
- [ ] Retired IDs preserved.
- [ ] Generated schema current.
- [ ] Old data readable or explicitly migrated.

## Migration

- [ ] Versioned.
- [ ] Sequential.
- [ ] Idempotent/resumable.
- [ ] Validated.
- [ ] Fixture-tested.
- [ ] Failure does not destroy important source data.

## Security

- [ ] Encryption key protected.
- [ ] Secrets not stored casually.
- [ ] Account separation correct.
- [ ] Sensitive logging removed.

## Data integrity

- [ ] Important writes awaited.
- [ ] Cross-record consistency designed consciously.
- [ ] Termination callback not sole persistence point.
- [ ] Corruption policy depends on data class.

## Performance

- [ ] Box type appropriate.
- [ ] Large scans acceptable.
- [ ] Large objects appropriate.
- [ ] Write rate appropriate.
- [ ] Compaction/storage growth reviewed.

## Concurrency

- [ ] Application read-modify-write races handled.
- [ ] Original Hive not assumed multi-isolate safe.
- [ ] Hive CE uses `IsolatedHive` where multi-isolate persistence is required.

## Platform

- [ ] Web IndexedDB behavior considered.
- [ ] Browser-local critical data has appropriate durability expectations.
- [ ] WASM numeric edge cases tested when relevant.

## Tests

- [ ] Isolated storage.
- [ ] Fresh CRUD.
- [ ] Reopen.
- [ ] Old fixture.
- [ ] Migration.
- [ ] Encryption.
- [ ] Failure/recovery.
- [ ] Test cleanup.

---

# Quick Reference

| Situation | Preferred approach |
|---|---|
| New Dart 3 key-value/object persistence app | Hive CE |
| Existing stable original Hive app | Keep or migrate only after fixture validation |
| Existing Hive app needs active modern fixes/features | Evaluate Hive CE migration |
| App requires Dart 2 | Original Hive may be required |
| Tiny primitive preference | Preferences or small box |
| Structured keyed object | Typed Hive/Hive CE box |
| Frequent moderate dataset | Normal `Box<T>` |
| Large infrequently-read values | Consider `LazyBox<T>` |
| Huge query-heavy dataset | Use query-oriented/relational DB |
| Relationships/joins/constraints | SQLite/relational DB |
| App-wide stable storage | Open once and reuse |
| Large feature-only box | Lazy feature initialization |
| User/session storage | User-aware lifecycle/cleanup |
| New custom type | Stable adapter schema |
| Original Hive generated adapter | `@HiveType` + `@HiveField` |
| Modern Hive CE adapter generation | `@GenerateAdapters` + generated registrar/schema |
| Existing type ID | Never change |
| Retired type ID | Reserve forever |
| Existing field ID | Never renumber |
| Retired field ID | Never reuse casually |
| Add optional field | New field ID + safe missing-value handling |
| Add required field | Migration/default required |
| Rename manual-adapter field | Preserve field ID and semantics |
| Rename CE auto-generated field | Inspect/update schema deliberately |
| Change field type | Explicit migration/backwards-compatible adapter |
| Rename box | Data migration |
| Change key format | Data migration |
| Package Hive → Hive CE | Preserve box names/IDs/adapters first; fixture-test |
| API cache | Hive CE + explicit TTL/invalidation |
| Offline local mutations | Persist queue + implement sync logic |
| Access token | Prefer secure platform storage |
| Hive encryption key | Secure platform storage |
| Sensitive larger dataset | Encrypted Hive with protected key |
| Large image/video | File system + metadata in Hive |
| High-frequency input | Debounce/batch persistence |
| Important user edit | Persist at meaningful checkpoints |
| Critical multi-record atomic invariant | Consider transactional database |
| Multi-isolate persistence in CE | `IsolatedHive` |
| Multi-isolate original Hive | Do not assume safe shared access |
| UI reacts to changes | Repository stream / scoped box watcher |
| Simple setting widget | Direct listenable can be acceptable |
| Box-open error on cache | Diagnose, then reset only if reconstructable |
| Box-open error on user data | Preserve and recover; do not auto-delete |
| Storage growth | Remove stale data + review compaction |
| Migration version update | Only after successful validation |
| Migration crashes mid-step | Resume idempotently from old version/cursor |
| Large migration | Chunk + persist progress |
| Test current schema | Fresh temp box |
| Test backwards compatibility | Historical persisted fixture |
| Generated adapter code | Never hand-edit |
| Generated CE schema metadata | Preserve in version control |
| New optimization | Measure before changing storage semantics |

Before approving any Hive/Hive CE persistence change, perform this final check:

```text
Does the storage engine fit the access model?
↓
Is the package choice intentional?
↓
Who owns the box?
↓
Is the persistent schema stable?
↓
Are type and field IDs preserved?
↓
Can every deployed old version upgrade safely?
↓
Can an interrupted migration resume?
↓
Is valuable data protected from destructive recovery?
↓
Are secrets stored appropriately?
↓
Are writes/lifecycle/concurrency correct?
↓
Are memory and storage growth acceptable?
↓
Has real historical persisted data been tested?
```

If any answer is unknown, treat the persistence change as incomplete rather than assuming a fresh-install test is sufficient.
