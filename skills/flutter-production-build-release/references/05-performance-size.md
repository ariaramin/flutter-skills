# Performance, Rendering, Startup, Memory, Networking & App Size

Source-preserving excerpt from the uploaded production release skill. Use when the core SKILL.md routes to this topic.

# Performance Optimization Workflow

## Step 1 — Define metrics

Select objective metrics before changing code.

Examples:

### Rendering

- missed frames
- UI-thread/frame-build time
- raster time
- p90/p99 frame time
- scroll hitching

### Startup

- process start → first frame
- first useful/interactable content
- cold vs warm startup

### CPU

- CPU time for expensive operation
- main-isolate blocking duration

### Memory

- peak RSS
- Dart heap
- raster/image cache
- retained objects
- post-navigation memory

### Network

- request count
- transferred bytes
- time-to-critical-response
- duplicate requests

### Size

- store upload
- user download
- installed footprint
- Dart/native/assets breakdown

---

## Step 2 — Establish a baseline

Capture:

```text
commit
Flutter version
device
OS
build mode
test path
metric
trace/snapshot
```

A performance comparison without equivalent conditions is weak evidence.

---

## Step 3 — Profile

Use Flutter DevTools for native Flutter applications:

- Performance
- CPU profiler
- Memory
- Network
- App Size
- Inspector

DevTools provides dedicated tools for UI jank, CPU, network, memory, and app size.

For Web profile-mode rendering, use Chrome DevTools performance tooling.

---

## Step 4 — Fix the measured bottleneck

Do not optimize unrelated code.

---

## Step 5 — Re-profile

Use the same:

- device
- dataset
- route
- account/test state
- build mode
- measurement interval

---

## Step 6 — Keep only meaningful changes

Reject changes that:

- do not measurably improve the target metric
- regress another critical metric
- dramatically increase complexity for negligible benefit

---

# Rendering Performance

A frame's time budget depends on display refresh rate.

A 60 Hz device has roughly 16.7 ms between frames; a 120 Hz device has roughly 8.3 ms.

Do not hardcode “16 ms is always enough.”

Flutter DevTools separates UI and raster work and marks slow frames.

---

## Rebuilds

Rebuilding widgets is not automatically a performance bug.

Investigate only when profiling identifies significant build cost.

Use:

- smaller rebuild scopes
- stable child subtrees
- `const` where appropriate
- `AnimatedBuilder.child`
- lazy item builders

Do not perform architecture-wide state-management migrations solely to reduce rebuild counts without measurements.

---

## Lists

For long or unbounded lists:

Prefer lazy construction such as:

```dart
ListView.builder(...)
```

or appropriate slivers.

Avoid eagerly materializing thousands of off-screen widgets.

Flutter's performance guidance recommends thoughtful lazy list/grid construction.

---

## Layout

Watch for expensive intrinsic sizing.

DevTools can track layout passes and identify intrinsic-layout events.

Avoid unnecessary:

- `IntrinsicHeight`
- `IntrinsicWidth`
- repeated whole-tree measurement

for large collections when a deterministic layout is possible.

---

## Paint/compositing

Profile before changing.

Potentially expensive operations include:

- `saveLayer`
- excessive opacity layers
- complex clipping
- image filters
- unnecessary physical effects

Flutter's performance documentation specifically calls these out as areas requiring care.

Do not remove legitimate visual effects until profiling proves they matter.

---

# Dart and CPU Performance

## Isolates

Use an isolate when measured CPU work blocks the main isolate long enough to cause UI responsiveness problems.

Flutter's isolate guidance makes this the central criterion.

For one-off work:

```dart
final result = await Isolate.run(() {
  return expensiveComputation();
});
```

For repeated expensive operations, consider a longer-lived worker because isolate creation/message transfer has overhead.

Do not move trivial calculations to isolates.

---

## Flutter Web isolate caveat

Flutter Web does not provide Dart isolates in the same manner as native Flutter.

Flutter documents that `compute()` runs on the main thread on Web.

Do not claim:

```dart
compute(...)
```

automatically makes Web CPU work parallel.

If browser-worker concurrency is needed, design it as a Web-specific architecture.

---

## Allocations

Do not optimize every allocation manually.

Profile:

- allocation hot spots
- retained objects
- repeated serialization
- large temporary buffers

before changing data structures.

---

# Startup Performance

Split startup work into:

### Required before first frame

Only work necessary to render a correct first screen.

### Required shortly after

Can begin after first frame.

### Background/noncritical

Analytics initialization, cache cleanup, remote prefetch, and similar tasks often need not block initial rendering.

Avoid:

```dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await initializeEverythingInTheApplication();

  runApp(const App());
}
```

unless every initialization step is truly required before UI.

Prefer dependency-specific/lazy initialization and post-first-frame work where safe.

Measure cold startup separately from warm startup.

Do not optimize startup based only on developer hot-restart behavior.

---

# Memory

Use DevTools Memory view to distinguish:

- leaks
- excessive retained objects
- memory bloat
- image/cache use
- garbage-collection behavior

Flutter's Memory view supports allocation profiling, snapshots, diffs, and retaining-path investigation.

Review lifecycle cleanup for:

- `AnimationController`
- `TextEditingController`
- `ScrollController`
- listeners
- subscriptions
- timers
- native resources

Do not assume frequent GC events alone imply a memory leak; correlate them with retention and performance.

---

## Images

Large decoded images can consume substantially more memory than their compressed file size.

When the displayed size is significantly smaller than the source:

- resize source assets where practical
- request/cache appropriately sized image variants
- use decode-size controls such as `cacheWidth`/`cacheHeight` when appropriate
- profile image-cache behavior

Do not judge runtime image memory from JPEG/PNG file bytes alone.

---

# Networking

Do not invent Flutter-specific networking behavior when it belongs to `dart:io`, browsers, Dio, `package:http`, or another library.

Measure:

- number of requests
- duplicate requests
- response payload size
- serialization cost
- retry behavior
- cache hit rate
- startup-critical network dependency

Optimize with:

- request deduplication
- pagination
- appropriate cache semantics
- compression
- smaller schemas
- timeouts
- bounded retries
- moving noncritical requests after first frame

Do not batch requests simply because fewer requests "sounds faster"; measure latency/server tradeoffs.

---

# App Size Optimization

## Distinguish size metrics

Never conflate:

| Metric | Meaning |
|---|---|
| Build artifact size | Local APK/AAB/IPA/package bytes |
| Store upload size | Package uploaded to store |
| User download size | Bytes delivered after store/device filtering and compression |
| Installed size | Disk usage after installation |
| Runtime memory | RAM used while application runs |

Flutter explicitly notes that upload-package size is not equivalent to end-user download size because app stores can filter architectures and resources.

---

## Analyze before removing

Current supported size-analysis commands include:

```bash
flutter build apk --analyze-size
flutter build appbundle --analyze-size
flutter build ios --analyze-size
flutter build linux --analyze-size
flutter build macos --analyze-size
flutter build windows --analyze-size
```

Flutter produces size-analysis JSON that can be opened and diffed in DevTools.

Do not invent `--analyze-size` support for Web merely because other targets support it; it is not listed in Flutter's current supported command list on the app-size page.

---

## Optimize in this order

1. Identify largest category.
2. Remove truly unused assets.
3. Optimize oversized images.
4. Review large font families.
5. Review localization payloads.
6. Review oversized dependencies.
7. Review native libraries per architecture.
8. Use store-level architecture splitting.
9. Consider deferred loading only when measured benefit warrants complexity.
10. Re-run size analysis.

Flutter's official size guidance recommends removing unused resources, minimizing imported library resources, and compressing image assets.

---

## Tree shaking

Release/profile AOT compilation removes unreachable Dart code.

Do not assume dynamically referenced native/plugin resources can always be tree-shaken.

Flutter's App Size tool exposes Dart, native, assets, and fonts so each category can be diagnosed independently.

---

