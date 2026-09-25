---
name: flutter-motion-engineering
description: Design, implement, review, debug, and profile Flutter animations and transitions with Apple-quality continuity, responsive gestures, and platform-appropriate behavior. Use for spring motion, drag-to-dismiss, interactive sheets, interrupted or reversing animations, Hero and route transitions, scroll-linked effects, reduced motion, animation lifecycle bugs, and motion-related jank, including requests to make Flutter interactions feel smooth or native. Do not use for SwiftUI/UIKit implementation, animation asset authoring, or backend performance. For Material animations-package APIs, use the package-specific skill when available.
compatibility: Research checked 2026-08-27. Local validation baseline is Flutter 3.47.0 stable, Dart 3.13.0, DevTools 2.60.0; not a claim about the latest global patch. Inspect the target SDK, renderer, platform, router, and design system. Core examples use Flutter SDK APIs only.
---

# Flutter Motion Engineering

## Purpose and evidence policy

Engineer motion that communicates state, follows input, survives interruption, and delivers consistent frames. Treat Apple quality as continuity, restraint, and responsiveness, not an instruction to copy iOS styling onto every platform. Accessibility and correctness are acceptance gates, never optional performance tradeoffs.

Evidence labels used below: **D** = documented framework behavior; **P** = platform/version-specific guidance; **E** = engineering recommendation or inference. Selection tables and validation procedures are E unless stated otherwise. Distinguish confirmed defects, measured bottlenecks, plausible risks, and optional refinements in reviews.

Check `flutter --version --machine`, SDK constraints, lockfiles, and the actual renderer before applying version-sensitive advice. Official documentation is rolling: some pages still identify Flutter 3.44.7 while individual sections describe 3.47; API footers can show `0.0.0`. Use the installed SDK source or a matching release tag to resolve conflicts. Do not infer a minimum supported version from a rolling API page.

## Bundled reference routing

Read the core workflow first, then load only the supporting material required for the task.

| Task | Reference |
|---|---|
| Gesture state, velocity, retargeting, geometry changes, route ownership | [Interaction protocols](references/interaction-protocols.md) |
| Baseline capture, stage diagnosis, rendering experiments, evidence reporting | [Profiling playbook](references/profiling-playbook.md) |
| Runnable examples, regression coverage, integration gates, validation limits | [Testing and examples](references/testing-and-examples.md) |

The examples are a small Flutter test package, not an application template. Reuse the host project's architecture and tokens instead of copying an entire new motion layer.

## Implementation workflow

1. Inspect repository rules, affected widgets and every caller, route ownership, state management, tokens, accessibility, heavy content, and existing tests. Preserve unrelated changes.
2. State the interaction: what changes, what relationship motion explains, who owns the target state, and whether input can interrupt it. Classify as decorative, state-driven, navigational, gesture-driven, or physics-driven.
3. Define forward, reverse, cancellation, rapid retargeting, reduced motion, focus, hit testing, and target-platform behavior before choosing APIs.
4. Reuse existing primitives and platform widgets. Choose the smallest mechanism that satisfies those behaviors; no animation is valid when motion adds no meaning.
5. Keep interpolation local to presentation. Implement without per-frame business events or expensive synchronous work.
6. Test behavior and lifecycle; profile the representative interaction; identify the expensive stage; change one relevant mechanism and re-profile.
7. Report changed behavior, checks actually run, measured results, and remaining device/platform coverage. Never label an animation optimized from source inspection alone.

## Motion decision framework and API selection

