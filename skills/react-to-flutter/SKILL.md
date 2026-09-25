---
name: react-to-flutter
description: Migrate an existing React or React web application, feature, or component to idiomatic production Flutter/Dart. Use when porting React, translating JSX/CSS/hooks/context/React Router, replacing browser or DOM behavior, or reviewing a mechanical React-to-Flutter conversion. Preserve observable product behavior while redesigning architecture, lifecycle, layout, navigation, accessibility, testing, and platform support for Flutter; do not translate React implementation details or CSS syntax mechanically.
compatibility: Best with access to the React source and target Flutter project. Inspect the installed Flutter/Dart SDK and dependencies before choosing version-sensitive APIs.
---

# React → Flutter

Treat React as evidence of product requirements, not as the architecture to copy. Preserve routes, data contracts, state transitions, validation, loading/error/empty states, accessibility, persistence, and platform behavior. Rebuild them with Flutter's widget, lifecycle, constraint-layout, and platform models.

## Inspect before implementation

When source is available, inspect the entry points, `package.json`, routes, page and shared components, hooks, contexts/stores, TypeScript types, API clients, forms, persistence, CSS/theme files, assets, browser APIs, integrations, and tests. Read TypeScript types rather than inferring contracts from use sites.

For non-trivial migrations, create an inventory before bulk implementation:

| Area | Required behavior | Flutter decision | Risk | Verification |
|---|---|---|---|---|
| Routes | URLs, deep links, redirects | Navigator/Router design |  | route tests |
| State | ownership and transitions | local state, state owner, repository |  | unit/widget tests |
| Data | contracts and failures | service and repository |  | contract tests |
| UI | layout and interactions | widgets and theme |  | widget/golden tests |
| Platform | browser/native capability | plugin, interop, or alternative |  | target-platform test |

Do not leave important, high-risk behavior as an assumed mapping. Record unsupported capabilities and the required product decision; never silently omit them.

## Rebuild the right concepts

Use this as a decision guide, not a translation table:

| React source | Flutter destination |
|---|---|
| Component, props, children | widgets, constructor parameters, `child`/`children` |
| `useState` | local `State`, `ValueNotifier`, or an existing suitable state mechanism |
| Context/store | dependency, inherited value, repository, or scoped state owner—determine which |
| React Router | `Navigator`/`Router`; commonly `go_router` for deep links, redirects, nested routes, or web URLs |
| CSS/media queries | Flutter layout/theme plus `MediaQuery.sizeOf` or `LayoutBuilder` |
| DOM reference/event | controller, focus/keyboard/pointer API, key, plugin, or web interop |
| Portal | overlay, dialog, menu, or route |
| Controlled form input | `Form`, controller/form state, callbacks |
| CSS animation | implicit or explicit Flutter animation |

Flutter widgets are immutable descriptions; persistent elements and render objects handle the retained tree, layout, paint, and hit testing. Model UI as a function of state. Do not reproduce React reconciliation, memoization, component boundaries, CSS utility classes, or DOM shape without a product reason.

### Effects and ownership

Classify every `useEffect`: subscription, owned resource, changed-input synchronization, data load, DOM integration, telemetry, derived-state workaround, or imperative visual work. Then use the narrow Flutter lifecycle mechanism:

- `initState` for one-time state initialization and initial subscriptions.
- `didChangeDependencies` for inherited dependencies.
- `didUpdateWidget` when a supplied object changes; unsubscribe from the old object before subscribing to the new one.
- a state owner/repository command for data operations where that boundary exists.
- `dispose` to release owned controllers, focus nodes, timers, stream subscriptions, listeners, and animation controllers.

Never perform external side effects in `build()`. Do not create a generic hooks/effect compatibility layer. Do not assume every React effect belongs in `initState`.

## Architecture and state

Keep transient state at the narrowest practical scope. For substantial applications, separate UI/presentation concerns from data concerns; repositories should be the application data source of truth and services should encapsulate external systems. Add a domain/use-case layer only when it reduces real complexity, such as shared multi-repository business rules.

