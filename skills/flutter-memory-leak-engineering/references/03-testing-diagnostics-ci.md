# Testing, False Positives, Diagnostics, DevTools, and CI

> Preserved from the supplied research/engineering guide. Use this reference only when the active task needs these details.

## Contents

- False Positives
  - Common test causes
    - Test helper/framework-created objects
    - Owner is still mounted
    - Route transition still running
    - Gesture still active
    - OverlayEntry
    - Image cache
    - Async work still pending
- False Negatives
- Leak Report Interpretation
  - Interpretation sequence
    - `notDisposed`
    - `notGCed`
    - `gcedLate`
- Debugging Workflow
  - 1. Reproduce narrowly
  - 2. Identify leak category
  - 3. Find creation site
  - 4. Identify owner
  - 5. Verify cleanup path
  - 6. Verify cleanup executes
  - 7. Search long-lived references
  - 8. Enable disposal stack and retaining path
  - 9. Fix the closest real owner/retainer
  - 10. Re-run focused test
  - 11. Run broader suite
- DevTools Escalation Workflow
  - Workflow
    - 1. Reproduce predictably
    - 2. Observe memory timeline
    - 3. Take a baseline snapshot
    - 4. Repeat lifecycle
    - 5. Take another snapshot/diff
    - 6. Inspect instances/references
    - 7. Trace allocations if needed
    - 8. Fix ownership
    - 9. Reprofile
- CI Integration
  - CI rules
- Leak Budgets and Tolerances
- Regression Test Strategy
  - Good regression target
- Performance Overhead
  - Expensive diagnostic options
- Debug/Test/Production Strategy
- Experimental Running-App Tracking
- Test Isolation
  - Test-created object
  - Test ordering

---

# False Positives

Before calling a report false positive, reproduce and inspect ownership.

## Common test causes

### Test helper/framework-created objects

Use `createdByTestHelpers: true` when appropriate.

### Owner is still mounted

The test did not actually end the widget lifecycle.

Fix test lifecycle.

### Route transition still running

Call:

```dart
await tester.pumpAndSettle();
```

where appropriate.

### Gesture still active

First-party troubleshooting notes that gestures created in tests must be completed, such as by sending `up()`, before expecting all resources to release.

### OverlayEntry

A manually created `OverlayEntry` must be removed before being disposed.

### Image cache

Images can remain intentionally retained by Flutter's image cache.

When a focused test requires cleanup:

```dart
imageCache.clear();
imageCache.clearLiveImages();
```

only if clearing the cache is consistent with what the test is trying to verify. First-party leak-tracker troubleshooting explicitly calls out image-cache retention as a test consideration.

### Async work still pending

A timer, stream event, animation, microtask, or Future continuation may still retain an owner.

Cancel or finish the actual work instead of increasing tolerance first.

---

# False Negatives

Leak tracking can miss real memory problems when:

- leaked type is not instrumented;
- not-GCed checking is disabled;
- leak is an unbounded collection, not lifecycle failure;
- native resource remains allocated independently;
- object is intentionally reachable but should have been evicted;
- instrumentation only covers a wrapper, not the actual resource;
- retention occurs only under production behavior not reproduced in test.

Passing:

```text
all leak tests
```

means:

```text
No configured tracked lifecycle violation was observed.
```

It does not mean:

```text
The entire heap is perfect.
```

---

# Leak Report Interpretation

For every report inspect:

| Report data | Question |
|---|---|
| Leak type | Disposal bug, retention bug, or delayed collection? |
| Tracked class | Which lifecycle contract is being monitored? |
| Runtime type | Which concrete object leaked? |
| Creation context | Who created it? |
| Disposal context | Did cleanup execute and from where? |
| Test phase | During which lifecycle phase was it reported? |
| Retaining path | What strong reference prevents collection? |
| Count | Is it one object or growing per cycle? |

Current `LeakReport` exposes tracked/runtime class information, object identity, context, phase, and retaining-path information where collected. Aggregated `Leaks` exposes reports by type/phase and individual categories.

## Interpretation sequence

### `notDisposed`

Ask:

```text
Who created it?
↓
Who owns it?
↓
Why did owner teardown not call cleanup?
```

### `notGCed`

Ask:

```text
dispose happened
↓
who still references it?
```

Enable retaining-path diagnostics for the focused reproduction.

### `gcedLate`

Ask:

```text
What temporarily held it?
↓
Is that retention expected?
↓
Does repeated use cause accumulation?
```

---

# Debugging Workflow

Use this process.

## 1. Reproduce narrowly

Reduce the problem to:

```text
create
↓
exercise
↓
release
```

## 2. Identify leak category

Do not apply a retention fix to an undisposed object or vice versa.

## 3. Find creation site

Enable:

```dart
LeakTesting.settings
    .withCreationStackTrace()
```

for the focused test.

## 4. Identify owner

Ask:

- constructor?
- `initState`?
- provider?
- DI scope?
- repository?
- singleton?
- test itself?

## 5. Verify cleanup path

Search:

```text
dispose
close
cancel
removeListener
remove
```

## 6. Verify cleanup executes

Add a breakpoint/log/test expectation if needed.

## 7. Search long-lived references

Inspect:

- static fields;
- singleton services;
- listener collections;
- callbacks;
- cache;
- DI registration;
- stream subscriptions.

## 8. Enable disposal stack and retaining path

Only when the object is being disposed but remains retained.

```dart
final focused =
    LeakTesting.settings
        .withDisposalStackTrace()
        .withRetainingPath();
```

First-party troubleshooting recommends expensive retaining-path/stack diagnostics only after a leak is known.

## 9. Fix the closest real owner/retainer

Do not dispose every reported victim independently.

One culprit can retain many victim objects.

## 10. Re-run focused test

Verify the report disappears.

## 11. Run broader suite

Ensure the lifecycle change did not double-dispose or break ownership elsewhere.

---

# DevTools Escalation Workflow

Use DevTools when:

- `notGCed` persists but the retaining chain is unclear;
- memory grows while leak tests pass;
- an unbounded cache is suspected;
- native/external memory appears to dominate;
- repeated navigation increases heap counts;
- allocation sources need investigation.

Current Flutter DevTools Memory supports memory charts, heap/profile inspection, allocation tracing, diff snapshots, and retaining-reference analysis.

## Workflow

### 1. Reproduce predictably

Example:

```text
Open details
Close details
Repeat 10 times
```

### 2. Observe memory timeline

Look for:

- Dart heap trend;
- external/native memory trend;
- GC behavior.

### 3. Take a baseline snapshot

Before repeated operation.

### 4. Repeat lifecycle

Perform the leaking workflow.

### 5. Take another snapshot/diff

Inspect classes whose retained count grows.

### 6. Inspect instances/references

Find inbound/retaining references.

### 7. Trace allocations if needed

Use allocation tracing when the unexpected creation site is unknown.

### 8. Fix ownership

Do not merely clear all memory at an arbitrary point.

### 9. Reprofile

A fix is not complete until the retained trend changes.

---

# CI Integration

A useful CI leak suite must be high signal.

Recommended baseline:

```text
Flutter widget tests
↓
LeakTesting enabled globally
↓
not-disposed tracking
↓
test-helper filtering
↓
focused experimental retention tests separately
```

## CI rules

- Pin/coordinate Flutter SDK and package versions.
- Use one stable supported VM/native test environment.
- Keep ordinary diagnostics light.
- Do not collect retaining paths across every test.
- Avoid web as the primary leak-test CI target while support remains experimental.
- Do not retry failures until they turn green.
- Keep test helper/framework ignores narrow.
- Document every long-term ignore.
- Track flake rate.
- Fail on application-owned disposal regressions.
- Preserve known fixed leak tests.

Current leak-tracker test teardown deliberately keeps some tracking state/listeners alive across tests because garbage collection may occur after individual test completion, then performs final suite-level leak processing. This is another reason tests should not assume exact per-line GC timing.

---

# Leak Budgets and Tolerances

Current settings can ignore configured numbers/classes of leak reports.

Use counts only for verified external noise.

Do not establish policy such as:

