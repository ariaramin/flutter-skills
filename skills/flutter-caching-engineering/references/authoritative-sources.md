# Authoritative sources

Research baseline: 2026-08-21. Recheck current SDK and package documentation
before relying on a version-sensitive implementation detail.

## Flutter and Dart

- [Flutter offline-first support](https://docs.flutter.dev/app-architecture/design-patterns/offline-first) — repositories combine local and remote sources; read/write/sync trade-offs.
- [Flutter key-value persistence architecture](https://docs.flutter.dev/app-architecture/design-patterns/key-value-data) — simple settings versus complex persistent data.
- [Flutter SQL persistence architecture](https://docs.flutter.dev/app-architecture/design-patterns/sql) — SQL for complex local data.
- [Flutter `ImageCache`](https://api.flutter.dev/flutter/painting/ImageCache-class.html) — shared LRU cache, limits, live/pending images, and ownership.
- [Flutter `ImageCache.maximumSizeBytes`](https://api.flutter.dev/flutter/painting/ImageCache/maximumSizeBytes.html) — byte-bound eviction behavior.
- [Flutter `Image`](https://api.flutter.dev/flutter/widgets/Image-class.html) — decoded image memory and `cacheWidth`/`cacheHeight`.
- [Flutter `NetworkImage`](https://api.flutter.dev/flutter/painting/NetworkImage-class.html) — in-memory image-cache behavior and Web HTML strategy.
- [Flutter DevTools performance view](https://docs.flutter.dev/tools/devtools/performance) — profile frame performance in a representative build.
- [Dart isolates](https://dart.dev/language/isolates) — isolates have separate memory and communicate by messaging.

## HTTP

- [RFC 9111: HTTP Caching](https://datatracker.ietf.org/doc/html/rfc9111) — standardized cache freshness, validation, and `Vary` semantics.
- [MDN HTTP caching guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching) — practical `Cache-Control`, validators, private responses, and cache-key examples.

## Platform storage and offline architecture

- [Android offline-first data layer](https://developer.android.com/topic/architecture/data-layer/offline-first) — local source of truth, queues, retries, and conflicts.
- [Android app-specific storage](https://developer.android.com/training/data-storage/app-specific) — app-specific storage and availability caveats.
- [Apple: using the file system effectively](https://developer.apple.com/documentation/foundation/using-the-file-system-effectively) — cache/temp files are purgeable and must be regenerable.
- [Apple URL cached data](https://developer.apple.com/documentation/foundation/accessing-cached-data) — URL Loading System HTTP response-cache policies.
- [MDN storage quotas and eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) — browser-origin storage is quota and eviction controlled.

The Flutter references describe framework contracts. HTTP, operating-system, and
browser references describe their respective layers; none implies that an
arbitrary Flutter HTTP package provides a persistent cache.
