# 05 Antipatterns Workflows Checklists

Anti-patterns, implementation/review workflows, checklists, and final decision rules.

## Contents

- [Common Anti-Patterns](#common-anti-patterns)
  - [1. Returning fake data from repositories](#1-returning-fake-data-from-repositories)
  - [2. One giant fake domain model](#2-one-giant-fake-domain-model)
  - [3. Skeletonizing every loading state](#3-skeletonizing-every-loading-state)
  - [4. Skeleton flicker for very short operations](#4-skeleton-flicker-for-very-short-operations)
  - [5. Re-skeletonizing loaded content during refresh](#5-re-skeletonizing-loaded-content-during-refresh)
  - [6. Replacing the entire list during pagination](#6-replacing-the-entire-list-during-pagination)
  - [7. Rendering hundreds of fake rows](#7-rendering-hundreds-of-fake-rows)
  - [8. Building skeleton lists eagerly](#8-building-skeleton-lists-eagerly)
  - [9. Fake text much longer or shorter than production text](#9-fake-text-much-longer-or-shorter-than-production-text)
  - [10. Fixed loading layout that breaks on tablets](#10-fixed-loading-layout-that-breaks-on-tablets)
  - [11. Tappable fake buttons](#11-tappable-fake-buttons)
  - [12. Screen reader announces fake content](#12-screen-reader-announces-fake-content)
  - [13. One shimmer color for light and dark themes](#13-one-shimmer-color-for-light-and-dark-themes)
  - [14. Heavy shimmer on a huge list without profiling](#14-heavy-shimmer-on-a-huge-list-without-profiling)
  - [15. Skeletonizing a complex chart directly](#15-skeletonizing-a-complex-chart-directly)
  - [16. Initializing maps/WebViews behind skeletons](#16-initializing-mapswebviews-behind-skeletons)
  - [17. Loading production images for fake content](#17-loading-production-images-for-fake-content)
  - [18. Keeping offscreen skeleton animations alive](#18-keeping-offscreen-skeleton-animations-alive)
  - [19. Nesting Skeletonizers without a reason](#19-nesting-skeletonizers-without-a-reason)
  - [20. Random annotation use](#20-random-annotation-use)
  - [21. Using deprecated APIs](#21-using-deprecated-apis)
  - [22. Assuming Skeletonizer automatically fixes layout shift](#22-assuming-skeletonizer-automatically-fixes-layout-shift)
  - [23. Keeping skeleton active after error](#23-keeping-skeleton-active-after-error)
  - [24. Using skeleton loading instead of caching](#24-using-skeleton-loading-instead-of-caching)
  - [25. Skeleton over stale but useful content](#25-skeleton-over-stale-but-useful-content)
  - [26. Skeleton as upload/download progress](#26-skeleton-as-uploaddownload-progress)
  - [27. Wrapper that mirrors the entire package API](#27-wrapper-that-mirrors-the-entire-package-api)
  - [28. Optimizing appearance without measuring frames](#28-optimizing-appearance-without-measuring-frames)
  - [29. Confusing `ignore` with `keep`](#29-confusing-ignore-with-keep)
  - [30. Using `ignore` to solve accessibility](#30-using-ignore-to-solve-accessibility)
  - [31. Enabling switch animation everywhere](#31-enabling-switch-animation-everywhere)
  - [32. Treating `Skeleton.leaf` as a performance replacement](#32-treating-skeletonleaf-as-a-performance-replacement)
- [New Skeleton Implementation Workflow](#new-skeleton-implementation-workflow)
  - [1. Identify the loading scenario](#1-identify-the-loading-scenario)
  - [2. Decide whether skeleton loading is appropriate](#2-decide-whether-skeleton-loading-is-appropriate)
  - [3. Separate state semantics](#3-separate-state-semantics)
  - [4. Inspect final layout geometry](#4-inspect-final-layout-geometry)
  - [5. Choose automatic versus manual skeleton](#5-choose-automatic-versus-manual-skeleton)
  - [6. Define the fake-data boundary](#6-define-the-fake-data-boundary)
  - [7. Select placeholder count](#7-select-placeholder-count)
  - [8. Audit expensive descendants](#8-audit-expensive-descendants)
  - [9. Protect interactions](#9-protect-interactions)
  - [10. Define semantics](#10-define-semantics)
  - [11. Choose effect](#11-choose-effect)
  - [12. Handle reduced motion](#12-handle-reduced-motion)
  - [13. Configure themes](#13-configure-themes)
  - [14. Test responsiveness](#14-test-responsiveness)
  - [15. Test text scale and localization](#15-test-text-scale-and-localization)
  - [16. Test transitions](#16-test-transitions)
  - [17. Verify scroll position](#17-verify-scroll-position)
  - [18. Profile complex skeletons](#18-profile-complex-skeletons)
  - [19. Simplify based on evidence](#19-simplify-based-on-evidence)
- [Existing-Code Review Workflow](#existing-code-review-workflow)
  - [Package/version](#packageversion)
  - [Loading semantics](#loading-semantics)
  - [Fake-data source](#fake-data-source)
  - [Widget tree](#widget-tree)
  - [Annotations](#annotations)
  - [List size](#list-size)
  - [Effect](#effect)
  - [Interaction](#interaction)
  - [Semantics](#semantics)
  - [Heavy descendants](#heavy-descendants)
  - [Tests](#tests)
  - [Profiling evidence](#profiling-evidence)
- [Refactoring Rules](#refactoring-rules)
- [Code Review Checklist](#code-review-checklist)
- [Accessibility Checklist](#accessibility-checklist)
- [List/Pagination Checklist](#listpagination-checklist)
- [Performance Checklist](#performance-checklist)
- [Production Readiness Checklist](#production-readiness-checklist)
- [Quick Reference](#quick-reference)
- [Final Decision Rules for the Coding Agent](#final-decision-rules-for-the-coding-agent)

## Common Anti-Patterns

### 1. Returning fake data from repositories

**Bad**

```dart
Future<List<User>> loadUsers() async {
  return loading
      ? List.filled(
          8,
          const User(id: 'fake', name: 'User'),
        )
      : api.loadUsers();
}
```

**Why it is problematic**

Fake presentation state leaks into domain behavior.

**Better**

```dart
final visibleUsers = state.isInitialLoading
    ? UserSkeletonViewModel.placeholders
    : state.users.map(UserViewModel.fromDomain).toList();
```

---

### 2. One giant fake domain model

**Bad**

```dart
final fakeOrder = Order(
  id: 'fake',
  customer: fakeCustomer,
  payment: fakePayment,
  shipping: fakeShipping,
  items: fakeItems,
);
```

**Why it is problematic**

It creates fake invariants that business logic may accidentally trust.

**Better**

```dart
const orderSkeleton = OrderSummarySkeletonViewModel(
  title: 'Placeholder order',
  lineCount: 3,
  showAddressBlock: true,
);
```

---

### 3. Skeletonizing every loading state

**Bad**

```dart
Skeletonizer(
  enabled: state.isLoading,
  child: entireScreen,
)
```

where `isLoading` means initial load, refresh, save, delete, and pagination.

**Why it is problematic**

Different user operations require different feedback.

**Better**

```dart
final initial = state.phase == LoadPhase.initialLoading;
final refreshing = state.phase == LoadPhase.refreshing;
final loadingMore = state.phase == LoadPhase.loadingMore;
```

Map each independently.

---

### 4. Skeleton flicker for very short operations

**Bad**

```dart
setState(() => loading = true);
await cache.read();
setState(() => loading = false);
```

with a full-screen shimmer between the calls.

**Why it is problematic**

A short flash is more distracting than no indicator.

**Better**

Use cached content immediately or apply a measured delayed-indicator policy when product testing demonstrates a need.

---

### 5. Re-skeletonizing loaded content during refresh

**Bad**

```dart
Skeletonizer(
  enabled: state.isRefreshing,
  child: ProductList(items: state.items),
)
```

**Why it is problematic**

Useful data disappears.

**Better**

```dart
RefreshIndicator(
  onRefresh: refresh,
  child: ProductList(items: state.items),
)
```

---

### 6. Replacing the entire list during pagination

**Bad**

```dart
if (state.loadingMore) {
  return const ProductLoadingList();
}
```

**Why it is problematic**

The user loses context and scroll continuity.

**Better**

Append a small number of loading rows.

---

### 7. Rendering hundreds of fake rows

**Bad**

```dart
ListView.builder(
  itemCount: 500,
  itemBuilder: (_, __) => const SkeletonRow(),
)
```

**Why it is problematic**

It wastes layout/paint/animation work.

**Better**

```dart
const placeholderCount = 8;
```

Choose a viewport-oriented count.

---

### 8. Building skeleton lists eagerly

**Bad**

```dart
Column(
  children: List.generate(
    200,
    (_) => const SkeletonRow(),
  ),
)
```

**Why it is problematic**

Every child is constructed at once.

**Better**

```dart
ListView.builder(
  itemCount: 8,
  itemBuilder: (_, __) => const SkeletonRow(),
)
```

---

### 9. Fake text much longer or shorter than production text

**Bad**

```dart
Text('X')
```

for a two-line product title.

**Why it is problematic**

The loading-to-loaded transition shifts.

**Better**

Match likely line count or use:

```dart
const Bone.multiText(lines: 2)
```

---

### 10. Fixed loading layout that breaks on tablets

**Bad**

```dart
const skeletonCardWidth = 160.0;
```

while loaded cards use responsive constraints.

**Why it is problematic**

Skeleton and content follow different layouts.

**Better**

Share the same responsive grid/layout logic.

---

### 11. Tappable fake buttons

**Bad**

```dart
Skeletonizer(
  ignorePointers: false,
  child: FilledButton(
    onPressed: buy,
    child: const Text('Buy'),
  ),
)
```

**Why it is problematic**

Users can trigger operations against placeholder state.

**Better**

Keep top-level pointer blocking or apply:

```dart
Skeleton.ignorePointer(
  child: FilledButton(
    onPressed: buy,
    child: const Text('Buy'),
  ),
)
```

---

### 12. Screen reader announces fake content

**Bad**

```dart
Skeletonizer(
  child: Text('John Placeholder Doe'),
)
```

with no semantic exclusion.

**Why it is problematic**

Skeletonizer changes paint, not the meaning of your fake widget tree.

**Better**

```dart
ExcludeSemantics(
  excluding: loading,
  child: Skeletonizer(
    enabled: loading,
    child: content,
  ),
)
```

plus one appropriate loading semantic.

---

### 13. One shimmer color for light and dark themes

**Bad**

```dart
effect: const ShimmerEffect(
  baseColor: Color(0xFFE0E0E0),
  highlightColor: Colors.white,
)
```

everywhere.

**Why it is problematic**

Dark surfaces may flash or have poor contrast.

**Better**

Use `SkeletonizerConfigData` through theme extensions.

---

### 14. Heavy shimmer on a huge list without profiling

**Bad**

```dart
Skeletonizer(
  child: hugeComplexList,
)
```

with no performance measurement.

**Why it is problematic**

Animated paint can become more expensive than expected.

**Better**

Use viewport-sized placeholders, lazy builders, simple effects, then profile.

---

### 15. Skeletonizing a complex chart directly

**Bad**

```dart
Skeletonizer(
  child: VeryComplexChart(fakePoints),
)
```

**Why it is problematic**

The fake chart still incurs chart construction/layout/paint complexity.

**Better**

```dart
Skeleton.replace(
  height: 240,
  replacement: const Bone(height: 240),
  child: VeryComplexChart(realPoints),
)
```

---

### 16. Initializing maps/WebViews behind skeletons

**Bad**

```dart
Skeletonizer(
  child: GoogleMap(...),
)
```

during data initialization.

**Why it is problematic**

Skeleton painting does not inherently eliminate platform-view startup.

**Better**

Build a lightweight replacement until the view is genuinely needed.

---

### 17. Loading production images for fake content

**Bad**

```dart
Image.network(placeholderRemoteUrl)
```

only to create skeleton image geometry.

**Why it is problematic**

Network/decode resources are wasted.

**Better**

Use `Skeleton.replace`, `Bone`, or a local geometric placeholder.

---

### 18. Keeping offscreen skeleton animations alive

**Bad**

Prebuilding many hidden tab pages, each with active shimmer.

**Why it is problematic**

Invisible loading UI may still consume resources.

**Better**

Activate skeleton animation only for visible/relevant loading regions.

---

### 19. Nesting Skeletonizers without a reason

**Bad**

```dart
Skeletonizer(
  child: Skeletonizer(
    child: Skeletonizer(
      child: content,
    ),
  ),
)
```

**Why it is problematic**

It complicates paint scope, configuration, testing, and performance.

**Better**

Use one skeleton scope unless sections genuinely own independent loading behavior.

---

### 20. Random annotation use

**Bad**

Adding `ignore`, `keep`, `leaf`, and `shade` until a screenshot "looks right."

**Why it is problematic**

Each annotation has materially different paint and performance semantics.

**Better**

Choose annotation from intent:

```text
hide → ignore
keep real → keep
swap subtree → replace
one bone → leaf
combine adjacent shapes → unite
shader-mask custom paint → shade
block local interaction → ignorePointer
```

---

### 21. Using deprecated APIs

**Bad**

```dart
SkeletonizerConfigData.light()
```

or:

```dart
SoldColorEffect()
```

**Why it is problematic**

The code carries unnecessary migration debt.

**Better**

```dart
const SkeletonizerConfigData()
```

and:

```dart
const SolidColorEffect()
```

---

### 22. Assuming Skeletonizer automatically fixes layout shift

**Bad**

```dart
final visibleTitle = loading ? '...' : product.title;
```

**Why it is problematic**

Skeletonizer only paints the geometry you provide.

**Better**

Match final constraints and representative line geometry.

---

### 23. Keeping skeleton active after error

**Bad**

```dart
enabled: state.data == null
```

when `data == null` for both loading and failure.

**Why it is problematic**

Failure looks like endless loading.

**Better**

Use an explicit phase enum.

---

### 24. Using skeleton loading instead of caching

**Bad**

Every tab switch:

```text
clear data
→ reload
→ skeleton
```

**Why it is problematic**

Decorative loading does not fix unnecessary network/state churn.

**Better**

Retain valid state according to the app's caching architecture.

---

### 25. Skeleton over stale but useful content

**Bad**

```dart
if (refreshing) {
  return const FullScreenSkeleton();
}
```

**Why it is problematic**

Freshness work hides valid information.

**Better**

Keep stale data and show refresh status.

---

### 26. Skeleton as upload/download progress

**Bad**

```dart
Skeletonizer(
  enabled: uploadInProgress,
  child: fileRow,
)
```

**Why it is problematic**

It communicates "content is being discovered," not actual transfer progress.

**Better**

Use determinate progress when available.

---

### 27. Wrapper that mirrors the entire package API

**Bad**

```dart
class AppSkeleton {
  // enabled, effect, radius, containersColor,
  // every switch config field, every pointer option, ...
}
```

**Why it is problematic**

It creates a second unstable API surface.

**Better**

Centralize actual application policy: accessibility, theme, reduced motion, and safe pointer defaults.

---

### 28. Optimizing appearance without measuring frames

**Bad**

Adding more gradients, clips, masks, and shapes because the skeleton looks richer.

**Why it is problematic**

A prettier loading state can become a slower loading state.

**Better**

Profile representative skeleton scrolling before and after visual changes.

---

### 29. Confusing `ignore` with `keep`

**Bad**

```dart
Skeleton.ignore(
  child: const AppLogo(),
)
```

when the logo should remain visible.

**Why it is problematic**

Current `ignore` rendering suppresses child paint while active.

**Better**

```dart
Skeleton.keep(
  child: const AppLogo(),
)
```

---

### 30. Using `ignore` to solve accessibility

**Bad**

```dart
Skeleton.ignore(
  child: Text(fakeUserName),
)
```

and assuming assistive technology cannot see it.

**Why it is problematic**

Paint suppression and semantics exclusion are different systems.

**Better**

Use `ExcludeSemantics` for placeholder semantics.

---

### 31. Enabling switch animation everywhere

**Bad**

```dart
SkeletonizerConfigData(
  enableSwitchAnimation: true,
)
```

without product/performance review.

**Why it is problematic**

Animated switching adds transition work and can complicate semantics/state continuity.

**Better**

Use it only where the transition materially improves UX.

---

### 32. Treating `Skeleton.leaf` as a performance replacement

**Bad**

```dart
Skeleton.leaf(
  child: ExpensivePlatformOrChartWidget(),
)
```

expecting the expensive widget not to initialize.

**Why it is problematic**

`leaf` changes painting behavior, not business/resource initialization.

**Better**

Use `Skeleton.replace` or do not build the expensive widget while loading.

---

## New Skeleton Implementation Workflow

Follow this process in order.

### 1. Identify the loading scenario

Classify it as:

- initial load;
- refresh;
- pagination;
- section load;
- image-only load;
- mutation;
- background refresh;
- progress-driven task.

Do not start by choosing `Skeletonizer`.

### 2. Decide whether skeleton loading is appropriate

Ask:

- Is final structure known?
- Will the placeholder resemble it?
- Is the wait long enough to justify visible loading UI?
- Is useful stale data already available?
- Would another loading treatment communicate the task more accurately?

### 3. Separate state semantics

Model distinct phases.

Do not collapse initial loading, refresh, pagination, and mutations into one flag if their UX differs.

### 4. Inspect final layout geometry

Record:

- image dimensions/aspect ratios;
- card heights;
- text line counts;
- padding;
- list spacing;
- grid columns;
- controls;
- breakpoints.

### 5. Choose automatic versus manual skeleton

Use automatic Skeletonizer when safely constructing the final layout is desirable.

Use `Skeletonizer.zone` + `Bone` when:

- fake data would be elaborate;
- final subtree is expensive;
- manual placeholder geometry is clearer.

### 6. Define the fake-data boundary

If placeholder values are needed:

- define presentation-only values/view models;
- keep them out of repository/domain state;
- prevent actions from receiving them.

### 7. Select placeholder count

Base it on:

- viewport;
- row/card size;
- responsive columns.

Do not base it on production database count.

### 8. Audit expensive descendants

Look for:

- images;
- charts;
- maps;
- WebViews;
- videos;
- SVGs;
- custom painters;
- platform views;
- animations.

Decide whether each should be:

- kept;
- ignored;
- shaded;
- leafed;
- united;
- replaced;
- conditionally omitted.

### 9. Protect interactions

Start with:

```dart
ignorePointers: true
```

Enable pointer interaction only with an explicit requirement.

If scrolling is preserved, protect fake actions locally.

### 10. Define semantics

Decide:

- which placeholder subtree must be excluded;
- which static controls remain meaningful;
- whether one live loading announcement is warranted.

### 11. Choose effect

Start with the design-system default.

Use:

- shimmer when appropriate and measured;
- pulse for lower-spatial-motion animation;
- solid for reduced motion/testing/performance-sensitive cases.

### 12. Handle reduced motion

Use:

```dart
MediaQuery.disableAnimationsOf(context)
```

and provide a static alternative.

### 13. Configure themes

Test light/dark appearance through central configuration.

### 14. Test responsiveness

Cover phones, tablets, landscape, desktop where applicable.

### 15. Test text scale and localization

Ensure placeholder geometry does not catastrophically diverge.

### 16. Test transitions

Verify:

```text
loading → loaded
loading → failure
loaded → refreshing
loaded → loading more
```

### 17. Verify scroll position

Refresh/pagination refactoring must not reset valid scroll context.

### 18. Profile complex skeletons

Use profile mode on representative hardware.

### 19. Simplify based on evidence

If skeleton performance is poor:

- reduce count;
- simplify shapes;
- replace complex descendants;
- reduce animation;
- narrow scope.

---

## Existing-Code Review Workflow

Before modifying an existing Skeletonizer implementation, inspect:

### Package/version

- `pubspec.yaml`;
- lockfile;
- Flutter SDK;
- deprecated API use.

### Loading semantics

Identify what each loading flag actually means:

- first request;
- refresh;
- pagination;
- mutation;
- retry.

### Fake-data source

Determine whether placeholder values live in:

- UI;
- presentation model;
- Bloc/Cubit state;
- repository;
- domain objects;
- test-only fixtures.

Move them toward the UI if they exist solely for skeleton geometry.

### Widget tree

Determine:

- which content remains built;
- which content performs side effects;
- where Skeletonizer sits relative to scrollables;
- whether wrapper changes affect stateful descendants.

### Annotations

For every annotation, require an explicit reason.

### List size

Check:

- fake row count;
- lazy/eager construction;
- pagination treatment.

### Effect

Check:

- shimmer/pulse/solid;
- duration;
- dark mode;
- reduced motion;
- custom effect complexity.

### Interaction

Check:

- top-level `ignorePointers`;
- local interactive controls;
- placeholder callbacks.

### Semantics

Check:

- fake text announcements;
- loading announcement;
- navigation controls.

### Heavy descendants

Audit:

- custom painters;
- charts;
- SVG;
- maps;
- WebViews;
- images;
- video;
- platform views.

### Tests

Require coverage for critical loading transitions and visual states.

### Profiling evidence

For large animated skeleton screens, ask whether anyone has compared skeleton-state and loaded-state performance in profile conditions.

Always distinguish:

```text
loading-state architecture problem
```

from:

```text
Skeletonizer configuration problem
```

Do not solve the former by randomly changing annotations.

---

## Refactoring Rules

Skeleton loading is presentation state.

Refactoring skeleton UX should not require altering core business semantics.

Preserve:

- repository responses;
- domain entity validity;
- error behavior;
- state-management meaning;
- cache behavior;
- navigation behavior;
- scroll position;
- accessibility;
- successful-data flow.

Good refactoring:

```text
Repository still emits real data only
↓
existing state still distinguishes success/failure
↓
UI introduces a presentation placeholder model
↓
Skeletonizer consumes only presentation state
```

Bad refactoring:

```text
repository starts returning fake entities
↓
business behavior changes
↓
Skeletonizer happens to render
```

When moving from automatic to manual skeletons, keep production content widgets untouched where possible and add a dedicated lightweight presentation skeleton alongside them.

---

## Code Review Checklist

Before approving Skeletonizer code, verify:

- [ ] Loading scenario is correctly classified.
- [ ] Skeleton loading is actually appropriate.
- [ ] Initial loading differs from refresh.
- [ ] Initial loading differs from pagination.
- [ ] Mutations use targeted progress.
- [ ] Fake data is presentation-only.
- [ ] Repository/domain code contains no skeleton-specific fake entities.
- [ ] Placeholder geometry resembles final content.
- [ ] Text line counts are plausible.
- [ ] Image aspect ratios match.
- [ ] Grid/list responsive logic is shared.
- [ ] Placeholder count is viewport-oriented.
- [ ] Lists/grids are lazy.
- [ ] Every annotation has an explicit purpose.
- [ ] `ignore` and `keep` are not confused.
- [ ] Expensive descendants use replacement/conditional construction where appropriate.
- [ ] Fake controls cannot trigger actions.
- [ ] Pointer behavior is intentionally tested.
- [ ] Fake semantics are excluded.
- [ ] Loading is exposed accessibly where required.
- [ ] Reduced motion is handled.
- [ ] Light/dark themes are tested.
- [ ] Error states disable the skeleton.
- [ ] Existing content remains visible during refresh.
- [ ] Existing list rows remain visible during pagination.
- [ ] No obsolete API is used.
- [ ] Complex skeleton screens have profiling evidence.

---

## Accessibility Checklist

- [ ] Placeholder names are not announced as real content.
- [ ] Placeholder prices, addresses, IDs, or form values are not announced.
- [ ] `ExcludeSemantics` or equivalent semantics architecture is used where needed.
- [ ] Loading has one meaningful announcement/status where appropriate.
- [ ] Loading announcements are not repeatedly spammed.
- [ ] Back/close/navigation controls remain available when intentionally usable.
- [ ] Fake buttons expose no unsafe actions.
- [ ] Pointer blocking is not mistaken for semantic exclusion.
- [ ] Reduced-motion preference disables or simplifies skeleton motion.
- [ ] Large text scaling is tested.
- [ ] RTL/localized layouts are tested.
- [ ] Loaded content regains its normal semantics.
- [ ] Error content is announced correctly after loading fails.

---

## List/Pagination Checklist

- [ ] Initial list skeleton is separate from pagination UX.
- [ ] Existing rows remain visible during pagination.
- [ ] Loading-more placeholders are appended.
- [ ] Placeholder rows use lazy builders.
- [ ] Count is based on viewport needs.
- [ ] No eager 100+/1000-row fake list.
- [ ] Production row geometry is reused.
- [ ] Grid column count matches responsive production layout.
- [ ] Scroll position remains stable.
- [ ] Pull-to-refresh keeps loaded content visible.
- [ ] Offscreen skeleton animations are not unnecessarily retained.
- [ ] Sliver implementations use `SliverSkeletonizer`/`Skeletonizer.sliver` where appropriate.
- [ ] Sliver switch animation is not assumed to be available.

---

## Performance Checklist

- [ ] Skeleton subtree complexity is understood.
- [ ] Animated effect is justified.
- [ ] Placeholder count is bounded.
- [ ] Lazy construction is used.
- [ ] Expensive images are not fetched unnecessarily.
- [ ] Expensive image decoding is avoided where possible.
- [ ] Charts are simplified or replaced.
- [ ] Platform views are deferred/replaced.
- [ ] Complex SVG/vector behavior is tested.
- [ ] Custom painters are not blindly shaded.
- [ ] `Skeleton.shade` usage is limited and measured.
- [ ] Nested Skeletonizers are justified.
- [ ] Rebuild subscriptions are locally scoped.
- [ ] `RepaintBoundary` has not been scattered without evidence.
- [ ] Reduced motion can use a static effect.
- [ ] Skeleton scroll has been profiled.
- [ ] Skeleton state is compared against loaded state.
- [ ] Representative low-end physical hardware is tested.
- [ ] UI-thread and raster-thread costs are inspected.

---

## Production Readiness Checklist

Release only when:

- [ ] Installed package APIs have been verified.
- [ ] Skeletonizer version is compatible with the project's Flutter SDK.
- [ ] Skeleton loading is used only for appropriate scenarios.
- [ ] Fake data is presentation-only.
- [ ] Layout closely matches final content.
- [ ] Initial/refresh/pagination/mutation states are distinct.
- [ ] Refresh preserves useful content.
- [ ] Pagination preserves useful content.
- [ ] Unsafe interactions are blocked.
- [ ] Placeholder semantics are excluded.
- [ ] Loading state is accessible.
- [ ] Reduced motion is handled.
- [ ] Light theme is tested.
- [ ] Dark theme is tested.
- [ ] Responsive breakpoints are tested.
- [ ] Text scaling is tested.
- [ ] Localization/RTL is tested where relevant.
- [ ] Errors stop skeleton loading.
- [ ] Long lists use lazy construction.
- [ ] Placeholder count is bounded.
- [ ] Expensive descendants are replaced or deferred.
- [ ] Network images are not needlessly started for fake data.
- [ ] Platform views are not initialized merely to hide behind skeleton paint.
- [ ] Complex screens have profile-mode evidence.
- [ ] Widget tests cover important transitions.
- [ ] Golden tests cover critical skeleton layouts where valuable.
- [ ] Accessibility tests verify fake content is not announced.
- [ ] No deprecated Skeletonizer APIs remain.

---

## Quick Reference

| Situation | Preferred approach |
| --- | --- |
| First load of predictable card/list layout | `Skeletonizer` or `Skeletonizer.zone` |
| Final layout can safely be built with presentation values | Automatic `Skeletonizer` |
| Fake data would require a large domain graph | Manual `Skeletonizer.zone` + `Bone` |
| Very fast operation | Often no skeleton; consider a measured delayed indicator policy |
| Pull-to-refresh with existing data | Keep content + refresh indicator |
| Background refresh | Keep content visible |
| Pagination | Keep content + bottom skeleton rows/footer |
| Local mutation | Targeted disabled/progress state |
| Unknown final layout | Spinner or neutral placeholder |
| Empty successful result | Empty state, not skeleton |
| Failed initial request | Stop skeleton + error/retry UI |
| Cached useful content exists | Keep cached content visible |
| Complex chart loading | Simple replacement skeleton |
| Map/WebView/camera loading | Lightweight replacement; defer native view |
| Network image unavailable during initial layout | `Skeleton.replace` or conditionally omit image |
| Only one image is loading | Image-specific placeholder |
| Static app logo | `Skeleton.keep` |
| Element should disappear during loading | `Skeleton.ignore` |
| Compound component should be one bone | `Skeleton.leaf` |
| Nearby small shapes should merge | `Skeleton.unite` |
| CustomPainter should be shader-shaded | `Skeleton.shade`, after performance review |
| Complex custom widget is expensive | `Skeleton.replace` |
| Skeletonized control must not work | Default pointer blocking or `Skeleton.ignorePointer` |
| Skeleton list should remain scrollable | Deliberately design hit testing; locally block actions |
| Fake text appears in accessibility tree | `ExcludeSemantics` + one meaningful loading status |
| Reduced-motion preference | `SolidColorEffect` or another non-animated treatment |
| Light/dark themes | Theme-aware `SkeletonizerConfigData` |
| App-wide skeleton styling | Theme extension |
| Feature-specific skeleton styling | Scoped `SkeletonizerConfig` |
| Long skeleton list | Lazy builder + viewport-sized placeholder count |
| Heavy shimmer jank | Simplify effect/tree/count and profile |
| Manual skeleton text | `Bone.text` / `Bone.multiText` |
| Manual avatar skeleton | `Bone.circle` |
| Manual icon placeholder | `Bone.icon` |
| Manual button placeholder | `Bone.button` |
| Sliver list/grid | `SliverSkeletonizer` or `Skeletonizer.sliver` |
| Sliver transition animation | Do not assume support; current switch animation is non-sliver |
| Repository has no data yet | Presentation placeholder, never fake repository data |
| Refreshing loaded screen | Do not revert to a full skeleton |
| Upload/download | Determinate progress when available |
| Authentication bootstrap | Usually branded/neutral loading rather than fake destination layout |
| Tablet/desktop skeleton | Reuse responsive constraints and grid logic |
| Large text accessibility | Test same text scaling as loaded content |
| Localization-sensitive text | Match geometry/line counts; test representative locales |
| Stateful child must survive transition | Do not assume Skeletonizer toggle preserves identity; test and lift critical state if needed |
| Need to avoid expensive child initialization | `Skeleton.replace` or conditionally do not build it |
| Need only visual simplification | `Skeleton.leaf` may be appropriate |
| Need deterministic golden | `SolidColorEffect` |
| Adding `RepaintBoundary` | Measure first |
| Evaluating skeleton performance | Physical device + profile mode + DevTools |

---

## Final Decision Rules for the Coding Agent

When touching Skeletonizer code, reason in this order:

```text
1. What user operation is happening?
2. Should that operation have a skeleton at all?
3. Is useful content already available?
4. Is the final structure predictable?
5. Can the final layout be built safely?
6. If not, what presentation-only placeholder should define geometry?
7. Which descendants should be kept, hidden, replaced, united, leafed, or shaded?
8. Can any fake control be interacted with?
9. Can any fake value enter semantics?
10. Does the effect honor theme and reduced motion?
11. Is the placeholder count bounded and lazy?
12. Are expensive resources still initializing behind the skeleton?
13. Does the loaded transition preserve geometry and user context?
14. Does failure stop skeleton loading?
15. Does profile-mode measurement show acceptable frame performance?
```

Optimize in this priority order:

```text
Correct loading-state semantics
↓
Accessibility
↓
Layout stability
↓
User-perceived responsiveness
↓
Interaction safety
↓
Maintainability
↓
Frame performance
↓
Memory efficiency
↓
Visual polish
```

Never sacrifice state correctness, accessibility, or interaction safety for decorative shimmer.

Never treat Skeletonizer as a substitute for:

- proper state modeling;
- caching;
- responsive layout;
- accessible loading communication;
- progress reporting;
- performance profiling.

Use Skeletonizer as what the current package actually provides: a configurable way to transform the **painting of an already-shaped Flutter layout**, plus an explicit manual `Bone` mode when a dedicated presentation skeleton is the better architecture.
