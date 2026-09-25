# 03 Effects Accessibility Performance

Effects, motion, theme, semantics, interaction safety, architecture, and performance.

## Contents

- [Effects](#effects)
  - [`ShimmerEffect`](#shimmereffect)
  - [`PulseEffect`](#pulseeffect)
  - [`SolidColorEffect`](#solidcoloreffect)
  - [`ShimmerEffect.raw` / `RawShimmerEffect`](#shimmereffectraw-rawshimmereffect)
- [Custom Effects](#custom-effects)
- [Animation](#animation)
  - [Skeleton effect animation](#skeleton-effect-animation)
  - [Switch animation](#switch-animation)
- [Reduced Motion](#reduced-motion)
- [Theming](#theming)
  - [Scoped override](#scoped-override)
  - [Current configuration names](#current-configuration-names)
- [Dark Mode](#dark-mode)
- [Accessibility](#accessibility)
  - [Do not assume Skeletonizer removes fake semantics](#do-not-assume-skeletonizer-removes-fake-semantics)
  - [Exclude fake placeholder semantics](#exclude-fake-placeholder-semantics)
  - [Static meaningful navigation](#static-meaningful-navigation)
  - [Do not use fake text as semantic data](#do-not-use-fake-text-as-semantic-data)
  - [Accessibility test requirements](#accessibility-test-requirements)
- [Interaction / Hit Testing](#interaction-hit-testing)
  - [Important consequence](#important-consequence)
- [State Management Integration](#state-management-integration)
  - [Bloc/Cubit](#bloccubit)
  - [Riverpod](#riverpod)
  - [Provider / ChangeNotifier](#provider-changenotifier)
  - [Mutation states](#mutation-states)
- [Design System Integration](#design-system-integration)
- [Performance](#performance)
  - [Package-specific costs](#package-specific-costs)
  - [Simplify the subtree](#simplify-the-subtree)
  - [`leaf` versus `replace`](#leaf-versus-replace)
  - [`ignore` versus `replace`](#ignore-versus-replace)
  - [Images](#images)
  - [Lists](#lists)
  - [Rebuild scope](#rebuild-scope)
  - [Repaint boundaries](#repaint-boundaries)
  - [Profile on physical hardware](#profile-on-physical-hardware)
  - [Performance acceptance rule](#performance-acceptance-rule)

## Effects

Skeletonizer currently provides three primary effect families documented by the package:

### `ShimmerEffect`

Default animated gradient.

Current source defaults to approximately:

- 2000 ms duration;
- light base/highlight colors;
- directional gradient movement;
- RTL-aware horizontal transform.

Use when:

- moderate motion is acceptable;
- the skeleton count is controlled;
- profiling shows acceptable cost.

Example:

```dart
const ShimmerEffect(
  baseColor: Color(0xFFE7E8EA),
  highlightColor: Color(0xFFF5F6F7),
  duration: Duration(milliseconds: 1600),
)
```

Do not make shimmer dramatically faster solely to make the interface appear faster.

### `PulseEffect`

Alternates between two colors and reverses the animation.

Current default duration is 1000 ms.

Use when:

- a lower-spatial-motion treatment suits the design;
- shimmer movement is distracting;
- testing shows pulse performs well.

### `SolidColorEffect`

Static effect with `Duration.zero`.

Use for:

- reduced motion;
- deterministic tests;
- extremely large or performance-sensitive skeletons;
- visual designs that do not need animation.

Current source intentionally does not start an animated duration for this effect.

### `ShimmerEffect.raw` / `RawShimmerEffect`

Use when custom gradient colors/stops/direction are genuinely required.

Avoid highly complex gradients without profiling.

---

## Custom Effects

Custom effects are supported through the public `PaintingEffect` abstraction, which requires:

- animation bounds;
- duration;
- `createPaint`;
- `lerp`.

Example:

```dart
import 'package:flutter/material.dart';
import 'package:skeletonizer/skeletonizer.dart';

class SoftColorCycleEffect extends PaintingEffect {
  const SoftColorCycleEffect({
    this.from = const Color(0xFFE7E7E7),
    this.to = const Color(0xFFF1F1F1),
    Duration duration = const Duration(milliseconds: 1400),
  }) : super(
          duration: duration,
          reverse: true,
        );

  final Color from;
  final Color to;

  @override
  Paint createPaint(
    double t,
    Rect rect,
    TextDirection? textDirection,
  ) {
    final color = Color.lerp(from, to, t) ?? from;

    return Paint()
      ..shader = LinearGradient(
        colors: [color, color],
      ).createShader(rect);
  }

  @override
  PaintingEffect lerp(
    PaintingEffect? other,
    double t,
  ) {
    if (other is! SoftColorCycleEffect) {
      return this;
    }

    return SoftColorCycleEffect(
      from: Color.lerp(from, other.from, t) ?? from,
      to: Color.lerp(to, other.to, t) ?? to,
      duration: duration,
    );
  }
}
```

Before adding a custom effect ask:

1. Does the standard shimmer, pulse, or solid effect already solve the UX?
2. Does custom animation increase paint or raster cost?
3. Does it remain acceptable in dark mode?
4. Does it respect reduced motion?
5. Can it be golden-tested deterministically?

Do not introduce custom effects for decoration alone.

---

## Animation

### Skeleton effect animation

Animated effects cause Skeletonizer to continuously update the effect animation and repaint.

Optimize in this order:

1. reduce skeleton scope;
2. reduce placeholder count;
3. replace complex descendants;
4. simplify effect;
5. use a static effect if appropriate;
6. only then investigate more specialized rendering optimizations.

### Switch animation

Current Skeletonizer can animate transition between skeleton and content:

```dart
Skeletonizer(
  enabled: isLoading,
  enableSwitchAnimation: true,
  switchAnimationConfig: const SwitchAnimationConfig(
    duration: Duration(milliseconds: 250),
    switchInCurve: Curves.easeOut,
    switchOutCurve: Curves.easeIn,
  ),
  child: content,
)
```

Current `SwitchAnimationConfig` supports:

- `duration`;
- `reverseDuration`;
- `switchInCurve`;
- `switchOutCurve`;
- `transitionBuilder`;
- `layoutBuilder`.

Defaults use a 300 ms duration and Flutter's default `AnimatedSwitcher` builders.

Do not enable switch animation globally without considering:

- overlapping outgoing/incoming paint;
- semantics during transition;
- state identity;
- visual delay;
- GPU/raster work.

Keep it disabled if direct transition is sufficient.

---

## Reduced Motion

Skeletonizer's current configuration does not expose a package-specific automatic reduced-motion policy. The app should adapt the effect using Flutter accessibility state.

Flutter provides:

```dart
MediaQuery.disableAnimationsOf(context)
```

to observe the platform/user request for reduced or disabled animation.

Recommended pattern:

```dart
class MotionAwareSkeleton extends StatelessWidget {
  const MotionAwareSkeleton({
    super.key,
    required this.enabled,
    required this.child,
  });

  final bool enabled;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);

    return Skeletonizer(
      enabled: enabled,
      effect: reduceMotion
          ? const SolidColorEffect(
              color: Color(0xFFE4E4E4),
            )
          : null,
      child: child,
    );
  }
}
```

Use a theme-appropriate static color rather than blindly using the same light value in dark mode.

Reduced motion should also influence optional skeleton-to-content switch animations.

---

## Theming

Use a design-system-level configuration rather than hardcoding colors in individual screens.

Current package configuration is available as `SkeletonizerConfigData`, which is a `ThemeExtension`, or as a scoped `SkeletonizerConfig`.

Example:

```dart
MaterialApp(
  theme: ThemeData(
    brightness: Brightness.light,
    extensions: const [
      SkeletonizerConfigData(
        effect: ShimmerEffect(
          baseColor: Color(0xFFE5E7EB),
          highlightColor: Color(0xFFF4F5F7),
          duration: Duration(milliseconds: 1600),
        ),
      ),
    ],
  ),
  darkTheme: ThemeData(
    brightness: Brightness.dark,
    extensions: const [
      SkeletonizerConfigData.dark(
        effect: ShimmerEffect(
          baseColor: Color(0xFF33363A),
          highlightColor: Color(0xFF45494F),
          duration: Duration(milliseconds: 1600),
        ),
      ),
    ],
  ),
  home: const HomeScreen(),
)
```

### Scoped override

```dart
SkeletonizerConfig(
  data: const SkeletonizerConfigData(
    effect: PulseEffect(
      duration: Duration(milliseconds: 1200),
    ),
  ),
  child: const ProductArea(),
)
```

Use scoped configuration when:

- one product surface intentionally differs;
- a specific skeleton requires a lower-cost effect;
- a feature has distinct visual branding.

Do not duplicate the same configuration across dozens of widgets.

### Current configuration names

Be precise:

`Skeletonizer` uses:

```dart
textBoneBorderRadius:
```

`SkeletonizerConfigData` uses:

```dart
textBorderRadius:
```

Do not invent a shared argument name.

---

## Dark Mode

Skeletons need sufficient distinction from their surfaces without becoming high-contrast flashes.

Test:

- light mode;
- dark mode;
- OLED-dark surfaces if applicable;
- elevated cards;
- tinted surfaces;
- high-contrast settings where supported.

The package provides `SkeletonizerConfigData.dark()`, whose current default shimmer uses darker base and highlight colors.

Do not use one hardcoded `Colors.grey.shade300` shimmer across both brightness modes.

---

## Accessibility

Accessibility is a first-class requirement.

### Do not assume Skeletonizer removes fake semantics

Current Skeletonizer render code changes painting and hit testing but does not provide a package-level semantics-removal mechanism for placeholder text.

Flutter's `IgnorePointer` no longer implies that descendant semantics are removed; current Flutter documentation explicitly says pointer ignoring leaves other semantic properties intact.

Therefore:

> Pointer safety and semantic safety are separate problems.

### Exclude fake placeholder semantics

Flutter's `ExcludeSemantics` removes descendant semantics while enabled.

Recommended wrapper:

```dart
class AccessibleSkeleton extends StatelessWidget {
  const AccessibleSkeleton({
    super.key,
    required this.enabled,
    required this.child,
    this.loadingLabel = 'Loading content',
  });

  final bool enabled;
  final Widget child;
  final String loadingLabel;

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    final brightness = Theme.of(context).brightness;

    final staticColor = brightness == Brightness.dark
        ? const Color(0xFF3A3A3A)
        : const Color(0xFFE6E6E6);

    return Semantics(
      container: enabled,
      liveRegion: enabled,
      label: enabled ? loadingLabel : null,
      child: ExcludeSemantics(
        excluding: enabled,
        child: Skeletonizer(
          enabled: enabled,
          effect: reduceMotion
              ? SolidColorEffect(color: staticColor)
              : null,
          ignorePointers: true,
          child: child,
        ),
      ),
    );
  }
}
```

This pattern:

- leaves normal content semantics available when loading is false;
- excludes placeholder semantics when loading is true;
- exposes one loading status;
- blocks pointer interaction;
- provides static reduced-motion rendering.

Tailor live-region behavior to the screen. Do not repeatedly announce loading for rapidly changing tiny regions.

### Static meaningful navigation

If a back or close control must remain accessible, keeping the entire skeleton subtree inside `ExcludeSemantics` would remove that control too.

Prefer:

```text
Scaffold
├── AppBar with real back/close action
└── AccessibleSkeleton
    └── content area only
```

rather than skeletonizing the whole scaffold.

### Do not use fake text as semantic data

A visually hidden placeholder such as:

```dart
Text('John Doe')
```

must not be announced as if John Doe were real.

### Accessibility test requirements

Verify:

- placeholder names are absent from the semantics tree;
- one meaningful loading state is available where needed;
- back/close/navigation controls remain discoverable if intentionally available;
- fake buttons do not expose meaningful actions;
- reduced motion changes the animation behavior;
- loaded content regains normal semantics after loading.

---

## Interaction / Hit Testing

Current `Skeletonizer` defaults:

```dart
ignorePointers: true
```

The current render objects return `false` from hit testing when this option is enabled. This applies to both box and sliver implementations.

This is a strong default for fake initial-loading content.

### Important consequence

The setting is coarse.

If Skeletonizer wraps the entire scrollable, it can also prevent user interaction with that skeletonized subtree.

If users must scroll during loading:

1. decide whether scrolling placeholder content is actually valuable;
2. if yes, consider `ignorePointers: false`;
3. locally protect buttons/links using `Skeleton.ignorePointer`;
4. ensure callbacks cannot receive placeholder entities;
5. verify real gesture behavior in a widget/integration test.

Example:

```dart
Skeletonizer(
  enabled: isLoading,
  ignorePointers: false,
  child: ListView.builder(
    itemCount: rows.length,
    itemBuilder: (context, index) {
      return Skeleton.ignorePointer(
        child: ProductRow(
          model: rows[index],
          onTap: () => openProduct(rows[index]),
        ),
      );
    },
  ),
)
```

Do not enable global interactions merely to preserve scrolling and forget that the same decision re-enables taps on descendants.

---

## State Management Integration

Skeletonizer belongs in the presentation layer.

Repositories, services, domain entities, and use cases should not import Skeletonizer types.

Model distinct loading phases.

```dart
enum LoadPhase {
  initialLoading,
  loaded,
  refreshing,
  loadingMore,
  failure,
}
```

A richer state might look like:

```dart
@immutable
class CatalogState {
  const CatalogState({
    required this.phase,
    required this.items,
    this.errorMessage,
  });

  final LoadPhase phase;
  final List<ProductCardViewModel> items;
  final String? errorMessage;

  bool get hasContent => items.isNotEmpty;
}
```

Map state to UX:

```dart
Widget buildCatalogBody(CatalogState state) {
  return switch (state.phase) {
    LoadPhase.initialLoading => const ProductLoadingList(),
    LoadPhase.loaded => ProductList(items: state.items),
    LoadPhase.refreshing => ProductList(
        items: state.items,
        refreshing: true,
      ),
    LoadPhase.loadingMore => ProductList(
        items: state.items,
        loadingMore: true,
      ),
    LoadPhase.failure when state.hasContent => ProductList(
        items: state.items,
      ),
    LoadPhase.failure => CatalogErrorView(
        message: state.errorMessage ?? 'Unable to load products.',
      ),
  };
}
```

### Bloc/Cubit

Prefer state that models the actual operation rather than one overloaded `isLoading`.

Example integration:

```dart
BlocBuilder<CatalogCubit, CatalogState>(
  buildWhen: (previous, current) {
    return previous.phase != current.phase ||
        previous.items != current.items ||
        previous.errorMessage != current.errorMessage;
  },
  builder: (context, state) {
    return buildCatalogBody(state);
  },
)
```

Keep the Bloc/Cubit unaware of:

- `Skeletonizer`;
- `Bone`;
- `ShimmerEffect`;
- placeholder paint configuration.

### Riverpod

Map `AsyncValue` or feature-specific state to the same semantic phases.

Do not blindly map every `AsyncLoading` to a full-screen skeleton. Check whether previous data exists.

### Provider / ChangeNotifier

Expose domain/presentation state such as:

```text
initialLoading
refreshing
loadingMore
failure
items
```

and keep Skeletonizer selection in the widget layer.

### Mutation states

Do not use a screen-level skeleton for:

- saving a form;
- adding an item to cart;
- toggling a setting;
- liking a post.

Use local disabled/progress state.

---

## Design System Integration

A design-system wrapper is useful when it centralizes policy.

A useful wrapper may centralize:

- accessibility semantics;
- reduced-motion behavior;
- default pointer policy;
- loading announcement;
- project effect selection.

Do not create a wrapper whose constructor simply duplicates every Skeletonizer parameter.

Example:

```dart
class AppSkeleton extends StatelessWidget {
  const AppSkeleton({
    super.key,
    required this.enabled,
    required this.child,
    this.loadingLabel = 'Loading content',
  });

  final bool enabled;
  final Widget child;
  final String loadingLabel;

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    final brightness = Theme.of(context).brightness;

    final staticColor = brightness == Brightness.dark
        ? const Color(0xFF3C3C3C)
        : const Color(0xFFE6E7E8);

    return Semantics(
      container: enabled,
      liveRegion: enabled,
      label: enabled ? loadingLabel : null,
      child: ExcludeSemantics(
        excluding: enabled,
        child: Skeletonizer(
          enabled: enabled,
          ignorePointers: true,
          effect: reduceMotion
              ? SolidColorEffect(color: staticColor)
              : null,
          child: child,
        ),
      ),
    );
  }
}
```

Keep specialized controls outside this wrapper when they must stay interactive or semantically visible.

---

## Performance

Skeleton loading is not free.

### Package-specific costs

Current Skeletonizer behavior has several relevant costs:

- the placeholder/real widget structure still needs to be built and laid out;
- animated effects own an animation controller;
- animation ticks update Skeletonizer state;
- the skeleton render proxy marks paint dirty as the effect value changes;
- Skeletonizer creates a custom painting context and effect paint;
- its render wrapper reports that it always needs compositing;
- `Skeleton.shade` adds shader-mask compositing;
- many painted descendants still need to be traversed;
- complex child initialization is not prevented merely because its final paint becomes a bone.

### Simplify the subtree

Prefer:

```text
Map
→ one rounded rectangle replacement
```

rather than:

```text
Initialize Google Map
→ render platform view
→ expect Skeletonizer to make it cheap
```

Prefer:

```text
Chart
→ one chart-area Bone
```

rather than:

```text
build 150 fake chart data points
→ run chart layout
→ shade chart
```

### `leaf` versus `replace`

Use `Skeleton.leaf` to simplify visual skeleton decomposition.

Use `Skeleton.replace` to avoid building the real descendant during skeleton mode.

Do not confuse the two.

### `ignore` versus `replace`

`Skeleton.ignore` skips paint while active but does not exist to eliminate child construction/layout.

Use `replace` or conditional building to remove expensive work.

### Images

Do not fetch high-resolution production images merely because their final pixels will be painted as skeleton rectangles.

### Lists

Reduce:

- number of visible placeholders;
- offscreen animated skeletons;
- nested skeleton scopes;
- complex shape count;
- clipping where not visually necessary.

### Rebuild scope

Do not subscribe a complete screen to one broad loading provider if only one card changes.

Use:

- Bloc selectors/build filters;
- Riverpod scoped watches/selectors;
- Provider `Selector`;
- extracted widgets;
- stable immutable inputs.

### Repaint boundaries

Do **not** automatically wrap every bone in `RepaintBoundary`.

Skeletonizer `2.1.1` specifically changed painting implementation and removed a redundant internal `isRepaintBoundary` override. Treat repaint-boundary placement as a measured Flutter optimization, not Skeletonizer folklore.

Flutter's own performance guidance recommends investigating actual UI/raster cost and using `RepaintBoundary` when a static/complex region benefits—not mechanically.

### Profile on physical hardware

Use Flutter profile mode and DevTools.

Flutter's current performance guidance recommends performance testing on a physical device, preferably representative of the slow end of the supported device set, because debug mode and emulators/simulators can misrepresent release behavior.

Compare:

```text
Initial skeleton scrolling
vs
Loaded-content scrolling
```

Inspect:

- UI thread frame time;
- raster frame time;
- jank count;
- rebuilds;
- rasterization spikes;
- memory;
- image activity;
- platform-view activity.

Flutter's performance target is roughly a 16 ms frame budget at 60 Hz, with higher-refresh displays having tighter budgets.

### Performance acceptance rule

The loading UI must not consistently be more janky than the content whose wait it is intended to mask.

If it is:

1. reduce placeholder count;
2. use lazy construction;
3. replace complex descendants;
4. eliminate unnecessary images;
5. remove unnecessary `Skeleton.shade`;
6. use `SolidColorEffect` or a simpler animation;
7. narrow the Skeletonizer scope;
8. remove nested skeletonizers;
9. profile again.

---
