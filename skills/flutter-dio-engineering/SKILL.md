---
name: flutter-dio-engineering
description: Design, implement, review, debug, secure, test, refactor, and optimize production Flutter/Dart networking built with Dio 5.x. Use this skill whenever a Flutter task involves Dio clients, REST/HTTP APIs, BaseOptions/Options, interceptors, bearer authentication, token refresh, retries, cancellation, uploads/downloads, streaming, transformers, cookies, caching, adapters, TLS/certificates, proxies, HTTP/2, Flutter Web/CORS, networking errors, DTOs, repositories, observability, performance, or migration from older Dio APIs—even if the user only asks to add or fix one API call.
compatibility: Designed for Dio 5.x-era Flutter/Dart projects. Inspect the repository's locked Dio, Flutter, Dart, adapter, and companion-package versions before using version-sensitive APIs or migration guidance.
---
# Flutter Dio Engineering
## Operating stance
Treat Dio as the transport layer, not the application architecture. Preserve this priority order:

1. correctness
2. security
3. reliability
4. maintainability
5. testability
6. performance
7. scalability
8. developer experience

Apply these invariants:
- Reuse a coherently configured `Dio` instance; do not construct `Dio()` per request.
- Interpret reuse by networking-policy boundary, not as one mutable process-global client for unrelated origins or security policies.
- Keep Dio behind typed API/data abstractions; widgets and state-management code should not depend on raw Dio internals.
- Map `DioException` into application/repository failures at the data boundary.
- Keep business rules and navigation out of interceptors.
- Keep dynamic credentials out of long-lived static `BaseOptions.headers`.
- Filter endpoint-specific policy through request `Options`/`extra` instead of mutating global client state.
- Prevent token-refresh recursion and concurrent refresh storms.
- Retry only when method/backend semantics make repetition safe; bound attempts and total cost.
- Treat intentional cancellation separately from connectivity failure.
- Use streaming/file-oriented APIs for large transfers instead of buffering without need.
- Never log bearer tokens, refresh tokens, cookies, passwords, confidential credentials, payment data, or sensitive bodies.
- Never disable TLS verification in production.
- Do not attempt to solve Web CORS with client-side `Access-Control-Allow-*` request headers.
- Test networking deterministically through injected clients/adapters; ordinary unit tests must not require live production services.
- Profile before replacing current Dio defaults such as its transformer or adapter.
## Version and evidence gate
The supplied guide targets current Dio 5.x behavior and specifically discusses Dio 5.11-era APIs such as `transformTimeout`, `FusedTransformer`, current multipart behavior, and concurrency fixes.

Before editing a repository:

1. inspect `pubspec.yaml` and `pubspec.lock`;
2. identify locked `dio`, `dio_http2_adapter`, `dio_cookie_manager`, and related versions;
3. inspect Flutter/Dart constraints and target platforms;
4. check for deprecated names such as `DioError`, `DioErrorType`, legacy adapters, or old transformer examples;
5. preserve source-supported distinctions:
   - **Dio behavior**: documented/source-backed contract;
   - **Official Dio recommendation**: package recommendation;
   - **Architecture recommendation**: design inference;
   - **General HTTP/security practice**: protocol/security guidance rather than a Dio-specific rule.

