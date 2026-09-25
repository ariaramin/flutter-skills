# Setup and Architecture

## Contents

- Version and dependency inspection
- Database declaration and generated code
- Connection ownership and lifecycle
- DAOs, repositories, and modular generation
- Current setup examples

## Inspect the resolved toolchain

Read `pubspec.yaml`, `pubspec.lock`, `build.yaml`, SDK constraints, and generated files before changing code. Keep `drift` and `drift_dev` on compatible releases. Do not copy version numbers from this reference into a project without resolving current compatible versions.

The researched baseline is:

```text
drift 2.34.3
drift_flutter 0.3.1
drift_dev 2.34.x (official setup showed 2.34.5)
Dart minimum for drift 2.34.x: 3.10
```

Since Drift 2.32 with `sqlite3` 3.x, current native setup bundles SQLite through build hooks; do not add legacy `sqlite3_flutter_libs` merely because an old guide does.

## Prefer the current Flutter setup

For an ordinary Flutter app shipping native and Web platforms, prefer `drift_flutter`:

```dart
import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';
import 'package:path_provider/path_provider.dart';

part 'app_database.g.dart';

@DriftDatabase(tables: [Users, Notes], daos: [NotesDao])
class AppDatabase extends _$AppDatabase {
  AppDatabase.forTesting(QueryExecutor executor) : super(executor);

  AppDatabase.defaults() : super(_openConnection());

  @override
  int get schemaVersion => 1;

  static DatabaseConnection _openConnection() {
    return driftDatabase(
      name: 'app',
      native: const DriftNativeOptions(
        databaseDirectory: getApplicationSupportDirectory,
      ),
      web: DriftWebOptions(
        sqlite3Wasm: Uri.parse('sqlite3.wasm'),
        driftWorker: Uri.parse('drift_worker.dart.js'),
      ),
    );
  }
}
```

Verify the exact return type and option signatures against resolved `drift_flutter`; version 0.3.1 changed `driftDatabase()` to return `DatabaseConnection` rather than the less-specific `QueryExecutor`.

## Keep construction injectable

Accepting an executor provides the smallest useful test seam:

```dart
AppDatabase.forTesting(QueryExecutor executor) : super(executor);
```

Use an in-memory native executor in tests and close it in teardown. Avoid a service locator hard-coded inside the database class because it obscures ownership and migration testing.

## Give one component ownership

Create one long-lived database per logical database file at the application/service scope. The owner must:

- create it once;
- make initialization failure visible;
- expose it through dependency injection;
- close it during an intentional application/test shutdown;
- prevent widgets from closing the shared instance.

Multiple independent database objects aimed at the same file can execute SQL safely under SQLite rules, but Drift stream invalidation is not automatically synchronized between independent instances. Use a shared logical connection when reactive consistency matters.

## Separate database, DAO, and repository responsibilities

Use the database for:

- schema and connection ownership;
- migration strategy;
- truly cross-feature transactions.

Use a DAO when a feature has enough Drift queries to benefit from generated table access and modularity:

```dart
part 'notes_dao.g.dart';

@DriftAccessor(tables: [Notes, Users])
class NotesDao extends DatabaseAccessor<AppDatabase> with _$NotesDaoMixin {
  NotesDao(super.attachedDatabase);

  Selectable<Note> notesForUser(int userId) {
    return select(notes)
      ..where((row) => row.ownerId.equals(userId))
      ..orderBy([(row) => OrderingTerm.desc(row.updatedAt)]);
  }
}
```

Use a repository when it adds application policy: coordinating local and remote data, mapping persistence rows to domain types, conflict resolution, or owning a multi-DAO workflow. Do not wrap every DAO method with a pass-through repository.

## Choose Dart tables or `.drift` SQL deliberately

Use Dart tables and query builders when:

- queries are simple and compose dynamically;
- the team prefers Dart refactoring and expressions.

Use `.drift` files when:

- complex SQL, CTEs, window functions, views, triggers, or SQL-first review are clearer;
- generated typed methods reduce manual row mapping.

Avoid runtime raw SQL strings when a typed Dart query or verified `.drift` statement can express the query.

## Generated-code strategy

Run the project’s established generator command, typically:

```sh
dart run build_runner build --delete-conflicting-outputs
```

Do not edit generated files. Commit them only if repository policy requires it.

Use default generation for small/medium databases. Consider Drift modular generation only when a large generated part measurably slows builds or analyzer performance. Modular generation changes file layout and generated symbol names, so treat adoption as a migration rather than cosmetic cleanup.

When configuring `build.yaml`:

- enable `fatal_warnings` in CI if the team accepts generator warnings as failures;
- set assumed SQLite version/extensions to match runtime deployment;
- remember generator SQL options affect static analysis, not runtime SQLite capabilities.
