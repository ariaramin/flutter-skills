# Tracker Foundations, Setup, and Leak Semantics

> Preserved from the supplied research/engineering guide. Use this reference only when the active task needs these details.

## Contents

- Flutter Memory Leak Engineering with leak_tracker
  - Purpose
    - Evidence terminology
  - When to Use This Skill
- What leak_tracker Can and Cannot Detect
  - What it can detect
  - What it cannot prove
  - Memory growth is not automatically a leak_tracker leak
- Core Principles
- Mental Model
  - Failure point 1: cleanup never happens
  - Failure point 2: disposed but retained
  - Failure point 3: temporary retention
- Leak Categories
  - `notDisposed`
  - `notGCed`
  - `gcedLate`
- Package Ecosystem
  - DevTools relationship
- Setup
- Flutter Test Integration
- Global Leak Tracking
  - Important performance note
  - Do not mutate global leak settings in ordinary `setUp`
- Per-Test Configuration
  - Default suite configuration
  - Creation stack for a focused investigation
  - Focused retention investigation
- Instrumentation
  - Flutter framework instrumentation
  - Pure Dart/manual core instrumentation
  - Flutter application custom instrumentation
- Custom Object Tracking
- ChangeNotifier Instrumentation
- Disposal Tracking
  - Disposal is an application contract
- Garbage Collection
  - Current leak-tracker GC verification
  - Do not write tests around an exact instant
  - LeakTrackingConfig
- Leak Settings
  - Ignore configuration
  - Tracking configuration
  - Diagnostic configuration
- Ignoring Known Objects
  - Valid reason
  - Invalid reason
  - Process before ignoring
  - Temporary whole-test opt-out

---

# Flutter Memory Leak Engineering with leak_tracker

## Purpose

Use this skill to design, implement, review, debug, test, and regress-test memory lifecycle behavior in production Flutter/Dart repositories with `leak_tracker` and its Flutter testing integrations.

Apply these instructions to:

- detect objects that were not disposed correctly;
- detect disposed objects that remain reachable longer than expected;
- distinguish disposal bugs from retention bugs;
- identify ownership mistakes before adding cleanup code;
- test route, widget, state-management, and dependency-injection lifetimes;
- diagnose controllers, listeners, subscriptions, timers, callbacks, overlays, caches, and scoped resources;
- minimize leak-test false positives;
- preserve reliable leak checks in CI;
- escalate unresolved memory growth to Flutter DevTools;
- understand what automated lifecycle tracking can and cannot prove.

Current first-party package baseline is `leak_tracker` 11.0.2. The current ecosystem separates core tracking from test helpers: `leak_tracker_testing` contains test-specific APIs, while `leak_tracker_flutter_testing` bridges Flutter's memory-allocation instrumentation into leak-aware Flutter tests. Direct DevTools integration that existed in older `leak_tracker` releases was removed in 11.0.0; use current Flutter DevTools Memory tooling as a complementary diagnostic system rather than relying on old tutorials describing a built-in leak-tracker DevTools integration.

### Evidence terminology

Interpret this skill using these labels:

- **leak_tracker behavior** — behavior documented or implemented by the current package.
- **Flutter instrumentation behavior** — lifecycle events exposed by Flutter's `FlutterMemoryAllocations`.
- **Dart GC behavior** — reachability and garbage-collection behavior of the Dart runtime.
- **Official recommendation** — guidance stated by first-party leak-tracker or Flutter documentation.
- **Architecture recommendation** — production guidance inferred from documented behavior.
- **General lifecycle practice** — memory-management guidance that applies independently of leak_tracker.

Do not present a heuristic leak classification as proof of an exact retaining cause.

---

## When to Use This Skill

Apply this skill when:

