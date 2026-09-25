# Sentry for Flutter

Validated against stable `sentry_flutter 9.26.0` on 2026-08-11.

Current stable package targets:

- Android
- iOS
- Linux
- macOS
- Web
- Windows

A Sentry Flutter 10.x prerelease exists. Treat every major-version migration as a reason to revalidate this entire skill, especially tracing, build tooling, Replay, profiling, scopes, and native integrations.

---

## Purpose

This skill governs production implementation, review, debugging, tuning, migration, and architecture of Sentry in Flutter applications.

Use it for:

- Dart and Flutter crash reporting
- native crash reporting
- handled exception reporting
- error filtering and deduplication
- user and diagnostic context
- breadcrumbs
- performance tracing
- distributed tracing
- HTTP instrumentation
- profiling
- app-start measurement
- TTID and TTFD
- slow/frozen-frame measurement
- Android ANR detection
- Apple app-hang detection
- Session Replay
- screenshots and view hierarchy
- attachments
- structured Sentry Logs
- release health
- source/debug-symbol upload
- release and `dist` alignment
- Flutter obfuscation
- Web source maps
- privacy and PII controls
- offline event delivery
- isolates/background execution
- production telemetry-volume optimization

This skill treats Sentry as **observability infrastructure**.

Sentry is not:

- product analytics
- a business workflow engine
- an authentication system
- an audit ledger
- a guaranteed message queue
- a replacement for application logging
- a replacement for backend monitoring
- a replacement for Flutter's profiler

---

## Rule Language

- **MUST**: correctness, security/privacy, or documented SDK/platform requirement.
- **SHOULD**: strong production default.
- **MAY**: optional and product-dependent.
- **Engineering recommendation**: derived from documented behavior and production reliability/performance considerations.

When the installed package differs from this document, use the installed package API/changelog as the source of truth.

---

# When to Use This Skill

Use this skill when asked to:

- install `sentry_flutter`
- configure Flutter crash reporting
- fix missing Flutter exceptions
- fix missing native crashes
- review Sentry initialization
- remove duplicate reports
- add handled-error reporting
- configure user context
- redact sensitive telemetry
- configure `beforeSend`
- tune breadcrumbs
- instrument navigation
- enable performance monitoring
- choose a tracing sample rate
- implement dynamic tracing sampling
- add distributed traces
- integrate Sentry with HTTP clients or Dio
- enable profiling
- instrument startup
- diagnose slow/frozen frames
- configure Android ANRs
- configure Apple app hangs
- enable Session Replay
- configure screenshots or view hierarchy
- add attachments
- enable structured Sentry Logs
- configure Sentry releases
- configure dSYM uploads
- configure ProGuard/R8 mappings
- configure Flutter `--split-debug-info`
- configure Web source maps
- fix unsymbolicated production stacks
- integrate Sentry into CI/CD
- diagnose offline event delivery
- instrument spawned isolates
- review performance/battery/network impact
- review privacy risks
- prepare Sentry for production

---

# Core Principles

1. **Initialize Sentry early enough to capture startup failures.**

2. **Use `SentryFlutter.init(..., appRunner: ...)` as the normal Flutter initialization path.**

3. **Do not duplicate global handlers already installed by Sentry Flutter.**

4. **Unexpected actionable failures belong in Sentry; ordinary control flow does not.**

5. **Automatic capture and manual capture MUST have clearly separated ownership.**

6. **Telemetry MUST NOT determine whether core product behavior succeeds.**

7. **Keep error events high signal before using random error sampling.**

8. **Treat tracing, profiling, Replay, error events, and Logs as independent telemetry budgets.**

9. **Do not blindly set `tracesSampleRate = 1.0` in a production application.**

10. **Never use high-cardinality transaction names.**

11. **Never create spans for every function or low-level operation.**

12. **Restrict distributed-trace propagation to trusted trace participants.**

13. **Never intentionally send authentication tokens, passwords, cookies, payment secrets, API keys, or sensitive private content.**

14. **Keep `sendDefaultPii` disabled unless the organization has made a deliberate privacy decision to enable it.**

15. **Never ship a production build without the debug artifacts required to symbolicate it.**

16. **Runtime `release`/`dist` and uploaded artifacts MUST refer to the same deployed binary.**

17. **Use Sentry's existing offline caching/backpressure rather than building another telemetry queue.**

18. **Do not call `close()` or force flushing after every captured event.**

19. **Use Sentry's default issue grouping unless a real grouping defect justifies a custom fingerprint.**

20. **Keep filtering hooks cheap.**

21. **Do not mutate Sentry scope from Flutter rebuild paths.**

22. **Do not enable Replay, profiling, screenshots, attachments, or verbose Logs at high volume without measuring their privacy and performance cost.**

23. **Test crash reporting with release-like builds, not only debug Dart exceptions.**

24. **Treat unsymbolicated production crashes as an observability failure.**

25. **Do not build new functionality using Sentry Metrics; the Sentry Metrics product has been retired.**

---

# SDK Architecture

Conceptually:

```text
Flutter/Dart code
       |
       v
sentry_flutter
       |
       +---- Dart Sentry SDK
       |
       +---- Flutter integrations
       |       |
       |       +-- Flutter errors
       |       +-- navigation
       |       +-- frame measurements
       |       +-- screenshots
       |       +-- user interactions
       |
       +---- native integrations
               |
               +-- Android Sentry SDK
               +-- Cocoa Sentry SDK
               +-- sentry-native where supported
               +-- Sentry JavaScript integration on Web
       |
       v
Sentry envelope/transport
       |
       +-- in-memory queue/backpressure
       +-- platform cache where supported
       |
       v
Sentry ingestion
       |
       +-- Issues/grouping
       +-- Performance
       +-- Profiles
       +-- Replay
       +-- Logs
       +-- Release Health
```

## Layer responsibilities

### Dart layer

Responsible for:

- Dart exception capture
- manual events
- scopes
- Dart breadcrumbs
- Dart transactions/spans
- transport-independent event processing
- isolate integration

### Flutter layer

Adds:

- Flutter framework error capture
- navigation instrumentation
- Flutter lifecycle breadcrumbs
- user interaction instrumentation
- frame measurements
- TTID/TTFD
- Flutter screenshots/view hierarchy
- app-start integration

### Native layer

Depending on platform, adds:

- Java/Kotlin/native Android crashes
- Swift/Objective-C/native Apple crashes
- ANRs
- Apple app hangs
- native breadcrumbs
- native release/session information
- native tracing context
- native crash persistence
- desktop native crash handling through `sentry-native`

### Sentry backend

Responsible for:

- ingestion
- event grouping
- symbolication
- issue tracking
- performance analysis
- profile processing
- Replay storage
- release health
- quotas/rate limits

An SDK `captureException()` call completing does **not** mean the event is already processed in the Sentry UI.

---

# Platform Capability Matrix

`Yes` means supported through the current Flutter SDK/package stack.

`Partial` means the feature exists but has important platform/toolchain limitations.

| Capability | Android | iOS | macOS | Linux | Windows | Web |
|---|---:|---:|---:|---:|---:|---:|
| Dart exceptions | Yes | Yes | Yes | Yes | Yes | Yes |
| Flutter framework errors | Yes | Yes | Yes | Yes | Yes | Yes |
| Current-isolate automatic uncaught capture | Yes | Yes | Yes | Yes | Yes | Web behavior differs |
| Spawned isolate helper | Yes | Yes | Yes | Yes | Yes | Do not assume |
| Java/Kotlin native crash | Yes | N/A | N/A | N/A | N/A | N/A |
| Swift/ObjC native crash | N/A | Yes | Yes | N/A | N/A | N/A |
| C/C++ native crash | Yes | Yes | Yes | Yes/Native backend | Yes/Native backend | N/A |
| Native crash test helper `nativeCrash()` | Yes | Yes | Yes | No | No | No |
| Performance tracing | Yes | Yes | Yes | Yes | Yes | Yes |
| Span streaming lifecycle | Yes | Yes | Yes | Yes | Yes | Yes |
| Profiling | No | Yes | Yes | No | No | No |
| Session Replay through Flutter SDK | Yes | Yes | Do not assume | No | No | Do not assume |
| Android ANR | Yes | N/A | N/A | N/A | N/A | N/A |
| Apple app-hang tracking | N/A | Yes | Yes | N/A | N/A | N/A |
| Slow/frozen frame metrics | Yes | Yes | Revalidate | Disabled | Disabled | Disabled |
| Standalone app-start tracing | Experimental | Experimental | No | No | No | No |
| Navigation tracing | Yes | Yes | Yes | Yes | Yes | Yes |
| TTID/TTFD | Yes | Yes | Yes/verify | Yes/verify | Yes/verify | Yes/verify |
| Automatic native breadcrumbs | Yes | Yes | Partial | Native-dependent | Native-dependent | JS/browser-dependent |
| Screenshot capture | Yes | Yes | Yes | Yes | Yes | Yes with renderer limitations |
| Flutter Platform View screenshots | No | No | No | No | No | No |
| View hierarchy | Yes/Flutter | Yes/Flutter | Yes/Flutter | Yes/Flutter | Yes/Flutter | Verify renderer |
| Offline event cache with `maxCacheItems` option | Yes | Yes | Yes | Native-backend dependent | Native-backend dependent | No native mobile cache guarantee |
| Auto session tracking documented by current option | Yes | Yes | Revalidate | Revalidate | Revalidate | Yes |
| Flutter Web JS error integration | N/A | N/A | N/A | N/A | N/A | Yes |
| Source/debug symbolication | Yes | Yes | Yes | Partial/tooling-specific | Partial/tooling-specific | Yes |
| Structured Sentry Logs | Yes | Yes | Yes | Yes | Yes | Yes |

**MUST NOT infer platform parity from the existence of a Dart property.**

`SentryFlutterOptions` contains options whose implementation is platform-specific.

---

# Installation

Add:

```shell
flutter pub add sentry_flutter
```

If Dio instrumentation is required:

```shell
flutter pub add sentry_dio
```

For release artifact uploads, use the current stable Sentry Dart build plugin as a development dependency:

```shell
flutter pub add --dev sentry_dart_plugin
```

At validation time:

```text
sentry_flutter:      9.26.0
sentry_dart_plugin:  3.4.0
```

Do not copy those numbers permanently into a generated solution without checking current pub.dev releases.

---

# DSN and Credentials

## DSN

The DSN tells the client SDK where to send telemetry.

It is a client-facing ingestion credential and will be discoverable in:

- Android binaries
- Apple binaries
- desktop applications
- JavaScript/Web bundles

Do not design security on the assumption that the DSN is secret.

## Build/API authentication token

A Sentry auth token used by:

- `sentry-cli`
- source-map upload
- debug-symbol upload
- release management
- API calls

is a privileged credential.

**MUST:**

- store it in CI/CD secrets
- expose it only to build/release jobs that require it
- use minimum necessary scopes

**MUST NOT:**

- put it in Dart source
- put it in `--dart-define`
- commit it to source control
- bundle it into Web assets
- use it as a runtime application credential

---

# Environment Strategy

Prefer:

```text
local development
    -> no Sentry or development Sentry project

QA
    -> QA/staging Sentry project/environment

staging
    -> staging Sentry project/environment

production
    -> production Sentry project/environment
```

At minimum set a stable environment:

```text
development
qa
staging
production
```

Do not use:

```text
prod-us-user-123
staging-2026-08-11-14-22
```

as environments.

High-cardinality environment names destroy filtering/release-health usefulness.

---

# Release and Dist

`release` identifies the application release.

`dist` distinguishes builds/distributions within a release when needed.

The Sentry SDK attempts automatic release detection, and `sentry_dart_plugin` can derive release information from `pubspec.yaml`.

