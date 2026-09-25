# 01 Foundations Loading Model

Foundations, loading-state selection, package mechanics, fake-data boundaries, and layout stability.

## Contents

- [Purpose](#purpose)
  - [Version baseline](#version-baseline)
  - [Evidence labels](#evidence-labels)
- [When to Use This Skill](#when-to-use-this-skill)
  - [Screen-level selection guide](#screen-level-selection-guide)
- [When NOT to Use Skeleton Loading](#when-not-to-use-skeleton-loading)
  - [Decision framework](#decision-framework)
  - [Explicitly avoid skeletons for](#explicitly-avoid-skeletons-for)
- [Core Principles](#core-principles)
- [Mental Model](#mental-model)
  - [Actual package model](#actual-package-model)
  - [What remains in the tree](#what-remains-in-the-tree)
  - [Painting model](#painting-model)
  - [Layout is preserved by layout, not by magic](#layout-is-preserved-by-layout-not-by-magic)
- [Package Setup](#package-setup)
  - [New repository baseline](#new-repository-baseline)
- [Core Skeletonizer API](#core-skeletonizer-api)
  - [Reading current state inside a descendant](#reading-current-state-inside-a-descendant)
- [Enabled / Disabled Behavior](#enabled-disabled-behavior)
  - [Do not overstate child-state preservation](#do-not-overstate-child-state-preservation)
  - [Animated effect rebuild behavior](#animated-effect-rebuild-behavior)
- [Fake Data Strategy](#fake-data-strategy)
  - [Why fake/presentation data may be necessary](#why-fakepresentation-data-may-be-necessary)
  - [Strong boundary](#strong-boundary)
  - [Bad domain coupling](#bad-domain-coupling)
  - [Better presentation model](#better-presentation-model)
  - [Prefer `BoneMock` only for shaping text](#prefer-bonemock-only-for-shaping-text)
  - [Manual skeletons can remove the fake-data requirement](#manual-skeletons-can-remove-the-fake-data-requirement)
- [Layout Stability](#layout-stability)
  - [Text geometry](#text-geometry)
  - [Do not overfit to one sample](#do-not-overfit-to-one-sample)

# Skeletonizer Engineering Skill for Flutter

## Purpose

Use this skill when designing, implementing, reviewing, debugging, testing, profiling, or migrating skeleton loading states in production Flutter applications that use the `skeletonizer` package.

Treat skeleton loading as a **presentation and UX decision**, not as a default response to every asynchronous operation.

Use this skill to make senior-level decisions about:

- whether skeleton loading is appropriate at all;
- whether a spinner, progress indicator, cached content, stale-content refresh, optimistic UI, inline placeholder, or empty state is better;
- how to preserve final-layout geometry;
- how to keep fake data out of repositories and domain logic;
- how to use current `Skeletonizer`, `SliverSkeletonizer`, configuration, effects, `Bone` widgets, and annotations;
- how to prevent unsafe interaction with placeholder controls;
- how to prevent placeholder content from polluting accessibility semantics;
- how to handle initial loading, refresh, pagination, partial loading, and mutations differently;
- how to keep expensive images, charts, SVGs, platform views, and custom painters out of unnecessary loading work;
- how to profile skeleton rendering rather than assuming shimmer is cheap;
- how to test loading states deterministically;
- how to migrate version-sensitive APIs safely.

### Version baseline

This skill is grounded in `skeletonizer` **2.1.3**, whose current package source declares Dart `>=3.7.0 <4.0.0` and Flutter `>=3.32.0`. Before modifying an existing repository, inspect its `pubspec.yaml` and lockfile instead of assuming it uses this version.

### Evidence labels

Interpret recommendations in this document using these categories:

- **Package behavior** — verified from the current official Skeletonizer README, source, tests, or changelog.
- **Flutter behavior** — based on Flutter framework/API documentation.
- **Architecture rule** — a production recommendation inferred from package and Flutter behavior.
- **UX rule** — a loading-state design recommendation; not a guarantee made by Skeletonizer.
- **Measure-first rule** — a performance recommendation that must be validated in profile conditions.

Do not present architecture or UX recommendations as package guarantees.

---

## When to Use This Skill

Use this skill for:

- initial skeleton loading;
- profile and detail page placeholders;
- feeds and search-result loading;
- e-commerce lists and grids;
- card placeholders;
- dashboards;
- settings screens with predictable structure;
- table and grid placeholders;
- pagination loading rows;
- partial section loading;
- loading UX reviews;
- interaction-safety reviews;
- accessibility reviews;
- skeleton performance investigations;
- `Skeletonizer` configuration;
- annotation selection;
- `Bone`/manual skeleton design;
- sliver loading;
- state-management integration;
- package upgrades and migrations.

### Screen-level selection guide

| Screen | Skeleton suitability | Senior-level guidance |
| --- | --- | --- |
| Profile | High for first load | Match avatar, title lines, metadata, and section heights. Keep known navigation chrome real. |
| Product detail | High if structure is known | Preserve media aspect ratio, title lines, price area, and CTA geometry. Do not initialize unnecessary image/network work for fake data. |
| News/article detail | Medium-high | Skeleton predictable header/body structure; avoid pretending an unknown article has a fixed number of sections. |
| Feed | High for initial load | Use a lazy placeholder list sized around the viewport. |
| E-commerce listing | High | Match grid columns, card aspect ratios, image slots, title-line count, and price row. |
| Dashboard | High per independent section | Skeletonize unresolved cards individually instead of blocking loaded cards. |
| Settings | Medium | Static labels/chrome may be better kept real while dynamic account values skeletonize. |
| Chat | Usually medium-low | Keep existing history visible. Use targeted loading for history pagination or attachment/media placeholders. |
| Search results | High after a meaningful request starts | Do not show fake result structure before the user has actually searched. |
| Tables | High when schema is known | Preserve headers and column widths; skeletonize a viewport-sized row set. |
| Dynamic CMS layout | Low if structure is unknown | Prefer neutral loading UI until the layout definition itself is known. |
| Authentication bootstrap | Usually low | A branded launch/loading state is usually clearer than pretending the destination layout is already known. |

---

## When NOT to Use Skeleton Loading

Do not use Skeletonizer merely because an async state is named `loading`.

Choose the loading UX from the user task.

### Decision framework

Use a **skeleton** when all or most of these are true:

- this is an initial or section-level content load;
- the final structure is predictable;
- dimensions and content shape are known;
- the placeholder can closely resemble the final layout;
- perceived latency benefits from showing structure early;
- placeholder rendering is materially cheaper or at least not more expensive than the final UI;
- showing temporary placeholder structure will not mislead the user.

Prefer a **spinner or indeterminate progress indicator** when:

- the final structure is unknown;
- the operation is not primarily loading page content;
- the user is waiting for a command to finish;
- only a compact region needs a busy indication.

Prefer a **determinate progress indicator** when actual progress exists, such as:

- upload;
- download;
- export;
- import;
- installation;
- file processing with known progress.

Prefer **stale/cached content plus a refresh indicator** when useful content already exists.

Prefer **optimistic UI** when a reversible, high-confidence mutation can be reflected immediately.

Prefer an **inline placeholder** when one small field, image, chart, or card is unresolved.

Prefer an **empty state** only after loading has completed successfully and the result is genuinely empty.

Prefer a **blank/branded bootstrap screen** when the destination structure is unknown or rendering a fake page would be misleading.

### Explicitly avoid skeletons for

- tiny delays where the skeleton would flash;
- highly unpredictable layouts;
- destructive action progress;
- authentication/session bootstrap when routing is unresolved;
- uploads and downloads with real progress;
- long-running commands where progress/status text communicates more;
- already-loaded screens being refreshed;
- cached content that remains useful;
- a single image loading inside an otherwise complete screen;
- small mutations such as saving a setting or liking a post;
- operations where fake structure implies data that may not exist.

A skeleton that appears for 40 ms and disappears is usually visual noise, not perceived-performance improvement.

A skeleton that claims a six-card result layout before the application knows whether any cards exist can mislead the user.

---

## Core Principles

Follow these rules unless repository-specific requirements justify a documented exception.

1. **Use skeletons primarily for predictable initial or unresolved section layouts.**
2. **Treat skeleton loading as presentation state.**
3. **Keep fake data presentation-only.**
4. **Never make repositories return fake production entities solely to satisfy skeleton layout.**
5. **Preserve final geometry: dimensions, line counts, spacing, image ratios, and control positions.**
6. **Do not assume Skeletonizer automatically fixes layout shift.**
7. **Keep already-loaded content visible during refresh.**
8. **Keep already-loaded list items visible during pagination.**
9. **Use a local progress state for mutations instead of re-skeletonizing unrelated content.**
10. **Disable unsafe interactions while placeholder data is visible.**
11. **Do not assume pointer blocking removes accessibility semantics.**
12. **Exclude fake placeholder semantics explicitly.**
13. **Announce loading once where accessibility requires it; do not announce every bone.**
14. **Replace expensive descendants rather than merely hiding or shading them.**
15. **Do not load real high-resolution images merely to paint them as rectangles.**
16. **Use lazy builders for skeleton lists and grids.**
17. **Render enough placeholder rows to fill or slightly exceed the viewport—not the theoretical dataset size.**
18. **Use theme-aware effects instead of scattered hardcoded shimmer colors.**
19. **Honor reduced-motion preferences explicitly.**
20. **Profile shimmer-heavy screens on representative physical hardware.**
21. **Do not add `RepaintBoundary` everywhere without evidence.**
22. **Keep skeleton complexity below loaded-screen complexity where practical.**
23. **Stop skeleton loading on failure.**
24. **Do not use decorative shimmer as a substitute for caching.**
25. **Use only APIs verified for the installed Skeletonizer version.**

---

## Mental Model

### Actual package model

`Skeletonizer` does **not** normally generate an independent set of skeleton widgets from your data model.

The package's documented model is to take an **already-built layout** and reduce its painted content into skeleton shapes. The current render implementation inserts a render proxy that creates a custom `SkeletonizerPaintingContext`; painting operations from descendants are intercepted and many content operations—such as paragraphs and images—are rendered using the configured skeleton paint/effect instead.

Use this mental model:

```text
Application loading state
        ↓
Real layout or presentation-only placeholder layout is built
        ↓
Skeletonizer render wrapper
        ↓
Normal descendant layout still determines geometry
        ↓
Skeletonizer intercepts painting
        ↓
Text/images/eligible leaf paints become skeleton geometry/effect
        ↓
Loading completes
        ↓
Skeletonizer is disabled
        ↓
Normal content paint is shown
```

There is a second, manual mode:

```text
Loading state
        ↓
Skeletonizer.zone
        ↓
Explicit Bone widgets define skeleton geometry
        ↓
Only Bone widgets / nested skeletonizers receive the effect
```

The package explicitly supports `Skeletonizer.zone` for cases where you want manual skeletons, a different placeholder layout, or want to avoid fake-data-driven construction.

### What remains in the tree

For normal automatic skeletonization, the content layout must exist because Skeletonizer needs geometry to paint.

Consequences:

- layout work still exists;
- ordinary widget construction still exists unless you conditionally replace it;
- expensive descendants may still initialize;
- a network image may still be requested if you build it;
- a platform view may still initialize if you build it;
- a custom animation may still run if you start it;
- a skeleton effect does not magically eliminate child-side work.

`Skeleton.replace` is materially different: while the nearest Skeletonizer is enabled, its implementation builds the replacement instead of its real `child`. Use that distinction when the goal is to avoid constructing an unsuitable or expensive descendant.

### Painting model

Current automatic skeletonization includes these important behaviors:

- text paragraphs are converted into line rectangles using actual paragraph line metrics;
- image draw calls are replaced visually by rectangle skeleton paint;
- eligible leaf paths/rectangles/circles are shader-painted;
- ordinary container painting can remain normal, be recolored, or be ignored based on configuration;
- some low-level canvas operations are passed through unchanged;
- `CustomPainter` content is therefore not guaranteed to become a useful skeleton automatically;
- the official documentation instructs using `Skeleton.shade` for `CustomPainter` when shader shading is desired.

### Layout is preserved by layout, not by magic

Skeletonizer changes painting; it does not invent correct dimensions for missing data.

If a list has zero children during loading, there is nothing meaningful to skeletonize.

If placeholder text wraps into three lines while final text uses one, the placeholder and final layouts will differ.

If the fake avatar is 64×64 while the final avatar is 40×40, the transition will jump.

The README explicitly identifies the need for layout-shaping data and provides `BoneMock` as a helper. Treat that helper as presentation data, not domain data.

---

## Package Setup

### New repository baseline

For a repository intentionally adopting the current baseline:

```yaml
dependencies:
  flutter:
    sdk: flutter
  skeletonizer: ^2.1.3
```

Import:

```dart
import 'package:flutter/material.dart';
import 'package:skeletonizer/skeletonizer.dart';
```

Before adding or upgrading the package:

1. inspect the repository's Flutter version;
2. inspect its Dart version;
3. inspect its existing `skeletonizer` constraint;
4. inspect `pubspec.lock`;
5. inspect the current Skeletonizer changelog;
6. run existing widget/golden tests before migration;
7. compare loading-state visuals after migration.

Current `2.1.3` requires Flutter `>=3.32.0` and Dart `>=3.7.0`. Do not upgrade a package in isolation when the app's Flutter SDK cannot satisfy those constraints.

---

## Core Skeletonizer API

Current primary constructors include:

```dart
Skeletonizer(
  enabled: isLoading,
  child: content,
)
```

```dart
Skeletonizer.zone(
  enabled: isLoading,
  child: manualSkeletonLayout,
)
```

```dart
Skeletonizer.sliver(
  enabled: isLoading,
  child: sliver,
)
```

and:

```dart
SliverSkeletonizer(
  enabled: isLoading,
  child: sliver,
)
```

```dart
SliverSkeletonizer.zone(
  enabled: isLoading,
  child: manualSliverSkeleton,
)
```

Current `Skeletonizer` supports per-instance configuration for:

- `enabled`;
- `effect`;
- `textBoneBorderRadius`;
- `ignoreContainers`;
- `justifyMultiLineText`;
- `containersColor`;
- `ignorePointers`;
- `enableSwitchAnimation`;
- `switchAnimationConfig`.

`ignorePointers` defaults to `true`.

Current sliver constructors do not expose switch-animation arguments; the sliver implementation disables switch animation.

### Reading current state inside a descendant

When genuinely necessary:

```dart
final skeletonEnabled = Skeletonizer.of(context).enabled;
```

Do not scatter this lookup across business widgets unnecessarily. Prefer passing semantic presentation state when the widget's behavior differs for reasons beyond skeleton painting.

---

## Enabled / Disabled Behavior

The normal pattern is:

```dart
Skeletonizer(
  enabled: state.isInitialLoading,
  child: content,
)
```

When disabled, Skeletonizer paints normal content.

When enabled, it wraps the child in the Skeletonizer render object and changes paint behavior. The current implementation also starts an animation controller when the selected effect has a non-zero duration.

### Do not overstate child-state preservation

Do **not** tell developers that toggling `enabled` guarantees that every descendant `State`, controller, focus node, or animation instance remains mounted continuously.

The current implementation switches between different wrapper widget types/keys for skeleton and content, and optional switch animation uses `AnimatedSwitcher` with separate keyed children. Flutter element reconciliation can therefore affect descendant identity across the transition.

Architecture rule:

- keep important long-lived controllers above volatile presentation wrappers;
- use stable keys where appropriate;
- test stateful descendants if preserving state across skeleton transitions matters;
- never rely on skeleton painting as a lifecycle guarantee.

### Animated effect rebuild behavior

For a non-zero-duration effect, Skeletonizer owns an animation controller and calls `setState` as animation values change. The render object's animation value then marks painting dirty. This means animated skeletons continuously repaint; they are not free static overlays.

The package's internal animation rebuild is scoped to the Skeletonizer state, but the painted subtree still participates in each animated frame. Avoid broad application-state subscriptions around that work.

---

## Fake Data Strategy

This is a core architecture boundary.

### Why fake/presentation data may be necessary

Automatic skeletonization needs a real layout.

This fails:

```dart
Skeletonizer(
  enabled: true,
  child: ListView.builder(
    itemCount: 0,
    itemBuilder: (_, __) => const SizedBox.shrink(),
  ),
)
```

There are no rows to shape or paint.

The package documentation therefore demonstrates temporary data during loading.

### Strong boundary

Use:

```text
Repository
    ↓
loading / loaded / failure
    ↓
presentation layer
    ↓
presentation placeholder values
    ↓
Skeletonizer
```

Avoid:

```text
Repository
    ↓
fake User/Product/Order pretending to be real data
    ↓
business logic
    ↓
analytics / actions / navigation / permissions
```

### Bad domain coupling

```dart
Future<List<Product>> loadProducts() async {
  if (_loading) {
    return List.generate(
      8,
      (_) => const Product(
        id: 'fake',
        title: 'Placeholder product',
        price: 0,
      ),
    );
  }

  return api.loadProducts();
}
```

This allows fake values to leak into:

- navigation;
- analytics;
- selection state;
- cart actions;
- caches;
- persistence;
- logging;
- authorization checks.

### Better presentation model

```dart
@immutable
class ProductCardViewModel {
  const ProductCardViewModel({
    required this.title,
    required this.priceLabel,
    required this.imageUrl,
  });

  final String title;
  final String priceLabel;
  final String? imageUrl;
}

abstract final class ProductCardPlaceholders {
  static const items = <ProductCardViewModel>[
    ProductCardViewModel(
      title: 'Placeholder product title',
      priceLabel: '000.00',
      imageUrl: null,
    ),
    ProductCardViewModel(
      title: 'Placeholder product title',
      priceLabel: '000.00',
      imageUrl: null,
    ),
    ProductCardViewModel(
      title: 'Placeholder product title',
      priceLabel: '000.00',
      imageUrl: null,
    ),
    ProductCardViewModel(
      title: 'Placeholder product title',
      priceLabel: '000.00',
      imageUrl: null,
    ),
  ];
}
```

Then choose presentation data at the UI boundary:

```dart
final visibleItems = state.isInitialLoading
    ? ProductCardPlaceholders.items
    : state.products
        .map(
          (product) => ProductCardViewModel(
            title: product.title,
            priceLabel: product.formattedPrice,
            imageUrl: product.imageUrl,
          ),
        )
        .toList(growable: false);
```

### Prefer `BoneMock` only for shaping text

The package currently exposes helpers such as:

```dart
BoneMock.name
BoneMock.words(2)
BoneMock.email
BoneMock.date
BoneMock.paragraph
```

Current `BoneMock` values are simple deterministic filler strings. Use them only where arbitrary presentation text is sufficient to create geometry.

Do not make application behavior depend on a `BoneMock` value.

### Manual skeletons can remove the fake-data requirement

For sufficiently complex data models, prefer a manual zone:

```dart
class ProductCardSkeleton extends StatelessWidget {
  const ProductCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) {
    return Skeletonizer.zone(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Bone.square(
                size: 88,
                borderRadius: BorderRadius.all(Radius.circular(12)),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Bone.text(words: 3),
                    const SizedBox(height: 10),
                    const Bone.text(words: 1),
                    const SizedBox(height: 16),
                    Align(
                      alignment: AlignmentDirectional.centerEnd,
                      child: Bone.button(
                        words: 2,
                        type: BoneButtonType.filled,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

Manual Bones are preferable when:

- creating fake domain objects would be dangerous;
- the real subtree would initialize expensive resources;
- the exact content widget is unsuitable while data is absent;
- a simplified placeholder is intentionally desired.

Automatic skeletonization is preferable when:

- reuse of the exact final layout is valuable;
- the real layout can be constructed safely;
- layout drift between separate skeleton and final widgets is a greater risk than placeholder-data complexity.

---

## Layout Stability

Skeleton quality is primarily geometry quality.

Match these properties to the final UI:

- row height;
- card constraints;
- avatar diameter;
- image aspect ratio;
- image corner radius;
- horizontal and vertical padding;
- grid column count;
- grid aspect ratio;
- title line count;
- subtitle line count;
- button location;
- button height;
- table column widths;
- section spacing.

### Text geometry

Skeletonizer uses the laid-out paragraph and its line metrics to create text bones. Placeholder string length therefore affects wrapping and geometry. Multi-line text may be extended to paragraph width depending on `justifyMultiLineText`.

Bad:

```dart
Text('Loading...')
```

when real content regularly looks like:

```dart
Text(
  product.longLocalizedTitle,
  maxLines: 2,
  overflow: TextOverflow.ellipsis,
)
```

Better:

```dart
Text(
  loading
      ? 'Placeholder product title with similar wrapping'
      : product.longLocalizedTitle,
  maxLines: 2,
  overflow: TextOverflow.ellipsis,
)
```

Or use manual geometry:

```dart
const Bone.multiText(lines: 2)
```

### Do not overfit to one sample

Match the **typical envelope** of real content, not one unusually short production value.

Test at least:

- short content;
- typical content;
- long localized content;
- accessibility text scaling;
- narrow device;
- tablet/desktop width.

---