- creating a `TextEditingController`;
- creating a `FocusNode`;
- creating an `AnimationController`;
- creating a `ScrollController`;
- creating a `ChangeNotifier` or `ValueNotifier`;
- manually creating Bloc/Cubit or another closeable state object;
- subscribing to a stream;
- starting a timer;
- registering a listener or callback;
- opening a socket or watcher;
- creating route-scoped or session-scoped resources;
- reviewing GetIt/injectable lifetimes;
- diagnosing widgets retained after navigation;
- diagnosing session objects retained after logout;
- adding leak-aware widget tests;
- investigating recurring memory growth;
- designing CI memory regression tests;
- reviewing global/static caches;
- investigating a `leak_tracker` failure;
- determining whether an ignore is justified;
- using Flutter DevTools after automated leak detection identifies suspicious retention.

Do not add leak tracking merely to satisfy a checklist. Use it where ownership and lifecycle correctness matter.

---

# What leak_tracker Can and Cannot Detect

## What it can detect

`leak_tracker` is lifecycle-oriented. It tracks instrumented objects from creation through disposal and, when enabled, garbage collection.

Current official leak categories include:

- `notDisposed`;
- `notGCed`;
- `gcedLate`.

This lets the tooling detect different failures in the expected lifecycle of disposable objects.

It is particularly useful for finding:

- disposable Flutter framework objects that were never disposed;
- custom instrumented objects whose disposal contract was violated;
- disposed objects still retained by strong references;
- objects collected only after more GC cycles than expected;
- widget/route lifecycle regressions;
- test cleanup problems.

Flutter's framework already emits lifecycle instrumentation for many disposable framework objects when memory-allocation tracking is enabled.

## What it cannot prove

A passing leak test does **not** prove the application has no memory problems.

Leak tracking can miss:

- uninstrumented custom classes;
- an unbounded `Map` that is intentionally reachable;
- an image/data cache that grows forever;
- native memory retained by a plugin;
- GPU allocations;
- platform-view leaks;
- an operating-system resource whose Dart wrapper is not instrumented;
- large allocation churn with no retained disposable objects;
- memory bloat that is reachable by design;
- every possible closure-retention problem;
- every semantic resource leak.

Current first-party documentation explicitly limits detection to instrumented objects and describes not-garbage-collected detection as experimental. Flutter test support is the primary mature use case; running-app, web, and some non-test scenarios remain more experimental/version-sensitive.

## Memory growth is not automatically a leak_tracker leak

This:

```text
RSS:
200 MB → 350 MB → 450 MB
```

does not by itself establish:

```text
A tracked object violated its lifecycle.
```

Possible causes include:

- image caches;
- large reachable collections;
- native allocations;
- compiler/runtime behavior;
- memory fragmentation;
- temporary allocations;
- intentional caches.

Use DevTools heap analysis and memory profiling when object-lifecycle tests do not explain growth.

---

# Core Principles

1. **Determine ownership before writing cleanup code.**
2. **Every disposable resource needs one clear owner.**
3. **The creator is usually the owner unless ownership transfer is explicitly documented.**
4. **Dispose, close, cancel, or remove resources at the owner's lifecycle boundary.**
5. **Disposal and garbage collection are different events.**
6. **A disposed object can still leak through strong references.**
7. **An object can be garbage-collected without having been disposed correctly.**
8. **Long-lived objects should not unintentionally retain shorter-lived objects.**
9. **Treat singleton → widget/route/session references as suspicious.**
10. **Do not store `BuildContext` in long-lived services.**
11. **Do not use `mounted` as a substitute for canceling owned resources.**
12. **Remove listeners that you added.**
13. **Cancel subscriptions and timers that you own.**
14. **Dispose replaced resources, not only the final resource in `dispose()`.**
15. **Clean error and early-return paths as carefully as success paths.**
16. **Investigate a leak before ignoring it.**
17. **Use narrowly targeted ignores with documented rationale.**
18. **Do not enable expensive stack/retaining-path diagnostics globally without need.**
19. **Keep ordinary CI leak detection lightweight and deterministic.**
20. **Use not-disposed tracking as the default high-signal check.**
21. **Enable experimental retention checks selectively when investigating suspected retention.**
22. **Release the owner before expecting collection in a test.**
23. **Do not depend on an exact GC instant.**
24. **Keep fixed lifecycle bugs as regression tests.**
25. **Escalate to heap/retaining-path tooling when the reference chain is unclear.**

