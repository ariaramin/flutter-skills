# Anti-patterns, review checklists, and conversion decision trees

This reference preserves detailed guidance from the supplied HTML/CSS/JavaScript → Flutter research. Read the relevant section when the main skill directs you here.

## Contents

- Anti-Patterns
- Code Review Checklist
  - Architecture
  - Layout
  - Responsiveness
  - Dart quality
  - State
  - Semantics
  - Navigation
  - Assets
  - Testability
- Performance Review Checklist
- Accessibility Review Checklist
- Cross-Platform Review Checklist
  - Android
  - iOS
  - Web
  - Windows
  - macOS
  - Linux
- Conversion Decision Trees
  - `Row` / `Column` / `Wrap` / `Grid` / `Stack`?
  - `MediaQuery` or `LayoutBuilder`?
  - Stateful or stateless widget?
  - Rebuild in Flutter or embed existing HTML?
  - Rewrite JavaScript or use JS interop?
  - ListView or Column?
  - Normal widget or CustomPainter?
  - Shared UI or platform-adaptive UI?
  - Local state or application state?

## Anti-Patterns

| Anti-patternWhy it is harmfulCorrect approach              |                                                                      |                                                                                                                 |
| ---------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `<div>` → `Container` everywhere                           | Recreates meaningless wrappers and bloats layout                     | Determine each wrapper's job and use `Padding`, `SizedBox`, `Align`, `DecoratedBox`, layout widgets, or nothing |
| one widget per HTML tag                                    | Preserves DOM structure rather than Flutter architecture             | Create widgets around semantic/product/state boundaries                                                         |
| giant nested `Container` trees                             | Mixes spacing, decoration, constraints, and layout ambiguously       | Use single-purpose primitives                                                                                   |
| copying DOM hierarchy exactly                              | Source structure often exists for CSS/browser needs                  | Reconstruct semantic Flutter composition                                                                        |
| hard-coded screen coordinates                              | Breaks resizing, localization, scaling                               | Use constraints, flex, grid, alignment                                                                          |
| entire page in `Stack`                                     | Treats Flutter like absolute-positioned canvas                       | Use normal layout and reserve Stack for overlap                                                                 |
| copying every CSS pixel                                    | Fails under platform fonts and dynamic layout                        | Preserve visual rhythm/constraints, validate at references                                                      |
| global `MediaQuery`mobile/tablet/desktop switch everywhere | Ignores local component width                                        | Use `LayoutBuilder` locally and shell breakpoints only when shared                                              |
| orientation = device type                                  | Desktop and foldable windows invalidate assumption                   | Branch on available width/capabilities                                                                          |
| literal CSS Grid imitation                                 | Flutter grid algorithm differs                                       | Restructure or use custom layout where necessary                                                                |
| treating `Expanded` like CSS `flex:1` universally          | Fails under unbounded constraints and has different sizing semantics | Use Expanded/Flexible only inside appropriate bounded Flex                                                      |
| `Expanded` inside scrolling main axis                      | No finite remaining space                                            | Remove flex, constrain, or use sliver composition                                                               |
| arbitrary `shrinkWrap: true` fixes                         | Can force expensive measurement and hide scroll-ownership errors     | Define one scroll owner and compose slivers                                                                     |
| giant `SingleChildScrollView` + `Column` for large data    | Builds all children eagerly                                          | Use lazy list/grid/sliver                                                                                       |
| `IntrinsicHeight`/`IntrinsicWidth`everywhere               | Adds speculative layout passes                                       | Prefer constraints/flex; intrinsic measurement only when necessary                                              |
| literal DOM mutation in Dart                               | Fights Flutter's declarative architecture                            | Model state and rebuild                                                                                         |
| storing rendered widgets as mutable state                  | Confuses state with presentation                                     | Store domain/UI data and derive widgets                                                                         |
| GlobalKey as state manager                                 | Tight coupling and potentially expensive reparenting                 | Use explicit ownership/data flow                                                                                |
| network request in `build()`                               | Rebuilds can duplicate side effects                                  | Initiate in view model/lifecycle/data layer                                                                     |
| Future created inside every `FutureBuilder` build          | Restarts work unexpectedly                                           | Create/cache the Future outside repeated build                                                                  |
| all JavaScript retained through interop                    | Sacrifices cross-platform behavior/type safety                       | Rewrite app logic in Dart; interop only at justified boundary                                                   |
| all JavaScript rewritten                                   | Risks breaking mature vendor/browser SDKs                            | Preserve JS-only integrations behind narrow interop                                                             |
| platform view for ordinary controls                        | Adds composition/focus/accessibility complexity                      | Rebuild ordinary product UI in Flutter                                                                          |
| clickable `Container` as button                            | Loses built-in semantics/focus/state behavior                        | Use Flutter button controls                                                                                     |
| hover-only controls                                        | Unavailable to touch/keyboard users                                  | Make functionality accessible by multiple input modes                                                           |
| fixed card heights around text                             | Breaks scaling/localization                                          | Use flexible constraints and content-driven height                                                              |
| disabling text scaling for fidelity                        | Accessibility failure                                                | Design for scaling                                                                                              |
| clipping every rounded card                                | Unnecessary rendering work                                           | Clip only when child content must be clipped                                                                    |
| wrapping large subtrees in `Opacity` for color tint        | May add compositing cost                                             | Apply alpha to affected color where possible                                                                    |
| blanket `RepaintBoundary`                                  | Adds layer complexity without proven benefit                         | Add only where repaint isolation helps                                                                          |
| excessive custom painting                                  | Loses standard layout/semantics behavior                             | Prefer widgets/assets unless graphics justify painter                                                           |
| `setState` at app root for leaf hover                      | Rebuild scope larger than ownership                                  | Localize ephemeral state                                                                                        |
| forcing one state library everywhere                       | Architecture becomes dependency-driven                               | Select mechanism by state ownership                                                                             |
| business logic inside page widget                          | Hard to test and reuse                                               | Move to domain/view-model/repository layers                                                                     |
| magic CSS values repeated in Dart                          | Design system drifts                                                 | Extract theme/tokens                                                                                            |
| direct browser storage calls scattered through UI          | Breaks cross-platform architecture                                   | Use persistence repository/interface                                                                            |
| assuming `localStorage` = universal preferences            | Different persistence semantics                                      | Translate intent, then choose platform storage                                                                  |
| named routes for complex Web routing                       | Poor fit for modern deep-link/browser-history needs                  | Use Navigator for simple flows or Router-based architecture                                                     |
| old `dart:html`/`dart:js` interop                          | Deprecated modern-web path                                           | Use `dart:js_interop` + `package:web`                                                                           |
| old `MaterialState` examples                               | Superseded terminology/API                                           | Use `WidgetState` APIs                                                                                          |
| `Color.withOpacity` in new code                            | Deprecated in current API line                                       | Use `withValues(alpha: ...)`                                                                                    |
| obsolete shader warmup advice everywhere                   | Renderer architecture has evolved                                    | Profile current renderer/target                                                                                 |
| measuring performance in debug                             | Debug overhead distorts production behavior                          | Profile in profile/release conditions                                                                           |
| assuming every rebuild is expensive                        | Misunderstands Flutter pipeline                                      | Measure build/layout/paint separately                                                                           |
| forcing same mobile UI on desktop                          | Poor pointer/keyboard/window UX                                      | Add adaptive desktop behavior                                                                                   |
| Flutter Web for all marketing content                      | App renderer may not suit document-centric SEO/text                  | Keep web-native content where appropriate                                                                       |

