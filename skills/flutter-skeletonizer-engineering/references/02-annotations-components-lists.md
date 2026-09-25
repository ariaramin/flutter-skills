# 02 Annotations Components Lists

Annotation semantics and component/list/sliver skeleton construction.

## Contents

- [Annotations](#annotations)
  - [`Skeleton.ignore`](#skeletonignore)
  - [`Skeleton.keep`](#skeletonkeep)
  - [`Skeleton.replace`](#skeletonreplace)
  - [`Skeleton.leaf`](#skeletonleaf)
  - [`Skeleton.unite`](#skeletonunite)
  - [`Skeleton.shade`](#skeletonshade)
  - [`Skeleton.ignorePointer`](#skeletonignorepointer)
- [Text](#text)
  - [Automatic text behavior](#automatic-text-behavior)
  - [Text rules](#text-rules)
  - [Text scaling](#text-scaling)
- [Images](#images)
  - [Whole-screen initial loading](#whole-screen-initial-loading)
  - [Image-only loading](#image-only-loading)
  - [Preserve geometry](#preserve-geometry)
  - [Avoid hidden image work](#avoid-hidden-image-work)
- [Icons](#icons)
  - [SVG and vector widgets](#svg-and-vector-widgets)
- [Buttons](#buttons)
  - [Unknown action content](#unknown-action-content)
  - [Known action, unavailable temporarily](#known-action-unavailable-temporarily)
  - [Known independent navigation action](#known-independent-navigation-action)
  - [Scrollable skeleton with pointer events enabled](#scrollable-skeleton-with-pointer-events-enabled)
- [Lists and Grids](#lists-and-grids)
  - [Placeholder count](#placeholder-count)
  - [Use lazy construction](#use-lazy-construction)
  - [Grids](#grids)
- [Pagination](#pagination)
  - [Initial load](#initial-load)
  - [Pagination](#pagination)
- [Refresh](#refresh)
- [Partial Loading](#partial-loading)
- [Slivers](#slivers)
  - [Sliver rules](#sliver-rules)

## Annotations

Current official annotation constructors are:

- `Skeleton.ignore`
- `Skeleton.keep`
- `Skeleton.replace`
- `Skeleton.leaf`
- `Skeleton.unite`
- `Skeleton.shade`
- `Skeleton.ignorePointer`

They modify behavior only when used under an enabled Skeletonizer.

### `Skeleton.ignore`

**Purpose:** make a descendant paint nothing while skeletonization is active.

Current source uses `RenderIgnoredSkeleton`, which skips child painting while enabled. The layout still exists. This is more precise than saying the child merely "does not shimmer."

Use when:

- an element should disappear during skeleton mode;
- it has no useful placeholder representation;
- preserving its layout footprint is desirable.

Example:

```dart
Skeleton.ignore(
  child: Text(
    'Sponsored',
    style: Theme.of(context).textTheme.labelSmall,
  ),
)
```

Do not use it when the real element should remain visible. Use `Skeleton.keep` instead.

Do not use it as an accessibility solution. Hiding paint does not inherently mean removing the widget's semantics.

---

### `Skeleton.keep`

**Purpose:** paint the original child normally while the rest of the subtree is skeletonized.

Current source paints through a normal `PaintingContext`, bypassing skeleton paint for that subtree.

Use for:

- static app logo;
- known section heading;
- back button;
- close button;
- persistent navigation icon;
- already-known user or account information.

Example:

```dart
Skeleton.keep(
  child: IconButton(
    onPressed: onBack,
    icon: const Icon(Icons.arrow_back),
    tooltip: 'Back',
  ),
)
```

If the control remains interactive, ensure that interaction is intentionally available. A parent `Skeletonizer(ignorePointers: true)` will still block pointer hit testing for the overall subtree.

---

### `Skeleton.replace`

**Purpose:** substitute another widget while skeleton mode is enabled.

Current implementation chooses either `replacement` or `child` during build and wraps the result in the requested size. This is the annotation to use when merely repainting the child is insufficient.

Use for:

- `Image.network`;
- charts;
- maps;
- WebViews;
- camera previews;
- video players;
- complex SVGs;
- expensive custom painters;
- widgets that cannot accept fake data;
- platform/native views.

Example:

```dart
Skeleton.replace(
  width: 48,
  height: 48,
  replacement: const Bone.circle(size: 48),
  child: CircleAvatar(
    radius: 24,
    backgroundImage: NetworkImage(avatarUrl),
  ),
)
```

Why this matters:

- the replacement can preserve geometry;
- the real child is not selected while skeletonization is enabled;
- invalid fake image URLs can be avoided;
- expensive descendants can be omitted if their initialization is contained inside the replaced child.

Do not use `Skeleton.leaf` as a substitute when the real goal is avoiding initialization. `leaf` changes skeleton painting; `replace` changes which widget is built.

---

### `Skeleton.leaf`

**Purpose:** force a subtree to be treated as a skeleton leaf-like region.

The current implementation paints through a `LeafPaintingContext` that marks descendants as leafs and stops after the first paintable child.

Use when:

- a composite container should appear as one skeleton element;
- automatic decomposition produces visual noise;
- one shape better represents the component.

Example:

```dart
Skeleton.leaf(
  child: Container(
    height: 52,
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(12),
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
    ),
    child: const Center(
      child: Text('Composite control'),
    ),
  ),
)
```

Do not assume `leaf` prevents:

- child construction;
- layout;
- controller initialization;
- data requests.

Use `replace` or conditional building when eliminating work is the goal.

---

### `Skeleton.unite`

**Purpose:** combine multiple neighboring painted shapes into one skeleton region.

The current implementation collects descendant paint geometry and paints a united rectangle/rounded rectangle.

Use when:

- a cluster of tiny icons would otherwise shimmer as distracting individual shapes;
- a compact compound affordance should read as one placeholder.

Example:

```dart
Skeleton.unite(
  borderRadius: BorderRadius.circular(8),
  child: const Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(Icons.star, size: 18),
      SizedBox(width: 4),
      Text('4.8'),
    ],
  ),
)
```

Do not unite unrelated content merely to reduce bone count. The resulting placeholder should still communicate final geometry.

---

### `Skeleton.shade`

**Purpose:** shade the real rendered appearance through Skeletonizer's shader.

Current source implements this with a `ShaderMaskLayer` and compositing. Official documentation specifically calls it out for `CustomPainter`.

Use for:

- a custom-painted shape where shader shading looks correct;
- a custom icon/vector-like element whose standard paint is not converted automatically.

Example:

```dart
Skeleton.shade(
  child: CustomPaint(
    size: const Size(80, 40),
    painter: StatusShapePainter(),
  ),
)
```

Do not use `shade` automatically for large or complex subtrees. It introduces a shader-mask layer and can cost more than a simple replacement.

For charts and platform-like visuals, usually prefer `Skeleton.replace`.

---

### `Skeleton.ignorePointer`

**Purpose:** locally disable pointer interaction while skeletonization is enabled.

Current implementation wraps the child in `IgnorePointer` when the nearest Skeletonizer is enabled.

Use when the outer Skeletonizer must allow hit testing, for example because a scrollable loading list should still scroll:

```dart
Skeleton.ignorePointer(
  child: FilledButton(
    onPressed: () => addPlaceholderProductToCart(),
    child: const Text('Add to cart'),
  ),
)
```

The real code should never make the placeholder action meaningful; the example demonstrates the location of the interaction guard.

Prefer additionally mapping business state so the callback itself cannot operate on placeholder models.

---

## Text

### Automatic text behavior

Skeletonizer intercepts paragraph painting and computes line rectangles from the actual laid-out paragraph. Current text-bone shape is therefore influenced by:

- font metrics;
- line height;
- available width;
- wrapping;
- alignment;
- number of lines;
- placeholder string length.

`justifyMultiLineText` controls whether eligible non-final lines expand to the paragraph width.

`textBoneBorderRadius` controls the per-instance text bone radius.

Current configuration also supports `TextBoneBorderShape.roundedRectangle` and `TextBoneBorderShape.roundedSuperellipse`. The latter was added in `2.1.0`.

### Text rules

Use the final `Text` constraints where possible:

```dart
Text(
  visibleTitle,
  maxLines: 2,
  overflow: TextOverflow.ellipsis,
  style: Theme.of(context).textTheme.titleMedium,
)
```

Avoid placeholder strings whose wrapping is wildly different.

For manual placeholders:

```dart
const Bone.text(words: 3)
```

or:

```dart
const Bone.multiText(lines: 3)
```

Current `Bone.text` derives sizing from the current text style when explicit sizing is absent. `Bone.multiText` similarly derives font information and makes its final line shorter than preceding lines.

### Text scaling

Flutter's current API for obtaining accessibility text scaling is `MediaQuery.textScalerOf(context)`. Test skeleton layouts under the same text-scaling conditions as the loaded UI.

Do not use a hardcoded manual text bone and assume it perfectly tracks all real `Text` scaling behavior.

---

## Images

### Whole-screen initial loading

Use Skeletonizer when the image is one part of a larger predictable screen.

Do not create an invalid fake `NetworkImage`.

Bad:

```dart
CircleAvatar(
  backgroundImage: NetworkImage(''),
)
```

Better:

```dart
Skeleton.replace(
  width: 48,
  height: 48,
  replacement: const Bone.circle(size: 48),
  child: CircleAvatar(
    radius: 24,
    backgroundImage: NetworkImage(imageUrl),
  ),
)
```

The package documentation explicitly recommends replacement or conditionally omitting `NetworkImage` while loading.

### Image-only loading

When the page is already loaded and only one network image is pending:

- keep the rest of the page visible;
- use an image-specific placeholder, `loadingBuilder`, cached-image placeholder, fade-in, or local Skeletonizer/Bone;
- do not return the whole screen to skeleton state.

### Preserve geometry

Match:

- width;
- height;
- `AspectRatio`;
- `BoxFit` implications;
- circle vs rectangle;
- radius;
- clipping.

### Avoid hidden image work

Current Skeletonizer painting replaces image draw operations visually with skeleton rectangles, but that does not mean the application avoided image fetch or decode work. Image loading can itself be expensive in Flutter.

If the image is not needed until real data exists, do not build it behind a skeleton.

---

## Icons

Decide based on meaning.

Skeletonize icons that represent unknown data, such as:

- unknown product/category icon;
- unknown status icon;
- icon derived from server data.

Keep icons that are persistent application chrome:

```dart
Skeleton.keep(
  child: IconButton(
    onPressed: onClose,
    icon: const Icon(Icons.close),
    tooltip: 'Close',
  ),
)
```

Hide icons that are irrelevant during loading:

```dart
Skeleton.ignore(
  child: const Icon(Icons.verified),
)
```

Use manual:

```dart
const Bone.icon()
```

when building a `Skeletonizer.zone`.

### SVG and vector widgets

Do not assume every vector renderer will become a correct bone automatically.

The current Skeletonizer canvas passes some low-level operations such as `drawPicture` through without transforming them into skeleton geometry. If an SVG/vector implementation ultimately relies on such operations, test actual behavior.

Choose among:

- `Skeleton.keep` for meaningful static graphics;
- `Skeleton.shade` when shader shading is visually correct;
- `Skeleton.replace` for a lightweight geometric placeholder.

---

## Buttons

Treat button loading as an interaction-design decision.

### Unknown action content

If the entire card is fake initial-loading content, the button may skeletonize—but it must not be actionable.

Default `Skeletonizer(ignorePointers: true)` provides a safe coarse interaction boundary.

### Known action, unavailable temporarily

Prefer a real disabled button:

```dart
Skeleton.keep(
  child: FilledButton(
    onPressed: null,
    child: const Text('Continue'),
  ),
)
```

This may communicate state better than a fake shimmering action.

### Known independent navigation action

Keep a back/close action visible and usable where the screen architecture allows it. Prefer keeping navigation chrome outside the skeletonized subtree.

### Scrollable skeleton with pointer events enabled

If `ignorePointers: false` is necessary so loading content remains scrollable, locally protect actions:

```dart
Skeleton.ignorePointer(
  child: FilledButton(
    onPressed: onSubmit,
    child: const Text('Submit'),
  ),
)
```

Strong rule:

> A skeletonized control must never trigger an action against placeholder data unless that behavior is explicitly designed and safe.

---

## Lists and Grids

### Placeholder count

Render enough placeholders to fill or slightly exceed the viewport.

Do not mirror an imagined final dataset size.

For a phone feed:

```dart
const placeholderCount = 8;
```

may be reasonable.

For a tablet grid, calculate or choose a layout-specific count based on columns and approximate visible rows.

### Use lazy construction

Good:

```dart
class ProductLoadingList extends StatelessWidget {
  const ProductLoadingList({
    super.key,
    this.itemCount = 8,
  });

  final int itemCount;

  @override
  Widget build(BuildContext context) {
    return Skeletonizer.zone(
      child: ListView.builder(
        itemCount: itemCount,
        itemBuilder: (context, index) {
          return const Padding(
            padding: EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 8,
            ),
            child: ProductCardSkeletonBody(),
          );
        },
      ),
    );
  }
}

class ProductCardSkeletonBody extends StatelessWidget {
  const ProductCardSkeletonBody({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Bone.square(
          size: 72,
          borderRadius: BorderRadius.all(Radius.circular(12)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Bone.text(words: 3),
              const SizedBox(height: 8),
              const Bone.text(words: 2),
              const SizedBox(height: 8),
              const Bone.text(words: 1),
            ],
          ),
        ),
      ],
    );
  }
}
```

Avoid:

```dart
Column(
  children: List.generate(
    1000,
    (_) => const ProductCardSkeletonBody(),
  ),
)
```

### Grids

Use the same responsive grid delegate as loaded content whenever possible.

Do not create:

```dart
GridView.count(
  crossAxisCount: 2,
  children: fakeItems,
)
```

when the production grid changes to four columns on tablets.

Share the layout delegate or responsive breakpoint logic.

---

## Pagination

Initial loading and pagination are different UX states.

### Initial load

```text
No useful list data
→ viewport-sized skeleton list
```

### Pagination

```text
Existing loaded rows
+
bottom loading rows / footer
```

Do not replace already-loaded rows.

Example:

```dart
class PaginatedProductList extends StatelessWidget {
  const PaginatedProductList({
    super.key,
    required this.products,
    required this.loadingMore,
  });

  final List<ProductCardViewModel> products;
  final bool loadingMore;

  static const int _paginationSkeletonCount = 3;

  @override
  Widget build(BuildContext context) {
    final totalCount =
        products.length + (loadingMore ? _paginationSkeletonCount : 0);

    return ListView.builder(
      itemCount: totalCount,
      itemBuilder: (context, index) {
        if (index < products.length) {
          return ProductCard(model: products[index]);
        }

        return const Skeletonizer.zone(
          child: Padding(
            padding: EdgeInsets.all(16),
            child: ProductCardSkeletonBody(),
          ),
        );
      },
    );
  }
}

class ProductCard extends StatelessWidget {
  const ProductCard({
    super.key,
    required this.model,
  });

  final ProductCardViewModel model;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      title: Text(model.title),
      subtitle: Text(model.priceLabel),
    );
  }
}
```

Do not animate the entire existing list as a skeleton during `loadingMore`.

---

## Refresh

Refresh should normally preserve loaded content.

Preferred state:

```text
Loaded data
+
RefreshIndicator / subtle refresh affordance
```

Example:

```dart
RefreshIndicator(
  onRefresh: onRefresh,
  child: ListView.builder(
    physics: const AlwaysScrollableScrollPhysics(),
    itemCount: products.length,
    itemBuilder: (context, index) {
      return ProductCard(model: products[index]);
    },
  ),
)
```

Avoid:

```dart
Skeletonizer(
  enabled: state.isRefreshing,
  child: loadedList,
)
```

unless product requirements explicitly demand hiding stale content and there is a strong reason.

Refreshing valid content back into fake structure throws away useful information and may reset the user's visual context.

---

## Partial Loading

If dashboard sections load independently:

```text
Header loaded
Card A loaded
Card B loading
Card C loaded
```

render:

```text
Header
Real Card A
Skeleton Card B
Real Card C
```

Do not block the whole dashboard.

Use section-level Skeletonizer instances only where independent data ownership justifies them.

Avoid nested Skeletonizers merely because the widget tree is nested. Nest only where sections genuinely have independent skeleton states/effects.

Nested Skeletonizers are supported in modern versions, but support is not a reason to create unnecessary animation and paint scopes. The changelog records nested-Skeletonizer support from `1.2.0`.

---

## Slivers

Skeletonizer currently supports slivers through:

```dart
Skeletonizer.sliver(...)
```

and:

```dart
SliverSkeletonizer(...)
```

as well as zone variants.

Example:

```dart
CustomScrollView(
  slivers: [
    const SliverAppBar(
      title: Text('Products'),
      pinned: true,
    ),
    Skeletonizer.sliver(
      enabled: isInitialLoading,
      child: SliverList.builder(
        itemCount: isInitialLoading ? 8 : products.length,
        itemBuilder: (context, index) {
          final model = isInitialLoading
              ? ProductCardPlaceholders.items[
                  index % ProductCardPlaceholders.items.length
                ]
              : products[index];

          return ProductCard(model: model);
        },
      ),
    ),
  ],
)
```

Use `SliverGrid` similarly.

### Sliver rules

- preserve lazy construction;
- use the production sliver geometry;
- do not convert a sliver screen into an eager `Column` merely for skeleton loading;
- keep persistent `SliverAppBar` content real when appropriate;
- separate initial skeleton loading from pagination loading;
- do not attempt to use Skeletonizer switch animation on slivers.

The official README explicitly says switch animation does not support slivers, and current sliver constructors disable it.

---
