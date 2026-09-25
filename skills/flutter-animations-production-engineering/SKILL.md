---
name: flutter-animations-production-engineering
description: Design, implement, review, debug, test, optimize, and migrate production Flutter motion using the official animations package. Use this skill whenever a Flutter task involves OpenContainer, SharedAxisTransition, FadeThroughTransition, FadeScaleTransition, PageTransitionSwitcher, Material motion selection, route transitions, animation accessibility/RTL, reduced motion, jank, image-heavy transitions, Router/deep-link preservation, or deciding whether animations is simpler than AnimatedSwitcher, Hero, implicit animations, PageRouteBuilder, or a custom controller—even for a request as simple as “add a smooth transition.”
compatibility: Source baseline targets animations 2.2.0 and its August 2026 behavior. Always inspect the repository's Flutter/Dart SDKs, pubspec.lock, installed animations version, navigation architecture, and matching package tag before using version-sensitive APIs or route behavior.
---

# Flutter `animations` Production Engineering

Treat motion as **interaction architecture**, not decoration. Preserve semantic clarity, route/state identity, accessibility, RTL correctness, responsive layout, frame delivery, memory, platform conventions, and maintainability.

## Reference routing

| Need | Read |
|---|---|
| Package scope, semantic pattern selection, built-in alternatives | `references/01-foundations-selection.md` |
| `OpenContainer`, Shared Axis, Fade Through, Fade Scale, switchers, keys, navigation | `references/02-patterns-navigation.md` |
| Accessibility, RTL, reduced motion, lifecycle, rendering, images, lists, platform views | `references/03-accessibility-rendering.md` |
| Web/desktop, profiling, memory, state, anti-patterns, tests, checklists | `references/04-profiling-architecture-testing.md` |
| Workflow, completion gates, review heuristics, source conclusions | `references/05-workflow-review-sources.md` |

When an API default or route behavior is version-sensitive, read the matching reference before coding.

## 1. Inspect before choosing motion

Inspect:

- `pubspec.yaml`, `pubspec.lock`, Flutter/Dart versions, resolved `animations` version;
- Router/Navigator architecture, nested navigators, `PageTransitionsTheme`;
- design-system motion tokens, theme, state ownership, responsive breakpoints;
- reduced-motion/RTL/accessibility handling;
- existing `AnimatedSwitcher`, `Hero`, implicit animations, custom routes/controllers;
- heavy content: images, lists, slivers, charts, video, maps, WebViews, platform views, clips, shadows, filters, intrinsic layout;
- tests that assume transition timing.

Do not introduce a second motion system merely because the package is available.

## 2. Describe the relationship first

Write one sentence before selecting a transition:

```text
“This card becomes its details page.”
“These are sequential wizard steps.”
“These peer destinations replace each other.”
“This dialog is transient within the current context.”
```

If the relationship is unclear, transition selection is premature.

Ask whether source/destination are the same conceptual object, ordered, hierarchical, peer-level, transient, or better with no motion.

## 3. Choose the smallest correct abstraction

Prefer:

```text
no animation
→ implicit Flutter animation
→ AnimatedSwitcher
→ TweenAnimationBuilder
→ Hero
→ animations package pattern
→ PageRouteBuilder/custom Page
→ explicit AnimationController
```

| Relationship | Starting point |
|---|---|
| One property changes | Implicit animation |
| Small child replacement | `AnimatedSwitcher` |
| One custom value | `TweenAnimationBuilder` |
| Shared visual across existing routes | `Hero` |
| Container becomes destination | `OpenContainer` |
| Ordered/sequential/hierarchical change | Shared Axis |
| Equivalent peer replacement | Fade Through |
| Transient bounded entrance/exit | Fade Scale |
| Bespoke route choreography | `PageRouteBuilder` / custom Page |
| Scrubbed/synchronized motion | Explicit controller |
| No semantic benefit | No animation |

## 4. `OpenContainer`: continuity plus navigation implications

Use only when a closed container and destination are the same conceptual object in different representations.

Good: card → detail, message row → message detail, search field → expanded search.

Do not use it for unrelated screens.

`OpenContainer` pushes its own route. If the application uses Router state for URLs, deep links, browser history, restoration, or page-backed navigation, do not let an imperative container push become the canonical route model. Preserve Router ownership and use a route/page transition or `Hero` where appropriate.

During the transform both closed and open subtrees can coexist. Review duplicate `GlobalKey`s, image memory, lists/charts, videos, maps, WebViews, and platform views.

Do not use `onClosed` or animation completion as a critical business boundary.

## 5. Shared Axis: encode real semantic direction

Use:

- horizontal for ordered horizontal/sequential flows;
- vertical for ordered vertical progression;
- scaled for hierarchy/depth.

Do not use Shared Axis for unordered peer tabs or arbitrary destination switches.

Separate semantic forward/back from physical left/right.

Horizontal Shared Axis must not be assumed to mirror automatically in RTL. Derive physical direction from semantic movement plus `TextDirection` and test LTR/RTL in both directions.

## 6. Fade Through: peer replacement

