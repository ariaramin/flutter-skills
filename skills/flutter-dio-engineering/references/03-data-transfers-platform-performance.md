# DTOs, uploads/downloads, streaming, transformers, logging, security, Web, cookies, caching, adapters, HTTP/2, and performance

Source excerpt: lines 2049-3254 of the supplied Dio engineering guide.

## Table of contents

- [Serialization and DTO Mapping](#serialization-and-dto-mapping)
  - [Request DTO](#request-dto)
  - [Response DTO](#response-dto)
  - [DTO vs domain model](#dto-vs-domain-model)
- [Uploads](#uploads)
  - [Native file upload](#native-file-upload)
  - [Multiple files](#multiple-files)
  - [Do not reuse finalized multipart data](#do-not-reuse-finalized-multipart-data)
  - [Streams](#streams)
  - [Large uploads](#large-uploads)
  - [Flutter Web upload](#flutter-web-upload)
- [Downloads](#downloads)
  - [Native `download`](#native-download)
  - [Resume with `Range`](#resume-with-range)
  - [Flutter Web `download`](#flutter-web-download)
- [Progress Tracking](#progress-tracking)
- [Streaming](#streaming)
  - [Use streaming for](#use-streaming-for)
  - [Avoid streaming when](#avoid-streaming-when)
  - [Native stream-to-file](#native-stream-to-file)
- [Transformers](#transformers)
  - [Current default](#current-default)
  - [Use the default first](#use-the-default-first)
  - [Custom transformer is justified for](#custom-transformer-is-justified-for)
  - [Per-request decoder/encoder](#per-request-decoderencoder)
  - [Large JSON](#large-json)
- [Logging](#logging)
  - [Development](#development)
  - [Production](#production)
  - [Never log](#never-log)
- [Security](#security)
  - [HTTPS](#https)
  - [Access and refresh tokens](#access-and-refresh-tokens)
  - [Confidential API keys](#confidential-api-keys)
  - [Query-string secrets](#query-string-secrets)
  - [Certificate validation](#certificate-validation)
    - [Certificate pinning](#certificate-pinning)
  - [Custom CA](#custom-ca)
  - [Redirects](#redirects)
  - [Request signing](#request-signing)
  - [Error exposure](#error-exposure)
- [Flutter Web Considerations](#flutter-web-considerations)
  - [Adapter](#adapter)
  - [CORS](#cors)
  - [Credentials and cookies](#credentials-and-cookies)
  - [Browser-controlled behavior](#browser-controlled-behavior)
  - [Web downloads](#web-downloads)
- [Cookies](#cookies)
  - [Native](#native)
  - [Web](#web)
  - [Redirect cookies](#redirect-cookies)
  - [Authentication architecture](#authentication-architecture)
- [Caching](#caching)
  - [Choose the cache layer by responsibility](#choose-the-cache-layer-by-responsibility)
    - [Repository memory cache](#repository-memory-cache)
    - [Disk cache](#disk-cache)
    - [HTTP cache](#http-cache)
  - [Cache security](#cache-security)
- [Adapter Customization](#adapter-customization)
  - [Leave it alone when](#leave-it-alone-when)
  - [Customize when](#customize-when)
- [Proxies and Development Networking](#proxies-and-development-networking)
- [HTTP/2](#http2)
  - [Use HTTP/2 adapter when](#use-http2-adapter-when)
  - [Do not use it merely because “HTTP/2 is newer”](#do-not-use-it-merely-because-http2-is-newer)
- [Performance Optimization](#performance-optimization)
  - [Reuse clients](#reuse-clients)
  - [Keep persistent connections enabled unless there is a reason not to](#keep-persistent-connections-enabled-unless-there-is-a-reason-not-to)
  - [Cancel obsolete work](#cancel-obsolete-work)
  - [Avoid excessive logging](#avoid-excessive-logging)
  - [Keep interceptors cheap](#keep-interceptors-cheap)
  - [Large JSON](#large-json)
  - [Large downloads](#large-downloads)
  - [Large web downloads](#large-web-downloads)
  - [Large uploads](#large-uploads)
  - [Duplicate requests](#duplicate-requests)
  - [Retry cost](#retry-cost)

---

# Serialization and DTO Mapping

Do not let this spread throughout the app:

```dart
final name = response.data['data']['user']['name'];
```

Prefer:

```text
HTTP JSON
↓
DTO parser/generated serializer
↓
DTO
↓
repository mapper
↓
domain model
```

## Request DTO

```dart
final class CreateUserRequestDto {
  const CreateUserRequestDto({
    required this.displayName,
    required this.email,
  });

  final String displayName;
  final String email;

  Map<String, dynamic> toJson() {
    return {
      'display_name': displayName,
      'email': email,
    };
  }
}
```

## Response DTO

Validate at the data boundary.

```dart
final class PageDto<T> {
  const PageDto({
    required this.items,
    required this.nextCursor,
  });

  final List<T> items;
  final String? nextCursor;
}
```

Generated serialization libraries are appropriate when they improve consistency, but this skill does not require a particular generator.

## DTO vs domain model

Keep them separate when:

- server naming differs;
- server fields are nullable but domain values are not;
- multiple APIs produce one domain entity;
- domain model should not change whenever a backend payload changes.

Using one type for both is acceptable for truly trivial/internal features when transport and domain representations are genuinely identical.

---

# Uploads

Dio supports `FormData` and `MultipartFile`. It automatically sets multipart content type/boundary for `FormData`.

## Native file upload

```dart
import 'package:dio/dio.dart';

Future<Response<Map<String, dynamic>>> uploadAvatar({
  required Dio dio,
  required String filePath,
  required String fileName,
  required CancelToken cancelToken,
  ProgressCallback? onProgress,
}) async {
  final formData = FormData.fromMap({
    'file': await MultipartFile.fromFile(
      filePath,
      filename: fileName,
    ),
  });

  return dio.post<Map<String, dynamic>>(
    '/profile/avatar',
    data: formData,
    cancelToken: cancelToken,
    onSendProgress: onProgress,
  );
}
```

Current Dio uses filename information to help infer multipart media type.

## Multiple files

`FormData.fromMap` with a list uses keys such as `files[]`.

If the backend expects repeated literal `files` keys, construct `FormData` and add repeated entries manually. Dio documents this distinction explicitly.

```dart
final formData = FormData();

formData.files.addAll([
  MapEntry(
    'files',
    await MultipartFile.fromFile(
      firstPath,
      filename: 'first.jpg',
    ),
  ),
  MapEntry(
    'files',
    await MultipartFile.fromFile(
      secondPath,
      filename: 'second.jpg',
    ),
  ),
]);
```

## Do not reuse finalized multipart data

Dio explicitly recommends creating new `FormData`/`MultipartFile` instances for repeated requests; reusing finalized values can cause “Cannot finalize” failures.

Bad:

```dart
final formData = FormData.fromMap({...});

await dio.post('/upload', data: formData);
await dio.post('/upload', data: formData);
```

Better:

```dart
Future<FormData> createUploadFormData(String path) async {
  return FormData.fromMap({
    'file': await MultipartFile.fromFile(path),
  });
}

await dio.post(
  '/upload',
  data: await createUploadFormData(firstPath),
);

await dio.post(
  '/upload',
  data: await createUploadFormData(secondPath),
);
```

Modern Dio also supports `FormData.clone()`, and recent versions preserve multipart boundary-related options correctly during retries. Prefer fresh data unless cloning is intentional.

## Streams

Dio accepts a request `Stream<List<int>>`.

When streaming a request body, set `Content-Length` if upload progress must be calculated.

## Large uploads

Prefer:

- file/stream-based multipart APIs;
- cancellation;
- server-supported resumable upload protocols for very large files;
- idempotency/upload-session identifiers when retrying.

Avoid reading a multi-gigabyte file into one `Uint8List` merely to create multipart data if a streaming/path-based mechanism is available.

## Flutter Web upload

Browser applications do not have arbitrary filesystem path access.

Obtain bytes/streams through browser/file-picker APIs and create multipart content from that representation rather than assuming a native file path exists.

---

# Downloads

## Native `download`

Dio exposes:

- `onReceiveProgress`;
- `CancelToken`;
- `deleteOnError`;
- `FileAccessMode.write`;
- `FileAccessMode.append`;
- configurable length header.

```dart
import 'package:dio/dio.dart';

Future<void> downloadFile({
  required Dio dio,
  required String url,
  required String savePath,
  required CancelToken cancelToken,
  ProgressCallback? onProgress,
}) async {
  await dio.download(
    url,
    savePath,
    cancelToken: cancelToken,
    deleteOnError: true,
    fileAccessMode: FileAccessMode.write,
    onReceiveProgress: onProgress,
  );
}
```

## Resume with `Range`

**General HTTP architecture:** resume requires server Range support.

Do not blindly append a full `200 OK` body to a partial file.

Native example:

```dart
import 'dart:io';

import 'package:dio/dio.dart';

Future<void> resumeDownload({
  required Dio dio,
  required String url,
  required String savePath,
  required CancelToken cancelToken,
  ProgressCallback? onProgress,
}) async {
  final file = File(savePath);
  final existingLength =
      await file.exists() ? await file.length() : 0;

  if (existingLength == 0) {
    await dio.download(
      url,
      savePath,
      cancelToken: cancelToken,
      deleteOnError: true,
      fileAccessMode: FileAccessMode.write,
      onReceiveProgress: onProgress,
    );
    return;
  }

  await dio.download(
    url,
    savePath,
    cancelToken: cancelToken,
    deleteOnError: false,
    fileAccessMode: FileAccessMode.append,
    options: Options(
      headers: {
        'Range': 'bytes=$existingLength-',
      },
      validateStatus: (status) => status == 206,
    ),
    onReceiveProgress: onProgress,
  );
}
```

If the server returns anything other than `206 Partial Content`, do not append.

## Flutter Web `download`

Web behavior is fundamentally different.

Current first-party `dio_web_adapter` documentation states:

- `savePath` is a suggested browser filename, not a filesystem path;
- the browser chooses the actual save location;
- the entire response is loaded into memory before download starts;
- CORS still applies;
- `FileAccessMode.append` is unsupported;
- `deleteOnError` has no local filesystem meaning;
- HTTP protocol details are browser-controlled.

Therefore, do not describe Dio web `download()` as memory-efficient streaming-to-disk.

For very large browser downloads, consider a server/browser-native download architecture rather than forcing the body through application memory.

---

# Progress Tracking

Use:

- `onSendProgress`;
- `onReceiveProgress`.

```dart
void onProgress(int completed, int total) {
  if (total <= 0) {
    return;
  }

  final fraction = completed / total;
  // Forward fraction to a throttled state/progress channel.
}
```

Progress callbacks can be frequent.

Do not emit a full Bloc/Riverpod/provider state update for every byte event.

Prefer:

- percentage changes;
- fixed time intervals;
- meaningful progress deltas;
- isolated progress widgets.

Example throttler:

```dart
final class ProgressThrottler {
  ProgressThrottler({
    this.minimumDelta = 0.01,
  });

  final double minimumDelta;

  double _lastReported = -1;

  void report({
    required int completed,
    required int total,
    required void Function(double progress) onProgress,
  }) {
    if (total <= 0) {
      return;
    }

    final value = (completed / total).clamp(0.0, 1.0);

    if (_lastReported < 0 ||
        value - _lastReported >= minimumDelta ||
        value == 1.0) {
      _lastReported = value;
      onProgress(value);
    }
  }
}
```

---

# Streaming

Use `ResponseType.stream` when the body should be consumed incrementally instead of buffered as a complete transformed value.

Official Dio usage:

```dart
final response = await dio.get(
  url,
  options: Options(
    responseType: ResponseType.stream,
  ),
);

final responseBody = response.data as ResponseBody;
final stream = responseBody.stream;
```

Dio documents `ResponseType.stream` as a streamed binary response.

## Use streaming for

- large binary payloads;
- media processing;
- incremental protocols;
- manual large-file handling;
- situations where buffering everything wastes memory.

## Avoid streaming when

- payload is small JSON;
- full-body decoding is required anyway;
- streaming significantly complicates the implementation without reducing memory/latency.

## Native stream-to-file

```dart
import 'dart:io';

import 'package:dio/dio.dart';

Future<void> streamToFile({
  required Dio dio,
  required String url,
  required String savePath,
  required CancelToken cancelToken,
}) async {
  final response = await dio.get<ResponseBody>(
    url,
    cancelToken: cancelToken,
    options: Options(
      responseType: ResponseType.stream,
    ),
  );

  final body = response.data;
  if (body == null) {
    throw const FileSystemException(
      'Download returned no response stream.',
    );
  }

  final file = File(savePath);
  final sink = file.openWrite();

  try {
    await body.stream.pipe(sink);
  } catch (_) {
    await sink.close();
    if (await file.exists()) {
      await file.delete();
    }
    rethrow;
  }
}
```

---

# Transformers

A `Transformer` controls request and response transformation.

## Current default

Do **not** repeat older documentation that names `BackgroundTransformer` as current default.

Current source initializes Dio with:

```text
FusedTransformer(
  contentLengthIsolateThreshold: 50 * 1024
)
```

and the 5.5 changelog explicitly says `FusedTransformer` became the default.

`FusedTransformer` provides a fast path that fuses UTF-8 and JSON decoding. It can move sufficiently large JSON decoding into an isolate based on its threshold.

## Use the default first

Do not replace the transformer because an old tutorial says to.

Measure first.

## Custom transformer is justified for

- nonstandard wire format;
- custom encryption/compression protocol;
- special parsing requirements;
- measured JSON transformation bottlenecks not solved by current default behavior.

## Per-request decoder/encoder

`Options` can provide:

- `requestEncoder`;
- `responseDecoder`.

These can be asynchronous.

Use these narrowly when an endpoint has special transport encoding.

## Large JSON

Before adding custom isolates:

1. measure payload size;
2. measure decode time;
3. inspect current FusedTransformer behavior;
4. consider whether the backend should paginate/reduce payload;
5. consider streaming if payload format allows it.

---

# Logging

Dio provides `LogInterceptor`.

Official guidance:

- add it last if it should see modifications from preceding interceptors;
- Flutter can use `debugPrint`;
- `debugPrint` itself does not mean “debug builds only” and should not casually be used for production logging.

## Development

Even in development, avoid logging secrets.

Bad:

```dart
dio.interceptors.add(
  LogInterceptor(
    requestHeader: true,
    requestBody: true,
    responseBody: true,
  ),
);
```

for an authenticated application containing passwords or personal data.

## Production

Prefer structured redacted telemetry instead of raw body/header logging.

```dart
import 'package:dio/dio.dart';

abstract interface class NetworkTelemetry {
  void record({
    required String method,
    required String endpoint,
    required Duration duration,
    int? statusCode,
    DioExceptionType? errorType,
    String? correlationId,
  });
}

final class NetworkTelemetryInterceptor extends Interceptor {
  NetworkTelemetryInterceptor(this._telemetry);

  static const _stopwatchKey = '_networkStopwatch';

  final NetworkTelemetry _telemetry;

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) {
    options.extra[_stopwatchKey] = Stopwatch()..start();
    handler.next(options);
  }

  @override
  void onResponse(
    Response<dynamic> response,
    ResponseInterceptorHandler handler,
  ) {
    _record(
      response.requestOptions,
      statusCode: response.statusCode,
      correlationId: response.headers.value('x-request-id'),
    );

    handler.next(response);
  }

  @override
  void onError(
    DioException error,
    ErrorInterceptorHandler handler,
  ) {
    _record(
      error.requestOptions,
      statusCode: error.response?.statusCode,
      errorType: error.type,
      correlationId:
          error.response?.headers.value('x-request-id'),
    );

    handler.next(error);
  }

  void _record(
    RequestOptions options, {
    int? statusCode,
    DioExceptionType? errorType,
    String? correlationId,
  }) {
    final stopwatch = options.extra[_stopwatchKey];

    final duration = switch (stopwatch) {
      Stopwatch value => value.elapsed,
      _ => Duration.zero,
    };

    if (stopwatch is Stopwatch) {
      stopwatch.stop();
    }

    _telemetry.record(
      method: options.method,
      endpoint: _safeEndpoint(options.uri),
      duration: duration,
      statusCode: statusCode,
      errorType: errorType,
      correlationId: correlationId,
    );
  }

  String _safeEndpoint(Uri uri) {
    final port = uri.hasPort ? ':${uri.port}' : '';
    return '${uri.scheme}://${uri.host}$port${uri.path}';
  }
}
```

This deliberately excludes the query string.

## Never log

- `Authorization`;
- access tokens;
- refresh tokens;
- `Cookie`;
- `Set-Cookie`;
- API secrets;
- passwords;
- card details;
- personal documents;
- private request bodies;
- sensitive response bodies.

---

# Security

## HTTPS

Use HTTPS for production APIs.

Do not disable TLS validation to make development easier.

## Access and refresh tokens

Store tokens through a dedicated credential boundary.

Prefer:

- short-lived access tokens;
- carefully protected refresh credentials;
- dynamic bearer injection.

Never write tokens into source control.

## Confidential API keys

**General mobile security principle:** a secret embedded in a distributed Flutter application can be extracted.

Do not treat:

```dart
const secretApiKey = 'super-secret-production-key';
```

as confidential.

If a service requires a credential that clients must never learn, call that service from a trusted backend.

## Query-string secrets

Avoid:

```text
GET /profile?access_token=...
```

Prefer an authorization header unless the protocol explicitly requires otherwise.

## Certificate validation

Dio's native `IOHttpClientAdapter` supports certificate customization and `validateCertificate`. The official documentation also demonstrates custom trusted CAs and certificate fingerprint checks.

However:

**Do not ship this:**

```dart
client.badCertificateCallback =
    (certificate, host, port) => true;
```

as a blanket production policy.

It defeats certificate authentication.

### Certificate pinning

Use only when the security model justifies its operational complexity.

Plan:

- certificate/key rotation;
- backup pins;
- expiry;
- rollback;
- test environments;
- failure observability.

Never hardcode one certificate forever without a rotation path.

## Custom CA

A custom `SecurityContext` can be appropriate for private/self-signed infrastructure.

Do not embed a PKCS#12 password and assume it is secret. Dio's own documentation warns that such passwords become exposed in application code.

## Redirects

Dio follows redirects by default with a default maximum of five on platforms where the adapter exposes that behavior.

For highly sensitive requests:

- understand cross-origin redirect behavior;
- do not manually forward Authorization/cookies to a different origin;
- disable automatic redirects when the protocol requires explicit validation.

The current first-party HTTP/2 adapter recently added protection against forwarding sensitive headers across origins during redirects, which illustrates why redirect credential handling is security-sensitive.

## Request signing

If the backend uses signing, sign as late in request preparation as practical so the signature reflects the actual:

- method;
- path;
- query;
- relevant headers;
- body digest;
- timestamp/nonce.

Keep signing logic in a dedicated transport service/interceptor.

Do not embed a supposedly confidential shared server secret in a mobile binary.

## Error exposure

User-facing messages should not expose:

- stack traces;
- server internals;
- raw SQL errors;
- hostnames not meant for users;
- tokens;
- certificate internals.

Keep detailed diagnostics in secured telemetry.

---

# Flutter Web Considerations

Flutter Web networking runs under browser security constraints.

## Adapter

Dio uses `BrowserHttpClientAdapter` on web. The first-party web adapter is embedded by Dio, so most users do not need to add the package explicitly.

## CORS

For a non-simple request, the browser may issue a preflight request. The server must respond with suitable CORS policy.

Do not add:

```dart
headers: {
  'Access-Control-Allow-Origin': '*',
}
```

to a client request expecting that to solve CORS.

`Access-Control-Allow-Origin` is primarily a server response policy.

If a third-party service does not support browser CORS, legitimate options include:

- service changes;
- a trusted same-origin/backend proxy you control;
- a different integration architecture.

Do not suggest disabling browser security.

## Credentials and cookies

For credentialed browser requests:

```dart
import 'package:dio/browser.dart';
import 'package:dio/dio.dart';

Dio createBrowserDio(String baseUrl) {
  final dio = Dio(
    BaseOptions(
      baseUrl: baseUrl,
    ),
  );

  dio.httpClientAdapter =
      BrowserHttpClientAdapter(withCredentials: true);

  return dio;
}
```

The server must also support credentialed CORS correctly.

## Browser-controlled behavior

The browser controls important aspects such as:

- TLS;
- redirects;
- underlying HTTP protocol;
- cookie restrictions;
- CORS;
- download location.

Do not assume native adapter features are available.

## Web downloads

Current web adapter buffers the entire response before triggering a Blob download. This has significant memory implications for large files.

---

# Cookies

## Native

The first-party `dio_cookie_manager` plugin integrates `cookie_jar` through a Dio interceptor.

```dart
import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';

Dio createCookieClient(String baseUrl) {
  final dio = Dio(
    BaseOptions(baseUrl: baseUrl),
  );

  final cookieJar = CookieJar();
  dio.interceptors.add(CookieManager(cookieJar));

  return dio;
}
```

`CookieJar` is memory-based. `PersistCookieJar` persists cookies to files.

Do not assume file persistence is equivalent to encrypted secure storage.

## Web

Use browser cookie handling and `BrowserHttpClientAdapter(withCredentials: true)` when credentialed cross-origin cookies are required.

Do not try to reproduce native `cookie_jar` semantics in the browser unnecessarily.

## Redirect cookies

The cookie-manager documentation notes that redirect cookie handling can require:

- `followRedirects: false`;
- accepting `3xx` status;
- manually issuing the redirected request;

so cookies on redirect responses can be processed correctly.

## Authentication architecture

Do not simultaneously use:

- bearer tokens;
- session cookies;

for the same authentication flow without understanding why both exist.

Cookie-authenticated browser APIs may also require CSRF defenses depending on backend design.

---

# Caching

Dio core provides interceptor hooks and an official custom-cache-interceptor example, but does not itself define a complete application caching architecture.

Do not claim:

```text
Dio automatically caches GET responses.
```

as a general Dio guarantee.

## Choose the cache layer by responsibility

### Repository memory cache

Good for:

- already mapped domain data;
- feature freshness rules;
- cache-aside logic.

```text
Repository request
→ memory cache hit?
→ if no: API
→ map
→ cache
→ return
```

### Disk cache

Use when:

- data should survive process restarts;
- stale/offline behavior is intentional.

Define:

- TTL;
- schema;
- invalidation;
- user/account separation;
- encryption requirements.

### HTTP cache

Use an HTTP-semantic cache/interceptor/plugin when you need:

- `Cache-Control`;
- `ETag`;
- `If-None-Match`;
- `Last-Modified`;
- `304`.

Do not invent ad hoc HTTP cache semantics if a standards-aware implementation is available.

## Cache security

Never share cache entries across users merely because URLs match.

Authentication headers, tenant identity, locale, and representation headers may affect the response.

---

# Adapter Customization

`HttpClientAdapter` is the boundary between Dio and the underlying HTTP implementation.

## Leave it alone when

The default adapter already provides:

- correct protocol behavior;
- acceptable performance;
- required platform support.

## Customize when

You specifically need:

- proxy behavior;
- custom native `HttpClient`;
- private CA/certificate logic;
- HTTP/2 adapter;
- native platform-specific networking stack;
- deterministic test transport;
- a protocol implementation not covered by the default adapter.

Do not replace the adapter merely because Dio exposes the property.

---

# Proxies and Development Networking

Native `IOHttpClientAdapter` supports configuring the underlying `HttpClient`, including `findProxy`. Dio explicitly notes that web does not support setting a proxy this way.

Development-only example:

```dart
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:dio/io.dart';

void configureDevelopmentProxy(
  Dio dio, {
  required String proxyHost,
  required int proxyPort,
}) {
  dio.httpClientAdapter = IOHttpClientAdapter(
    createHttpClient: () {
      final client = HttpClient();

      client.findProxy = (_) {
        return 'PROXY $proxyHost:$proxyPort';
      };

      return client;
    },
  );
}
```

Do not:

- hardcode proxy credentials in release builds;
- disable certificate verification for proxying in production;
- ship development interception trust settings;
- assume device `localhost` is the development computer.

---

# HTTP/2

The first-party package is `dio_http2_adapter`.

It supports HTTP/2 with features including connection reuse and header compression and currently targets native platforms rather than web.

Basic usage:

```dart
import 'package:dio/dio.dart';
import 'package:dio_http2_adapter/dio_http2_adapter.dart';

Dio createHttp2Dio(String baseUrl) {
  final dio = Dio(
    BaseOptions(
      baseUrl: baseUrl,
    ),
  );

  dio.httpClientAdapter = Http2Adapter(
    ConnectionManager(
      idleTimeout: const Duration(seconds: 10),
    ),
  );

  return dio;
}
```

The duration is an example.

## Use HTTP/2 adapter when

- the backend explicitly benefits from HTTP/2;
- connection multiplexing matters;
- benchmarking supports it;
- server/proxy compatibility is verified.

## Do not use it merely because “HTTP/2 is newer”

Consider:

- proxy compatibility;
- certificate behavior;
- adapter-specific timeout settings;
- fallback behavior;
- server support;
- operational testing.

Recent adapter releases include:

- connection lifecycle/memory fixes;
- handshake timeout;
- fallback adapter support;
- streamed cancellation fixes;
- security fixes around redirecting sensitive headers.

Stay current.

Never copy the package README's “ignore bad certificate” demonstration into a production security configuration.

---

# Performance Optimization

Optimize meaningful costs.

## Reuse clients

Avoid:

```dart
Future<Response<dynamic>> load() {
  return Dio().get('https://api.example.com/data');
}
```

Repeated construction:

- loses coherent configuration;
- repeats interceptor setup;
- makes lifecycle/testing harder;
- can undermine connection/client reuse.

Dio itself recommends reuse.

## Keep persistent connections enabled unless there is a reason not to

Dio's default `persistentConnection` is true.

Do not disable it globally as a speculative optimization.

## Cancel obsolete work

Cancellation saves:

- bandwidth;
- parsing;
- server/client work;
- stale-state races.

## Avoid excessive logging

Body logging can:

- allocate large strings;
- slow debug sessions;
- expose data.

Disable or heavily restrict it in production.

## Keep interceptors cheap

Do not:

- perform expensive synchronous crypto unnecessarily;
- read large files in every request interceptor;
- query secure storage repeatedly if a safe in-memory session cache exists;
- serialize every request unnecessarily.

## Large JSON

Current `FusedTransformer` already includes an optimized JSON path and the Dio default uses a 50 KiB isolate threshold. Measure before replacing it.

## Large downloads

Prefer:

- `download()` on native;
- streaming;
- resumable server support.

Avoid `ResponseType.bytes` for very large files if you can stream/write them.

## Large web downloads

Remember web `download()` buffers the full body in memory before browser save.

## Large uploads

Prefer streamed/path-based multipart on native instead of reading complete files into memory.

## Duplicate requests

Investigate the cause:

- repeated widget builds;
- duplicate Bloc events;
- multiple providers/controllers;
- repeated pagination triggers;
- auth retry duplication;
- cache misses;
- navigation duplication.

Do not apply a generic debounce before understanding why duplicates exist.

## Retry cost

Every retry adds:

- latency;
- bandwidth;
- server load;
- battery use;
- potential duplicate side effects.

Use bounded policies.

---
