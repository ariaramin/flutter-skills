# Authoritative sources

Research baseline: 2026-09-07. Recheck SDK, OS, and library documentation for
version-sensitive implementation details.

## HTTP standards

- [RFC 9111: HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html) — cache
  keys, storage eligibility, freshness, `Age`, validation, invalidation,
  `Cache-Control`, `Expires`, `Vary`, and security considerations.
- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) —
  validators, conditional requests, response semantics, and status codes.
- [RFC 5861: HTTP Cache-Control Extensions for Stale Content](https://www.rfc-editor.org/rfc/rfc5861.html)
  — `stale-while-revalidate` and `stale-if-error`.
- [RFC 8246: HTTP Immutable Responses](https://www.rfc-editor.org/rfc/rfc8246.html)
  — `immutable` applies during a response's freshness lifetime.
- [IANA HTTP Cache Directive Registry](https://www.iana.org/assignments/http-cache-directives/)
  — current registered directives and governing specifications.

## Apple platforms

- [Apple: Accessing Cached Data](https://developer.apple.com/documentation/foundation/accessing-cached-data)
  — `URLSessionConfiguration`, request cache policies, `URLCache`, HTTPS disk
  caching, and programmatic storage control.
- [Apple: URLCache](https://developer.apple.com/documentation/foundation/urlcache)
  — memory/disk composition, capacities, purge behavior, thread safety, and
  compound-operation race caveat.
- [Apple: URLRequest.CachePolicy](https://developer.apple.com/documentation/foundation/nsurlrequest/cachepolicy-swift.enum)
  — protocol/default, reload, cache-first, and cache-only request policies.
- [Apple: Refreshing and Maintaining Your App Using Background Tasks](https://developer.apple.com/documentation/backgroundtasks/refreshing-and-maintaining-your-app-using-background-tasks)
  — system-managed app refresh and processing work.
- [Apple: Downloading Files in the Background](https://developer.apple.com/documentation/foundation/downloading-files-in-the-background)
  — background `URLSession` behavior and lifecycle.

## Android

- [Android: Build an Offline-First App](https://developer.android.com/topic/architecture/data-layer/offline-first)
  — local source of truth, read/write strategies, synchronization, retry, and
  WorkManager integration.
- [Android: Data Layer](https://developer.android.com/topic/architecture/data-layer)
  — repository responsibilities and source-of-truth selection.
- [Android: Save Data in a Local Database Using Room](https://developer.android.com/training/data-storage/room)
  — Room for non-trivial structured persistence and offline cached content.
- [Android: Task Scheduling](https://developer.android.com/develop/background-work/background-tasks/persistent)
  — WorkManager for persistent, constrained, retryable work.
- [Android: Managing Work](https://developer.android.com/develop/background-work/background-tasks/persistent/how-to/manage-work)
  — unique work and duplicate prevention.

## Flutter and Dart

- [Flutter: Offline-First Support](https://docs.flutter.dev/app-architecture/design-patterns/offline-first)
  — repository/local/remote reads, writes, synchronization, and UI stale state.
- [Flutter: Architecture Guide](https://docs.flutter.dev/app-architecture/guide)
  — repositories as data policy/source-of-truth boundaries.
- [Flutter: Persistent Storage Architecture with SQL](https://docs.flutter.dev/app-architecture/design-patterns/sql)
  — structured persistence in the data layer.
- [Dart: Concurrency and Isolates](https://dart.dev/language/concurrency)
  — asynchronous execution and isolate memory separation.
- [Flutter: ImageCache](https://api.flutter.dev/flutter/painting/ImageCache-class.html)
  — framework image-cache scope and bounds.

## React Native

- [React Native: Networking](https://reactnative.dev/docs/network) — current
  `fetch`/`XMLHttpRequest` surface, native transport boundary, and session
  customization on iOS.
- [React Native: Images](https://reactnative.dev/docs/images) — image-only cache
  controls and platform-backed behavior.
- [React Native: Security](https://reactnative.dev/docs/security) — persisted
  versus unpersisted data and unencrypted Async Storage limitations.
- [React Native DevTools](https://reactnative.dev/docs/react-native-devtools) —
  network inspection and performance tracing coverage.

## Kotlin Multiplatform and Ktor

- [Kotlin Multiplatform: Use Platform-Specific APIs](https://kotlinlang.org/docs/multiplatform/multiplatform-connect-to-apis.html)
  — common interfaces and platform-specific implementations.
- [Ktor Client: Caching](https://ktor.io/docs/client-caching.html) — `HttpCache`
  and configurable cache storage, including persistent implementations.

## Mobile security

- [OWASP MASVS-STORAGE-1](https://mas.owasp.org/MASVS/controls/MASVS-STORAGE-1/)
  — secure storage of sensitive mobile data.
- [OWASP MASWE-0001](https://mas.owasp.org/MASWE-0001/) — risks and mitigation
  for sensitive data stored unencrypted in private storage.
- [OWASP MASWE-0003](https://mas.owasp.org/MASWE/MASVS-STORAGE/MASWE-0003/)
  — store cryptographic keys in platform keystores.
- [OWASP MASWE-0006](https://mas.owasp.org/MASWE/MASVS-STORAGE/MASWE-0006/)
  — backup exclusion for sensitive data.