---

## Code Review Checklist

### Architecture

-  Source DOM hierarchy was not reproduced mechanically.
-  UI, business rules, data access, persistence, and platform integrations have clear boundaries.
-  Repositories/services are not implemented in widget `build()` methods.
-  Project structure matches application complexity.
-  External/browser-only dependencies have explicit boundaries.

### Layout

-  Constraints are understood at each major layout boundary.
-  `Expanded`/`Flexible` are used only in valid Flex contexts.
-  No unexplained giant `Stack`.
-  Fixed dimensions have a design reason.
-  Long content has an explicit overflow/scroll policy.
-  Intrinsic sizing is justified.
-  CSS Grid layouts have been reinterpreted rather than falsely mapped.

### Responsiveness

-  Local width decisions use local constraints where appropriate.
-  Window/environment decisions use `MediaQuery`.
-  Breakpoints are justified by content.
-  Intermediate resize widths work.
-  State survives layout switching.
-  Mobile, tablet/medium, and wide application behavior are tested where relevant.

### Dart quality

-  Sound null safety.
-  Typed data models.
-  Async failures handled intentionally.
-  Resources are disposed.
-  No unnecessary dynamic JS-style coding.
-  Current, non-deprecated APIs.

### State

-  Single source of truth identified.
-  Derived state is not unnecessarily duplicated.
-  Leaf state is local where possible.
-  Server/persisted/session state are distinguished.
-  Widgets are not stored as application data.

