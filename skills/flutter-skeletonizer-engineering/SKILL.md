---
name: flutter-skeletonizer-engineering
description: Design, implement, review, debug, test, profile, and migrate production Flutter skeleton-loading UX using skeletonizer. Use this skill whenever work involves Skeletonizer, SliverSkeletonizer, Skeletonizer.zone, Bone widgets, shimmer/pulse/solid effects, loading placeholders, fake-data skeletons, annotation choice, loading-state UX, skeletonized lists or grids, accessibility of placeholders, reduced motion, heavy images/charts/platform views during loading, pagination/refresh skeletons, or performance issues caused by skeleton rendering—even when the user only reports layout shift, fake controls being tappable, screen readers reading placeholder text, or shimmer jank.
compatibility: Inspect the repository's exact Flutter, Dart, skeletonizer, state-management, routing, image/vector/chart, and testing versions before making version-sensitive changes. The source baseline is skeletonizer 2.1.3; verify installed APIs and changelog before using newer or older behavior.
---

# Flutter Skeletonizer Engineering

## Mission

Build skeleton loading that improves perceived responsiveness **without corrupting state semantics, accessibility, interaction safety, layout stability, or frame performance**.
Use this governing model:
```text
user operation
→ classify loading phase
→ decide whether skeleton is appropriate
→ preserve final geometry
→ keep fake data presentation-only
→ suppress unsafe interaction + fake semantics
→ replace/defer expensive descendants
→ choose theme/motion-aware effect
→ test loading transitions
→ profile on representative hardware
```

A shimmer is not a loading architecture.
## Non-negotiable rules

1. Classify the operation before choosing a skeleton.
2. Prefer skeletons for predictable initial or unresolved section layouts.
3. Keep loaded content visible during refresh.
4. Keep loaded rows visible during pagination.
5. Use targeted progress/disabled states for mutations.
6. Use determinate progress when real progress exists.
7. Use an empty state only after a successful empty result.
8. Keep fake values out of repositories, domain entities, persistence, analytics, and actions.
9. Preserve final geometry: constraints, line counts, spacing, aspect ratios, and responsive behavior.
10. Do not assume Skeletonizer invents layout; it transforms the paint of an already-shaped tree.
11. Do not assume skeleton paint prevents child construction, resource initialization, network image fetches, chart work, or platform-view startup.
12. Use `Skeleton.replace` or conditional construction when expensive descendants should not exist during loading.
13. Start with `ignorePointers: true` for fake initial content.
14. If scrolling requires pointer handling, protect fake controls locally and ensure callbacks cannot act on placeholders.
15. Treat pointer safety and semantics safety separately.
16. Exclude placeholder semantics explicitly; expose one useful loading status where appropriate.
17. Keep meaningful navigation controls outside the excluded skeleton subtree when they must remain usable.
18. Honor reduced-motion preferences; use a non-animated treatment when requested.
19. Use light/dark theme-aware skeleton configuration.
20. Bound placeholder count around the viewport and build lists/grids lazily.
21. Do not keep shimmer running after failure.
22. Do not use skeletons as a substitute for caching.
23. Do not add `RepaintBoundary` mechanically.
24. Profile large animated skeletons in profile mode on representative physical hardware.
25. Use only APIs verified for the installed Skeletonizer version.
## Reference routing

Read only the reference needed for the task:
| Need | Read |
|---|---|
| Decide skeleton vs spinner/cached content, understand package mechanics, fake-data boundaries, sizing/layout | `references/01-foundations-loading-model.md` |
| Choose `ignore`/`keep`/`replace`/`leaf`/`unite`/`shade`, handle text/images/buttons/lists/grids/pagination/slivers | `references/02-annotations-components-lists.md` |
| Configure effects, reduced motion, themes, accessibility, hit testing, state management, design-system wrappers, performance | `references/03-effects-accessibility-performance.md` |
| Handle maps/WebViews/charts/forms/tables, responsive/localized layouts, testing, debugging, upgrades | `references/04-heavy-widgets-testing-migration.md` |
| Review anti-patterns, implementation/refactor workflows, checklists, and production gate | `references/05-antipatterns-workflows-checklists.md` |
## Step 1 — Inspect the repository

