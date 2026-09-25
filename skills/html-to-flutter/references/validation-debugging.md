# Visual fidelity, testing, and debugging

This reference preserves detailed guidance from the supplied HTML/CSS/JavaScript → Flutter research. Read the relevant section when the main skill directs you here.

## Contents

- Visual Fidelity Workflow
  - 1. Capture reference viewport
  - 2. Identify layout structure
  - 3. Identify design tokens
  - 4. Reproduce hierarchy
  - 5. Verify spacing
  - 6. Verify typography
  - 7. Verify colors
  - 8. Verify borders/radius/shadows
  - 9. Verify responsive behavior
  - 10. Verify interaction states
  - 11. Verify semantics
  - 12. Distinguish mismatches
  - Golden testing
- Testing Converted Interfaces
  - Unit tests
  - Widget tests
  - Integration tests
  - Responsive tests
  - Accessibility tests
  - Navigation tests
  - Platform-specific tests
- Debugging Guide
  - Overflow error
  - Unbounded constraints
  - Incorrect `Expanded`
  - Nested scrolling problems
  - Visual mismatch
  - Typography mismatch
  - Excessive rebuilds
  - Janky animation
  - Slow list
  - Large memory usage
  - Image issues
  - Broken responsive layout
  - Web routing issues
  - Focus/keyboard problems
  - JS interop problems

## Visual Fidelity Workflow

Visual fidelity means reproducing design intent accurately without sabotaging responsiveness, semantics, or platform usability.

### 1. Capture reference viewport

Record:

- CSS viewport width/height;
- browser zoom;
- device-pixel ratio if relevant;
- platform/browser;
- theme;
- text scaling;
- page state;
- scroll position.

### 2. Identify layout structure

Draw boxes for:

- shell;
- content max width;
- columns;
- gutters;
- cards;
- overlays;
- scrolling regions.

Ignore decorative details initially.

### 3. Identify design tokens

Measure:

- colors;
- typography;
- spacing;
- radius;
- borders;
- shadows.

### 4. Reproduce hierarchy

Implement:

1. page shell;
2. major geometry;
3. responsive behavior;
4. component internals;
5. decoration.

Do not tune shadow blur while the column widths are wrong.

### 5. Verify spacing

Compare:

- outer content padding;
- grid gaps;
- card padding;
- vertical rhythm;
- alignment lines.

### 6. Verify typography

Compare:

- actual font;
- size;
- weight;
- line height;
- line wrapping;
- width constraints;
- letter spacing.

### 7. Verify colors

Use sampled/reference tokens, then centralize them.

### 8. Verify borders/radius/shadows

Tune after geometry and typography.

### 9. Verify responsive behavior

Capture/test:

```
small
source breakpoint neighborhoods
medium
wide
very wide
intermediate resized states

```

A breakpoint is especially important to test immediately below and above its threshold.

### 10. Verify interaction states

Compare:

- default;
- hover;
- focus;
- pressed;
- disabled;
- selected;
- loading;
- error;
- empty.

### 11. Verify semantics

A visually exact but inaccessible conversion is not complete.

### 12. Distinguish mismatches

Classify each difference as:

```
A. genuine implementation mismatch
B. expected platform/font raster difference
C. intentional adaptive difference
D. source browser-specific behavior that should not be copied

```

Fix A.

Document or accept B when it does not alter usable geometry.

Review C against product goals.

Remove D unless required.

### Golden testing

Golden tests are useful for:

- stable design-system components;
- reference viewport snapshots;
- regressions in controlled environments.

Golden files are raster masters and can change with fonts, platforms, or framework rendering. Do not build a brittle cross-platform test strategy that expects every platform's pixels to be identical.

---

## Testing Converted Interfaces

### Unit tests

Test:

- business logic;
- model parsing;
- validation;
- repositories with fakes;
- derived state;
- route parsing;
- persistence behavior.

### Widget tests

Test:

- visual/component behavior;
- state transitions;
- validation messages;
- button enabled/disabled behavior;
- responsive branches;
- semantics;
- focus.

Flutter's testing guidance distinguishes fast unit/widget testing from integration coverage of critical flows.

### Integration tests

Test critical end-to-end flows:

- authentication;
- deep-link launch;
- navigation;
- form submission;
- key data flows;
- platform integrations.