Production rule:

```text
running binary release/dist
            ==
uploaded artifact release/dist
```

A mismatch can make otherwise correct symbols/source maps unusable.

If CI sets `SENTRY_RELEASE` and `SENTRY_DIST`, use the same values consistently for:

- runtime SDK
- source/debug artifact upload
- release creation
- deployment metadata

Do not independently invent release strings in multiple scripts.

---

# Initialization

## Recommended modern initialization

```dart
import 'package:flutter/widgets.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  const String dsn = String.fromEnvironment(
    'SENTRY_DSN',
  );

  const String environment = String.fromEnvironment(
    'SENTRY_ENVIRONMENT',
    defaultValue: 'development',
  );

  const String release = String.fromEnvironment(
    'SENTRY_RELEASE',
  );

  const String dist = String.fromEnvironment(
    'SENTRY_DIST',
  );

  await SentryFlutter.init(
    (SentryFlutterOptions options) {
      options.dsn = dsn;
      options.environment = environment;
      options.sendDefaultPii = false;

      if (release.isNotEmpty) {
        options.release = release;
      }

      if (dist.isNotEmpty) {
        options.dist = dist;
      }
    },
    appRunner: () => runApp(const App()),
  );
}

class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    return const Directionality(
      textDirection: TextDirection.ltr,
      child: Center(
        child: Text('Application'),
      ),
    );
  }
}
```

The application's real root widget naturally replaces the demonstration `App`.

---

# Why `appRunner` Matters

`SentryFlutter.init` installs the Flutter/Dart error integrations before running the application callback.

On modern Flutter versions Sentry uses `PlatformDispatcher.onError` as part of that automatic error path.

Older Flutter versions used `runZonedGuarded`.

This means the normal current architecture does **not** require application code to install another global Sentry error zone.

---

# Initialization Order

## Before `SentryFlutter.init`

Only perform work that must exist before Sentry itself:

- `WidgetsFlutterBinding.ensureInitialized()`
- synchronous environment/build configuration
- obtaining local compile-time Sentry configuration

Avoid large startup tasks before Sentry because failures there cannot benefit from full Sentry instrumentation.

## Inside option configuration

Keep option configuration lightweight.

Good:

```text
dsn
environment
release
dist
sampling configuration
privacy configuration
static filters
```

Bad:

```text
database migrations
network requests
remote config fetch
authentication restore
large file reads
dependency-container boot
```

The options callback may technically be asynchronous, but that does not make heavy initialization desirable.

## `appRunner`

Start Flutter as soon as the SDK is ready:

```dart
appRunner: () => runApp(const App()),
```

Noncritical observability-related setup can occur later.

---

# Do Not Add Duplicate Global Error Handlers

## Outdated pattern

```dart
FlutterError.onError = (details) {
  Sentry.captureException(
    details.exception,
    stackTrace: details.stack,
  );
};

PlatformDispatcher.instance.onError = (
  error,
  stack,
) {
  Sentry.captureException(
    error,
    stackTrace: stack,
  );
  return true;
};

runZonedGuarded(
  () => runApp(const App()),
  (error, stack) {
    Sentry.captureException(
      error,
      stackTrace: stack,
    );
  },
);
```

around a normal:

```dart
SentryFlutter.init(...);
```

## Why this fails

Sentry Flutter already installs its framework/global integrations.

Additional handlers can cause:

- duplicate events
- changed handled/unhandled classification
- lost previous handlers
- zone mismatches
- unclear ownership
- brittle initialization

## Preferred

Use:

```dart
await SentryFlutter.init(
  configure,
  appRunner: () => runApp(const App()),
);
```

Only install custom error handlers when another framework has a documented requirement and the integration deliberately chains existing handlers rather than replacing Sentry.

---

# Automatic Error Capture

Current Sentry Flutter automatically covers important global paths.

## Flutter framework exceptions

Flutter-specific exceptions routed through Flutter's framework error mechanism are captured automatically.

Do not manually capture the same `FlutterErrorDetails` again.

### Important Flutter limitation

Some layout/assertion-style errors only exist in debug builds and are removed by Flutter in release mode.

No Sentry integration can capture an exception that the release framework never emits.

## Uncaught asynchronous/root errors

Modern Flutter integration uses:

```text
PlatformDispatcher.onError
```

as part of its global automatic handling.

## Current isolate

Current/main isolate errors are automatically captured on non-Web Flutter targets.

## Native crashes

Native SDKs capture platform-layer crashes where native integrations are available.

Examples:

Android:

```text
Java
Kotlin
C/C++
NDK/native
```

Apple:

```text
Swift
Objective-C
C/C++
native signals
```

Desktop native crash support is provided through Sentry's native backend where configured by the current Flutter SDK/toolchain.

---

# Silent Flutter Errors

Sentry does not report `FlutterErrorDetails.silent` errors by default.

Current option:

```dart
options.reportSilentFlutterErrors = true;
```

Do not turn this on automatically.

Enable it only when:

- the application has a concrete need
- noise has been evaluated
- silent Flutter events are known to contain actionable failures

---

# Spawned Isolates

Errors in isolates created manually are not automatically equivalent to errors from the current isolate.

Use the official helper:

```dart
import 'dart:isolate';

import 'package:sentry_flutter/sentry_flutter.dart';

Future<Isolate> startWorker() async {
  final ReceivePort port = ReceivePort();

  final Isolate isolate = await Isolate.spawn(
    workerEntryPoint,
    port.sendPort,
  );

  isolate.addSentryErrorListener();

  return isolate;
}

void workerEntryPoint(SendPort sendPort) {
  sendPort.send('ready');
}
```

Do not both:

```text
addSentryErrorListener()
```

and separately forward/capture the same isolate error unless duplicate ownership is prevented.

## Scope caveat

Dart isolates do not share normal Dart memory.

Do not assume mutable Sentry scope state in the UI isolate automatically behaves like ordinary shared state in every background isolate.

---

# Background Isolates and Background Workers

Examples:

- push-notification background isolates
- WorkManager-style callbacks
- long-lived Dart workers
- platform background services

Rules:

1. **Do not assume the foreground Sentry lifecycle/context is present.**
2. **Do not blindly initialize a second native Sentry SDK.**
3. Verify the specific background framework and current Sentry documentation.
4. If a short-lived independent worker captures telemetry, ensure it has enough lifetime to hand the event to the SDK.
5. Use bounded flushing only when process lifetime requires it.
6. Do not hold a background task open simply to guarantee Sentry delivery.

Official documentation around every Flutter background-plugin combination is not exhaustive. When uncertain, state that limitation rather than pretending the foreground integration automatically applies.

---

# Manual Exception Capture

Use manual capture when an exception is:

- caught
- unexpected
- operationally actionable
- relevant to reliability
- not already captured automatically

Example:

```dart
import 'package:sentry_flutter/sentry_flutter.dart';

Future<void> synchronizeOrders() async {
  try {
    await performOrderSynchronization();
  } catch (error, stackTrace) {
    await Sentry.captureException(
      error,
      stackTrace: stackTrace,
      withScope: (scope) {
        scope.setTag(
          'operation',
          'order_sync',
        );

        scope.setContexts(
          'order_sync',
          <String, Object?>{
            'trigger': 'manual',
          },
        );
      },
    );

    rethrow;
  }
}

Future<void> performOrderSynchronization() async {}
```

Whether to rethrow or recover is a **business/application decision**, not a Sentry decision.

---

# When Not to Capture an Exception

Do not automatically send:

- normal form validation
- expected empty search results
- user cancellation
- user closing a picker
- normal 404 representing "not found"
- expected authentication expiration
- predictable offline state
- expected feature gating
- domain validation failures
- intentionally cancelled requests

Example anti-pattern:

```dart
try {
  await validateForm();
} on ValidationException catch (error, stackTrace) {
  await Sentry.captureException(
    error,
    stackTrace: stackTrace,
  );
}
```

If validation failure is normal user flow, it is not an error-monitoring event.

Use product analytics if the product needs frequency analysis.

---

# Fatal vs Non-Fatal

Preserve semantics.

## Fatal

Examples:

- unhandled process/application crash
- native fatal crash
- automatically collected fatal isolate error where SDK classification applies

## Non-fatal / handled

Examples:

- unexpected repository failure caught and recovered
- parser exception caught and fallback used
- background synchronization failure worth investigation

Do not mark expected recoverable failures as fatal.

Current Sentry option:

```dart
options.markAutomaticallyCollectedErrorsAsFatal
```

controls automatic classification for relevant automatically collected Dart errors.

Do not change it without understanding its effect on crash-free metrics.

---

# Telemetry Must Not Control Business Logic

Bad:

```dart
final SentryId id = await Sentry.captureException(
  error,
  stackTrace: stackTrace,
);

if (id != SentryId.empty()) {
  navigateToRecovery();
}
```

The product should not depend on telemetry success.

Preferred conceptual flow:

```text
operation fails
   |
   +--> application performs recovery/fallback
   |
   +--> Sentry observes failure independently
```

A capture returning does not prove Sentry backend ingestion or UI processing succeeded.

---

# Non-Blocking Error Reporter

For medium/large applications a small facade can isolate telemetry from business logic:

```dart
import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

abstract interface class ErrorReporter {
  void report(
    Object error,
    StackTrace stackTrace, {
    String? operation,
  });
}

final class SentryErrorReporter implements ErrorReporter {
  const SentryErrorReporter();

  @override
  void report(
    Object error,
    StackTrace stackTrace, {
    String? operation,
  }) {
    unawaited(
      _reportSafely(
        error,
        stackTrace,
        operation: operation,
      ),
    );
  }

  Future<void> _reportSafely(
    Object error,
    StackTrace stackTrace, {
    String? operation,
  }) async {
    try {
      await Sentry.captureException(
        error,
        stackTrace: stackTrace,
        withScope: (scope) {
          if (operation != null) {
            scope.setTag(
              'operation',
              operation,
            );
          }
        },
      );
    } catch (reportingError, reportingStackTrace) {
      if (kDebugMode) {
        debugPrint(
          'Sentry reporting failed: '
          '$reportingError\n$reportingStackTrace',
        );
      }
    }
  }
}
```

Use this architecture when it provides:

- central filtering
- testing
- privacy enforcement
- provider independence
- consistent metadata

A small application with a few centralized capture points does not need an abstraction purely for ceremony.

---

# Noise Reduction Strategy

Apply noise reduction in this order:

```text
1. Do not capture expected failures
2. Use exception-type filters
3. Use stable ignore rules
4. Remove duplicate ownership
5. Use built-in deduplication where appropriate
6. Use beforeSend for cases requiring event inspection
7. Use sampling only when volume still requires it
```

Do not begin by randomly sampling away useful errors.

---

# Exception-Type Filters

Current API:

```dart
options.addExceptionFilterForType(
  ExpectedCancellationException,
);
```

Example exception:

```dart
final class ExpectedCancellationException
    implements Exception {
  const ExpectedCancellationException();
}
```

Use type filters for exceptions that are always expected/non-actionable.

Do not filter a broad base exception that also contains real failures.

---

# `ignoreErrors`

Current SDK supports string/regex-style error filtering.

Use it for stable known noise.

Avoid overly broad rules such as:

```text
"timeout"
"network"
"exception"
```

that may hide unrelated actionable errors.

---

# `beforeSend`

Current callback type:

```text
FutureOr<SentryEvent?>
```

Returning `null` drops the event.

Appropriate uses:

- final PII redaction
- known noise that requires inspecting event/hint context
- removing oversized unnecessary metadata
- normalizing safe metadata
- dropping known platform noise

Keep it fast.

Bad:

```text
beforeSend
 -> database query
 -> HTTP request
 -> decrypt large file
 -> parse megabytes of JSON
 -> return event
```