First-party troubleshooting guidance emphasizes clear ownership: normally the object that creates a disposable object owns its disposal unless ownership transfer is explicitly defined. It also recommends releasing references when an owned object is disposed before the owner itself ends.

---

# Mental Model

Use this lifecycle:

```text
Object created
      ↓
Creation instrumented
      ↓
Owner holds object
      ↓
Object used
      ↓
Owner lifecycle ends
      ↓
Required cleanup?
├── yes → dispose / close / cancel / remove
└── no
      ↓
Disposal instrumented where applicable
      ↓
All unnecessary strong references released
      ↓
Object becomes unreachable
      ↓
Garbage collector reclaims object
```

## Failure point 1: cleanup never happens

```text
Create
↓
Use
↓
Owner ends
↓
Object becomes unreachable
↓
GC
```

but the required `dispose()`/`close()`/`cancel()` never ran.

This is a disposal-contract bug.

## Failure point 2: disposed but retained

```text
dispose()
↓
singleton/static/listener/closure still references object
↓
object remains reachable
```

This is a retention bug.

## Failure point 3: temporary retention

```text
dispose()
↓
animation / async callback / framework/test state
↓
object remains reachable for longer than expected
↓
eventually collected
```

This may become a `gcedLate` report.

Do not assume the same fix applies to all three.

---

# Leak Categories

## `notDisposed`

Conceptually:

```text
Object required disposal
↓
Object lifecycle ended
↓
Required disposal was not observed
```

Typical causes:

- missing `dispose()`;
- missing `cancel()`;
- owner forgot cleanup;
- error/early-return path skipped cleanup;
- object created in a test without teardown.

Likely fix:

1. identify creator;
2. identify owner;
3. identify the actual lifecycle boundary;
4. invoke cleanup there.

Do **not** blindly add disposal to a random caller.

## `notGCed`

Conceptually:

```text
Object was disposed
↓
Object should no longer be needed
↓
Strong references still retain it
```

This category is currently experimental in the Flutter test integration and is not tracked by default.

Common causes:

- static/global references;
- singleton holding route-scoped state;
- listener not removed;
- long-lived callback captures owner;
- cache holds disposed object;
- DI scope not released;
- test/framework state still owns the object.

Likely fix:

- inspect retaining references;
- remove the closest unnecessary long-lived reference.

## `gcedLate`

Conceptually:

```text
Disposed
↓
retained longer than expected
↓
eventually garbage-collected
```

Possible explanations:

- async operation finishes later;
- transition still active;
- delayed test cleanup;
- temporary framework reference;
- callback/event queue retention;
- genuine unnecessarily long lifetime.

Treat it as a signal to investigate timing and ownership, not automatic proof of permanent retention.

---

# Package Ecosystem

| Package/system | Responsibility |
|---|---|
| `leak_tracker` | Core lifecycle instrumentation, tracking, classification, leak collection |
| `leak_tracker_testing` | Test-only leak-testing configuration and utilities |
| `leak_tracker_flutter_testing` | Flutter test integration; bridges Flutter memory-allocation events into leak tests |
| Flutter `FlutterMemoryAllocations` | Emits lifecycle events for instrumented Flutter objects |
| Flutter DevTools Memory | Heap/profile/diff/allocation/retaining-reference investigation |
| `memory_usage` | Separate experimental memory-footprint/baselining tooling |

`leak_tracker_testing` was split from the core package so test-oriented functionality does not have to remain in production code. `leak_tracker_flutter_testing` is the Flutter-specific test layer.

## DevTools relationship

Do not document an old integrated leak-tracker DevTools panel as current functionality.

Current model:

```text
leak_tracker test
↓
detect suspicious lifecycle object
↓
creation/disposal diagnostics
↓
if reference chain remains unclear
↓
Flutter DevTools Memory
↓
heap snapshot / diff / retaining references / allocations
```

Direct DevTools integration was removed from `leak_tracker` 11.0.0.

---

# Setup

For Flutter widget tests, use the Flutter-specific integration as a development dependency.

```yaml
dev_dependencies:
  flutter_test:
    sdk: flutter
  leak_tracker_flutter_testing: any
```