Flutter's `integration_test` tooling supports application-level integration tests, although native platform UI can require additional platform-specific strategy.

### Responsive tests

Test explicit sizes.

Example conceptual matrix:

```
390×844
600×900
800×1000
1024×768
1440×900
resize transitions

```

Do not treat those exact sizes as universal; use sizes around the source application's actual breakpoints.

### Accessibility tests

Use:

- Flutter accessibility guideline checks;
- semantics assertions;
- keyboard tests;
- manual assistive technology.

### Navigation tests

Verify:

- push/pop;
- deep links;
- query parameters;
- browser Back/Forward on Web;
- nested navigation.

### Platform-specific tests

Where platform behavior differs, test the actual target rather than mocking every platform difference in a single widget test.

---

## Debugging Guide

### Overflow error

Symptoms:

```
A RenderFlex overflowed by ...
yellow/black overflow stripe

```

Diagnosis:

1. identify main axis;
2. inspect fixed-width/fixed-height children;
3. check whether text can wrap;
4. check whether flexible space exists;
5. determine expected UX: wrap, flex, truncate, switch layout, scroll.

Do not simply wrap the whole page in a scroll view unless page scrolling is actually correct.

### Unbounded constraints

Symptoms:

```
BoxConstraints forces an infinite height
RenderFlex children have non-zero flex but incoming height constraints are unbounded

```

Check:

- `Column` inside vertical scrollable;
- `Row` inside horizontal scrollable;
- `Expanded`/`Spacer` in unbounded main axis;
- nested scroll owners.

Fix the ownership model.

### Incorrect `Expanded`

`Expanded` must be a descendant of `Flex` (`Row`/`Column`/`Flex`) through the expected parent-data path and needs finite remaining main-axis space.

### Nested scrolling problems

Symptoms:

- scroll view does not move;
- two scroll views fight;
- content jumps;
- huge layout cost.

Define one primary scroll owner and use slivers for heterogeneous content where possible.

### Visual mismatch

Debug in order:

1. viewport;
2. outer constraints;
3. content max width;
4. layout mode;
5. spacing;
6. font;
7. typography;
8. decoration;
9. imagery;
10. pixel-level detail.

### Typography mismatch

Check:

- exact font asset;
- weight file;
- fallback;
- line-height multiplier;
- available width;
- scaling;
- browser-vs-platform raster differences.

### Excessive rebuilds

Find:

- high-level state owner;
- frequently changing value;
- affected widgets.

Then:

- localize state;
- extract stable subtree;
- use listenable/selector mechanisms;
- pass stable `child` where builder supports it.

Do not add caching before proving the build work is problematic.

### Janky animation

Inspect:

- UI vs raster timing;
- layout on every tick;
- image decode;
- shadow/clip;
- saveLayer;
- custom painter;
- unrelated rebuilds.

### Slow list

Check:

- eager children;
- expensive item build;
- huge image decode;
- intrinsic measurement;
- nested scrolling;
- unnecessary keep-alive/cache behavior;
- complex paint effects;
- pagination.

### Large memory usage

Check:

- decoded images;
- unbounded data cache;
- retained controllers/listeners;
- route retention;
- large JS/platform-view objects;
- memory snapshots.

### Image issues

Check:

- parent constraints;
- `BoxFit`;
- aspect ratio;
- asset declaration;
- density variants;
- URL/CORS on Web;
- error state;
- decode dimensions.

### Broken responsive layout

Check whether the component is using global window width when it should use parent constraints.

Example:

```
Window = 1440 wide
Sidebar = 400
Content pane = 500

MediaQuery says "desktop"
actual component only has 500

```

Use `LayoutBuilder` at the component.

### Web routing issues

Verify:

- Router architecture;
- direct nested URL loading;
- server rewrite configuration;
- path/hash strategy;
- query parsing;
- browser Back/Forward.

### Focus/keyboard problems

Check:

- control is focusable;
- focus node lifecycle;
- traversal order;
- custom gestures have keyboard actions;
- modal traps/restores focus appropriately;
- hidden widget is not incorrectly retaining interactive focus.

### JS interop problems

Check:

- modern `dart:js_interop` usage;
- library loaded before invocation;
- JS namespace/function name;
- JS/Dart conversion;
- promise conversion;
- web-only code isolation;
- Wasm compatibility;
- lifecycle/disposal;
- browser security restrictions.

---