That work adds latency and resource cost to the capture pipeline.

Prefer deterministic in-memory filtering.

---

# `beforeBreadcrumb`

`beforeBreadcrumb` is synchronous.

Returning `null` drops the breadcrumb.

Because it can run frequently, keep it extremely cheap:

```text
inspect category
redact/drop
return
```

Never perform:

- I/O
- database access
- networking
- expensive JSON serialization
- cryptography

inside `beforeBreadcrumb`.

---

# Event Processors

Event processors run for every event and may:

- enrich an event
- modify it
- return `null` to drop it

Use them when enrichment/filtering belongs to a reusable processing component.

Do not create an event processor when:

- one static tag is enough
- one `beforeSend` check is enough
- temporary `withScope` context is enough

Every processor increases pipeline complexity.

---

# Deduplication

Current Sentry has built-in event deduplication:

```dart
options.enableDeduplication = true;
```

with:

```dart
options.maxDeduplicationItems
```

The retained comparison set should remain small.

The SDK specifically recommends deduplication when failed-request capture through `SentryHttpClient` could overlap with application capture.

## Common duplicate causes

- automatic global capture + manual global capture
- `captureException` in a catch + rethrow into automatic handler
- logger error integration + explicit `captureException`
- Dio failed-request capture + catch capture
- multiple `SentryNavigatorObserver`s
- repeated state-management error listeners
- isolate forwarding + manual capture
- duplicate Flutter error handlers

Fix ownership first. Deduplication is a safety net, not architectural permission to report everything twice.

---

# Error Grouping and Fingerprinting

Sentry's default grouping uses error/stack information and evolves with Sentry grouping improvements.

Prefer default grouping.

Custom fingerprinting is appropriate only when:

- Sentry demonstrably groups unrelated failures together
- one logical failure must be combined across different stacks
- the grouping strategy is documented and stable

Never put:

- user IDs
- request IDs
- random UUIDs
- timestamps
- full URLs

into fingerprints.

Those values fragment one issue into thousands.

Likewise, a constant fingerprint for all application exceptions collapses unrelated failures into one useless issue.

---

# Scope and Context

Use different Sentry context mechanisms deliberately.

## User

Who experienced the failure.

## Tags

Small searchable/filterable dimensions.

Examples:

```text
feature = checkout
build_channel = production
sync_mode = manual
```

Keep tags reasonably low-cardinality.

## Contexts

Structured diagnostic objects.

Examples:

```text
checkout:
  provider: stripe
  attempt: 2
```

Prefer structured contexts over dumping large arbitrary objects.

## Breadcrumbs

Temporal history leading to an event.

## Temporary event scope

Use capture-specific `withScope` for data that should apply only to one event.

---

# Prevent Scope Leakage

Bad:

```dart
await Sentry.configureScope((scope) {
  scope.setTag(
    'current_order_id',
    order.id,
  );
});

await processSomethingElse();
```

If never cleared, unrelated future events inherit that order.

Preferred:

```dart
await Sentry.captureException(
  error,
  stackTrace: stackTrace,
  withScope: (scope) {
    scope.setContexts(
      'order',
      <String, Object?>{
        'type': order.type,
      },
    );
  },
);
```

Event-specific data should remain event-specific.

---

# Avoid Scope Mutation in `build()`

Bad:

```dart
@override
Widget build(BuildContext context) {
  Sentry.configureScope(
    (scope) {
      scope.setTag(
        'screen',
        'home',
      );
    },
  );

  return const HomeScreen();
}
```

Why:

- `build()` may execute repeatedly
- native scope synchronization may occur
- tags can race with navigation
- scope semantics become unpredictable

Use:

- identity transitions
- app lifecycle transitions
- navigation instrumentation
- event-local scope

instead.

---

# User Context

Current model:

```dart
SentryUser(
  id: 'opaque-user-id',
)
```

Production default:

```dart
Future<void> setSignedInUser(
  String opaqueUserId,
) async {
  await Sentry.configureScope(
    (scope) {
      scope.setUser(
        SentryUser(
          id: opaqueUserId,
        ),
      );
    },
  );
}

Future<void> clearSignedInUser() async {
  await Sentry.configureScope(
    (scope) {
      scope.setUser(null);
    },
  );
}
```

Prefer an opaque internal ID that is genuinely useful for debugging.

Do not automatically include:

- email
- username
- full name
- IP address

merely because `SentryUser` supports those fields.

---

# Account Switching

For:

```text
User A
  -> logout
  -> User B login
```

perform:

```text
clear User A Sentry context
      |
      v
establish User B application session
      |
      v
set User B opaque Sentry ID
```

Do not allow user-specific tags/contexts to remain attached across accounts.

---

# Anonymous Users

Do not invent an app-level Sentry user ID merely to populate the field.

Device/app/release context already provides useful diagnostics.

Use user identity only when:

- account correlation genuinely helps incident response
- the privacy model permits it

---

# Tags

Good tags:

```text
feature=checkout
subscription_tier=pro
sync_mode=background
api_region=eu
```

Poor tags:

```text
user_uuid=<millions-of-values>
request_uuid=<every-request>
full_url=<unique-url>
timestamp=<unique-time>
```

Searchability does not mean every value should become a tag.

High-cardinality tags increase backend noise and cost.

---

# Extras

Older APIs allow arbitrary extras.

For new architecture, prefer:

- tags for searchable bounded values
- structured contexts for rich diagnostic objects

Avoid enormous extras.

Do not attach complete serialized application state.

---

# Breadcrumbs

Breadcrumbs answer:

```text
What happened before this failure?
```

Current default maximum is:

```text
100
```

unless configured otherwise.

Use the limit as a bounded history, not as a target to fill continuously.

---

# High-Signal Breadcrumbs

Useful examples:

```text
navigation
  Home -> Checkout

domain action
  Checkout submitted

state
  Sync moved queued -> running

HTTP
  GET /api/orders/:id -> 503

auth
  Session refresh started
```

Avoid sensitive values.

---

# Poor Breadcrumbs

Do not record:

- every frame
- every widget rebuild
- every state selector run
- every pointer movement
- every scroll pixel
- every keystroke
- complete HTTP bodies
- authorization headers
- cookies
- passwords
- private user messages
- large object serialization

High breadcrumb rates add:

- CPU work
- object allocation
- event-payload size
- debugging noise

---

# Automatic Breadcrumbs

Current Flutter SDK has:

```dart
options.enableAutoNativeBreadcrumbs
```

for Android/iOS native breadcrumbs.

It also has Flutter-specific lifecycle/system breadcrumb controls.

Be careful enabling both equivalent native and Flutter breadcrumb sources.

The SDK documents:

```dart
options.enableBreadcrumbTrackingForCurrentPlatform();
```

as a helper for sensible current-platform defaults.

Prefer that over manually turning on every possible breadcrumb switch.

---

# Print Breadcrumbs

Current option:

```dart
options.enablePrintBreadcrumbs = true;
```

can record `print`/`debugPrint` behavior.

Do not enable this merely because it exists.

Applications with verbose console logging can:

- flood breadcrumb buffers
- capture sensitive text
- increase event size
- make useful breadcrumbs harder to find

---

# Navigation Instrumentation

Current standard observer:

```dart
MaterialApp(
  navigatorObservers: <NavigatorObserver>[
    SentryNavigatorObserver(),
  ],
);
```

It records navigation breadcrumbs and can create performance transactions.

Provide stable route names.

---

# Route Names

Good:

```text
/home
/product/:id
/checkout
/settings/profile
```

Bad:

```text
/product/839271
/user/182738/orders/9281
/search?q=user-input
```

Dynamic values create transaction cardinality explosions.

Use `routeNameExtractor` where necessary to normalize application route names.

---

# `SentryNavigatorObserver`

Current defaults include:

```text
enableAutoTransactions = true
enableNewTraceOnNavigation = false
autoFinishAfter = 3 seconds
```

When tracing is enabled, new routes can create transactions automatically.

Do not also create an equivalent manual route transaction.

---

# Navigator 2.0 / Third-Party Routers

Do not assume every router is automatically instrumented.

For:

- `MaterialApp.router`
- `go_router`
- AutoRoute
- custom Router API
- nested routing stacks

verify the router's current `NavigatorObserver` integration.

The rule is:

```text
one logical route transition
      ->
one intended Sentry navigation transaction/breadcrumb
```

not one per internal navigator implementation detail.

---

# Nested Navigators

If root + tab navigators each have observers, verify that route activity is not duplicated.

Decide whether a nested route is:

- a product-level screen
- an implementation detail

before creating transactions.

---

# Tabs

A tab change may not create a Navigator route.

MAY add a manual breadcrumb or transaction only when that transition represents meaningful product performance/navigation.

Do not instrument every internal tab animation with a transaction.

---

# Modals

Dialogs and bottom sheets do not automatically need their own performance transaction.

Use:

- breadcrumb for important modal state
- route transaction only when the modal is truly a screen-level flow

---

# Performance Monitoring

Tracing answers:

```text
Where did user-visible/application time go?
```

A transaction/root span represents meaningful work.

Examples:

- screen load
- checkout operation
- account synchronization
- search
- startup
- background task

Child spans represent significant operations inside it.

---

# Enable Tracing

Tracing is disabled when no tracing sample configuration is provided.

Static example:

```dart
await SentryFlutter.init(
  (options) {
    options.dsn = sentryDsn;
    options.tracesSampleRate = configuredTraceRate;
  },
  appRunner: () => runApp(const App()),
);
```

`configuredTraceRate` must come from an intentional environment/product observability configuration.

Do not replace it with `1.0` by reflex.

---

# Sampling Strategy

No universal production sampling percentage exists.

Choose based on:

```text
daily sessions
requests per session
transactions per session
criticality
performance-investigation goals
quota
network budget
CPU budget
retention
cost
```

## Development

A high/100% trace rate MAY be useful temporarily to verify instrumentation.

## Staging

Often higher sampling is reasonable because traffic is low and instrumentation verification matters.

## Production

Start with a measured budget.

Examples of decision logic:

```text
low-volume critical app
 -> potentially higher sampling

very high-volume consumer app
 -> lower baseline sampling

payment/checkout transaction
 -> potentially higher targeted sampling

very frequent low-value route
 -> lower sampling
```

Do not interpret these as fixed percentages.

---

# Error Sampling vs Trace Sampling

Current SDK has separate:

```dart
options.sampleRate
```

for error events and:

```dart
options.tracesSampleRate
```

for tracing.

Do not accidentally use an error sample rate as if it controlled tracing.

For error events:

**SHOULD prefer filtering known noise before broad random sampling.**

Randomly sampling errors can hide rare crashes.

---

# `tracesSampler`

Use a dynamic sampler when different transactions require different rates.

Reasons:

- critical transaction
- background vs foreground
- environment
- transaction type
- traffic tier

Avoid opaque sampling logic distributed through application code.

One central sampling policy is easier to reason about.

If configuring both static rate and sampler behavior, revalidate the current SDK's exact precedence instead of assuming both percentages are independently multiplied.

---

# Sampling and Inherited Traces

Distributed tracing may inherit an upstream sampling decision.

Do not design each service/mobile SDK as if it exists in isolation.

Sampling architecture should account for:

- incoming trace decisions
- Sentry dynamic sampling
- application-side sampling
- high-volume services

---

# Static Tracing Lifecycle

Classic API:

```dart
Future<T> tracedOperation<T>(
  String transactionName,
  Future<T> Function(ISentrySpan transaction) operation,
) async {
  final ISentrySpan transaction = Sentry.startTransaction(
    transactionName,
    'task',
    bindToScope: true,
  );

  try {
    final T result = await operation(transaction);
    transaction.status = const SpanStatus.ok();
    return result;
  } catch (error) {
    transaction.throwable = error;
    transaction.status = const SpanStatus.internalError();
    rethrow;
  } finally {
    await transaction.finish();
  }
}
```

