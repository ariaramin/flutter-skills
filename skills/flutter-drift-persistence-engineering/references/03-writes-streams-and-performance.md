# Writes, Streams, and Performance

## Contents

- Inserts, updates, deletes, and upserts
- Transactions and batches
- Reactive query invalidation
- Large imports and result sets
- Performance diagnosis and observability

## Write with explicit semantics

Use generated companions for partial writes because `Value.absent()` differs from writing SQL `NULL`.

```dart
Future<void> renameNote(int id, String title) {
  return (update(notes)..where((row) => row.id.equals(id))).write(
    NotesCompanion(title: Value(title)),
  );
}
```

Every update/delete without `where` affects all rows. Full-table mutations must be visibly intentional and tested.

Use `insertReturning` when the caller needs generated defaults or IDs. Avoid insert-then-select when one returning statement suffices and the deployed SQLite supports it.

Use `insertOnConflictUpdate` only when overwriting all intended non-key fields is correct. Use `DoUpdate` with an explicit conflict target for partial updates or non-primary unique constraints.

## Use transactions for invariants

```dart
Future<void> moveNote(int noteId, int newOwnerId) {
  return transaction(() async {
    final owner = await (select(users)..where((u) => u.id.equals(newOwnerId)))
        .getSingleOrNull();
    if (owner == null) throw StateError('Owner does not exist');

    await (update(notes)..where((n) => n.id.equals(noteId))).write(
      NotesCompanion(ownerId: Value(newOwnerId)),
    );
  });
}
```

Await every query in a transaction. The transaction ends when its callback completes. Do not start unawaited database work, timers, HTTP calls, user prompts, or long CPU work inside it.

Transactions serialize through the write connection. Keep them short. Nested transactions use savepoint-like behavior on supported executors, but do not add nesting for style.

## Batch repetitive writes

```dart
Future<void> insertNotes(List<NotesCompanion> rows) async {
  await batch((batch) {
    batch.insertAll(notes, rows);
  });
}
```

Batches are atomic and allow statement reuse. They avoid an await/transport crossing per row, which matters with background isolates and Web workers.

For very large imports:

- parse and validate outside the transaction when safe;
- write chunks sized from memory/latency measurement;
- give imports an idempotent checkpoint or natural key;
- do not notify the UI after every row;
- decide whether partial progress is allowed before chunking atomic work.

## Understand stream invalidation

Drift tracks tables read by each watched query. Writes through Drift notify affected table streams, which rerun the full query. The system is table-aware, not row-precise.

Consequences:

- a write can rerun a watched query even when its result rows did not change;
- expensive joins and large result sets magnify write cost;
- writes made outside Drift do not automatically notify streams;
- custom SQL needs correct `readsFrom`/write metadata.

Use one-shot `get()` for screens or operations that do not require live updates. Use watched queries for genuinely reactive state.

Keep reactive queries:

- selective and indexed;
- limited to required columns and rows;
- stable across widget rebuilds;
- owned by state/repository scope rather than recreated repeatedly;
- canceled when the owning scope ends.

Drift streams emit the current snapshot when listened to. Do not perform an initial `get()` followed by `watch()` unless the duplicate read is intentional.

## Handle transaction streams correctly

Streams created outside a transaction publish transaction changes after commit, preserving consistency and avoiding intermediate emissions.

Streams created inside a transaction see transaction-local changes and close when the transaction ends. Consume them inside the callback (for example with `first`); never return them to UI code.

## Bound reads and memory

Avoid unbounded `get()` on growing tables. Add limits, pagination, aggregation, or streaming/export-specific processing.

Select only needed columns on hot paths. Large result lists cross isolate/worker boundaries and allocate generated Dart objects even when SQLite execution is fast.

Avoid storing large images, videos, or document bodies in frequently queried tables. If blobs are required, isolate them in a separate table and fetch on demand.

## Prepared statements and reuse

Do not build a custom prepared-statement cache by default. Drift and executors manage statement preparation, and historical defaults have changed. Batches already reuse repetitive statement shapes. Optimize only after profiling the resolved version.

Keep SQL shapes stable and use variables; interpolated values defeat reuse and risk injection.

## Diagnose performance end to end

Measure separately:

```text
queue wait
SQLite execution
isolate/worker serialization
row mapping
stream/state propagation
Flutter build/layout/paint
```

A background executor reduces UI blocking but adds crossings and cannot fix a table scan. An index can fix a scan but increases write/migration cost. A read pool can isolate long reads but consumes isolates and requires WAL. Choose the smallest intervention matching evidence.

Use statement logging only temporarily and never expose secrets or personal data. Prefer a `QueryInterceptor` or structured timing that records operation, duration, row count, and sanitized query identity.

## Performance review checklist

- Are hot predicates and ordering backed by suitable indexes?
- Are any query-per-row loops present?
- Are result sizes bounded?
- Are watched queries broader than their UI need?
- Are equivalent streams subscribed multiple times?
- Are large blobs transferred unnecessarily?
- Are writes batched?
- Are transactions waiting on non-database work?
- Is UI delay actually database time or downstream widget work?
- Was the fix measured on production-like row counts and target hardware/browser?
