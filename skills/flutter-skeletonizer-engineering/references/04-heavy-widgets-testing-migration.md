# 04 Heavy Widgets Testing Migration

Heavy descendants, responsive UX, tests, debugging, and version migration.

## Contents

- [Platform Views](#platform-views)
- [Custom Widgets](#custom-widgets)
- [Charts](#charts)
- [Forms](#forms)
- [Tables](#tables)
- [Error States](#error-states)
  - [Cached data plus refresh failure](#cached-data-plus-refresh-failure)
- [Timeout / Slow Network UX](#timeout-slow-network-ux)
- [Navigation](#navigation)
- [Tabs](#tabs)
- [Responsive Layouts](#responsive-layouts)
- [Localization](#localization)
- [Testing Strategy](#testing-strategy)
  - [Widget tests](#widget-tests)
  - [Interaction test](#interaction-test)
  - [Accessibility test](#accessibility-test)
  - [State transition tests](#state-transition-tests)
  - [Golden tests](#golden-tests)
  - [List tests](#list-tests)
  - [Performance tests](#performance-tests)
- [Debugging Workflow](#debugging-workflow)
  - [Widget does not skeletonize](#widget-does-not-skeletonize)
  - [Wrong skeleton shape](#wrong-skeleton-shape)
  - [Real content is still visible](#real-content-is-still-visible)
  - [Widget disappeared unexpectedly](#widget-disappeared-unexpectedly)
  - [Button is still tappable](#button-is-still-tappable)
  - [Skeleton cannot scroll](#skeleton-cannot-scroll)
  - [Skeleton causes overflow](#skeleton-causes-overflow)
  - [Skeleton janks](#skeleton-janks)
  - [Skeleton never stops](#skeleton-never-stops)
- [Migration Workflow](#migration-workflow)
  - [Known version-sensitive APIs](#known-version-sensitive-apis)

## Platform Views

Do not blindly skeletonize:

- Google Maps;
- WebViews;
- camera previews;
- native ad surfaces;
- native video players;
- other platform views.

Preferred architecture:

```dart
Skeleton.replace(
  height: 220,
  replacement: const Bone(
    height: 220,
    borderRadius: BorderRadius.all(Radius.circular(16)),
  ),
  child: ExpensivePlatformView(),
)
```

Even better when the surrounding architecture allows it:

```dart
if (loading) {
  return const Skeletonizer.zone(
    child: Bone(
      height: 220,
      borderRadius: BorderRadius.all(Radius.circular(16)),
    ),
  );
}

return ExpensivePlatformView();
```

The latter makes the "do not initialize yet" intent unambiguous.

---

## Custom Widgets

When a custom widget skeletonizes poorly:

1. inspect what it actually paints;
2. determine whether its low-level canvas operations are intercepted;
3. test whether the visual result matches the intended placeholder;
4. use `Skeleton.shade` if shading the real rendered shape is appropriate;
5. use `Skeleton.leaf` if the subtree should visually collapse to one bone;
6. use `Skeleton.replace` if the real child is expensive or unsuitable;
7. use manual `Bone` geometry if none of the above produces a stable result.

Do not infer support from the widget's class name alone.

---

## Charts

Default recommendation:

```text
Complex chart
→ simple chart-area placeholder
```

Example:

```dart
Skeleton.replace(
  height: 240,
  replacement: const Bone(
    height: 240,
    borderRadius: BorderRadius.all(Radius.circular(16)),
  ),
  child: SalesChart(data: data),
)
```

Use `Skeleton.shade` only if:

- the chart already exists safely;
- shading its actual geometry communicates useful structure;
- performance is measured and acceptable.

A fake 120-point time series is usually a poor skeleton strategy.

---

## Forms

Skeletonized forms require special care because controls can appear interactive.

Prefer one of these:

1. show a neutral form-shaped placeholder with interaction disabled;
2. keep known labels/layout visible and disable inputs;
3. skeletonize only unknown values;
4. use a smaller loading state if the form schema is already available.

Never allow fake form values to be submitted.

Do not announce placeholder names/values to screen readers.

---

## Tables

For predictable tables:

- keep known headers visible;
- preserve production column widths;
- skeletonize a viewport-sized set of rows;
- use lazy row construction if the table implementation supports it;
- preserve horizontal scrolling behavior intentionally;
- do not render hundreds of fake records.

For unknown/dynamic schemas, wait until column definitions are known before pretending to show final structure.

---

## Error States

Skeletons are loading states, not failure states.

Required transition:

```text
initial loading
→ success
    → content
or
→ failure
    → error UI
```

Never leave a shimmer running indefinitely after failure.

Example:

```dart
return switch (state.phase) {
  LoadPhase.initialLoading => const ProductLoadingList(),
  LoadPhase.failure => ErrorView(
      message: state.errorMessage ?? 'Unable to load products.',
      onRetry: retry,
    ),
  _ => ProductList(items: state.items),
};
```

### Cached data plus refresh failure

If existing content is still useful:

```text
keep content
+
surface non-destructive refresh error
```

Do not replace it with either a skeleton or full-screen failure unnecessarily.

---

## Timeout / Slow Network UX

Skeletonizer itself does not decide when a loading indicator should first appear.

Architecture options include a short delayed-placeholder threshold to avoid visual flicker for requests that commonly finish almost immediately.

Do not add an arbitrary minimum skeleton display duration globally.

Artificially keeping a skeleton visible after data is ready can make a fast application feel slower.

Measure actual flicker before introducing timing policies.

---

## Navigation

Use these rules:

- the incoming destination owns its loading state;
- do not skeletonize the outgoing screen merely because navigation started;
- preserve loaded destination state when returning if the app's caching/state architecture does so;
- avoid reconstructing full skeletons on every route revisit when data is already available.

---

## Tabs

Track loading per tab.

Prefer:

```text
Tab A = loaded
Tab B = initial loading
Tab C = not requested
```

When switching A → B:

- show B's skeleton if appropriate.

When returning B → A:

- keep A's loaded content.

Do not tie all tabs to one page-level `isLoading`.

---

## Responsive Layouts

Skeletons must run through the same constraints as real content.

Test:

- narrow phone;
- large phone;
- tablet;
- desktop/web;
- portrait;
- landscape;
- split-screen width;
- large accessibility text.

Prefer shared responsive logic:

```dart
int gridColumnsForWidth(double width) {
  if (width >= 1200) {
    return 5;
  }
  if (width >= 900) {
    return 4;
  }
  if (width >= 600) {
    return 3;
  }
  return 2;
}
```

Use that same function for loaded and skeleton grids.

Avoid independent magic dimensions for the loading UI.

---

## Localization

Placeholder content can accidentally be English-layout-specific.

Do not assume:

```dart
'Loading title'
```

wraps like:

- German;
- Arabic;
- Finnish;
- Japanese;
- translated product titles.

For layout-critical placeholders:

- use the production `maxLines`;
- preserve text style;
- test representative locales;
- use `Bone.multiText` when a geometry-based placeholder is more robust;
- preserve RTL behavior.

Skeletonizer's shimmer source resolves directional alignment and has explicit RTL support in its history, but application layout and placeholder content still need RTL testing.

---

## Testing Strategy

Skeleton states require deterministic tests.

### Widget tests

Cover:

- skeleton enabled;
- skeleton disabled;
- loading → loaded;
- failure transition;
- refresh mapping;
- pagination mapping;
- annotation behavior;
- pointer blocking;
- locally allowed/blocked interactions;
- replacement behavior.

Use a static effect where animation itself is not under test:

```dart
await tester.pumpWidget(
  const MaterialApp(
    home: Skeletonizer(
      enabled: true,
      effect: SolidColorEffect(),
      child: Text('Placeholder title'),
    ),
  ),
);
```

`SolidColorEffect` has zero duration, making it suitable for deterministic visual tests.

### Interaction test

```dart
testWidgets(
  'skeleton blocks placeholder action',
  (tester) async {
    var taps = 0;

    await tester.pumpWidget(
      MaterialApp(
        home: Skeletonizer(
          enabled: true,
          effect: const SolidColorEffect(),
          child: TextButton(
            onPressed: () {
              taps++;
            },
            child: const Text('Open'),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open'));
    await tester.pump();

    expect(taps, 0);
  },
);
```

### Accessibility test

```dart
testWidgets(
  'fake placeholder content is excluded from semantics',
  (tester) async {
    final semantics = tester.ensureSemantics();
    addTearDown(semantics.dispose);

    await tester.pumpWidget(
      const MaterialApp(
        home: AccessibleSkeleton(
          enabled: true,
          loadingLabel: 'Loading products',
          child: Text('Placeholder product'),
        ),
      ),
    );

    expect(
      find.bySemanticsLabel('Loading products'),
      findsOneWidget,
    );
    expect(
      find.bySemanticsLabel('Placeholder product'),
      findsNothing,
    );
  },
);
```

### State transition tests

Assert:

```text
initialLoading
→ skeleton

loaded
→ real content

refreshing
→ real content + refresh indicator

loadingMore
→ real content + bottom placeholders

failure without data
→ error UI

refresh failure with data
→ real content + non-destructive error
```

### Golden tests

Use goldens for:

- light theme;
- dark theme;
- representative card;
- representative list;
- manual `Bone` layout;
- annotation-heavy components;
- responsive breakpoints.

Avoid arbitrary animation-frame goldens.

Prefer:

```dart
effect: const SolidColorEffect()
```

for stable skeleton goldens.

If specifically testing shimmer frames, control animation time explicitly and document which frame is expected.

### List tests

Verify:

- placeholder count;
- builder usage;
- pagination skeleton count;
- existing data remains mounted during loading more;
- refresh does not switch to initial skeleton.

### Performance tests

Do not infer frame performance from widget tests.

For skeleton-heavy screens:

- run integration/profile scenarios;
- scroll representative content;
- capture frame data;
- compare skeleton and loaded states;
- test on representative physical devices.

---

## Debugging Workflow

### Widget does not skeletonize

Check in this order:

1. installed package version;
2. nearest Skeletonizer `enabled`;
3. whether the widget is inside the intended Skeletonizer;
4. whether a nested zone changes behavior;
5. annotations;
6. whether the widget paints through operations Skeletonizer transforms;
7. effect visibility against the surface;
8. clipping;
9. whether custom painting needs `Skeleton.shade`;
10. whether manual `Bone` or `Skeleton.replace` is more appropriate.

### Wrong skeleton shape

Inspect:

1. placeholder/fake data;
2. final constraints;
3. text wrapping;
4. `maxLines`;
5. font metrics;
6. padding;
7. image aspect ratio;
8. border radius;
9. grid delegate;
10. annotations;
11. `justifyMultiLineText`;
12. text bone radius configuration.

### Real content is still visible

Inspect:

- `Skeleton.keep`;
- custom painter;
- vector/draw-picture behavior;
- container configuration;
- nested Skeletonizer;
- zone mode;
- annotation activation flags.

If a subtree should disappear, use `Skeleton.ignore`.

If it should become a placeholder, use `Skeleton.replace`.

### Widget disappeared unexpectedly

Inspect `Skeleton.ignore`.

Current source paints nothing for an enabled ignored child. Do not confuse it with `Skeleton.keep`.

### Button is still tappable

Inspect:

1. top-level `ignorePointers`;
2. whether it was set to `false`;
3. local `Skeleton.ignorePointer`;
4. control's `onPressed`;
5. whether placeholder models can reach callbacks;
6. nested Skeletonizer hit-testing behavior.

### Skeleton cannot scroll

Inspect top-level:

```dart
ignorePointers: true
```

If scrolling is required, design a controlled interaction strategy instead of globally enabling all fake controls without protection.

### Skeleton causes overflow

Inspect:

- fake text length;
- locale;
- text scaling;
- hardcoded width;
- placeholder count;
- grid breakpoints;
- button width;
- image constraints;
- manual Bone size.

### Skeleton janks

Inspect:

1. placeholder count;
2. eager versus lazy list construction;
3. effect type;
4. animation duration;
5. subtree size;
6. nested skeletonizers;
7. `Skeleton.shade`;
8. clipping;
9. large SVG/custom painting;
10. chart construction;
11. image loading/decoding;
12. platform views;
13. rebuild scope;
14. loaded-state comparison.

Then profile in profile mode.

### Skeleton never stops

Inspect:

- state mapping;
- async completion;
- failure mapping;
- duplicated loading flags;
- stale request races;
- refresh state incorrectly mapped to initial loading;
- state notifier/Cubit transition logic.

---

## Migration Workflow

Before upgrading Skeletonizer:

1. inspect the installed version;
2. inspect the target version's SDK constraints;
3. read every changelog entry between versions;
4. search the repository for package APIs;
5. identify deprecated constructors/types;
6. inspect custom effects;
7. inspect annotations;
8. inspect sliver usage;
9. run widget tests;
10. capture/compare critical goldens;
11. run profile scenarios for large skeleton screens.

### Known version-sensitive APIs

Current migration concerns include:

- `Skeletonizer.bones` was renamed to `Skeletonizer.zone` in `1.1.0`;
- `SkeletonizerConfigData.light()` is deprecated; use the default `SkeletonizerConfigData()` constructor;
- `SoldColorEffect` is a deprecated compatibility typo alias; use `SolidColorEffect`;
- old `Skeleton.coloredBox` behavior is obsolete; the annotation was removed during the painting-context refactor;
- switch animation arrived in `1.3.0`;
- `SkeletonizerConfigData` became usable as a `ThemeExtension` in `1.4.0`;
- `TextBoneBorderShape` and rounded-superellipse support arrived in `2.1.0`;
- `2.0.0` added Flutter 3.32 support;
- current `2.1.3` includes a clipping fix.

Do not copy obsolete tutorial code into a current repository.

---
