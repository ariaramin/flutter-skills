# Performance, accessibility, desktop input, platform adaptation, Flutter Web, interop, embedding, graphics, and profiling

This reference preserves detailed guidance from the supplied HTML/CSS/JavaScript → Flutter research. Read the relevant section when the main skill directs you here.

## Contents

- Performance Rules
  - 1. Measure first
  - 2. Understand the frame budget
  - 3. Keep `build()` cheap and side-effect free
  - 4. Localize rebuilds
  - 5. Use `const` appropriately
  - 6. Lazy-build large collections
  - 7. Avoid unnecessary intrinsic passes
  - 8. Avoid unnecessary `saveLayer`
  - 9. Avoid unnecessary opacity layers
  - 10. Avoid unnecessary clipping
  - 11. Use shadows deliberately
  - 12. Size image decoding appropriately
  - 13. Use `RepaintBoundary` deliberately
  - 14. Do not mistake rebuild for repaint
  - 15. Profile synchronous work
  - 16. Profile in the relevant platform mode
  - 17. Do not perpetuate obsolete shader folklore
- Rebuild Optimization
  - Rebuild ≠ layout ≠ paint
  - Optimize rebuilds when measured or clearly excessive
  - Do not over-fragment
  - Repaint without rebuild
- Build/Layout/Paint Mental Model
  - Build
  - Layout
  - Paint
  - Compositing/rasterization
  - Hit testing
  - Semantics
- Accessibility
  - Preserve semantics
  - Labels
  - Headings
  - Touch target size
  - Contrast
  - Text scaling
  - Focus
  - Keyboard
  - Screen readers
  - Decorative content
  - Custom painters
- Hover, Mouse, Keyboard, and Desktop Behavior
  - Mouse
  - Hover
  - Cursor
  - Context menus
  - Keyboard shortcuts
  - Focus visuals
  - Window resizing
- Platform Adaptation
  - Adapt by capability where possible
- Flutter Web
  - Understand the product fit first
  - Do not model Flutter Web as HTML generation
  - Rendering architecture
  - Accessibility
  - Text selection
  - Browser history
  - Loading performance
  - SEO
  - Embedding Flutter in an existing website
  - Embedding HTML in Flutter Web
- JS Interop Decision Guide
  - Rewrite in Dart
  - Use JS interop
  - Preserve JavaScript rather than translating it when
  - JS Promise → Dart Future
  - Isolate web-only code
  - Interop performance
- HTML Embedding Decision Tree
  - Static formatted article
  - Interactive dashboard
  - Payment widget
  - Map
  - Third-party embedded component
  - Rich editor
  - Legacy web application
  - Marketing site
  - Platform-view warning
- Canvas / SVG / Custom Graphics
  - SVG
  - Canvas
  - Charts
  - CSS-generated shapes
  - CustomPainter decision
  - Accessibility
- Performance Profiling Workflow
  - 1. Reproduce in profile mode
  - 2. Capture a problematic interaction
  - 3. Inspect frame timing
  - 4. Inspect rebuild behavior
  - 5. Inspect layout
  - 6. Inspect paint/rasterization
  - 7. Inspect scrolling
  - 8. Inspect memory
  - 9. Inspect CPU
  - 10. Optimize the measured bottleneck
- Cross-Platform Performance
  - Android/iOS
  - Web
  - Desktop

## Performance Rules

### 1. Measure first

Do not optimize from intuition when DevTools can identify the expensive phase.

### 2. Understand the frame budget

There is no universal "16 ms frame budget."

At roughly:

```
60 Hz  → ~16.7 ms/frame
120 Hz → ~8.3 ms/frame

```

and other refresh rates have other budgets.

Flutter DevTools separates UI and raster timing for supported targets.

### 3. Keep `build()` cheap and side-effect free

Avoid:

- sorting massive arrays repeatedly inside build;
- decoding JSON;
- file I/O;
- network work;
- synchronous image processing;
- expensive business calculations.

### 4. Localize rebuilds

Move mutable state near the area that changes.

Use reusable widget boundaries, listenable builders, or state-library selectors where appropriate.

### 5. Use `const` appropriately

