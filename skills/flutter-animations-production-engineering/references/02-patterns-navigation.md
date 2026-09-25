# OpenContainer, SharedAxis, FadeThrough, FadeScale, switchers, keys, and navigation integration

Source lines 350–1362 from the supplied research guide.

## Contents

- [11. `OpenContainer`](#11-opencontainer)
  - [Navigation behavior](#navigation-behavior)
  - [Simultaneous subtrees](#simultaneous-subtrees)
  - [`onClosed`](#onclosed)
  - [Programmatic open](#programmatic-open)
- [12. `OpenContainer` production example](#12-opencontainer-production-example)
- [13. `OpenContainer` performance review](#13-opencontainer-performance-review)
- [14. State management with `OpenContainer`](#14-state-management-with-opencontainer)
- [15. `SharedAxisTransition`](#15-sharedaxistransition)
- [16. Shared-axis direction must be semantic](#16-shared-axis-direction-must-be-semantic)
- [17. RTL behavior](#17-rtl-behavior)
- [18. Shared-axis + RTL production example](#18-shared-axis-rtl-production-example)
- [19. `FadeThroughTransition`](#19-fadethroughtransition)
- [20. Fade-through example](#20-fade-through-example)
- [21. `FadeScaleTransition` and `showModal`](#21-fadescaletransition-and-showmodal)
- [22. Fade-scale modal example](#22-fade-scale-modal-example)
- [23. `PageTransitionSwitcher`](#23-pagetransitionswitcher)
- [24. PageTransitionSwitcher vs AnimatedSwitcher](#24-pagetransitionswitcher-vs-animatedswitcher)
- [25. Keys and identity](#25-keys-and-identity)
- [26. OpenContainer vs Hero](#26-opencontainer-vs-hero)
- [27. Navigation integration](#27-navigation-integration)
  - [Navigator-owned application](#navigator-owned-application)
  - [Declarative Router application](#declarative-router-application)
  - [Nested Navigator](#nested-navigator)
- [28. Route-level package transition example](#28-route-level-package-transition-example)
- [29. Material 3 compatibility](#29-material-3-compatibility)
- [30. Durations](#30-durations)

---
<!-- ORIGINAL_SOURCE_START -->

# 11. `OpenContainer`

`OpenContainer` implements a Material container transform. It displays `closedBuilder` while closed; when opened, its container expands to fill its surrounding `Navigator` while the closed content fades out and the `openBuilder` content fades in.

Current important properties include:

```
closedBuilder
openBuilder
closedColor
openColor
middleColor
closedElevation
openElevation
closedShape
openShape
closedShadows
openShadows
clipBehavior
transitionDuration
transitionType
tappable
onClosed
useRootNavigator
routeSettings

```

Current default transition duration is 300 ms. `ContainerTransitionType` supports `fade` and `fadeThrough`.

## Navigation behavior

`OpenContainer` is not merely a visual wrapper. Its state calls:

```
Navigator.of(context, rootNavigator: useRootNavigator).push(...)

```

to push its own route.

This matters.

In a declarative Router application, imperative `Navigator.push()` routes are pageless routes rather than the page-backed state generally used for deep-link/browser-history synchronization. Flutter's navigation guidance recommends Router-based navigation when advanced deep linking and Web address-bar synchronization matter.

Therefore:

> **Do not allow ****`OpenContainer`**** to become the source of truth for a route that must participate in declarative URL/deep-link state.**

For deep-linkable application destinations, preserve the existing routing system and consider `Hero`, a page-backed route transition, or a router-supported custom transition instead.

## Simultaneous subtrees

During an `OpenContainer` transition, both `closedBuilder` and `openBuilder` widgets exist in the tree simultaneously. They therefore cannot contain the same `GlobalKey`.

This also creates a real memory/performance consideration for:

- image-heavy screens
- large lists
- video surfaces
- maps
- platform views.

Do not assume only one representation is alive.

## `onClosed`

Current documentation explicitly says `onClosed` fires at the **start of the closing transition**, not after the visual reverse animation finishes.

Do not write critical logic that assumes:

```
onClosed == animation visually completed

```

Business operations should not depend on the completion of decorative motion anyway.

## Programmatic open

Current `OpenContainerState` is public and exposes `openContainer()`, allowing opening through a `GlobalKey` when a real product interaction needs it.

Do not introduce a global key solely because calling the builder's open action directly is simpler.

---

# 12. `OpenContainer` production example

```
import 'package:animations/animations.dart';
import 'package:flutter/material.dart';

class ProductSummary {
  const ProductSummary({
    required this.id,
    required this.name,
    required this.subtitle,
  });

  final String id;
  final String name;
  final String subtitle;
}

class ProductCard extends StatelessWidget {
  const ProductCard({
    required this.product,
    super.key,
  });

  final ProductSummary product;

  @override
  Widget build(BuildContext context) {
    final ThemeData theme = Theme.of(context);
    final bool disableMotion = MediaQuery.disableAnimationsOf(context);

    return OpenContainer<void>(
      transitionDuration: disableMotion
          ? Duration.zero
          : const Duration(milliseconds: 300),
      transitionType: ContainerTransitionType.fade,
      closedColor: theme.colorScheme.surface,
      openColor: theme.colorScheme.surface,
      closedElevation: 0,
      openElevation: 0,
      closedShape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: theme.colorScheme.outlineVariant),
      ),
      openShape: const RoundedRectangleBorder(),
      tappable: false,
      routeSettings: RouteSettings(
        name: '/products/${product.id}',
        arguments: product.id,
      ),
      closedBuilder: (BuildContext context, VoidCallback openContainer) {
        return InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: openContainer,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: <Widget>[
                const Icon(Icons.inventory_2_outlined),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: <Widget>[
                      Text(
                        product.name,
                        style: theme.textTheme.titleMedium,
                      ),
                      const SizedBox(height: 4),
                      Text(product.subtitle),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
      openBuilder: (
        BuildContext context,
        CloseContainerActionCallback<void> closeContainer,
      ) {
        return ProductDetailsPage(productId: product.id);
      },
    );
  }
}

class ProductDetailsPage extends StatelessWidget {
  const ProductDetailsPage({
    required this.productId,
    super.key,
  });

  final String productId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Product')),
      body: Center(
        child: Text('Product ID: $productId'),
      ),
    );
  }
}

```

Notice that the destination receives a stable ID rather than an enormous mutable domain graph.

For a URL/deep-link-owned product detail screen, use the repository's Router instead of allowing this `OpenContainer` push to represent canonical navigation.

---

# 13. `OpenContainer` performance review

`OpenContainer` is not inherently slow. Cost comes from the content and effects participating in the transform.

Review:

```
source subtree size
destination subtree size
simultaneous decoded images
clip complexity
rounded geometry
large animated shadows
full-screen overdraw
opacity/fade overlap
layout complexity
custom painting
platform views

```

The package itself has historically optimized its internal implementation—for example replacing internal `Opacity` usage with `Visibility`/`FadeTransition` in 2.0.5—showing why generic claims such as “OpenContainer is slow” are not useful.

Prefer measuring the actual screen.

---

# 14. State management with `OpenContainer`

The transition must not become the application architecture.

Good:

```
ProductList state owns IDs/data
        ↓
ProductCard receives ProductSummary
        ↓
OpenContainer expresses visual continuity
        ↓
Details state loads/observes product by ID

```

Avoid:

```
OpenContainer builder
        ↓
starts repository request every rebuild
        ↓
creates duplicate state container
        ↓
copies entire mutable domain graph

```

With Bloc, Riverpod, ChangeNotifier, or `StatefulWidget`, keep business state where it normally belongs. The animation observes that state.

---

# 15. `SharedAxisTransition`

`SharedAxisTransition` communicates a spatial or navigational relationship. Current `SharedAxisTransitionType` values are:

```
SharedAxisTransitionType.horizontal
SharedAxisTransitionType.vertical
SharedAxisTransitionType.scaled

```

The package's official semantics are horizontal onboarding, vertical step progression, and scaled parent-child navigation.

Its widget consumes:

```
animation
secondaryAnimation
transitionType
fillColor
child

```

A route-level `SharedAxisPageTransitionsBuilder` is also available for `PageTransitionsTheme`.

The implementation uses the incoming/secondary route animations rather than requiring application code to maintain a manual controller.

---

# 16. Shared-axis direction must be semantic

Do not reduce direction to:

```
reverse = nextIndex < currentIndex;

```

unless the numeric index actually represents semantic order.

Ask:

```
Is this "forward"?
Is this "back"?
Does physical horizontal direction mirror under RTL?

```

A navigation destination switch between unrelated destinations often has no useful "forward/back" relationship; fade through can be more honest.

---

# 17. RTL behavior

Current horizontal `SharedAxisTransition` implementation uses fixed physical X translation offsets; it does not consult `Directionality` when calculating those offsets.

Therefore automatic RTL mirroring must not be assumed.

Flutter's built-in platform adaptations do mirror some platform-native navigation behavior, including directional iOS navigation conventions, which further reinforces that custom shared-axis direction needs explicit semantic handling.

For a semantically ordered horizontal flow:

```
bool reverseForSemanticDirection({
  required bool movingForward,
  required TextDirection textDirection,
}) {
  return switch (textDirection) {
    TextDirection.ltr => !movingForward,
    TextDirection.rtl => movingForward,
  };
}

```

This maps semantic movement rather than hardcoding left/right coordinates.

---

# 18. Shared-axis + RTL production example

```
import 'package:animations/animations.dart';
import 'package:flutter/material.dart';

class OnboardingFlow extends StatefulWidget {
  const OnboardingFlow({super.key});

  @override
  State<OnboardingFlow> createState() => _OnboardingFlowState();
}

class _OnboardingFlowState extends State<OnboardingFlow> {
  static const List<String> _titles = <String>[
    'Welcome',
    'Choose preferences',
    'Ready',
  ];

  int _currentStep = 0;
  int _previousStep = 0;

  bool _reverseForDirection(TextDirection textDirection) {
    final bool movingForward = _currentStep > _previousStep;

    return switch (textDirection) {
      TextDirection.ltr => !movingForward,
      TextDirection.rtl => movingForward,
    };
  }

  void _moveTo(int nextStep) {
    if (nextStep < 0 || nextStep >= _titles.length) {
      return;
    }

    setState(() {
      _previousStep = _currentStep;
      _currentStep = nextStep;
    });
  }

  @override
  Widget build(BuildContext context) {
    final bool disableMotion = MediaQuery.disableAnimationsOf(context);
    final TextDirection textDirection = Directionality.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Setup')),
      body: Column(
        children: <Widget>[
          Expanded(
            child: PageTransitionSwitcher(
              duration: disableMotion
                  ? Duration.zero
                  : const Duration(milliseconds: 300),
              reverse: _reverseForDirection(textDirection),
              transitionBuilder: (
                Widget child,
                Animation<double> primaryAnimation,
                Animation<double> secondaryAnimation,
              ) {
                return SharedAxisTransition(
                  animation: primaryAnimation,
                  secondaryAnimation: secondaryAnimation,
                  transitionType: SharedAxisTransitionType.horizontal,
                  child: child,
                );
              },
              child: OnboardingStep(
                key: ValueKey<int>(_currentStep),
                number: _currentStep + 1,
                title: _titles[_currentStep],
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: <Widget>[
                TextButton(
                  onPressed: _currentStep == 0
                      ? null
                      : () => _moveTo(_currentStep - 1),
                  child: const Text('Back'),
                ),
                const Spacer(),
                FilledButton(
                  onPressed: _currentStep == _titles.length - 1
                      ? null
                      : () => _moveTo(_currentStep + 1),
                  child: const Text('Next'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class OnboardingStep extends StatelessWidget {
  const OnboardingStep({
    required this.number,
    required this.title,
    super.key,
  });

  final int number;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Semantics(
        header: true,
        child: Text(
          '$number. $title',
          style: Theme.of(context).textTheme.headlineMedium,
        ),
      ),
    );
  }
}

```

The `ValueKey<int>(_currentStep)` expresses semantic page identity. It does not exist merely to force animation.

---

# 19. `FadeThroughTransition`

Fade through is for states without a strong source/destination spatial relationship.

Its sequence differs from a simple crossfade:

1. outgoing content fades away
2. incoming content fades in
3. scale is applied only to incoming content.

The current package API and page-transition builder document this behavior explicitly.

Good candidates:

```
NavigationBar destination changes
account switch
data refresh replacement
peer content sections

```

Bad candidate:

```
specific product card → that product's detail page

```

The latter has strong continuity and is better represented by a container/shared-element strategy.

---

# 20. Fade-through example

```
import 'package:animations/animations.dart';
import 'package:flutter/material.dart';

class DestinationSwitcher extends StatefulWidget {
  const DestinationSwitcher({super.key});

  @override
  State<DestinationSwitcher> createState() => _DestinationSwitcherState();
}

class _DestinationSwitcherState extends State<DestinationSwitcher> {
  int _selectedIndex = 0;

  static const List<Widget> _pages = <Widget>[
    _DestinationPage(
      icon: Icons.home_outlined,
      label: 'Home',
    ),
    _DestinationPage(
      icon: Icons.bookmark_outline,
      label: 'Saved',
    ),
    _DestinationPage(
      icon: Icons.person_outline,
      label: 'Account',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final bool disableMotion = MediaQuery.disableAnimationsOf(context);

    return Scaffold(
      body: PageTransitionSwitcher(
        duration: disableMotion
            ? Duration.zero
            : const Duration(milliseconds: 300),
        transitionBuilder: (
          Widget child,
          Animation<double> primaryAnimation,
          Animation<double> secondaryAnimation,
        ) {
          return FadeThroughTransition(
            animation: primaryAnimation,
            secondaryAnimation: secondaryAnimation,
            child: child,
          );
        },
        child: KeyedSubtree(
          key: ValueKey<int>(_selectedIndex),
          child: _pages[_selectedIndex],
        ),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (int value) {
          if (value == _selectedIndex) {
            return;
          }
          setState(() => _selectedIndex = value);
        },
        destinations: const <NavigationDestination>[
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.bookmark_outline),
            label: 'Saved',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            label: 'Account',
          ),
        ],
      ),
    );
  }
}

class _DestinationPage extends StatelessWidget {
  const _DestinationPage({
    required this.icon,
    required this.label,
  });

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(icon, size: 48),
          const SizedBox(height: 12),
          Text(
            label,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
        ],
      ),
    );
  }
}

```

There is deliberately no forward/reverse ordering because these destinations are peers.

---

# 21. `FadeScaleTransition` and `showModal`

`FadeScaleTransition` represents the Material fade pattern for elements entering/exiting within screen bounds. Current implementation fades and scales incoming content from 80% to 100%, while exiting content fades.

The package also provides:

```
showModal<T>()
FadeScaleTransitionConfiguration
ModalConfiguration

```

`showModal()` pushes a `PopupRoute`, supports root/nearest Navigator selection, returns the `Navigator.pop()` result, supports route settings and an optional image filter, and creates modal semantics around the destination.

Current `FadeScaleTransitionConfiguration` defaults are:

```
barrier: black54
dismissible: true
forward duration: 150 ms
reverse duration: 75 ms
default barrier label: "Dismiss"

```

Do not treat these values as universal product motion tokens. They are this implementation's defaults.

---

# 22. Fade-scale modal example

```
import 'package:animations/animations.dart';
import 'package:flutter/material.dart';

Future<void> showDeleteConfirmation(BuildContext context) async {
  final bool disableMotion = MediaQuery.disableAnimationsOf(context);
  final MaterialLocalizations localizations =
      MaterialLocalizations.of(context);

  final bool? shouldDelete = await showModal<bool>(
    context: context,
    configuration: FadeScaleTransitionConfiguration(
      transitionDuration: disableMotion
          ? Duration.zero
          : const Duration(milliseconds: 150),
      reverseTransitionDuration: disableMotion
          ? Duration.zero
          : const Duration(milliseconds: 75),
      barrierLabel: localizations.modalBarrierDismissLabel,
    ),
    routeSettings: const RouteSettings(
      name: '/confirm-delete',
    ),
    builder: (BuildContext modalContext) {
      return const _DeleteConfirmationCard();
    },
  );

  if (!context.mounted || shouldDelete != true) {
    return;
  }

  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content: Text('Delete confirmed')),
  );
}

class _DeleteConfirmationCard extends StatelessWidget {
  const _DeleteConfirmationCard();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: Material(
          clipBehavior: Clip.antiAlias,
          borderRadius: BorderRadius.circular(24),
          color: Theme.of(context).colorScheme.surface,
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Text(
                  'Delete item?',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 12),
                const Text('This confirmation can be dismissed.'),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: <Widget>[
                    TextButton(
                      onPressed: () =>
                          Navigator.of(context).pop(false),
                      child: const Text('Cancel'),
                    ),
                    const SizedBox(width: 8),
                    FilledButton(
                      onPressed: () =>
                          Navigator.of(context).pop(true),
                      child: const Text('Delete'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

```

The application may still prefer Flutter's normal `showDialog()` if the standard current Material/platform dialog behavior already meets the requirement. Do not replace every dialog merely to use the package.

---

# 23. `PageTransitionSwitcher`

`PageTransitionSwitcher` is similar to `AnimatedSwitcher`, but its transition builder receives both **primary** and **secondary**animations like route transitions.

It has an explicit `reverse` property so application state can express push-like versus pop-like replacement.

Important current behavior:

- same widget type + same key is treated as the same identity
- a changed semantic key causes replacement
- rapid swaps can leave more than one outgoing child transitioning concurrently
- its layout builder controls how current/outgoing entries coexist.

That last point matters for image-heavy or memory-heavy pages.

---

# 24. PageTransitionSwitcher vs AnimatedSwitcher

| Characteristic`PageTransitionSwitcherAnimatedSwitcher` |                                   |                                              |
| ------------------------------------------------------ | --------------------------------- | -------------------------------------------- |
| Incoming animation                                     | Primary                           | Single transition animation                  |
| Outgoing/route-style animation                         | Secondary available               | Transition animation reverses                |
| Explicit semantic reverse                              | Yes                               | No equivalent route-style `reverse` property |
| Child identity                                         | Type + key                        | Type + key                                   |
| Rapid swaps                                            | Multiple outgoing possible        | Multiple outgoing possible                   |
| Best fit                                               | Push/pop-like content replacement | Simple replacement/crossfade                 |
| Complexity                                             | Medium                            | Low                                          |

Flutter's `AnimatedSwitcher` likewise keeps multiple outgoing children when changes occur faster than its duration, and only transitions when widget identity actually changes.

Choose `AnimatedSwitcher` unless the package's route-like primary/secondary semantics are useful.

---

# 25. Keys and identity

Keys express identity.

Correct:

```
ValueKey<String>(conversation.id)
ValueKey<int>(stepIndex)
ValueKey<AccountId>(account.id)

```

Incorrect:

```
UniqueKey()

```

on every build just to force a transition.

With continuously changing `UniqueKey()`:

- Flutter sees a brand-new identity every build
- state can reset
- transitions can repeatedly restart
- outgoing entries can accumulate during rapid rebuilds.

The framework's own `AnimatedSwitcher` documentation explicitly recommends a meaningful `ValueKey` based on data that distinguishes one child from another.

Use the same principle with `PageTransitionSwitcher`.

---

# 26. OpenContainer vs Hero

| Concern`OpenContainerHero` |                                         |                                                |
| -------------------------- | --------------------------------------- | ---------------------------------------------- |
| Conceptual unit            | Entire container → destination          | Shared visual element                          |
| Route ownership            | Pushes its own route                    | Existing `PageRoute` navigation                |
| Identity mechanism         | Closed/open builders                    | Matching `Hero.tag`                            |
| Visual model               | Shape/color/elevation/container morph   | Shared element flies through Navigator overlay |
| Good fit                   | Card/list item is destination container | One image/avatar/object visually persists      |
| Router compatibility       | Must account for its imperative push    | Fits routes already owned by Navigator/Router  |
| Layout constraints         | Both trees coexist                      | Hero must support hero-flight geometry         |
| Complexity                 | Lower for package pattern               | Lower when only one shared element matters     |

Flutter `Hero` pairs matching tags across routes and moves the shared subtree through the Navigator overlay. Heroes must exist on the destination's first route frame, tags must be unique per route, and hero flight geometry has axis-alignment requirements.

Use `Hero` when route ownership already exists and **one element** needs continuity.

Use `OpenContainer` when the **container itself** becomes the destination and its internal route ownership is appropriate.

Do not combine them casually. Two simultaneous continuity systems can compete visually and add unnecessary layout/raster complexity.

---

# 27. Navigation integration

Animation must preserve navigation semantics.

Flutter distinguishes simple `Navigator` route stacks from Router-based declarative navigation used for sophisticated deep-link and browser-history requirements.

Therefore:

## Navigator-owned application

Package route builders can be applied through `PageTransitionsTheme`.

## Declarative Router application

Preserve:

```
route/path
back stack
URL
deep-link state
restoration

```

as the source of truth.

Attach visual transitions through the router's page/route mechanism rather than replacing navigation with a local `OpenContainer` push.

## Nested Navigator

Verify which Navigator receives the route.

`OpenContainer` exposes `useRootNavigator`; `showModal` defaults to the root navigator.

Do not guess.

---

# 28. Route-level package transition example

Use global/scoped route transitions only when deliberately replacing platform defaults.

```
import 'package:animations/animations.dart';
import 'package:flutter/material.dart';

class MotionNavigationApp extends StatelessWidget {
  const MotionNavigationApp({super.key});

  @override
  Widget build(BuildContext context) {
    const FadeThroughPageTransitionsBuilder transitionBuilder =
        FadeThroughPageTransitionsBuilder();

    return MaterialApp(
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
        pageTransitionsTheme: const PageTransitionsTheme(
          builders: <TargetPlatform, PageTransitionsBuilder>{
            TargetPlatform.android: transitionBuilder,
            TargetPlatform.iOS: transitionBuilder,
            TargetPlatform.linux: transitionBuilder,
            TargetPlatform.macOS: transitionBuilder,
            TargetPlatform.windows: transitionBuilder,
            TargetPlatform.fuchsia: transitionBuilder,
          },
        ),
      ),
      home: const MotionHomePage(),
    );
  }
}

class MotionHomePage extends StatelessWidget {
  const MotionHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Home')),
      body: Center(
        child: FilledButton(
          onPressed: () {
            Navigator.of(context).push(
              MaterialPageRoute<void>(
                builder: (BuildContext context) =>
                    const MotionDestinationPage(),
              ),
            );
          },
          child: const Text('Open destination'),
        ),
      ),
    );
  }
}

class MotionDestinationPage extends StatelessWidget {
  const MotionDestinationPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Destination')),
      body: const Center(child: Text('Destination')),
    );
  }
}

```

`FadeThroughPageTransitionsBuilder` is officially designed for `PageTransitionsTheme` / `MaterialPageRoute`.

However, a global override also replaces Flutter's platform-default page motion.

Current Flutter includes platform-specific transition behavior such as predictive-back-aware Android builders and platform-adapted iOS navigation.

Therefore:

> **Do not globally replace route transitions unless the product intentionally wants that behavior and back gestures have been tested on real target platforms.**

---

# 29. Material 3 compatibility

Flutter has used Material 3 by default since Flutter 3.16.

The `animations` package remains an official Flutter package exposing its four Material motion patterns, but it must not be interpreted as a universal replacement for every newer Flutter/Material route transition.

Current Flutter's own page-transition APIs continue to evolve—for example around predictive back and newer Material transitions.

Therefore:

- continue using package patterns where their **semantic motion model fits**
- do not assume installing `animations` means every route should use classic package motion
- preserve modern Flutter's platform-default route behavior when it is desirable
- verify the repository's Material 3 design system before copying package-example colors/elevations.

---

# 30. Durations

Do not invent a universal:

```
all animations = 300 ms

```

Current package defaults differ by component:

- `OpenContainer`: 300 ms.
- `PageTransitionSwitcher`: 300 ms.
- fade-scale modal: 150 ms enter / 75 ms reverse.

Those are package defaults, not universal UX laws.

Customize duration only when:

- the design system explicitly specifies it
- interaction frequency makes the default feel blocking
- a larger/smaller spatial transition genuinely needs different pacing
- platform-specific product research supports it.

Never lengthen navigation just to make animation more visible.

---

