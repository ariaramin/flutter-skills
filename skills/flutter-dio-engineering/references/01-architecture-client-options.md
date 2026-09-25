# Architecture, lifecycle, clients, options, typed API boundaries, and repository integration

Source excerpt: lines 1-897 of the supplied Dio engineering guide.

## Table of contents

- [Dio Engineering Skill for Flutter](#dio-engineering-skill-for-flutter)
  - [Purpose](#purpose)
    - [Evidence labels](#evidence-labels)
- [When to Use This Skill](#when-to-use-this-skill)
- [Core Principles](#core-principles)
- [Dio Request Lifecycle](#dio-request-lifecycle)
  - [High-level lifecycle](#high-level-lifecycle)
  - [Request composition](#request-composition)
  - [Pre-cancellation](#pre-cancellation)
  - [Request interceptors](#request-interceptors)
  - [`resolve` and `reject`](#resolve-and-reject)
  - [Request transformation](#request-transformation)
  - [Adapter](#adapter)
  - [Status validation and response transformation](#status-validation-and-response-transformation)
  - [Error normalization](#error-normalization)
- [Recommended Flutter Networking Architecture](#recommended-flutter-networking-architecture)
  - [UI](#ui)
  - [State management](#state-management)
  - [Repository](#repository)
  - [Typed API client / remote data source](#typed-api-client-remote-data-source)
  - [Dio](#dio)
- [Dio Client Configuration](#dio-client-configuration)
  - [Good global configuration](#good-global-configuration)
  - [Usually request-specific](#usually-request-specific)
  - [Avoid static access tokens in `BaseOptions`](#avoid-static-access-tokens-in-baseoptions)
  - [Do not globally force JSON content type](#do-not-globally-force-json-content-type)
- [Dio Instance Strategy](#dio-instance-strategy)
  - [Official recommendation vs architecture recommendation](#official-recommendation-vs-architecture-recommendation)
  - [Closing clients](#closing-clients)
- [Request Options](#request-options)
  - [`BaseOptions`](#baseoptions)
  - [`Options`](#options)
  - [`RequestOptions`](#requestoptions)
  - [Query parameters](#query-parameters)
  - [`extra`](#extra)
  - [Response type](#response-type)
  - [`validateStatus`](#validatestatus)
- [API Client Design](#api-client-design)
  - [DTO and API client example](#dto-and-api-client-example)
  - [Client responsibilities](#client-responsibilities)
- [Repository Integration](#repository-integration)

---

# Dio Engineering Skill for Flutter

## Purpose

Use this skill to design, implement, review, debug, secure, test, refactor, and optimize production Flutter/Dart networking layers built with Dio.

Apply it whenever an AI coding agent touches:

- REST or HTTP API integration;
- Dio client configuration;
- request/response handling;
- authentication and token refresh;
- interceptors;
- retries;
- cancellation;
- uploads and downloads;
- streaming;
- serialization;
- cookies;
- adapters;
- certificates or proxies;
- Flutter Web networking;
- networking performance;
- networking tests;
- networking observability;
- legacy Dio migrations.

The priority order is:

1. Correctness
2. Security
3. Reliability
4. Maintainability
5. Testability
6. Performance
7. Scalability
8. Developer experience

Never sacrifice correctness or security for small performance improvements.

This skill targets the current Dio 5.x API. The official changelog currently identifies Dio 5.11.0 and documents `transformTimeout`, the current `FusedTransformer` default, current concurrency fixes, and modern multipart behavior. `DioError` and `DioErrorType` remain deprecated aliases for `DioException` and `DioExceptionType` and are scheduled for removal in Dio 6.

The scope of this skill follows the supplied production networking requirements.

### Evidence labels

Interpret recommendations using these labels:

- **Dio behavior** — guaranteed or directly documented by Dio source/API documentation.
- **Official Dio recommendation** — explicitly recommended by the Dio project.
- **Architecture recommendation** — a production design conclusion derived from Dio behavior.
- **General HTTP/security practice** — a protocol, distributed-systems, application-security, or mobile-security recommendation rather than a Dio-specific rule.

Do not describe architectural inference as a Dio requirement.

---

# When to Use This Skill

Apply this skill automatically when:

- adding an API endpoint;
- creating or configuring `Dio`;
- designing a networking/data layer;
- implementing bearer authentication;
- adding refresh-token behavior;
- introducing API keys or request signing;
- adding an interceptor;
- diagnosing unexpected `401`, `403`, `429`, `5xx`, timeout, certificate, or connectivity errors;
- handling `DioException`;
- implementing search-as-you-type;
- implementing pagination;
- implementing file uploads/downloads;
- reporting request progress;
- consuming large responses;
- using `ResponseType.stream`;
- changing timeout configuration;
- adding request retries;
- adding cookies;
- changing the HTTP adapter;
- adding HTTP/2;
- configuring a development proxy;
- configuring TLS/certificate handling;
- working on Flutter Web and CORS;
- testing Dio-dependent API clients;
- refactoring direct networking out of widgets, Blocs, Cubits, controllers, or view models;
- auditing logs for secret exposure;
- investigating duplicate requests;
- optimizing network memory/CPU usage;
- upgrading old Dio code.

---

# Core Principles

1. **Reuse a coherently configured Dio instance.**  
   Dio officially recommends a singleton-style reused instance so base URLs, headers, and timeouts stay consistent. Do not interpret this as “one global mutable Dio for every backend.” Prefer one reusable client per coherent backend/security/authentication/network-policy boundary.

2. **Keep Dio behind a networking/data abstraction.**

   Prefer:

   ```text
   UI
   ↓
   State Management
   ↓
   Repository
   ↓
   Remote Data Source / Typed API Client
   ↓
   Dio
   ↓
   Server
   ```

3. **Do not spread `DioException` through the application.**  
   Map transport failures into application/repository failures at the networking boundary.

4. **Keep business logic out of interceptors.**  
   Use interceptors for transport-wide concerns such as authentication headers, correlation metadata, request signing, cookies, transport telemetry, or carefully bounded refresh behavior.

5. **Keep endpoint semantics in API clients/repositories.**  
   Do not make an interceptor decide business rules such as whether an order can be placed or what a domain error means.

6. **Inject Dio. Do not construct it inside endpoint methods.**

7. **Configure globally only what is truly global.**  
   Use `BaseOptions` for coherent client defaults and request `Options` for endpoint-specific behavior. Dio merges them into `RequestOptions` before execution.

8. **Do not store changing access tokens permanently in `BaseOptions.headers`.**  
   Inject current credentials at request time.

9. **Do not retry unsafe operations blindly.**  
   HTTP specifies that automatic retry of non-idempotent methods should not occur unless the client knows retrying is safe.

10. **Cancel obsolete work.**  
    Search queries, abandoned screens, superseded requests, and explicitly cancelable long-running operations should not continue merely because a Future was already started.

11. **Do not serialize unrelated network requests.**  
    Normal interceptors run concurrently. Use `QueuedInterceptor` only for work that actually requires serialized interceptor access.

12. **Use timeouts deliberately.**  
    Configure them according to backend latency, payload size, operation type, and product behavior rather than copying arbitrary constants.

13. **Protect secrets at every boundary.**  
    Never log bearer tokens, refresh tokens, passwords, session cookies, confidential API credentials, payment data, or sensitive bodies.

14. **Do not weaken TLS verification in production.**

15. **Do not try to “fix CORS” from Flutter Web by adding CORS response headers to requests.**  
    CORS is enforced by the browser and normally must be configured server-side. Dio's own documentation points developers toward server CORS support or requests that qualify as simple requests.

16. **Prefer DTOs over unstructured maps escaping the API boundary.**

17. **Prefer streaming/file-oriented APIs for large payloads.**

18. **Test networking deterministically.**  
    Do not make normal unit tests hit live production services.

---

# Dio Request Lifecycle

Understand the lifecycle before modifying interceptors, transformers, adapters, authentication, or error handling.

## High-level lifecycle

```text
API client calls dio.get/post/request/...
        ↓
BaseOptions + per-request Options + arguments
        ↓
RequestOptions
        ↓
Request interceptors — FIFO
        ↓
Request transformation / body encoding
        ↓
HttpClientAdapter
        ↓
Native HTTP client / Browser XHR / other adapter
        ↓
Network
        ↓
ResponseBody
        ↓
Status validation
        ↓
Response transformation
        ↓
Response interceptors — FIFO
        ↓
Application receives Response<T>
```

Failure path:

```text
request interceptor failure
OR transformation failure
OR adapter/network failure
OR timeout/cancellation
OR invalid status
        ↓
DioException
        ↓
Error interceptors — FIFO
        ↓
Application catch
```

Dio's source builds request interceptors in insertion order, dispatches the request, then runs response interceptors in insertion order; error interceptors are also attached in insertion order. Do not assume response interceptors execute in reverse order as they do in some middleware systems.

## Request composition

`BaseOptions` and request `Options` are merged into `RequestOptions`.

Per-request values override corresponding base values. Base and request query parameters, headers, and `extra` values are merged.

```dart
final dio = Dio(
  BaseOptions(
    baseUrl: 'https://api.example.com',
    headers: {
      Headers.acceptHeader: Headers.jsonContentType,
    },
  ),
);

final response = await dio.get<Map<String, dynamic>>(
  '/users',
  queryParameters: {'page': 2},
  options: Options(
    headers: {'X-Request-Purpose': 'user-list'},
    extra: {'requiresAuth': true},
  ),
);
```

## Pre-cancellation

If a `CancelToken` is already canceled before a request starts, current Dio throws the cancellation directly rather than starting the HTTP operation.

## Request interceptors

Interceptors can:

- mutate `RequestOptions`;
- call `handler.next(options)`;
- resolve without sending;
- reject before sending.

Call exactly one handler completion path.

```dart
final class LocaleInterceptor extends Interceptor {
  LocaleInterceptor(this._localeProvider);

  final String Function() _localeProvider;

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) {
    options.headers['Accept-Language'] = _localeProvider();
    handler.next(options);
  }
}
```

## `resolve` and `reject`

`RequestInterceptorHandler.resolve()` completes the request from the interceptor and, by default, skips the remaining interceptor chain for that route. It can optionally continue through following response interceptors.

`RequestInterceptorHandler.reject()` similarly rejects and can optionally continue through following error interceptors. Dio enforces that a handler is completed only once.

Use `resolve` for intentional transport-level short-circuiting such as a rigorously designed cache.

Do not use it to hide arbitrary business decisions.

## Request transformation

Dio transforms request data before handing it to the adapter. `FormData`, binary bytes, and streams have dedicated handling; ordinary data passes through the configured transformer and encoder. Current source applies body transformation based on whether request `data` exists, so do not rely on old README wording that restricted transformation to only a few verbs. Dio 5.11 also has explicit `QUERY`/`queryUri` support for safe, idempotent body-bearing QUERY requests.

## Adapter

`HttpClientAdapter` bridges Dio's request model to the actual HTTP implementation. The default adapter factory selects `IOHttpClientAdapter` on native/VM platforms and `BrowserHttpClientAdapter` on the web.

## Status validation and response transformation

The default status validator accepts `200 <= status < 300`. Defaults also include:

- `receiveDataWhenStatusError: true`;
- `followRedirects: true`;
- `maxRedirects: 5`;
- `persistentConnection: true`;
- `responseType: ResponseType.json`.

Current request dispatch behavior is important:

1. Dio obtains the adapter response.
2. It evaluates `validateStatus`.
3. If status is valid **or** `receiveDataWhenStatusError` is true, Dio transforms the response body.
4. If status is invalid, Dio throws `DioException.badResponse` after transformation.

This is why a `DioException.badResponse` often still has decoded JSON in `exception.response?.data`.

## Error normalization

Dio normalizes errors into `DioException`. A response may be absent when no HTTP response was obtained, such as DNS/network failures.

---

# Recommended Flutter Networking Architecture

Use this default separation:

```text
┌───────────────────────────────┐
│ UI                            │
│ Widgets / pages               │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│ State management              │
│ Bloc / Cubit / Riverpod / VM  │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│ Repository                    │
│ Domain-facing data operations │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│ Typed API client              │
│ Endpoints + DTO parsing       │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│ Dio                           │
│ HTTP transport                │
└───────────────┬───────────────┘
                ↓
              Server
```

## UI

Own:

- rendering;
- user input;
- navigation;
- progress presentation;
- local lifecycle.

Do not own:

- URLs;
- auth headers;
- DTO parsing;
- Dio exceptions;
- HTTP retry algorithms.

## State management

Own:

- loading/success/failure state;
- user-intent coordination;
- presentation lifecycle;
- deciding when repository actions occur.

Do not own:

- Dio configuration;
- interceptors;
- JSON transport mapping;
- TLS configuration;
- raw status-code logic.

## Repository

Own:

- domain-oriented operations;
- composing local and remote data;
- application caching;
- mapping transport/data failures into application failures;
- domain model conversion when appropriate.

Example:

```dart
abstract interface class UserRepository {
  Future<User> getUser(String id);
}
```

Not:

```dart
abstract interface class UserRepository {
  Future<Response<Map<String, dynamic>>> getUser(String id);
}
```

## Typed API client / remote data source

Own:

- endpoint paths;
- HTTP methods;
- query parameters;
- request DTO serialization;
- response DTO parsing;
- endpoint-specific headers/options;
- pagination transport metadata;
- file endpoints.

## Dio

Own:

- HTTP execution;
- transport-level options;
- interceptors;
- cancellation;
- transformation;
- adapter behavior.

---

# Dio Client Configuration

Prefer injecting a configured client rather than exposing a globally mutable static.

```dart
import 'package:dio/dio.dart';

final class NetworkTimeouts {
  const NetworkTimeouts({
    required this.connect,
    required this.send,
    required this.receive,
    required this.transform,
  });

  final Duration connect;
  final Duration send;
  final Duration receive;
  final Duration transform;
}

final class DioClientConfig {
  const DioClientConfig({
    required this.baseUri,
    required this.timeouts,
  });

  final Uri baseUri;
  final NetworkTimeouts timeouts;
}

final class DioClientFactory {
  const DioClientFactory();

  Dio create({
    required DioClientConfig config,
    List<Interceptor> interceptors = const [],
  }) {
    final dio = Dio(
      BaseOptions(
        baseUrl: config.baseUri.toString(),
        connectTimeout: config.timeouts.connect,
        sendTimeout: config.timeouts.send,
        receiveTimeout: config.timeouts.receive,
        transformTimeout: config.timeouts.transform,
        headers: {
          Headers.acceptHeader: Headers.jsonContentType,
        },
      ),
    );

    dio.interceptors.addAll(interceptors);
    return dio;
  }
}
```

Dio officially recommends reusing an instance for consistent configuration. `BaseOptions` defines instance defaults; `Options` defines request configuration and the two are composed into `RequestOptions`.

## Good global configuration

Typically safe when universal for that client:

- `baseUrl`;
- `Accept`;
- service-wide timeouts;
- service-wide user agent where appropriate;
- service-wide query parameters such as an explicitly public API version;
- service-wide redirect policy;
- service-wide `validateStatus` only if every endpoint genuinely shares it;
- adapter;
- narrowly scoped interceptors.

## Usually request-specific

Prefer request `Options` for:

- `contentType` when endpoint payloads differ;
- `ResponseType.stream`;
- `ResponseType.bytes`;
- unusually long upload/download timeout;
- endpoint-specific headers;
- endpoint-specific status acceptance;
- auth opt-out metadata;
- retry/idempotency metadata;
- special redirect handling.

## Avoid static access tokens in `BaseOptions`

Bad:

```dart
dio.options.headers['Authorization'] = 'Bearer $initialToken';
```

If the token later changes, stale credentials can remain.

Prefer a request interceptor backed by the current session/token store.

## Do not globally force JSON content type

Dio includes `ImplyContentTypeInterceptor`, which infers a request content type based on payload type unless removed. `FormData` gets its multipart content type and boundary during request construction.

A global:

```dart
BaseOptions(
  contentType: Headers.jsonContentType,
)
```

is appropriate only if every body-bearing endpoint truly expects JSON.

Otherwise let endpoint payload and options determine it.

---

# Dio Instance Strategy

Use this decision framework.

| Situation | Strategy |
|---|---|
| One backend, one trust/auth policy | Reuse one configured Dio |
| Same backend, authenticated and public requests | Usually one Dio + per-request auth metadata |
| Refresh endpoint must never recurse through auth interceptor | Separate small refresh Dio/client |
| Different backend/base URL | Prefer separate client |
| Different certificate/trust policy | Separate client |
| Different proxy/adapter policy | Separate client |
| Different tenant with only a header value | Usually same client + dynamic interceptor |
| Upload uses same backend/policy | Reuse normal client unless requirements differ |
| Long downloads need radically different timeouts/adapter | Dedicated client may be justified |
| Tests | Inject test-specific Dio or fake adapter |
| Short-lived feature with special policy | Scoped client, close it when its owner ends |

## Official recommendation vs architecture recommendation

**Official Dio recommendation:** use a singleton/reused Dio for consistent settings.

**Architecture recommendation:** interpret “singleton” as “reused within a coherent networking policy,” not “one process-global client regardless of backend.”

Multiple clients are justified when their:

- origins;
- credentials;
- TLS policies;
- adapters;
- interceptor sets;
- timeout requirements;

are materially different.

## Closing clients

Calling `dio.close()` closes the underlying adapter. Current source refuses subsequent connections from the closed Dio.

Only the owner should close a reused client.

Be careful with `Dio.clone()`: modern Dio can clone base options, adapter, interceptors, and transformer. If clones share an adapter, closing one client can affect adapter lifecycle assumptions. Prefer explicit factories when independent ownership is required.

---

# Request Options

## `BaseOptions`

Instance-wide defaults.

```dart
final dio = Dio(
  BaseOptions(
    baseUrl: 'https://api.example.com/v1',
    connectTimeout: const Duration(seconds: 8),
    receiveTimeout: const Duration(seconds: 15),
    headers: {
      Headers.acceptHeader: Headers.jsonContentType,
    },
  ),
);
```

Numbers above are examples, not universal recommendations.

## `Options`

Per-request overrides.

```dart
final response = await dio.get<List<int>>(
  '/reports/weekly',
  options: Options(
    responseType: ResponseType.bytes,
    receiveTimeout: const Duration(minutes: 1),
    extra: {
      'requiresAuth': true,
      'operation': 'weekly-report',
    },
  ),
);
```

Current `Options` supports per-request:

- `connectTimeout`;
- `sendTimeout`;
- `receiveTimeout`;
- `transformTimeout`;
- headers;
- `extra`;
- response type;
- content type;
- `validateStatus`;
- redirect settings;
- persistent connection setting;
- request/response encoder hooks.

## `RequestOptions`

Do not normally construct `RequestOptions` from feature code.

Dio creates it after composing base and request options. Use it primarily:

- in interceptors;
- diagnostics;
- adapter implementations;
- retries that must re-dispatch an already composed request.

## Query parameters

Prefer:

```dart
await dio.get<void>(
  '/search',
  queryParameters: {
    'query': 'flutter dio',
    'page': 2,
  },
);
```

over manual string concatenation.

Do not put credentials or sensitive personal information in query strings unless the protocol absolutely requires it. URLs are more likely to appear in browser history, reverse-proxy logs, analytics, crash logs, referrer data, and telemetry.

## `extra`

Use `extra` for local request metadata consumed by interceptors/transformers.

Dio documents that `RequestOptions.extra` is available to interceptors, transformers, and the response's request options. It is distinct from `Response.extra`.

Good:

```dart
Options(
  extra: {
    'requiresAuth': false,
    'allowRetry': true,
    'operation': 'fetch-catalog',
  },
)
```

Do not put secrets into `extra` if generic debugging/telemetry code might inspect it.

## Response type

Use:

- `ResponseType.json` for JSON;
- `ResponseType.plain` for text;
- `ResponseType.bytes` for a complete binary body that is reasonably sized;
- `ResponseType.stream` when streaming is required.

The default is JSON.

## `validateStatus`

Default:

```dart
status != null && status >= 200 && status < 300
```



Override narrowly when an endpoint legitimately treats another status as expected flow.

Example:

```dart
final response = await dio.get<void>(
  '/resource',
  options: Options(
    validateStatus: (status) =>
        status != null &&
        ((status >= 200 && status < 300) || status == 304),
  ),
);
```

Do not globally write:

```dart
validateStatus: (status) => status != null && status < 500
```

unless every consumer is intentionally prepared to handle all `4xx` responses as normal responses instead of `DioException.badResponse`.

---

# API Client Design

Prefer feature/service-oriented typed clients.

Do not build a single `ApiService` containing hundreds of unrelated endpoints.

## DTO and API client example

```dart
import 'package:dio/dio.dart';

final class UserDto {
  const UserDto({
    required this.id,
    required this.displayName,
    required this.email,
  });

  final String id;
  final String displayName;
  final String email;

  factory UserDto.fromJson(Map<String, dynamic> json) {
    final id = json['id'];
    final displayName = json['display_name'];
    final email = json['email'];

    if (id is! String ||
        displayName is! String ||
        email is! String) {
      throw const FormatException('Invalid user payload.');
    }

    return UserDto(
      id: id,
      displayName: displayName,
      email: email,
    );
  }

  User toDomain() {
    return User(
      id: id,
      displayName: displayName,
      email: email,
    );
  }
}

final class User {
  const User({
    required this.id,
    required this.displayName,
    required this.email,
  });

  final String id;
  final String displayName;
  final String email;
}

final class UsersApiClient {
  UsersApiClient(this._dio);

  final Dio _dio;

  Future<UserDto> getUser(
    String userId, {
    CancelToken? cancelToken,
  }) async {
    final response = await _dio.get<Map<String, dynamic>>(
      '/users/${Uri.encodeComponent(userId)}',
      cancelToken: cancelToken,
      options: Options(
        extra: const {
          'requiresAuth': true,
          'operation': 'get-user',
        },
      ),
    );

    final data = response.data;
    if (data == null) {
      throw const FormatException('User response body was empty.');
    }

    return UserDto.fromJson(data);
  }
}
```

## Client responsibilities

An API client should know:

- endpoint path;
- HTTP method;
- transport parameters;
- DTO encoding/decoding;
- endpoint-specific headers;
- transport pagination fields;
- required response type;
- endpoint cancellation.

It should not know:

- which Flutter screen called it;
- which Bloc state to emit;
- navigation;
- user-facing error copy;
- broad domain workflows.

---

# Repository Integration

Repositories convert data-layer behavior into application-facing behavior.

```dart
abstract interface class UserRepository {
  Future<User> getUser(String id);
}

final class DioUserRepository implements UserRepository {
  DioUserRepository({
    required UsersApiClient apiClient,
    required NetworkFailureMapper failureMapper,
  })  : _apiClient = apiClient,
        _failureMapper = failureMapper;

  final UsersApiClient _apiClient;
  final NetworkFailureMapper _failureMapper;

  @override
  Future<User> getUser(String id) async {
    try {
      final dto = await _apiClient.getUser(id);
      return dto.toDomain();
    } on DioException catch (error) {
      throw _failureMapper.map(error);
    } on FormatException catch (error) {
      throw InvalidServerPayloadFailure(error.message);
    }
  }
}
```

The UI/state layer receives `User` or application failures, not `Response`, JSON maps, or `DioException`.

---