`const` can let the framework reuse immutable widget instances and expresses stable configuration.

Do not perform architecture contortions purely to add `const`.

### 6. Lazy-build large collections

Use builders/slivers.

### 7. Avoid unnecessary intrinsic passes

`IntrinsicHeight`/`IntrinsicWidth` may add extra layout work; `IntrinsicWidth` can reach O(N²) behavior in deep structures.

### 8. Avoid unnecessary `saveLayer`

Some rendering effects can cause offscreen compositing. Use them when required, not reflexively.

### 9. Avoid unnecessary opacity layers

If only a color needs alpha, encode alpha into that color instead of wrapping a large subtree in `Opacity`.

### 10. Avoid unnecessary clipping

Clipping is a real rendering operation. Only clip when descendants must be clipped.

### 11. Use shadows deliberately

Large soft shadows on many moving cells may be costly. Preserve necessary design, then profile actual target hardware.

### 12. Size image decoding appropriately

Large decoded images can dominate memory.

### 13. Use `RepaintBoundary` deliberately

A `RepaintBoundary` can isolate painting and cache/reuse rasterized work in appropriate cases, but adding boundaries everywhere increases layer complexity. Use it where repaint behavior demonstrates value.

### 14. Do not mistake rebuild for repaint

A widget can rebuild without triggering expensive repaint of everything.

A render object can repaint without rebuilding widgets.

### 15. Profile synchronous work

A smooth UI depends on keeping the main/UI thread from being blocked by expensive synchronous work.

### 16. Profile in the relevant platform mode

Web profiling differs from native profiling, and browsers provide additional tooling. Do not infer Web bottlenecks exclusively from Android behavior.

### 17. Do not perpetuate obsolete shader folklore

Modern Flutter uses Impeller by default on current iOS and many Android configurations, including Android API 29+ in the current documented architecture. Do not prescribe legacy shader warmup as a blanket optimization. Measure the current renderer and target.

---

## Rebuild Optimization

### Rebuild ≠ layout ≠ paint

Think in stages:

```
State changed
    ↓
Affected widgets may rebuild
    ↓
Element/widget configuration updates
    ↓
Render objects may be marked for layout and/or paint
    ↓
Layout occurs only where required
    ↓
Paint occurs only where required
    ↓
Compositor/rasterizer produces frame

```

### Optimize rebuilds when measured or clearly excessive

Good techniques:

- localize `setState`;
- extract independently stable widgets;
- make immutable configuration `const`;
- use `ValueListenableBuilder`/`ListenableBuilder`;
- use selector-like APIs provided by the project's state framework;
- pass stable children through builder `child` parameters;
- avoid replacing large state objects when only a tiny leaf should own the change.

### Do not over-fragment

A page of hundreds of microscopic widget classes is not automatically faster.

Extract where:

- semantic ownership;
- reuse;
- testability;
- rebuild isolation;
- readability;

justify it.

### Repaint without rebuild

For highly dynamic custom graphics, `CustomPainter` can listen to animation/listenable changes directly. This can bypass repeated build/layout for paint-only animation.

---

## Build/Layout/Paint Mental Model

### Build

Purpose:

- produce immutable widget descriptions;
- respond to state/dependency changes.

Questions:

- Is expensive non-UI computation happening here?
- Is a high-level state change rebuilding much more than necessary?
- Is an asynchronous operation being recreated here?

### Layout

Purpose:

- resolve constraints and sizes;
- establish child positions.

Questions:

- Are constraints bounded?
- Is intrinsic sizing causing repeated passes?
- Are nested scrollables causing unbounded axes?
- Is `Expanded` being used where finite remaining space does not exist?

### Paint

Purpose:

- record drawing operations.

Questions:

- Are huge shadows/clips/opacity effects repainting constantly?
- Is a custom painter repainting when inputs have not changed?
- Can static painting be isolated?

### Compositing/rasterization

Purpose:

- combine layers and produce pixels.

Questions:

- Is layer count excessive?
- Are offscreen layers/saveLayer operations dominating?
- Are images too large?
- Does the bottleneck occur on UI or raster side?

### Hit testing

Interactive geometry must correspond to usable target areas, not merely visual bounds.