### Semantics

-  Buttons are semantic controls.
-  Headings remain headings.
-  Images have correct semantic labels or are decorative.
-  Forms have usable labels/errors.
-  Focus order works.
-  Keyboard interaction works.
-  Text scaling works.

### Navigation

-  Route model reflects application destinations.
-  Deep links handled if required.
-  browser back/forward tested on Web.
-  query/path parameters handled centrally.
-  local tabs are not incorrectly modeled as routes, or vice versa.

### Assets

-  Fonts and weights declared correctly.
-  Images sized appropriately.
-  SVG/vector strategy is explicit.
-  loading/error states exist for network assets.
-  decorative images excluded from semantics as appropriate.

### Testability

-  domain/data logic unit-testable.
-  key components widget-testable.
-  routing tested.
-  responsive branches tested.
-  integration tests cover critical flows.
-  goldens used selectively.

---

## Performance Review Checklist

-  Performance measured in profile/release conditions.
-  UI and raster frame timing inspected.
-  expensive synchronous work absent from `build()`.
-  state changes are reasonably localized.
-  large collections are lazy.
-  image decode sizes are appropriate.
-  no accidental giant shrink-wrapped collections.
-  intrinsic widgets justified.
-  clipping justified.
-  opacity layers justified.
-  large shadows measured if heavily repeated/animated.
-  custom painters implement sensible `shouldRepaint`.
-  `RepaintBoundary` used only with reason.
-  controllers/subscriptions/timers disposed.
-  memory profile inspected for suspected leaks.
-  Web-specific performance measured in browser tooling where relevant.
-  optimization was re-profiled after the change.

---

## Accessibility Review Checklist

-  Standard semantic controls used where possible.
-  Every actionable icon has an accessible name.
-  Heading hierarchy preserved.
-  Form fields have labels and meaningful error messages.
-  decorative content is not announced unnecessarily.
-  touch targets satisfy target-platform guidance.
-  color contrast is acceptable.
-  information is not communicated by color alone.
-  text remains usable at increased scaling.
-  focus indicator visible.
-  focus traversal follows logical reading/action order.
-  all critical mouse actions have keyboard/touch alternatives.
-  dialogs manage focus correctly.
-  custom painting includes semantic representation where needed.
-  screen-reader testing completed on supported platforms.
-  Flutter accessibility guideline tests used where applicable. Flutter supplies automated checks for common labels, contrast, and tap-target issues.

---

## Cross-Platform Review Checklist

### Android

-  system back behavior correct;
-  safe/system areas correct;
-  touch targets usable;
-  permissions/network configuration correct;
-  platform views profiled if present;
-  text scaling checked.

### iOS

-  safe areas correct;
-  navigation/dialog conventions evaluated;
-  VoiceOver tested;
-  text scaling checked;
-  platform integrations use supported APIs;
-  pointer/keyboard behavior checked where iPad support matters.

### Web