The first-party setup guidance intentionally uses `any` for `leak_tracker_flutter_testing` because Flutter itself coordinates a compatible version for the SDK. Preserve the repository's dependency policy if it pins through another mechanism.

Do not add `leak_tracker` as a runtime production dependency solely to enable ordinary Flutter widget leak testing.

---

# Flutter Test Integration

Current Flutter `testWidgets` exposes an experimental leak-testing parameter:

```dart
experimentalLeakTesting:
```

If supplied, it controls leak testing for that test. Otherwise global `LeakTesting.settings` apply. Flutter still labels this integration experimental/version-sensitive, so verify SDK documentation during Flutter upgrades.

Example:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:leak_tracker_flutter_testing/leak_tracker_flutter_testing.dart';

void main() {
  testWidgets(
    'editor releases widget-owned resources',
    (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: EditorPage(),
        ),
      );

      expect(
        find.byType(EditorPage),
        findsOneWidget,
      );

      await tester.pumpWidget(
        const MaterialApp(
          home: SizedBox.shrink(),
        ),
      );

      await tester.pumpAndSettle();

      expect(
        find.byType(EditorPage),
        findsNothing,
      );
    },
    experimentalLeakTesting:
        LeakTesting.settings,
  );
}

final class EditorPage extends StatefulWidget {
  const EditorPage({super.key});

  @override
  State<EditorPage> createState() {
    return _EditorPageState();
  }
}

final class _EditorPageState extends State<EditorPage>
    with SingleTickerProviderStateMixin {
  late final TextEditingController _textController;
  late final FocusNode _focusNode;
  late final ScrollController _scrollController;
  late final AnimationController _animationController;

  @override
  void initState() {
    super.initState();

    _textController = TextEditingController();
    _focusNode = FocusNode();
    _scrollController = ScrollController();
    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    _textController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ListView(
        controller: _scrollController,
        padding: const EdgeInsets.all(16),
        children: <Widget>[
          TextField(
            controller: _textController,
            focusNode: _focusNode,
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () {
              _animationController.forward(
                from: 0,
              );
            },
            child: const Text('Animate'),
          ),
        ],
      ),
    );
  }
}
```

The important test property is not the exact empty widget. The important property is:

> The owner must actually leave its lifecycle before the leak check expects its resources to have been cleaned up.

---

# Global Leak Tracking

Use `test/flutter_test_config.dart` to enable leak checking for the test suite.

```dart
import 'dart:async';

import 'package:leak_tracker_flutter_testing/leak_tracker_flutter_testing.dart';