Use when equivalent-level content changes without strong spatial continuity:

```text
NavigationBar destination switch
account switch
refresh replacement
peer content section
```

Do not invent forward/reverse ordering when none exists.

Do not use it for same-object card → detail continuity.

## 7. Fade Scale: transient bounded surfaces

Use for suitable transient dialog/menu-like content within the current context.

Do not replace every `showDialog()` merely to use the package.

When using `showModal`, verify Navigator target, barrier semantics/localization, dismissibility, result handling, and reduced-motion behavior.

Treat package durations/colors as defaults, not universal design tokens.

## 8. `PageTransitionSwitcher`: route-like replacement

Use when primary + secondary animations and explicit reverse semantics are useful. Prefer `AnimatedSwitcher` for simple replacement.

Use stable semantic keys:

```dart
ValueKey(item.id)
ValueKey(stepIndex)
ValueKey(account.id)
```

Never generate `UniqueKey()` every build merely to force animation. It can reset state, restart motion, and accumulate outgoing children.

Rapid swaps can keep several outgoing subtrees alive; review memory for expensive children.

## 9. Preserve navigation as source of truth

Animation follows navigation; it does not invent it.

For Router-based applications preserve route/path, back stack, URL, browser history, deep links, and restoration.

For nested navigators deliberately choose the Navigator. Review `useRootNavigator` and modal route behavior instead of guessing.

Before globally replacing `PageTransitionsTheme`, test Android predictive back where relevant, iOS back gesture/platform expectations, nested routes, desktop, and Web browser history.

## 10. Keep business/state side effects out of transition builders

Transition builders must be presentation-only and side-effect free.

Never perform repository/network/database calls, analytics mutations, state-container creation, or heavy synchronous transforms inside them.

Use:

```text
business state changes
→ presentation derives child + semantic key + direction
→ transition visualizes the change
```

Do not depend on `AnimationStatus.completed` for critical workflow correctness.

## 11. Respect reduced motion explicitly

Read `MediaQuery.disableAnimationsOf(context)`.

For substantial spatial/scale motion, provide an explicit path such as:

```text
Duration.zero
simple fade
immediate replacement
smaller/localized motion
```

The final UI must communicate state without motion. Never encode success, selection, validation errors, navigation position, or critical status only through animation.

## 12. Handle accessibility beyond duration

Review:

- RTL direction;
- keyboard activation;
- focus destination;
- screen-reader order;
- duplicate semantics while outgoing/incoming children coexist;
- high-contrast resting states;
- motion sensitivity for large zoom/travel/scale effects.

Reduced-motion mode may need to remove spatial movement entirely, not merely shorten it.

## 13. Keep controllers in presentation lifecycle

High-level package widgets generally manage their own animation machinery.

Add `AnimationController` only for scrubbing, explicit progress control, bespoke synchronization, or custom lifecycle beyond package capability.

Keep controllers/tickers in presentation state and dispose them. Never place controllers, tweens, curved animations, or tickers in Bloc/Riverpod/domain state.

## 14. Make async navigation safe and idempotent

If work happens before navigation, check `context.mounted` after `await` before using the context.

Prefer a meaningful loading destination over blocking navigation on network I/O when product semantics permit.

Guard duplicate pushes locally if rapid taps can create invalid navigation. Do not create a global navigation mutex for unrelated routes.

## 15. Diagnose rendering mechanism, not animation label

When motion janks, identify the expensive stage:

```text
build → layout → paint → compositing/layers → rasterization → display
```

Use profile/release mode and DevTools. Never draw production conclusions from debug mode.

High-refresh devices have smaller frame intervals; do not optimize only for 60 Hz assumptions.

If UI/build time is high, inspect broad rebuilds, intrinsic layout, synchronous Dart work, and collection transforms.

If raster time is high, inspect image surfaces, overlapping fades/opacity, clips, shadows, filters/saveLayer behavior, custom painting, and transformed full-screen regions.

Do not claim transform, opacity, clip, or shadow is universally cheap or expensive.

## 16. Reuse expensive static subtrees

Keep animation-independent children out of per-tick builders. For `AnimatedBuilder`, use its `child` parameter where appropriate.

Understand `const` correctly: it can reduce widget construction/update work, but does not remove required layout, paint, image decode, clipping, compositing, or rasterization.

## 17. Preserve lazy layout

For large lists/slivers:

- keep lazy builders;
- animate selected/visible semantics, not the entire history;
- use stable entity IDs;
- avoid rebuilding every visible row when one opens;
- do not replace lazy lists with eager `Column`s for transition convenience.

Review `IntrinsicHeight`/`IntrinsicWidth` and repeated intrinsic layout in frame-sensitive trees.

## 18. Treat images as major transition costs

Decoded image memory often dominates animation-object cost.

For image-heavy motion:

- use thumbnails in cards/lists;
- decode near display dimensions;
- selectively precache likely destination images only;
- reserve dimensions to avoid layout jumps;
- avoid preloading every full-resolution list image;
- remember outgoing and incoming trees may coexist;
- inspect image cache and oversized-image diagnostics.

