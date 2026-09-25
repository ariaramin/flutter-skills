# Security, Privacy, Network Logging & Platform Behavior

## Use this reference when

Read this file for secret/PII handling, network logs, native platform logging, Web behavior, support bundles, or audit-log trust.

## Central sanitization

Sanitize before every sink.

Sensitive data can leak through:

- device logs
- browser console
- local files
- remote telemetry
- crash breadcrumbs
- exception messages
- network interceptors

Prefer explicit safe-field allowlists for sensitive domains. Use denylists only as secondary defense.

## Never log

- passwords
- access/refresh tokens
- auth/session cookies
- Authorization headers
- private keys
- recovery codes
- server secrets
- full payment credentials
- sensitive body payloads
- signed query URLs

Also sanitize error/exception text because libraries can embed URLs, SQL, file paths, or response bodies.

## Network schema

Useful safe fields can include:

- method
- host/service
- route template
- status
- latency
- request ID
- retry count
- outcome category
- encoded size when needed

Avoid raw full headers/bodies by default.

## Android

Android documents Logcat information disclosure as a security risk. Production logging needs centralized sanitization and controlled volume.

Do not assume R8 removes Dart logging calls automatically; Dart logging must be gated/configured in Dart.

## Apple

Apple unified logging offers native privacy/redaction controls for Apple's logger APIs. These do not automatically protect Flutter `print`, `developer.log`, custom files, or remote payloads.

Keep Dart-side sanitization authoritative.

## Windows

Windows Event Log is intended for significant diagnostic events rather than general high-volume tracing. Do not mirror every Flutter info/debug event into it.

Use Windows-specific tracing such as ETW only when the product/support requirement justifies it.

## Linux

Dart native `print` writes stdout. In a systemd-managed deployment, stdout/stderr can flow naturally into journald. A normal desktop GUI launch may not have this environment.

Do not invent a journald sink without a deployment requirement.

## Web

Dart `print` goes to browser console. Treat it as visible to the user.

Never rely on:

- minification
- source-map hiding
- console obscurity

as a privacy boundary.

Web persistence has different semantics from native local files; do not pretend a native rotating-file design is universally cross-platform.

## Client audit logs

A modifiable/offline client cannot be the sole authoritative security/compliance audit source.

Create or validate authoritative audit events on trusted backend/platform systems. Client logs can supplement diagnosis.

## Logging credentials

Any credential embedded in a Flutter client should be treated as extractable from a backend-security perspective.

If a logging vendor requires a client ingestion key, it must be scoped for public-client use. Privileged backend actions require backend-held secrets.