Use the exact current `SpanStatus` constructor syntax from the installed package if it changes across versions.

The essential rules are:

- stable name
- meaningful operation
- finish every transaction
- mark status/throwable appropriately

---

# Child Spans

Conceptually:

```dart
final ISentrySpan transaction =
    Sentry.startTransaction(
  'inventory_sync',
  'task',
);

final ISentrySpan child =
    transaction.startChild(
  'db.read',
  description: 'Load pending inventory',
);

try {
  await loadInventory();
  child.status = const SpanStatus.ok();
} catch (error) {
  child.throwable = error;
  child.status = const SpanStatus.internalError();
  rethrow;
} finally {
  await child.finish();
  await transaction.finish();
}
```

Do not leave spans unfinished.

Unfinished spans produce:

- misleading durations
- incomplete traces
- memory retention until timeout/cleanup
- confusing Sentry UI

---

# Span Streaming Lifecycle

Sentry Flutter 9.23+ marks span streaming non-experimental.

Opt-in lifecycle:

```dart
options.traceLifecycle =
    SentryTraceLifecycle.stream;
```

Use:

```dart
final result = await Sentry.startSpan(
  'Load account',
  (SentrySpanV2 span) async {
    return loadAccount();
  },
);
```

`startSpan` automatically ends the span when its async callback finishes.

For synchronous work:

```dart
final result = Sentry.startSpanSync(
  'Parse configuration',
  (SentrySpanV2 span) {
    return parseConfiguration();
  },
);
```

## Critical rule

When using streaming lifecycle:

```text
Sentry.startSpan / startSpanSync
```

belong to that model.

Classic:

```text
startTransaction
ISentrySpan.startChild
```

do not represent the same active tracing lifecycle.

**MUST NOT mix tracing lifecycles in one implementation.**

Revalidate this carefully for Sentry 10.x.

---

# Span Boundaries

Good spans:

```text
http.client
db.query
file.read
cache.lookup
serialization of large domain payload
authentication restore
critical startup dependency
```

Bad spans:

```text
getter
setter
every repository method
every widget build
every loop iteration
every map operation
every button animation
```

Each span has:

- object allocation
- timing state
- attributes
- serialization
- buffering
- backend ingestion cost

Instrument operations that help answer a performance question.

---

# Transaction Naming

Good:

```text
product_detail
/product/:id
checkout
inventory_sync
search_results
```

Bad:

```text
/product/839271
/order/bfb0f78b-d89c...
/search?q=my-exact-private-query
user_192837_checkout
```

Transaction names are aggregation keys.

High-cardinality names damage:

- performance summaries
- grouping
- Discover queries
- sampling efficiency
- telemetry cost

Put bounded metadata in attributes/tags rather than names.

---

# Distributed Tracing

Sentry distributed tracing propagates trace information using Sentry trace metadata such as:

```text
sentry-trace
baggage
```

The current Dart SDK can also optionally propagate W3C:

```text
traceparent
```

using:

```dart
options.propagateTraceparent = true;
```

when the downstream service uses OpenTelemetry/W3C tracing.

---

# Trace Propagation Targets

Current option:

```dart
options.tracePropagationTargets
```

controls which outgoing URLs receive tracing headers.

Example policy:

```dart
options.tracePropagationTargets.add(
  r'^https://api\.example\.com/',
);

options.tracePropagationTargets.add(
  r'^https://payments-api\.example\.com/',
);
```

Do not propagate Sentry tracing baggage to:

- arbitrary image CDNs
- advertising endpoints
- analytics providers
- unrelated SaaS APIs
- user-provided URLs

unless they deliberately participate in the same trace and the metadata-sharing boundary has been reviewed.

---

# Strict Trace Continuation

Current SDK supports:

```dart
options.strictTraceContinuation = true;
```

and an organization ID override where required.

Sentry 9.20+ added cross-organization trace-continuation protection.

Enable stricter behavior when the application's trust model requires incoming baggage to belong to the same Sentry organization.

This is particularly relevant to:

- custom deep links that initiate work
- cross-company APIs
- proxy/gateway environments
- self-hosted Sentry

---

# HTTP Instrumentation

## `package:http`

Use:

```dart
final SentryHttpClient client =
    SentryHttpClient();
```

or wrap an existing `http.Client`.

This provides Sentry-aware HTTP behavior such as:

- tracing
- breadcrumbs
- configured failed-request handling

according to current SDK settings.

Close the HTTP client when its own lifecycle ends.

---

# Dio

Official integration is the separate:

```text
sentry_dio
```

package.

Typical setup:

```dart
import 'package:dio/dio.dart';
import 'package:sentry_dio/sentry_dio.dart';

Dio createDio() {
  final Dio dio = Dio(
    BaseOptions(
      baseUrl: 'https://api.example.com',
    ),
  );

  dio.addSentry();

  return dio;
}
```

Add Sentry integration after the rest of the intended Dio configuration so later configuration does not accidentally overwrite instrumentation assumptions.

---

# HTTP Failure Capture

Do not report every non-2xx response automatically.

Examples:

```text
404 expected lookup miss
401 expected expired session
409 expected optimistic conflict
```

may be normal domain outcomes.

Examples:

```text
500
502
unexpected SocketException in critical operation
TLS failure
invalid protocol response
```

may be actionable.

Tune failed-request status codes/targets according to the backend contract.

---

# Avoid Duplicate HTTP Errors

Bad:

```text
SentryHttpClient captures 500
        +
repository catch calls captureException
        +
logger integration sends error
```

Result:

```text
one failure -> several events
```

Choose one error owner.

A useful policy:

```text
HTTP integration
 -> span + breadcrumb

repository/application boundary
 -> capture unexpected domain-impacting failure once
```

or deliberately enable automatic failed-request capture and do not manually duplicate it.

---

# HTTP Privacy

HTTP data may contain:

- URL paths
- query parameters
- headers
- cookies
- request bodies
- response bodies
- user identifiers
- tokens

Never send:

```text
Authorization
Cookie
Set-Cookie
password
access_token
refresh_token
API secret
payment card data
```

Do not enable body capture broadly without a data-classification review.

Prefer:

```text
POST /orders/:id
```

over storing the full private URL.

---

# Profiling

Current Flutter profiling support is documented for:

- iOS
- macOS

only.

Configuration:

```dart
options.tracesSampleRate = configuredTraceRate;
options.profilesSampleRate = configuredProfileRate;
```

`profilesSampleRate` is **relative to sampled traces**.

Conceptually:

```text
100,000 transactions
   |
trace sampling
   v
10,000 sampled traces
   |
profile sampling
   v
1,000 profiles
```

if both sampling stages happened to select 10%.

Do not treat profile rate as a percentage of all application activity independently of tracing.

---

# Profiling Cost

Profiling adds:

- CPU sampling
- profile buffers
- serialization
- larger payloads
- network transfer
- backend quota/cost

Therefore:

- enable it to answer real CPU-performance questions
- sample conservatively in production
- validate CPU/battery impact on representative physical devices
- do not set 100% simply because staging used 100%

Do not claim Android/Web/Windows/Linux profiling through `sentry_flutter` unless current package documentation adds it.

---

# App Start

## Stable production principle

Initialize Sentry early, but keep custom configuration light.

Do not manually create startup transactions merely because startup matters.

First determine whether current built-in instrumentation answers the question.

---

# Standalone App-Start Tracing — 9.26 Experimental

Current opt-in:

```dart
options.enableStandaloneAppStartTracing = true;
```

Requirements:

- tracing enabled
- Android or iOS
- Sentry Flutter 9.26+
- feature remains experimental in this release

It produces:

```text
app.start
```

as a standalone root span from process start to first frame.

Do not enable it blindly in every production app before:

- measuring telemetry volume
- validating dashboards
- understanding its experimental status

---

# Extending App Start

If the product definition of "ready" goes beyond first frame:

```dart
await SentryFlutter.init(
  (options) {
    options.dsn = sentryDsn;
    options.tracesSampleRate = configuredTraceRate;
    options.enableStandaloneAppStartTracing = true;
  },
  appRunner: () async {
    SentryFlutter.extendAppStart();

    runApp(const App());

    try {
      await restoreCriticalStartupState();
    } finally {
      await SentryFlutter.finishExtendedAppStart();
    }
  },
);
```

The current SDK uses a 30-second fallback deadline.

**If app start is extended, always finish it.**

Do not extend startup around:

- background refresh
- analytics upload
- noncritical prefetch
- tasks the user does not need before using the app

---

# TTID and TTFD

## TTID

Time to Initial Display represents initial visible route rendering.

`SentryNavigatorObserver` participates in current Flutter routing instrumentation.

## TTFD

Enable:

```dart
options.enableTimeToFullDisplayTracing = true;
```

Then report full display when the screen's meaningful content is actually ready:

```dart
await SentryFlutter.reportFullyDisplayed();
```

Current SDK uses a 30-second deadline if full display is never reported.

Do not report full display:

- in every `build()`
- before async content appears
- from multiple components for one route

Define one TTFD owner per logical screen.

---

# Slow and Frozen Frames

Sentry's current Flutter measurement semantics include:

```text
slow frame
  frame duration > 1 / display refresh rate

frozen frame
  typically > 500 ms
```

Frame metrics help identify janky transactions/screens.

They are not a replacement for:

- Flutter DevTools timeline
- raster/UI thread analysis
- shader diagnostics
- detailed frame profiling

Current Sentry Flutter explicitly disables unreliable slow/frozen-frame measurement on:

- Web
- Linux
- Windows

Do not claim those metrics there.

---

# Android ANRs

Current option:

```dart
options.anrEnabled
```

Android only.

Current default:

```text
enabled
```

Current threshold:

```text
5 seconds
```

via:

```dart
options.anrTimeoutInterval
```

Do not lower the threshold aggressively just to collect more events.

Too-low thresholds create false/noisy ANRs.

---

# Android Tombstone Reporting

Current optional setting:

```dart
options.enableTombstone = true;
```

Availability:

```text
Android 12+ / API 30+
```

It uses Android application-exit information to enrich native crash reporting.

It is disabled by default.

Enable it when richer Android native crash diagnostics justify the additional platform integration.

---

# Apple App Hangs

Current support:

- iOS
- macOS

Option:

```dart
options.enableAppHangTracking
```

Current default threshold configuration:

```dart
options.appHangTimeoutInterval
```

with a documented default of approximately:

```text
2 seconds
```

Avoid extremely low thresholds.

The API warns values below roughly 100 ms can create many hang events.

---

# Pausing Apple Hang Tracking

System UI can block application execution in ways that resemble hangs.

Current APIs:

```dart
await SentryFlutter.pauseAppHangTracking();

try {
  await requestSystemPermission();
} finally {
  await SentryFlutter.resumeAppHangTracking();
}
```

Use this only around known situations where the operating system can create a false-positive hang.

Do not disable hang tracking globally to avoid investigating real hangs.

---

# Native Crash Capture

Production crash reporting is incomplete until native crashes are verified.

Testing only:

```dart
throw StateError('Dart test');
```

does not prove:

- Android Java/Kotlin crash capture
- Android NDK crash capture
- Apple native crash capture
- desktop native crash capture
- symbol uploads

---

# Native Crash Test Helper

Current:

```dart
await SentryFlutter.nativeCrash();
```

is specifically for testing native crash reporting and is documented for:

- Android
- iOS
- macOS

It intentionally crashes the native application.

**MUST NOT expose this capability to production users.**

Use a QA/staging build and expect fatal crash delivery to complete after normal crash/restart processing.

