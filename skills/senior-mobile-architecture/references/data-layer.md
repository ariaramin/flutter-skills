# Data Layer

## Repository responsibilities [D1]

Accessible Facebook transcript supports repositories coordinating local and remote sources. A repository should expose a coherent capability, e.g. `FeedRepository`, not raw infrastructure methods.

Typical responsibilities:
- fetch/refresh;
- cache/local persistence coordination;
- pagination state/contracts;
- mapping between transport/storage and application models when semantics differ;
- offline mutation synchronization;
- error normalization.

## Read-path template [D1/S]

Facebook candidate describes a path roughly:

`memory/store → local DB → remote`

with remote responses used to hydrate local state/cache before UI delivery.

Generalize as an explicit **read policy**, not a mandatory order:
- cache-first;
- local-first + revalidate;
- network-first + fallback;
- network-only;
- local-only.

Document the chosen policy per repository query.

## Local database choice [D1/S]

Facebook candidate argues for one relational DB with multiple tables to simplify relationships/joins and avoid synchronizing separate databases.

Use a relational local DB when:
- entities relate by keys;
- transactions matter;
- queries span records;
- offline dataset is structured.

Use other stores when their access semantics fit better; the course explicitly includes “Data Storage Types Compared” [C], but detailed preferences were not accessible.

## Authoritative source [D1/S]

In the Facebook design, candidate explicitly states backend is authoritative because clients can desynchronize.

Operational nuance:
- **authoritative business truth** may be backend;
- **client serving source** can still be local DB for responsive/offline UI [S].

Do not conflate “source of truth” with “the UI must always wait for network.”

## Pagination [D1/D2]

### Cursor
The Facebook candidate chooses cursor for a changing feed. Dedicated pagination video exposes offset/cursor/how-to-choose chapters.

Client paging state should track:
- cursor(s);
- load direction;
- end-of-list;
- in-flight request;
- page error;
- deduplication keys;
- refresh reset behavior.

### Prefetch [D1]
Instructor feedback explicitly says feed prefetching could have been discussed.

Define a prefetch threshold based on:
- visible-item distance;
- network latency;
- page size;
- media weight;
- data/battery budget.

## Offline writes [D1]

Persist pending interactions with enough metadata to reconcile and deduplicate. For likes/comments, transcript describes interaction records with ID/type/status/timestamp-like fields.

## Cache invalidation [S]

For each cache define:
- key;
- value/version;
- TTL/freshness condition;
- invalidation trigger;
- capacity/eviction;
- behavior under memory pressure;
- privacy/sensitivity constraints.

## Data-layer review questions

- Does the repository have one coherent capability?
- Can a consumer tell whether returned data can be stale?
- Are local and remote IDs stable/mapped?
- Does pagination survive refresh and duplication?
- Are mutations idempotent/deduplicated?
- Can pending work survive the required lifecycle?
- Are migrations/versioning defined for durable storage?
