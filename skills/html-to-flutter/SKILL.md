---
name: html-to-flutter
description: Convert, rebuild, audit, or refactor HTML/CSS/JavaScript/TypeScript web interfaces and applications into idiomatic production Flutter/Dart for Android, iOS, Web, macOS, Windows, and Linux. Use this skill whenever a task involves porting a webpage or frontend to Flutter, translating responsive HTML/CSS layouts, converting React/Vue/Svelte/web-component UI behavior, replacing DOM mutation with Flutter state, migrating web routing/forms/storage/networking/animations, reproducing a web UI or screenshot in Flutter, fixing mechanically converted DOM-shaped Flutter code, or deciding whether browser-only functionality should be rewritten, embedded, or kept behind JS interop—even when the user only says “port this page”, “make a Flutter version”, or “convert this frontend”. Preserve semantics, design systems, responsiveness, behavior, accessibility, architecture, performance, and platform usability; do not perform naive tag/property syntax substitution.
compatibility: Best used with access to the source web files and the target Flutter project. For production code, inspect the installed Flutter/Dart SDK and project dependencies before choosing APIs. Web access is useful for verifying current official Flutter/Dart APIs when available.
---

# HTML/CSS/JavaScript → Flutter

Rebuild the source application according to Flutter's rendering, state, and platform models. Preserve product intent, behavior, semantics, and visual system; do not recreate the DOM in widgets.

## Operating model

Treat the source as four overlapping systems:

- **HTML** → semantic structure, information hierarchy, controls, content relationships.
- **CSS** → layout intent, constraints, responsive behavior, design tokens, interaction states, typography, decoration, animation.
- **JavaScript/TypeScript** → state transitions, business rules, data access, events, routing, persistence, async behavior, browser integrations.
- **Flutter/Dart** → declarative widgets, constraint-driven layout, typed state/data models, explicit architecture, platform adaptation.

Remember the Flutter box-layout rule:

> Constraints go down. Sizes go up. Parents set positions.

Model UI as `UI = f(state)`, not as a mutable collection of elements.

## Non-negotiable rules

1. Translate **intent, semantics, behavior, and constraints**, not syntax.
2. Analyze the source before writing Flutter code.
3. Never assume `div = Container` or any universal tag-to-widget mapping.
4. Rebuild architecture rather than reproducing the DOM/component hierarchy mechanically.
5. Convert DOM/CSSOM mutation into explicit state changes and declarative composition.
6. Preserve semantic intent: buttons stay buttons, links stay links, headings remain headings, labels remain associated with fields, and dialogs retain modal/focus behavior.
7. Extract repeated colors, typography, spacing, radius, elevation, component variants, and relevant breakpoints into a Flutter design system before styling pages repeatedly.
8. Keep network, repositories, persistence, and non-trivial business logic out of widget `build()` methods.
9. Keep `build()` side-effect free. Create futures, subscriptions, controllers, timers, focus nodes, and animation controllers at appropriate ownership/lifecycle boundaries.
10. Keep state as local as ownership permits and maintain a clear source of truth for shared state.
11. Do not force a state-management package unless the project already uses one or the problem genuinely requires it.
12. Distinguish **responsive** layout changes from **adaptive** platform/input behavior.
13. Prefer `LayoutBuilder` for decisions based on a component's available parent constraints.
14. Prefer narrow `MediaQuery` accessors for window/environment characteristics such as size, padding, text scaling, accessibility settings, and display features.
15. Derive breakpoints from where the composition stops working well; do not rely only on `mobile/tablet/desktop` labels.
16. Prefer semantic framework controls over decorated gesture surfaces when the source represents a standard control.
17. Do not use `Container` as Flutter's default `<div>` equivalent. Use the narrowest widgets that express layout/decoration intent.
18. Do not use `Stack` merely because the source used CSS positioning. Use it when overlap or shared-box anchoring is intrinsic.
19. Do not copy CSS pixel dimensions mechanically. Preserve fixed dimensions only where the product requirement is genuinely fixed.
20. Do not add scrolling merely to silence overflow. Fix the layout model and choose wrapping, truncation, recomposition, or scrolling according to source intent.
21. Use lazy lists/grids/slivers for large or unbounded collections.
22. Avoid unnecessary intrinsic measurement, clipping, opacity layers, large blurred shadows, and other expensive rendering constructs unless required.
23. Use `const` where configuration is genuinely immutable, but do not treat it as a substitute for correct state boundaries.
24. Do not claim rebuilds are inherently expensive. Distinguish build, layout, paint, compositing, and rasterization.
25. Profile before performance optimization and measure in profile/release conditions on relevant targets.
26. Rewrite ordinary application logic in Dart. Keep JavaScript only where a browser API or JS-only SDK makes interop the better boundary.
27. For modern Dart web interop, prefer current `dart:js_interop` and `package:web` APIs; do not add deprecated legacy web/JS libraries to new code.
28. Do not assume Flutter Web should replace document-centric, SEO-heavy websites. Decide product fit explicitly.
29. Embed HTML/platform views only when preserving the existing implementation is more valuable than native Flutter reimplementation.
30. Preserve text scaling, keyboard/focus behavior, semantics, and platform usability even when pixel fidelity is a goal.
31. Make visual fidelity measurable against known viewports, states, fonts, and interaction modes.
32. Verify current APIs against the project's installed Flutter/Dart SDK before finalizing production code.