---

# Desktop Native Crashes

The current 9.x Sentry Flutter line restored `sentry-native` as the default native backend for Linux/Windows, with backend selection varying by target architecture.

Desktop native crash handling is more toolchain-sensitive than mobile.

Therefore:

- validate release builds on the actual OS/architecture
- verify native symbols
- verify crashpad/breakpad/native backend initialization
- do not infer desktop crash health from Dart-only tests

---

# Releases and Symbolication

This is mandatory production infrastructure.

Without symbolication, stack traces may contain:

```text
obfuscated Dart names
native addresses
minified JS
R8 names
unresolved native frames
```

Those reports can be nearly useless.

---

# Sentry Dart Plugin

Current stable build plugin:

```text
sentry_dart_plugin 3.4.0
```

It uses `sentry-cli` to upload:

- Android debug information
- iOS/macOS debug information
- Flutter Web source maps

Use the current plugin documentation rather than old manual Sentry CLI snippets unless a custom pipeline requires manual control.

---

# CI Credentials

Configure the build job with:

```text
SENTRY_AUTH_TOKEN
SENTRY_ORG
SENTRY_PROJECT
```

and, where deliberately controlled:

```text
SENTRY_RELEASE
SENTRY_DIST
```

Never compile `SENTRY_AUTH_TOKEN` into the app.

---

# Android Symbolication

There are multiple independent symbol types.

## Flutter/Dart obfuscation

If using:

```text
--obfuscate
--split-debug-info
```

preserve and upload the generated Dart debug information.

The package README explicitly warns that `split-debug-info` requires debug symbols to be uploaded.

Example build pattern from current plugin guidance:

```shell
flutter build apk \
  --obfuscate \
  --split-debug-info=build/symbols \
  --extra-gen-snapshot-options=--save-obfuscation-map=build/mapping.json
```

The extra obfuscation map supports improved issue-title/type symbolication on current Android/iOS plugin workflows.

Do not delete these artifacts before Sentry upload succeeds.

## R8 / ProGuard

If Android release builds use minification/obfuscation, upload the matching mapping information for the exact release.

## Native symbols

If native C/C++ libraries are part of the app, preserve/upload matching debug information.

One Android release can therefore need multiple artifact classes.

---

# Apple Symbolication

For iOS/macOS:

- preserve dSYMs for release builds
- upload them through current Sentry tooling
- verify UUID matches
- ensure build/release association is correct

A dSYM from:

```text
1.4.2 build 110
```

cannot symbolicate a different binary merely because its source code looks similar.

Do not use obsolete Bitcode-era workflows unless maintaining an old toolchain that genuinely requires them.

---

# Flutter Web Source Maps

Production Flutter Web code is compiled/minified.

Generate source maps for the production build and upload them using current Sentry tooling.

Current `sentry_dart_plugin` 3.x supports Debug ID injection for modern Sentry Flutter Web symbolication.

Debug IDs are preferable to relying solely on brittle URL/release path matching.

Do not publicly serve source maps unintentionally if source exposure violates the organization's source-code policy.

---

# Dart Symbol Mapping File

Current `sentry_dart_plugin` 3.2+ can upload the Dart symbol mapping file for obfuscated Flutter issue-title symbolication on:

- Android
- iOS

At validation time it is not supported by that plugin for:

- macOS
- Linux
- Windows

Do not claim desktop parity.

---

# Release Pipeline

Recommended:

```text
1. Determine release + dist
2. Build production binary
3. Generate obfuscation/source/debug artifacts
4. Upload artifacts with same release/dist
5. Verify Sentry accepts/processes artifacts
6. Deploy binary
7. Trigger controlled QA event/crash
8. Verify fully symbolicated stack
```

Do not upload "latest symbols" without associating them with the binary they came from.

---

# Release Health and Sessions

Release health uses application sessions to calculate measures such as crash-free sessions/users where supported.

Current `enableAutoSessionTracking` documentation explicitly targets:

- native Android/iOS SDKs
- Web

Current background session-end interval default is approximately:

```text
30 seconds
```

Do not change session semantics merely to make dashboards look better.

macOS/Linux/Windows automatic release-health parity should be revalidated against the installed SDK rather than assumed.

---

# Offline Behavior

Sentry transports can cache envelopes when networking is unavailable on supported native platforms.

Current Flutter option:

```dart
options.maxCacheItems
```

defaults to:

```text
30
```

and is explicitly documented for:

- Android
- iOS
- macOS

The current in-flight queue option:

```dart
options.maxQueueSize
```

also defaults to:

```text
30
```

for tight-loop capture backpressure.

---

# Do Not Build a Custom Telemetry Queue

Bad:

```text
Sentry capture
   |
also write event to SQLite
   |
custom retry worker
   |
re-send event
```

Problems:

- duplicate events
- extra disk I/O
- more background work
- battery/network cost
- privacy retention
- custom encryption/security burden
- timestamps no longer match occurrence
- retries can outlive user consent

Use Sentry's transport.

If a piece of information is business-critical, persist it in the application's authoritative backend instead of treating Sentry as a reliable message queue.

---

# Flush and Close

Current:

```dart
await Sentry.close();
```

closes the SDK and flushes queued work for the SDK's shutdown window.

Use it for:

- tests
- CLI-like short-lived Dart processes
- deliberate SDK shutdown
- independently initialized short-lived environments where verified

Do not:

```text
captureException
close
captureException
close
```

for a normal mobile application.

That defeats the SDK lifecycle and adds unnecessary I/O/network pressure.

---

# Screenshots

Current option:

```dart
options.attachScreenshot = true;
```

automatically attaches a screenshot to error/exception events.

Use:

```dart
options.beforeCaptureScreenshot
```

for selective capture.

Screenshots can dramatically improve UI debugging but contain user-visible information.

Privacy review is mandatory.

---

# `SentryScreenshotWidget`

Current Flutter screenshot capture uses:

```dart
SentryScreenshotWidget
```

around the relevant widget tree.

Important limitations:

- only one screenshot widget should exist in the tree
- Flutter Platform Views cannot currently be captured
- Flutter Web support depends on compatible renderer behavior

Use the convenience:

```dart
SentryWidget(
  child: const App(),
)
```

when the enabled Sentry Flutter features require the combined Flutter wrappers.

Do not add screenshot/replay widgets solely because Sentry crash reporting is installed.

---

# Screenshot Privacy

Current:

```dart
options.privacy
```

masks sensitive screen content by default for screenshots/Replay.

That default is useful but not a complete privacy guarantee.

Test:

- authentication screens
- payment screens
- chat/messages
- health screens
- profile information
- custom painters
- images
- Platform Views

Use explicit mask/unmask widgets only after reviewing what the resulting capture exposes.

---

# View Hierarchy

Current:

```dart
options.attachViewHierarchy = true;
```

adds Flutter view-hierarchy information to captured errors.

Use:

```dart
options.beforeCaptureViewHierarchy
```

to selectively prevent capture.

Current:

```dart
options.reportViewHierarchyIdentifiers
```

controls identifier collection.

View hierarchy can help diagnose:

- hidden/offstage widgets
- layout state
- screen structure

but adds:

- event size
- collection/traversal work
- possible sensitive identifiers

Do not enable it everywhere without a concrete debugging need.

---

# Attachments

Current `SentryAttachment` supports arbitrary attachment bytes.

Use attachments for small high-value diagnostics such as:

- a sanitized configuration fragment
- a short diagnostic text file
- specialized crash artifacts

Do not attach by default:

- entire application logs
- database dumps
- API response archives
- user documents
- screenshots containing secrets
- multi-megabyte state snapshots

Current `maxAttachmentSize` prevents oversized attachments above the configured limit.

Attachment limits may also depend on Sentry service/account ingestion constraints.

---

# Session Replay

Current Sentry Flutter Replay options:

```dart
options.replay.sessionSampleRate
options.replay.onErrorSampleRate
options.replay.quality
```

Both sample-rate options default to disabled.

Current documented error Replay captures a recent window around an error.

---

# Replay Platform Scope

Flutter Session Replay was developed and GA'd for:

- Android
- iOS

Do not automatically claim Flutter Replay support on:

- Web
- Linux
- Windows
- macOS

without rechecking the current installed package.

The existence of browser Replay in Sentry's JavaScript SDK does not imply `sentry_flutter` exposes identical Flutter Web Replay behavior.

---

# Replay Sampling

There are two distinct goals.

## Session sampling

```dart
options.replay.sessionSampleRate =
    configuredSessionReplayRate;
```

captures sampled normal sessions.

## Error sampling

```dart
options.replay.onErrorSampleRate =
    configuredErrorReplayRate;
```

captures replay context for sampled errors.

Design the two rates independently.

A common observability strategy is:

```text
low normal-session Replay rate
higher error Replay rate
```

but the actual percentages depend on:

- traffic
- privacy
- bandwidth
- Sentry quota
- debugging needs
- device performance

Do not hardcode universal rates.

---

# Replay Quality and Performance

Current Replay quality explicitly trades fidelity for:

- CPU load
- transferred data

Use the lowest quality that still answers debugging questions.

Test on:

- older Android hardware
- low-memory devices
- long sessions
- image-heavy screens
- animation-heavy UI
- poor networks

Replay is one of the optional observability features most likely to have noticeable telemetry cost.

---

# Replay Privacy

Before production enablement:

- validate default masking
- test custom `SentryMask`
- test intentional `SentryUnmask`
- inspect images
- inspect rich text
- inspect input fields
- inspect private screens
- confirm organizational consent/privacy requirements

Do not use unmasking as a convenience shortcut.

---

# Structured Sentry Logs

Current SDK supports:

```dart
options.enableLogs = true;
```

and:

```dart
Sentry.logger.info(
  'Cache refreshed',
);
```

Structured attributes are available through `SentryLogAttribute`.

Use Sentry Logs for structured operational logs that benefit from Sentry correlation.

Do not turn them into:

- every debug print
- every state update
- every API body
- verbose production trace logging

Logs have their own:

- ingestion volume
- payload cost
- privacy surface

Use `beforeSendLog` for filtering/redaction where needed.

---

# Sentry Metrics

Do not design new functionality using:

```text
Sentry.metrics
options.enableMetrics
```

even if symbols still exist in the package.

Sentry's official Metrics documentation says the previous Metrics beta/product was retired.

Use:

- Sentry Performance/traces
- Sentry Logs
- application analytics
- backend metrics

according to the actual telemetry requirement.

---

# Privacy and Security

## Default

Prefer:

```dart
options.sendDefaultPii = false;
```

until the organization has intentionally approved additional PII collection.

---

# Never Intentionally Send

- passwords
- access tokens
- refresh tokens
- authorization headers
- cookies
- session tokens
- private API keys
- service-account credentials
- payment card data
- CVVs
- private encryption keys
- highly sensitive user content
- health information unless an explicit approved architecture permits it
- private messages by default

---

# PII Surfaces to Audit

A privacy review must inspect:

```text
SentryUser
tags
contexts
extras
breadcrumbs
URLs
query strings
HTTP headers
HTTP bodies
exception messages
custom error messages
attachments
screenshots
view hierarchy
Replay
structured Logs
transaction/span names
span attributes
```

Setting:

```dart
sendDefaultPii = false
```

does not magically scrub data the application explicitly adds.

---

# URLs

Bad:

```text
https://api.example.com/search?
email=jane@example.com&
access_token=...
```

Preferred transaction/span description:

```text
GET /search
```

with only safe bounded metadata.

Normalize dynamic path segments.

---

# HTTP Headers

Explicitly strip/avoid:

```text
Authorization
Proxy-Authorization
Cookie
Set-Cookie
X-Api-Key
```

plus organization-specific secrets.