-  direct deep links load;
-  Back/Forward behavior correct;
-  URL strategy/server rewrites correct;
-  text selection intentional;
-  keyboard/focus complete;
-  browser resizing complete;
-  accessibility semantics tested;
-  JS interop isolated;
-  SEO/product-fit decision documented;
-  startup/assets profiled.

### Windows

-  window resizing;
-  pointer/hover;
-  keyboard traversal/shortcuts;
-  desktop navigation density;
-  dialogs/menus;
-  high-DPI rendering.

### macOS

-  window resizing;
-  pointer/trackpad;
-  keyboard;
-  desktop menu/dialog expectations;
-  text selection;
-  platform-view performance if present.

### Linux

-  window resizing;
-  pointer/keyboard;
-  supported desktop conventions;
-  density and text behavior;
-  platform integration availability;
-  representative distribution/environment tested where product requires it.

---

## Conversion Decision Trees

### `Row` / `Column` / `Wrap` / `Grid` / `Stack`?

```
Do children overlap?
 ├─ yes → Stack/Positioned, but only for real overlap
 └─ no
     |
     ├─ one-dimensional sequence?
     |    ├─ horizontal → Row
     |    └─ vertical   → Column
     |
     ├─ should items wrap into runs?
     |    └─ yes → Wrap
     |
     ├─ repeated two-dimensional cells?
     |    └─ yes → GridView / SliverGrid
     |
     └─ complex heterogeneous dashboard?
          → explicit responsive composition or custom layout

```

### `MediaQuery` or `LayoutBuilder`?

```
Does decision depend on space this parent gives the component?
 └─ yes → LayoutBuilder

Does decision depend on Flutter window/system information?
 └─ yes → MediaQuery

Does it depend on both?
 └─ measure each at the appropriate level; do not substitute one for the other

```

### Stateful or stateless widget?

```
Does this widget itself own mutable lifecycle state/resource?
 ├─ no → StatelessWidget
 └─ yes
      |
      ├─ local value / controller / focus / animation / subscription?
      |    → StatefulWidget
      |
      └─ state is actually owned by feature/app layer?
           → keep view stateless where practical and inject observed state

```

### Rebuild in Flutter or embed existing HTML?

```
Product-owned app UI?
 ├─ yes
 |   ├─ ordinary controls/layout → rebuild in Flutter
 |   └─ vendor DOM-only widget → interop/embed boundary
 └─ no
     └─ document-centric/external web content?
          → keep/serve/embed HTML as requirements dictate

```

### Rewrite JavaScript or use JS interop?

```
Is it app/business/state logic?
 └─ rewrite in Dart

Is it DOM manipulation for source UI?
 └─ replace with declarative Flutter

Is it JS-only vendor/browser functionality?
 ├─ typed browser API available in package:web → use it
 └─ external JS SDK required → dart:js_interop boundary

```

### ListView or Column?

```
Small, bounded, static group that participates in parent layout?
 └─ Column

Potentially long/dynamic/scrolling list?
 └─ ListView.builder / sliver

Heterogeneous page with multiple scrolling sections?
 └─ CustomScrollView + slivers

```

### Normal widget or CustomPainter?

```
Can widgets/decorations/vector assets represent it clearly?
 └─ yes → normal widgets/assets

Is the requirement fundamentally custom drawing/geometry?
 └─ yes → CustomPainter

Does painted content convey semantics?
 └─ yes → implement semantics separately

```

### Shared UI or platform-adaptive UI?

```
Is behavior/visual convention universal and usable on all targets?
 └─ yes → shared UI

Does platform input/convention materially change usability?
 └─ yes → adaptive policy/component

Is the difference actually caused by available width/capability?
 └─ yes → branch on width/capability, not platform name

```

### Local state or application state?

```
Does only this local subtree care?
 └─ local state

Must unrelated routes/features observe it?
 └─ application/shared state

Is it derivable from other state?
 └─ derive it; don't create another source of truth

Must it survive process restart?
 └─ persisted repository

Does server own the canonical value?
 └─ server-state/repository model

```

---
