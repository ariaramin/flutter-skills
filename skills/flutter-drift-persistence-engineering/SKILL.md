---
name: flutter-drift-persistence-engineering
description: >-
  Design, implement, review, debug, test, migrate, and optimize production Flutter persistence built with Drift and SQLite. Use for @DriftDatabase, Dart tables, .drift SQL files, DAOs, generated code, driftDatabase, NativeDatabase, WasmDatabase, reactive watch streams, joins, transactions, batches, upserts, indexes, foreign keys, schemaVersion, guided migrations, background isolates, read pools, WAL, web workers/OPFS/IndexedDB, backup/export, or slow and janky local database behavior across Android, iOS, Web, Windows, macOS, and Linux. Trigger when users mention Drift, Moor migration, database streams rerunning, database locked errors, N+1 local queries, large SQLite datasets, or broken Drift migrations. Do not use for generic remote API caching without Drift, Firebase/Firestore modeling, or server-only database design.
---

# Flutter Drift Persistence Engineering

Treat Drift as a typed SQLite persistence system with generated APIs, reactive invalidation, platform-specific executors, and irreversible schema evolution—not as a generic key-value store.

## Reference routing

Read only what the task requires:

| Need | Reference |
|---|---|
| Dependencies, database declaration, connection ownership, DAOs, generated-code layout | `references/01-setup-and-architecture.md` |
| Tables, constraints, relationships, indexes, Dart/SQL queries, joins, pagination | `references/02-schema-and-queries.md` |
| Writes, transactions, batches, streams, invalidation, profiling, large datasets | `references/03-writes-streams-and-performance.md` |
| Native isolates, `driftDatabase`, `NativeDatabase`, WAL/read pools, Web/WASM | `references/04-platforms-and-concurrency.md` |
| Migrations, migration tests, ordinary tests, backup, diagnostics, security, reviews | `references/05-migrations-testing-and-operations.md` |
| Version baseline and authoritative URLs | `references/06-authoritative-sources.md` |

The bundled research was checked on 2026-08-11 against Drift `2.34.3`, `drift_flutter 0.3.1`, and current official Drift/SQLite documentation. Always inspect the project’s `pubspec.lock`, SDK constraints, generated code, and installed package source before relying on a signature or default.

## Inspect before changing code

Inspect:

- `pubspec.yaml`, `pubspec.lock`, `build.yaml`, Flutter/Dart versions, and shipped platforms.
- Database classes, tables, `.drift` files, DAOs, repositories, generated parts, and schema snapshots.
- Every database constructor and owner; locate all opens, providers, overrides, and `close()` calls.
- `schemaVersion`, `migration`, generated migration steps/tests, and historical schema files.
- Hot queries, watched streams, indexes, write paths, transaction boundaries, and large result materializations.
- Native/Web connection setup, worker/WASM assets, headers, database path, pragmas, isolate sharing, and backup behavior.

Search for at least:

```text
@DriftDatabase @DriftAccessor Table TableIndex .drift
driftDatabase NativeDatabase WasmDatabase LazyDatabase DriftIsolate
schemaVersion MigrationStrategy make-migrations beforeOpen onUpgrade
watch watchSingle transaction batch insertAll readPool journal_mode
customSelect customStatement notifyUpdates close
```

Trace callers before fixing a symptom. Put connection ownership, migration policy, and repeated-query fixes at their shared boundary.

## Define the persistence contract

Establish:

1. Which data is authoritative, cached, replaceable, or user-created?
2. Which platforms and browser modes must persist reliably?
3. What consistency and atomicity must each workflow provide?
4. Which queries are hot, how many rows can they touch, and how are they ordered?
5. Which UI surfaces truly need reactive results?
6. How will every released schema version migrate and retain data?
7. Who owns database startup, lifetime, close, backup, restore, and destructive recovery?
8. What data is sensitive, and what encryption or platform storage boundary is required?

Do not add repositories, DAOs, converters, or isolate pools merely for symmetry. Add a boundary when it owns queries, policy, test seams, or lifecycle.

## Choose the smallest sound architecture

Default to:

```text
UI/state
→ feature repository or DAO when it adds a real boundary
→ one application database
→ generated Drift API
→ platform-aware executor
→ SQLite/WASM persistence
```

