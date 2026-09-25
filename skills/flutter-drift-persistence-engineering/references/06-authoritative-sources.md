# Authoritative Sources and Version Notes

## Contents

- Validation baseline
- Official Drift documentation
- Package and repository sources
- Official SQLite references
- Source interpretation rules

## Validation baseline

Research date: `2026-08-11`.

Observed current releases:

```text
drift 2.34.3
drift_flutter 0.3.1
drift_dev documentation baseline 2.34.x
```

The official setup page still displayed `drift 2.34.2` during research, while pub.dev and the GitHub release page showed `2.34.3`. This is a normal documentation lag. Prefer the resolved project package, matching API docs/source, current changelog, then narrative docs for compile-time facts.

## Official Drift documentation

- Setup: https://drift.simonbinder.eu/setup/
- Supported platforms: https://drift.simonbinder.eu/platforms/
- Native database setup: https://drift.simonbinder.eu/platforms/vm/
- Web/WASM: https://drift.simonbinder.eu/platforms/web/
- Isolates: https://drift.simonbinder.eu/isolates/
- Dart tables: https://drift.simonbinder.eu/dart_api/tables/
- Selects and joins: https://drift.simonbinder.eu/dart_api/select/
- Writes and upserts: https://drift.simonbinder.eu/dart_api/writes/
- Transactions: https://drift.simonbinder.eu/dart_api/transactions/
- Stream queries: https://drift.simonbinder.eu/dart_api/streams/
- DAOs: https://drift.simonbinder.eu/dart_api/daos/
- Verified SQL: https://drift.simonbinder.eu/sql_api/
- Drift files: https://drift.simonbinder.eu/sql_api/drift_files/
- Generation options: https://drift.simonbinder.eu/generation_options/
- Modular generation: https://drift.simonbinder.eu/generation_options/modular/
- Migrations: https://drift.simonbinder.eu/migrations/
- Migrator API: https://drift.simonbinder.eu/migrations/api/
- Exporting schemas: https://drift.simonbinder.eu/migrations/exports/
- Testing migrations: https://drift.simonbinder.eu/migrations/tests/
- Testing: https://drift.simonbinder.eu/testing/
- CLI/tools: https://drift.simonbinder.eu/tools/
- FAQ: https://drift.simonbinder.eu/faq/
- Existing database import/export: https://drift.simonbinder.eu/examples/existing_databases/

## Official packages and repository

- Drift package: https://pub.dev/packages/drift
- Drift changelog: https://pub.dev/packages/drift/changelog
- Drift API: https://pub.dev/documentation/drift/latest/
- drift_flutter: https://pub.dev/packages/drift_flutter
- drift_flutter changelog: https://pub.dev/packages/drift_flutter/changelog
- drift_dev: https://pub.dev/packages/drift_dev
- Repository: https://github.com/simolus3/drift
- Releases: https://github.com/simolus3/drift/releases
- Cross-platform example: https://github.com/simolus3/drift/tree/develop/examples/app

## Official SQLite references

- Foreign keys: https://sqlite.org/foreignkeys.html
- Transactions: https://sqlite.org/lang_transaction.html
- WAL: https://sqlite.org/wal.html
- Query planner: https://sqlite.org/queryplanner.html
- EXPLAIN QUERY PLAN: https://sqlite.org/eqp.html
- Indexes and query planner checklist: https://sqlite.org/queryplanner-ng.html
- Backup API: https://sqlite.org/backup.html
- Schema changes: https://sqlite.org/lang_altertable.html
- Safe table-rebuild procedure: https://sqlite.org/lang_altertable.html#making_other_kinds_of_table_schema_changes
- Integrity check pragma: https://sqlite.org/pragma.html#pragma_integrity_check

## Interpretation rules

Label guidance mentally as one of:

1. **Drift behavior/recommendation** — directly documented by Drift.
2. **SQLite behavior/recommendation** — database-engine fact that applies through Drift when the executor uses SQLite.
3. **Architectural inference** — a recommendation derived from documented behavior and normal production constraints.

Do not present category 3 as an official Drift guarantee.

When sources conflict:

1. Inspect the project’s resolved version and installed source.
2. Check matching generated API docs and changelog/release notes.
3. Prefer current official docs over old tutorials.
4. Confirm runtime behavior on each shipped executor.

Version-sensitive areas to revalidate on every upgrade:

- `driftDatabase` return type and `DriftNativeOptions`/`DriftWebOptions` fields;
- `NativeDatabase.createInBackground` and `readPool` semantics;
- `shareAcrossIsolates` lifecycle;
- WASM/worker build and asset names;
- Web storage selection and OPFS/IndexedDB migration behavior;
- builder and `make-migrations` commands;
- generated step migration APIs;
- SQLite version/extensions bundled by `sqlite3` build hooks;
- deprecated legacy Web and Moor APIs.
