# Example — Flutter Plugin / SDK Design

## Requirement

Expose an app-integrity capability backed by Android and iOS native APIs.

## Public Dart contract

```dart
abstract interface class AppIntegrity {
  Future<IntegrityVerdict> check({
    required String nonce,
  });
}
```

Public models should be stable and platform-neutral.

## Architecture

```text
Consumer app
→ app_integrity Dart API
→ platform interface
→ Android implementation (Kotlin)
→ iOS implementation (Swift)
```

## Transport

For a small API:
- platform channel can be enough.

For a richer long-lived contract:
- evaluate Pigeon for generated typed messages.

## Error model

Do not return native codes directly.

```dart
sealed class IntegrityFailure implements Exception {
  const IntegrityFailure();
}
```

Map:
- unsupported;
- permission/configuration;
- transient platform service;
- invalid nonce/request;
- unknown native error.

## Lifecycle

Define:
- whether concurrent checks are allowed;
- timeout;
- cancellation semantics;
- thread requirements;
- initialization/configuration ownership.

## Testing

- Dart API unit tests with fake platform implementation;
- native unit tests where possible;
- integration test in `example/` on real/supported devices;
- unsupported-platform behavior.

## Package quality

Include:
- minimal exports;
- README;
- example;
- changelog;
- license;
- platform support matrix;
- CI;
- semantic versioning;
- migration notes for breaking changes.

## Tradeoff

If capability is app-specific and has one method, a dedicated plugin package may be more ceremony than an in-app platform adapter. Choose the package boundary only when reuse/API isolation justifies it.