```text
Up to 3 leaked app controllers per test is acceptable.
```

That normalizes a lifecycle bug.

A justified allowance should answer:

- Which class?
- Who owns it?
- Why can application code not fix it?
- Which upstream issue tracks it?
- Why is the exact number stable?
- When should the allowance be removed?

Separate memory-footprint baselining from lifecycle leak classification. Current ecosystem also provides memory baselining concepts such as measurement/regression modes, but those address footprint regression rather than proving a disposal/retention leak.

---

# Regression Test Strategy

After fixing a lifecycle bug:

```text
Reproduce leak
↓
write minimal failing leak test
↓
fix ownership/cleanup
↓
test passes
↓
keep test permanently
```

## Good regression target

```text
Open profile editor
↓
subscribe to user stream
↓
close editor
↓
subscription canceled
↓
controller disposed
```

Do not keep only a test that asserts:

```text
dispose() was called
```

if the real bug was:

```text
disposed object remained in singleton listener map
```

Use retention testing when the bug is retention.

---

# Performance Overhead

Leak tracking is not free.

First-party benchmark data for Flutter Gallery on macOS profile mode reported roughly:

- about 400 KB additional memory, approximately 0.5% in that benchmark;
- roughly 0.05 ms tracking-related contribution, around 2.7% of the measured home-loading operation;
- asynchronous leak analysis around 2.5 ms.

These are benchmark-specific figures, not universal guarantees.

## Expensive diagnostic options

Creation/disposal stack traces and retaining paths can materially increase:

- CPU work;
- allocations;
- retained diagnostic data;
- test duration.

Keep them off by default and turn them on for focused failures.

---

# Debug/Test/Production Strategy

| Environment | Recommended use |
|---|---|
| Unit/widget tests | Primary leak-tracker use |
| Local debug | Focused instrumentation/debugging |
| Integration tests | Useful for larger lifecycle flows; keep deterministic |
| Profile | Focused investigation where supported/configured |
| Release production | Do not design around leak_tracker; current docs disable release tracking |
| Flutter Web | Treat leak tracking as experimental/version-sensitive |
| DevTools profile session | Complement leak tests with heap/retaining analysis |

Current docs describe debug support as fully available, profile use with appropriate allocation instrumentation, and release tracking as disabled.

Do not ship expensive diagnostic tracking into production by default.

---

# Experimental Running-App Tracking

Current core APIs can track a running Flutter application, but first-party docs classify this use as experimental.

A debug-only setup can bridge Flutter allocation events:

```dart
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:leak_tracker/leak_tracker.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  if (kDebugMode &&
      kFlutterMemoryAllocationsEnabled) {
    FlutterMemoryAllocations.instance.addListener(
      _handleObjectEvent,
    );

    LeakTracking.start();
  }

  runApp(
    const MaterialApp(
      home: SizedBox.shrink(),
    ),
  );
}

void _handleObjectEvent(
  ObjectEvent event,
) {
  LeakTracking.dispatchObjectEvent(
    event.toMap(),
  );
}
```

Do not treat this experimental mode as a replacement for deterministic widget tests.

---

# Test Isolation

A leak in one test can contaminate another.

Clean:

- GetIt registrations/scopes;
- singleton overrides;
- static listeners;
- timers;
- fake streams;
- mocks with subscriptions;
- image caches when the test specifically owns that requirement;
- test-created disposable objects.

## Test-created object

Use `addTearDown` immediately:

```dart
testWidgets(
  'focus behavior',
  (WidgetTester tester) async {
    final focusNode = FocusNode();

    addTearDown(
      focusNode.dispose,
    );

    await tester.pumpWidget(
      MaterialApp(
        home: TextField(
          focusNode: focusNode,
        ),
      ),
    );

    focusNode.requestFocus();
    await tester.pump();
  },
  experimentalLeakTesting:
      LeakTesting.settings,
);
```

First-party troubleshooting recommends `addTearDown` for test-created disposables because it still runs when the test fails early.

## Test ordering

A test must pass:

- alone;
- before another leak test;
- after another leak test.

If success depends on test order, global state is leaking between tests.

---

