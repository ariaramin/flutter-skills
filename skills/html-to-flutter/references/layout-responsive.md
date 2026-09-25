# Layout, source analysis, and responsive conversion

This reference preserves detailed guidance from the supplied HTML/CSS/JavaScript → Flutter research. Read the relevant section when the main skill directs you here.

## Contents

- Conversion Mental Model
  - Browser mental model
  - Flutter mental model
  - Flutter's box-layout rule
  - Declarative UI rule
- Source Analysis Procedure
  - 1. Inventory the source
  - 2. Analyze HTML semantically
  - 3. Analyze CSS as a system
  - 4. Analyze JavaScript by responsibility
  - 5. Build a state inventory
  - 6. Analyze responsive behavior
  - 7. Analyze external dependencies
  - 8. Produce an implementation map
- Web-to-Flutter Mapping Rules
  - When to extract a custom widget
- CSS Layout Translation
  - Block flow
  - CSS box model
  - Do not blindly copy fixed dimensions
  - Flexbox conversion
  - CSS Grid conversion
  - Positioning and layering
  - Overflow
- Responsive Conversion
  - Use `LayoutBuilder` when
  - Use `MediaQuery` when
  - Use `OrientationBuilder` when
  - Breakpoint policy
  - Mobile-first conversion
  - Foldables
  - Window resizing

## Conversion Mental Model

Treat the source application as four overlapping systems:

```
HTML
  ↓
Semantic structure, information hierarchy, controls, content relationships

CSS
  ↓
Layout intent, visual constraints, responsive behavior, design tokens,
interaction states, typography, decoration, animation

JavaScript
  ↓
State transitions, business rules, data access, events, routing,
persistence, asynchronous behavior, integration boundaries

Flutter + Dart
  ↓
Declarative widget composition + constraints-based layout
+ typed state/data models + explicit architecture

```

### Browser mental model

A web browser combines:

- DOM nodes;
- CSS cascade and inheritance;
- style computation;
- browser layout algorithms such as block layout, flexbox, grid, and positioning;
- paint;
- compositing;
- JavaScript mutation of DOM and CSSOM;
- browser history and URL APIs;
- browser storage;
- browser accessibility semantics.

### Flutter mental model

Flutter has multiple cooperating trees:

- **Widget tree**: immutable configuration descriptions.
- **Element tree**: persistent mounted instances that connect widgets to lifecycle and update behavior.
- **Render-object tree**: objects responsible for layout, painting, hit testing, and semantics.

A widget does not directly correspond to a DOM element. Flutter can rebuild widget descriptions without recreating every underlying element or render object. Render objects participate in layout and painting independently of widget reconstruction.

### Flutter's box-layout rule

For ordinary box layout:

```
Parent
  │
  ├── sends BoxConstraints downward
  ↓
Child chooses a Size permitted by those constraints
  │
  └── reports Size upward
Parent positions child

```

Remember:

> Constraints go down. Sizes go up. Parents set positions.

Consequences:

- `width: 300` is not an unconditional command if the parent's constraints do not permit 300.
- A child generally cannot know or choose its absolute screen position.
- `Expanded` only makes sense when a `Flex` has finite main-axis space to divide.
- percentage-like sizing should normally be derived from available constraints rather than copied from CSS viewport arithmetic.
- unbounded constraints are common inside scrollables and require deliberate handling.
- overflowing `Row` or `Column` content is normally a layout-model error, not an invitation to shrink everything arbitrarily.

Flutter's documented layout model is a one-pass constraints system rather than the browser's CSS formatting model.

### Declarative UI rule

Convert:

```
event
→ locate element
→ mutate style/content/classes

```

into:

```
event
→ update application/UI state
→ Flutter rebuilds affected widget descriptions
→ framework updates render tree as necessary

```

Think:

```
UI = f(state)

```

not:

```
UI = mutable collection of elements

```

---

## Source Analysis Procedure

Do not write Flutter code until the following analysis is complete.

### 1. Inventory the source

Identify:

