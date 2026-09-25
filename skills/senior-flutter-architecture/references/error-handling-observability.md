# Error Handling & Observability

## Error taxonomy

Distinguish at least where relevant:
- validation;
- authentication;
- authorization;
- not found;
- conflict;
- rate limit;
- connectivity;
- timeout;
- server/transient;
- storage;
- serialization/schema;
- platform/permission;
- unknown/programmer error.

UI behavior differs by class; do not flatten everything to “Something went wrong.”

## Boundary mapping

```text
Dio/http/DB/PlatformException/etc.
→ service-specific typed error
→ repository/domain failure
→ presentation state/action
```

Preserve root cause for telemetry.

## User-facing state

Ask:
- can user retry?
- is old content still usable?
- did mutation partially succeed?
- is offline mode active?
- should user re-authenticate?
- should conflict be resolved manually?

## Logging

Log enough context to diagnose:
- operation;
- correlation/request/mutation ID;
- route/feature;
- failure class;
- duration;
- retry attempt.

Do not log:
- tokens;
- passwords;
- secrets;
- sensitive raw payloads unnecessarily.

## Crash/error zones

Ensure uncaught Flutter/Dart/platform errors reach the project's crash/error pipeline without double-reporting.
Do not add competing global handlers without understanding existing bootstrap.

## Analytics vs diagnostics

Analytics answers product behavior.
Diagnostics answers correctness/performance/failure behavior.
Keep interfaces separate unless the project deliberately unifies transport.

## Traceability

For sync/offline/retry flows, stable operation/mutation IDs are highly valuable.
A user report like “my post duplicated” should be traceable across local mutation, network retry, and server response where the system supports it.

## UI error anti-patterns

- snackbar for every failure regardless of context;
- losing previous data on refresh failure;
- infinite loading after exception;
- retry button that triggers duplicate non-idempotent mutation;
- exposing raw exception text;
- no telemetry for swallowed failures.
