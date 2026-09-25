---
name: flutter-hive-persistence-engineering
description: Design, implement, review, migrate, debug, secure, test, and optimize local persistence in Flutter/Dart applications using Hive or Hive CE. Use this skill whenever a task involves choosing Hive vs Hive CE, boxes, TypeAdapters, type IDs, field IDs, schema evolution, versioned migrations, encrypted boxes, Hive → Hive CE migration, normal vs LazyBox tradeoffs, repositories/caching/offline storage, IsolatedHive, Flutter Web/IndexedDB, corruption recovery, storage growth/compaction, or any persisted-model change—even if the request is framed as a simple model refactor or package upgrade.
compatibility: Inspect the repository's actual Dart/Flutter, hive/hive_ce, Flutter integration, and generator versions before changing persistence. The bundled source baseline describes hive_ce 2.19.3 and original hive 2.2.3; re-verify version-sensitive APIs and migration behavior when pinned versions differ.
---
# Flutter Hive Persistence Engineering
## Mission
Treat Hive/Hive CE persistence as a long-lived data contract, not a transient implementation detail.
Use this loop:
```text
Classify data/access pattern
→ inspect deployed storage contract
→ choose storage/box/model strategy
→ design compatibility + recovery
→ implement smallest safe change
→ test old persisted data + failures
→ measure startup/memory/storage/write cost
```
Highest-priority invariant:
> Persisted data is part of the application's long-lived external contract. A Dart model change is not safe merely because the new code compiles.
## Operating Rules
1. Inspect pinned package versions and existing storage before editing persistence.
2. Treat box names, key formats, type IDs, field IDs, encryption configuration, and generated schema metadata as migration-sensitive.
3. Never reuse a retired type ID for a different persisted type.
4. Never renumber existing field IDs for aesthetics or source-order cleanup.
5. Design migrations before shipping incompatible schema changes.
6. Make migrations sequential, restartable/idempotent, validated, and historical-fixture tested.
7. Commit the schema version only after validation succeeds.
8. Preserve valuable source data until the replacement is safely written and validated.
9. Register adapters deterministically before opening boxes containing those types.
10. Open boxes through a deliberate owner and reuse them; `openBox` is lifecycle configuration, not a query.
11. Keep Hive details behind repository/local-data boundaries in nontrivial applications.
12. Choose `Box<T>` vs `LazyBox<T>` from measured memory and access patterns.
13. Do not force relational/query-heavy workloads into Hive.
14. Await important writes; do not assume arbitrary multi-record/cross-box operations are atomic.
15. Keep Hive encryption keys outside Hive, normally in platform-secure storage.
16. Do not store high-value credentials in ordinary Hive merely because it is convenient.
17. Recover differently for disposable cache, reconstructable data, and critical local user data.
18. Never delete valuable storage as generic exception handling.
19. Debounce/batch high-frequency writes and persist critical edits before termination.
20. Use Hive CE `IsolatedHive` only when supported multi-isolate persistence is genuinely required.
21. Treat Flutter Web as browser/IndexedDB persistence with different durability and security semantics.
22. Preserve Hive CE generated schema metadata in version control.
23. Separate package migration from schema redesign when valuable production data exists.
24. Re-run historical compatibility tests after adapter, generator, encryption, or package changes.
## Version Gate
Before changing code, inspect:
```text
Flutter SDK
Dart SDK
hive or hive_ce
hive_flutter or hive_ce_flutter
hive_generator or hive_ce_generator
build_runner
pubspec.lock/workspace lock
```
Also determine whether the project uses:
```text
original Hive
Hive CE
manual adapters
@HiveType/@HiveField generation
GenerateAdapters
encrypted boxes
IsolatedHive
```
Do not infer compatibility from package names alone.
For new Dart 3+ work whose access model fits Hive, prefer Hive CE unless a concrete constraint requires original Hive. For an existing original-Hive production app, preserve compatibility first and evaluate CE migration with production-format fixtures.
## Reference Routing
Read only what the task needs:
- `references/01-selection-architecture-boxes.md` — package choice, alternatives, architecture, initialization, box design/ownership, normal vs lazy boxes, persistent models.
- `references/02-adapters-schema-migrations.md` — adapters, stable IDs, schema evolution, migration architecture, crash safety, large migrations, Hive → Hive CE.
- `references/03-access-cache-security-concurrency.md` — keys, reads/writes, watchers, repositories, cache/offline policy, encryption, compaction, lifecycle, concurrency, isolates.
- `references/04-platform-testing-debugging.md` — Web, error/recovery, diagnostics, DI/Bloc integration, tests, code generation, monorepos, debugging.
- `references/05-antipatterns-workflows-checklists.md` — anti-patterns, implementation/review workflows, migration/performance/security checklists, production gates.
Always read reference 02 plus the historical-fixture testing sections of reference 04 for persisted-schema changes.
## Repository Inspection
Before modifying an existing project, inventory the contract.
### Package and initialization
Find:
```text
Hive.init
Hive.initFlutter
IsolatedHive
registerAdapter / registerAdapters
openBox / openLazyBox
Hive.box
```
Record initialization order, storage backend/path, and startup-critical boxes.
### Boxes
For each box record:
```text
name
generic type
normal/lazy
encryption
owner/lifetime
data importance
size/access pattern
compaction policy
```
### Schema
For each custom persisted type record:
```text
type
typeId
field IDs
manual/generated strategy
retired IDs
registration point
historical versions
```
For Hive CE automatic generation, inspect generated schema metadata and its version history.
### Lifecycle
Map:
```text
source of truth
→ write/read
→ cache/TTL/sync
→ migration
→ logout/account switch
→ deletion/recovery
```
### Risk search
Search for:
```text
Hive.box/openBox in widgets or blocs
Box<dynamic>
Map<dynamic, dynamic>
HiveAesCipher / generateSecureKey
unawaited writes
clear/deleteBoxFromDisk
toMap / full-box scans
Uint8List/base64/media blobs
watch subscriptions
manual compact()
```
## Storage-Engine Decision Gate
Choose Hive/Hive CE when access is mostly stable `key → value`, moderate object collections, local caches/offline snapshots, and small-to-moderate persistent state.
Choose another mechanism when dominated by:
- joins/relational constraints;
- rich indexed filtering/sorting/aggregation;
- strong transactional multi-record invariants;
- large binary/media payloads;
- only a few primitive settings;
- high-value credentials/private key material.
Typical alternatives:
```text
few settings → preferences
secrets → platform secure storage
relational/query-heavy data → SQLite/Drift or suitable DB
large media → filesystem/object storage + metadata
transient state → memory
```
If broad scans over a large box are the primary query architecture, reconsider the storage engine.
## Architecture Boundary
Default flow:
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
Persistence infrastructure owns:
- box names/keys;
- adapter registration;
- migrations;
- encryption configuration;
- box lifecycle;
- low-level storage failures.
Repositories own cache/offline semantics and remote/local coordination.
Do not leak `Box` into unrelated presentation/business code unless project scope deliberately justifies it.
## Initialization and Box Ownership
Use this order:
```text
initialize Hive/backend
→ register adapters
→ open migration metadata/legacy readers
→ run required migrations
→ open current-schema boxes
→ start consumers
```
Only block startup on storage required for first-screen correctness or schema safety. Lazy-open large feature-only boxes.
Assign one owner for each box's open/close/delete lifecycle.
Do not reopen an existing box expecting to replace its encryption, lazy/normal semantics, generic type, or lifecycle policy.
## Box Design
Separate boxes when lifecycle, security, size/access pattern, migration ownership, or cleanup/reconstruction policy differs materially.
Avoid one giant mixed-purpose box and hundreds of tiny boxes without lifecycle value.
Treat box names as stable persisted identifiers; renaming requires migration.
### Normal vs Lazy
Prefer `Box<T>` for frequently accessed values that fit memory and benefit from synchronous reads.
Consider `LazyBox<T>` for large values read sparsely when async backend access is acceptable.
Do not use lazy storage as a universal performance setting; it can trade memory for repeated I/O.
## Persistent Model Design
Use primitives for simple stable settings.
Use typed persistence models/adapters for durable structured records.
Prefer persistence-specific DTOs when domain/server schemas evolve independently, cache metadata is storage-specific, or migrations should not dictate domain architecture.
Avoid long-lived dynamic maps as the application-wide schema.
## Adapter and ID Invariants
Persisted identity rules:
```text
existing typeId → never change
retired typeId → reserve forever
existing field ID → never renumber
retired field ID → never reuse for unrelated semantics
```
Declaration order is not schema identity.
A renamed source property is compatible only if persisted identity and representation remain compatible.
Changing field type/nullability/enum representation, box name, key format, type ID, or encryption configuration is a migration problem unless proven otherwise.
## Hive CE Generated Schema
When using `GenerateAdapters`:
- preserve generated schema metadata in source control;
- reserve IDs already owned by legacy/manual adapters;
- inspect generated schema diffs after persistent model changes;
- do not assume property renames retain field identity automatically;
- regenerate with compatible runtime/generator versions;
- never hand-edit generated adapters.
## Schema Evolution Gate
Lower-risk examples:
- new optional/defaultable field with a new unused ID;
- source rename with deliberately preserved manual field identity.
High-risk examples:
- new required field without old-record handling;
- field type/nullability/enum representation change;
- generated-field rename with uncertain mapping;
- model split/merge;
- box/key rename;
- adapter-generation strategy change;
- encryption/key/cipher change.
Critical defects:
- changing a deployed type ID;
- reusing retired type/field IDs;
- destructively resetting irreplaceable data without recovery design.
## Migration Protocol
Maintain explicit schema metadata such as:
```text
storage_meta.schema_version
storage_meta.migration_cursor
```
Run:
```text
vN
→ migrate N→N+1
→ validate
→ persist/flush N+1
→ repeat
```
Migration requirements:
- sequential;
- idempotent/resumable;
- old-data readable long enough to migrate;
- bounded memory;
- sanitized observability;
- safe after interruption;
- validated before version commit.
For destructive transformations prefer:
```text
read old
→ write new
→ validate new
→ commit metadata
→ delete old later
```
Never delete valuable source data before successful destination validation.
For large datasets, migrate in chunks and persist progress so restart resumes safely.
## Hive → Hive CE Migration Gate
For existing original Hive production data:
1. Inventory versions, boxes, lazy/normal state, encryption, adapters, IDs, and migrations.
2. Capture fixtures written by released original-Hive builds.
3. Replace package family/imports deliberately.
4. Preserve box names, keys, type IDs, field IDs, and encryption behavior.
5. Preserve adapter behavior first.
6. Prove old data can open, read, write, close, reopen, and migrate.
7. Modernize generation/schema only afterward where practical.
Do not combine package migration, adapter-generation redesign, box rename, and schema redesign in one release for valuable data unless unavoidable and comprehensively tested.
## Keys and Access
Prefer stable domain IDs as box keys for synchronized/domain entities.
Use auto-increment keys only for records whose identity is genuinely local/append-like.
Encode composite identities deterministically and unambiguously.
Do not use `getAt(index)` as durable entity identity.
Use keyed access instead of whole-box materialization when possible.
## Writes and Application Atomicity
Await important writes and handle failures.
Use bulk APIs when they reduce repeated operations and match semantics.
Use `flush()` at deliberate durability boundaries, especially migration commits, not after every trivial write.
Hive does not make arbitrary cross-box sequences an application transaction.
If a business invariant requires all-or-nothing multi-record updates, use one aggregate record, serialized mutation/recovery, a write-ahead pattern, or a transactional database.
Protect read-modify-write sequences from concurrent callers too.
## Caching and Offline Policy
Hive stores values; it does not provide TTL, stale policy, remote synchronization, conflicts, or retry semantics.
Explicitly define:
```text
freshness/expiry
cache invalidation
stale fallback
sync cursor
pending operations
retry/idempotency
conflict resolution
account scope
```
Do not describe persisted cache data as automatic offline sync.
## Encryption and Secret Boundary
For encrypted boxes:
```text
platform-secure key store
→ random 32-byte Hive encryption key
→ HiveAesCipher
→ encrypted box
```
Never hardcode, log, or co-store the encryption key with the data it protects.
Do not silently generate a replacement key when critical encrypted data already exists and the old key is missing.
Use platform-secure storage directly for small high-value credentials/private key material when appropriate.
Treat encryption-key rotation as a copy/validate/switch migration, not an in-place magic operation.
## Lifecycle, Concurrency, and Isolates
Persist critical information while it changes; app termination callbacks are not a reliable sole save point.
On logout/account switch:
- flush/cancel pending writes as policy requires;
- close or clear user-scoped boxes deliberately;
- prevent previous-user cache exposure;
- preserve data that policy intentionally retains.
Do not assume ordinary Hive access from several isolates is safe.
With Hive CE, use `IsolatedHive` when multiple isolates truly need supported persistence access, and account for communication overhead. If one isolate can own storage, central ownership plus messages may remain simpler.
## Compaction and Storage Growth
Prefer default compaction behavior first.
Investigate growth from live value size, overwrite/delete churn, stale cache, abandoned migration copies, uncleaned user data, or media stored in boxes.
Use manual/custom compaction only for measured growth problems and avoid forcing expensive compaction into startup without evidence.
Keep large media in files/object storage and persist metadata in Hive.
## Flutter Web Gate
Treat browser storage as IndexedDB with browser-controlled quota, eviction, site-data clearing, private-mode behavior, and origin lifetime.
Do not assume native filesystem or Keychain/Keystore semantics.
For Hive CE Web/WASM, test target browsers and large-integer identity behavior where values can exceed JavaScript's exact integer range. Prefer string identities when exactness matters.
Critical browser-local data needs server sync/export/backup or explicit product acceptance of browser-local durability.
## Error and Recovery Gate
Do not turn every storage exception into `null`.
Before classifying corruption, check initialization, path/backend, adapter registration, type IDs, generic/lazy mismatch, encryption key, interrupted migration, and package changes.
Then classify data:
- **Disposable cache:** reset/refetch can be acceptable after diagnosis.
- **Reconstructable server data:** preserve pending local mutations/account/sync metadata before reset.
- **Critical local data:** do not auto-delete; preserve original data, stop destructive writes, collect sanitized diagnostics, and enter explicit recovery/export flow.
## Testing Gate
For shipped persistence, fresh CRUD tests are not enough.
### Required core tests
- write → close → reopen → read;
- every persisted field round-trips;
- missing/default behavior;
- deletion/cleanup policy;
- important write failures.
### Historical fixtures
Store fixtures created by previous released versions.
Test:
```text
historical fixture
→ current runtime/adapters
→ migration
→ validate
→ close/reopen
→ validate again
```
Cover oldest supported and immediately previous schemas.
### Migration failures
Simulate interruption and verify safe rerun/resume.
### Encryption
Use deterministic test-only keys; test correct-key reopen and wrong-key behavior.
### Platform/concurrency
Test Web and `IsolatedHive` on relevant real targets when used.
Use unique native test directories and clean them up.
## Performance Gate
Measure before changing persistence semantics.
Inspect separately:
```text
Hive init
adapter registration
box-open duration
migration duration
compaction
domain hydration
resident value memory
write rate
storage size
```
Performance checks:
- only necessary boxes block startup;
- large infrequently-read data considered for lazy storage;
- no unnecessary `toMap()`/full-box copies;
- no giant blobs in general-purpose boxes;
- high-frequency writes are debounced/batched;
- watchers are scoped to relevant keys/events;
- stale cache is actually removed;
- query-heavy datasets have not outgrown Hive;
- migration is chunked if large;
- Web is measured independently from native.
## Anti-Patterns to Reject
Reject by default:
- direct box access scattered across widgets/business code;
- opening boxes per read;
- one giant mixed-purpose box;
- one box per tiny preference without lifecycle value;
- persisting domain/UI models without schema reasoning;
- reusing or renumbering IDs;
- incompatible field-type changes without migration;
- deleting data because migration is inconvenient;
- `dynamic`/raw maps everywhere;
- secrets in plain Hive;
- hardcoded/logged encryption keys;
- huge media in boxes;
- full-box copies for keyed access;
- LazyBox everywhere “for performance”;
- per-keystroke writes without durability reasoning;
- saving only on app termination;
- assumptions of automatic TTL/offline synchronization;
- marking schema version before validation;
- hand-editing generated adapters;
- adapter changes without old-data fixtures;
- cross-box atomicity assumptions;
- unsupported direct multi-isolate access.
Read reference 05 for the full 30-item anti-pattern catalog and checklists.
## New Feature Workflow
1. Decide whether persistence is required.
2. Choose storage technology from access/query/transaction/security/payload needs.
3. Choose Hive vs Hive CE intentionally.
4. Classify data: disposable, reconstructable, critical local, or secret.
5. Document realistic size and access patterns.
6. Design boxes by lifecycle/security/access/migration ownership.
7. Choose normal vs lazy.
8. Design persistence DTO/schema.
9. Allocate stable IDs or configure CE schema generation/reservations.
10. Define key strategy.
11. Define encryption/key lifecycle if needed.
12. Assign box ownership.
13. Implement storage/repository boundary appropriate to project size.
14. Define cache/offline/sync behavior explicitly.
15. Define recovery policy.
16. Add fresh/reopen and historical-fixture test strategy.
17. Review write rate/startup/memory/storage growth.
18. Generate adapters and inspect schema diff.
19. Run analysis/tests/platform checks.
## Existing-Code Refactor Workflow
1. Record package and SDK versions.
2. Inventory boxes, keys, types, IDs, adapters, generated schema, encryption, and owners.
3. Capture historical fixtures before changing schema/package family.
4. Characterize current migration/recovery behavior.
5. Refactor direct UI/Bloc storage access without changing persisted layout first.
6. Perform package migration separately where possible.
7. Perform schema migration separately where possible.
8. Preserve legacy read capability until migration completes.
9. Validate startup, reopen, logout/account switch, recovery, and old fixtures.
10. Remove legacy data/read paths only after supported upgrade paths no longer require them.
## Reporting Format
For persistence implementation/review, report:
```text
Repository baseline
Data classification
Storage/box design
Schema contract
Migration impact
Security/key management
Concurrency/lifecycle
Performance impact
Historical + failure tests
Risks/unresolved decisions
```
Do not call a persisted-model change safe without compatibility evidence.
## Production Gate
Before release verify:
- storage engine fits the access model;
- package choice and pinned versions are known;
- box names/owners/lifetimes are explicit;
- only required boxes block startup;
- adapters register before reads;
- type/field IDs remain stable and retired IDs remain reserved;
- generated CE schema metadata is preserved/current;
- incompatible changes have versioned migrations;
- migrations are restartable and validated before version commit;
- historical deployed fixtures upgrade successfully;
- important writes are awaited;
- cross-record/cross-box atomicity is not assumed;
- high-frequency writes are bounded;
- normal/lazy choice fits actual workload;
- storage growth/compaction is understood;
- encryption keys are securely managed and never logged;
- missing critical encryption keys cannot silently orphan data;
- logout/account switching cannot leak prior-user data;
- valuable data is not auto-deleted on generic errors;
- multi-isolate access uses a supported strategy;
- Web durability/security differences are handled;
- fresh, reopen, migration, recovery, and relevant platform tests pass.
If any item is unknown, treat the persistence change as incomplete.