Do not present architecture inference as a Dio API guarantee.
## Reference routing
Read only the references needed for the task:
| Task | Read |
|---|---|
| Client lifecycle, request pipeline, `BaseOptions`, `Options`, `RequestOptions`, typed API clients, repository boundaries | `references/01-architecture-client-options.md` |
| Authentication, interceptors, `QueuedInterceptor`, shared refresh Future, `DioException`, timeouts, cancellation, retry/idempotency, concurrency | `references/02-auth-interceptors-reliability.md` |
| DTO mapping, multipart, uploads/downloads, streaming, `FusedTransformer`, logging/security, Web/CORS, cookies, caching, adapters, proxy, HTTP/2, performance | `references/03-data-transfers-platform-performance.md` |
| Bloc/Cubit integration, fake adapters, tests, observability, common anti-patterns | `references/04-testing-observability-antipatterns.md` |
| New-feature workflow, existing-code audit, debugging, refactoring, review/performance/security/production checklists, quick reference | `references/05-workflows-debugging-checklists.md` |
For a broad networking audit, read all five references after completing the repository inventory below.
## Repository inventory
Inspect before changing code.
### Client topology
Find every:
- `Dio(` / `Dio()` construction;
- clone/factory/client wrapper;
- `BaseOptions` mutation;
- `httpClientAdapter` customization;
- `close()` call.
For each client record:
- owner and lifetime;
- base origin;
- authentication policy;
- interceptor order;
- timeout policy;
- adapter/TLS/proxy policy;
- target platforms;
- who is allowed to close it.
### Request/data boundaries
Inspect:
- absolute URLs scattered through code;
- endpoint methods;
- query/body encoding;
- `validateStatus` overrides;
- raw `Map<String, dynamic>` escaping API clients;
- `Response` or `DioException` escaping repositories;
- state-management objects constructing requests directly.
### Cross-cutting behavior
Inventory:
- bearer injection;
- refresh endpoint/client;
- every interceptor and whether it is queued;
- retries and idempotency keys;
- `CancelToken` ownership;
- file transfers/progress;
- cookies/caches;
- logging/telemetry;
- certificate/proxy customization;
- Web-specific code;
- tests and fake adapters.
Do not add a second competing mechanism until you understand the existing one.
## Request lifecycle model
Reason about Dio requests in this order:
```text
API client
→ BaseOptions + per-request Options + arguments
→ RequestOptions
→ request interceptors (FIFO)
→ request transform/body encoding
→ HttpClientAdapter
→ platform HTTP stack
→ response body
→ validateStatus
→ response transform
→ response interceptors (FIFO)
→ caller
```
Failure paths normalize through `DioException` and then error interceptors in insertion order.

Important consequences:
- Interceptor response/error order is FIFO; do not assume reverse middleware order.
- A pre-canceled `CancelToken` can stop the request before transport begins.
- Request interceptors may `next`, `resolve`, or `reject`; complete exactly one handler path.
- `validateStatus` changes whether a status becomes a normal `Response` or `DioException.badResponse`.
- `receiveDataWhenStatusError` means rejected statuses can still have transformed/decoded response data.
- `RequestOptions` is the composed request contract; feature code normally should not construct it directly.
## Default architecture
Prefer:
```text
UI
→ state management
→ repository
→ typed API client / remote data source
→ Dio
→ server
```
Use responsibilities deliberately:
- **UI**: rendering, input, progress presentation, navigation.
- **State management**: feature intent and loading/success/failure state.
- **Repository**: domain-facing operations, cache/local composition, failure mapping.
- **API client**: endpoint method/path/query/body, DTO parsing, endpoint-specific options.
- **Dio**: transport, interceptors, transformation, cancellation, adapter.
Avoid giant catch-all API services when feature/service-scoped clients reduce coupling.
## Client selection gate
Reuse an existing Dio when origin and network policy match.

Create a distinct client when a material boundary differs, such as:
- backend/base URL;
- certificate/trust policy;
- proxy/adapter policy;
- refresh endpoint recursion isolation;
- radically different transfer/timeouts;
- ownership/lifecycle.
Do not create a new client merely because one endpoint is different. Prefer per-request `Options` for endpoint-specific behavior.
## Options discipline
Use `BaseOptions` only for real client-wide defaults such as base URL, common `Accept`, coherent timeout defaults, shared redirect policy, or adapter-level assumptions.

Use request `Options` for endpoint-specific:
- response type;
- content type;
- unusual timeout;
- auth opt-out;
- retry/idempotency metadata;
- endpoint-specific headers;
- status acceptance;
- redirect policy.
Use `extra` for local transport metadata consumed by interceptors/transformers. Keep secrets out of generic metadata.

Do not globally force JSON content type if the client also sends multipart or other body types.
## Authentication and refresh gate
Separate four concerns:

1. secure token storage;
2. refresh endpoint/client;
3. dynamic bearer injection;
4. application session invalidation.

For refresh:
- keep refresh requests out of the bearer-refresh recursion path;
- synchronize refresh work so concurrent `401`s share one refresh operation;
- compare the failed Authorization header with the currently stored token to detect that another request already refreshed;
- tag retried requests and permit at most the intended refresh retry;
- clear/invalidate session on terminal refresh failure;
- keep login navigation outside interceptors.
Prefer a shared refresh Future when only refresh work needs serialization. Use `QueuedInterceptor` only when serialized interceptor access itself is required.

Remember current queued semantics: request, response, and error queues are separate; it does not mean request A completes its entire lifecycle before request B starts.
## Interceptor gate
Use interceptors for transport-wide concerns such as:
- current auth header;
- correlation/tracing metadata;
- language/tenant headers;
- request signing;
- cookies;
- bounded transport telemetry;
- tightly constrained refresh/retry behavior.
Do not put:
- navigation;
- dialogs;
- feature state;
- business policy;
- DTO-to-domain mapping;
- unrelated endpoint orchestration
inside interceptors.

