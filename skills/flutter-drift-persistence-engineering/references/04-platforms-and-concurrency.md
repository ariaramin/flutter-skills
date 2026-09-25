# Platforms and Concurrency

## Contents

- Native background execution
- Cross-isolate sharing and read pools
- WAL and SQLite pragmas
- Web/WASM workers and storage implementations
- Cross-platform decision matrix

## Use background native execution by default

SQLite’s C API is synchronous. Running it on the UI isolate can block frames. Current official setup uses `driftDatabase` or, for manual native connections, `NativeDatabase.createInBackground`:

```dart
LazyDatabase openNative(File file) {
  return LazyDatabase(() async {
    return NativeDatabase.createInBackground(file);
  });
}
```

This creates a long-lived Drift-managed executor isolate. It protects UI responsiveness but makes each operation cross an isolate boundary. Batch small repetitive operations instead of sending thousands of individual calls.

Do not wrap ordinary Drift calls in `compute()` or `Isolate.run`; a database instance is not sendable, and the standard background executor already moves SQL work.

## Share one logical database across app isolates only when required

Manual `DriftIsolate` APIs are appropriate when an app-controlled background isolate must run Drift queries against the same logical database while keeping stream updates synchronized.

Do not send the generated database object to another isolate. Send/connect through Drift’s isolate handle and construct a database client around the returned connection.

Independent database instances pointed at the same file do not share Drift’s in-memory stream invalidation. They may observe committed rows on subsequent reads, but watched queries can remain stale without coordinated notifications.

Use `drift_flutter`'s current `shareAcrossIsolates` option when it matches the resolved version and lifecycle. Prefer it over hand-built ports for a standard Flutter app.

## Add a read pool only from evidence

`NativeDatabase.createInBackground(readPool: n)` creates one write isolate plus `n` read isolates. It can help when long reads block short reads or a write-heavy workload blocks latency-sensitive reads.

```dart
NativeDatabase.createInBackground(
  file,
  setup: (database) {
    database.execute('PRAGMA journal_mode = WAL;');
    database.execute('PRAGMA foreign_keys = ON;');
  },
  readPool: 2,
);
```

Transactions and exclusive blocks stay on the write isolate. More readers are not automatically faster; they increase isolates, connections, memory, cache duplication, and concurrency pressure.

## Understand WAL

WAL allows one writer and concurrent readers and is required by the official multi-reader example to avoid lock errors. It is a SQLite feature, not a universal Drift default.

Use WAL when:

- native platform storage supports it;
- concurrent readers/writer provide measured value;
- backup and checkpoint behavior is understood.

Do not assume:

- WAL permits multiple simultaneous writers;
- WAL is supported by Drift Web;
- copying only the main `.sqlite` file while live captures a consistent WAL database;
- changing journal mode is safe during arbitrary active work.

Open-time pragmas must run on every relevant connection. Verify how the chosen executor’s `setup` callback applies to read-pool connections.

Avoid cargo-cult pragmas. `synchronous`, cache size, mmap, busy timeouts, and checkpoint tuning trade durability, memory, and latency. Change them only with SQLite documentation, failure requirements, and measurement.

## Use the modern Web path

Use `driftDatabase` with `DriftWebOptions` for normal Flutter setup, or `WasmDatabase.open` for manual control:

```dart
final result = await WasmDatabase.open(
  databaseName: 'app',
  sqlite3Uri: Uri.parse('sqlite3.wasm'),
  driftWorkerUri: Uri.parse('drift_worker.dart.js'),
);

final connection = result.resolvedExecutor;
```

Check current return types; wrapping a delayed async open may require `DatabaseConnection.delayed`.

Do not use legacy `WebDatabase` from `package:drift/web.dart` or old manual worker APIs for new code. `WasmDatabase.open` manages suitable dedicated/shared workers.

## Deploy Web assets correctly

- Serve the matching `sqlite3.wasm` and compiled Drift worker at the configured URIs.
- Configure MIME/CSP/hosting rules so both load in release deployment.
- Add COOP/COEP only after evaluating the rest of the application; they unlock stronger OPFS behavior in some browsers but affect cross-origin resources.
- Test supported browsers, private modes, quotas, multiple tabs, refresh, upgrade, and cleared site data.
- Observe `WasmDatabaseResult.chosenImplementation` and `missingFeatures` when persistence guarantees matter.

Drift chooses among OPFS/shared-worker, IndexedDB-backed, unsafe single-context, and in-memory implementations based on browser features. If it falls back to unsafe IndexedDB or in-memory and durable multi-tab data is required, show an actionable warning or reject the unsupported mode.

WAL is not supported on Web. A WAL database cannot be imported through `initializeDatabase`; convert/checkpoint it to the default journal mode first.

## Platform matrix

| Platform | Default executor | Key checks |
|---|---|---|
| Android/iOS | `driftDatabase` / background native SQLite | file location, lifecycle, temp directory in manual setup, migration latency |
| Windows/macOS/Linux | background `NativeDatabase` | writable app directory, packaging/build hooks, file locking, backup |
| Web | `WasmDatabase.open` via `DriftWebOptions` | WASM/worker deployment, storage fallback, headers, multi-tab safety, quota |

Keep schema/query APIs shared. Isolate connection construction behind conditional imports or `drift_flutter`; do not scatter `kIsWeb` throughout DAOs.

## Startup strategy

Construct lazily when the first screen does not require data. Initialize eagerly when authentication/routing depends on migrations or seed data, but expose a deliberate startup state and failure recovery.

Do not run a large warm-up query set simply because the database opened. Migrations and first reads may contend for startup CPU/I/O; measure cold start separately from steady state.
