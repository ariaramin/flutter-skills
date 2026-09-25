# Authentication, interceptors, refresh concurrency, errors, timeouts, cancellation, retries, and concurrency

Source excerpt: lines 898-2048 of the supplied Dio engineering guide.

## Table of contents

- [Authentication](#authentication)
  - [Token storage](#token-storage)
  - [Token refresher](#token-refresher)
  - [Bearer injection](#bearer-injection)
  - [Session management](#session-management)
- [Interceptors](#interceptors)
  - [Use an interceptor for](#use-an-interceptor-for)
  - [Do not use an interceptor for](#do-not-use-an-interceptor-for)
  - [`Interceptor`](#interceptor)
  - [`InterceptorsWrapper`](#interceptorswrapper)
  - [Handler rules](#handler-rules)
  - [Ordering](#ordering)
- [QueuedInterceptor](#queuedinterceptor)
  - [Why it exists](#why-it-exists)
  - [Critical semantic detail](#critical-semantic-detail)
  - [Good uses](#good-uses)
  - [Avoid when](#avoid-when)
  - [Throughput tradeoff](#throughput-tradeoff)
- [Token Refresh Concurrency](#token-refresh-concurrency)
  - [Preferred high-throughput pattern: shared refresh Future](#preferred-high-throughput-pattern-shared-refresh-future)
  - [Queued alternative](#queued-alternative)
- [Error Handling](#error-handling)
  - [Do not make UI depend on this enum](#do-not-make-ui-depend-on-this-enum)
  - [Mapper](#mapper)
  - [Error semantics](#error-semantics)
    - [`connectionTimeout`](#connectiontimeout)
    - [`sendTimeout`](#sendtimeout)
    - [`receiveTimeout`](#receivetimeout)
    - [`transformTimeout`](#transformtimeout)
    - [`badCertificate`](#badcertificate)
    - [`badResponse`](#badresponse)
    - [`cancel`](#cancel)
    - [`connectionError`](#connectionerror)
    - [`unknown`](#unknown)
- [Timeouts](#timeouts)
  - [`connectTimeout`](#connecttimeout)
  - [`sendTimeout`](#sendtimeout)
  - [`receiveTimeout`](#receivetimeout)
  - [`transformTimeout`](#transformtimeout)
  - [Configuration strategy](#configuration-strategy)
- [Cancellation](#cancellation)
  - [Single request](#single-request)
  - [Shared cancellation](#shared-cancellation)
  - [Search-as-you-type](#search-as-you-type)
  - [Use cancellation when](#use-cancellation-when)
  - [Do not use cancellation to hide lifecycle bugs](#do-not-use-cancellation-to-hide-lifecycle-bugs)
- [Retry Strategy](#retry-strategy)
  - [HTTP idempotency](#http-idempotency)
  - [Decision table](#decision-table)
  - [Retry limits](#retry-limits)
  - [Backoff](#backoff)
  - [Idempotency keys](#idempotency-keys)
  - [Separate auth retry from network retry](#separate-auth-retry-from-network-retry)
- [Concurrency](#concurrency)
  - [Concurrency risks](#concurrency-risks)
  - [Do not serialize unrelated requests](#do-not-serialize-unrelated-requests)
  - [Request deduplication](#request-deduplication)

---

# Authentication

Authentication usually spans four distinct responsibilities.

## Token storage

Owns durable credential storage.

```dart
abstract interface class TokenStore {
  Future<String?> readAccessToken();

  Future<String?> readRefreshToken();

  Future<void> save({
    required String accessToken,
    required String refreshToken,
  });

  Future<void> clear();
}
```

Use a platform-appropriate secure-storage mechanism for sensitive tokens.

Do not persist refresh tokens in plain application preferences simply because it is convenient.

## Token refresher

Owns the refresh endpoint.

Prefer a separate Dio that does not have the bearer refresh interceptor attached.

```dart
import 'package:dio/dio.dart';

final class AuthTokens {
  const AuthTokens({
    required this.accessToken,
    required this.refreshToken,
  });

  final String accessToken;
  final String refreshToken;
}

final class TokenRefreshException implements Exception {
  const TokenRefreshException(this.message);

  final String message;

  @override
  String toString() => 'TokenRefreshException: $message';
}

abstract interface class TokenRefresher {
  Future<AuthTokens> refresh(String refreshToken);
}

final class DioTokenRefresher implements TokenRefresher {
  DioTokenRefresher(this._refreshDio);

  final Dio _refreshDio;

  @override
  Future<AuthTokens> refresh(String refreshToken) async {
    final response = await _refreshDio.post<Map<String, dynamic>>(
      '/auth/refresh',
      data: {
        'refresh_token': refreshToken,
      },
      options: Options(
        extra: const {
          'requiresAuth': false,
          'isRefreshRequest': true,
        },
      ),
    );

    final data = response.data;
    final access = data?['access_token'];
    final refresh = data?['refresh_token'];

    if (access is! String || refresh is! String) {
      throw const TokenRefreshException(
        'Refresh endpoint returned invalid tokens.',
      );
    }

    return AuthTokens(
      accessToken: access,
      refreshToken: refresh,
    );
  }
}
```

## Bearer injection

Use a request interceptor so the latest token is read when a request begins.

```dart
final class BearerTokenInterceptor extends Interceptor {
  BearerTokenInterceptor(this._tokenStore);

  final TokenStore _tokenStore;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    if (options.extra['requiresAuth'] == false) {
      handler.next(options);
      return;
    }

    final token = await _tokenStore.readAccessToken();

    if (token != null && token.isNotEmpty) {
      options.headers[Headers.authorizationHeader] = 'Bearer $token';
    }

    handler.next(options);
  }
}
```

## Session management

Session invalidation belongs above transport.

The interceptor may signal:

- refresh has permanently failed;
- credentials were cleared.

The session/auth repository decides that the user is now logged out and publishes that application state.

Do not make a Dio interceptor navigate to a login page.

---

# Interceptors

Dio supports multiple interceptors per instance. They can intercept request, response, and error handling before application `then`/`catch` processing.

## Use an interceptor for

Good cross-cutting transport concerns:

- bearer header injection;
- request signing;
- tenant/language headers;
- correlation IDs;
- tracing metadata;
- carefully synchronized credential refresh;
- cookies;
- safe transport telemetry;
- transport-oriented retry if tightly constrained.

## Do not use an interceptor for

Avoid:

- shopping-cart business policy;
- validation rules specific to one screen;
- navigation;
- dialogs;
- feature state;
- DTO-to-domain business mapping;
- arbitrary application caching decisions;
- broad repository orchestration.

## `Interceptor`

Normal interceptors can execute concurrently for concurrent requests.

Use it for stateless or concurrency-safe work.

```dart
final class ClientVersionInterceptor extends Interceptor {
  ClientVersionInterceptor(this._version);

  final String _version;

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) {
    options.headers['X-Client-Version'] = _version;
    handler.next(options);
  }
}
```

## `InterceptorsWrapper`

Use when a small inline interceptor is clearer than a named class.

```dart
dio.interceptors.add(
  InterceptorsWrapper(
    onRequest: (options, handler) {
      options.headers['X-Platform'] = 'flutter';
      handler.next(options);
    },
    onResponse: (response, handler) {
      handler.next(response);
    },
    onError: (error, handler) {
      handler.next(error);
    },
  ),
);
```

Use a named class when logic:

- has dependencies;
- is security-sensitive;
- is stateful;
- needs unit tests;
- spans more than a few lines.

## Handler rules

Every interceptor invocation must eventually call exactly one of:

- `next`;
- `resolve`;
- `reject`.

Do not call two.

Do not return without completing the handler.

Modern Dio has explicit safeguards/fixes around asynchronous interceptor completion, but application code must still complete its handler correctly.

## Ordering

Request, response, and error handlers are wired in interceptor insertion order.

Order deliberately.

Example:

```text
1. Request metadata/correlation ID
2. Authentication
3. Signing
4. Safe telemetry/logging
```

Signing should see the final headers/body-related metadata it must sign.

A logger intended to show final request modifications should be last. Dio explicitly recommends adding `LogInterceptor` last for this reason.

---

# QueuedInterceptor

## Why it exists

Ordinary interceptors allow concurrent requests to enter at the same time.

`QueuedInterceptor` exists when interceptor access itself must be serialized. The official example is acquiring a CSRF token before allowing requests to proceed.

## Critical semantic detail

Current source implements **three separate queues**:

- request queue;
- response queue;
- error queue.

Those queues run in parallel with one another. A queued interceptor does **not** serialize the entire lifecycle of all HTTP requests. New network requests can begin while previous requests are still active.

Do not assume:

```text
Request A completes fully
then Request B begins
```

That is not what `QueuedInterceptor` means.

## Good uses

- first-use CSRF token acquisition;
- one-time asynchronous client initialization;
- serialization of stateful transport signing state;
- a token refresh implementation where ordered interceptor access is genuinely desirable.

## Avoid when

- interceptor logic is a simple synchronous header mutation;
- requests are independent;
- only one small refresh operation needs deduplication;
- serialization would unnecessarily hold every request at the interceptor.

## Throughput tradeoff

**Architecture recommendation:** queued request interception can reduce throughput if every request has to wait for expensive token storage or initialization work.

Do not use `QueuedInterceptor` as a general “thread-safety” switch.

---

# Token Refresh Concurrency

A production refresh implementation must prevent:

- multiple simultaneous refresh calls;
- every `401` starting its own refresh;
- recursive refresh calls;
- stale access tokens;
- repeated refresh after one request already refreshed the session;
- retry storms;
- infinite `401 → refresh → retry → 401` loops.

## Preferred high-throughput pattern: shared refresh Future

Use an ordinary interceptor and synchronize only the refresh operation.

```dart
import 'dart:async';

import 'package:dio/dio.dart';

typedef SessionInvalidatedCallback = FutureOr<void> Function();

final class RefreshingAuthInterceptor extends Interceptor {
  RefreshingAuthInterceptor({
    required Dio dio,
    required TokenStore tokenStore,
    required TokenRefresher tokenRefresher,
    required SessionInvalidatedCallback onSessionInvalidated,
  })  : _dio = dio,
        _tokenStore = tokenStore,
        _tokenRefresher = tokenRefresher,
        _onSessionInvalidated = onSessionInvalidated;

  static const _authRetryKey = 'authRetry';

  final Dio _dio;
  final TokenStore _tokenStore;
  final TokenRefresher _tokenRefresher;
  final SessionInvalidatedCallback _onSessionInvalidated;

  Future<String?>? _refreshFuture;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    if (options.extra['requiresAuth'] == false) {
      handler.next(options);
      return;
    }

    final accessToken = await _tokenStore.readAccessToken();

    if (accessToken != null && accessToken.isNotEmpty) {
      options.headers[Headers.authorizationHeader] =
          'Bearer $accessToken';
    }

    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException error,
    ErrorInterceptorHandler handler,
  ) async {
    final request = error.requestOptions;
    final statusCode = error.response?.statusCode;

    final requiresAuth = request.extra['requiresAuth'] != false;
    final alreadyRetried = request.extra[_authRetryKey] == true;

    if (statusCode != 401 || !requiresAuth || alreadyRetried) {
      handler.next(error);
      return;
    }

    try {
      final failedAuthorization =
          request.headers[Headers.authorizationHeader]?.toString();

      final currentAccessToken =
          await _tokenStore.readAccessToken();

      final String accessToken;

      if (currentAccessToken != null &&
          failedAuthorization != 'Bearer $currentAccessToken') {
        // Another request already refreshed the credentials.
        accessToken = currentAccessToken;
      } else {
        final refreshed = await _refreshAccessTokenOnce();

        if (refreshed == null) {
          await _invalidateSession();
          handler.next(error);
          return;
        }

        accessToken = refreshed;
      }

      final retryOptions = request.copyWith(
        headers: {
          ...request.headers,
          Headers.authorizationHeader: 'Bearer $accessToken',
        },
        extra: {
          ...request.extra,
          _authRetryKey: true,
        },
      );

      final response = await _dio.fetch<dynamic>(retryOptions);
      handler.resolve(response);
    } on DioException catch (retryError) {
      if (retryError.response?.statusCode == 401 ||
          retryError.response?.statusCode == 403) {
        await _invalidateSession();
      }

      handler.next(retryError);
    } catch (_) {
      await _invalidateSession();
      handler.next(error);
    }
  }

  Future<String?> _refreshAccessTokenOnce() {
    final activeRefresh = _refreshFuture;
    if (activeRefresh != null) {
      return activeRefresh;
    }

    final future = _performRefresh();
    _refreshFuture = future;

    return future.whenComplete(() {
      if (identical(_refreshFuture, future)) {
        _refreshFuture = null;
      }
    });
  }

  Future<String?> _performRefresh() async {
    final refreshToken = await _tokenStore.readRefreshToken();

    if (refreshToken == null || refreshToken.isEmpty) {
      return null;
    }

    final tokens = await _tokenRefresher.refresh(refreshToken);

    await _tokenStore.save(
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    );

    return tokens.accessToken;
  }

  Future<void> _invalidateSession() async {
    await _tokenStore.clear();
    await _onSessionInvalidated();
  }
}
```

Why this pattern works:

- unrelated requests remain concurrent;
- only one refresh Future is created;
- requests whose `401` was generated with an older token reuse the newly stored access token instead of refreshing again;
- refresh uses a separate client through `TokenRefresher`;
- retries carry `_authRetryKey`;
- a retried `401` cannot recursively refresh forever.

Dio 5.11 includes a fix for concurrent interceptor requests that share a failing Future, which is relevant to this synchronization pattern.

## Queued alternative

Choose `QueuedInterceptor` when serial ordering of the entire auth interceptor phase is useful and request volume makes the throughput cost acceptable.

The same rules still apply:

- mark retried requests;
- do not refresh the refresh request;
- compare failed credentials against current credentials;
- clear invalid credentials on terminal refresh failure;
- keep navigation outside the interceptor.

---

# Error Handling

Current Dio uses `DioException` and these `DioExceptionType` values:

- `connectionTimeout`;
- `sendTimeout`;
- `receiveTimeout`;
- `badCertificate`;
- `badResponse`;
- `cancel`;
- `connectionError`;
- `unknown`;
- `transformTimeout`.

## Do not make UI depend on this enum

Map it.

```dart
sealed class NetworkFailure implements Exception {
  const NetworkFailure();
}

final class NetworkUnavailableFailure extends NetworkFailure {
  const NetworkUnavailableFailure();
}

final class NetworkTimeoutFailure extends NetworkFailure {
  const NetworkTimeoutFailure(this.phase);

  final String phase;
}

final class RequestCancelledFailure extends NetworkFailure {
  const RequestCancelledFailure();
}

final class CertificateFailure extends NetworkFailure {
  const CertificateFailure();
}

final class AuthenticationFailure extends NetworkFailure {
  const AuthenticationFailure();
}

final class AuthorizationFailure extends NetworkFailure {
  const AuthorizationFailure();
}

final class ResourceNotFoundFailure extends NetworkFailure {
  const ResourceNotFoundFailure();
}

final class ConflictFailure extends NetworkFailure {
  const ConflictFailure();
}

final class ValidationFailure extends NetworkFailure {
  const ValidationFailure({
    this.message,
  });

  final String? message;
}

final class RateLimitedFailure extends NetworkFailure {
  const RateLimitedFailure({
    this.retryAfter,
  });

  final Duration? retryAfter;
}

final class ServerFailure extends NetworkFailure {
  const ServerFailure({
    required this.statusCode,
    this.correlationId,
  });

  final int statusCode;
  final String? correlationId;
}

final class UnexpectedNetworkFailure extends NetworkFailure {
  const UnexpectedNetworkFailure(this.cause);

  final Object? cause;
}

final class InvalidServerPayloadFailure extends NetworkFailure {
  const InvalidServerPayloadFailure(this.message);

  final String message;
}
```

## Mapper

```dart
import 'package:dio/dio.dart';

final class NetworkFailureMapper {
  const NetworkFailureMapper();

  NetworkFailure map(DioException exception) {
    switch (exception.type) {
      case DioExceptionType.connectionTimeout:
        return const NetworkTimeoutFailure('connection');

      case DioExceptionType.sendTimeout:
        return const NetworkTimeoutFailure('send');

      case DioExceptionType.receiveTimeout:
        return const NetworkTimeoutFailure('receive');

      case DioExceptionType.transformTimeout:
        return const NetworkTimeoutFailure('transform');

      case DioExceptionType.badCertificate:
        return const CertificateFailure();

      case DioExceptionType.cancel:
        return const RequestCancelledFailure();

      case DioExceptionType.connectionError:
        return const NetworkUnavailableFailure();

      case DioExceptionType.badResponse:
        return _mapResponse(exception.response);

      case DioExceptionType.unknown:
        return UnexpectedNetworkFailure(exception.error);
    }
  }

  NetworkFailure _mapResponse(Response<dynamic>? response) {
    final status = response?.statusCode;

    switch (status) {
      case 401:
        return const AuthenticationFailure();

      case 403:
        return const AuthorizationFailure();

      case 404:
        return const ResourceNotFoundFailure();

      case 409:
        return const ConflictFailure();

      case 422:
        return ValidationFailure(
          message: _readServerMessage(response?.data),
        );

      case 429:
        return RateLimitedFailure(
          retryAfter: _readRetryAfter(response),
        );

      default:
        if (status != null && status >= 500) {
          return ServerFailure(
            statusCode: status,
            correlationId:
                response?.headers.value('x-request-id'),
          );
        }

        return UnexpectedNetworkFailure(
          'Unexpected HTTP status: $status',
        );
    }
  }

  String? _readServerMessage(Object? data) {
    if (data is Map<String, dynamic>) {
      final message = data['message'];
      if (message is String) {
        return message;
      }
    }

    return null;
  }

  Duration? _readRetryAfter(Response<dynamic>? response) {
    final raw = response?.headers.value('retry-after');
    final seconds = int.tryParse(raw ?? '');

    if (seconds == null || seconds < 0) {
      return null;
    }

    return Duration(seconds: seconds);
  }
}
```

The mapper intentionally does not expose raw response bodies to the presentation layer.

## Error semantics

### `connectionTimeout`

The connection/opening phase exceeded its configured duration.

### `sendTimeout`

Sending request data took too long.

Particularly important for uploads.

### `receiveTimeout`

Dio documents receive timeout in terms of waiting for response data/data events rather than a single total-download deadline.

### `transformTimeout`

Transformation took too long.

Current Dio added this specifically to bound long response transformations. On web, timeout behavior is best-effort because synchronous JavaScript cannot be preempted.

### `badCertificate`

Certificate validation failed according to configured certificate behavior.

Treat as a serious security/transport failure.

Do not retry it automatically.

### `badResponse`

The server responded, but `validateStatus` rejected the status.

Inspect:

```dart
exception.response?.statusCode
exception.response?.data
exception.response?.headers
```

### `cancel`

Expected cancellation.

Do not display it as “network failed” when the cancellation was intentional.

### `connectionError`

Network layer failed, such as a socket/browser network error.

Do not automatically claim “the user is offline”; the failure can also mean DNS, routing, TLS transport, browser policy, or another connection problem.

### `unknown`

Inspect the original `error` and stack trace in diagnostics.

Do not expose internal exception text directly to users.

---

# Timeouts

Current Dio has four relevant timeout dimensions.

## `connectTimeout`

Timeout while opening the request/connection.

Use a relatively short value for interactive APIs when product requirements call for fast failure.

Allow more time in constrained networks if connection setup legitimately takes longer.

## `sendTimeout`

Timeout while sending request data.

Use larger limits for:

- large uploads;
- slow uplinks;
- streamed request bodies.

## `receiveTimeout`

Bounds waits for incoming response data/data events rather than necessarily acting as a total request deadline.

A large file transfer can therefore legitimately run longer than `receiveTimeout` as long as data continues arriving within the timeout behavior.

## `transformTimeout`

Bounds response transformation.

Useful when decoding/processing large JSON bodies could otherwise consume excessive time. Current Dio exposes it both globally and per request.

## Configuration strategy

Do not copy one timeout tuple into every project.

Before selecting values, determine:

- backend p95/p99 latency;
- mobile network expectations;
- upload size;
- download size;
- whether requests are interactive;
- whether the operation continues in the background;
- server SLA;
- proxy/VPN behavior;
- whether retry is enabled;
- total user-visible deadline.

Examples of differing policies:

```text
interactive JSON API:
  relatively bounded connection/receive time

large file upload:
  normal connection time
  much longer send time

large download:
  normal connection time
  receive timeout tolerant of long transfer

large JSON:
  consider transform timeout and parsing cost
```

---

# Cancellation

Dio's `CancelToken` can cancel one request or multiple requests when the same token is shared.

## Single request

```dart
final cancelToken = CancelToken();

final future = dio.get<Map<String, dynamic>>(
  '/expensive-operation',
  cancelToken: cancelToken,
);

cancelToken.cancel('User left the operation.');

try {
  await future;
} on DioException catch (error) {
  if (CancelToken.isCancel(error)) {
    // Expected cancellation.
  } else {
    rethrow;
  }
}
```

## Shared cancellation

One token can intentionally own a request group:

```dart
final token = CancelToken();

await Future.wait([
  dio.get<void>('/dashboard/profile', cancelToken: token),
  dio.get<void>('/dashboard/orders', cancelToken: token),
  dio.get<void>('/dashboard/alerts', cancelToken: token),
]);

// Elsewhere:
// token.cancel('Dashboard disposed.');
```

Canceling the token cancels every request attached to it. Use shared tokens only when those requests genuinely share a lifecycle.

## Search-as-you-type

Prefer canceling the previous request.

```dart
import 'package:dio/dio.dart';

final class SearchResultDto {
  const SearchResultDto({
    required this.id,
    required this.title,
  });

  final String id;
  final String title;

  factory SearchResultDto.fromJson(Map<String, dynamic> json) {
    final id = json['id'];
    final title = json['title'];

    if (id is! String || title is! String) {
      throw const FormatException('Invalid search result.');
    }

    return SearchResultDto(
      id: id,
      title: title,
    );
  }
}

final class SearchApiClient {
  SearchApiClient(this._dio);

  final Dio _dio;

  Future<List<SearchResultDto>> search(
    String query, {
    required CancelToken cancelToken,
  }) async {
    final response = await _dio.get<List<dynamic>>(
      '/search',
      queryParameters: {'q': query},
      cancelToken: cancelToken,
    );

    final data = response.data ?? const [];

    return data.map((entry) {
      if (entry is! Map<String, dynamic>) {
        throw const FormatException('Invalid search result.');
      }
      return SearchResultDto.fromJson(entry);
    }).toList(growable: false);
  }
}

final class SearchRepository {
  SearchRepository(this._apiClient);

  final SearchApiClient _apiClient;

  CancelToken? _activeSearch;

  Future<List<SearchResultDto>> search(String query) async {
    _activeSearch?.cancel('Superseded by newer search.');

    final token = CancelToken();
    _activeSearch = token;

    try {
      return await _apiClient.search(
        query,
        cancelToken: token,
      );
    } finally {
      if (identical(_activeSearch, token)) {
        _activeSearch = null;
      }
    }
  }

  void cancelActiveSearch() {
    _activeSearch?.cancel('Search feature disposed.');
    _activeSearch = null;
  }
}
```

This keeps Dio-specific cancellation below presentation/state-management code.

## Use cancellation when

- a newer search supersedes an old search;
- user navigates away and the operation has no value afterward;
- a file transfer is explicitly cancelable;
- a duplicate request should terminate an obsolete predecessor;
- a group of requests shares one feature lifecycle.

## Do not use cancellation to hide lifecycle bugs

If duplicate requests are caused by repeatedly triggering load logic, fix the trigger too.

---

# Retry Strategy

Dio does not make every failed request safe to retry merely because a request can technically be issued again.

## HTTP idempotency

HTTP defines a request method as idempotent when repeated identical requests have the same intended effect as one request. Safe methods, PUT, and DELETE are defined as idempotent. HTTP explicitly warns clients not to automatically retry non-idempotent requests unless the client knows repetition is safe.

This does **not** mean every real backend implements every endpoint correctly.

Validate the backend contract.

## Decision table

| Situation | Automatic retry? |
|---|---|
| Intentional cancellation | No |
| Bad certificate | No |
| Invalid/malformed request | No |
| `401` access token expired | Auth refresh flow, not generic retry |
| `403` | Usually no |
| `404` | Usually no |
| `409` | Domain-specific |
| `422` validation | No |
| DNS/transient connection failure on idempotent read | Possibly |
| Connection timeout on idempotent read | Possibly |
| Receive timeout before a safe read completes | Possibly |
| `429` | Respect rate-limit policy / `Retry-After` |
| `500` | Sometimes, only with explicit policy |
| `502`/`503`/`504` | Often candidates for bounded idempotent retry |
| GET | Usually safer to retry |
| PUT | Protocol-idempotent, but verify backend |
| DELETE | Protocol-idempotent, but verify backend |
| POST creating an order | Usually no automatic retry |
| Payment POST | Do not retry blindly |
| POST with server-supported idempotency key | May be safe according to backend contract |
| Multipart upload | Avoid automatic retry unless upload API is idempotent/resumable |

A `429` response may include `Retry-After`; HTTP uses that header to tell the client how long it should wait.

## Retry limits

Always bound:

- attempt count;
- total elapsed time;
- backoff;
- payload duplication;
- concurrency.

Never create an unlimited retry interceptor.

## Backoff

**General distributed-systems practice:** use increasing delay and jitter for retryable transient failures to avoid synchronized retry storms.

Do not back off cancellation, authentication-invalid, validation, or certificate failures.

## Idempotency keys

For side-effecting operations that the backend explicitly supports as idempotent:

```dart
await dio.post<Map<String, dynamic>>(
  '/payments',
  data: paymentDto.toJson(),
  options: Options(
    headers: {
      'Idempotency-Key': operationId,
    },
    extra: const {
      'allowRetry': true,
    },
  ),
);
```

The server, not Dio, must enforce the idempotency-key semantics.

## Separate auth retry from network retry

An expired access token generally gets:

```text
401
→ refresh credentials once
→ retry original request once
```

Do not then feed the same request into an uncontrolled generic retry loop.

---

# Concurrency

Dio supports concurrent requests naturally.

```dart
final responses = await Future.wait([
  dio.get<void>('/profile'),
  dio.get<void>('/notifications'),
  dio.get<void>('/settings'),
]);
```

The official README demonstrates concurrent requests with `Future.wait`.

## Concurrency risks

Review:

- token refresh races;
- request deduplication;
- stale search responses;
- pagination duplication;
- duplicate submissions;
- shared mutable interceptor state;
- shared file paths;
- shared `FormData`;
- cancellation ownership.

## Do not serialize unrelated requests

Bad:

```dart
dio.interceptors.add(
  HugeQueuedInterceptorThatEveryRequestMustWaitFor(),
);
```

when only token refresh requires synchronization.

Prefer a shared refresh Future or a smaller synchronization boundary.

## Request deduplication

**Architecture recommendation:** deduplicate only requests whose semantics make deduplication safe.

Typical candidate:

```text
GET /configuration
same auth context
same query
same headers affecting representation
same cache policy
```

Do not deduplicate:

- different authenticated users;
- requests with different representation headers;
- side-effecting operations;
- requests with independent cancellation semantics unless the design handles multiple consumers.

Dio 5.11 specifically fixed a concurrency failure involving interceptors sharing a failing Future, demonstrating that request-deduplication synchronization can interact deeply with interceptor lifecycle.

---