- HTML entry points;
- CSS files and preprocessors;
- JavaScript/TypeScript entry points;
- framework usage;
- image/font/vector assets;
- routing configuration;
- API clients;
- persistence;
- service workers or browser-only behavior;
- third-party SDKs;
- embedded iframes/components;
- testing configuration;
- localization;
- accessibility attributes;
- responsive breakpoints.

Create a conversion inventory:

```
Source area              Flutter destination
---------------------------------------------------------
Global CSS tokens        Theme / ThemeExtension
Page shell               Scaffold / adaptive shell
DOM component            Reusable widget
Local UI state           Stateful owner / notifier
Application state        View-model/controller/store
fetch()/API module       Service + repository
Browser route            Navigator/Router configuration
localStorage             Persistence abstraction
JS-only widget           Rewrite / JS interop / platform view

```

### 2. Analyze HTML semantically

Record:

- document landmarks: `main`, `nav`, `header`, `footer`, `aside`;
- heading hierarchy;
- sections and articles;
- repeated cards/items;
- forms and labels;
- tables and relationships;
- buttons vs links;
- dialogs;
- tabs/accordions;
- list semantics;
- image alternative text;
- disabled/selected/expanded state;
- ARIA use and whether it compensates for non-semantic HTML.

Do not reproduce HTML wrappers that exist only for CSS selectors.

### 3. Analyze CSS as a system

Extract:

- root/custom-property tokens;
- color palette;
- typography;
- spacing rhythm;
- radius;
- shadows/elevation;
- component variants;
- breakpoints;
- max-content widths;
- flex layouts;
- grid layouts;
- positioning;
- overflow;
- state selectors such as `:hover`, `:focus-visible`, `:disabled`;
- dark/light schemes;
- animation timing and easing;
- hidden/show rules;
- print-only or browser-only styling.

Classify every important CSS rule by intent:

```
layout
spacing
sizing
decoration
typography
interaction state
responsive rule
animation
accessibility
browser workaround

```

Browser workarounds generally should **not** survive conversion unless the corresponding Flutter/platform issue exists.

### 4. Analyze JavaScript by responsibility

Separate:

- UI state;
- derived state;
- business rules;
- validation;
- event handlers;
- network requests;
- routing/history;
- persistence;
- timers;
- animation;
- DOM mutation;
- browser APIs;
- third-party SDKs;
- analytics;
- authentication;
- background behavior.

For each module ask:

1. Is this product logic that should be rewritten in Dart?
2. Is it DOM-specific code that disappears after conversion?
3. Is it a browser integration that should remain behind JS interop?
4. Does it belong in the data layer rather than the UI?
5. Does it require a platform-specific implementation?

### 5. Build a state inventory

For each state value record:

| StateOwnerLifetimeShared?Persisted?Server-backed?Derived? |             |           |     |       |                  |     |
| --------------------------------------------------------- | ----------- | --------- | --- | ----- | ---------------- | --- |
| selected tab                                              | page        | page      | no  | no    | no               | no  |
| signed-in user                                            | app/session | session   | yes | maybe | yes              | no  |
| filtered rows                                             | derived     | transient | no  | no    | from server data | yes |

Never create independent mutable copies of derived data without a reason.

### 6. Analyze responsive behavior

For each breakpoint or container rule, record what actually changes:

```
< 560:
- one-column cards
- bottom navigation
- table becomes list

560–960:
- two-column cards
- navigation rail

> 960:
- persistent side navigation
- wider content
- data table

```

Do not merely transcribe CSS numbers. Ask why each transition exists and whether the Flutter component's available width produces the same need.

### 7. Analyze external dependencies

Classify each dependency:

```
Pure business logic                → rewrite in Dart
HTTP/JSON library                  → replace with Dart solution
Browser DOM utility                → usually disappears
JS-only SaaS SDK                   → evaluate JS interop
Iframe widget                      → evaluate embedding/platform view
Payment or identity widget         → preserve vendor-supported integration
Map/editor/video SDK               → use supported Flutter/native integration if available
Legacy entire web application      → likely staged migration or WebView/external web

```

### 8. Produce an implementation map

