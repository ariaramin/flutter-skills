# State-management integration, testing, observability, and anti-patterns

Source excerpt: lines 3255-4177 of the supplied Dio engineering guide.

## Table of contents

- [State Management Integration](#state-management-integration)
  - [Bloc/Cubit](#bloccubit)
  - [Progress](#progress)
  - [Cancellation](#cancellation)
- [Testing Strategy](#testing-strategy)
  - [Testing layers](#testing-layers)
    - [API client tests](#api-client-tests)
    - [Repository tests](#repository-tests)
    - [Interceptor tests](#interceptor-tests)
    - [Adapter tests](#adapter-tests)
  - [Stub adapter](#stub-adapter)
  - [API client test example](#api-client-test-example)
  - [Failure response test](#failure-response-test)
  - [Authentication concurrency test](#authentication-concurrency-test)
  - [Cancellation tests](#cancellation-tests)
  - [Timeout tests](#timeout-tests)
  - [Do not hit production from unit tests](#do-not-hit-production-from-unit-tests)
- [Observability](#observability)
  - [Correlation IDs](#correlation-ids)
  - [Authentication observability](#authentication-observability)
- [Common Anti-Patterns](#common-anti-patterns)
  - [1. Creating `Dio()` for every request](#1-creating-dio-for-every-request)
  - [2. Networking directly inside widgets](#2-networking-directly-inside-widgets)
  - [3. Giant API service](#3-giant-api-service)
  - [4. Business logic in an interceptor](#4-business-logic-in-an-interceptor)
  - [5. Recursive interceptor request](#5-recursive-interceptor-request)
  - [6. Multiple simultaneous refresh calls](#6-multiple-simultaneous-refresh-calls)
  - [7. Blind POST retry](#7-blind-post-retry)
  - [8. Swallowing `DioException`](#8-swallowing-dioexception)
  - [9. Returning `null` for every error](#9-returning-null-for-every-error)
  - [10. Leaking Dio into UI](#10-leaking-dio-into-ui)
  - [11. Logging authorization headers](#11-logging-authorization-headers)
  - [12. Accepting every certificate](#12-accepting-every-certificate)
  - [13. Embedding confidential API secret](#13-embedding-confidential-api-secret)
  - [14. Unnecessary global interceptor](#14-unnecessary-global-interceptor)
  - [15. Unnecessary `QueuedInterceptor`](#15-unnecessary-queuedinterceptor)
  - [16. Extreme timeout values](#16-extreme-timeout-values)
  - [17. No cancellation for obsolete search](#17-no-cancellation-for-obsolete-search)
  - [18. Decoding enormous payloads unnecessarily](#18-decoding-enormous-payloads-unnecessarily)
  - [19. Large file downloaded into memory](#19-large-file-downloaded-into-memory)
  - [20. Sensitive data in URL](#20-sensitive-data-in-url)
  - [21. DTO equals domain model by accident](#21-dto-equals-domain-model-by-accident)
  - [22. Dio tightly coupled to Bloc/Cubit](#22-dio-tightly-coupled-to-bloccubit)
  - [23. Hardcoded base URLs everywhere](#23-hardcoded-base-urls-everywhere)
  - [24. Reusing `FormData`](#24-reusing-formdata)
  - [25. Trying to fix CORS client-side](#25-trying-to-fix-cors-client-side)
  - [26. Treating cancellation as network failure](#26-treating-cancellation-as-network-failure)
  - [27. Reusing stale bearer header](#27-reusing-stale-bearer-header)
  - [28. Refreshing forever](#28-refreshing-forever)

---

# State Management Integration

Dio should not depend on Bloc, Cubit, Riverpod, Provider, or widgets.

Prefer:

```text
Bloc/Cubit/ViewModel
↓
Repository
↓
API client
↓
Dio
```

## Bloc/Cubit

Good:

```dart
final users = await userRepository.loadUsers();
```

Avoid:

```dart
final response = await dio.get('/users');
```

inside the Bloc.

The first version lets networking implementation change without rewriting state-management logic.

## Progress

Repository/API client can expose:

- a progress callback;
- a progress stream;
- a transfer abstraction.

State management decides how frequently to update presentation state.

## Cancellation

Prefer cancellation ownership in repository/data-client abstractions rather than importing Dio into widgets.

---

# Testing Strategy

## Testing layers

### API client tests

Verify:

- method;
- URL/path;
- query parameters;
- headers;
- request body;
- response parsing;
- malformed payload handling;
- endpoint-specific options.

### Repository tests

Mock/fake the API client.

Verify:

- DTO → domain mapping;
- error mapping;
- cache behavior;
- domain decisions.

### Interceptor tests

Verify:

- header injection;
- metadata;
- `next`/`resolve`/`reject`;
- refresh;
- retry limit;
- concurrent refresh behavior.

### Adapter tests

Use a deterministic fake `HttpClientAdapter`.

Dio's adapter contract exposes `fetch(RequestOptions, requestStream, cancelFuture)` and `close()`, making an adapter an excellent transport seam for tests.

## Stub adapter

```dart
import 'dart:typed_data';

import 'package:dio/dio.dart';

typedef StubResponseHandler = Future<ResponseBody> Function(
  RequestOptions options,
);

final class StubHttpClientAdapter implements HttpClientAdapter {
  StubHttpClientAdapter(this._handler);

  final StubResponseHandler _handler;

  bool _closed = false;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (_closed) {
      throw StateError('Adapter is closed.');
    }

    return _handler(options);
  }

  @override
  void close({bool force = false}) {
    _closed = true;
  }
}
```

## API client test example

```dart
import 'package:dio/dio.dart';
import 'package:test/test.dart';

void main() {
  test('UsersApiClient sends expected request and parses DTO',
      () async {
    late RequestOptions captured;

    final dio = Dio(
      BaseOptions(
        baseUrl: 'https://api.example.com',
      ),
    );

    dio.httpClientAdapter = StubHttpClientAdapter(
      (options) async {
        captured = options;

        return ResponseBody.fromString(
          '''
          {
            "id": "42",
            "display_name": "Ada",
            "email": "ada@example.com"
          }
          ''',
          200,
          headers: {
            Headers.contentTypeHeader: [
              Headers.jsonContentType,
            ],
          },
        );
      },
    );

    final client = UsersApiClient(dio);

    final result = await client.getUser('42');

    expect(captured.method, 'GET');
    expect(captured.uri.path, '/users/42');
    expect(result.id, '42');
    expect(result.displayName, 'Ada');
  });
}
```

## Failure response test

```dart
test('maps 503 response to ServerFailure', () async {
  final dio = Dio(
    BaseOptions(
      baseUrl: 'https://api.example.com',
    ),
  );

  dio.httpClientAdapter = StubHttpClientAdapter(
    (_) async {
      return ResponseBody.fromString(
        '{"message":"unavailable"}',
        503,
        headers: {
          Headers.contentTypeHeader: [
            Headers.jsonContentType,
          ],
        },
      );
    },
  );

  final client = UsersApiClient(dio);
  final mapper = NetworkFailureMapper();
  final repository = DioUserRepository(
    apiClient: client,
    failureMapper: mapper,
  );

  expect(
    () => repository.getUser('42'),
    throwsA(isA<ServerFailure>()),
  );
});
```

## Authentication concurrency test

Test this behavior explicitly:

```text
Request A → 401
Request B → 401
Request C → 401

expected:
  refresh endpoint called once
  token store updated once
  A/B/C retried with new token
```

Use controlled Futures/Completers rather than real timing.

## Cancellation tests

Test:

- token canceled before request;
- token canceled during adapter work;
- superseded search;
- canceled operation does not become user-facing “offline” failure.

## Timeout tests

Prefer deterministic adapter/server fixtures that intentionally exceed timeout boundaries.

Avoid arbitrary `Future.delayed` race tests when a controlled fake can express the condition.

## Do not hit production from unit tests

Use real integration services only in dedicated integration/contract-test environments.

---

# Observability

Record useful metadata without recording secrets.

Recommended fields:

- HTTP method;
- normalized endpoint name/path;
- duration;
- result category;
- status code;
- retry count;
- timeout phase;
- `DioExceptionType`;
- cancellation reason category;
- request correlation ID;
- server trace ID;
- refresh success/failure;
- payload size where non-sensitive and useful.

Avoid high-cardinality raw URLs when they contain IDs or query values.

Prefer:

```text
GET /users/:id
```

over:

```text
GET /users/219493?email=private@example.com
```

## Correlation IDs

If the server returns a request/correlation header, capture it with failures.

Do not generate a new value when reporting the error if you need to correlate with the server's actual request ID.

## Authentication observability

Useful:

```text
token_refresh_started
token_refresh_succeeded
token_refresh_failed
session_invalidated
```

Never log the token values.

---

# Common Anti-Patterns

## 1. Creating `Dio()` for every request

**Bad**

```dart
Future<Response<dynamic>> fetchUsers() {
  return Dio().get(
    'https://api.example.com/users',
  );
}
```

**Why it is problematic**

Configuration, lifecycle, interceptors, testing, and connection reuse become inconsistent.

**Better**

```dart
final class UsersApiClient {
  UsersApiClient(this._dio);

  final Dio _dio;

  Future<Response<List<dynamic>>> fetchUsers() {
    return _dio.get<List<dynamic>>('/users');
  }
}
```

---

## 2. Networking directly inside widgets

**Bad**

```dart
onPressed: () async {
  final response = await Dio().post(
    '/orders',
    data: order,
  );

  setState(() {
    result = response.data;
  });
}
```

**Why it is problematic**

Presentation now owns networking, DTO parsing, failures, and lifecycle.

**Better**

```dart
onPressed: () {
  context.read<OrderCubit>().submit();
}
```

The Cubit calls a repository, which calls the API client.

---

## 3. Giant API service

**Bad**

```dart
class ApiService {
  Future<void> login() async {}
  Future<void> getProducts() async {}
  Future<void> createPayment() async {}
  Future<void> uploadAvatar() async {}
  Future<void> deleteMessage() async {}
  // Hundreds more.
}
```

**Why it is problematic**

Unrelated features become coupled to one high-churn class.

**Better**

```text
AuthApiClient
CatalogApiClient
PaymentsApiClient
ProfileApiClient
MessagingApiClient
```

---

## 4. Business logic in an interceptor

**Bad**

```dart
onResponse: (response, handler) {
  if (response.data['cart_total'] > 1000) {
    cartCubit.applyDiscount();
  }

  handler.next(response);
}
```

**Why it is problematic**

Transport becomes coupled to UI/domain state and hidden side effects.

**Better**

Return DTO data and make the repository/domain layer apply business rules.

---

## 5. Recursive interceptor request

**Bad**

```dart
onError: (error, handler) async {
  if (error.response?.statusCode == 401) {
    await dio.post('/auth/refresh');
    final response =
        await dio.fetch(error.requestOptions);
    handler.resolve(response);
  }
}
```

**Why it is problematic**

The refresh request can enter the same interceptor and trigger a recursive loop.

**Better**

Use a separate refresh client and an explicit one-retry marker.

---

## 6. Multiple simultaneous refresh calls

**Bad**

```dart
if (error.response?.statusCode == 401) {
  await authRepository.refreshToken();
}
```

for every failed request.

**Why it is problematic**

Ten simultaneous `401`s can produce ten refresh requests.

**Better**

Share one refresh Future or use carefully designed queued behavior.

---

## 7. Blind POST retry

**Bad**

```dart
for (var attempt = 0; attempt < 5; attempt++) {
  try {
    return await dio.post('/payments', data: payment);
  } catch (_) {}
}
```

**Why it is problematic**

The server may have processed the payment before the client lost the response.

**Better**

Do not automatically retry unless the backend supports an idempotency contract.

---

## 8. Swallowing `DioException`

**Bad**

```dart
try {
  await dio.get('/profile');
} on DioException {
  return;
}
```

**Why it is problematic**

The caller cannot distinguish cancellation, timeout, server failure, or authentication failure.

**Better**

Map the exception into a typed application failure.

---

## 9. Returning `null` for every error

**Bad**

```dart
Future<User?> loadUser() async {
  try {
    ...
  } catch (_) {
    return null;
  }
}
```

**Why it is problematic**

`null` cannot distinguish “not found,” “offline,” “unauthorized,” malformed server payload, and programmer failure.

**Better**

Return a clear result abstraction or throw typed repository failures.

---

## 10. Leaking Dio into UI

**Bad**

```dart
if (error is DioException &&
    error.type == DioExceptionType.connectionError) {
  ...
}
```

inside a widget.

**Better**

```dart
if (failure is NetworkUnavailableFailure) {
  ...
}
```

---

## 11. Logging authorization headers

**Bad**

```dart
LogInterceptor(
  requestHeader: true,
  requestBody: true,
);
```

in production.

**Why it is problematic**

It can expose credentials and private payloads.

**Better**

Use structured redacted transport telemetry.

---

## 12. Accepting every certificate

**Bad**

```dart
client.badCertificateCallback =
    (_, __, ___) => true;
```

**Why it is problematic**

It removes server identity verification.

**Better**

Use normal TLS validation or a carefully designed custom CA/pinning policy.

---

## 13. Embedding confidential API secret

**Bad**

```dart
const apiSecret = 'production-secret';
```

**Why it is problematic**

A distributed client binary cannot guarantee confidentiality of embedded shared secrets.

**Better**

Keep confidential service credentials on a trusted backend.

---

## 14. Unnecessary global interceptor

**Bad**

A global interceptor that contains logic for one endpoint.

**Why it is problematic**

Every request pays complexity/performance cost and inherits unintended behavior.

**Better**

Use request options or endpoint code for endpoint-specific behavior.

---

## 15. Unnecessary `QueuedInterceptor`

**Bad**

```dart
class LanguageHeaderInterceptor
    extends QueuedInterceptor {
  // Only writes one static header.
}
```

**Why it is problematic**

Request-phase serialization provides no value.

**Better**

Use ordinary `Interceptor`.

---

## 16. Extreme timeout values

**Bad**

```dart
BaseOptions(
  connectTimeout: const Duration(milliseconds: 100),
  receiveTimeout: const Duration(hours: 24),
)
```

without workload justification.

**Why it is problematic**

The first creates false failures; the second can hide stuck requests.

**Better**

Derive timeout policy from operation behavior and backend/network expectations.

---

## 17. No cancellation for obsolete search

**Bad**

```dart
Future<void> onQueryChanged(String query) async {
  state = await repository.search(query);
}
```

**Why it is problematic**

An older slow query can finish after a newer one.

**Better**

Cancel the obsolete request and/or enforce latest-result semantics.

---

## 18. Decoding enormous payloads unnecessarily

**Bad**

```dart
final response =
    await dio.get<List<dynamic>>('/all-history-ever');
```

for a dataset that should be paginated.

**Better**

Prefer server pagination/filtering or streaming where appropriate.

---

## 19. Large file downloaded into memory

**Bad**

```dart
final bytes = await dio.get<List<int>>(
  hugeFileUrl,
  options: Options(
    responseType: ResponseType.bytes,
  ),
);
```

on native when a file/stream output is the goal.

**Better**

Use `download()` or `ResponseType.stream`.

---

## 20. Sensitive data in URL

**Bad**

```dart
await dio.get(
  '/reset-password?token=$resetToken',
);
```

when the protocol permits a secure body/header alternative.

**Better**

Use the backend's secure transport contract and avoid URL secrets where possible.

---

## 21. DTO equals domain model by accident

**Bad**

```dart
class User {
  String? user_id;
  String? DISPLAY_NAME;
}
```

propagated through the whole app because that matches server JSON.

**Better**

Map transport fields to a clean application model.

---

## 22. Dio tightly coupled to Bloc/Cubit

**Bad**

```dart
class ProductsBloc {
  ProductsBloc(this.dio);

  final Dio dio;
}
```

**Better**

```dart
class ProductsBloc {
  ProductsBloc(this.repository);

  final ProductsRepository repository;
}
```

---

## 23. Hardcoded base URLs everywhere

**Bad**

```dart
dio.get('https://prod-api.example.com/users');
dio.get('https://prod-api.example.com/orders');
```

**Why it is problematic**

Environment changes and tests require touching endpoint code.

**Better**

Configure `baseUrl` in client composition.

---

## 24. Reusing `FormData`

**Bad**

```dart
final form = FormData.fromMap({...});

await dio.post('/upload', data: form);
await dio.post('/upload', data: form);
```

**Why it is problematic**

Multipart streams are finalized during sending.

**Better**

Create fresh multipart content per attempt.

---

## 25. Trying to fix CORS client-side

**Bad**

```dart
options.headers['Access-Control-Allow-Origin'] = '*';
```

**Why it is problematic**

Browser CORS policy depends on server responses.

**Better**

Configure the server/proxy architecture correctly.

---

## 26. Treating cancellation as network failure

**Bad**

```dart
catch (error) {
  showOfflineMessage();
}
```

**Better**

Map `DioExceptionType.cancel` separately and usually suppress user-facing failure UI when cancellation was expected.

---

## 27. Reusing stale bearer header

**Bad**

```dart
dio.options.headers['Authorization'] =
    'Bearer $tokenAtStartup';
```

**Better**

Resolve the latest credential when each authenticated request starts.

---

## 28. Refreshing forever

**Bad**

```text
401
→ refresh
→ retry
→ 401
→ refresh
→ retry
→ ...
```

**Better**

Tag the retried request and permit at most the intended refresh retry.

---
