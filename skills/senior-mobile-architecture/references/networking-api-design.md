# Networking & API Design

## Channel-supported topic map

- REST statelessness — dedicated REST video [D2].
- REST vs GraphQL — dedicated comparison video [D2].
- WebSockets vs polling/long polling/SSE — dedicated realtime video [D2].
- Offset vs cursor pagination — dedicated pagination video [D2].
- REST + JSON, SSE/WebSockets/gRPC alternatives — Facebook mock [D1].
- REST API design, API communication protocols, realtime updates, authentication — current course curriculum [C].

## API-contract-first reasoning [D1/D2]

Before client architecture, define the minimum API operations that support the product:
- read/query operations;
- mutation operations;
- pagination;
- auth identity context;
- error contract;
- realtime updates if needed.

The mock interview structure repeatedly surfaces API/data model before high-level client design.

## REST [D2]

Creator metadata calls **statelessness** a key REST principle.

Operational implications [S]:
- each request carries enough context/auth to be handled independently;
- standard HTTP method/status/cache semantics can improve interoperability;
- mobile clients need versioning/backward compatibility because old app versions remain in the wild.

## GraphQL [D2/S]

Accessible metadata frames GraphQL as an alternative to REST and mentions ecosystem support for caching/pagination/type-safe models.

Evaluate:
- field flexibility vs cache/schema complexity;
- single graph vs service-specific ownership;
- query cost controls;
- offline normalized-cache needs;
- generated model/tooling quality.

Do not claim GraphQL is universally superior for mobile.

## Realtime selection [D2/D1/S]

### Polling
Simple; suitable when freshness interval is coarse.

### Long polling
Reduces empty polls but keeps request churn/complexity.

### SSE
One-way server→client streaming; useful when client mostly consumes events.

### WebSocket
Full duplex; useful for chat/collaboration/high-frequency bidirectional events.

### Push notification
Good wake-up/notification mechanism, not a full realtime state-sync transport [S].

For any choice specify reconnect, resume/sequence token, duplicate handling, auth renewal, background behavior, battery/data cost.

## Pagination API contract [D1/D2]

Cursor example shape (conceptual, not copied source code):

```text
GET /v1/feed?after=<cursor>&limit=<n>
→ items + next_cursor + has_more
```

Define stable ordering and what happens when the feed mutates between requests.

## Error model [D1/S]

Classify:
- validation/auth/permission;
- rate limit;
- transient server;
- transport/offline;
- timeout/cancel;
- conflict;
- unknown.

Map technical errors to actionable application states. Do not indiscriminately retry all 4xx/5xx responses; the transcript discusses categories but the stricter retry classification here is supplemental correctness guidance.