Before coding, define:

- app shell;
- routes;
- design tokens/theme;
- reusable UI components;
- page-level widgets;
- state owners;
- repositories/services;
- platform integrations;
- responsive branches;
- accessibility requirements;
- test strategy;
- visual-fidelity reference sizes.

Only then begin implementation.

---

## Web-to-Flutter Mapping Rules

There is no universal mapping such as `div = Container`.

Interpret each source element according to semantics, layout, state, and interaction.

| Source conceptLikely Flutter choicesConversion reasoning |                                                                                                        |                                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `<div>`                                                  | `Padding`, `SizedBox`, `Row`, `Column`, `Wrap`, `Align`, `DecoratedBox`, reusable widget, or nothing   | Determine why the wrapper exists. Eliminate CSS-only wrappers.                        |
| `<main>`                                                 | page body, `Scaffold.body`, semantic page widget                                                       | Preserve primary-content hierarchy, not the tag itself.                               |
| `<header>`                                               | `AppBar`, page heading, `SliverAppBar`, section header                                                 | Depends on scope and scrolling behavior.                                              |
| `<footer>`                                               | page/footer widget, bottom region, sliver                                                              | Distinguish content footer from application navigation.                               |
| `<nav>`                                                  | `NavigationBar`, `NavigationRail`, `Drawer`, menu, route links                                         | Select by information architecture and available space.                               |
| `<section>`                                              | reusable section widget, `Column`, sliver                                                              | Preserve heading/content relationship where relevant.                                 |
| `<article>`                                              | content widget, possibly `SelectionArea`                                                               | Article semantics may imply selectable/document-like content.                         |
| `h1`–`h6`                                                | themed `Text` plus heading semantics                                                                   | Preserve heading hierarchy. `Semantics.headingLevel`supports explicit heading levels. |
| `<p>`                                                    | `Text`, `SelectableText`                                                                               | Choose selection behavior appropriate to platform/content.                            |
| `<span>`                                                 | `TextSpan`, `WidgetSpan`, nested `Text`                                                                | Use rich text for inline differences.                                                 |
| `<ul>/<ol>`                                              | small static `Column`, lazy `ListView` for large data                                                  | Render bullet/number semantics explicitly.                                            |
| `<img>`                                                  | `Image.asset`, `Image.network`, vector solution                                                        | Preserve accessible description or mark decorative imagery appropriately.             |
| `<a>`                                                    | route navigation, external-URI action, semantic link                                                   | A link and a button have different intent.                                            |
| `<button>`                                               | `FilledButton`, `OutlinedButton`, `TextButton`, `IconButton`, custom semantic control                  | Prefer framework controls.                                                            |
| `<form>`                                                 | `Form`                                                                                                 | Own validation/submission state intentionally.                                        |
| `<input>`                                                | `TextFormField`, checkbox/radio/switch/etc.                                                            | Select by semantic input type.                                                        |
| `<textarea>`                                             | multiline `TextFormField`                                                                              | Configure lines, keyboard, focus, autofill.                                           |
| `<select>`                                               | `DropdownMenu` or design-specific selector                                                             | Material 3's `DropdownMenu` is appropriate for many standard choices.                 |
| `<table>`                                                | `Table`, `DataTable`, `PaginatedDataTable`, virtualized two-dimensional solution, list/card adaptation | Choose according to dataset size and screen width.                                    |
| `<dialog>`                                               | `showDialog`, `AlertDialog`, custom `Dialog`                                                           | Preserve focus, dismissal, and modal semantics.                                       |
| tabs                                                     | `TabBar`/`TabBarView`, nested route, segmented navigation                                              | Determine whether tabs are UI state or navigation state.                              |
| accordion/details                                        | `ExpansionTile`, `ExpansionPanelList`, custom disclosure                                               | Preserve expanded/collapsed semantics.                                                |
| card                                                     | `Card`, `DecoratedBox`, reusable domain component                                                      | Create a domain widget if behavior and styling repeat.                                |
| sidebar                                                  | `NavigationRail`, drawer, persistent pane                                                              | Responsive shell decision, not a generic `Column`.                                    |