Do not depend only on backend Sentry data scrubbing.

Minimize data before it leaves the device.

---

# User Identifiers

Prefer:

```text
opaque internal user ID
```

when needed.

Do not use:

- email by default
- phone by default
- full name
- government identifier
- authentication token

Sentry can technically store these strings. Technical acceptance is not privacy approval.

---

# Privacy Hooks

Use:

```text
beforeSend
beforeBreadcrumb
beforeSendLog
beforeCaptureScreenshot
beforeCaptureViewHierarchy
```

as defense in depth.

Do not make those hooks responsible for fixing a telemetry architecture that knowingly generates secrets everywhere.

---

# Performance Rules — HIGH PRIORITY

## 1. Keep initialization lightweight

Why:

Initialization happens on application startup.

Do not add arbitrary I/O/network work to the Sentry options callback.

---

## 2. Do not initialize Sentry multiple times

Why:

Multiple init paths can create:

- duplicated integrations
- native lifecycle problems
- conflicting scopes
- unpredictable capture ownership

Have one authoritative startup path.

---

## 3. Do not blindly sample all traces

Why:

Each sampled trace can create:

- transaction/span objects
- attributes
- serialization
- network payload
- Sentry ingestion cost

Sampling is both runtime and backend budget control.

---

## 4. Do not instrument trivial methods

Bad:

```text
getUserName span
bool getter span
list.map span
Widget.build span
```

Why:

The cost and noise can exceed diagnostic value.

---

## 5. Keep transaction names normalized

Why:

High-cardinality transaction names create:

- backend cardinality
- poor aggregation
- inefficient queries
- increased cost/noise

---

## 6. Keep `beforeBreadcrumb` extremely cheap

Why:

It is synchronous and can run frequently.

---

## 7. Keep `beforeSend` cheap

Why:

Event processing is part of the capture pipeline.

Asynchronous support is not permission to perform heavy network or disk work.

---

## 8. Keep breadcrumb volume bounded

Current default:

```text
100
```

Why:

Breadcrumbs consume memory and event payload capacity.

---

## 9. Avoid giant contexts/extras

Why:

Large objects require:

- serialization
- memory
- network
- backend storage

and increase PII risk.

---

## 10. Do not repeatedly sync scope from rebuilds

Why:

Scope changes can involve:

- Dart allocation
- native synchronization
- FFI/JNI work
- race-prone global context

Update scope only on meaningful lifecycle/state changes.

---

## 11. Profile conservatively

Why:

Profiling performs CPU sampling and sends additional telemetry.

---

## 12. Replay conservatively

Why:

Replay performs recurring UI capture/encoding and transfers significantly more data than ordinary error events.

---

## 13. Use screenshot/view hierarchy selectively

Why:

They add render/tree traversal and payload work.

Use `beforeCapture...` hooks if only certain severe events need them.

---

## 14. Avoid large attachments

Why:

They increase:

- memory/disk reads
- upload time
- network/battery use

---

## 15. Do not flush after each event

Why:

It defeats batching/queuing and can turn telemetry into user-visible latency.

---

## 16. Do not create a custom retry queue

Why:

Sentry already has transport caching/backpressure on supported platforms.

---

## 17. Restrict HTTP failed-request capture

Why:

Capturing every expected client/server response can create event storms.

---

## 18. Limit structured Logs

Why:

Logs can become the highest-volume Sentry telemetry stream if every debug line is emitted.

---

## 19. Use sampling per feature

Independent budgets:

```text
errors
traces
profiles
Replay
Logs
```

Do not derive all from one global rate.

---

# Reliability Rules

1. Automatic unhandled capture and manual handled capture need one owner each.
2. Preserve real stack traces when manually reporting.
3. Never lose the original failure because Sentry reporting failed.
4. Do not wait for Sentry server acknowledgement before product recovery.
5. Keep release/symbol artifacts aligned.
6. Verify native crashes separately from Dart exceptions.
7. Verify offline replay/caching behavior on target devices.
8. Never assume a process that is instantly killed can flush arbitrary telemetry.
9. Do not close the SDK during normal app lifecycle.
10. Prevent duplicate reporting before relying on dedup.
11. Keep filters narrow enough not to hide regressions.
12. Treat telemetry rate limits as expected operational conditions, not reasons to retry in a tight loop.

---

# Application Architecture

## Small application

Direct Sentry calls are acceptable when:

- one initialization path exists
- only a few handled-error boundaries exist
- privacy configuration is centralized
- no complex provider abstraction is needed

Example:

```text
main.dart
  -> SentryFlutter.init

repository/service boundary
  -> Sentry.captureException

app auth service
  -> Sentry.configureScope
```

Do not create five observability layers for a tiny app.

---

# Medium / Large Application

A small structure may be useful:

```text
lib/
  observability/
    sentry_config.dart
    error_reporter.dart
    observability_context.dart
    performance_tracer.dart
```

Responsibilities:

## `sentry_config.dart`

- DSN
- environment
- release
- sampling
- privacy/filter policy

## `error_reporter.dart`

- handled unexpected failures
- domain error filtering
- test facade

## `observability_context.dart`

- authenticated user
- stable application context

## `performance_tracer.dart`

Only if manual performance instrumentation is sufficiently complex to justify it.

Do not wrap every Sentry API behind another abstraction without a requirement.

---

# State Management Integration

Remain framework-neutral.

## Bloc

Report unexpected errors at:

- use-case
- repository
- Bloc event handler

where expectedness is known.

Do not report from every `BlocBuilder`.

## Riverpod / Provider

Use:

- command/controller boundaries
- deliberate error listeners

not rebuilding consumers.

## Redux

Middleware can capture meaningful failed domain actions.

Do not report every Redux action.

## MVVM / Clean Architecture

Capture at the layer where:

- error meaning is known
- recovery choice is known
- enough diagnostic context exists

Avoid reporting the same exception again in every layer as it bubbles upward.

---

# Testing Strategy

Never test crash reporting by crashing production users.

Use:

- development
- QA
- staging
- internal release builds

---

# Verification Matrix

| Scenario | Debug | Release | Physical Device | Verification |
|---|---:|---:|---:|---|
| Handled Dart exception | Yes | Yes | Optional | One non-fatal event with stack |
| Unhandled Dart exception | Yes | Yes | Recommended | Automatic event exactly once |
| Flutter framework exception | Yes | Yes where framework emits it | Recommended | Automatic Flutter context |
| Spawned isolate exception | Yes | Yes | Recommended | Listener forwards exactly once |
| Android native crash | Optional | **Required** | **Required** | Native crash after restart, symbolicated |
| iOS native crash | Optional | **Required** | **Required** | Native crash, matching dSYM |
| macOS native crash | Optional | **Required** | Target machine | Native crash, symbolicated |
| Linux/Windows native crash | Optional | **Required** | Target architecture | sentry-native backend + symbols |
| Offline capture | Yes | Release-like | **Recommended** | Event delivered after reconnect |
| Dart obfuscation | No | **Required if used** | Recommended | Readable stack/title |
| R8/ProGuard | No | **Required if used** | Recommended | Native Android names resolved |
| Web source map | No | Production Web build | Browser | Minified stack resolves |
| Navigation transaction | Yes | Yes | Recommended | Normalized route, one transaction |
| Distributed trace | Yes | Yes | Recommended | Mobile trace joins backend |
| User login/logout | Yes | Yes | Optional | User set then cleared |
| PII redaction | Yes | Yes | Recommended | Secrets absent from event |
| Android ANR | Staging | Release-like | **Required** | ANR event, correct threshold |
| Apple app hang | Staging | Release-like | **Required** | Hang captured, no permission false positive |
| Profiling | Staging | Release-like | iOS/macOS | Sampled profile linked to trace |
| Replay | Staging | Release-like | Android/iOS | Masking + performance verified |
| Screenshot | Staging | Release-like | Recommended | Sensitive content masked |
| Release health | Staging | Release | Recommended | Correct release/session |

---

# Native Crash Testing

`SentryFlutter.nativeCrash()` is intentionally destructive.

Testing procedure:

```text
1. Use internal/staging release build
2. Confirm release/dist
3. Confirm symbol upload
4. Trigger native crash
5. Restart app if required
6. Verify fatal event
7. Verify stack is symbolicated
8. Verify release/environment
9. Verify crash-free session impact
```

Do not stop at "event exists."

A native event with unreadable frames is not production-ready.

---

# Offline Testing

Procedure:

```text
1. Disable network
2. Capture a test handled exception
3. Terminate/relaunch if relevant
4. Restore network
5. Verify event eventually appears
6. Confirm only one event
```

Do not assume Web has the same native offline cache semantics as Android/iOS/macOS.

---

# Debugging Guide

| Symptom | Likely Cause | How to Verify | Fix |
|---|---|---|---|
| No Dart events | SDK not initialized, DSN empty/wrong | Enable SDK debug logs, inspect DSN/env | Fix single initialization |
| Flutter errors missing | Custom handler replaced Sentry, release error removed by Flutter | Search `FlutterError.onError`, reproduce debug/release | Remove duplicate/replacing handler |
| Async errors missing | Custom `PlatformDispatcher.onError` replaced integration | Search global handler assignment | Let Sentry own handler or chain deliberately |
| Same error appears twice | Automatic + manual capture | Compare stacks/mechanisms/timestamps | Choose one capture owner |
| Spawned isolate error missing | No Sentry error listener | Inspect isolate creation | `isolate.addSentryErrorListener()` |
| Native Android crash missing | native SDK disabled/tooling issue | Check `enableNativeCrashHandling`, native logs | Restore native integration |
| Native Apple crash missing | Cocoa integration/build issue | Native SDK logs, release build | Fix native initialization |
| Linux/Windows native crash missing | sentry-native/toolchain/backend | Inspect native backend/build output | Fix current sentry-native setup |
| Crash present but unreadable | Missing debug artifacts | Check Debug Files page | Upload matching artifacts |
| Android native names obfuscated | Missing R8/ProGuard mapping | Check mapping/debug ID | Upload exact mapping |
| Dart stack obfuscated | Missing split-debug-info/symbol map | Inspect build command/artifacts | Upload matching Dart symbols |
| iOS frames unresolved | Missing/mismatched dSYM | Compare UUID | Upload correct dSYM |
| Web stack minified | Missing/incorrect source maps | Check Debug IDs/source maps | Generate/upload production maps |
| Wrong source displayed | Release/dist mismatch | Compare runtime event and upload | Align release pipeline |
| Production event says staging | Wrong environment config | Inspect event environment | Fix build-time environment |
| No transactions | Tracing disabled/sample decision | Inspect `tracesSampleRate`/sampler | Enable intentional tracing |
| Too many transactions | 100% sampling or duplicate observers | Inspect volume/route observer count | Tune sample + ownership |
| Transaction cardinality huge | IDs/query strings in names | Inspect transaction list | Normalize route names |
| Trace not connected to backend | headers not propagated/target excluded | Inspect outgoing headers | Fix trusted propagation targets |
| Trace headers sent to third party | targets too broad | Inspect request headers | Restrict targets |
| Profiles absent | wrong platform or trace not sampled | Check iOS/macOS + trace sampling | Enable supported profiling correctly |
| Replay absent | rates disabled or unsupported platform | Inspect replay options/target | Configure Android/iOS supported path |
| Replay expensive | high rate/quality | Profile CPU/network | Lower rate/quality |
| Replay exposes content | masking policy insufficient | Inspect staging replay | Add masks/remove feature |
| Android ANR absent | disabled/threshold/test invalid | Inspect options/device behavior | Restore ANR configuration |
| Too many ANRs | threshold too aggressive/real blocking | Inspect stacks/timing | Fix blocking; avoid tiny threshold |
| False Apple hang around permission | OS dialog blocks monitoring | Compare timeline | Pause/resume hang tracking around known dialog |
| Breadcrumbs duplicated | native + Flutter lifecycle sources | Inspect categories | Use platform sensible defaults |
| Breadcrumb list noisy | print/UI breadcrumbs excessive | Inspect event breadcrumb buffer | Filter/disable noisy categories |
| HTTP failure duplicated | client auto capture + manual catch | Compare event mechanisms | Pick one owner |
| Sentry slows action | awaited telemetry/expensive hook | profile application path | decouple telemetry |
| Event never sends offline | unsupported cache/eviction/process constraints | enable diagnostics | Validate platform storage/lifecycle |
| Events dropped in burst | queue/backpressure/rate limits | client reports/SDK diagnostics | reduce noise; don't retry tightly |
| User context persists after logout | scope not cleared | inspect subsequent events | `scope.setUser(null)` |
| Secrets appear in Sentry | unsafe metadata/bodies/logs | inspect raw event | remove at source + scrub hooks |
| `close()` causes later events to disappear | SDK explicitly disabled | search lifecycle calls | remove routine close |

