# Migrations, Testing, and Operations

## Contents

- Guided migrations and schema history
- Foreign-key-safe complex migrations
- Unit, stream, and migration testing
- Backup/import/export lifecycle
- Errors, diagnostics, security, and production reviews

## Prefer guided migrations

Configure databases for Drift’s migration tooling in `build.yaml`, then run:

```sh
dart run drift_dev make-migrations
```

Run it before the first released schema change to establish a baseline, then after changing schema and bumping `schemaVersion`. Review generated steps and tests; generation does not decide data transformations for you.

Commit the schema snapshots and generated migration support files the project needs. Without old schema artifacts, future agents cannot verify upgrades accurately.

## Write stepwise, testable upgrades

Every step must describe one version transition and preserve meaningful data. Avoid `if (from < N)` blocks that become difficult to reason about when generated step migrations are available.

For new non-null columns on existing tables, provide a safe SQL default or a migration transformation. A Dart constructor default does not populate old SQLite rows.

For view, trigger, or index definition changes, drop and recreate the object. Recreate dependent views when underlying SQL names change even if the Dart view declaration appears unchanged.

Use `TableMigration` for complex table rebuilds and explicitly map renamed/transformed columns.

## Handle foreign keys during migrations

Follow Drift’s documented pattern for migrations that rebuild related tables:

```dart
@override
MigrationStrategy get migration => MigrationStrategy(
  onUpgrade: (m, from, to) async {
    await customStatement('PRAGMA foreign_keys = OFF');
    await transaction(() async {
      await stepByStep(from: from, to: to, steps: migrationSteps);
    });

    final violations = await customSelect('PRAGMA foreign_key_check').get();
    if (violations.isNotEmpty) {
      throw StateError('Foreign-key violations after migration');
    }
  },
  beforeOpen: (_) async {
    await customStatement('PRAGMA foreign_keys = ON');
  },
);
```

Verify the generated step function name/signature in the project. Ensure foreign keys are re-enabled even when an upgrade throws; connection/open behavior must not leave a usable database with integrity disabled.

## Test migrations as data transformations

Use generated migration verifier tests:

```dart
final connection = await verifier.startAt(1);
final db = AppDatabase.forTesting(connection);
await verifier.migrateAndValidate(db, currentVersion);
```

For each supported start version:

- insert representative rows, nulls, edge values, and relationships before upgrading;
- run the real migration path;
- validate final schema;
- assert business data and derived/default values;
- run `foreign_key_check` and important queries;
- close all databases/connections.

Test the direct jump from every supported old version, not only `N-1 → N`.

## Test ordinary database behavior

Use an in-memory executor for fast deterministic unit tests:

```dart
late AppDatabase db;

setUp(() {
  db = AppDatabase.forTesting(NativeDatabase.memory());
});

tearDown(() => db.close());
```

Test:

- constraints, cascades, and conflict behavior;
- transaction commit and rollback;
- batch/upsert semantics;
- query ordering and pagination ties;
- watched stream initial value and relevant/irrelevant writes;
- custom SQL read/write invalidation metadata;
- close and reopen behavior.

Use native file-backed integration tests for WAL, locking, backup, file lifecycle, and process reopen. Use real-browser tests for WASM assets, storage selection, multi-tab behavior, and persistence.

## Back up consistently

Never copy a live SQLite main file blindly. With WAL, recent committed pages may live in `-wal`; an inconsistent copy can lose data or fail recovery.

Choose one documented SQLite-safe strategy:

- close/quiesce the owning database before copying all required files;
- use SQLite’s backup API through a validated supported integration;
- use Drift’s Web probe/export APIs for Web databases;
- run an exclusive maintenance flow designed for export.

Before restore:

- validate source and expected schema/application identity;
- close active connections and stop writers;
- preserve the current file until restore succeeds;
- migrate the restored database through normal tested migrations;
- reopen and verify integrity.

Treat backup files as sensitive user data. Encrypt and authenticate them when threat requirements demand it; SQLite/Drift does not make a plain database file confidential.

## Classify failures

Handle separately:

```text
configuration → missing generated code, worker/WASM asset, bad path
integrity → constraint or foreign-key failure
migration → unsupported version, transformation failure, corrupt schema
resource → disk/quota full, memory pressure, browser persistence unavailable
concurrency → busy/locked, duplicate connection ownership, long transaction
data → corrupt database or invalid imported file
programming → cardinality mismatch, closed connection, unawaited transaction work
```

Do not automatically delete/recreate a user database after an unknown open or migration error. Preserve the file and offer controlled recovery/export where product requirements permit.

## Diagnostics

- Reproduce with the resolved package and target executor.
- Capture database schema version and sanitized executor/platform details.
- Enable SQL logging only in a controlled non-production environment.
- Use Drift DevTools for inspection where supported.
- Run `PRAGMA integrity_check`/`foreign_key_check` only at deliberate diagnostic boundaries; they can be expensive.
- Inspect `EXPLAIN QUERY PLAN` for slow queries.
- Measure queue, SQL, mapping, isolate/worker, and UI time separately.

Never log bound secrets, tokens, private messages, health data, or full database paths. Redact row contents in crash reports.

## Security and integrity

- Parameterize values and whitelist dynamic identifiers.
- Store auth secrets in platform secure storage, not an unencrypted Drift table.
- Use an audited encryption solution if database-at-rest confidentiality is required; verify key lifecycle, backup, migration, desktop, and Web support.
- Keep database files in platform application support/data directories, not public shared storage.
- Validate imported databases before replacing current data.
- Treat generated JSON serialization as transport convenience, not encryption or schema compatibility.
- Do not expose arbitrary `customStatement` execution to remote configuration or user input.

## Production checklist

- [ ] One clear database owner and close policy.
- [ ] Current background native/Web worker executor.
- [ ] Foreign keys enabled and tested.
- [ ] Keys, unique constraints, nullability, and cascades match invariants.
- [ ] Hot queries are bounded and plan-reviewed.
- [ ] No N+1 query loops.
- [ ] Bulk writes use batches/appropriate transactions.
- [ ] Watched queries are selective and correctly invalidated.
- [ ] Historical schemas and migration tests are committed.
- [ ] Every supported upgrade path preserves representative data.
- [ ] Web WASM/worker/storage fallbacks tested in release hosting.
- [ ] WAL/read pool justified and backup-safe if enabled.
- [ ] Disk/quota/corruption/migration errors have non-destructive handling.
- [ ] Logs and backups protect sensitive data.
- [ ] Native and Web integration tests cover reopen and lifecycle.

## Code review checklist

- [ ] Resolved Drift APIs, not old Moor/legacy Web examples?
- [ ] Generated files untouched?
- [ ] Executor injected for tests?
- [ ] Shared database not closed by feature widgets?
- [ ] No raw interpolation or unbounded selects?
- [ ] Update/delete scope explicit?
- [ ] All transaction operations awaited?
- [ ] No network/UI waits inside transactions?
- [ ] Indexes match real predicates/order and avoid redundant prefixes?
- [ ] Pagination deterministic?
- [ ] Stream subscriptions bounded and reused?
- [ ] Custom SQL declares dependency metadata?
- [ ] Schema version and migrations updated together?
- [ ] Destructive recovery explicitly authorized?
- [ ] Platform-specific persistence guarantees tested?
