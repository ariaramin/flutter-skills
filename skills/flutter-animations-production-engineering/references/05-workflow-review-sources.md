# Implementation workflow, completion criteria, review heuristics, source references, and final principle

Source lines 3077–3405 from the supplied research guide.

## Contents

- [78. Implementation workflow](#78-implementation-workflow)
  - [Step 1 — Inspect](#step-1-inspect)
  - [Step 2 — Describe the relationship](#step-2-describe-the-relationship)
  - [Step 3 — Decide whether motion is needed](#step-3-decide-whether-motion-is-needed)
  - [Step 4 — Choose the smallest API](#step-4-choose-the-smallest-api)
  - [Step 5 — Choose semantic pattern](#step-5-choose-semantic-pattern)
  - [Step 6 — Design identity](#step-6-design-identity)
  - [Step 7 — Preserve navigation](#step-7-preserve-navigation)
  - [Step 8 — Implement accessibility](#step-8-implement-accessibility)
  - [Step 9 — Protect frame-sensitive work](#step-9-protect-frame-sensitive-work)
  - [Step 10 — Validate images/layout](#step-10-validate-imageslayout)
  - [Step 11 — Test navigation](#step-11-test-navigation)
  - [Step 12 — Profile](#step-12-profile)
  - [Step 13 — Run quality gates](#step-13-run-quality-gates)
  - [Step 14 — Re-evaluate the design](#step-14-re-evaluate-the-design)
- [79. Completion criteria](#79-completion-criteria)
- [80. Quick decision table](#80-quick-decision-table)
- [81. Senior review heuristics](#81-senior-review-heuristics)
    - [Semantics](#semantics)
    - [Identity](#identity)
    - [Navigation](#navigation)
    - [Accessibility](#accessibility)
    - [Rendering](#rendering)
    - [Architecture](#architecture)
- [82. Source references](#82-source-references)
    - [`animations` package](#animations-package)
    - [Flutter framework](#flutter-framework)
    - [Flutter performance](#flutter-performance)
- [83. Non-negotiable engineering principle](#83-non-negotiable-engineering-principle)

---
<!-- ORIGINAL_SOURCE_START -->
# 78. Implementation workflow

## Step 1 — Inspect

Read:

```
package versions
Flutter SDK
navigation
existing motion
theme/design system
accessibility helpers
target platforms
performance-sensitive screens

```

## Step 2 — Describe the relationship

State in plain language:

```
"This card becomes its details page."
"These are sequential wizard steps."
"These are unrelated peer destinations."
"This dialog enters within the current screen."

```

If this sentence is unclear, transition selection is premature.

## Step 3 — Decide whether motion is needed

Remove motion if it does not improve:

```
orientation
continuity
hierarchy
feedback
state comprehension

```

## Step 4 — Choose the smallest API

Order of consideration:

```
no animation
implicit Flutter animation
AnimatedSwitcher
TweenAnimationBuilder
Hero
animations package pattern
PageRouteBuilder
explicit AnimationController/custom animation

```

Not every problem should progress to the bottom.

## Step 5 — Choose semantic pattern

When using `animations`:

```
container continuity → OpenContainer
ordered/spatial relationship → SharedAxis
equivalent replacement → FadeThrough
transient bounded entrance → FadeScale

```

## Step 6 — Design identity

Choose stable keys from business/presentation identity.

## Step 7 — Preserve navigation

Ensure visual transition follows route state rather than replacing it.

## Step 8 — Implement accessibility

Handle:

```
disableAnimations
RTL
focus
keyboard
semantics
high contrast

```

## Step 9 — Protect frame-sensitive work

Keep outside transition builders:

```
network
database
large JSON parsing
expensive synchronous transforms
repeated state initialization

```

## Step 10 — Validate images/layout

Inspect:

```
decode dimensions
precache policy
lazy lists
intrinsics
clipping
shadows
platform views

```

## Step 11 — Test navigation

Exercise:

```
push
pop
back gesture
rapid interaction
nested navigator
deep links
browser history

```

as applicable.

## Step 12 — Profile

Use profile/release mode on production-shaped screens.

## Step 13 — Run quality gates

Run the repository's:

```
dart format
flutter analyze
unit/widget tests
navigation tests
accessibility tests
goldens where useful
integration/performance tests where useful

```

## Step 14 — Re-evaluate the design

Ask:

> Does this motion make interaction clearer than the same interaction without it?

If not, simplify or remove it.

---

# 79. Completion criteria

Motion is complete only when:

-  installed `animations` version was verified
-  Flutter/Dart compatibility was verified
-  semantic purpose is clear
-  simpler built-in alternatives were considered
-  correct package pattern was selected
-  navigation state remains authoritative
-  stable semantic keys are used
-  forward/back semantics are correct
-  horizontal RTL behavior is correct
-  reduced-motion preference is respected
-  state remains understandable without animation
-  focus and keyboard behavior remain correct
-  screen-reader semantics were considered
-  business logic is independent from animation completion
-  no network/repository side effects occur in transition builders
-  large subtrees do not unnecessarily rebuild each animation tick
-  large images are decoded intentionally
-  outgoing/incoming coexistence fits memory constraints
-  clipping/shadows/layout costs were reviewed
-  platform views were tested where present
-  desktop/Web interaction was reviewed when shipped
-  route/back/browser-history behavior is correct
-  performance was measured outside debug mode
-  UI/raster bottlenecks were distinguished
-  representative target devices perform acceptably
-  analyzer passes
-  relevant tests pass.

---

# 80. Quick decision table

| RequirementPreferred starting point         |                             |
| ------------------------------------------- | --------------------------- |
| Change color/size/padding                   | Built-in implicit animation |
| Replace one small widget                    | `AnimatedSwitcher`          |
| Animate one custom numeric property         | `TweenAnimationBuilder`     |
| Shared image/avatar between existing routes | `Hero`                      |
| Card becomes details                        | `OpenContainer`             |
| Next/previous ordered content               | Shared axis                 |
| Parent/child depth transition               | Shared axis scaled          |
| Equivalent destination replacement          | Fade through                |
| Transient dialog/menu-like surface          | Fade scale                  |
| Bespoke route choreography                  | `PageRouteBuilder`          |
| Complex scrubbed choreography               | Explicit controller         |
| Motion adds no comprehension                | No animation                |

---

# 81. Senior review heuristics

When reviewing a pull request, ask:

### Semantics

```
Why this transition?
What relationship does it communicate?
Could no motion be clearer?

```

### Identity

```
Why this key?
Will state survive?
Could rapid rebuilding create outgoing duplicates?

```

### Navigation

```
Who owns route state?
Does back work?
Does Web URL state still work?
Does OpenContainer accidentally create pageless navigation?

```

### Accessibility

```
What happens with disableAnimations?
What does RTL do?
Where does focus land?
Can the state be understood instantly?

```

### Rendering

```
What rebuilds every tick?
What lays out every tick?
How many decoded images coexist?
Are clips/shadows/filters large?
What does DevTools say?

```

### Architecture

```
Why is business logic inside this builder?
Why is an AnimationController inside domain state?
Why does this require another manager/service layer?

```

A good review comment identifies the mechanism, not a superstition.

---

# 82. Source references

The research for this skill prioritizes current first-party sources:

### `animations` package

- Current published package page, supported platforms, Material motion pattern definitions, and package dependency metadata.
- Current public 2.2.0 API index.
- Current package changelog and upcoming SDK-floor change.
- Current `OpenContainer` implementation and API semantics.
- Current `SharedAxisTransition` implementation.
- Current `PageTransitionSwitcher` documentation.
- Current fade-through route-transition API.
- Current `FadeScaleTransition` API/implementation.
- Current modal implementation.

### Flutter framework

- Current Flutter navigation and routing guidance.
- Current `AnimatedSwitcher` identity/replacement behavior.
- Current `AnimatedBuilder` subtree-reuse optimization.
- Current `Hero` behavior and route-overlay model.
- Current `MediaQuery.disableAnimationsOf` API.
- Current animation accessibility behavior.
- Flutter Material 3 migration status.
- Current predictive-back transition APIs and platform adaptation guidance.

### Flutter performance

- Official Flutter performance best practices.
- Current DevTools Performance view guidance.
- Current frame-performance metrics guidance.
- Current Flutter `Image` behavior/API documentation.

---

# 83. Non-negotiable engineering principle

> **Do not animate because an animation API exists. Determine the semantic relationship first. Preserve route and state identity. Respect accessibility. Keep heavy work out of frame-sensitive code. Profile build, layout, paint, rasterization, images, and platform surfaces independently. Use ****`animations`**** only when one of its Material motion patterns genuinely improves how the user understands the interaction.**