**D:** `Animation<T>` exposes changing values/status; `AnimationController` owns time and control; `Tween<T>` maps values; `Curve` remaps progress. Neither a tween nor a curve schedules frames. [Flutter animation overview](https://docs.flutter.dev/ui/animations/overview).

| Requirement | Start with | Boundary / alternative |
|---|---|---|
| Simple target changes | `AnimatedContainer`, `AnimatedAlign`, `AnimatedOpacity` | Internal controllers are sufficient; choose explicit control for scrubbing or coordinated interruption. |
| Custom property with target interpolation | `TweenAnimationBuilder` | It owns and mutates its tween; never share or mutate that tween elsewhere. |
| Two content states and size interpolation | `AnimatedCrossFade` | Check clipping, text scale, focus, and retained child cost. |
| Content replacement | `AnimatedSwitcher` with semantic `ValueKey` | Rapid replacement can retain several outgoing children; avoid `UniqueKey()` per build. |
| Content changes its natural size | `AnimatedSize` | Accept layout work when surrounding geometry must change. |
| Position changes inside a `Stack` | `AnimatedPositioned` / directional equivalent | If footprint is unchanged, consider `SlideTransition`; position/size layout and paint translation are not equivalent. |
| Controlled fade, translation, scale, rotation | `FadeTransition`, `SlideTransition`, `ScaleTransition`, `RotationTransition` | Prefer dedicated transition widgets over a large custom builder. |
| Controlled layout reveal | `SizeTransition` | It changes layout and clips; do not classify it as a transform-only effect. |
| Several values on one timeline | Controller + `TweenSequence`, `Interval`, `CurvedAnimation` | Use one clock for truly coordinated motion; independent interactions need independent ownership. |
| Custom animated subtree | `AnimatedBuilder` + stable `child` | Use `ListenableBuilder` for non-animation listenables; `AnimatedWidget` for a useful reusable boundary. |
| Drawing-only changes | `CustomPainter(repaint: listenable)` | Bypasses build/layout for ticks, not paint or GPU cost; provide semantics separately when needed. |
| Same object across routes | Existing route + `Hero` | Not a replacement for route state or arbitrary matched geometry. |
| Standard navigation / modal | Existing adaptive route or Cupertino component | Preserve router integration; custom `PageRouteBuilder` only for a justified behavior gap. |
| Finger-following movement / momentum | Local controller + gesture updates + `Simulation` | Reuse existing sheet, dismissible, scrolling, or `InteractiveViewer` behavior first. |

Selection mechanics: [TweenAnimationBuilder](https://api.flutter.dev/flutter/widgets/TweenAnimationBuilder-class.html), [AnimatedSwitcher](https://api.flutter.dev/flutter/widgets/AnimatedSwitcher-class.html), [AnimatedPositioned](https://api.flutter.dev/flutter/widgets/AnimatedPositioned-class.html), [CustomPainter](https://api.flutter.dev/flutter/rendering/CustomPainter-class.html).

Use implicit animation for changing targets without explicit timeline ownership. Retargeting from the current visual value does not establish physical velocity continuity. Use explicit control when cancellation, gesture progress, momentum, sequencing, or lifecycle behavior requires it. A `CurvedAnimation` can overshoot outside 0–1; constrain outputs such as opacity, and dispose owned curved animations/listeners. [CurvedAnimation API](https://api.flutter.dev/flutter/animation/CurvedAnimation-class.html).

## Apple-quality motion: translate principles, not APIs

**P/E:** Keep visual cause and effect clear: an object should emerge from its source, return coherently, and follow the user's changing intent. Provide immediate press feedback, cancel it when the gesture loses, and leave essential actions available during transitions. Prefer existing button behavior, including keyboard, focus, semantics, and platform feedback. Do not make network completion wait for decorative settling. [Apple HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion).

**P/E:** Preserve spatial hierarchy and continuity of position. Preserve velocity where an object is already moving or released from a gesture. A spring may be critically damped and nonbouncy; overshoot is not a quality requirement. Avoid lengthy travel, gratuitous parallax, and repeated entrance choreography on frequently used screens. Apple's spring presentation distinguishes perceived duration from physical settling; do not invent a universal Apple duration or damping preset. [Apple: Animate with springs](https://developer.apple.com/videos/play/wwdc2023/10158/).

UIKit's paused scrubbing/reversal and SwiftUI's spring retargeting are interaction precedents, not Flutter API contracts. Flutter custom simulations require explicit handoff; `animateTo()` does not automatically reproduce SwiftUI's velocity-preserving spring replacement. [UIViewPropertyAnimator](https://developer.apple.com/documentation/uikit/uiviewpropertyanimator), [SwiftUI spring](https://developer.apple.com/documentation/swiftui/animation/spring).

## Curves, springs, and gesture-driven motion

| Need | Mechanism | Avoid / verify |
|---|---|---|
| Known timing, small state change | Duration + curve | Restarting an ease curve during a drag can break velocity continuity. |
| Natural settling or momentum handoff | `SpringSimulation` + `animateWith` | No exact duration guarantee; verify settling tolerance and overshoot. |
| Object follows pointer | Direct progress updates | Do not ease every pointer update or trail the finger through queued animations. |
| Drag followed by settling | Direct manipulation, then spring | Convert release velocity into simulation units and preserve its sign. |
| Scrolling / ballistic deceleration | Platform `ScrollPhysics` | Do not replace scroll machinery with a generic animation controller. |

**D/E:** For mass `m`, stiffness `k`, damping `c`, damping ratio is `c / (2 * sqrt(m * k))`: below 1 is underdamped, 1 critically damped, above 1 overdamped. Tune response and settling together, starting with positive mass/stiffness and positive damping for settling interactions. Initial velocity uses position units per second, not normalized progress unless position itself is normalized. [SpringDescription](https://api.flutter.dev/flutter/physics/SpringDescription-class.html), [SpringSimulation](https://api.flutter.dev/flutter/physics/SpringSimulation-class.html).

Prefer an existing project spring token. Where supported, `SpringDescription.withDurationAndBounce` offers duration/bounce parameterization documented as equivalent to SwiftUI's spring parameters; this does not guarantee identical gesture handling or rendering. Check the installed SDK before adopting it; use mass/stiffness/damping or `withDampingRatio` otherwise. Do not choose an undamped spring for an interaction expected to finish. [Duration and bounce constructor](https://api.flutter.dev/flutter/physics/SpringDescription/SpringDescription.withDurationAndBounce.html).

## Gesture-driven and interruptible motion

1. Define one coordinate system: axis, origin, travel extent, bounds, and semantic endpoints. For normalized progress `p = signedDisplacement / travel`, release velocity is `signedPixelsPerSecond / travel`; reject nonfinite or nonpositive travel. Never substitute unsigned speed for signed axis velocity.
2. On gesture acquisition, stop the settling simulation without resetting position. Account for gesture-arena competition and cancellation; a pointer-down event is not proof that a drag has won.
3. While dragging, derive visual progress from input. Apply intentional bounds or resistance; do not replay a timed ease on each update. Preserve the pinch focal point when scaling and use `InteractiveViewer` when it meets the requirement.
4. On release, select the target from direction, velocity, displacement, and valid semantic states. Use project thresholds, not unexplained device-independent magic numbers. On cancellation, settle to a valid state without accidentally committing dismissal.
5. On programmatic retarget, capture the current position and `controller.velocity` **before** stopping, resetting, or assigning `value`; velocity becomes zero when stopped. Start the new spring from those captured values. [Controller velocity](https://api.flutter.dev/flutter/animation/AnimationController/velocity.html).
6. Handle re-grabbing, orientation/extent changes, nested scrolling, disposal, and late completion callbacks. Do not block all touches until settling ends. Commit business/navigation state once; animation completion is not the business transaction.

**D:** `animateWith` clamps values on bounded controllers and reports forward status even if the numeric target is lower. Use unbounded displacement when physical overshoot is intended, and track semantic direction separately. Clamp only constrained derived properties such as opacity; don't silently flatten the spring trajectory. [animateWith API](https://api.flutter.dev/flutter/animation/AnimationController/animateWith.html).

## Navigation, shared elements, and platform behavior

| Situation | Preferred implementation | Required checks |
|---|---|---|
| Ordinary push/pop | Existing router's adaptive route; `CupertinoPageRoute` for deliberate iOS presentation | Back gesture cancellation, route result, focus, RTL, restoration. |
| Modal / sheet | Existing platform-appropriate modal API | Barrier label/dismissibility, nested navigator, keyboard/insets, drag/scroll handoff. |
| Card-to-detail continuity | `Hero` within existing route ownership | Unique matching tags, first-frame destination, compatible geometry and images. |
| Bespoke product transition | Existing router's custom page transition, or `PageRouteBuilder` | Primary and secondary animations, reverse, browser history, deep links, back gestures. |

**D/P:** Cupertino routes implement iOS transitions, including different fullscreen-dialog behavior. A plain `PageRouteBuilder` slide does not recreate interactive Cupertino back navigation. Preserve Android back behavior, including predictive back where supported; never replace route infrastructure only to change easing. [CupertinoPageRoute](https://api.flutter.dev/flutter/cupertino/CupertinoPageRoute-class.html), [Flutter platform adaptations](https://docs.flutter.dev/ui/adaptive-responsive/platform-adaptations).

**D/E:** Hero flights use the navigator overlay. Keep matching tags unique within each route and the destination present on its first animation frame. Keep heroes axis-aligned; account for inherited-theme differences using a compatible flight shuttle where necessary. Verify image readiness, nested navigators, interrupted flights, and `transitionOnUserGestures`; it is not automatically enabled. Explicitly disable or simplify spatial flights under reduced motion; verify fallback routes too. [Hero API](https://api.flutter.dev/flutter/widgets/Hero-class.html).

For approved custom navigation, this transition builder demonstrates stable-child reuse and a live reduced-motion branch. It is not a complete route, nor an interactive-back implementation. Supply existing motion tokens for both route durations; preserve settings, secondary-animation policy, route ownership, and platform behavior at the caller.

```dart
import 'package:flutter/widgets.dart';

Widget motionFadeTransition(
  BuildContext context,
  Animation<double> animation,
  Animation<double> secondaryAnimation,
  Widget child,
) {
  if (MediaQuery.disableAnimationsOf(context)) {
    return child;
  }
  return FadeTransition(opacity: animation, child: child);
}
```

## Scrolling and scroll-linked effects

**D/E:** Keep lazy slivers/list builders and stable entity keys. Prefer sliver geometry for collapsing headers and a localized `ScrollController`/`ScrollPosition` listener for position-dependent changes. Verify attachment, metrics availability, and resize before reading dimensions. Never rebuild an entire feed to update one header.

`ScrollNotification` arrives after build/layout; using it to drive layout causes a one-frame lag. Reserve notifications for appropriate paint effects or observation, and filter `depth` when nested scrollables matter. [ScrollNotification](https://api.flutter.dev/flutter/widgets/ScrollNotification-class.html), [ScrollController](https://api.flutter.dev/flutter/widgets/ScrollController-class.html).

Retain the platform's `ScrollBehavior`: base behavior uses bouncing on iOS/macOS and clamping on Android and other desktop platforms. Do not force bouncing everywhere to imitate Apple. Ballistic simulations can be recreated as metrics change; preserve equivalent motion instead of restarting a timer. Test insertion during scrolling, boundary release, mouse wheel, trackpad, keyboard, and nested sheets. [ScrollBehavior physics](https://api.flutter.dev/flutter/widgets/ScrollBehavior/getScrollPhysics.html), [Ballistic simulation](https://api.flutter.dev/flutter/widgets/BouncingScrollPhysics/createBallisticSimulation.html).

## Flutter rendering and frame budget

**D:** Vsync schedules frame work. Tickers update animation values, then microtasks run; dirty elements build, dirty render objects lay out, compositing bits update, paint records layers, and scene composition feeds the engine. Semantics and finalization follow in the framework lifecycle. Post-frame callbacks still run on the UI isolate; they do not offload CPU work. [WidgetsBinding.drawFrame](https://api.flutter.dev/flutter/widgets/WidgetsBinding/drawFrame.html).

**E, arithmetic:** Use the observed frame interval: `1000 / refreshRateHz` milliseconds. At 60/90/120 Hz this is approximately **16.67 / 11.11 / 8.33 ms**. Allow headroom; display capability, actual cadence, system load, and thermal conditions differ. Average FPS hides isolated bad frames and input latency.

**D/E:** UI work and raster work are pipelined. Compare each stage to the frame interval; adding their durations is not a reliable dropped-frame test. Framework build/layout/paint recording is distinct from raster-thread rendering and GPU work. `FrameTiming.totalSpan` includes additional latency and is not touch-to-photon latency. Do not equate raster duration with a pure GPU timer. [FrameTiming](https://api.flutter.dev/flutter/dart-ui/FrameTiming-class.html), [Performance profiling](https://docs.flutter.dev/perf/ui-performance).

## Rendering, compositing, and rebuild optimization

| Mechanism | What changes / likely cost | When to use; how to verify |
|---|---|---|
| `Transform` / slide / scale / rotation | Paint transform; no changed layout footprint | Use when surrounding geometry stays fixed; inspect bounds, clipping, hit testing, pixel quality, and raster time. Not guaranteed GPU-only. |
| Size / alignment / positioned layout | Constraints or geometry may relayout children/siblings | Use when actual flow must change; trace layouts/intrinsics. “Never animate width” is not a valid blanket rule. |
| Opacity / fade | Group blending may need offscreen work; engine optimizations vary | Keep regions bounded; profile overlapping large surfaces. Per-primitive alpha changes blending semantics when primitives overlap. |
| Clip | Shape evaluation and possible antialiasing | Keep necessary clipping; not every clip creates a layer. Avoid `antiAliasWithSaveLayer` unless its output is required. |
| Blur / backdrop / masks / shadows | Sampling, offscreen surfaces, overdraw, effect-area costs | Narrow area and radius only if acceptable; compare raster/GPU traces. Prefer `ImageFiltered` when filtering one child, not its backdrop. |
| Paths / gradients / custom shaders | Geometry, shader execution, and fill costs vary | Cache stable geometry where useful, limit work/area, and profile actual renderer. “Shader” does not prove compilation jank. |
| Large images / textures | Decode, upload, cache and external-memory pressure | Reserve dimensions; decode near display size and selectively precache likely destinations. Inspect first-use versus warm runs. |
| `AnimatedBuilder.child` / immutable children | Less per-tick widget construction/update | Extract expensive invariant content. `const` does not eliminate required layout, paint, or raster work. |
| `RepaintBoundary` | Isolates display-list recording; adds a layer | Use at measured differing repaint frequencies. It does not block rebuild/layout or guarantee raster caching; compare memory and timings. |
| `CustomPainter(repaint: ...)` | Direct paint invalidation without widget rebuild/layout | Use for drawing-only motion; cache stable data, implement `shouldRepaint` correctly, and keep semantics current. |

These are mechanism-based hypotheses, not universal cost rankings. Sources: [Flutter performance best practices](https://docs.flutter.dev/perf/best-practices), [RepaintBoundary](https://api.flutter.dev/flutter/widgets/RepaintBoundary-class.html), [BackdropFilter](https://api.flutter.dev/flutter/widgets/BackdropFilter-class.html), [AnimatedBuilder](https://api.flutter.dev/flutter/widgets/AnimatedBuilder-class.html).

Profile `saveLayer` and offscreen buffers rather than removing effects blindly. For overlapping backdrop filters, do not reuse a backdrop key that combines effects incorrectly. Platform views, video, maps, and WebViews need platform-specific checks under transform, opacity, clipping, snapshotting, and Hero flight.

## Impeller and version-dependent advice

**D/P, documentation checked 2026-08-27:** iOS supports Impeller only. Android API 29+ with Vulkan uses Impeller by default; older or unsupported devices use a legacy OpenGL fallback. The official page states macOS, Linux, and Windows default to Impeller from Flutter 3.47, with temporary opt-outs. Web uses Skia, not Impeller. Verify actual runtime/backend and SDK; never copy these defaults into an older project without checking. [Impeller availability](https://docs.flutter.dev/perf/impeller).

Impeller precompiles its engine shader set; it does not eliminate Dart, geometry, image, filter, compositing, or GPU bottlenecks. Legacy SkSL capture/warm-up is not a universal first-animation fix and does not apply as an Impeller shader remedy. Trace first-use stalls before naming their cause. Custom shader loading/execution still needs profiling. [Rendering performance](https://docs.flutter.dev/perf/rendering-performance).

For web, record CanvasKit/skwasm selection, JS/Wasm build, browser capabilities, and deployment headers. Renderer worker support does not turn Dart `compute` into a background isolate. Do not revive obsolete HTML-renderer advice. [Flutter WebAssembly](https://docs.flutter.dev/platform-integration/web/wasm).

## Dart hot paths and resource efficiency

**D/E:** `async`, `Future`, microtasks, and post-frame callbacks do not move synchronous computation off the current isolate. Keep parsing, large sorts, image processing, logging, and collection copying out of frame callbacks. Use asynchronous I/O directly; move measured CPU-heavy work to an isolate when native transfer/spawn cost is worthwhile. Do not spawn a worker for each tick. Flutter `compute` runs on the main thread on web; use an appropriate web-worker design only when needed. [Dart concurrency](https://dart.dev/language/concurrency), [Flutter isolates](https://docs.flutter.dev/perf/isolates).

Correlate allocation/GC events with bad frames before pooling objects or eliminating ordinary widget allocation. Reuse expensive stable paths/data, bound caches, and inspect retained objects and external image memory. GC cannot reclaim unwanted objects that remain referenced by listeners, closures, or caches. Native debug JIT behavior is not native profile/release AOT behavior; web compilation and profiling differ. [DevTools Memory](https://docs.flutter.dev/tools/devtools/memory), [Flutter build modes](https://docs.flutter.dev/testing/build-modes).

## Architecture and motion tokens

**E:** Reuse the project's design-system accessors and state-management boundaries. Keep semantic target state in the established owner; keep controllers, tickers, gesture progress, and interpolation in the presentation lifecycle. Do not send 120 progress events per second through domain state merely to repaint a transform.

Centralize repeated durations, curves, spring descriptions, and reduced-motion alternatives in existing tokens or a `ThemeExtension`. Name tokens by purpose, such as feedback, content change, or surface settle. Document units and tuning intent; component-specific values are acceptable for distinct geometry or interaction, not unexplained copies of arbitrary constants.

Expose semantic primitives only when reused. Coordinate related properties through one controller and intervals/tween sequences; do not create a global motion manager, a controller per property, or sequential timers for a single transition. Keep meaningful loading state truthful instead of inventing progress.

## Accessibility and reduced motion

**D/P/E:** Observe `MediaQuery.disableAnimationsOf(context)` through the project's context accessor where one exists. React both on entry and when the preference changes while motion is active. `AnimationBehavior.normal` reduces duration; it is not a complete policy for large spatial effects. Unbounded controllers default to `preserve`, and custom `animateWith` simulations need explicit handling. [MediaQuery preference](https://api.flutter.dev/flutter/widgets/MediaQuery/disableAnimationsOf.html), [AnimationBehavior](https://api.flutter.dev/flutter/animation/AnimationBehavior.html).

Replace large travel/zoom/parallax/depth with immediate state or a restrained fade when appropriate; stop decorative repetition instead of making it flash faster. Preserve direct finger-following and ordinary scrolling. Never imply Flutter's single flag exposes every Apple preference independently. Keep status, selection, validation, and progress understandable through persistent content and semantics. [Apple accessibility guidance](https://developer.apple.com/design/human-interface-guidelines/accessibility).

At zero opacity, descendants can still receive pointer hits. Manage visibility, `IgnorePointer`, focus eligibility, and semantics separately; rebuild interaction gates only at meaningful state changes. Do not disable all interaction for the duration of every fade. Check duplicate semantics/focus when outgoing and incoming children coexist. Preserve keyboard activation, screen-reader order, text scaling, RTL, and sufficient contrast without relying on motion. [FadeTransition hit testing](https://api.flutter.dev/flutter/widgets/FadeTransition-class.html).

## Lifecycle and resource management

**D/E:** Create controllers outside `build`, normally in `initState`; update configuration in lifecycle hooks and dispose controllers before `super.dispose`. Use `SingleTickerProviderStateMixin` for one ticker over the state's lifetime, and `TickerProviderStateMixin` for multiple tickers. Remove listeners from externally owned listenables without disposing their owner's object. [AnimationController lifecycle](https://api.flutter.dev/flutter/animation/AnimationController-class.html).

`TickerMode` mutes widget-aware tickers but elapsed time still advances; it is not a paused simulation clock. `Offstage` alone does not stop animations, focus, or CPU work. Explicitly manage decorative/offscreen activity and app background/resume policy, including retained routes and list children. Use the existing lifecycle observer or `AppLifecycleListener`, and dispose it. [TickerMode](https://api.flutter.dev/flutter/widgets/TickerMode-class.html), [Offstage](https://api.flutter.dev/flutter/widgets/Offstage-class.html).

Canceled `TickerFuture`s may never complete normally. If awaiting animation completion, use `.orCancel` with a specific `TickerCanceled` handler, then check mounted/current operation before a UI side effect. Do not hide unrelated exceptions or let stale completion commit an outdated destination. A business operation must complete correctly even if its animation is canceled. [TickerFuture.orCancel](https://api.flutter.dev/flutter/scheduler/TickerFuture/orCancel.html).

## Reference pattern: spring handoff and local rebuilding

This reusable helper takes a project-owned spring and an explicit accessibility decision. It captures velocity before replacement, preserves sign, rejects invalid inputs, and settles immediately for reduced motion. Use an unbounded controller for physical displacement; use a bounded controller only when clipping the trajectory is intentional. `snapToEnd` is available in the validation SDK; verify support in older SDKs.

```dart
import 'package:flutter/animation.dart';
import 'package:flutter/physics.dart';

void settleMotion({
  required AnimationController controller,
  required double target,
  required SpringDescription spring,
  required bool reduceMotion,
  double? velocity,
}) {
  final handoffVelocity = velocity ?? controller.velocity;
  if (!target.isFinite ||
      target < controller.lowerBound ||
      target > controller.upperBound ||
      !handoffVelocity.isFinite ||
      !spring.mass.isFinite ||
      spring.mass <= 0 ||
      !spring.stiffness.isFinite ||
      spring.stiffness <= 0 ||
      !spring.damping.isFinite ||
      spring.damping <= 0) {
    throw ArgumentError('Motion requires a valid target and settling spring.');
  }
  if (reduceMotion) {
    controller.value = target;
    return;
  }
  controller.animateWith(
    SpringSimulation(
      spring,
      controller.value,
      target,
      handoffVelocity,
      snapToEnd: true,
    ),
  );
}

double progressVelocity(double pixelsPerSecond, double signedTravel) {
  if (!pixelsPerSecond.isFinite ||
      !signedTravel.isFinite ||
      signedTravel == 0) {
    throw ArgumentError('Velocity and nonzero travel must be finite.');
  }
  final result = pixelsPerSecond / signedTravel;
  if (!result.isFinite) {
    throw ArgumentError('Normalized velocity must be finite.');
  }
  return result;
}
```

For a progress controller, pass `progressVelocity(details.velocity.pixelsPerSecond.dy, signedTravel)` on release. For a pixel-displacement controller, pass the signed pixel velocity directly. For a programmatic retarget, omit `velocity`. The target-selection policy belongs to the interaction, not this helper. On drag cancellation, do not treat cancellation as a release-to-dismiss.

In the host `State`, create the unbounded controller once with `vsync: this`, stop it when a drag wins, and dispose it. On reduced-motion changes, call the helper with the current semantic target, not a stale endpoint. Rendering can remain local with this complete wrapper:

```dart
import 'package:flutter/widgets.dart';

class MotionTranslation extends StatelessWidget {
  const MotionTranslation({
    required this.offset,
    required this.child,
    super.key,
  });

  final Animation<double> offset;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: offset,
      child: child,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(0, offset.value),
          child: child,
        );
      },
    );
  }
}
```

The wrapper expects logical pixels, not normalized progress. It preserves the child's layout footprint; callers must choose appropriate clipping and hit regions. Add a `RepaintBoundary` around invariant expensive content only if repaint evidence justifies it. For a drawing-only implementation, pass the controller to `CustomPainter(repaint: controller)` and read its value in `paint`; return true from `shouldRepaint` when relevant non-listenable inputs change.

## Profiling workflow and debugging jank

**E:** Record SDK/revision, build mode, device/OS, renderer, observed refresh rate, scenario, content sizes, and cold/warm state. Use physical native devices in profile mode (`flutter run --profile -d DEVICE_ID`); use browser performance tools for web with representative deployment settings. Debug mode is useful for correctness and inspection, not production frame claims. [Flutter profiling](https://docs.flutter.dev/perf/ui-performance), [DevTools Performance](https://docs.flutter.dev/tools/devtools/performance).

| Symptom / question | Inspect | Next experiment |
|---|---|---|
| UI-stage spikes | Timeline, CPU samples, tracked builds/layouts, intrinsics | Localize rebuilding or move identified synchronous computation; compare the same trace scenario. |
| Raster-stage spikes | Paint/layers, effect area, image sizes, GPU/platform tools where available | Temporarily simplify one expensive effect or image to isolate cause; restore required appearance. |
| First-use stutter | Cold vs warm trace; decode/upload, initialization, renderer events | Prepare only likely content; never assume every first stall is shader compilation. |
| Persistent jank | Repeated identical interaction; both stages and device load | Find sustained work, overdraw, concurrent motion, or thermal constraints. |
| Scroll-linked lag | Notification timing, broad listeners, sliver/layout work | Move layout to appropriate scroll/geometry ownership; keep paint effects localized. |
| Route-transition stalls | Both route trees, Hero images, route construction, platform views | Reserve geometry, reduce duplicate active work, inspect first-use content. |
| Allocation/GC-correlated stalls | Memory allocation traces, GC events, external memory | Remove measured churn or retained resources; rerun long repetition. |
| Excessive repaint | Inspector repaint visualization / repaint boundary diagnostics | Test one boundary at differing repaint frequencies; compare memory and raster cost. |

Use Inspector for tree/constraint/repaint investigation, not FPS certification. Enable enhanced build/layout/paint tracing only to locate the cause; it adds overhead. Export traces and compare without intrusive diagnostics. [Flutter Inspector](https://docs.flutter.dev/tools/devtools/inspector).

Capture first-use and repeated runs separately. Compare UI/raster p50/p95/p99, worst frames, over-budget stage counts, memory, and visible interaction continuity using the same device/scenario. Stage counts are not exact displayed-drop counts. Do not claim a speedup from one favorable average or a simulator video. Report missing physical-device, web, or high-refresh validation explicitly.

## Testing motion

**D/E:** In widget tests, start the ticker with `pump()` and advance with deliberate `pump(Duration(...))` calls. One pump advances one frame, not all intervening frames. Assert meaningful intermediate and terminal states. Use bounded `pumpAndSettle` only for finite motion; repeating indicators, queued work, and benchmark frame policies can prevent settling. [Widget testing](https://docs.flutter.dev/cookbook/testing/widget/introduction), [pumpAndSettle](https://api.flutter.dev/flutter/flutter_test/WidgetTester/pumpAndSettle.html).

- Test retarget/reverse from a nonterminal position; signed positive/negative/zero release velocities; cancellation; re-grabbing; and disposal while ticking. Check position continuity and initial simulation velocity, not only eventual arrival.
- Inject reduced motion at startup and during an active spring or route flight. Assert semantic state, focus, and operability remain correct; reset test overrides afterward.
- Test zero/changed extent, RTL, large text, nested navigation/scrolling, back-gesture cancellation, and rapid child replacement where relevant. Include keyboard/pointer alternatives to touch.
- Use goldens for a few deterministic visual states with controlled fonts/images; a golden does not establish timing or native feel. Avoid wall-clock sleeps and network assets in widget tests.
- Use an integration/performance scenario on representative hardware for pacing. Widget tests validate behavior, not GPU throughput, battery, thermal behavior, or touch-to-photon latency.

## Anti-patterns: mechanism, scope, alternative, detection

| Pattern | Why / when harmful | Better alternative; detection |
|---|---|---|
| Screen-wide update every tick | Rebuilds expensive unrelated content during frequent motion | Local transition/listenable and stable child; track builds/CPU. |
| Parsing, sorting, I/O side effects in builders | Blocks or repeats work on frame paths | Precompute/load outside interpolation; inspect timeline and callback callers. |
| Controllers created in `build` / undisposed listeners | Restarts motion or retains ticking resources | Lifecycle ownership; repeated mount/unmount and leak/ticker checks. |
| Restarting from zero or dropping release sign | Teleportation or wrong-way settling during interruption | Capture current value/velocity and signed conversion; gesture tests. |
| Global input lock until animation completion | Prevents cancellation and delays intent | Local duplicate-action guard only when correctness needs it; rapid-input tests. |
| Many loops / controllers in retained list children | Hidden CPU, battery, and allocation work | Animate meaningful visible content, stop decorative loops; offscreen/profile tests. |
| Fullscreen animated blur / stacked translucent surfaces | Large offscreen regions and repeated sampling | Bound effects or simplify with approval; raster/GPU comparison. |
| Blind clips, opacity layers, `saveLayer`, boundaries | Extra work/layers without benefit | Keep only required effects/isolation; inspect layers, memory, and timing. |
| Recreating complex paths/images per frame | Paint, decode/upload, or allocation pressure | Reuse stable data, size assets; paint/memory traces. |
| Long decorative or identical cross-platform motion | Slows frequent actions or violates input/navigation expectations | Purposeful tokens and platform behavior; usability and accessibility review. |
| Debug-only FPS checks / universal 16 ms budget | Misrepresents production and high-refresh performance | Profile actual devices/cadence; compare stage distributions. |
| Folklore-driven optimization | Changes code without finding the expensive stage | Baseline, one mechanism change, repeat measurement; retain evidence. |

## Code review and completion checklist

- Purpose, semantic target ownership, platform conventions, and reduced-motion alternatives are explicit.
- Controller/ticker/listener lifecycle, background policy, cancellation futures, and stale callbacks are correct.
- Gesture direction/units, velocity continuity, bounds, reversal, cancellation, and changed geometry are handled.
- Route identity/results, nested navigators, back gestures, browser history, and Hero state remain intact.
- Rebuild, layout, paint, compositing, raster, allocation, and image costs are distinguished; risks are not mislabeled measured bugs.
- Motion values reuse tokens; business correctness does not depend on visual completion; no unnecessary motion infrastructure was added.
- Focus, semantics, invisible hit targets, reduced motion, RTL, text scale, and non-touch input were checked.
- Analyzer and relevant behavioral tests passed, or failures are disclosed. Performance claims include profile evidence and exact tested coverage.

For a finding, report: **classification → affected interaction/code → observed mechanism/evidence → smallest correction → verification**. If no profile is available, say “behavior checked; performance unmeasured.”

## Curated source index

The inline references above connect individual rules to primary sources. These core sources establish the broader engineering model; Apple-to-Flutter mappings and the workflow are engineering synthesis, not vendor certification.

| Source / organization | What it establishes |
|---|---|
| [Flutter architectural overview — Flutter](https://docs.flutter.dev/resources/architectural-overview) | Framework/engine responsibilities, trees, rendering architecture. |
| [Frame lifecycle — Flutter API](https://api.flutter.dev/flutter/widgets/WidgetsBinding/drawFrame.html) | Ordering of animation, build, layout, paint, composition, semantics, and cleanup. |
| [Animation and motion widgets — Flutter](https://docs.flutter.dev/ui/widgets/animation) | Framework primitives and implementation choices. |
| [Gestures — Flutter](https://docs.flutter.dev/ui/interactivity/gestures) | Pointer versus gesture recognition and gesture-arena behavior. |
| [Physics simulation recipe — Flutter](https://docs.flutter.dev/cookbook/animation/physics-simulation) | Gesture-to-simulation implementation mechanics; not a complete production interaction. |
| [Performance best practices — Flutter](https://docs.flutter.dev/perf/best-practices) | Build/layout costs, lazy construction, clipping, opacity, and offscreen layers. |
| [Impeller — Flutter](https://docs.flutter.dev/perf/impeller) | Renderer availability, platform qualifications, and shader strategy. |
| [Performance view — Flutter DevTools](https://docs.flutter.dev/tools/devtools/performance) | Frame analysis, UI/raster diagnosis, trace instrumentation. |
| [Memory view — Flutter DevTools](https://docs.flutter.dev/tools/devtools/memory) | Allocation, GC, retained objects, and external memory investigation. |
| [Concurrency — Dart](https://dart.dev/language/concurrency) | Event loop, isolates, message passing, and web constraints. |
| [Motion — Apple HIG](https://developer.apple.com/design/human-interface-guidelines/motion) | Purpose, feedback, responsiveness, and interruptible interaction. |
| [Accessibility — Apple HIG](https://developer.apple.com/design/human-interface-guidelines/accessibility) | Motion alternatives, sensitivity, and accessible interaction. |
| [Animate with springs — Apple WWDC23](https://developer.apple.com/videos/play/wwdc2023/10158/) | Position/velocity continuity, spring tuning, perceived versus settling duration. |
| [Testing system accessibility features — Apple](https://developer.apple.com/documentation/accessibility/testing-system-accessibility-features-in-your-app) | Device-level accessibility checks beyond source inspection. |