Make important dependencies explicit, preferring constructor injection. Do not introduce a mutable global service locator merely to avoid passing dependencies.

Choose state management from scope, async/lifecycle needs, existing project conventions, testability, and platform support. SDK primitives are enough for many cases. Do not copy Redux, Zustand, or Context into Flutter just because the source uses them, and do not add a package for a capability the SDK already covers.

Keep typed Dart models at the boundary; do not spread `Map<String, dynamic>` through application code. Keep network and business logic out of widgets.

## Layout and platform behavior

Flutter layout follows: constraints go down, sizes go up, parents set positions. Reconstruct constraints, flex, alignment, overflow, scrolling, and content width; do not translate CSS declarations line by line or use `Container` as a generic `div`.

- Use `MediaQuery.sizeOf(context)` for app-window decisions and `LayoutBuilder` for local constraints.
- Design around available space, not phone/tablet/desktop labels, physical screen dimensions, or orientation.
- Make large-window information structure intentional: max content width, columns, grids, master/detail, or a persistent side pane as appropriate.
- On web and desktop, verify mouse, trackpad, keyboard, focus traversal, hover, shortcuts, text selection, resizing, and accessibility—not touch alone.
- Extract colors, typography, spacing, radii, and component variants into Flutter theme/design tokens. Material 3 is the current default; confirm the source intent rather than assuming Material 2 styling.
- Preserve text scaling with current `TextScaler`-aware APIs; avoid fixed-height text that clips enlarged content.

For browser-specific behavior, prefer a Flutter/Dart implementation, then a maintained cross-platform plugin, then narrow modern web interop, and only then embedded web content or an external flow. Keep platform differences behind a capability boundary instead of scattering platform checks through business logic. For new web interop use `package:web` and `dart:js_interop`, not deprecated `dart:html` or legacy JS interop.

## Navigation, async work, and performance

Inventory paths, parameters, nested routes, guards, redirects, modal routes, deep links, browser history, and restoration. Use direct `Navigator` APIs for small imperative flows; prefer declarative Router architecture for URL-addressable or complex navigation. Test direct deep links, refresh, browser Back/Forward, redirects, nested navigation, and platform back behavior when relevant. Use `PopScope`, not new `WillPopScope`, for Android predictive-back support.

Represent relevant async states explicitly: loading, data, empty, error, and refreshing. Handle stale responses when requests overlap. Use isolates only for measured CPU-heavy native work; ordinary network and disk waiting is asynchronous I/O, not isolate work. `Isolate.run` is the usual one-off native choice. Dart web has different concurrency constraints and no Dart-isolate equivalent.

Profile before optimizing, and measure in profile/release-representative conditions. For large collections use lazy list/grid/sliver builders. Investigate actual rebuild, layout, paint, compositing, image decoding, and CPU costs before changing code; `const` and memoization are not performance strategies by themselves.

## Validate the migration

For each migrated slice, compare the source baseline and Flutter result for:

- actions, data contracts, failure behavior, persistence, and routes;
- compact, intermediate, and expanded layouts;
- touch, mouse, keyboard, focus, semantics, contrast, and enlarged text;
- loading, empty, offline, validation, and authentication states;
- relevant native/web integrations; and
- performance-sensitive flows in an appropriate build mode.

Use unit tests for state/data/business logic, widget tests for presentation and interactions, integration tests for critical journeys, and targeted goldens for stable visual regressions. `integration_test` cannot operate native permission dialogs or platform-view content, so test those through an appropriate native/platform path. Do not create new `flutter_driver` work.

Before completion, run the project's formatter, `flutter analyze`, and targeted tests when available. Re-check Flutter and Dart breaking-change documentation when version-sensitive APIs are involved: routing, back handling, `WidgetState`, web interop, text scaling, and testing APIs evolve.

## Completion bar

The migration is complete only when its observable behavior is accounted for, its Flutter architecture matches actual complexity, state ownership and sources of truth are explicit, target-platform input/accessibility behavior works, resources are disposed, tests and analysis pass where runnable, and every intentional difference or unsupported capability is documented.