Order interceptors deliberately. A signer must see the values it signs. A logger that should observe final request changes belongs after the modifying interceptors.
## Error mapping gate
Handle all current `DioExceptionType` categories deliberately:
- `connectionTimeout`;
- `sendTimeout`;
- `receiveTimeout`;
- `transformTimeout`;
- `badCertificate`;
- `badResponse`;
- `cancel`;
- `connectionError`;
- `unknown`.
Map transport categories into stable application failures. Do not make widgets inspect Dio enums or raw response bodies.

Keep these distinctions:
- cancellation can be expected behavior;
- connection failure does not prove the user is offline;
- bad certificate is a security/transport failure and should not be blindly retried;
- malformed server payload is distinct from transport failure;
- `badResponse` means the server answered but status validation rejected it.
Preserve server correlation/request IDs where useful, without exposing sensitive bodies.
## Timeout gate
Tune the timeout phase that actually failed:
- `connectTimeout`: connection/opening;
- `sendTimeout`: outbound data/upload;
- `receiveTimeout`: waits for incoming response data/events;
- `transformTimeout`: response transformation.
Do not copy one arbitrary tuple to every endpoint. Base values on backend latency, payload size, network conditions, interaction type, retry policy, and total user-visible deadline.
## Retry and idempotency gate
Before any automatic retry, answer:

1. Is the failure plausibly transient?
2. Is replay safe by HTTP semantics and the actual backend contract?
3. Did the server already possibly process the side effect?
4. Is there an idempotency key or resumable protocol?
5. Is retry bounded by attempts and total elapsed time?

Never automatically retry:
- cancellation;
- certificate failure;
- malformed/validation failures;
- arbitrary `403`/`404`;
- side-effecting POST/payment/upload operations without a backend idempotency contract.
Treat access-token `401` as auth-refresh flow, not generic retry. Respect `Retry-After`/rate-limit policy for `429` where applicable. Use backoff/jitter for retryable transient failures.
## Cancellation gate
Use `CancelToken` when work can become obsolete:
- search superseded by a new query;
- feature disposed;
- cancelable transfer;
- redundant predecessor request;
- shared group with one real lifetime.
Do not share one token across unrelated requests. Fix duplicate trigger bugs in addition to canceling their consequences.
## Payload and transfer gate
### JSON and DTOs
Keep raw JSON at the data boundary. Validate required response fields and map to DTO/domain types deliberately.

Before custom JSON isolation/transformation, inspect current `FusedTransformer` behavior and measure. Large payloads may be better fixed with pagination/filtering than client-side parsing tricks.
### Uploads
Use `FormData`/`MultipartFile` or streams appropriate to the platform. Create fresh multipart content per attempt; do not reuse finalized `FormData` blindly.

For large uploads:
- avoid loading the entire file into memory when path/stream APIs exist;
- support cancellation/progress;
- use server resumable/idempotent protocols when retry is required.
### Downloads
On native, prefer `download()` or streamed file writes for large files instead of `ResponseType.bytes`.

For resume:
- send a valid `Range` request;
- append only after verifying `206 Partial Content`;
- do not append a full `200 OK` body to a partial file.
On Web, remember browser download behavior can buffer the full response and the browser controls final file location; do not promise native streaming-to-disk semantics.

Throttle/coalesce high-frequency progress updates before driving large UI rebuilds.
## Web gate
Treat Flutter Web as browser networking:
- CORS is server/browser policy;
- client `Access-Control-Allow-*` headers do not fix CORS;
- TLS, redirects, HTTP protocol, cookies, and download location are browser-controlled;
- use `BrowserHttpClientAdapter(withCredentials: true)` only when the server's credentialed CORS policy supports it;
- native filesystem/proxy/certificate assumptions do not automatically apply;
- very large browser downloads may require a server/browser-native delivery design.
## Security gate
Block release for any of these:
- blanket `badCertificateCallback => true`;
- production TLS validation disabled;
- confidential backend/API secrets embedded in the client;
- raw Authorization/Cookie/password/payment logging;
- development proxy/trust settings enabled in release;
- cross-origin redirect behavior that can leak credentials;
- unreviewed custom CA/pinning with no rotation/recovery plan.
Use request signing only when the key architecture actually supports the intended trust model. A secret embedded in a distributed Flutter binary is not a confidential server secret.
## Caching gate
Dio core is not a complete automatic response-cache architecture.