### Semantics

Accessibility information is a separate framework concern. A custom painting/layout implementation may need explicit semantics even if it looks correct.

---

## Accessibility

Accessibility is mandatory conversion behavior, not post-conversion polish.

### Preserve semantics

Semantic source:

```
<button>Save</button>

```

Do not convert to:

```
GestureDetector(
  child: Container(...),
)

```

unless a custom control is genuinely required and complete semantics/focus/keyboard behavior are intentionally recreated.

### Labels

Provide accessible labels for controls/images when the visual content is insufficient.

For an icon:

```
const Icon(
  Icons.delete_outline,
  semanticLabel: 'Delete item',
)

```

Flutter exposes `semanticLabel` on icons.

### Headings

Preserve content hierarchy.

```
Semantics(
  headingLevel: 1,
  child: Text(
    'Account settings',
    style: Theme.of(context).textTheme.headlineLarge,
  ),
)

```

Current Flutter provides heading levels 1–6, including mapping to web accessibility semantics.

Do not rely on unreleased future heading behavior when targeting a current stable SDK; re-check the semantics API when upgrading because heading behavior continues to evolve.

### Touch target size

Flutter's accessibility guideline APIs include checks corresponding to platform tap-target expectations, including 48×48 logical pixels for Android-style guidance and 44×44 for iOS-style guidance.

Do not shrink hit targets merely to match a screenshot.

### Contrast

Preserve or improve source contrast. Automated guideline checks can detect common problems but are not a substitute for full design review.

### Text scaling

Test enlarged text.

Do not:

- clip headings at accessibility scales;
- place critical text in inflexible heights;
- globally clamp the user's scaler to preserve screenshot geometry.

### Focus

Verify keyboard focusability and traversal.

Flutter's focus traversal defaults can follow reading order, and `FocusTraversalGroup` can define traversal policy where a region needs explicit behavior.

### Keyboard

Every action accessible with a mouse should be evaluated for keyboard access on Web/desktop.

### Screen readers

Test:

- TalkBack on Android;
- VoiceOver on Apple platforms;
- relevant desktop/web screen-reader combinations.

Automated semantics tests cannot replace platform-level assistive-technology verification.

### Decorative content

Exclude purely decorative imagery from semantics where announcing it would add noise.

### Custom painters

If a custom-painted chart/control carries meaningful content, implement semantics separately. `CustomPainter` exposes a semantics builder for custom-painted content.

---

## Hover, Mouse, Keyboard, and Desktop Behavior

A web conversion that merely stretches a touch-first mobile UI across desktop is incomplete.

### Mouse

Support where relevant:

- hover;
- pointer cursors;
- secondary click;
- selection;
- wheel/trackpad scrolling;
- resize interaction.

Flutter's adaptive input guidance specifically calls out mouse, keyboard, hover, right-click, and tab navigation as additional desktop/web interaction modes.

### Hover

Do not hide essential functionality behind hover.

Hover may reveal:

- affordance;
- tooltip;
- preview;
- action styling.

The same action must remain discoverable to touch/keyboard users where required.

### Cursor

Use `MouseRegion.cursor` or framework controls that already expose appropriate cursors.

### Context menus

Use platform-appropriate context behavior when the source relies on right-click or long-press.

### Keyboard shortcuts

Use Flutter's shortcut/action system for application commands rather than raw key-code checks scattered through widgets.

### Focus visuals

Do not remove focus indication merely because the source CSS did.

Custom controls need a visible focused state.

### Window resizing

Test continuously from minimum supported size through wide desktop sizes.

---

## Platform Adaptation

Flutter performs some platform adaptations automatically, while application-level design conventions still require explicit decisions.