Before editing code, determine:
```text
Flutter version
Dart version
skeletonizer version + lockfile
state-management model
current loading-state model
current skeleton APIs/annotations
theme configuration
responsive layout logic
image/SVG/chart/platform-view usage
accessibility conventions
tests/goldens
performance evidence
```

Search for:
```text
Skeletonizer(
Skeletonizer.zone
Skeletonizer.sliver
SliverSkeletonizer
Bone.
Skeleton.ignore
Skeleton.keep
Skeleton.replace
Skeleton.leaf
Skeleton.unite
Skeleton.shade
Skeleton.ignorePointer
ShimmerEffect
PulseEffect
SolidColorEffect
isLoading
isRefreshing
loadingMore
```

Do not start by replacing widgets. First map loading semantics.
## Step 2 — Classify the loading state

Use distinct states such as:
```text
initialLoading
loaded
refreshing
loadingMore
mutationInProgress
failure
```

Do not overload one `isLoading` when UX differs.
Choose UX:
| Situation | Default |
|---|---|
| Predictable first content load | Skeleton |
| Predictable unresolved section | Local skeleton |
| Unknown final structure | Spinner/neutral loading |
| Useful cached/stale content exists | Keep content + refresh affordance |
| Pull-to-refresh | Keep content + refresh indicator |
| Pagination | Keep rows + append placeholders/footer |
| Upload/download with progress | Determinate progress |
| Local save/toggle/like | Targeted disabled/progress state |
| Successful empty result | Empty state |
| Auth/bootstrap destination unknown | Branded/neutral bootstrap |
| One image unresolved | Image-local placeholder |
Reject skeleton loading if it would misrepresent unknown structure or flash too briefly to help.
## Step 3 — Understand the package model

Automatic mode needs a shaped widget tree:
```dart
Skeletonizer(
  enabled: state.isInitialLoading,
  child: content,
)
```

The real/fake presentation layout still participates in build and layout. Skeletonizer changes painting for eligible descendants.
Manual mode defines geometry explicitly:
```dart
Skeletonizer.zone(
  child: const Column(
    children: [
      Bone.text(words: 3),
      Bone.multiText(lines: 2),
    ],
  ),
)
```

Choose automatic mode when reusing the final layout minimizes drift and the subtree is safe to construct.
Choose zone/manual Bones when:
- fake domain graphs would be elaborate;
- expensive descendants should not be built;
- real widgets cannot exist before data arrives;
- a simpler intentional placeholder is clearer.
## Step 4 — Keep fake data presentation-only

Never make repositories emit fake users/products/orders just to shape skeletons.
Preferred flow:
```text
real repository state
→ presentation maps loading to placeholder view models/Bones
→ skeleton UI
```

If automatic mode needs strings to shape text, use deterministic presentation-only placeholders or `BoneMock`. No placeholder value may drive:
- navigation;
- analytics;
- persistence;
- authorization;
- cart/checkout actions;
- API requests.
## Step 5 — Match final geometry

Preserve:
```text
card/row bounds
avatar/image dimensions
aspect ratios
border radii
padding/gaps
grid columns
title/subtitle line counts
button positions/heights
table column widths
responsive breakpoints
```

For text, keep the same production `Text` constraints and plausible wrapping. Skeletonizer derives text bones from laid-out paragraph metrics.
Test with:
- short/typical/long content;
- localization;
- RTL;
- large text scaling;
- phone/tablet/desktop constraints.
Skeleton paint cannot fix bad placeholder geometry.
## Step 6 — Choose annotations by intent

Use this decision table:
| Intent | API |
|---|---|
| Hide paint during skeleton mode | `Skeleton.ignore` |
| Keep child painted normally | `Skeleton.keep` |
| Build a lightweight substitute instead of real child | `Skeleton.replace` |
| Treat a compound subtree as one bone-like region | `Skeleton.leaf` |
| Merge nearby small painted shapes | `Skeleton.unite` |
| Shader-shade custom-painted output | `Skeleton.shade` |
| Disable interaction for a local subtree | `Skeleton.ignorePointer` |
Important distinctions:
```text
ignore ≠ keep
leaf ≠ replace
pointer blocking ≠ semantics exclusion
```