Future<void> testExecutable(
  FutureOr<void> Function() testMain,
) async {
  LeakTesting.enable();

  LeakTesting.settings =
      LeakTesting.settings.withIgnored(
    createdByTestHelpers: true,
  );

  await testMain();
}
```

This is the current first-party setup pattern. The `createdByTestHelpers` option filters objects determined to have been created by test infrastructure/helpers rather than application code.

## Important performance note

`createdByTestHelpers: true` requires creation-stack information to distinguish helper-created objects, which adds overhead. Keep it because it improves signal quality where needed, but do not assume every diagnostic option is free.

## Do not mutate global leak settings in ordinary `setUp`

Global configuration belongs at test bootstrap or the test file's `main` according to current Flutter guidance.

Per-test differences should use the test's `experimentalLeakTesting` argument.

---

# Per-Test Configuration

## Default suite configuration

```dart
testWidgets(
  'screen does not leak',
  (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: SizedBox.shrink(),
      ),
    );
  },
  experimentalLeakTesting:
      LeakTesting.settings,
);
```

## Creation stack for a focused investigation

```dart
testWidgets(
  'diagnoses controller creation',
  (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: EditorPage(),
      ),
    );

    await tester.pumpWidget(
      const MaterialApp(
        home: SizedBox.shrink(),
      ),
    );

    await tester.pumpAndSettle();
  },
  experimentalLeakTesting:
      LeakTesting.settings
          .withCreationStackTrace(),
);
```

## Focused retention investigation

Current settings provide APIs including:

- `withCreationStackTrace()`;
- `withDisposalStackTrace()`;
- `withRetainingPath()`;
- `withTracked(...)`;
- `withIgnored(...)`;
- `withIgnoredAll()`.

Example:

```dart
testWidgets(
  'session controller is released',
  (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: SessionPage(),
      ),
    );

    await tester.pumpWidget(
      const MaterialApp(
        home: SizedBox.shrink(),
      ),
    );

    await tester.pumpAndSettle();
  },
  experimentalLeakTesting:
      LeakTesting.settings
          .withTracked(
            experimentalNotGCed:
                <String>[
              'SessionController',
            ],
          )
          .withCreationStackTrace()
          .withDisposalStackTrace()
          .withRetainingPath(),
);
```

Use experimental not-GCed tracking on focused tests rather than enabling expensive retention diagnostics across the whole suite.

---

# Instrumentation

Leak tracking can only observe lifecycle events that are instrumented.

## Flutter framework instrumentation

Flutter exposes `FlutterMemoryAllocations`, and many disposable framework objects dispatch creation/disposal events when memory allocation instrumentation is enabled. In current Flutter:

- allocation instrumentation is enabled by default in debug;
- disabled by default in profile/release;
- it can be influenced by `flutter.memory_allocations` build configuration.

Examples of framework objects with lifecycle instrumentation include common controllers/notifiers.

## Pure Dart/manual core instrumentation

The core package exposes APIs such as:

- `LeakTracking.dispatchObjectCreated`;
- `LeakTracking.dispatchObjectDisposed`;
- `LeakTracking.dispatchObjectEvent`;
- `LeakTracking.collectLeaks`;
- `LeakTracking.tracked`.

Use direct core instrumentation when writing pure-Dart tracking integration.

## Flutter application custom instrumentation

For a custom Flutter class, prefer Flutter's allocation event mechanism so Flutter test integration can observe it.

---

# Custom Object Tracking

Example of a custom disposable resource instrumented through Flutter:

```dart
import 'dart:async';

import 'package:flutter/foundation.dart';

final class SessionHeartbeat {
  SessionHeartbeat({
    required this.onTick,
    this.interval = const Duration(seconds: 30),
  }) {
    if (kFlutterMemoryAllocationsEnabled) {
      FlutterMemoryAllocations.instance.dispatchObjectCreated(
        library:
            'package:my_app/session/session_heartbeat.dart',
        className: 'SessionHeartbeat',
        object: this,
      );
    }

    _timer = Timer.periodic(
      interval,
      (_) {
        onTick();
      },
    );
  }

  final VoidCallback onTick;
  final Duration interval;

  Timer? _timer;
  bool _disposed = false;

  bool get isDisposed => _disposed;

  void dispose() {
    if (_disposed) {
      return;
    }

    _disposed = true;
    _timer?.cancel();
    _timer = null;

    if (kFlutterMemoryAllocationsEnabled) {
      FlutterMemoryAllocations.instance.dispatchObjectDisposed(
        object: this,
      );
    }
  }
}
```

Do not instrument only creation and forget disposal instrumentation.

Do not dispatch disposal before cleanup has actually happened.

---

# ChangeNotifier Instrumentation

`ChangeNotifier` has special creation-stack behavior because it is commonly mixed in and creation can otherwise first become visible when listeners are added.

For custom `ChangeNotifier` classes where precise creation diagnostics matter, use the current framework helper:

```dart
import 'package:flutter/foundation.dart';

final class SearchController extends ChangeNotifier {
  SearchController() {
    if (kFlutterMemoryAllocationsEnabled) {
      ChangeNotifier.maybeDispatchObjectCreation(
        this,
      );
    }
  }

  String _query = '';

  String get query => _query;

  void updateQuery(String value) {
    if (_query == value) {
      return;
    }

    _query = value;
    notifyListeners();
  }
}
```

`ChangeNotifier.maybeDispatchObjectCreation` exists specifically to dispatch creation instrumentation when enabled.

---

# Disposal Tracking

Instrumentation does not mean leak_tracker magically calls cleanup.

The application still owns:

```text
dispose()
close()
cancel()
remove()
```

depending on the resource.

The tracker observes lifecycle events and compares them to expected cleanup/collection.

## Disposal is an application contract

For example:

```dart
final class ClockSubscription {
  ClockSubscription(
    Stream<DateTime> source,
    this.onTime,
  ) {
    _subscription = source.listen(
      onTime,
    );
  }

