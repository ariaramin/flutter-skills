# Schema and Queries

## Contents

- Table invariants and row modeling
- Keys, constraints, foreign keys, and indexes
- Typed selects, joins, custom SQL, and serialization
- N+1 avoidance and pagination
- Query-plan review

## Encode invariants in SQLite

Use `NOT NULL`, primary keys, unique constraints, checks, and references where the invariant belongs to stored data. Application validation improves UX; it does not replace database integrity.

```dart
class Users extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get email => text().unique()();
  TextColumn get displayName => text().withLength(min: 1, max: 120)();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
}

class Notes extends Table {
  IntColumn get id => integer().autoIncrement()();
  IntColumn get ownerId => integer().references(Users, #id)();
  TextColumn get title => text()();
  TextColumn get body => text().withDefault(const Constant(''))();
  DateTimeColumn get updatedAt => dateTime()();
}
```

Choose stable primary keys that match synchronization and import requirements. Auto-increment integers are compact local keys. Externally generated IDs are often better when rows originate offline or merge across databases.

## Enable foreign-key enforcement

SQLite foreign keys are disabled by default in many setups. Enable them for every connection through the connection setup or `MigrationStrategy.beforeOpen`:

```dart
beforeOpen: (_) async {
  await customStatement('PRAGMA foreign_keys = ON');
},
```

Choose `onDelete`/`onUpdate` semantics explicitly. Avoid cascading deletion when losing dependent user data would surprise the product.

## Design indexes from real access paths

An index has write, storage, migration, and cache costs. Add one for important measured or clearly dominant predicates, joins, uniqueness, and ordering—not for every column.

For:

```sql
SELECT * FROM notes
WHERE owner_id = ?
ORDER BY updated_at DESC, id DESC
LIMIT ?;
```

prefer a composite index beginning with the equality predicate and continuing with sort/tie-break columns:

```dart
@TableIndex(
  name: 'notes_owner_updated_id',
  columns: {#ownerId, #updatedAt, #id},
)
class Notes extends Table {
  // columns...
}
```

Verify ordering support and exact `@TableIndex` syntax against the installed Drift version. Use `TableIndex.sql` or a verified `.drift` `CREATE INDEX` for partial/expression indexes that annotations cannot express cleanly.

Do not keep an index that is a redundant left prefix of another without evidence. Avoid booleans or low-cardinality enums as the first composite column unless combined distribution and queries justify it.

## Use typed query composition

Return `Selectable<T>` from DAOs when callers may choose `get()` or `watch()`:

```dart
Selectable<Note> pageForUser({
  required int userId,
  required int limit,
}) {
  return (select(notes)
    ..where((row) => row.ownerId.equals(userId))
    ..orderBy([
      (row) => OrderingTerm.desc(row.updatedAt),
      (row) => OrderingTerm.desc(row.id),
    ])
    ..limit(limit));
}
```

Use `getSingleOrNull()` when zero or one row is valid. Do not use `getSingle()` unless zero rows is a programming/data error.

## Replace N+1 loops with set-based queries

Avoid:

```text
load 100 notes
→ query owner for each note
```

Use a join:

```dart
final query = select(notes).join([
  innerJoin(users, users.id.equalsExp(notes.ownerId)),
]);

return query.map((row) => NoteWithOwner(
  row.readTable(notes),
  row.readTable(users),
));
```

For one-to-many relationships, a join duplicates parent columns. Group rows deliberately or use a small fixed number of set queries when that reduces transfer and mapping cost. The goal is bounded queries, not “one query at any cost.”

## Prefer verified custom SQL

Use `.drift` files for complex SQL so Drift validates syntax, types parameters, and generates result classes:

```sql
recentNotesForUser:
SELECT n.*
FROM notes AS n
WHERE n.owner_id = :userId
ORDER BY n.updated_at DESC, n.id DESC
LIMIT :limit;
```

When using `customSelect`, pass variables instead of interpolating values and declare `readsFrom` for reactive invalidation:

```dart
customSelect(
  'SELECT * FROM notes WHERE owner_id = ? ORDER BY updated_at DESC LIMIT ?',
  variables: [Variable.withInt(userId), Variable.withInt(limit)],
  readsFrom: {notes},
);
```

Never interpolate untrusted input into SQL identifiers or clauses. Bound values do not make dynamic identifiers safe; whitelist identifiers when unavoidable.

## Paginate deterministically

Offset pagination is simple but deep offsets still require SQLite to walk skipped rows and concurrent inserts can shift pages.

Use keyset pagination for large, ordered feeds:

```text
WHERE owner_id = :owner
  AND (updated_at < :cursorTime
       OR (updated_at = :cursorTime AND id < :cursorId))
ORDER BY updated_at DESC, id DESC
LIMIT :pageSize
```

Index `(owner_id, updated_at, id)` and include a unique tie-breaker. Use offset for small admin lists or direct page-number UX where its tradeoff is accepted.

## Keep values queryable

Use type converters for domain representation only when the stored SQLite type remains useful. Avoid serializing relational/queryable data into a JSON blob merely to avoid tables. Large blobs inflate reads and isolate messages; store file-backed media outside SQLite unless transactional blob storage is a deliberate requirement.

## Inspect plans

For slow production-shaped queries:

1. Capture SQL and bound-value shape without sensitive values.
2. Run `EXPLAIN QUERY PLAN` against representative row counts.
3. Look for full scans, temporary sorts, repeated subqueries, and unused indexes.
4. Change schema/query minimally.
5. Re-measure latency, writes, file size, and migration cost.

Do not force an index or add planner hints until the plan and data distribution justify it.