Use `replace` rather than `leaf` when the goal is to avoid expensive initialization.
## Step 7 — Audit expensive descendants

Explicitly inspect:
```text
Image.network / high-resolution images
SVG/vector renderers
charts
CustomPainter
maps
WebViews
camera/video previews
platform views
animations
```

Default strategy:
```text
expensive real widget
→ do not build while loading
→ lightweight Bone/replacement with same geometry
```

Examples:
- image → `Skeleton.replace` with circle/rectangle;
- complex chart → chart-area `Bone`;
- map/WebView/camera → fixed-size replacement;
- custom painter → `shade` only when visually useful and measured.
Do not fetch or decode production media only so its pixels can be covered by a skeleton.
## Step 8 — Lists, grids, refresh, pagination

Initial load:
```text
no useful content
→ lazy viewport-sized skeleton list/grid
```

Pagination:
```text
loaded items
+ 2–4 bottom skeleton rows/cards
```

Refresh:
```text
loaded content
+ refresh affordance
```

Share the production list/grid delegate and responsive breakpoint logic.
Never eagerly build hundreds of fake rows.
For sliver layouts, preserve sliver architecture with `Skeletonizer.sliver` / `SliverSkeletonizer`. Do not convert a sliver screen to an eager `Column` for loading.
## Step 9 — Interaction safety

Default:
```dart
Skeletonizer(
  enabled: loading,
  ignorePointers: true,
  child: content,
)
```

If users must scroll the skeletonized subtree and pointer blocking must be disabled:
1. enable pointer interaction deliberately;
2. wrap buttons/links/fake controls with `Skeleton.ignorePointer`;
3. ensure callbacks cannot receive placeholder entities;
4. test gestures.
Prefer keeping real back/close/navigation chrome outside the skeleton subtree.
## Step 10 — Accessibility

Do not assume hidden/shimmered content disappears from the semantics tree.
For fake placeholder content:
```text
Semantics(load status)
→ ExcludeSemantics(placeholder subtree)
→ Skeletonizer
```

Requirements:
- placeholder names/prices/addresses are not announced;
- fake controls expose no meaningful actions;
- one useful loading announcement exists only where warranted;
- back/close controls remain accessible if intentionally available;
- loaded content regains semantics;
- failure replaces loading semantics.
Do not use `Skeleton.ignore` as a semantics mechanism.
## Step 11 — Motion and theme

Use application-level Skeletonizer configuration for consistent effects.
Prefer:
- `ShimmerEffect` for ordinary measured animation;
- `PulseEffect` when lower-spatial-motion treatment suits UX;
- `SolidColorEffect` for reduced motion, deterministic tests, or performance-sensitive cases.
Honor:
```dart
MediaQuery.disableAnimationsOf(context)
```

Do not hardcode one light shimmer palette into dark mode.
Enable skeleton→content switch animation only when the UX benefit justifies extra transition/state/paint complexity. Do not assume switch animation for slivers.
## Step 12 — State-management boundary

State management exposes semantic phases and real data.
Presentation chooses Skeletonizer.
Good:
```text
Cubit/Notifier:
  initialLoading / loaded / refreshing / loadingMore / failure
  real data only
Widget:
  maps phase to skeleton / content / refresh / pagination / error
```

Keep these package types out of repositories/domain code:
```text
Skeletonizer
Bone
ShimmerEffect
Permission-like UI config
placeholder domain entities
```

Use selectors/build filters so unrelated state changes do not rebuild giant animated skeleton subtrees.
## Step 13 — Errors and retries

Required state transition:
```text
loading
├── success → real content
└── failure → error/retry UI
```

Never infer loading from `data == null` if `null` also represents failure.
With useful cached content and refresh failure, keep content and surface a non-destructive error.
## Step 14 — Test deterministically

