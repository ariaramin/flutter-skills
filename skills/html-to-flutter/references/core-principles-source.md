# Original core principles

These are the detailed core principles from the supplied research baseline. Use them when reviewing whether a conversion preserved the intended rule set.

## Core Principles

1. **MUST translate intent, not syntax.** HTML elements, CSS declarations, and JavaScript statements do not have universal one-to-one Flutter equivalents.
2. **MUST understand the source before coding.** Analyze structure, design tokens, responsive rules, state, routing, data flow, accessibility semantics, external dependencies, and interaction states before selecting Flutter widgets.
3. **MUST reason with Flutter constraints.** Flutter box layout follows the rule: constraints go down, sizes go up, and parents position children. Do not reason as though Flutter were a CSS layout engine.
4. **MUST preserve semantic intent.** A semantic HTML button must normally become a semantic Flutter control, not a decorated clickable `Container`. Headings, form labels, navigation, controls, images, focus behavior, and keyboard interactions remain meaningful after conversion.
5. **MUST rebuild architecture rather than reproduce the DOM tree.** The optimal Flutter widget hierarchy usually has fewer, differently shaped boundaries than the source DOM.
6. **MUST treat JavaScript DOM mutation as a state-modeling problem.** Convert `querySelector`, `innerHTML`, style mutation, class toggling, child insertion, and child removal into state changes that cause Flutter to rebuild declaratively.
7. **MUST extract design tokens before reproducing styles.** Centralize colors, typography, spacing, radii, elevations, component variants, and breakpoint decisions rather than copying CSS literals into every widget.
8. **MUST separate presentation from data access and business logic.** Network clients, repositories, persistence, and non-trivial domain logic do not belong in widget `build()` methods. Flutter's current architecture guidance emphasizes separation of UI and data layers, repositories, unidirectional data flow, and clear responsibility boundaries.
9. **SHOULD keep state as local as its ownership permits.** Ephemeral state belongs close to the widgets that own it. Shared application state should have an explicit owner and source of truth.
10. **SHOULD NOT force a third-party state-management library onto every conversion.** Choose a mechanism according to ownership, lifetime, sharing, persistence, and project conventions.
11. **MUST distinguish responsive from adaptive behavior.** Responsive layout rearranges according to available space; adaptive behavior changes interaction or presentation according to platform capabilities and conventions.
12. **PREFER ****`LayoutBuilder`**** for decisions based on a component's available parent constraints.**
13. **PREFER ****`MediaQuery`**** for window-level characteristics**, including current application window size, view padding, text scaling, accessibility settings, and display features. Flutter's adaptive guidance explicitly separates parent-size measurement from window-level information.
14. **SHOULD derive breakpoints from content needs rather than device labels.** Do not assume every feature needs one universal `mobile/tablet/desktop` switch.
15. **MUST use lazy collections for large or unbounded data.** Prefer builders and slivers rather than materializing thousands of children in a `Column`.
16. **SHOULD use semantic framework controls before custom interaction surfaces.** Prefer `FilledButton`, `TextButton`, `IconButton`, `Checkbox`, `Switch`, `Radio`, `Slider`, `TextField`, and similar controls where their behavior matches the source.
17. **SHOULD NOT use ****`Container`**** as Flutter's equivalent of ****`<div>`****.** Use the narrowest widget that expresses the requirement: `Padding`, `SizedBox`, `ConstrainedBox`, `Align`, `ColoredBox`, `DecoratedBox`, `Center`, or combinations thereof. `Container`is a convenience widget that combines several responsibilities.
18. **SHOULD NOT use ****`Stack`**** merely because the web implementation used positioning.** Prefer normal constraint-driven layout unless elements genuinely overlap.
19. **SHOULD NOT reproduce CSS dimensions mechanically.** Hard-coded browser measurements often fail under text scaling, localization, resizing, different fonts, safe areas, and desktop window sizes.
20. **SHOULD avoid intrinsic measurement unless the design truly requires it.** Intrinsic layout can add speculative layout passes and become expensive in deep trees.
21. **MUST keep ****`build()`**** side-effect free.** Create futures, subscriptions, controllers, and state transitions in appropriate lifecycle or architecture layers rather than initiating them because `build()` ran. Flutter can call `build()` frequently.
22. **SHOULD use ****`const`**** where it reflects genuinely immutable configuration**, particularly stable widget subtrees. Do not treat `const` as a substitute for sound state boundaries.
23. **NEVER claim every widget rebuild is expensive.** Rebuild, layout, paint, compositing, and rasterization are distinct phases. Optimize the phase proven to be slow.
24. **MUST profile before performance optimization.** Use Flutter DevTools and target-platform profiling instead of guessing.
25. **MUST test performance in profile or release conditions, not infer production performance from debug mode.**
26. **SHOULD rewrite ordinary application logic in Dart.** Preserve JavaScript only where an existing browser API or JavaScript-only SDK makes interop the better boundary.
27. **MUST use current JS interop APIs.** For modern Dart web code, prefer `dart:js_interop` and `package:web`; do not introduce deprecated `dart:html`, `dart:js`, `dart:js_util`, or legacy `package:js` into new conversions.
28. **MUST distinguish Flutter Web from a traditional DOM website.** Flutter Web is strongest for app-centric experiences and can be embedded into existing websites, but it should not automatically replace document-centric, SEO-heavy, text-flow websites.
29. **ONLY embed HTML or use a platform view when preserving the existing implementation creates more value than native Flutter reimplementation.** Consider accessibility, focus, performance, lifecycle, compositing, communication overhead, and maintenance.
30. **MUST preserve platform usability.** Pixel fidelity must not require an identical mobile interface on Android, iOS, Web, Windows, macOS, and Linux when input models or platform conventions demand adaptation.
31. **MUST preserve text scaling and dynamic layout.** Never make fidelity depend on disabling accessibility scaling.
32. **MUST make visual fidelity measurable.** Compare known viewport sizes and states against reference captures instead of tuning from memory.
33. **MUST verify current APIs before finalizing generated production code.** Avoid deprecated or superseded recommendations discovered in older Flutter tutorials.

---
