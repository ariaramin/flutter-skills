# Application State & Synchronization

## State categories [I/S]

Model separately:

1. **Ephemeral UI state** — selection, expanded row, transient form focus.
2. **Presentation state** — loading/content/empty/error, paging state, screen-level derived view data.
3. **Durable local state** — records that must survive process death/offline usage.
4. **Server-authoritative state** — canonical remote record where backend resolves conflicts.
5. **Pending mutation state** — local intent not yet confirmed remotely.
6. **Navigation state** — route/backstack + stable destination arguments.

The category names are supplemental; offline/pending/navigation concerns are directly present in D1 material.

## State ownership rule

Every mutable state should have one clear owner and a defined observation/update path. Duplicate caches are allowed only with reconciliation/invalidations.

## Offline read model [D1/S]

For a feed-like feature:

`UI observes local serving state → repository refreshes remote → persist/merge → UI observes update`

This is often simpler than directly switching UI between remote and local responses because the UI sees one coherent stream [S]. The Facebook transcript describes local store/DB/remote coordination through repository.

## Optimistic mutation state machine [D1/S]

Recommended operational model:

`idle → pending_local → sending → confirmed`

Failure branches:

`pending_local/sending → retry_wait → sending`

or

`pending_local/sending → terminal_failed → user retry/cancel`

Persist the state if the product promises offline mutations across app restarts.

## Conflict/reconciliation questions

Before implementation answer:
- server wins, client wins, field-level merge, or domain-specific conflict rule?
- does order matter?
- can two devices edit the same entity?
- can the operation be deduplicated by request ID?
- how are stale pending operations expired?
- what does the user see after correction?

## Navigation [D1/S]

The Facebook mock demonstrates passing a post ID into a navigation/router mechanism that owns the back stack.

Prefer:
- route + stable identifier + minimal immutable params;
- destination resolves current data through its state/data owner;
- deep links use the same route contract;
- process restoration does not depend on an in-memory object reference.

## Avoid

- “loading = data == null” as the only state model;
- global mutable state as a cross-feature shortcut;
- optimistic UI without pending/failure state;
- two independently mutable copies of the same domain record;
- a view owning retry/sync queues that must outlive it;
- navigation carrying stale mutable aggregates.