Semantic HTML itself carries interaction and accessibility behavior in browsers; native semantic elements should be interpreted as intent rather than flattened into visual boxes.

### When to extract a custom widget

Create a reusable widget when at least one is true:

- it represents a meaningful product/domain component;
- styling and behavior repeat;
- it owns local interaction state;
- it forms a useful rebuild boundary;
- it has testable behavior;
- it exposes a clear API;
- its implementation complexity obscures its parent.

Do **not** create a widget solely because the source had a `<div>` or a CSS class.

---

## CSS Layout Translation

### Block flow

Typical vertical document flow:

```
.panel {
  display: block;
}

```

may become:

```
Column(
  crossAxisAlignment: CrossAxisAlignment.stretch,
  spacing: 16,
  children: const [
    Header(),
    Body(),
    Footer(),
  ],
)

```

But use a scrollable when the sequence can exceed the viewport.

### CSS box model

Interpret rather than duplicate:

| CSSFlutter                   |                                                                                        |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| `padding`                    | `Padding`                                                                              |
| `margin`                     | usually outer `Padding` or parent `spacing`; `Container.margin` only as convenience    |
| `width` / `height`           | `SizedBox`, `ConstrainedBox`, parent constraint, aspect/flex rules                     |
| `min-*` / `max-*`            | `ConstrainedBox` / `BoxConstraints`                                                    |
| `%`                          | parent constraints, `FractionallySizedBox`, flex; avoid viewport arithmetic by default |
| `vw` / `vh`                  | `MediaQuery.sizeOf` only when the requirement truly depends on window size             |
| `aspect-ratio`               | `AspectRatio`                                                                          |
| `overflow: scroll`           | suitable scrollable                                                                    |
| `overflow: hidden`           | clip only if actual clipping is needed                                                 |
| centered fixed content width | `Center` + `ConstrainedBox(maxWidth: ...)`                                             |

### Do not blindly copy fixed dimensions

This:

```
.card {
  width: 378px;
  height: 220px;
}

```

might be visually accurate at one reference viewport while failing with:

- larger accessibility text;
- localization;
- desktop resizing;
- narrower parent constraints;
- different platform font metrics.

Prefer:

```
ConstrainedBox(
  constraints: const BoxConstraints(maxWidth: 378),
  child: const CardContent(),
)

```

or let the surrounding grid determine width.

Use fixed height only when the design requirement truly is fixed, such as a thumbnail aspect or an explicitly dimensioned control.

### Flexbox conversion

CSS Flexbox is one-dimensional. Flutter's `Flex` family is also one-dimensional, but its sizing algorithm is not CSS Flexbox's grow/shrink/basis algorithm. `Flex` distributes remaining main-axis space among flexible children and does not wrap or scroll itself.

| CSS flex conceptFlutter interpretation |                                                                                                      |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `display:flex`                         | `Row`, `Column`, or `Flex`                                                                           |
| `flex-direction: row`                  | `Row`                                                                                                |
| `flex-direction: column`               | `Column`                                                                                             |
| `justify-content`                      | `MainAxisAlignment`                                                                                  |
| `align-items`                          | `CrossAxisAlignment`                                                                                 |
| `gap`                                  | current `Flex.spacing` / `Row.spacing` / `Column.spacing`; `Wrap.spacing` for runs                   |
| `flex-grow`                            | often `Expanded(flex: ...)` or `Flexible(flex: ...)`, but not identical                              |
| `flex-shrink`                          | no exact independent mapping; use `Flexible`, constraints, wrapping, overflow policy, or restructure |
| `flex-basis`                           | no direct universal equivalent; initial constraints/`SizedBox`/`ConstrainedBox` plus flex behavior   |
| `align-self`                           | no direct Flex child property; wrap the child in an alignment/sizing widget or restructure           |
| `flex-wrap`                            | `Wrap`, responsive recomposition, or grid; not `Row`                                                 |
| auto spacer                            | `Spacer`                                                                                             |
| nested flex                            | nested `Row`/`Column` only when constraints remain coherent                                          |