| ConcernAndroidiOSWebWindowsmacOSLinux |                                                    |                                                      |                                               |                                             |                                        |                                        |
| ------------------------------------- | -------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------- | ------------------------------------------- | -------------------------------------- | -------------------------------------- |
| Primary navigation                    | Material patterns commonly appropriate             | consider iOS conventions where product warrants      | URL-aware app navigation important            | desktop rail/sidebar/menu often appropriate | desktop sidebar/menu often appropriate | desktop sidebar/menu often appropriate |
| Back behavior                         | system back expectations                           | route/back gesture conventions                       | browser Back/Forward + app route history      | app navigation + keyboard conventions       | app navigation + keyboard conventions  | app navigation + keyboard conventions  |
| Dialogs                               | Material conventions                               | Cupertino/native-feeling adaptation may be warranted | keyboard/focus + browser dimensions           | desktop button/order conventions            | desktop conventions                    | desktop conventions                    |
| Pointer                               | touch primary, mouse possible on some devices      | touch primary, pointer possible                      | mouse/trackpad common                         | mouse/trackpad primary                      | mouse/trackpad primary                 | mouse/trackpad primary                 |
| Keyboard                              | hardware keyboard possible                         | hardware keyboard possible                           | essential                                     | essential                                   | essential                              | essential                              |
| Hover                                 | optional enhancement                               | optional on pointer devices                          | common                                        | common                                      | common                                 | common                                 |
| Text selection                        | content-dependent                                  | content-dependent                                    | expected for document-like content            | expected for document-like content          | expected for document-like content     | expected for document-like content     |
| Safe areas                            | system bars/cutouts                                | notches/home indicator                               | browser viewport generally different concerns | window bounds                               | window bounds                          | window bounds                          |
| Window resizing                       | limited phone window; tablets/multiwindow possible | iPad/multitasking                                    | continuous                                    | continuous                                  | continuous                             | continuous                             |
| Navigation density                    | touch-friendly                                     | touch-friendly                                       | adapt to pointer/window                       | desktop density may differ                  | desktop density may differ             | desktop density may differ             |
| Scrolling                             | touch physics/conventions                          | touch physics/conventions                            | wheel/trackpad/browser expectations           | wheel/trackpad                              | wheel/trackpad                         | wheel/trackpad                         |
| Deep links                            | app links/intents                                  | universal links/deep links                           | URLs are first-class                          | protocol/file activation if required        | URLs/protocols if required             | URLs/protocols if required             |

### Adapt by capability where possible

Avoid giant code paths such as:

```
if (Platform.isWindows) ...
else if (Platform.isMacOS) ...
else if (Platform.isLinux) ...

```

when the true question is:

```
Does this environment have a pointer?
Does this platform support this integration?
Is the window wide enough?
Should the control follow a platform convention?

```

Flutter's adaptive guidance encourages thinking in terms of capabilities and policies rather than assuming platform names are always the correct abstraction.

---

## Flutter Web

### Understand the product fit first

Flutter Web is appropriate for app-centric experiences such as:

- dashboards;
- interactive tools;
- rich application shells;
- authenticated SaaS products;
- application experiences shared across platforms.

Flutter's own web guidance cautions that static, text-rich, document-centric sites are not Flutter Web's strongest fit. Traditional HTML can be preferable for such content.

### Do not model Flutter Web as HTML generation

Flutter Web does not simply recreate the source DOM tree.

Flutter:

- owns its application rendering;
- maintains Flutter semantics separately;
- integrates with the browser where required.

### Rendering architecture

Current Flutter Web builds use CanvasKit in the standard build and can use the Wasm/skwasm path where supported when built for WebAssembly, with CanvasKit fallback behavior. Re-check renderer details against the installed Flutter release because the web renderer continues to evolve.

Do not encode renderer-specific hacks into ordinary components.

### Accessibility

Flutter Web translates its semantics information into browser-accessible semantics structures. Correct Flutter semantics therefore still matter.

### Text selection

If text behaves like web content, make it selectable intentionally.

### Browser history

Use routing architecture capable of synchronizing application routes with browser history where required.

### Loading performance

Consider:

- application payload;
- image size;
- font assets;
- startup dependencies;
- JS/Wasm integrations;
- code paths needed at startup.

Do not solve a document website's loading/SEO requirements by assuming application-style rendering is equivalent.

### SEO

Do not claim traditional DOM/HTML SEO parity.

For SEO-heavy marketing/document pages, consider:

- retaining the HTML site;
- embedding Flutter only for interactive application islands;
- navigating from the public website to the Flutter application;
- hybrid architecture.

### Embedding Flutter in an existing website