## Load references progressively

Read only the references relevant to the task. For full migrations, read them in the order below.

| Need | Reference |
|---|---|
| Source inventory, HTML semantics, CSS layout, Flex/Grid, constraints, breakpoints, responsive shells | `references/layout-responsive.md` |
| Tokens, Material 3 theming, styling, typography | `references/design-system.md` |
| JS→Dart, DOM state, events, components, forms, navigation, assets, animation, scrolling, data-dense UI | `references/ui-behavior.md` |
| State ownership, application architecture, network/API boundaries, browser storage | `references/architecture-data.md` |
| Performance, accessibility, desktop input, platform adaptation, Flutter Web, JS interop, HTML embedding, graphics, profiling | `references/performance-platform.md` |
| Anti-patterns, code/perf/a11y/cross-platform review checklists, decision trees | `references/review-decisions.md` |
| Production code templates and before/after conversion examples | `references/patterns-examples.md` |
| Visual fidelity, testing strategy, debugging failures | `references/validation-debugging.md` |
| Research baseline, official source catalog, and current-API verification context | `references/sources.md` |

## Phase 1 — Inspect before coding

Inspect all source material that materially affects the requested surface. Do not infer unseen source behavior when the files are available.

Build a conversion inventory covering, as applicable:

- HTML entry points and semantic landmarks;
- CSS files, preprocessors, custom properties, global tokens, component rules, breakpoints, and state selectors;
- JS/TS entry points and framework conventions;
- assets, fonts, icons, SVGs, and image behavior;
- routes, URL parameters, deep links, browser history assumptions;
- local UI state, shared application state, derived state, server state, persisted state;
- forms, validation, autofill, focus order, keyboard behavior;
- network/API clients and error/loading states;
- local/session storage, IndexedDB/cookies where present;
- service workers or other browser-only behavior;
- third-party SDKs, iframes, editors, maps, payments, auth, analytics;
- localization and accessibility semantics/ARIA;
- target Flutter platforms and project constraints.

Do not start implementation until you can explain **what the source is doing and why**.

## Phase 2 — Produce an implementation map

Before writing page code, define the Flutter destination for each source concern:

```text
Global CSS tokens       → ThemeData / ColorScheme / TextTheme / ThemeExtension
Page shell              → Scaffold / sliver shell / adaptive shell
Semantic web component  → reusable Flutter widget
Local UI state          → owning StatefulWidget/controller/notifier
Shared app state        → explicit owner + source of truth
fetch/API module        → service/client + repository
Browser route           → Navigator/Router architecture
Browser persistence     → persistence abstraction
DOM mutation            → state transition + rebuild
JS-only integration     → Dart rewrite / JS interop / platform view / external web
```