---

# Common Anti-Patterns

## Anti-pattern: Manual global handlers around normal Sentry init

### Bad

```text
SentryFlutter.init
+
FlutterError.onError
+
PlatformDispatcher.onError
+
runZonedGuarded
```

### Why

Sentry already installs modern Flutter global handling. Duplicate handlers can duplicate events and change semantics.

### Preferred

One `SentryFlutter.init(..., appRunner: ...)`.

---

## Anti-pattern: Capture then rethrow into Sentry global handler

### Bad

```dart
try {
  await operation();
} catch (error, stackTrace) {
  await Sentry.captureException(
    error,
    stackTrace: stackTrace,
  );

  rethrow;
}
```

when the rethrow is guaranteed to become unhandled.

### Why

The same failure can be captured once manually and once globally.

### Preferred

If rethrow will remain unhandled, let automatic capture own it.

Manually capture only when the exception is handled/recovered or when ownership is otherwise controlled.

---

## Anti-pattern: Capture every caught exception

### Why

Many exceptions represent expected application control flow.

### Preferred

Capture unexpected/actionable failures.

---

## Anti-pattern: Expected validation errors

### Bad

```text
invalid email
 -> captureException
```

### Why

It creates issue noise without reliability value.

### Preferred

Handle normally; use analytics only if product measurement needs it.

---

## Anti-pattern: `tracesSampleRate = 1.0` copied into production

### Why

100% tracing multiplies:

- CPU work
- span memory
- serialized data
- bandwidth
- Sentry quota/cost

### Preferred

Choose a measured production sampling strategy.

---

## Anti-pattern: Profile every sampled trace

### Why

Profiling adds CPU sampling and payload cost.

### Preferred

Use an independently justified profile fraction.

---

## Anti-pattern: 100% Replay without evaluation

### Why

Replay is high-volume UI telemetry with privacy, CPU, and bandwidth implications.

### Preferred

Conservative session/error sampling and staging measurements.

---

## Anti-pattern: Raw dynamic transaction names

### Bad

```text
/product/982718
/search?q=private-string
```

### Why

Cardinality explosion.

### Preferred

```text
/product/:id
/search
```

---

## Anti-pattern: User ID in transaction name

### Why

Creates cardinality and privacy leakage.

### Preferred

Use safe user context only when justified.

---

## Anti-pattern: Span around every function

### Why

Trace tree becomes expensive and unreadable.

### Preferred

Instrument meaningful latency boundaries.

---

## Anti-pattern: Never finishing manual spans

### Why

Incomplete traces and misleading durations.

### Preferred

Always finish in `finally` or use span-stream callback APIs that auto-end.

---

## Anti-pattern: Mix static and stream trace lifecycles

### Why

Current SDK says only one tracing system can be used at a time.

### Preferred

Choose the lifecycle intentionally and use its APIs consistently.

---

## Anti-pattern: Propagate traces everywhere

### Why

Leaks trace metadata and may create CORS/security problems.

### Preferred

Restrict `tracePropagationTargets` to trusted services.

---

## Anti-pattern: `sendDefaultPii = true` without review

### Why

Expands data collection without proving debugging value.

### Preferred

Privacy-minimizing default, explicit opt-in.

---

## Anti-pattern: Auth tokens in Sentry context

### Bad

```text
Authorization header
access token
refresh token
```

### Why

Credential compromise.

### Preferred

Never transmit credentials.

---

## Anti-pattern: CI Sentry auth token in Flutter app

### Why

Build API tokens are privileged secrets.

### Preferred

CI secret store only.

---

## Anti-pattern: Attach raw API responses

### Why

High PII/secrets/payload risk.

### Preferred

Small sanitized diagnostic context.

---

## Anti-pattern: Entire model as context

### Bad

```text
scope.setContexts("user", user.toJson())
```

### Why

Uncontrolled schema and privacy exposure.

### Preferred

Select explicit bounded diagnostic fields.

---

## Anti-pattern: Sensitive input breadcrumbs

### Why

Breadcrumbs are attached to error events.

### Preferred

Record action semantics, not input contents.

---

## Anti-pattern: No production symbols

### Why

Production errors become unsymbolicated.

### Preferred

Make artifact upload a CI release gate.

---

## Anti-pattern: Symbols from wrong release

### Why

Symbol files are binary-specific.

### Preferred

Build and upload from the same CI job/artifact set.

---

## Anti-pattern: Mixing staging and production

### Why

Breaks alerting, issue priority, release health, and telemetry budgets.

### Preferred

Separate projects and/or strict environments.

---

## Anti-pattern: `close()` after each event

### Why

Flushes/disables lifecycle and defeats batching.

### Preferred

Leave SDK active.

---

## Anti-pattern: Block navigation on capture

### Why

Telemetry becomes user-facing latency.

### Preferred

Report safely while product recovery/navigation proceeds.

---

## Anti-pattern: Custom offline queue

### Why

Duplicates Sentry transport and adds privacy/storage problems.

### Preferred

Use SDK cache; persist critical business facts elsewhere.

---

## Anti-pattern: Multiple Sentry initialization paths

### Why

Duplicate integrations and inconsistent config.

### Preferred

One boot owner.

---

## Anti-pattern: Scope changes in `build()`

### Why

Repeated global/native sync and incorrect context lifetime.

### Preferred

Update context on actual state/lifecycle changes.

---

## Anti-pattern: Report the same UI error every rebuild

### Why

One defect becomes an event storm.

### Preferred

Fix event ownership and state transition semantics.

---

## Anti-pattern: Sentry errors as product analytics

### Why

Error monitoring is not funnel/product measurement.

### Preferred

Use an analytics system.

---

## Anti-pattern: Sentry spans as per-frame profiler

### Why

Spans are not designed for per-frame telemetry.

### Preferred

Use frame metrics and Flutter profiling tools.

---

## Anti-pattern: Enable all optional integrations

### Why

"More telemetry" is not automatically "better observability."

### Preferred

Enable each feature to answer a specific debugging/performance question.

---

## Anti-pattern: Sentry Metrics for new work

### Why

The Sentry Metrics product was retired.

### Preferred

Use supported current telemetry products.

---

# Implementation Checklist

## 1. Inspect the project

- [ ] Read `pubspec.yaml`.
- [ ] Read `pubspec.lock`.
- [ ] Identify installed `sentry_flutter`.
- [ ] Read its changelog.
- [ ] Identify target platforms.
- [ ] Search all Sentry initialization.
- [ ] Search all custom global error handlers.
- [ ] Search all `captureException`.
- [ ] Search navigation observers.
- [ ] Search tracing configuration.
- [ ] Search build/symbol tooling.

---

## 2. Define environment/release architecture

- [ ] Development/staging/production separated.
- [ ] Production DSN identified.
- [ ] DSN supplied as runtime client config.
- [ ] Build auth token CI-only.
- [ ] `environment` stable.
- [ ] `release` strategy stable.
- [ ] `dist` strategy defined if needed.

---

## 3. Initialize once

- [ ] `SentryFlutter.init`.
- [ ] `appRunner`.
- [ ] No redundant `runZonedGuarded`.
- [ ] No replacing `FlutterError.onError`.
- [ ] No replacing `PlatformDispatcher.onError`.
- [ ] Options callback lightweight.

---

## 4. Configure privacy

- [ ] `sendDefaultPii` intentionally chosen.
- [ ] User ID policy.
- [ ] HTTP URL policy.
- [ ] Header scrubbing.
- [ ] Body capture policy.
- [ ] Breadcrumb policy.
- [ ] Screenshot policy.
- [ ] Replay policy.
- [ ] Attachment policy.
- [ ] Log policy.

---

## 5. Define error ownership

- [ ] Automatic unhandled errors not manually duplicated.
- [ ] Expected domain failures excluded.
- [ ] Handled unexpected failures captured once.
- [ ] HTTP error ownership clear.
- [ ] Logger/error-reporter ownership clear.
- [ ] Isolate error ownership clear.

---

## 6. Configure context

- [ ] Stable bounded tags.
- [ ] Structured contexts.
- [ ] Opaque user ID if justified.
- [ ] Logout clears user.
- [ ] Account switching tested.
- [ ] No context mutation in `build()`.

---

## 7. Breadcrumb strategy

- [ ] Useful navigation breadcrumbs.
- [ ] Useful domain breadcrumbs.
- [ ] No duplicate native/Flutter lifecycle breadcrumbs.
- [ ] No print flood.
- [ ] Sensitive values removed.
- [ ] `beforeBreadcrumb` lightweight.

---

## 8. Navigation

- [ ] Add one logical `SentryNavigatorObserver` path.
- [ ] Stable route names.
- [ ] Dynamic IDs normalized.
- [ ] Nested navigators audited.
- [ ] Third-party router support verified.
- [ ] No duplicate manual route transactions.

---

## 9. Performance tracing

- [ ] Define tracing objective.
- [ ] Set production sampling intentionally.
- [ ] Decide static vs stream lifecycle.
- [ ] Do not mix trace APIs.
- [ ] Normalize transaction names.
- [ ] Instrument only meaningful spans.
- [ ] Ensure manual spans finish.

---

## 10. Distributed tracing

- [ ] Owned backend uses compatible Sentry tracing.
- [ ] `tracePropagationTargets` restricted.
- [ ] Third-party targets excluded.
- [ ] W3C traceparent enabled only if needed.
- [ ] Cross-org trace continuation policy reviewed.

---

## 11. HTTP

- [ ] Use supported `SentryHttpClient` or `sentry_dio`.
- [ ] Failed-request policy defined.
- [ ] HTTP duplicate capture audited.
- [ ] Request/response privacy reviewed.

---

## 12. Optional performance capabilities

- [ ] Profiling only iOS/macOS.
- [ ] Profile sampling measured.
- [ ] Standalone app start considered experimental.
- [ ] Android ANR behavior verified.
- [ ] Apple app hang behavior verified.
- [ ] Slow/frozen frames interpreted only where supported.

---

## 13. Replay / screenshots

- [ ] Replay platform supported.
- [ ] Sampling rates defined.
- [ ] Quality selected intentionally.
- [ ] Masking tested.
- [ ] Screenshots privacy-reviewed.
- [ ] Platform View limitations understood.
- [ ] View hierarchy justified.

---

## 14. Symbols

- [ ] Dart plugin/build tooling current.
- [ ] Android R8/ProGuard mapping.
- [ ] Flutter split-debug-info.
- [ ] Dart obfuscation map where supported.
- [ ] Apple dSYM.
- [ ] Native debug symbols.
- [ ] Web source maps.
- [ ] Same release/dist as runtime.

---