Flutter officially supports embedding a Flutter Web application in an existing webpage, including embedded/multi-view scenarios.

This can be preferable to replacing an entire existing site.

### Embedding HTML in Flutter Web

For web-only DOM elements, `HtmlElementView` can host browser elements.

Use it for genuine browser integration boundaries, not to avoid converting ordinary application UI.

---

## JS Interop Decision Guide

Modern Dart JavaScript interoperability is based on `dart:js_interop`, with `package:web` providing typed browser APIs. Legacy web libraries such as `dart:html` are deprecated for new code and are not the correct modern foundation, particularly for Wasm-compatible Dart web code.

### Rewrite in Dart

Rewrite when:

- code is business logic;
- code manipulates DOM solely to render application UI;
- the Flutter/Dart ecosystem has an equivalent API;
- behavior needs to work on mobile/desktop too;
- the JavaScript dependency is small and easily expressed as Dart;
- type safety/testability benefit materially from migration.

Examples:

```
array filtering
form validation
business calculations
API orchestration
route guards
application state
component state

```

### Use JS interop

Use JS interop when:

- a mature third-party SDK is only supported in JavaScript;
- a browser API has no suitable `package:web`/Flutter abstraction;
- replacing the library would create unnecessary risk;
- the integration is web-only;
- communication can be kept behind a narrow typed boundary.

Architecture:

```
Flutter feature
    ↓
Dart interface
    ↓
web implementation
    ↓
dart:js_interop / package:web
    ↓
JS SDK / browser API

```

### Preserve JavaScript rather than translating it when

The JavaScript implementation:

- is externally maintained;
- has significant behavior hidden inside a third-party SDK;
- depends heavily on browser internals;
- would be more fragile when rewritten;
- has a supported vendor integration path.

### JS Promise → Dart Future

Modern JS interop can convert JavaScript promises into Dart futures through current interop APIs.

### Isolate web-only code

Do not import web-only libraries into files that must compile for Android/iOS/desktop.

Use conditional imports or platform-specific implementations behind an interface.

### Interop performance

Minimize excessively chatty crossings such as:

```
Dart → JS → Dart → JS for every pixel/tick

```

Keep domain computation on one side and exchange coarse typed values/events.

---

## HTML Embedding Decision Tree

> Should I rebuild this in Flutter or preserve the existing web component?

```
START
 |
 |-- Is the content primarily an application UI owned by this product?
 |       |
 |       |-- YES
 |       |    |
 |       |    |-- Does it rely on a JS-only/vendor/browser implementation
 |       |    |   that is expensive or risky to reproduce?
 |       |    |        |
 |       |    |        |-- NO → Rebuild natively in Flutter.
 |       |    |        |
 |       |    |        |-- YES
 |       |    |              |
 |       |    |              |-- Is the integration logic-only?
 |       |    |              |      → JS interop behind a Dart interface.
 |       |    |              |
 |       |    |              |-- Does it own DOM/rendering?
 |       |    |                     → platform view / HtmlElementView /
 |       |    |                       WebView / vendor Flutter integration.
 |       |
 |       |-- NO
 |            |
 |            |-- Is it document-centric HTML where exact web formatting,
 |            |   links, selectable text, or SEO matters?
 |            |        |
 |            |        |-- YES → Keep HTML/external web experience,
 |            |        |          or embed if application context requires.
 |            |        |
 |            |        |-- NO → Evaluate native Flutter reproduction.

```

### Static formatted article

Prefer:

- native Flutter text for app-owned article content when styling/semantics are straightforward;
- an HTML-content renderer/WebView/external page when preserving arbitrary publisher HTML is the real requirement.

### Interactive dashboard

Prefer native Flutter when the dashboard is product-owned and must work cross-platform.

### Payment widget

Prefer the payment provider's supported Flutter/native/web integration. Do not rewrite sensitive vendor payment UI merely for architectural purity.

### Map

Prefer an officially supported Flutter/native integration where available. Preserve JS-based map rendering through a browser boundary only when required.

### Third-party embedded component

Preserve it when the vendor owns behavior and lifecycle, especially where replacement would lose support/security compatibility.