Use `SolidColorEffect` when animation is irrelevant to the test.
Test:
- skeleton on/off;
- initial → loaded;
- initial → failure;
- refresh keeps content;
- pagination keeps rows and appends placeholders;
- pointer blocking;
- local interaction guards;
- `replace` behavior;
- semantics exclusion/loading status;
- reduced motion;
- responsive layout;
- important light/dark skeleton goldens.
For migration-sensitive visual changes, capture baseline goldens before upgrading the package.
## Step 15 — Profile measured hotspots

Use profile mode and representative physical hardware.
Compare skeleton vs loaded state:
```text
UI-thread time
raster-thread time
jank count
rebuilds
memory
image/decode activity
platform-view activity
```

If skeleton state is more janky than loaded content, optimize in this order:
1. reduce placeholder count;
2. preserve lazy construction;
3. replace complex descendants;
4. stop unnecessary image/network work;
5. remove costly `shade`/nested skeleton scopes;
6. simplify or disable animation;
7. narrow skeleton scope;
8. only then test targeted repaint boundaries.
Keep only improvements supported by measurement.
## Migration rules

Before upgrading Skeletonizer:
1. inspect current and target SDK constraints;
2. read intervening changelog entries;
3. search all Skeletonizer APIs;
4. preserve loading semantics and geometry;
5. inspect deprecated/renamed APIs;
6. test annotations and custom effects;
7. run widget/accessibility/golden tests;
8. profile large loading surfaces again.
Known source-baseline concerns include:
```text
Skeletonizer.bones → Skeletonizer.zone
SkeletonizerConfigData.light() → default constructor
SoldColorEffect → SolidColorEffect
old colored-box annotation removed
switch animation introduced later
ThemeExtension support introduced later
TextBoneBorderShape additions
sliver switch-animation limitations
```

Do not copy current-baseline APIs into an older locked project without verification.
## Review output format

When reviewing existing code, report findings in this order:
1. **Loading-state correctness** — initial vs refresh vs pagination vs mutation.
2. **Architecture** — fake-data leakage, ownership, state-management boundaries.
3. **Layout stability** — dimensions, text lines, responsive parity.
4. **Interaction safety** — fake actions, scrolling/hit testing.
5. **Accessibility** — placeholder semantics, loading status, reduced motion.
6. **Expensive descendants** — images/charts/platform views still initializing.
7. **Performance** — placeholder count, lazy construction, effect/paint scope.
8. **Version/API risks** — deprecated or unsupported Skeletonizer APIs.
9. **Tests** — transition, semantics, responsive, golden, profiling gaps.
10. **Prioritized fixes** — correctness/security/accessibility first, polish last.
## Production gate

Approve only when all are true:
- loading scenario is correctly classified;
- skeleton is the right UX for that scenario;
- fake values are presentation-only;
- initial/refresh/pagination/mutation states differ appropriately;
- final geometry is closely preserved;
- lists/grids are lazy and bounded;
- heavy descendants are replaced/deferred when appropriate;
- placeholder controls cannot act;
- fake semantics are excluded;
- loading is communicated accessibly;
- reduced motion is handled;
- light/dark/responsive/localized layouts are tested;
- failure stops skeleton loading;
- current package APIs are verified;
- important transitions have deterministic tests;
- complex animated skeletons have profile-mode evidence.
## Final operating rule

Before adding or changing Skeletonizer code, answer:
```text
What user operation is happening?
Should it use a skeleton at all?
Is useful content already available?
Is final structure predictable?
Can the real layout be built safely?
Where will placeholder geometry live?
Can fake data escape presentation?
Which descendants must be replaced/deferred?
Can any fake control be interacted with?
Can fake content enter semantics?
Does motion/theme/accessibility policy fit?
Is placeholder count bounded and lazy?
Does failure terminate loading?
Has expensive/repeated rendering been profiled?
```

Use Skeletonizer as a presentation painting tool, not as a substitute for state modeling, caching, progress reporting, accessibility, or performance engineering.