## 15. Release validation

- [ ] Handled Dart exception.
- [ ] Unhandled Dart exception.
- [ ] Flutter framework exception.
- [ ] Native crash.
- [ ] Obfuscated crash.
- [ ] Offline capture.
- [ ] Navigation trace.
- [ ] Distributed trace.
- [ ] User clearing.
- [ ] PII inspection.
- [ ] Optional ANR/hang/Replay/profile tests.

---

# Code Review Checklist

## Initialization

- [ ] One `SentryFlutter.init`?
- [ ] Uses `appRunner`?
- [ ] No redundant global handlers?
- [ ] No multiple Sentry native initialization?
- [ ] Options callback lightweight?

## Error capture

- [ ] Expected errors filtered?
- [ ] Caught actionable errors captured?
- [ ] No automatic + manual duplicates?
- [ ] Original stack trace preserved?
- [ ] Fatal/non-fatal semantics sensible?

## Noise

- [ ] Exception filters narrow?
- [ ] `beforeSend` cheap?
- [ ] `beforeBreadcrumb` synchronous/cheap?
- [ ] Dedup architecture understood?
- [ ] No giant event processor chain?
- [ ] Error sample rate not hiding rare failures?

## Context

- [ ] Opaque user ID?
- [ ] Logout clears user?
- [ ] No stale event-specific scope?
- [ ] Tags bounded?
- [ ] Contexts intentional?
- [ ] No serialized domain models?

## Breadcrumbs

- [ ] High-signal?
- [ ] No duplicate lifecycle crumbs?
- [ ] No secrets?
- [ ] No print/event storms?

## Navigation

- [ ] Observer installed?
- [ ] One logical observer owner?
- [ ] Route names normalized?
- [ ] Nested router audited?
- [ ] No duplicate transactions?

## Tracing

- [ ] Tracing intentionally enabled?
- [ ] Production rate justified?
- [ ] `tracesSampler` policy centralized?
- [ ] Static/stream lifecycle not mixed?
- [ ] Transaction names low-cardinality?
- [ ] Manual spans meaningful?
- [ ] Spans always finish?

## Distributed traces

- [ ] Trace targets trusted?
- [ ] Headers not sent to arbitrary vendors?
- [ ] Cross-org continuation considered?

## HTTP

- [ ] Official integration used where appropriate?
- [ ] Failed-request capture not duplicated?
- [ ] Sensitive headers/bodies excluded?

## Profiling

- [ ] Only supported platform?
- [ ] Tracing enabled?
- [ ] Profile rate conservative?
- [ ] Physical-device overhead tested?

## App start

- [ ] Built-in instrumentation used first?
- [ ] Standalone app start understood as experimental?
- [ ] Any extension always finished?
- [ ] Startup spans do not include irrelevant work?

## ANR/hangs

- [ ] Android ANR not arbitrarily disabled?
- [ ] ANR threshold sensible?
- [ ] Apple hang threshold sensible?
- [ ] Permission/system-dialog false positives considered?

## Replay/screens

- [ ] Supported platform?
- [ ] Sample rate justified?
- [ ] Quality justified?
- [ ] Masking tested?
- [ ] Screenshot/view-hierarchy privacy reviewed?

## Symbols/releases

- [ ] Runtime release known?
- [ ] Artifact release identical?
- [ ] Android mapping uploaded?
- [ ] Dart symbols uploaded?
- [ ] dSYM uploaded?
- [ ] Web maps uploaded?
- [ ] CI auth token secret?
- [ ] Test crash symbolicated?

## Offline/lifecycle

- [ ] No custom duplicate queue?
- [ ] No `close()` in ordinary lifecycle?
- [ ] Burst volume below backpressure limits?

## Isolates

- [ ] Spawned isolates add Sentry listener?
- [ ] No duplicate forwarding?
- [ ] Background isolate assumptions verified?

## Deprecated/obsolete guidance

- [ ] No unnecessary legacy `runZonedGuarded` pattern?
- [ ] No old manual Flutter global-handler boilerplate?
- [ ] No new Sentry Metrics architecture?
- [ ] No obsolete symbol-upload workflow?
- [ ] No v10 prerelease API accidentally used in stable app?

---

# Production Readiness Checklist

- [ ] Correct production DSN.
- [ ] Correct `environment`.
- [ ] Correct `release`.
- [ ] Correct `dist` where used.
- [ ] CI auth token not in application.
- [ ] One initialization path.
- [ ] Automatic handlers intact.
- [ ] Expected errors filtered.
- [ ] User context privacy-approved.
- [ ] User cleared on logout.
- [ ] PII audit complete.
- [ ] Transaction names normalized.
- [ ] Trace sample strategy documented.
- [ ] Profile sampling documented.
- [ ] Replay sampling documented.
- [ ] HTTP propagation targets restricted.
- [ ] Breadcrumb volume sane.
- [ ] Screenshot/Replay masking verified.
- [ ] No huge attachments.
- [ ] No business flow waits on Sentry transport.
- [ ] Offline behavior tested.
- [ ] Native crash tested.
- [ ] Android mapping tested.
- [ ] Apple dSYM tested.
- [ ] Dart obfuscation symbols tested.
- [ ] Web source maps tested.
- [ ] All test crashes symbolicate correctly.
- [ ] Android ANR behavior sanity-checked.
- [ ] Apple app-hang behavior sanity-checked.
- [ ] Alert thresholds/noise reviewed after initial production traffic.
- [ ] Sentry quotas/cost reviewed after enabling traces/Replay/logs.

---

# Version-Sensitive Areas

Always revalidate these.

## 1. Sentry Flutter major version

At validation:

```text
stable:     9.26.0
prerelease: 10.0.0-alpha.3
```

Do not use v10 examples in a stable v9 app.

---

## 2. Global error handling

Current Flutter 3.3+ path uses `PlatformDispatcher.onError`.

If Flutter/Sentry changes its global-handler integration, duplicate-handler recommendations may change.

---

## 3. Trace lifecycle

Current 9.x supports:

```text
static/classic transactions
streaming spans
```

Only one lifecycle at a time.

This is especially likely to evolve around v10.

---

## 4. Standalone app start

`enableStandaloneAppStartTracing` is experimental in 9.26.

Revalidate:

- API
- platform support
- sampling semantics
- extension API

before enabling after an upgrade.

---

## 5. Profiling

Current Flutter option explicitly supports:

```text
iOS
macOS
```

Revalidate platform expansion/removal.

---

## 6. Replay

Replay APIs/platform support have evolved rapidly.

Revalidate:

- supported targets
- masking
- quality levels
- sampling
- widget integration

on every meaningful upgrade.

---

## 7. Native desktop crashes

Linux/Windows native backend selection has changed historically because of compiler/toolchain constraints.

Revalidate `sentry-native` backend support for the deployed architecture.

---

## 8. Android build tooling

Sentry Android SDK updates can change requirements for:

- Android Gradle Plugin
- Kotlin
- min SDK
- NDK
- native libraries
- ProGuard/R8

Read the current Sentry Flutter changelog before upgrading.

---

## 9. Apple SDK

Revalidate:

- deployment target
- Xcode
- Cocoa SDK
- SwiftPM/CocoaPods integration
- dSYM upload

---

## 10. Dart symbolication

Revalidate:

- `--split-debug-info`
- Dart obfuscation map
- `sentry_dart_plugin`
- platform support

The current plugin's Dart symbol mapping file support is not equal across all desktop platforms.

---

## 11. Flutter Web source maps

Current Dart plugin 3.x uses Debug IDs.

Do not carry legacy Web symbolication configuration indefinitely.

---

## 12. Session/release health

Automatic session platform support can differ from general crash support.

Recheck exact option documentation.

---

## 13. Frame metrics

Historically disabled on Web/Linux/Windows because refresh data was unreliable.

Revalidate if Flutter engine support improves.

---

## 14. Structured Logs

Logs are a comparatively new Sentry telemetry surface.

Revalidate:

- stability
- API names
- quotas
- integrations

---

## 15. Sentry Metrics

The old Sentry Metrics product is retired.

Do not resurrect it because current Dart classes still expose legacy API symbols.

---

# Official References

Current package:

- https://pub.dev/packages/sentry_flutter
- https://pub.dev/packages/sentry_flutter/changelog
- https://pub.dev/documentation/sentry_flutter/latest/
- https://pub.dev/documentation/sentry_flutter/latest/sentry_flutter/SentryFlutterOptions-class.html
- https://pub.dev/documentation/sentry_flutter/latest/sentry_flutter/SentryFlutter-mixin.html
- https://pub.dev/documentation/sentry_flutter/latest/sentry_flutter/SentryNavigatorObserver-class.html
- https://pub.dev/documentation/sentry_flutter/latest/sentry_flutter/SentryReplayOptions-class.html

Underlying Dart SDK:

- https://pub.dev/documentation/sentry/latest/
- https://pub.dev/documentation/sentry/latest/sentry/Sentry-class.html
- https://pub.dev/documentation/sentry/latest/sentry/SentryOptions-class.html
- https://pub.dev/documentation/sentry/latest/sentry/SentryHttpClient-class.html
- https://pub.dev/documentation/sentry/latest/sentry/Transport-class.html

Official repository:

- https://github.com/getsentry/sentry-dart
- https://github.com/getsentry/sentry-dart/releases

Sentry Flutter documentation:

- https://docs.sentry.io/platforms/dart/guides/flutter/

Build/debug-symbol plugin:

- https://pub.dev/packages/sentry_dart_plugin
- https://pub.dev/packages/sentry_dart_plugin/changelog
- https://github.com/getsentry/sentry-dart-plugin

Sentry API / CI authentication:

- https://docs.sentry.io/api/auth/
- https://docs.sentry.io/api/permissions/

Flutter:

- https://api.flutter.dev/flutter/dart-ui/PlatformDispatcher/onError.html
- https://api.flutter.dev/flutter/foundation/FlutterError/onError.html
- https://docs.flutter.dev/testing/build-modes
- https://docs.flutter.dev/deployment/obfuscate

Android:

- https://developer.android.com/topic/performance/vitals/anr

Apple:

- https://developer.apple.com/documentation/xcode/diagnosing-issues-using-crash-reports-and-device-logs

Sentry Metrics retirement notice:

- https://docs.sentry.io/platforms/dart/guides/flutter/metrics/

---

# Final Decision Framework for AI Agents

When asked to "add Sentry," do not immediately enable every Sentry product.

Start with:

```text
1. early correct initialization
2. Dart + Flutter automatic crash capture
3. native crash capture
4. release/environment correctness
5. symbol upload
6. privacy-safe user/context
7. noise filtering
```

Then add only the observability features the product needs:

```text
Need performance breakdown?
  -> tracing

Need cross-service latency?
  -> distributed tracing

Need CPU profile on Apple?
  -> profiling

Need visual reproduction?
  -> Replay and/or screenshots

Need route performance?
  -> navigator instrumentation

Need startup performance?
  -> current built-in app-start instrumentation

Need Android responsiveness?
  -> ANR

Need Apple responsiveness?
  -> app hangs

Need high-volume structured operational messages?
  -> evaluate Sentry Logs
```

For every optional feature ask:

```text
What debugging question does this answer?
What platforms actually support it?
What runtime cost does it add?
What payload/network cost does it add?
What Sentry quota/cost does it add?
What sensitive data might it expose?
How will we validate that it works?
```

The preferred production configuration is not "maximum telemetry."

It is:

```text
early crash visibility
+ symbolicated stacks
+ correct release metadata
+ actionable context
+ deliberate sampling
+ stable low-cardinality tracing
+ privacy minimization
+ minimal duplicate/noise events
+ platform-specific validation
```

That is the observability configuration an AI coding agent should optimize for.