Current Flutter `Flex` provides a `spacing` property for main-axis gaps.

#### `Expanded` vs `Flexible`

Use:

```
Expanded(
  child: child,
)

```

when the child should receive a **tight** share of remaining main-axis space.

Use:

```
Flexible(
  fit: FlexFit.loose,
  child: child,
)

```

when the child may use **up to** its allocated share rather than being forced to fill it.

Do not equate either directly with a CSS shorthand such as `flex: 1 1 auto`.

#### Common flex failure: unbounded main axis

Bad:

```
ListView(
  children: [
    Column(
      children: [
        Expanded(child: Content()),
      ],
    ),
  ],
)

```

A vertically scrolling parent gives its child unbounded space in the scrolling direction. There is no finite "remaining height" for `Expanded` to consume.

Correct approaches depend on intent:

- remove `Expanded`;
- give the region an explicit or constrained height;
- use slivers;
- move scrolling responsibility outward;
- use `SliverFillRemaining` when the semantics match.

#### Flex overflow

If a horizontal `Row` cannot fit:

Do not automatically add `SingleChildScrollView`.

First ask whether the intended behavior is:

- shrink flexible content;
- wrap;
- truncate text;
- switch layout;
- scroll horizontally;
- hide low-priority actions.

Choose the behavior represented by the source design.

### CSS Grid conversion

CSS Grid is a two-dimensional track-layout system. Standard Flutter grids do **not** implement CSS Grid's complete track, named-area, and spanning model. CSS Grid therefore frequently requires layout reinterpretation. CSS Grid's two-dimensional nature is fundamental to the source behavior.

Use:

#### Fixed column count

```
GridView.builder(
  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
    crossAxisCount: 3,
    crossAxisSpacing: 16,
    mainAxisSpacing: 16,
  ),
  itemCount: items.length,
  itemBuilder: buildItem,
)

```

#### Adaptive tile width

```
GridView.builder(
  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
    maxCrossAxisExtent: 320,
    crossAxisSpacing: 16,
    mainAxisSpacing: 16,
  ),
  itemCount: items.length,
  itemBuilder: buildItem,
)

```

This often models responsive card grids better than manually computing column counts.

#### Dashboard with heterogeneous regions

Prefer explicit responsive composition:

```
wide:
┌──────────────┬─────────┐
│ chart        │ metrics │
├──────────────┴─────────┤
│ activity               │
└────────────────────────┘

narrow:
┌──────────────┐
│ metrics      │
├──────────────┤
│ chart        │
├──────────────┤
│ activity     │
└──────────────┘

```

rather than forcing every breakpoint through one generic grid abstraction.

#### Spanning cells

For true row/column spanning:

1. first ask whether the composition can be expressed more cleanly with nested `Row`/`Column`/slivers;
2. if not, consider custom layout or an appropriate maintained package;
3. for low-level grid control, a custom `SliverGridDelegate` can define layout;
4. do not simulate spans with piles of `Positioned` widgets unless overlap is intrinsic to the design.

Flutter's grid delegates can compute layouts from incoming constraints, and custom delegates permit arbitrary two-dimensional arrangements.

#### Masonry

Do not claim `GridView` provides native masonry behavior. For masonry-like layouts:

- evaluate whether uniform grid tiles would satisfy the design;
- use a maintained specialized solution when dependency policy permits;
- otherwise implement an appropriate custom sliver/layout;
- consider whether a list with variable-height rows is more maintainable.

### Positioning and layering

#### `position: relative`

Often maps to **nothing special**. Flutter's normal parent-child layout already establishes relative structure.

For deliberate small offsets:

- use `Padding` or `Align` when the offset should affect layout;
- use `Transform.translate` when it should affect painting but not surrounding layout.

#### `position: absolute`

Use `Stack` + `Positioned` only when children genuinely overlap or are anchored relative to a shared box.

`Positioned` is meaningful as a direct descendant of a `Stack`.

#### `position: fixed`

Do not mechanically use `Positioned`.

Common Flutter equivalents:

- top app bar → `Scaffold.appBar`;
- bottom navigation → `Scaffold.bottomNavigationBar`;
- floating action → `floatingActionButton`;
- persistent overlay → `Overlay`;
- fixed panel in an application shell → ordinary shell composition;
- floating utility relative to viewport → `Stack`/overlay if truly necessary.

#### `position: sticky`

Common equivalents:

- `SliverAppBar`;
- `SliverPersistentHeader`;
- pinned header in a sliver scroll view.

#### `z-index`

Flutter normally uses child paint order rather than a numeric CSS z-index system.

Use:

- child ordering in `Stack`;
- `Overlay` for content that must escape local hierarchy;
- route/dialog APIs for modal content.

### Overflow

Determine the desired UX:

```
content is optional decoration       → clip if necessary
long textual content                 → wrap / selectable / scroll
single-line label                    → ellipsis or fade if product allows
long collection                      → lazy scrolling
wide data table                      → horizontal scroll or responsive redesign
fixed artwork                        → clip according to design

```

Avoid `ClipRRect` merely because a `BoxDecoration` has a border radius. Border radius on decoration does not itself require clipping the child.

---

## Responsive Conversion

Flutter's official adaptive guidance frames responsive work as:

1. **Abstract** the difference.
2. **Measure** available space/environment.
3. **Branch** into the appropriate composition.

### Use `LayoutBuilder` when

The component's arrangement depends on the constraints supplied by its parent.

Examples:

- card becomes horizontal above 500 logical pixels of card-region width;
- dashboard column count depends on the body pane after the sidebar;
- form changes from one to two columns inside a constrained dialog;
- navigation label visibility depends on the navigation area's width.

```
LayoutBuilder(
  builder: (context, constraints) {
    if (constraints.maxWidth >= 720) {
      return const WideProfileCard();
    }
    return const NarrowProfileCard();
  },
)

```

### Use `MediaQuery` when

The decision depends on application-window or environment information:

- current Flutter view size;
- system padding or view insets;
- text scaling;
- accessible navigation settings;
- high contrast;
- display features such as hinges/cutouts;
- platform brightness.

Prefer narrow accessors when available:

```
final size = MediaQuery.sizeOf(context);
final padding = MediaQuery.paddingOf(context);
final textScaler = MediaQuery.textScalerOf(context);

```

rather than subscribing to every `MediaQueryData` property when only one is needed.

### Use `OrientationBuilder` when

Orientation itself is meaningful to the component.

Do not treat:

```
Orientation.portrait == mobile
Orientation.landscape == desktop

```

as a valid general model.

A resizable desktop window can be portrait-shaped. A foldable can have complex display features. A landscape phone can still need a compact design.

### Breakpoint policy

A breakpoint SHOULD answer:

> At what width does this particular composition stop working well?

not:

> Is this device called a tablet?

A shell may use application-wide navigation breakpoints while individual components use their own local thresholds.

Example:

```
Shell:
< 640   → bottom navigation
640+    → navigation rail
1180+   → expanded side navigation

Analytics card:
< 420   → vertically stack chart labels
420+    → horizontal label row

Search toolbar:
< 700   → overflow menu for secondary actions
700+    → show actions inline

```

These thresholds need not be identical.

### Mobile-first conversion

"Mobile first" in Flutter should mean:

1. establish the smallest usable composition;
2. allow content to expand naturally;
3. introduce wider compositions when additional width enables better information architecture;
4. retain state while resizing;
5. avoid assumptions that wider screens simply require stretched mobile cards.

### Foldables

Use display-feature information only where a hinge/fold/cutout materially affects layout. Current Flutter exposes display features through `MediaQueryData`, with platform support depending on the target.

Do not scatter foldable-specific checks throughout widgets. Abstract physical-display constraints into the shell or affected layout regions.

### Window resizing

Desktop and web applications must remain valid through intermediate widths, not just three screenshot sizes.

Verify:

- no overflow during drag-resize;
- state survives composition changes;
- focus remains meaningful;
- scroll position is not unnecessarily destroyed;
- navigation state is retained.