Avoid first-time high-resolution image decoding at transition start when practical.

## 19. Treat platform views as high risk

Maps, WebViews, videos, and other platform-backed surfaces can behave differently under clip, opacity, transform, snapshotting, input synchronization, and memory pressure.

Profile each shipped platform. When useful, transition a lightweight preview and instantiate the platform view after arrival rather than keeping duplicate active surfaces.

## 20. Web, desktop, and responsive gates

### Web
Preserve Router/browser history. Test back/forward, URL state, resize, keyboard/focus, high-DPI images, first decode, and target browsers.

### Desktop
Review visual travel distance and interaction scale on large windows. Mobile-style full-screen motion can be excessive even when smooth.

### Responsive
Test orientation, resize, split-screen/tablet sizes, breakpoints, text scale, and geometry changes. State identity must remain stable across layout changes.

## 21. Reject common anti-patterns

Reject:

- animating every state change;
- `OpenContainer` for unrelated screens;
- Shared Axis for unordered peers;
- assuming horizontal Shared Axis auto-mirrors RTL;
- `UniqueKey()` every build;
- network/repository work inside transition builders;
- controllers in domain state;
- critical work tied to animation completion;
- first-time 4K image decoding at transition start;
- preloading every full-resolution list image;
- eager layouts replacing virtualization;
- global route-transition overrides without back-gesture tests;
- Router/browser-history breakage for visual continuity;
- cinematic durations that slow frequent navigation;
- random curve changes as a jank fix;
- debug-mode performance judgment;
- ignoring reduced motion;
- essential meaning conveyed only by motion;
- unnecessary motion manager/use-case/facade layers.

## 22. Testing strategy

### Widget tests
Cover initial state, transition start, meaningful midpoint when needed, final state, reverse, and reduced motion.

Prefer deliberate `pump(Duration(...))` for known timings instead of blindly relying on `pumpAndSettle()` when exact transition behavior matters.

### Navigation tests
Cover push/pop, route result, back, nested Navigator, deep links/restoration/browser history when relevant.

### Accessibility tests
Use `MediaQueryData(disableAnimations: true)` and verify meaning/navigation remains correct.

### Golden tests
Use meaningful source/midpoint/destination/reduced-motion states only. Do not generate a golden for every frame.

### Performance tests
Profile production-shaped screens with real images, list sizes, themes, responsive geometry, and target hardware. Inspect UI/raster distributions and worst frames, not only average FPS.

## 23. Migration workflow

Before upgrading `animations`:

1. inspect `pubspec.lock`;
2. read changelog installed → target;
3. inspect the matching package tag rather than only repository `main`;
4. verify Flutter/Dart floors;
5. run analyzer;
6. inspect package examples/API changes;
7. test route/back behavior;
8. test reduced motion and RTL;
9. profile representative transitions;
10. verify any `OpenContainer` lifecycle/default/property changes against the installed version.

Do not copy historical Material Motion tutorials blindly.

## 24. Senior review output

Organize review findings by mechanism:

```text
Semantic fit
- What relationship does the transition claim?
- Is simpler/no motion clearer?

Identity
- Are keys stable?
- Can state reset/outgoing entries accumulate?

Navigation
- Who owns route state?
- Are back/deep-link/browser-history semantics preserved?

Accessibility
- Reduced motion? RTL? Focus? Keyboard? Screen reader? High contrast?

Rendering
- What rebuilds/layouts/paints each frame?
- Images, clips, shadows, filters, platform views?
- UI vs raster evidence?

Architecture
- Side effects in builders?
- Controllers in business state?
- Unnecessary layers?
```

Give evidence and recommended changes. Avoid superstition such as “opacity is slow.”

## 25. Production definition of done

Approve motion only when:

- package/SDK compatibility was verified;
- semantic purpose is explicit;
- simpler Flutter alternatives were considered;
- pattern matches the relationship;
- navigation remains authoritative;
- stable semantic keys are used;
- forward/back and RTL behavior are correct;
- reduced motion is handled;
- essential state remains understandable without motion;
- focus/keyboard/screen-reader behavior is coherent;
- business correctness is independent from animation completion;
- transition builders contain no network/database/business side effects;
- expensive subtrees do not rebuild unnecessarily per tick;
- image decode/memory is intentional;
- outgoing/incoming coexistence fits memory constraints;
- clipping/shadow/layout/platform-view costs were reviewed;
- desktop/Web/responsive behavior was tested when shipped;
- route/back/browser-history behavior is correct;
- profile/release measurements distinguish UI and raster bottlenecks;
- representative target devices perform acceptably;
- analyzer and relevant tests pass.

## Final engineering rule

Do not begin with “Which animation looks best?”

Begin with:

```text
What relationship is changing?
Does motion clarify it?
Who owns state/navigation identity?
What is the smallest suitable abstraction?
What happens in RTL and reduced-motion mode?
What heavy content coexists during the transition?
What does profiling say about build/layout/raster/image cost?
```

Use `animations` only when one of its Material motion patterns genuinely improves how the user understands the interaction.
