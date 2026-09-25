# Foundations, package scope, semantic selection, and decision framework

Source lines 1–349 from the supplied research guide.

## Contents

- [`skill.md` — Production-Grade Flutter Motion with `animations`](#skillmd-production-grade-flutter-motion-with-animations)
  - [1. Purpose](#1-purpose)
- [2. Research baseline and version contract](#2-research-baseline-and-version-contract)
- [3. AI coding-agent operating rules](#3-ai-coding-agent-operating-rules)
- [4. Repository reconnaissance](#4-repository-reconnaissance)
- [5. Package scope](#5-package-scope)
- [6. When `animations` is the correct abstraction](#6-when-animations-is-the-correct-abstraction)
- [7. `animations` versus built-in Flutter APIs](#7-animations-versus-built-in-flutter-apis)
- [8. Material motion as semantic information](#8-material-motion-as-semantic-information)
  - [Container continuity](#container-continuity)
  - [Shared spatial relationship](#shared-spatial-relationship)
  - [Equivalent replacement](#equivalent-replacement)
  - [Transient entrance/exit](#transient-entranceexit)
- [9. Transition-selection decision table](#9-transition-selection-decision-table)
- [10. Decision framework before implementation](#10-decision-framework-before-implementation)

---
<!-- ORIGINAL_SOURCE_START -->
# `skill.md` — Production-Grade Flutter Motion with `animations`

> Specification implemented from the supplied research brief.

## 1. Purpose

Use this skill when an AI coding agent must select, implement, review, debug, optimize, migrate, or test motion built with Flutter's official `animations` package.

The governing principle is:

> **Motion is part of interaction architecture, not decoration. Select motion from the semantic relationship between UI states, use the smallest animation abstraction that communicates that relationship clearly, preserve navigation and state identity, respect reduced-motion preferences, and optimize the actual rendering pipeline rather than blindly micro-optimizing animation objects.**

A transition is not production-ready merely because it looks attractive on one device.

Production-quality Flutter motion must preserve:

- navigation correctness
- state identity
- back behavior
- accessibility
- RTL semantics
- responsive layout
- frame delivery
- memory limits
- interaction responsiveness
- platform conventions
- maintainability.

---

# 2. Research baseline and version contract

Research baseline: **August 2026**.

The current published stable package is:

```
dependencies:
  animations: ^2.2.0

```

`animations` 2.2.0 is published by `flutter.dev` and declares support for Android, iOS, Linux, macOS, Web, and Windows. It is a Flutter widget package rather than a platform-channel plugin.

The published 2.2.0 line inherits the Flutter/Dart floor introduced in 2.1.2: **Flutter 3.35 / Dart 3.9**. The current Flutter Packages repository's `NEXT` changelog already records a forthcoming move to **Flutter 3.38 / Dart 3.10**, so repository `main`can be ahead of the currently published archive even while its package version still reads 2.2.0.

Therefore:

> **Never infer the repository's actual compatibility from this skill, pub.dev's latest page, or GitHub ****`main`****alone. Read the repository's ****`pubspec.lock`****, resolved package version, Flutter SDK, and matching package tag before editing code.**

Current 2.2.0 added `closedShadows` and `openShadows` to `OpenContainer`. Recent historical changes also include publication of `OpenContainerState`, migration of motion curves to Flutter's `Easing` API, and internal `OpenContainer` rendering changes away from a directly animated `Opacity` widget.

No current symbol in the 2.2.0 public package index is marked deprecated. The present public surface includes `OpenContainer`, `SharedAxisTransition`, `FadeThroughTransition`, `FadeScaleTransition`, `PageTransitionSwitcher`, two page-transition builders, modal APIs, and associated configuration/enums/typedefs.

---

# 3. AI coding-agent operating rules

When working on Flutter motion:

1. Inspect the repository before introducing another animation pattern.
2. Verify the installed `animations` version.
3. Determine what state or navigation relationship motion communicates.
4. Decide whether motion is useful before choosing an animation.
5. Prefer a built-in Flutter animation when it solves the problem more simply.
6. Use `OpenContainer` only when source and destination have meaningful container continuity.
7. Use `SharedAxisTransition` only when an ordered, directional, or hierarchical relationship exists.
8. Use `FadeThroughTransition` when equivalent-level content is being replaced without strong spatial continuity.
9. Use `FadeScaleTransition` for appropriate transient content entering or leaving within the current visual bounds.
10. Use stable semantic keys.
11. Never generate `UniqueKey()` on every build merely to force animation.
12. Keep navigation state authoritative; animation must not invent navigation state.
13. Treat semantic forward/backward separately from physical left/right.
14. Handle RTL explicitly where a transition does not do so.
15. Respect `MediaQuery.disableAnimationsOf(context)`.
16. Never encode essential meaning exclusively through motion.
17. Keep network, repository, database, and domain operations outside transition builders.
18. Avoid first-time high-resolution image decoding on a latency-critical transition path when practical.
19. Do not place `AnimationController` objects in Bloc/Riverpod/domain state.
20. Do not rely on animation completion for critical business correctness.
21. Do not judge animation performance in debug mode.
22. Profile production-shaped screens in profile/release mode.
23. Diagnose build, layout, paint, rasterization, image, and platform-view costs before blaming the transition widget.
24. Do not claim a transform, opacity, clip, or shadow is universally "cheap."
25. Motion should improve comprehension or perceived interaction quality; otherwise remove it.

---

# 4. Repository reconnaissance

Before changing animation code inspect:

```
pubspec.yaml
pubspec.lock
Flutter SDK version
Dart SDK version
animations package version

navigation/router setup
Navigator / Router usage
PageTransitionsTheme
design system
ThemeData / ColorScheme
motion tokens
responsive breakpoints
state management
accessibility utilities

existing:
  OpenContainer
  SharedAxisTransition
  FadeThroughTransition
  FadeScaleTransition
  PageTransitionSwitcher
  AnimatedSwitcher
  AnimatedCrossFade
  Hero
  AnimatedContainer
  TweenAnimationBuilder
  AnimationController
  PageRouteBuilder
  custom Page classes
  custom TransitionBuilder
  MediaQuery.disableAnimations

```

Also inspect performance-sensitive content:

```
large lists
slivers
images
video
maps
web views
platform views
intrinsic layout
custom painting
shadows
clipping
BackdropFilter
Opacity
saveLayer-triggering effects

```

Search tests for assumptions about transition timing and `pumpAndSettle()`.

Do not introduce a second motion system merely because this package is available.

---

# 5. Package scope

The package implements prebuilt Material motion patterns. Current official documentation identifies four conceptual patterns:

- container transform
- shared axis
- fade through
- fade.

The primary public APIs are:

| APIRole                             |                                                   |
| ----------------------------------- | ------------------------------------------------- |
| `OpenContainer<T>`                  | Container transform plus route push               |
| `OpenContainerState<T>`             | Programmatic container opening                    |
| `SharedAxisTransition`              | Shared x/y/z-axis content transition              |
| `SharedAxisPageTransitionsBuilder`  | Shared-axis `MaterialPageRoute` theme transition  |
| `FadeThroughTransition`             | Equivalent-content replacement                    |
| `FadeThroughPageTransitionsBuilder` | Fade-through `MaterialPageRoute` theme transition |
| `FadeScaleTransition`               | Transient fade/scale pattern                      |
| `FadeScaleTransitionConfiguration`  | Fade-scale modal route configuration              |
| `showModal<T>()`                    | Modal route using configurable package transition |
| `ModalConfiguration`                | Base configuration for modal transitions          |
| `PageTransitionSwitcher`            | Push/pop-style replacement of children            |
| `ContainerTransitionType`           | `OpenContainer` fade strategy                     |
| `SharedAxisTransitionType`          | horizontal, vertical, scaled                      |

The full current public index confirms these classes, enums, function, and callback typedefs.

The package does **not** provide:

- a state-management architecture
- a routing architecture
- a generic timeline editor
- physics simulations for arbitrary product motion
- continuous background animation infrastructure
- a performance guarantee
- automatic semantic transition selection
- automatic RTL correctness for every custom pattern
- a universal replacement for Flutter's built-in animations.

---

# 6. When `animations` is the correct abstraction

Use this package when the **semantic motion pattern itself** is valuable.

Good candidates:

```
card → details
list item → expanded details
search field → expanded search

ordered onboarding page → next onboarding page
wizard step → next step
parent → child hierarchy

navigation destination A → equivalent destination B
account A → account B
refreshing equivalent content

dialog/menu/transient surface entrance

```

Prefer Flutter's built-in APIs when the problem is simpler.

Examples:

```
color changes
padding changes
one widget fades in/out
simple counter replacement
expand/collapse one property
one shared image across an already-owned route transition
one-off custom route transition
fully bespoke animation choreography

```

---

# 7. `animations` versus built-in Flutter APIs

| ToolBest semantic fitControlNavigation ownershipComplexity |                                          |            |                          |             |
| ---------------------------------------------------------- | ---------------------------------------- | ---------- | ------------------------ | ----------- |
| `AnimatedContainer` / implicit widgets                     | One/few properties change                | Low        | None                     | Lowest      |
| `AnimatedSwitcher`                                         | Simple child replacement                 | Low-medium | None                     | Low         |
| `TweenAnimationBuilder`                                    | One custom animated value                | Medium     | None                     | Low         |
| `Hero`                                                     | One shared visual element between routes | Medium     | Existing Navigator route | Medium      |
| `animations`                                               | Material semantic transition pattern     | Medium     | Depends on API           | Medium      |
| Explicit `AnimationController`                             | Bespoke lifecycle/choreography           | High       | None unless integrated   | High        |
| `PageRouteBuilder`                                         | Bespoke route transition                 | High       | Owns route               | Medium-high |

`AnimatedSwitcher`, for example, already cross-fades changed children and determines identity using widget type and key; it does not need `animations` merely to perform a basic replacement.

Use the smallest abstraction that communicates the intended relationship.

---

# 8. Material motion as semantic information

Do not select a transition by asking:

> Which one looks nicest?

Ask:

> What relationship must the user understand?

## Container continuity

Use a container transform when a source container and destination represent the **same conceptual thing in different representations**.

Examples:

```
product card → product detail
message row → full message
thumbnail editor tile → editor
search field → expanded search

```

The motion communicates continuity.

## Shared spatial relationship

Shared axis communicates ordering or hierarchy.

Examples from the package guidance include horizontal onboarding, vertical steppers, and scaled parent-child navigation.

## Equivalent replacement

Fade through communicates:

> The old content is leaving; another peer-level piece of content replaces it.

It deliberately does not assert strong spatial continuity. Official examples include destination switching, refreshing, and account switching.

## Transient entrance/exit

Fade scale communicates a bounded transient element appearing/disappearing, such as a dialog or menu. The package describes entering content as fading and scaling from 80% to full size, with exiting content fading away.

---

# 9. Transition-selection decision table

| PatternSemantic relationshipSpatial meaningTypical navigationGood exampleAvoid when |                              |                    |                            |                        |                                |
| ----------------------------------------------------------------------------------- | ---------------------------- | ------------------ | -------------------------- | ---------------------- | ------------------------------ |
| `OpenContainer`                                                                     | Same conceptual container    | Strong             | Source → detail            | Card → detail          | Screens unrelated              |
| Shared axis horizontal                                                              | Ordered sequential           | Strong directional | Next/previous              | Onboarding             | Arbitrary tab switch           |
| Shared axis vertical                                                                | Ordered vertical progression | Strong directional | Step progression           | Form wizard            | No sequence                    |
| Shared axis scaled                                                                  | Hierarchical/depth           | Parent-child       | Parent → child             | Category → subcategory | Peer replacement               |
| Fade through                                                                        | Peer/equivalent replacement  | Weak               | Destination/content switch | Navigation destination | Same-object continuity         |
| Fade scale                                                                          | Transient enter/exit         | Local depth        | Modal/transient            | Dialog                 | Full unrelated navigation      |
| No/package-free transition                                                          | No useful motion semantic    | None               | Any                        | Status text change     | When strong continuity matters |

If none communicates useful information, use simpler motion or no animation.

---

# 10. Decision framework before implementation

Answer:

```
1. What state/navigation relationship is changing?
2. Are source and destination the same conceptual object?
3. Is one container expanding into another?
4. Are states ordered or sequential?
5. Is there hierarchy/depth?
6. Are contents simply peers being replaced?
7. Is this only transient UI?
8. Does motion improve orientation?
9. Would no animation be clearer?
10. Is this navigation or in-place state replacement?
11. Who owns route state?
12. Is direction semantically meaningful?
13. Must horizontal direction mirror in RTL?
14. Is reduced motion requested?
15. Are outgoing/incoming subtrees expensive?
16. Are large images or platform views involved?
17. Does the target include desktop/Web?
18. Does the interaction happen frequently enough that animation latency matters?
19. Can a built-in Flutter widget solve this more simply?
20. Has the real screen been profiled?

```

Only then select the transition.

---
