# Curves, accessibility, lifecycle, rendering pipeline, images, lists, platform views, and responsive behavior

Source lines 1363–2406 from the supplied research guide.

## Contents

- [31. Curves](#31-curves)
- [32. Accessibility and reduced motion](#32-accessibility-and-reduced-motion)
- [33. Reduced-motion policy example](#33-reduced-motion-policy-example)
- [34. Motion sensitivity](#34-motion-sensitivity)
- [35. Focus, keyboard, and screen-reader behavior](#35-focus-keyboard-and-screen-reader-behavior)
- [36. High contrast](#36-high-contrast)
- [37. Animation lifecycle](#37-animation-lifecycle)
- [38. Async navigation safety](#38-async-navigation-safety)
- [39. Animation and business-logic separation](#39-animation-and-business-logic-separation)
- [40. Re-entrancy](#40-re-entrancy)
- [41. Rendering pipeline fundamentals](#41-rendering-pipeline-fundamentals)
- [42. Frame budgets](#42-frame-budgets)
- [43. Build/rebuild performance](#43-buildrebuild-performance)
- [44. Stable expensive-child example](#44-stable-expensive-child-example)
- [45. Layout cost](#45-layout-cost)
- [46. Opacity](#46-opacity)
- [47. Clipping](#47-clipping)
- [48. Shadows and elevation](#48-shadows-and-elevation)
- [49. Images and memory](#49-images-and-memory)
- [50. Image-heavy `OpenContainer` example](#50-image-heavy-opencontainer-example)
- [51. Async destination data](#51-async-destination-data)
- [52. Bad versus improved replacement design](#52-bad-versus-improved-replacement-design)
  - [Bad](#bad)
  - [Improved](#improved)
- [53. Deliberately reject `animations` when built-in Flutter is simpler](#53-deliberately-reject-animations-when-built-in-flutter-is-simpler)
- [54. `const` correctly understood](#54-const-correctly-understood)
- [55. Large lists and slivers](#55-large-lists-and-slivers)
- [56. Platform views](#56-platform-views)

---
<!-- ORIGINAL_SOURCE_START -->
# 31. Curves

Current package internals use Flutter Material easing primitives; prior package releases explicitly migrated curves to the framework's `Easing` API.

Prefer package defaults unless product motion design intentionally defines another system.

Changing a curve changes:

```
velocity perception
acceleration
emphasis
arrival/departure feel

```

It does not meaningfully solve a build/layout/image bottleneck.

Do not "performance optimize" jank by randomly changing curves.

---

# 32. Accessibility and reduced motion

Flutter exposes:

```
MediaQuery.disableAnimationsOf(context)

```

to query whether the current environment requests disabled/reduced animations. This accessor also minimizes rebuild dependencies to that specific MediaQuery property.

Flutter animation controllers using normal `AnimationBehavior` alter their behavior when the platform requests disabled animations, but package/source transitions should still be reviewed explicitly when they contain substantial scale or spatial travel.

Do not assume:

```
framework animation shortening == sufficient reduced-motion UX

```

For motion-sensitive transitions, use one of:

```
Duration.zero
simple fade
immediate state replacement
smaller/localized motion

```

while preserving state continuity.

---

# 33. Reduced-motion policy example

```
import 'package:flutter/material.dart';

abstract final class MotionPolicy {
  static Duration duration(
    BuildContext context,
    Duration normalDuration,
  ) {
    return MediaQuery.disableAnimationsOf(context)
        ? Duration.zero
        : normalDuration;
  }
}

class AccessibleAnimatedStatus extends StatelessWidget {
  const AccessibleAnimatedStatus({
    required this.status,
    super.key,
  });

  final String status;

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: MotionPolicy.duration(
        context,
        const Duration(milliseconds: 180),
      ),
      child: Text(
        status,
        key: ValueKey<String>(status),
      ),
    );
  }
}

```

The text still communicates the state with zero animation.

Never communicate:

```
success
selection
validation error
navigation position
critical status

```

only through movement.

---

# 34. Motion sensitivity

Be particularly cautious with:

- large full-screen scaling
- repeated zoom effects
- long travel distances
- continuous parallax-like movement
- looping decorative motion
- several simultaneous spatial transitions.

Reduced-motion mode may warrant removing spatial displacement entirely rather than only reducing its duration.

---

# 35. Focus, keyboard, and screen-reader behavior

For Web/desktop:

- preserve logical focus order
- ensure keyboard activation performs the same action as pointer activation
- move focus appropriately when navigation genuinely changes route/surface
- avoid animating a destination into view before its semantics/navigation state is logically active.

The package's `showModal` implementation wraps modal content in route semantics and `SafeArea`.

However, do not assume every custom transition automatically makes temporarily duplicated outgoing/incoming subtrees perfect for every screen reader.

Test:

```
TalkBack
VoiceOver
Flutter accessibility tooling
keyboard traversal
semantics tree where relevant

```

especially when custom layouts keep several children alive.

---

# 36. High contrast

Motion must not depend on subtle opacity or color differences as the only indicator of state.

Respect the repository's:

```
ColorScheme
high-contrast theme strategy
focus indicators
selected-state visuals

```

A transition may enhance a state change; the final resting UI must communicate it independently.

---

# 37. Animation lifecycle

The package's high-level widgets manage their own transition/controller machinery. `PageTransitionSwitcher`, package route builders, and `OpenContainer` generally do not require application-owned `AnimationController` instances.

Do not add manual controllers unless:

- the animation must be scrubbed
- application interaction needs explicit progress control
- multiple animations require bespoke synchronization
- lifecycle control genuinely exceeds package capability.

When manual controllers are required, keep them in presentation-layer state and dispose them correctly.

Never place controller/ticker objects in business/domain state.

---

# 38. Async navigation safety

If asynchronous work happens **before** navigation:

```
Future<void> loadThenNavigate(BuildContext context) async {
  await Future<void>.delayed(const Duration(milliseconds: 50));

  if (!context.mounted) {
    return;
  }

  await Navigator.of(context).push<void>(
    MaterialPageRoute<void>(
      builder: (BuildContext context) =>
          const AsyncDestinationPage(),
    ),
  );
}

class AsyncDestinationPage extends StatelessWidget {
  const AsyncDestinationPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Loaded destination')),
      body: const Center(child: Text('Ready')),
    );
  }
}

```

Prefer not to block navigation on network I/O unless the product cannot show a meaningful loading destination.

Do not call Navigator through a stale `BuildContext` after an `await`.

---

# 39. Animation and business-logic separation

Animation should **observe** state.

Bad:

```
transitionBuilder()
    → call repository
    → mutate cart
    → send analytics
    → fetch network data

```

Good:

```
business state changes
        ↓
presentation derives current child
        ↓
transition animates visual replacement

```

Critical integrity must not depend on `AnimationStatus.completed`.

If an animation-completion callback performs optional UX work, it must be safe to skip if navigation is interrupted.

---

# 40. Re-entrancy

Rapid taps can create multiple navigation or replacement requests.

Do not assume every package API provides an application-level double-navigation lock.

Make actions idempotent where possible.

If duplicate navigation is genuinely invalid, maintain a small presentation-level guard around the asynchronous push:

```
class GuardedNavigationButton extends StatefulWidget {
  const GuardedNavigationButton({super.key});

  @override
  State<GuardedNavigationButton> createState() =>
      _GuardedNavigationButtonState();
}

class _GuardedNavigationButtonState
    extends State<GuardedNavigationButton> {
  bool _navigating = false;

  Future<void> _open() async {
    if (_navigating) {
      return;
    }

    setState(() => _navigating = true);

    try {
      await Navigator.of(context).push<void>(
        MaterialPageRoute<void>(
          builder: (BuildContext context) =>
              const GuardedDestination(),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _navigating = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: _navigating ? null : _open,
      child: const Text('Open'),
    );
  }
}

class GuardedDestination extends StatelessWidget {
  const GuardedDestination({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Destination')),
      body: const Center(child: Text('Destination')),
    );
  }
}

```

Do not create a global navigation mutex for unrelated routes.

---

# 41. Rendering pipeline fundamentals

When an animation janks, determine **which stage is expensive**.

Conceptually:

```
Dart/widget update
      ↓
build
      ↓
layout
      ↓
paint
      ↓
compositing/layers
      ↓
rasterization
      ↓
display

```

Flutter's official performance guidance distinguishes UI-thread build/layout work from raster work and recommends DevTools' Performance view to identify which side misses its frame budget.

Do not say:

> The animation widget is slow.

Say:

> This transition causes the destination's intrinsic layout to execute on every relevant frame.

or:

> The raster thread is expensive because the transition overlaps a large clipped/shadowed image surface.

Mechanism matters.

---

# 42. Frame budgets

Approximate theoretical frame periods are:

| Refresh rateFrame interval |          |
| -------------------------- | -------- |
| 60 Hz                      | 16.67 ms |
| 90 Hz                      | 11.11 ms |
| 120 Hz                     | 8.33 ms  |

These are mathematical frame intervals, not guarantees of how much application work every platform can consume.

At higher refresh rates, the allowable frame time becomes smaller.

Current Flutter performance guidance specifically notes that workloads acceptable for 60 Hz can miss frames on 120 Hz displays and recommends measuring both build and raster timings.

Do not optimize solely for 16.67 ms if target devices regularly render at higher refresh rates.

---

# 43. Build/rebuild performance

Flutter's performance guidance recommends localizing rebuilds and avoiding unnecessarily rebuilding large widget trees. Reusing an unchanged child instance can allow framework traversal to stop earlier.

`AnimatedBuilder` likewise explicitly supports a prebuilt `child` so animation ticks do not reconstruct animation-independent subtrees.

Do not interpret this as:

> `const` makes the GPU animation free.

`const` primarily helps widget construction/update identity. It does not prevent required layout, painting, compositing, or raster work caused elsewhere.

---

# 44. Stable expensive-child example

Bad:

```
AnimatedBuilder(
  animation: animation,
  builder: (BuildContext context, Widget? child) {
    return Transform.scale(
      scale: 0.95 + animation.value * 0.05,
      child: ExpensiveDashboard(
        records: records,
      ),
    );
  },
);

```

This reconstructs `ExpensiveDashboard` on every animation notification.

Improved:

```
AnimatedBuilder(
  animation: animation,
  child: ExpensiveDashboard(records: records),
  builder: (BuildContext context, Widget? child) {
    return Transform.scale(
      scale: 0.95 + animation.value * 0.05,
      child: child,
    );
  },
);

```

Complete supporting widget:

```
class ExpensiveDashboard extends StatelessWidget {
  const ExpensiveDashboard({
    required this.records,
    super.key,
  });

  final List<int> records;

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: records.length,
      itemBuilder: (BuildContext context, int index) {
        return ListTile(
          title: Text('Record ${records[index]}'),
        );
      },
    );
  }
}

```

Flutter documents this child-reuse optimization directly for `AnimatedBuilder`.

The same design principle applies when composing custom motion around heavy subtrees.

---

# 45. Layout cost

Watch for:

```
IntrinsicHeight
IntrinsicWidth
complex nested intrinsic grids
layout-changing animation of enormous trees
non-lazy lists
repeated responsive calculations

```

Flutter's performance guidance notes that intrinsic layout can cause an additional layout pass and recommends DevTools layout tracing when it appears in performance-sensitive paths.

Prefer transform-based visual communication when it preserves semantics and avoids unnecessary layout churn, but do **not** declare transforms universally cheap.

A transform can avoid layout yet still cause:

- raster work
- large invalidated regions
- compositing layers
- platform-view complications
- image resampling.

---

# 46. Opacity

Opacity can involve offscreen rendering/compositing depending on context.

Flutter's performance documentation specifically calls out opacity and `saveLayer`-related work as areas to inspect rather than applying blanket rules.

Use purpose-built transition widgets when available.

Do not replace:

```
FadeTransition(...)

```

with:

```
Opacity(opacity: animation.value, ...)

```

without a reason.

But also do not conclude:

> Every fade is expensive.

Profile the real subtree.

---

# 47. Clipping

Clipping can add rendering cost, especially for:

- large regions
- complex paths
- continuously changing shapes
- anti-aliased boundaries
- clip + opacity/shadow combinations.

`OpenContainer` defaults to `Clip.antiAlias` and morphs shape/container geometry.

If an `OpenContainer` is expensive:

1. profile it
2. inspect shape/clipping
3. inspect image size
4. inspect shadows
5. inspect both source/destination trees
6. reduce decorative complexity only when evidence points there.

---

# 48. Shadows and elevation

Large blurred shadows can increase raster work.

Current `OpenContainer` permits:

```
closedElevation
openElevation
closedShadows
openShadows

```

and custom shadow lists override their corresponding elevation rendering.

Do not animate enormous custom shadows merely for decoration on a full-screen transform.

Use theme-aligned surface/elevation behavior whenever it communicates hierarchy sufficiently.

---

# 49. Images and memory

Decoded image memory can dwarf animation-object allocation.

Flutter documents that decoded images are represented in memory at decoded dimensions; very large images can consume tens of megabytes.

For image-heavy transitions:

- request/decode images close to display requirements
- use thumbnails for small source cards
- avoid loading every list item's full-screen image
- reserve image dimensions to avoid layout jumps
- selectively precache highly probable destination images
- avoid pinning many full-resolution images
- inspect Flutter's oversized-image diagnostics
- remember that outgoing and incoming transition trees may coexist.

For Web, do not assume every native image-decoding hint behaves identically; validate current renderer/browser behavior.

---

# 50. Image-heavy `OpenContainer` example

```
import 'dart:async';

import 'package:animations/animations.dart';
import 'package:flutter/material.dart';

class PhotoSummary {
  const PhotoSummary({
    required this.id,
    required this.thumbnailUrl,
    required this.fullUrl,
  });

  final String id;
  final String thumbnailUrl;
  final String fullUrl;
}

class PhotoCard extends StatelessWidget {
  const PhotoCard({
    required this.photo,
    super.key,
  });

  final PhotoSummary photo;

  @override
  Widget build(BuildContext context) {
    final bool disableMotion = MediaQuery.disableAnimationsOf(context);
    final ImageProvider<Object> fullImage =
        NetworkImage(photo.fullUrl);

    void beginTargetedPrecache() {
      unawaited(
        precacheImage(fullImage, context).catchError(
          (Object error, StackTrace stackTrace) {
            // Image failure is non-fatal. The destination has an error UI.
          },
        ),
      );
    }

    return OpenContainer<void>(
      transitionDuration: disableMotion
          ? Duration.zero
          : const Duration(milliseconds: 300),
      closedElevation: 0,
      openElevation: 0,
      closedColor: Theme.of(context).colorScheme.surface,
      openColor: Theme.of(context).colorScheme.surface,
      tappable: false,
      closedBuilder: (
        BuildContext context,
        VoidCallback openContainer,
      ) {
        return MouseRegion(
          onEnter: (_) => beginTargetedPrecache(),
          child: Listener(
            onPointerDown: (_) => beginTargetedPrecache(),
            child: InkWell(
              onTap: openContainer,
              child: SizedBox(
                width: 160,
                height: 120,
                child: Image.network(
                  photo.thumbnailUrl,
                  fit: BoxFit.cover,
                  cacheWidth: 320,
                  cacheHeight: 240,
                  errorBuilder: (
                    BuildContext context,
                    Object error,
                    StackTrace? stackTrace,
                  ) {
                    return const Center(
                      child: Icon(Icons.broken_image_outlined),
                    );
                  },
                ),
              ),
            ),
          ),
        );
      },
      openBuilder: (
        BuildContext context,
        CloseContainerActionCallback<void> closeContainer,
      ) {
        return PhotoDetailsPage(
          photoId: photo.id,
          imageProvider: fullImage,
        );
      },
    );
  }
}

class PhotoDetailsPage extends StatelessWidget {
  const PhotoDetailsPage({
    required this.photoId,
    required this.imageProvider,
    super.key,
  });

  final String photoId;
  final ImageProvider<Object> imageProvider;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Photo $photoId')),
      body: Center(
        child: Image(
          image: imageProvider,
          fit: BoxFit.contain,
          errorBuilder: (
            BuildContext context,
            Object error,
            StackTrace? stackTrace,
          ) {
            return const Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Icon(Icons.broken_image_outlined, size: 48),
                SizedBox(height: 8),
                Text('Image unavailable'),
              ],
            );
          },
        ),
      ),
    );
  }
}

```

The prefetch is opportunistic and does not block navigation.

Do **not** eagerly prefetch every full-resolution photo in a long list.

---

# 51. Async destination data

Do not put this in a transition builder:

```
transitionBuilder: (...) {
  repository.fetchProduct();
  return ...;
}

```

Builders can execute repeatedly and should remain side-effect free.

Instead:

```
route/state becomes product 42
        ↓
destination state starts/observes data request
        ↓
animation proceeds
        ↓
destination renders loading/data/error

```

Animation latency and network latency are different problems.

---

# 52. Bad versus improved replacement design

## Bad

```
PageTransitionSwitcher(
  child: ProductPane(
    key: UniqueKey(),
    future: repository.loadProduct(productId),
  ),
  transitionBuilder: (
    Widget child,
    Animation<double> primary,
    Animation<double> secondary,
  ) {
    return FadeThroughTransition(
      animation: primary,
      secondaryAnimation: secondary,
      child: child,
    );
  },
);

```

Problems:

```
UniqueKey changes every build
network operation can be recreated during rebuild
state identity becomes unstable
transitions may be forced when semantic identity did not change

```

## Improved

```
class ProductPaneHost extends StatefulWidget {
  const ProductPaneHost({
    required this.productId,
    required this.loadProduct,
    super.key,
  });

  final String productId;
  final Future<ProductData> Function(String id) loadProduct;

  @override
  State<ProductPaneHost> createState() =>
      _ProductPaneHostState();
}

class _ProductPaneHostState extends State<ProductPaneHost> {
  late Future<ProductData> _productFuture;

  @override
  void initState() {
    super.initState();
    _productFuture = widget.loadProduct(widget.productId);
  }

  @override
  void didUpdateWidget(ProductPaneHost oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.productId != widget.productId) {
      _productFuture = widget.loadProduct(widget.productId);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool disableMotion =
        MediaQuery.disableAnimationsOf(context);

    return PageTransitionSwitcher(
      duration: disableMotion
          ? Duration.zero
          : const Duration(milliseconds: 300),
      transitionBuilder: (
        Widget child,
        Animation<double> primary,
        Animation<double> secondary,
      ) {
        return FadeThroughTransition(
          animation: primary,
          secondaryAnimation: secondary,
          child: child,
        );
      },
      child: FutureBuilder<ProductData>(
        key: ValueKey<String>(widget.productId),
        future: _productFuture,
        builder: (
          BuildContext context,
          AsyncSnapshot<ProductData> snapshot,
        ) {
          if (snapshot.hasError) {
            return const Center(
              child: Text('Unable to load product'),
            );
          }

          final ProductData? product = snapshot.data;

          if (product == null) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          return ProductPane(product: product);
        },
      ),
    );
  }
}

class ProductData {
  const ProductData({
    required this.id,
    required this.name,
  });

  final String id;
  final String name;
}

class ProductPane extends StatelessWidget {
  const ProductPane({
    required this.product,
    super.key,
  });

  final ProductData product;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Text(
        product.name,
        style: Theme.of(context).textTheme.headlineMedium,
      ),
    );
  }
}

```

Now semantic ID changes trigger the state transition, while repeated builds for the same ID do not restart the load.

---

# 53. Deliberately reject `animations` when built-in Flutter is simpler

For a small text status update, `AnimatedSwitcher` is clearer:

```
import 'package:flutter/material.dart';

class SaveStatus extends StatelessWidget {
  const SaveStatus({
    required this.saved,
    super.key,
  });

  final bool saved;

  @override
  Widget build(BuildContext context) {
    final bool disableMotion = MediaQuery.disableAnimationsOf(context);

    return AnimatedSwitcher(
      duration: disableMotion
          ? Duration.zero
          : const Duration(milliseconds: 160),
      child: Text(
        saved ? 'Saved' : 'Unsaved',
        key: ValueKey<bool>(saved),
      ),
    );
  }
}

```

No container continuity, shared spatial axis, hierarchy, or fade-through semantic relationship exists.

Adding `PageTransitionSwitcher` here would add conceptual complexity without useful information.

---

# 54. `const` correctly understood

Use `const` for genuinely immutable widget descriptions.

Benefits can include:

- fewer allocations
- easier identity reuse
- reduced widget update work.

It does not automatically eliminate:

```
layout
paint
rasterization
clip cost
shadow cost
image decode
compositing

```

during a transition.

Do not respond to raster jank by mechanically adding `const` everywhere.

---

# 55. Large lists and slivers

For list → detail motion:

- keep list virtualization intact
- animate the selected item, not the entire realized history
- use stable entity IDs
- do not replace a lazy `ListView.builder` with a giant eager `Column` to simplify a transition
- avoid state changes that rebuild every visible list item when one item opens
- avoid full-resolution image decoding for every list item.

Flutter's performance guidance recommends lazy builders for large collections.

---

# 56. Platform views

Maps, WebViews, videos, and other platform-backed surfaces can have platform-specific composition constraints.

Treat transitions involving them as high-risk for:

```
clipping
opacity
transform
snapshot behavior
memory
input synchronization

```

Do not assume a platform view will behave identically to a pure Flutter `Container`.

If an `OpenContainer` destination is a map/video/WebView:

- profile every target platform
- consider transitioning a lightweight preview and creating the platform view after arrival
- avoid maintaining duplicate active platform surfaces unless required.

---