Choose widget/component boundaries by product responsibility, state ownership, stable API, repetition, or independent testability—not by HTML wrappers or CSS classes.

## Phase 3 — Make key conversion decisions explicitly

### Layout

- Map block flow to normal Flutter composition, adding scrolling only when content can exceed the viewport.
- Map Flexbox to `Row`/`Column`/`Flex` according to Flutter flex semantics; do not translate `flex` shorthand literally.
- Use `Wrap` or responsive recomposition for wrapping behavior.
- Use standard grid delegates for uniform/adaptive grids. Reinterpret CSS Grid track/span logic when standard Flutter grids do not express it.
- Use `Stack`/`Positioned` only for genuine overlap/anchoring.
- Model sticky/fixed application chrome with `Scaffold`, slivers, overlays, or shell composition according to intent.
- Treat overflow as a UX decision: wrap, truncate, resize, switch composition, scroll, or hide low-priority content deliberately.

### Responsive/adaptive behavior

For every source breakpoint, write down what changes and why. Implement the behavior based on available space rather than blindly copying media-query numbers.

Use component-local breakpoints where component behavior depends on local width; use shell-level breakpoints only for shared application-level transitions such as navigation mode.

Preserve state, focus, and scroll behavior across window resizing and composition changes where practical.

### State and JavaScript

Classify each JS responsibility:

1. product/business logic to rewrite in typed Dart;
2. DOM-specific code that disappears;
3. browser-only integration to isolate behind interop;
4. data-layer work that belongs in services/repositories;
5. platform-specific work that needs an adapter/plugin/channel.

Convert `querySelector`, `innerHTML`, `classList`, style mutation, append/remove child, and DOM-as-source-of-truth patterns into typed data/state and declarative widgets.

Do not store mutable `Widget` collections when the real state is domain data.

### Navigation

Classify each navigation action as local UI state, internal push, URL-addressable route, nested navigation, deep link, external URL, modal, or replacement/auth flow.

Use simple `Navigator` APIs for genuinely simple flows. Use Router-based architecture (or a maintained Router-based package consistent with the project) when deep links, browser URL synchronization, nested routes, redirect logic, or complex path/query handling matter.

### Web-only features

Prefer, in order:

1. native Flutter/Dart implementation;
2. supported Flutter/native plugin or SDK;
3. modern JS interop for narrow browser-only integration;
4. platform view/WebView/embedded web content when preservation is strategically better;
5. external web flow when embedding would harm maintainability, accessibility, security, or UX.

Document the choice and tradeoffs.

## Phase 4 — Implement in production order

Unless the existing project architecture dictates otherwise, implement in this order:

1. design tokens/theme;
2. application shell and navigation structure;
3. responsive layout primitives;
4. reusable semantic components;
5. page composition;
6. local and shared state ownership;
7. forms, focus, keyboard, and validation;
8. services/repositories/networking;
9. persistence;
10. web/platform integration boundaries;
11. animations and custom graphics;
12. platform adaptations;
13. loading, empty, error, disabled, hover, focus, selected, and other interaction states.

Reuse the target project's existing conventions when they are sound. Do not replace architecture or dependencies merely to make the conversion resemble a preferred template.

## Phase 5 — Preserve fidelity without harming Flutter quality

For screenshot/reference-driven work:

1. capture or identify exact reference viewport sizes and UI states;
2. confirm source fonts/assets when available;
3. compare hierarchy and major geometry before micro-styling;
4. match design tokens, spacing rhythm, typography, radius, borders, and shadows;
5. validate at breakpoint neighborhoods and intermediate widths—not only reference screenshots;
6. test long/localized content and increased text scaling;
7. treat small platform glyph-raster differences as rendering differences rather than forcing brittle hacks;
8. document intentional platform-adaptive differences.

Never disable accessibility scaling or hard-code fragile dimensions solely to win one screenshot comparison.

## Phase 6 — Validate the result

When tooling is available:

- format and run static analysis/lints;
- run relevant unit/widget/integration tests;
- test narrow, intermediate, and wide widths;
- test all source interaction states;
- test overflow with long content;
- test larger text scaling;
- test focus order and keyboard navigation;
- test semantics/screen-reader behavior for important flows;
- test direct deep links and browser Back/Forward on Flutter Web when relevant;
- test relevant target platforms and input modes;
- compare reference screenshots/goldens at known sizes;
- profile actual performance concerns in profile/release mode;
- inspect memory/image decoding for image-heavy screens.

If tools are unavailable, state which validations remain unverified instead of claiming completion.

## Repair order for a bad conversion

Fix structural problems before cosmetic ones:

1. architecture and data flow;
2. scroll ownership;
3. constraints/layout structure;
4. responsiveness;
5. semantic controls/accessibility;
6. reusable component boundaries;
7. design tokens/theme;
8. behavior/state conversion;
9. platform adaptation;
10. measured performance bottlenecks;
11. visual fine-tuning.

Do not polish shadows on top of a broken layout architecture.

## Output expectations

For non-trivial conversions, make the implementation easy to review. Include, as appropriate:

- a brief conversion map/assumption note before or alongside code;
- exact files created or changed;
- typed reusable widgets instead of giant monolithic pages;
- architecture consistent with the target project;
- responsive/adaptive decisions made explicit in code;
- comments only where the conversion decision is non-obvious;
- TODOs for unresolved vendor/browser/platform behavior rather than invented implementations;
- validation performed and remaining risks.

Do not bury missing requirements. When source behavior is ambiguous, preserve what is observable and clearly mark the assumption.

## Current API verification

Before finalizing production code, inspect the project's installed SDK/dependencies and re-check unstable or historically changed areas. The supplied research baseline specifically flags:

- `WidgetState` / `WidgetStateProperty` vs older `MaterialState` examples;
- `Color.withValues(...)` vs adding new deprecated-opacity patterns;
- `TextScaler` vs older `textScaleFactor` patterns;
- `dart:js_interop` + `package:web` vs legacy `dart:html`, `dart:js`, `dart:js_util`, or `package:js` in new code;
- Router-based navigation for complex deep-link/browser URL requirements;
- current Material theme APIs centered on `ColorScheme`, `TextTheme`, component themes, and `ThemeExtension`;
- current scroll/grid cache APIs;
- current golden-comparison APIs;
- current platform-view composition behavior;
- current Flutter Web renderer behavior.

Do not copy an API name from this skill when the installed SDK proves it has changed.

## Final completion gate

Before declaring a conversion production-ready, answer **yes** to every applicable item:

- Did the implementation reason from Flutter constraints rather than DOM/CSS assumptions?
- Were semantic meanings preserved instead of flattened into visual boxes?
- Were Flexbox/Grid behaviors reinterpreted according to Flutter's actual layout model?
- Does responsive behavior use local constraints and window/environment information appropriately?
- Did imperative DOM mutation become explicit declarative state?
- Are async operations modeled with suitable Dart `Future`/`Stream` semantics and lifecycle ownership?
- Does navigation satisfy deep-link/browser-history requirements where applicable?
- Are headings, labels, controls, text scaling, focus, keyboard, and semantics preserved?
- Are large collections lazy?
- Are performance claims based on the correct build/layout/paint/compositing/raster phase and measured where needed?
- Does Web/desktop UI support pointer, hover, focus, keyboard, resizing, selection, and context behavior where required?
- Was each JavaScript/browser-only feature explicitly classified as rewrite, interop, embed, plugin/native, or external?
- Are APIs valid for the project's installed Flutter/Dart version?
- Is the resulting widget architecture cleaner than the source DOM hierarchy?
- Were major anti-patterns eliminated?
- Was visual fidelity checked against defined viewports and states?
- Were relevant target platforms evaluated?
- Can another senior engineer understand state ownership, route ownership, data flow, and platform boundaries without reverse-engineering the widget tree?
- Are intentional differences from the source documented?
- Will the Flutter implementation remain maintainable after the original web code is removed?

If any applicable answer is **no**, continue improving the conversion or explicitly report the unresolved gap.
