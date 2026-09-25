# Web/desktop, profiling, memory, state management, errors, anti-patterns, checklists, and testing

Source lines 2407–3076 from the supplied research guide.

## Contents

- [57. Web](#57-web)
- [58. Desktop](#58-desktop)
- [59. Responsive layouts](#59-responsive-layouts)
- [60. Performance profiling workflow](#60-performance-profiling-workflow)
- [61. Diagnose before changing code](#61-diagnose-before-changing-code)
- [62. `saveLayer`, compositing, and raster work](#62-savelayer-compositing-and-raster-work)
- [63. Memory during transitions](#63-memory-during-transitions)
- [64. Continuous motion and battery](#64-continuous-motion-and-battery)
- [65. Motion design system](#65-motion-design-system)
- [66. State management](#66-state-management)
- [67. Error and edge-case handling](#67-error-and-edge-case-handling)
- [68. Anti-patterns](#68-anti-patterns)
- [69. Performance checklist](#69-performance-checklist)
- [70. Accessibility checklist](#70-accessibility-checklist)
- [71. Navigation checklist](#71-navigation-checklist)
- [72. Testing strategy](#72-testing-strategy)
  - [Widget tests](#widget-tests)
  - [Navigation tests](#navigation-tests)
  - [Golden tests](#golden-tests)
  - [Accessibility tests](#accessibility-tests)
- [73. Reduced-motion widget-test example](#73-reduced-motion-widget-test-example)
- [74. Performance tests](#74-performance-tests)
- [75. Package migration guidance](#75-package-migration-guidance)
- [76. Dependency cost](#76-dependency-cost)
- [77. Platform matrix](#77-platform-matrix)

---
<!-- ORIGINAL_SOURCE_START -->
# 57. Web

The package itself is Flutter-widget code and is published for Web.

But browser/Web performance must still be tested separately.

Current Flutter Web rendering may use CanvasKit or skwasm depending on build/runtime configuration; rendering implementation continues to evolve. Do not encode renderer-specific folklore into generic animation architecture.

For Web verify:

```
browser back/forward
URL synchronization
resize
mouse
keyboard
focus
high-DPI images
first image decode
target browser performance

```

Most importantly:

> Never break Router/browser-history state solely to obtain an `OpenContainer` animation.

---

# 58. Desktop

Mobile-style full-screen spatial travel can feel excessive across a large resizable desktop window even if it is technically smooth.

Review:

- visual travel distance
- mouse interaction
- keyboard focus
- large display dimensions
- multiple window sizes
- reduced-motion settings
- resize during transition.

Do not automatically branch every transition by platform.

Prefer semantic consistency, then adapt only where platform interaction or large-screen scale creates a real UX problem.

---

# 59. Responsive layouts

Do not cache fixed transition geometry based on one screen size.

Test:

```
portrait → landscape
desktop window resize
split-screen
tablet sizes
foldable/responsive breakpoints
text scale changes

```

State identity must remain stable when layout changes.

`OpenContainer` computes against its surrounding Navigator geometry, so large breakpoint changes can materially alter the transform; test them.

---

# 60. Performance profiling workflow

Never optimize animation from debug-mode observations.

Use:

```
flutter run --profile
Flutter DevTools Performance view
Flutter Inspector
frame timeline
rebuild diagnostics
layout diagnostics
oversized image diagnostics
profile/release build on target device

```

Flutter explicitly recommends profile mode for performance analysis, and DevTools' Performance view exposes UI and raster frame behavior.

For Web, use a profile build and appropriate browser tooling in addition to Flutter DevTools.

---

# 61. Diagnose before changing code

If **UI/build time** is high, inspect:

```
large rebuilds
expensive build methods
intrinsic layout
layout churn
synchronous Dart work
large collection transformations

```

If **raster time** is high, inspect:

```
large image surfaces
opacity overlap
clipping
complex shadows
saveLayer effects
custom painting
large transformed regions
filters

```

Flutter's performance tooling is designed to separate these concerns.

If neither is high but interaction feels slow, inspect:

```
network/data latency
input handling
navigation architecture
deliberately excessive duration
blocking synchronous platform work

```

Do not shorten every animation before determining the mechanism.

---

# 62. `saveLayer`, compositing, and raster work

Flutter's performance guidance identifies `saveLayer()` as potentially expensive because it creates an offscreen buffer and can trigger render-target work. It also calls out opacity, clipping, shadows, and related effects as areas to inspect when raster cost is high.

Therefore:

> A transition's visual primitives must be evaluated in the context of the subtree being rendered.

Avoid absolute rules like:

```
transform = free
opacity = always slow
clip = always bad
shadow = impossible

```

Those are not useful engineering models.

---

# 63. Memory during transitions

Outgoing and incoming content may coexist.

This is documented explicitly for:

- `OpenContainer`: open and closed builders coexist during transition.
- switcher-style widgets: rapid replacement can retain multiple outgoing entries. `AnimatedSwitcher` documents this, and `PageTransitionSwitcher` follows the same multi-entry replacement model.

Watch for:

```
two decoded full-screen images
two huge lists
two chart render trees
multiple outgoing video players
large image cache growth
rapidly accumulated transition children

```

Memory pressure can lead indirectly to GC and jank.

---

# 64. Continuous motion and battery

The package's primary patterns are event-driven transitions, which is usually preferable to continuous decoration.

For custom animation surrounding these patterns:

- stop controllers when animation is not visible
- avoid continuously animating static surfaces
- do not render perpetual decorative effects without user value.

CPU/GPU work has battery and thermal cost even when individual frames remain below budget.

---

# 65. Motion design system

For a small application, keep transitions local.

For a large application with repeated motion policy, centralize only meaningful semantics:

```
abstract final class AppMotion {
  static const Duration navigation =
      Duration(milliseconds: 300);

  static const Duration contentReplacement =
      Duration(milliseconds: 240);

  static const Duration transientEntrance =
      Duration(milliseconds: 150);

  static Duration effective(
    BuildContext context,
    Duration duration,
  ) {
    return MediaQuery.disableAnimationsOf(context)
        ? Duration.zero
        : duration;
  }
}

```

Prefer names such as:

```
navigation
contentReplacement
transientEntrance

```

over:

```
duration300
curve1
animationTypeB

```

But do not centralize one-off transitions prematurely.

---

# 66. State management

Bloc/Cubit/Riverpod/ChangeNotifier/business state should contain concepts such as:

```
selectedDestination
currentStep
previousStep
selectedItemId
dialogVisible
navigation state

```

Presentation derives:

```
which child
which key
which semantic direction
which transition

```

Do not put:

```
AnimationController
Tween
CurvedAnimation
Ticker

```

inside long-lived domain/business state.

---

# 67. Error and edge-case handling

Common animation-related failures are architecture/state defects rather than recoverable “animation errors.”

Handle root causes:

| FailureCorrect response                |                                           |
| -------------------------------------- | ----------------------------------------- |
| Context disposed after `await`         | Check `context.mounted`                   |
| Same content never transitions         | Fix semantic child key                    |
| State resets unexpectedly              | Remove unstable key                       |
| Duplicate `GlobalKey` in OpenContainer | Use distinct widget keys                  |
| Deep link missing from URL             | Preserve Router-owned route               |
| Modal closes wrong Navigator           | Configure/use correct Navigator           |
| Destination data missing               | Render loading/error state                |
| Double push                            | Make interaction idempotent/guard locally |
| Jank                                   | Profile build/layout/raster/image work    |
| Animation breaks reduced motion        | Implement explicit reduced-motion path    |

Do not wrap navigation/animation code in broad silent `try/catch`.

---

# 68. Anti-patterns

Reject these patterns:

```
Animate every state change.

Use OpenContainer because it looks cool even when screens are unrelated.

Use SharedAxis for arbitrary tabs with no sequence.

Assume horizontal SharedAxis automatically mirrors for RTL.

Set reverse only from physical left/right coordinates.

Use FadeThrough when strong same-object continuity exists.

Use FadeScale for every full-screen route.

Install animations to avoid understanding AnimatedSwitcher.

Generate UniqueKey() every build.

Put repository/network calls in transitionBuilder.

Create AnimationController in Bloc state.

Depend on AnimationStatus.completed for critical persistence.

Decode a 4K network image for the first time when the transition begins.

Preload every full-resolution list image.

Wrap huge lazy lists in eager transition structures.

Animate IntrinsicHeight/IntrinsicWidth-heavy layouts unnecessarily.

Combine Hero + OpenContainer without a deliberate choreography.

Override every platform page transition globally without testing back gestures.

Break Router/browser history to get a container transform.

Request 700 ms navigation because it looks cinematic.

Randomly change easing to "fix" jank.

Claim transform is always GPU-cheap.

Claim opacity is always slow.

Micro-optimize Tween allocation while image decode dominates raster time.

Judge performance from debug mode.

Assume 16.67 ms is enough on 120 Hz devices.

Ignore reduced-motion settings.

Communicate essential state only through animation.

Use large mobile spatial travel unchanged across enormous desktop windows.

Build AnimationRepository → MotionUseCase → MotionManager just to wrap FadeThroughTransition.

```

---

# 69. Performance checklist

Before approving motion:

-  Does motion communicate something useful?
-  Is the chosen pattern semantically correct?
-  Is duration appropriate for interaction frequency?
-  Is reduced motion handled?
-  Are semantic keys stable?
-  Is destination data requested outside transition builders?
-  Are large subtrees rebuilding on animation ticks?
-  Is intrinsic layout involved?
-  Are list/sliver virtualization properties preserved?
-  Are large images first decoding during the transition?
-  Are decoded image dimensions reasonable?
-  Do both heavy outgoing/incoming screens coexist?
-  Are clips complex?
-  Are large shadows animating?
-  Is there a filter/saveLayer-heavy path?
-  Are platform views involved?
-  Was the flow tested in profile/release mode?
-  Were UI and raster timings inspected separately?
-  Was the real production-shaped screen tested?
-  Were representative low/mid-range devices tested?
-  Was high-refresh behavior considered where relevant?
-  Was Web/desktop tested if shipped?

---

# 70. Accessibility checklist

-  `MediaQuery.disableAnimationsOf(context)` is respected.
-  Large movement is removed/simplified when necessary.
-  Essential state remains understandable with zero animation.
-  RTL horizontal direction is semantically correct.
-  Keyboard activation works.
-  Focus reaches the correct destination.
-  Back navigation still works.
-  Screen-reader reading order remains logical.
-  Temporary outgoing/incoming widgets do not create confusing duplicate semantics.
-  High-contrast state remains understandable.
-  Motion does not block interaction unnecessarily.
-  Animation does not continuously distract.
-  Touch/mouse/keyboard produce equivalent navigation meaning.

---

# 71. Navigation checklist

-  Existing Navigator/Router architecture inspected.
-  Route state remains authoritative.
-  Browser URL/history preserved when required.
-  Deep links still reproduce the destination.
-  Nested Navigator target is deliberate.
-  `useRootNavigator` is deliberate.
-  Push/pop semantics match visual forward/reverse direction.
-  Android predictive-back behavior tested where relevant.
-  iOS back gesture/platform transition expectation reviewed.
-  Animation doesn't create a second, hidden navigation model.

---

# 72. Testing strategy

## Widget tests

Test meaningful states:

```
initial
transition started
midpoint if visually/semantically relevant
final
reverse
reduced-motion

```

Use deterministic pumps when possible.

Flutter's `pumpAndSettle()` repeatedly pumps until no frames remain and can time out with continuously scheduled animation; the framework documentation specifically recommends deliberate frame pumping where exact timing behavior matters.

For known transitions:

```
await tester.pump();
await tester.pump(const Duration(milliseconds: 150));

```

can be more deterministic than blindly settling everything.

## Navigation tests

Validate:

```
push
pop
route result
back
nested navigator
deep link/restoration where relevant

```

## Golden tests

Useful snapshots:

```
resting source
meaningful transition midpoint
resting destination
reduced-motion resting state

```

Do not create golden files for every animation frame.

## Accessibility tests

Wrap the widget with:

```
MediaQuery(
  data: const MediaQueryData(
    disableAnimations: true,
  ),
  child: ...
)

```

and verify navigation/state remains correct.

---

# 73. Reduced-motion widget-test example

```
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'SaveStatus reaches the correct state with animations disabled',
    (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: MediaQuery(
            data: MediaQueryData(disableAnimations: true),
            child: Scaffold(
              body: SaveStatus(saved: true),
            ),
          ),
        ),
      );

      expect(find.text('Saved'), findsOneWidget);
      expect(find.text('Unsaved'), findsNothing);
    },
  );
}

```

The test validates product meaning, not whether Flutter internally implements opacity interpolation correctly.

---

# 74. Performance tests

For critical motion flows, use representative integration/profile traces.

Measure real:

```
screen complexity
images
production list lengths
theme
responsive layout
actual hardware

```

Avoid synthetic benchmarks containing only:

```
Container → Container

```

when the production transition actually contains:

```
large list → image-heavy details + chart + platform view

```

Current Flutter performance metrics include build/raster timing distributions rather than relying on a single average.

Inspect percentile/worst-frame behavior, not only “average FPS.”

---

# 75. Package migration guidance

Before changing `animations` versions:

1. inspect `pubspec.lock`
2. read changelog from installed → target version
3. inspect matching package tag rather than only `main`
4. inspect Flutter/Dart minimums
5. run analyzer
6. inspect package example
7. test route/back behavior
8. test reduced motion
9. profile representative transitions.

Relevant historical changes include:

- null-safety migration in 2.0
- route settings/filter additions to modal support
- internal transition implementation changes
- migration to Flutter `Easing`
- increasing Flutter/Dart minimums
- public `OpenContainerState`
- clarified `onClosed` lifecycle semantics
- `OpenContainer` custom shadow support.

Do not copy an old Material Motion tutorial without compiling it against the repository's installed SDK.

---

# 76. Dependency cost

Current package metadata lists Flutter as its runtime dependency; it is an official Flutter package and does not introduce a native plugin runtime just to perform these animations.

Still consider:

```
dependency maintenance
upgrade compatibility
API surface
design-system consistency
cognitive cost

```

Do not claim a meaningful exact binary-size cost or saving without measurement.

Tree shaking and compiler optimization make simplistic source-code-size reasoning unreliable.

---

# 77. Platform matrix

Because these APIs are Flutter widgets rather than platform-channel integrations, the package itself publishes across all standard Flutter targets.

| CapabilityAndroidiOSmacOSWindowsLinuxWeb |           |           |           |           |           |           |
| ---------------------------------------- | --------- | --------- | --------- | --------- | --------- | --------- |
| `OpenContainer`                          | Supported | Supported | Supported | Supported | Supported | Supported |
| Shared axis                              | Supported | Supported | Supported | Supported | Supported | Supported |
| Fade through                             | Supported | Supported | Supported | Supported | Supported | Supported |
| Fade scale                               | Supported | Supported | Supported | Supported | Supported | Supported |
| `PageTransitionSwitcher`                 | Supported | Supported | Supported | Supported | Supported | Supported |
| `showModal`                              | Supported | Supported | Supported | Supported | Supported | Supported |
| Rendering cost identical                 | No        | No        | No        | No        | No        | No        |
| Interaction convention identical         | No        | No        | No        | No        | No        | No        |

"Supported" means the Flutter widget API is available.

It does **not** mean:

```
same motion is ideal on all platforms
same rendering backend
same input model
same native back convention
same window size
same platform-view composition

```

---