  final void Function(DateTime value) onTime;

  StreamSubscription<DateTime>? _subscription;

  Future<void> dispose() async {
    final subscription = _subscription;
    _subscription = null;

    if (subscription != null) {
      await subscription.cancel();
    }
  }
}
```

Even if this class is not instrumented, its ownership must still be correct.

Instrumentation is verification, not ownership.

---

# Garbage Collection

Garbage collection is reachability-based and is not guaranteed to run immediately after a reference disappears.

An unreachable Dart object is eligible for collection.

A reachable object is not.

Therefore:

```text
disposed != garbage-collected
```

and:

```text
garbage-collected != properly disposed
```

## Current leak-tracker GC verification

The package has a `forceGC` utility that stimulates GC by allocation and verifies collection with reachability barriers. It does not work in web or release contexts and allows multiple full GC cycles. Current defaults use three GC cycles to reduce false-positive retention reports.

## Do not write tests around an exact instant

Bad assumption:

```text
dispose()
↓
one microtask
↓
object MUST be GCed
```

GC scheduling is nondeterministic.

Instead:

- release the owner;
- settle/cancel async work;
- allow the leak-testing machinery to perform its configured collection strategy;
- investigate repeated retention.

## LeakTrackingConfig

Core configuration includes controls such as:

- check period;
- disposal time;
- number of GC cycles;
- retaining-path request limits.

The configuration is immutable after tracking starts.

Do not tune collection thresholds before first proving the test lifecycle is correct.

---

# Leak Settings

For ordinary Flutter tests, configure through `LeakTesting.settings`.

Use current APIs deliberately.

## Ignore configuration

`withIgnored(...)` can target:

- not-GCed classes;
- all not-GCed;
- not-disposed classes;
- all not-disposed;
- class lists;
- objects created by test helpers;
- test-helper exceptions.

## Tracking configuration

`withTracked(...)` can enable targeted tracking, including experimental not-GCed tracking.

## Diagnostic configuration

Enable only when diagnosing:

```dart
final diagnostics =
    LeakTesting.settings
        .withCreationStackTrace()
        .withDisposalStackTrace()
        .withRetainingPath();
```

Current `LeakDiagnosticConfig` explicitly warns that collecting creation/disposal stack traces and retaining paths can have significant memory/performance overhead.

---

# Ignoring Known Objects

An ignore is a risk-management decision, not a convenience method.

## Valid reason

A known framework/test-helper object is outside application ownership and has a documented upstream issue.

## Invalid reason

```text
Our screen leaks three ScrollControllers.
Ignore ScrollController.
```

That hides an application lifecycle defect.

## Process before ignoring

1. Identify class.
2. Find creation site.
3. Identify owner.
4. Confirm owner is actually destroyed.
5. Confirm cleanup executes.
6. Check remaining references.
7. Verify this is external/framework-owned noise.
8. Add the narrowest possible ignore.
9. Add a comment or issue reference in the test source.
10. Revisit after SDK/package upgrades.

## Temporary whole-test opt-out

If a test intentionally triggers a known framework condition and leak tracking is not meaningful:

```dart
testWidgets(
  'framework exception behavior',
  (WidgetTester tester) async {
    FlutterErrorDetails? captured;

    FlutterError.onError = (
      FlutterErrorDetails details,
    ) {
      captured = details;
    };

    addTearDown(() {
      FlutterError.onError =
          FlutterError.presentError;
    });

    await tester.pumpWidget(
      const MaterialApp(
        home: SizedBox.shrink(),
      ),
    );

    expect(
      captured,
      isNull,
    );
  },
  experimentalLeakTesting:
      LeakTesting.settings
          .withIgnoredAll(),
);
```

Use this only with explicit rationale. First-party troubleshooting recommends temporary opt-outs be tracked with a TODO/issue rather than silently normalized.

---