### Rich editor

A complex DOM-based editor may justify embedding or interop. Rebuilding a full editor in Flutter is a product project, not a tag conversion.

### Legacy web application

Usually choose:

- staged migration;
- route-level WebView;
- external experience;
- embedded Flutter islands;

unless there is explicit scope for full reimplementation.

### Marketing site

If discoverability, document semantics, fast textual loading, and conventional web SEO are primary requirements, retain a web-native frontend and use Flutter for app-centric sections.

### Platform-view warning

Platform views introduce integration and compositing complexity and may have performance/accessibility/focus tradeoffs. Flutter's platform-view documentation describes platform-specific composition behavior and costs.

Use them because they solve a boundary problem, not as the default conversion mechanism.

---

## Canvas / SVG / Custom Graphics

### SVG

Prefer maintainable vector asset rendering.

Do not manually recreate a detailed logo with dozens of Flutter widgets.

### Canvas

If the source HTML Canvas represents:

- custom drawing;
- diagram;
- waveform;
- visualization;

evaluate `CustomPainter`.

### Charts

Prefer a maintained Flutter chart implementation if the feature is fundamentally a chart and project dependency policy allows it.

Do not manually port thousands of JavaScript canvas drawing lines unless preserving that renderer is actually required.

### CSS-generated shapes

Simple shapes:

- borders;
- gradients;
- rounded surfaces;

→ normal Flutter decoration.

Complex paths/diagrams:

→ vector asset or custom painter.

### CustomPainter decision

Use when:

- drawing itself is the domain;
- many geometric primitives must render in one canvas;
- widget composition would be significantly more complex;
- paint-only animation is valuable.

Avoid when ordinary layout/widgets communicate the structure better.

### Accessibility

Any meaningful content drawn on a canvas needs an alternate semantics representation.

---

## Performance Profiling Workflow

**Do not guess about performance when it can be measured.**

### 1. Reproduce in profile mode

Use representative target hardware and realistic data.

### 2. Capture a problematic interaction

Examples:

- opening dashboard;
- scrolling list;
- resizing window;
- animation;
- loading image gallery.

### 3. Inspect frame timing

Determine:

```
UI-side issue?
Raster-side issue?
Both?
Neither — perhaps networking/startup/memory?

```

### 4. Inspect rebuild behavior

Use DevTools rendering/rebuild diagnostics.

Ask:

- which state changed?
- which widgets rebuilt?
- was that scope expected?
- is expensive computation in build?

### 5. Inspect layout

Look for:

- repeated intrinsic passes;
- pathological deep layout;
- unbounded-constraint workarounds;
- shrink-wrapped huge collections;
- repeated size measurement.

### 6. Inspect paint/rasterization

Look for:

- unnecessary clipping;
- opacity;
- saveLayer;
- large shadows;
- overly complex custom painting;
- constant repainting of static regions.

### 7. Inspect scrolling

Verify:

- builders/slivers;
- item complexity;
- image size;
- pagination;
- unnecessary nested scrollables.

### 8. Inspect memory

Use DevTools memory tooling.

Look for:

- oversized decoded images;
- controller/subscription leaks;
- retained route/page state;
- unbounded caches;
- growing collections.

### 9. Inspect CPU

Use CPU profiler for synchronous work.

Flutter DevTools provides performance, CPU, and memory profiling tools for these diagnostics.

### 10. Optimize the measured bottleneck

Then profile again.

Do not call an optimization successful because the code "looks faster."

---

## Cross-Platform Performance

Never assume an optimization has identical effect everywhere.

### Android/iOS

Measure on representative low/mid/high devices where product requirements warrant it.

Pay attention to:

- image memory;
- list/raster load;
- startup;
- platform-view integration;
- high-refresh-rate displays.

### Web

Also use browser tooling.

Potential bottlenecks include:

- asset/network loading;
- JS/Wasm boundary work;
- browser memory;
- renderer workload;
- application bundle/startup.

### Desktop

Evaluate:

- very large window sizes;
- high-density displays;
- continuous resize;
- large data views;
- pointer-driven high-frequency interaction;
- platform views.

Do not infer desktop performance from a small phone viewport.

---
