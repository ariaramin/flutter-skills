# Testing and runnable examples

## What is bundled

`examples/` contains a small Flutter test package using SDK dependencies only:

- `lib/spring_handoff.dart`: validated spring handoff, signed normalized velocity, reduced-motion settling.
- `lib/motion_translation.dart`: local `AnimatedBuilder` with an invariant child.
- `lib/motion_fade_transition.dart`: custom transition-builder fragment with a live reduced-motion branch; not a full route implementation.
- `lib/spring_offset.dart`: complete presentation lifecycle for a state-driven pixel offset, including retargeting and changing accessibility preference.
- `test/motion_test.dart`: executable regression checks for the examples.

The examples demonstrate mechanisms, not a finished draggable sheet, navigation system, or universal Apple spring. Use the host project's design tokens and layout/input policy. Do not introduce a new state-management dependency to use them.

## Run the checks

After extracting a copy of the package, run from `references/examples/`:

```sh
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze --no-pub
flutter test --no-pub
```

The example package targets the authoring validation baseline, Dart 3.13 / Flutter 3.47. That floor is not a claim that every demonstrated API was introduced there. Check the target application's SDK before porting examples. `pub get` creates local generated dependency files; do not package its caches or build outputs back into the skill.

## Test contracts

Use explicit frame advancement rather than wall-clock sleeps. Start a ticker with `pump()` before advancing fake time. A duration pump produces one test frame, not all intervening frames. Compare spring intermediate values and velocities with unit-appropriate numerical tolerances; compare exact endpoints only where snapping is part of the contract.

The helper checks signed velocity, invalid/zero travel, overflow, current-position and velocity handoff, retargeting, reduced-motion settling, and final arrival. Widget checks distinguish invariant-child construction from required transform updates and verify live accessibility changes.

The lifecycle example starts at the supplied resting offset. It animates subsequent target changes and preserves current spring velocity when retargeted. Turning reduced motion on settles to the current target; turning it off does not replay a finished transition. Unmounting while it runs must not leave an active ticker.

Sources: [widget testing](https://docs.flutter.dev/cookbook/testing/widget/introduction), [pumpAndSettle](https://api.flutter.dev/flutter/flutter_test/WidgetTester/pumpAndSettle.html), [controller lifecycle](https://api.flutter.dev/flutter/animation/AnimationController-class.html).

## Required host integration coverage

Bundled unit/widget checks cannot validate application-specific gesture ownership. Extend the host's existing tests at the relevant boundary:

| Interaction | Coverage |
|---|---|
| Drag/release | Positive, negative and zero velocity; threshold edges; actual endpoint travel. |
| Interruption | Re-grab, reverse twice, cancel, stale completion, disposal while ticking. |
| Geometry | Zero extent, resize/rotation, keyboard insets, content insertion, text scaling. |
| Nested scroll | Content at beginning/middle/end; gesture-arena loss; sheet/scroll handoff. |
| Navigation | Push/pop/result, canceled back gesture, nested router, browser back/forward, restoration. |
| Shared element | Destination ready on first frame, image aspect ratio, theme difference, redirect, reduced motion. |
| Accessibility | Preference on entry and during motion, focus, screen reader, hidden hits, keyboard dismissal. |
| Platform | Touch, mouse, wheel, trackpad, RTL, supported screen sizes and platforms. |

Use a few deterministic golden states where visual geometry matters. Control fonts, image readiness, dimensions, and animation time. Avoid network images and real delays in widget tests. Do not make one indefinite `pumpAndSettle` wait for decorative loops to finish.

## Validation boundary

Passing these tests demonstrates the tested numerical and widget behaviors. It does not establish application-wide accessibility, physical-device frame pacing, native-back correctness, Apple parity, battery efficiency, thermal behavior, or performance improvements.

Profile the actual application on representative devices using the profiling playbook. A behavioral skill evaluation is also not a device benchmark: evaluate whether the agent chooses appropriate APIs, catches lifecycle/units mistakes, distinguishes evidence from speculation, and states its validation limits.