- Keep one long-lived logical database per application database file unless isolation is intentional.
- Inject a `QueryExecutor` or `DatabaseConnection` for tests and specialized runtimes.
- Use `driftDatabase` from `drift_flutter` for the ordinary cross-platform Flutter setup.
- Use `NativeDatabase.createInBackground` for manual native setup so synchronous SQLite work stays off the UI isolate.
- Use manual `DriftIsolate` wiring only when multiple application-controlled isolates must share one logical database.
- Use `WasmDatabase.open` or `driftDatabase` with `DriftWebOptions` on Web; never use deprecated `package:drift/web.dart` for new work.
- Close the database from its actual owner. Do not close a shared singleton from a widget.

## Design schema from invariants and queries

- Encode required values, uniqueness, keys, references, and safe defaults in the schema.
- Enable SQLite foreign-key enforcement deliberately; declaring references does not replace runtime enforcement.
- Index measured or clearly dominant `WHERE`, join, and `ORDER BY` paths. Match composite-index leftmost order to real predicates.
- Avoid duplicate prefix indexes and low-selectivity leading columns unless a measured plan benefits.
- Use joins or set-based SQL instead of query-per-row loops.
- Select only needed columns for large or hot paths.
- Give pagination a deterministic unique tie-breaker. Prefer keyset pagination for deep, frequently traversed datasets; use offset pagination for small/simple lists.
- Verify important plans with `EXPLAIN QUERY PLAN` and representative data before claiming an optimization.

## Keep writes atomic and bounded

- Use a transaction for a business invariant spanning multiple statements; await every database operation inside it.
- Keep transactions short and free of network calls, UI waits, timers, and unrelated computation.
- Use `batch`/`insertAll` for bulk writes so Drift can reuse statements and reduce crossings.
- Use explicit upserts only when the chosen primary/unique conflict target matches product semantics.
- Require a deliberate `where` clause for updates and deletes unless the task explicitly targets the full table.
- Chunk very large imports when a single transaction creates unacceptable memory, lock, or latency pressure; preserve restart/idempotency semantics.

## Make reactivity intentional

- Use `get*()` for one-shot reads and `watch*()` only when consumers need automatic updates.
- Keep watched queries selective, indexed, and small. Drift invalidates by observed tables, so a write may rerun more streams than the exact changed rows require.
- Share or hoist equivalent streams when UI rebuilds would create redundant subscriptions.
- Do not combine an initial `get()` with `watch()`; Drift streams emit an initial current snapshot.
- Declare `readsFrom`/update metadata correctly for raw custom SQL and external writes, or reactive results can become stale.
- Do not expose transaction-local streams outside their transaction.

## Evolve schemas without gambling with data

- Bump `schemaVersion` for every released schema change.
- Prefer `dart run drift_dev make-migrations` and generated step-by-step migrations/tests over handwritten ad hoc upgrades.
- Commit historical schema snapshots and generated migration support files required by the project.
- Test upgrades from every supported historical version and assert retained business data, not only final DDL shape.
- Run complex migrations transactionally, handle foreign-key pragmas as documented, and check `PRAGMA foreign_key_check`.
- Never use destructive fallback migration in production unless product policy explicitly permits data loss.
- Treat downgrades as unsupported unless a separately designed export/reinstall/restore flow exists.

## Optimize from evidence

Classify the bottleneck:

```text
startup jank → executor placement, eager queries, migration/open work
slow query → scan/sort/join plan, missing or wrong index, excess columns/rows
database locked → multiple connections, long writes, WAL/read-pool configuration
stream churn → broad table invalidation, duplicate subscriptions, expensive result set
slow import → per-row statements, oversized transaction, serialization/isolate overhead
web slowness → chosen storage backend, worker deployment, missing COOP/COEP capabilities
memory growth → unbounded get(), retained result lists/subscriptions, large blobs
```

Profile release/profile builds with representative row counts. Background isolates protect UI responsiveness but add message-copying and coordination overhead; they do not make SQL intrinsically faster.

## Validate before finishing

- Run code generation, formatting, analysis, and focused tests.
- Run generated migration tests and data-integrity assertions.
- Test create-new, upgrade, failed upgrade/rollback, reopen, and close ownership.
- Test every shipped executor: native targets and real supported browsers.
- Verify Web worker and `sqlite3.wasm` deployment plus the selected persistence implementation.
- Exercise cancellation/retry around imports, exports, backups, and app lifecycle.
- Benchmark hot queries and bulk writes with production-like data; inspect query plans.
- Review the final diff for unbounded reads, N+1 loops, missing constraints/indexes, broad watched queries, leaked connections, sensitive SQL logging, and data-loss fallbacks.