Choose cache by responsibility:
- repository memory cache for mapped domain data and feature freshness;
- disk cache for intentional persistence/offline behavior;
- standards-aware HTTP cache for `Cache-Control`, ETag, validators, and `304` semantics.
Cache identity must account for user/tenant/auth and representation-affecting headers. Never share private cached responses across security contexts merely because URLs match.
## Performance gate
Prioritize meaningful costs:

1. reuse clients and connections;
2. cancel obsolete requests;
3. eliminate duplicate requests;
4. avoid unnecessary queued interceptor serialization;
5. bound secure-storage or expensive interceptor work;
6. reduce oversized payloads;
7. stream large binaries;
8. throttle progress/UI updates;
9. disable sensitive/verbose production body logging;
10. bound retry cost.

Do not replace adapters, transformers, or protocols because they appear more advanced. Measure the actual bottleneck first.
## Testing gate
Prefer deterministic seams:
- API client tests: request shape, method/path/query/headers/body/options, response parsing, malformed payloads.
- Repository tests: DTO/domain mapping, failure mapping, cache/domain behavior.
- Interceptor tests: header injection, ordering, refresh, retry markers, concurrency.
- Adapter tests: inject a fake `HttpClientAdapter`.
- Auth concurrency test: several simultaneous `401`s must produce one refresh and bounded retries.
- Cancellation tests: pre-cancel, during transport, superseded search, expected cancellation UI semantics.
- Transfer tests: multipart keys/fresh instances, resume requires `206`, Web-specific behavior where targeted.
Run the repository's normal formatter/analyzer/test commands after changes.
## Change workflow
For each networking change:

1. document the backend contract;
2. identify the security/auth policy;
3. select the existing or new Dio client intentionally;
4. choose base versus request-specific options;
5. define request/response DTOs;
6. implement the endpoint in a typed API client;
7. validate the server payload;
8. map through the repository boundary;
9. decide cancellation ownership;
10. decide retry/idempotency policy;
11. verify refresh behavior if authenticated;
12. add safe telemetry;
13. add deterministic tests;
14. review Web/platform differences;
15. profile payload/interceptor/transfer cost if material;
16. run format/analyze/tests.
## Review output format
When reviewing a networking implementation, report:
### Architecture
- client ownership and boundaries;
- API/repository layering;
- interceptor responsibilities.
### Correctness
- request composition;
- status handling;
- DTO validation;
- cancellation/retry semantics.
### Authentication and security
- token lifecycle;
- refresh concurrency;
- TLS/certificate/proxy/logging risks.
### Reliability
- timeouts;
- idempotency;
- rate-limit handling;
- failure mapping.
### Performance
- duplicate work;
- payload size;
- streaming/buffering;
- queued interceptor cost;
- transform/progress behavior.
### Platform differences
- Web/CORS/cookies/downloads;
- native adapter/filesystem/TLS behavior.
### Tests
- missing deterministic coverage;
- concurrency/cancellation/transfer cases.
### Required changes
Order findings by severity and state the smallest safe fix.
## Production definition of done
Approve the networking layer only when the applicable evidence shows:
- Dio clients are reused and owned coherently;
- base URLs and endpoint contracts are correct;
- request/global options are scoped correctly;
- DTO parsing validates server payloads;
- `DioException` does not leak into presentation code;
- current access tokens are injected dynamically;
- refresh cannot recurse or fan out into many simultaneous refresh calls;
- retried auth requests are bounded;
- terminal refresh failure invalidates the session correctly;
- timeouts match operation classes;
- cancellation works for obsolete/long-running work;
- retry is bounded and side effects are idempotency-reviewed;
- multipart data is not reused unsafely;
- large native transfers avoid unnecessary whole-body buffering;
- Web behavior is browser-correct;
- TLS validation is intact;
- secrets are absent from logs and client-embedded confidential credentials;
- caches are separated by security context and have explicit semantics;
- interceptors remain transport-focused and concurrency-safe;
- performance changes have evidence when material;
- deterministic tests cover success, transport/server failure, malformed payload, auth refresh/concurrency, cancellation, and custom adapter/transfer behavior where used;
- the codebase uses current Dio 5.x names/APIs for its locked version.
If a critical condition cannot be evidenced, report the layer as **not approved for production** and identify the missing verification.
