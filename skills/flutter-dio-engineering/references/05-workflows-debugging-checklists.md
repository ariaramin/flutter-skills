# Feature/review/debug/refactor workflows and production checklists

Source excerpt: lines 4178-4979 of the supplied Dio engineering guide.

## Table of contents

- [Feature Implementation Workflow](#feature-implementation-workflow)
  - [1. Understand the backend contract](#1-understand-the-backend-contract)
  - [2. Identify security requirements](#2-identify-security-requirements)
  - [3. Select the correct Dio client](#3-select-the-correct-dio-client)
  - [4. Decide global vs request-specific options](#4-decide-global-vs-request-specific-options)
  - [5. Define DTOs](#5-define-dtos)
  - [6. Implement endpoint method](#6-implement-endpoint-method)
  - [7. Validate server payload](#7-validate-server-payload)
  - [8. Map DTOs](#8-map-dtos)
  - [9. Define repository behavior](#9-define-repository-behavior)
  - [10. Evaluate cancellation](#10-evaluate-cancellation)
  - [11. Evaluate idempotency/retry](#11-evaluate-idempotencyretry)
  - [12. Evaluate auth refresh](#12-evaluate-auth-refresh)
  - [13. Add safe telemetry](#13-add-safe-telemetry)
  - [14. Add tests](#14-add-tests)
  - [15. Review platform differences](#15-review-platform-differences)
  - [16. Review performance](#16-review-performance)
  - [17. Run project checks](#17-run-project-checks)
- [Existing-Code Review Workflow](#existing-code-review-workflow)
  - [1. Find every Dio construction](#1-find-every-dio-construction)
  - [2. Find base URL duplication](#2-find-base-url-duplication)
  - [3. Inspect interceptors](#3-inspect-interceptors)
  - [4. Inspect authentication](#4-inspect-authentication)
  - [5. Inspect API clients](#5-inspect-api-clients)
  - [6. Inspect repository boundaries](#6-inspect-repository-boundaries)
  - [7. Inspect retry behavior](#7-inspect-retry-behavior)
  - [8. Inspect cancellation](#8-inspect-cancellation)
  - [9. Inspect uploads/downloads](#9-inspect-uploadsdownloads)
  - [10. Inspect logging](#10-inspect-logging)
  - [11. Inspect TLS/proxy settings](#11-inspect-tlsproxy-settings)
  - [12. Inspect tests](#12-inspect-tests)
- [Debugging Workflow](#debugging-workflow)
  - [Request is not sent](#request-is-not-sent)
  - [Incorrect URL](#incorrect-url)
  - [Missing headers](#missing-headers)
  - [Unexpected `401`](#unexpected-401)
  - [Refresh loop](#refresh-loop)
  - [Timeout](#timeout)
  - [Unexpected cancellation](#unexpected-cancellation)
  - [Malformed payload](#malformed-payload)
  - [Server error](#server-error)
  - [Interceptor ordering](#interceptor-ordering)
  - [Web CORS](#web-cors)
  - [Upload failure](#upload-failure)
  - [Download failure](#download-failure)
- [Refactoring Rules](#refactoring-rules)
- [Code Review Checklist](#code-review-checklist)
  - [Architecture](#architecture)
  - [Client lifecycle](#client-lifecycle)
  - [Options](#options)
  - [Authentication](#authentication)
  - [Interceptors](#interceptors)
  - [Errors](#errors)
  - [Retries](#retries)
  - [Cancellation](#cancellation)
  - [DTOs](#dtos)
  - [Upload/download](#uploaddownload)
  - [Security](#security)
  - [Tests](#tests)
- [Performance Checklist](#performance-checklist)
- [Security Checklist](#security-checklist)
- [Production Readiness Checklist](#production-readiness-checklist)
  - [Correctness](#correctness)
  - [Authentication](#authentication)
  - [Reliability](#reliability)
  - [Errors](#errors)
  - [Files](#files)
  - [Security](#security)
  - [Performance](#performance)
  - [Tests](#tests)
- [Quick Reference](#quick-reference)

---

# Feature Implementation Workflow

Before implementing a new networking feature:

## 1. Understand the backend contract

Record:

- origin/base URL;
- endpoint;
- HTTP method;
- request body;
- query parameters;
- request headers;
- response body;
- success statuses;
- documented error statuses;
- pagination;
- idempotency;
- rate limits;
- authentication;
- file-size limits;
- content types.

## 2. Identify security requirements

Determine:

- bearer token?
- cookies?
- public API key?
- confidential credential that should actually live server-side?
- request signing?
- custom CA?
- browser CORS?
- personal/sensitive payload?

## 3. Select the correct Dio client

Reuse an existing client when:

- backend;
- auth;
- certificate policy;
- adapter;

match.

Create a separate client only when policy differs materially.

## 4. Decide global vs request-specific options

Do not mutate global `dio.options` for one endpoint.

## 5. Define DTOs

Create request/response types before spreading maps through higher layers.

## 6. Implement endpoint method

Include:

- path;
- verb;
- query;
- body;
- options;
- cancellation;
- response type.

## 7. Validate server payload

Do not assume `dynamic` shape is valid.

## 8. Map DTOs

Keep transport representation at the data boundary.

## 9. Define repository behavior

Translate network failures and compose with caches/local data.

## 10. Evaluate cancellation

Ask:

- can this operation become obsolete?
- does screen disposal make the result useless?
- can a newer request replace it?

## 11. Evaluate idempotency/retry

Never enable generic retry without answering this question.

## 12. Evaluate auth refresh

Verify:

- endpoint requires auth;
- refresh endpoint is excluded;
- retries are bounded;
- concurrent `401`s share one refresh.

## 13. Add safe telemetry

No raw secrets.

## 14. Add tests

At minimum:

- success;
- malformed response;
- expected HTTP failure;
- transport failure;
- auth behavior where applicable;
- cancellation where applicable.

## 15. Review platform differences

Especially web:

- CORS;
- cookies;
- downloads;
- file access;
- certificate limitations.

## 16. Review performance

Check:

- payload size;
- duplicate calls;
- parsing;
- stream/file usage;
- progress update frequency;
- retry cost.

## 17. Run project checks

Typical:

```bash
dart format .
flutter analyze
flutter test
```

Use repository-specific commands when different.

---

# Existing-Code Review Workflow

Before refactoring, inventory the existing networking design.

## 1. Find every Dio construction

Search:

```text
Dio(
Dio()
DioForNative
DioForBrowser
dio.clone
```

For each client determine:

- owner;
- lifecycle;
- base URL;
- adapter;
- interceptor set;
- auth policy;
- timeout policy.

## 2. Find base URL duplication

Search absolute API URLs throughout source.

## 3. Inspect interceptors

For each interceptor document:

```text
Purpose:
Dependencies:
Request behavior:
Response behavior:
Error behavior:
Concurrency:
Security-sensitive data:
Can resolve/reject:
Queued:
Tests:
```

## 4. Inspect authentication

Determine:

- token source;
- storage;
- refresh path;
- number of clients;
- refresh recursion protection;
- concurrent `401` behavior;
- logout behavior.

## 5. Inspect API clients

Look for:

- giant services;
- raw maps;
- direct Dio in repositories;
- absolute URLs;
- endpoint-specific timeout mutations.

## 6. Inspect repository boundaries

Check whether UI/state management receives:

- `DioException`;
- `Response`;
- DTOs that should remain internal.

## 7. Inspect retry behavior

Search:

```text
retry
while
for (... attempt
Future.delayed
429
503
```

Verify idempotency.

## 8. Inspect cancellation

Search:

```text
CancelToken
cancel(
```

Find long-running/obsolete requests that lack cancellation.

## 9. Inspect uploads/downloads

Check:

- memory buffering;
- reused `FormData`;
- progress;
- file ownership;
- resume correctness;
- web differences.

## 10. Inspect logging

Search:

```text
LogInterceptor
print(
debugPrint(
developer.log
```

Audit token/header/body leakage.

## 11. Inspect TLS/proxy settings

Search:

```text
badCertificateCallback
validateCertificate
SecurityContext
findProxy
Http2Adapter
BrowserHttpClientAdapter
```

Treat blanket certificate acceptance as release-blocking.

## 12. Inspect tests

Determine whether request configuration and failure behavior are protected before changing architecture.

---

# Debugging Workflow

## Request is not sent

Check in order:

1. Was the `CancelToken` already canceled?
2. Did a request interceptor call `next`/`resolve`/`reject`?
3. Did an async interceptor throw?
4. Did an interceptor intentionally `resolve`?
5. Is Dio already closed?
6. Is request transformation throwing?
7. Is the adapter configured correctly?

Current Dio checks pre-canceled requests and rejects new connections after `close()`.

## Incorrect URL

Inspect:

```dart
options.uri
options.baseUrl
options.path
options.queryParameters
```

Remember an absolute request path can override normal base URL composition.

## Missing headers

Check:

- BaseOptions;
- request `Options`;
- interceptor ordering;
- whether another interceptor overwrites the header;
- web CORS allow-list;
- redirect origin changes.

## Unexpected `401`

Check:

1. `requiresAuth`;
2. access token exists;
3. token injected before request;
4. header format;
5. expiry;
6. device clock if token policy uses time;
7. refresh endpoint behavior;
8. retried request received the new header.

## Refresh loop

Verify:

- refresh endpoint uses separate/exempt client;
- retry marker exists;
- retried `401` does not refresh again;
- refresh failure clears session;
- old token isn't re-applied after refresh.

## Timeout

Identify the exact `DioExceptionType`.

Do not respond to `sendTimeout` by only increasing `receiveTimeout`.

Check:

- connect phase;
- upload size;
- server response gap;
- transformation;
- browser/network constraints.

## Unexpected cancellation

Find token ownership.

One token can cancel multiple requests.

## Malformed payload

Capture sanitized:

- status;
- content type;
- response length;
- correlation ID.

Then verify:

- DTO schema;
- server content type;
- transformer;
- response type.

Do not dump a sensitive full body into production logs.

## Server error

Inspect:

- status;
- correlation ID;
- sanitized error code;
- retry policy.

Do not automatically treat every `500` as retryable.

## Interceptor ordering

Temporarily instrument interceptor entry/exit with sanitized identifiers.

Remember all phases are wired FIFO.

## Web CORS

Inspect browser network tools:

- preflight request;
- allowed origin;
- allowed methods;
- allowed headers;
- credentials policy.

Do not add server response CORS headers to the Flutter request.

## Upload failure

Check:

- multipart key;
- `files` vs `files[]`;
- server max size;
- content type;
- finalized/reused `FormData`;
- send timeout;
- cancellation.

## Download failure

Check:

- save path permissions on native;
- available disk;
- status;
- redirect;
- cancellation;
- Range support for resume;
- browser memory/CORS behavior on web.

---

# Refactoring Rules

1. Understand existing behavior before moving code.
2. Add characterization tests around fragile networking code.
3. Preserve endpoint methods, payloads, headers, and status handling during structural refactors.
4. Move direct Dio calls behind API clients incrementally.
5. Move DTO mapping before changing domain semantics.
6. Map errors before removing Dio from UI.
7. Preserve auth behavior while replacing refresh implementation.
8. Test simultaneous `401`s before and after refresh refactors.
9. Preserve cancellation ownership.
10. Do not accidentally broaden interceptor scope.
11. Do not replace ordinary interceptors with queued ones without analyzing throughput.
12. Do not change `validateStatus` casually; it changes whether status codes become `Response` or `DioException.badResponse`.
13. Do not change multipart retry logic without accounting for finalized `FormData`.
14. Preserve persisted cookies/session semantics.
15. Test redirects when changing cookie handling.
16. Keep TLS behavior unchanged unless the refactor explicitly targets security.
17. Migrate deprecated `DioError` → `DioException`.
18. Migrate deprecated `DioErrorType` → `DioExceptionType`.
19. Use `Duration` for current timeout APIs.
20. Use `IOHttpClientAdapter`, not legacy `DefaultHttpClientAdapter`.
21. Use `createHttpClient`, not the deprecated `onHttpClientCreate`, for modern IO adapter customization. The old callback is scheduled for removal in Dio 6.
22. Verify current package versions before copying old transformer or web-adapter examples.
23. Refactor in small, testable increments.

---

# Code Review Checklist

## Architecture

- [ ] Dio is behind a networking/data abstraction.
- [ ] Widgets do not make raw Dio calls.
- [ ] State-management objects depend on repositories, not Dio.
- [ ] API clients are feature/service scoped.
- [ ] Giant global API service is avoided.
- [ ] DTO/domain boundaries are intentional.

## Client lifecycle

- [ ] Dio is reused appropriately.
- [ ] One client is not forced across incompatible backends/policies.
- [ ] Client ownership is clear.
- [ ] Shared client is not closed by a feature that does not own it.
- [ ] Test clients are injectable.

## Options

- [ ] `BaseOptions` contains true defaults.
- [ ] Request-specific policy uses `Options`.
- [ ] Dynamic credentials are not permanently stored in base headers.
- [ ] Global content type is justified.
- [ ] `validateStatus` behavior is understood.
- [ ] Timeouts match operation type.

## Authentication

- [ ] Access token injection is current.
- [ ] Refresh endpoint cannot recurse.
- [ ] Simultaneous `401`s do not trigger multiple refreshes.
- [ ] Retry is marked/bounded.
- [ ] Refresh failure invalidates session correctly.
- [ ] Session/navigation logic is outside Dio.

## Interceptors

- [ ] Every handler completes once.
- [ ] Ordering is deliberate.
- [ ] Cross-cutting concern belongs in interceptor.
- [ ] Business logic is absent.
- [ ] Queued interceptor has a real serialization requirement.
- [ ] Interceptor async work is bounded.
- [ ] No sensitive logging.

## Errors

- [ ] `DioException` is mapped.
- [ ] Cancellation is distinct.
- [ ] Timeouts are differentiated.
- [ ] Bad certificate is not treated as normal connectivity.
- [ ] `badResponse` status is mapped.
- [ ] Unknown errors are observable.
- [ ] UI does not parse Dio internals.

## Retries

- [ ] Retry policy is bounded.
- [ ] Idempotency was reviewed.
- [ ] POST/payment/upload retry is explicitly justified.
- [ ] `429` respects server guidance.
- [ ] Cancellation is never retried.
- [ ] Auth retry is separate.

## Cancellation

- [ ] Obsolete search is canceled.
- [ ] Long transfer can be canceled where product requires.
- [ ] Shared tokens reflect actual shared lifetime.
- [ ] Canceled work does not update stale state.

## DTOs

- [ ] Raw maps remain at the data boundary.
- [ ] Malformed payload is handled.
- [ ] Generated serialization is configured consistently if used.
- [ ] Domain model does not accidentally mirror transport quirks.

## Upload/download

- [ ] `FormData` isn't reused incorrectly.
- [ ] Multipart keys match backend.
- [ ] Large files avoid unnecessary buffering.
- [ ] Progress updates are throttled.
- [ ] Resume verifies `206`.
- [ ] Web download differences are accounted for.

## Security

- [ ] HTTPS production URL.
- [ ] No blanket bad-certificate callback.
- [ ] No confidential API secret embedded.
- [ ] Authorization/cookies are redacted.
- [ ] URL has no avoidable sensitive values.
- [ ] Redirect credential behavior considered.
- [ ] Cookie persistence security considered.
- [ ] Proxy/debug trust config is excluded from production.

## Tests

- [ ] API client request shape tested.
- [ ] DTO parsing tested.
- [ ] Failure responses tested.
- [ ] repository mapping tested.
- [ ] refresh concurrency tested.
- [ ] cancellation tested when relevant.
- [ ] live production service not required for unit tests.

---

# Performance Checklist

- [ ] Dio instances are reused.
- [ ] Clients are not constructed per request.
- [ ] Persistent connections have not been disabled without reason.
- [ ] No excessive global interceptor work.
- [ ] `QueuedInterceptor` is only used where serialization matters.
- [ ] Secure-storage reads are not unnecessarily repeated if a safe session cache is possible.
- [ ] Obsolete work is canceled.
- [ ] Duplicate requests are understood and controlled.
- [ ] Pagination does not issue duplicate page requests.
- [ ] Search cancels/supersedes old queries.
- [ ] Response payload is not unnecessarily enormous.
- [ ] Large binary bodies use file/stream APIs.
- [ ] Large uploads are not unnecessarily materialized in memory.
- [ ] Current `FusedTransformer` is evaluated before custom parsing.
- [ ] Production body logging is disabled.
- [ ] Progress events do not rebuild large UI trees excessively.
- [ ] Retry count/backoff is bounded.
- [ ] Web download memory buffering is acceptable for expected file sizes.
- [ ] HTTP/2/custom adapter was introduced for a measured requirement rather than fashion.

---

# Security Checklist

- [ ] Production endpoints use HTTPS.
- [ ] Access tokens are not hardcoded.
- [ ] Refresh tokens use an appropriate secure-storage boundary.
- [ ] Confidential server/API secrets are not embedded in the app.
- [ ] Authorization header is redacted everywhere.
- [ ] Cookies are redacted.
- [ ] Passwords/payment data are never logged.
- [ ] Sensitive query-string values are avoided.
- [ ] Error messages shown to users are sanitized.
- [ ] Certificate validation remains enabled.
- [ ] Any custom CA/pinning policy has a rotation strategy.
- [ ] No `badCertificateCallback => true` release code.
- [ ] Development proxy configuration cannot ship accidentally.
- [ ] Cross-origin redirects cannot leak credentials.
- [ ] Refresh endpoint is protected from recursive auth handling.
- [ ] Request signing keys are stored/managed according to their real secrecy requirements.
- [ ] CORS is handled server-side/browser-correctly.
- [ ] Browser cookies use intentional credential/CORS policy.
- [ ] Cache entries are separated by user/tenant/security context.
- [ ] Production telemetry omits sensitive payloads.

---

# Production Readiness Checklist

## Correctness

- [ ] Base URL is environment-correct.
- [ ] Every endpoint path/method matches backend contract.
- [ ] Query encoding is correct.
- [ ] Content type is correct.
- [ ] DTO parsing validates required fields.
- [ ] `validateStatus` matches expectations.
- [ ] Redirect behavior is intentional.

## Authentication

- [ ] Bearer token is injected dynamically.
- [ ] Public endpoints opt out cleanly.
- [ ] Refresh endpoint cannot recursively refresh.
- [ ] Concurrent unauthorized requests share refresh work.
- [ ] Original request retries once with new token.
- [ ] Terminal refresh failure clears credentials/session.

## Reliability

- [ ] Timeouts are operation-appropriate.
- [ ] Cancellation works.
- [ ] Retry policy is bounded.
- [ ] Unsafe side effects are not blindly retried.
- [ ] Rate limiting respects server guidance.
- [ ] Duplicate requests are controlled.

## Errors

- [ ] Every `DioExceptionType` has a deliberate mapping.
- [ ] HTTP failures are mapped.
- [ ] malformed payload is distinct from connectivity.
- [ ] cancellation is not shown as generic error.
- [ ] correlation IDs are preserved for diagnostics.

## Files

- [ ] Multipart instances are fresh.
- [ ] Upload progress works.
- [ ] Download storage behavior is platform-correct.
- [ ] Large transfers avoid unnecessary memory buffering.
- [ ] Resume behavior verifies server Range support.

## Security

- [ ] Logging is redacted.
- [ ] TLS validation is safe.
- [ ] No embedded confidential credentials.
- [ ] No unsafe debug proxy/certificate behavior.
- [ ] Web CORS architecture is valid.

## Performance

- [ ] Client reused.
- [ ] Transformer behavior is current.
- [ ] Interceptor work is bounded.
- [ ] No unnecessary queues.
- [ ] Payload size is reasonable.
- [ ] Obsolete requests are canceled.

## Tests

- [ ] Success path.
- [ ] failure response.
- [ ] malformed data.
- [ ] transport failure.
- [ ] authentication refresh.
- [ ] concurrent refresh.
- [ ] cancellation.
- [ ] retry safety where retry exists.
- [ ] adapter/platform-specific behavior where customized.

---

# Quick Reference

| Situation | Preferred approach |
|---|---|
| One backend and one networking policy | Reused configured `Dio` |
| Different backend/security policy | Separate Dio client |
| Refresh endpoint must avoid auth recursion | Separate refresh Dio/client |
| Global defaults | `BaseOptions` |
| Endpoint-specific configuration | `Options` |
| Final merged request config | `RequestOptions` |
| Add current bearer token | Request interceptor |
| Simple stateless header mutation | `Interceptor` |
| Small inline interceptor | `InterceptorsWrapper` |
| Serialized interceptor access required | `QueuedInterceptor` |
| Only refresh needs synchronization | Shared refresh Future is often preferable |
| Continue interceptor chain | `handler.next` |
| Short-circuit with response | `handler.resolve` |
| Short-circuit with error | `handler.reject` |
| HTTP status outside accepted range | `DioExceptionType.badResponse` |
| DNS/socket/browser network failure | `DioExceptionType.connectionError` |
| Connection phase timeout | `connectionTimeout` |
| Upload/send timeout | `sendTimeout` |
| Incoming-data timeout | `receiveTimeout` |
| Response transformation timeout | `transformTimeout` |
| TLS validation failure | `badCertificate` |
| Intentional cancellation | `cancel` |
| UI-facing error | Map `DioException` to application failure |
| Search superseded by new query | Cancel previous `CancelToken` |
| Group of requests shares lifecycle | Shared `CancelToken` |
| Normal JSON | Default `ResponseType.json` |
| Text | `ResponseType.plain` |
| Small complete binary body | `ResponseType.bytes` |
| Incremental/large response | `ResponseType.stream` |
| Upload files | `FormData` + fresh `MultipartFile` |
| Repeated multipart request | New `FormData` or intentional clone |
| Native large download | `download()` or stream-to-file |
| Native resume download | Range + verified `206` + `FileAccessMode.append` |
| Web `download()` | Browser Blob flow; entire body buffered |
| Upload progress | `onSendProgress` |
| Download progress | `onReceiveProgress` |
| Progress updates state | Throttle/coalesce |
| Current default JSON transformer | `FusedTransformer` |
| Custom transformer | Only for measured/special protocol need |
| Development logging | Redacted and intentionally enabled |
| Production diagnostics | Structured sanitized telemetry |
| Native proxy | `IOHttpClientAdapter.createHttpClient` |
| Web proxy | Not configurable through Dio adapter |
| Native custom certificate policy | `IOHttpClientAdapter` / `SecurityContext` / `validateCertificate` |
| Accept every certificate | Never in production |
| Flutter Web cookies | Browser adapter + `withCredentials` where required |
| Native cookie management | `dio_cookie_manager` + `cookie_jar` |
| HTTP/2 explicitly required | `dio_http2_adapter` |
| General response caching | Repository or standards-aware interceptor/plugin |
| Automatic POST retry | Avoid unless proven idempotent |
| `429` | Respect rate-limit policy/`Retry-After` |
| Access-token `401` | Refresh once, retry once |
| Business logic | Repository/domain layer |
| DTO serialization | Data/API-client layer |
| Bloc/Cubit/Riverpod | Consume repositories, not Dio |
| API client test | Inject Dio with deterministic fake adapter |
| Repository test | Mock/fake API client |
| CORS failure | Fix server/proxy architecture, not browser security |
| Confidential server secret | Keep on trusted backend |
| Client close | Only by the owner of that Dio/adapter lifecycle |

Before committing networking code, verify one final time:

```text
Correct request
→ secure transport
→ correct auth
→ bounded failure behavior
→ mapped errors
→ correct cancellation
→ retry safety
→ safe observability
→ deterministic tests
→ acceptable memory/CPU/network cost
```
