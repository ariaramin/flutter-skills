# Routing & URL Fundamentals

## Contents

- [go_router Engineering Skill for Flutter](#gorouter-engineering-skill-for-flutter)
  - [Purpose](#purpose)
    - [Evidence terminology](#evidence-terminology)
  - [When to Use This Skill](#when-to-use-this-skill)
- [When NOT to Use go_router](#when-not-to-use-gorouter)
- [Core Principles](#core-principles)
- [Mental Model](#mental-model)
- [Router Setup](#router-setup)
  - [Router ownership](#router-ownership)
- [Route Tree Design](#route-tree-design)
  - [Root route](#root-route)
  - [Child route](#child-route)
  - [Shell route](#shell-route)
  - [Avoid accidental nesting](#avoid-accidental-nesting)
- [Paths](#paths)
  - [Prefer canonical path style](#prefer-canonical-path-style)
  - [Case sensitivity](#case-sensitivity)
  - [Trailing slashes](#trailing-slashes)
- [GoRoute](#goroute)
- [Path Parameters](#path-parameters)
  - [String ID](#string-id)
  - [Numeric ID](#numeric-id)
  - [Prefer typed routes for pervasive type conversion](#prefer-typed-routes-for-pervasive-type-conversion)
- [Query Parameters](#query-parameters)
  - [Put state in the URL when it should survive](#put-state-in-the-url-when-it-should-survive)
  - [Keep state outside the URL when it is](#keep-state-outside-the-url-when-it-is)
  - [Construct URLs safely](#construct-urls-safely)
- [`extra`](#extra)
  - [Use `extra` for](#use-extra-for)
  - [Do not use `extra` as the only source for](#do-not-use-extra-as-the-only-source-for)
  - [Robust pattern](#robust-pattern)
- [Named Routes](#named-routes)
  - [Use names when](#use-names-when)
  - [Prefer typed routes when](#prefer-typed-routes-when)
  - [Do not require names everywhere](#do-not-require-names-everywhere)
- [Navigation Methods](#navigation-methods)
  - [`go`](#go)
  - [`push`](#push)
  - [`replace`](#replace)
  - [`pushReplacement`](#pushreplacement)
- [Browser History](#browser-history)
  - [Web rule](#web-rule)
  - [`Router.neglect`](#routerneglect)
- [Deep Linking](#deep-linking)
  - [Good deep-link screen](#good-deep-link-screen)
  - [Deep-linkable data](#deep-linkable-data)
  - [Android](#android)
  - [iOS](#ios)
  - [Validation](#validation)
- [Web Routing](#web-routing)
  - [Hash strategy](#hash-strategy)
  - [Path strategy](#path-strategy)
  - [Hosting under a subpath](#hosting-under-a-subpath)
  - [Important boundary](#important-boundary)

---

# go_router Engineering Skill for Flutter

## Purpose

Use this skill to design, implement, review, debug, secure, test, migrate, and optimize production Flutter navigation built with `go_router`.

Apply these instructions to:

- design stable route trees and public URLs;
- select `GoRoute`, `ShellRoute`, or `StatefulShellRoute`;
- implement nested and parallel navigation stacks;
- build bottom-navigation/tab architectures;
- implement authentication redirects and navigation guards;
- support Android/iOS deep links and Flutter Web URLs;
- handle path/query parameters safely;
- decide when `extra` is appropriate;
- use `go`, `push`, `replace`, `pushReplacement`, and `pop` correctly;
- integrate routing with Bloc/Cubit/Riverpod and dependency injection;
- add page transitions;
- control root/shell/branch navigator ownership;
- implement error and not-found experiences;
- preserve navigation state and state restoration;
- use typed route generation where justified;
- test direct route entry, redirects, shell stacks, back navigation, and web behavior;
- migrate old `Navigator`, old `go_router`, and deprecated routing code without breaking external URLs.

This skill targets current `go_router` **17.4.0**, published by `flutter.dev`, with Dart 3.10 as its minimum Dart SDK. Current first-party typed-routing generation is provided by `go_router_builder`, currently in the 4.4.x line. `go_router` is considered feature-complete by its maintainers, with current focus primarily on stability and bug fixes.

The scope follows the supplied production navigation requirements.

### Evidence terminology

Interpret rules using these labels:

- **go_router behavior** — documented or source-defined behavior of current `go_router`.
- **Flutter Router/Navigator behavior** — behavior provided by Flutter itself.
- **Official recommendation** — guidance explicitly stated in first-party Flutter/go_router documentation.
- **Architecture recommendation** — production guidance inferred from documented behavior.
- **General navigation/security practice** — broader application architecture guidance rather than a package guarantee.

Do not present architectural inference as an official package requirement.

---

## When to Use This Skill

Apply this skill when:

- adding a new routable screen;
- creating a route tree;
- implementing authentication routing;
- adding deep links;
- implementing notification-driven navigation;
- adding Flutter Web URL support;
- adding path/query parameters;
- deciding between `go` and `push`;
- implementing nested routes;
- adding persistent application chrome;
- building tabs or bottom navigation;
- adding `ShellRoute`;
- adding `StatefulShellRoute`;
- targeting a route above a shell;
- adding custom page transitions;
- implementing route-driven dialogs/full-screen flows;
- debugging redirect loops;
- debugging browser back/forward;
- fixing deep links;
- adding route analytics;
- introducing typed routes;
- adding state restoration;
- refactoring imperative `Navigator` code;
- reviewing route security;
- upgrading `go_router`.

---

# When NOT to Use go_router

`go_router` is not mandatory for every Flutter app.

Flutter's official navigation guidance recommends `Router`-based solutions such as `go_router` for applications with advanced deep-linking, browser URL synchronization, or multiple Navigators. Small applications without complex deep linking can use ordinary `Navigator` APIs.

| Situation | Preferred approach |
|---|---|
| Two-screen mobile utility, no deep links | Plain `Navigator` may be enough |
| Simple temporary modal/dialog | `showDialog` / `showModalBottomSheet` |
| Simple one-off pushed page not externally addressable | `Navigator.push` can be acceptable |
| Web/deep-link-first application | Prefer `go_router` |
| Multiple nested Navigators | Prefer `go_router` |
| Bottom tabs with independent stacks | `StatefulShellRoute` |
| Need direct URLs to most screens | `go_router` |
| Need browser back/forward synchronization | `go_router` / Router API |
| Need total custom RouterDelegate behavior | Raw Router/Navigator 2 APIs may be justified |
| Highly dynamic custom navigation engine | Evaluate whether lower-level Router APIs fit better |

Do not introduce a route framework merely to replace:

```dart
Navigator.of(context).push(
  MaterialPageRoute<void>(
    builder: (_) => const AboutPage(),
  ),
);
```

in an application that has no URL/deep-link/navigation-state requirements.

---

# Core Principles

1. **Treat externally visible URLs as compatibility contracts.**
2. **Create one stable router instance and reuse it.**
3. **Keep route builders predictable and cheap.**
4. **Centralize global authentication redirect policy.**
5. **Use `go` for canonical location changes.**
6. **Use `push` when stack/history semantics are intentional.**
7. **Do not use `extra` as the sole source of route-critical deep-linkable state.**
8. **Validate path and query parameters at the route boundary.**
9. **Never put confidential tokens or secrets into ordinary URLs unless an external protocol explicitly requires it and the risk is understood.**
10. **Keep business/state-management layers independent of `BuildContext`.**
11. **Do not inject or store `BuildContext`.**
12. **Do not make every Bloc/Cubit aware of `GoRouter`.**
13. **Use `ShellRoute` for one nested navigation stack under persistent chrome.**
14. **Use `StatefulShellRoute` when branches require independent Navigator stacks.**
15. **Do not use `StatefulShellRoute` merely because the UI has tabs.**
16. **Use navigator keys only to express real Navigator ownership.**
17. **Keep navigator keys stable for the router lifetime.**
18. **Design important routes so direct external entry works.**
19. **Do not require users to have visited another screen before a deep-linked screen works.**
20. **Keep redirects deterministic and based on already-available application state.**
21. **Avoid network calls during every redirect evaluation.**
22. **Distinguish navigation errors from resource/network/domain errors.**
23. **Use current Flutter `PopScope`, not deprecated `WillPopScope`, for page-level back interception.**
24. **Test direct URLs, not only button navigation.**
25. **Check migration notes before every major `go_router` upgrade.**

---

# Mental Model

Use this model:

```text
External URL / app navigation request
                ↓
         RouteInformation
                ↓
         Route matching
                ↓
            onEnter
                ↓
      top-level redirect
                ↓
       route-level redirect
                ↓
     Navigator selection
  root / shell / branch
                ↓
          Page creation
                ↓
       Navigator stack(s)
                ↓
 system back / app back / browser history
```

Current `GoRouter` processes a navigation guard through `onEnter` first, then the top-level `redirect`, then route-level `GoRoute.redirect`. `onEnter` can return `Allow` or `Block`; redirect callbacks return either a new location or `null`.

Flutter's `Router` listens to route information from the operating system/browser, parses it, and configures `Page` objects in a `Navigator`. `go_router` is a convenience layer over that Router architecture.

---

# Router Setup

Prefer a long-lived router configuration.

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

final GoRouter appRouter = GoRouter(
  routes: <RouteBase>[
    GoRoute(
      path: '/',
      builder: (BuildContext context, GoRouterState state) {
        return const HomePage();
      },
    ),
    GoRoute(
      path: '/settings',
      builder: (BuildContext context, GoRouterState state) {
        return const SettingsPage();
      },
    ),
  ],
  errorBuilder: (
    BuildContext context,
    GoRouterState state,
  ) {
    return RouteErrorPage(
      requestedUri: state.uri,
    );
  },
);

void main() {
  runApp(
    MaterialApp.router(
      routerConfig: appRouter,
    ),
  );
}

final class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
      ),
      body: Center(
        child: FilledButton(
          onPressed: () {
            context.go('/settings');
          },
          child: const Text('Settings'),
        ),
      ),
    );
  }
}

final class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
    );
  }
}

final class RouteErrorPage extends StatelessWidget {
  const RouteErrorPage({
    super.key,
    required this.requestedUri,
  });

  final Uri requestedUri;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(),
      body: Center(
        child: Text(
          'The requested page could not be found.',
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}
```

First-party examples create the `GoRouter` as a stable configuration and pass it to `MaterialApp.router(routerConfig: ...)`.

## Router ownership

**Architecture recommendation:** create the router:

- at application bootstrap;
- in an application routing/composition object;
- or as a long-lived DI-managed instance.

Do not recreate it whenever authentication state, theme state, or a page widget rebuilds.

A `GoRouter` owns resources and exposes `dispose()`. Reconstructing it can also replace RouterDelegate/RouteInformationProvider state, navigator keys, stacks, and current routing context.

---

# Route Tree Design

Model the URL and navigation hierarchy together.

Good:

```text
/
├── login
├── products
│   └── :productId
├── users
│   └── :userId
└── settings
    ├── profile
    └── security
```

Corresponding configuration:

```dart
final routes = <RouteBase>[
  GoRoute(
    path: '/',
    builder: (_, __) => const HomePage(),
  ),
  GoRoute(
    path: '/products',
    builder: (_, __) => const ProductListPage(),
    routes: <RouteBase>[
      GoRoute(
        path: ':productId',
        builder: (
          BuildContext context,
          GoRouterState state,
        ) {
          return ProductPage(
            productId: state.pathParameters['productId']!,
          );
        },
      ),
    ],
  ),
  GoRoute(
    path: '/settings',
    builder: (_, __) => const SettingsPage(),
    routes: <RouteBase>[
      GoRoute(
        path: 'security',
        builder: (_, __) {
          return const SecuritySettingsPage();
        },
      ),
    ],
  ),
];
```

A child route can result in multiple pages being displayed in the same Navigator, analogous to the parent page plus another page above it.

## Root route

Use a top-level route when:

- it is a primary application entry point;
- it does not logically require another page below it;
- it exists outside persistent shell chrome;
- it represents authentication/onboarding/global flows.

## Child route

Use a child when:

- its parent page belongs underneath it in the Navigator stack;
- URL hierarchy has semantic meaning;
- back should naturally expose the parent page.

## Shell route

Use a shell when a set of destinations share persistent chrome and a nested Navigator.

## Avoid accidental nesting

Do not nest merely because source files are nested.

The route tree should describe:

- user-visible hierarchy;
- Navigator ownership;
- URL hierarchy.

---

# Paths

Current `GoRoute` uses URI path templates, with path variables prefixed by `:`. `GoRouterState.pathParameters` contains parsed values. Query data is available through `state.uri`.

Example:

```text
/users/:userId
/orders/:orderId
```

## Prefer canonical path style

Architecture convention:

```text
top-level:
  /products

child:
  :productId
```

Although recent `go_router` versions relaxed whether root/child paths must begin with `/`, consistent root-absolute/child-relative style makes hierarchy easier to review. The package also supports explicit relative location navigation with `./` in current versions.

## Case sensitivity

Current route matching is case-sensitive by default. `GoRoute` exposes `caseSensitive`, defaulting to `true`; typed routes also expose case sensitivity. The package made URL case sensitivity a breaking behavior change in the 15/16 generation.

Prefer one canonical URL casing:

```text
/settings/security
```

not both:

```text
/settings/security
/Settings/Security
```

## Trailing slashes

Current route configuration normalizes URIs, including trailing slash normalization. Do not design two resources whose only distinction is a trailing slash.

---

# GoRoute

Use `GoRoute` for ordinary page destinations.

Current constructor supports:

- `path`;
- optional `name`;
- `builder`;
- `pageBuilder`;
- `parentNavigatorKey`;
- `redirect`;
- `onExit`;
- `caseSensitive`;
- nested routes.

Use `builder` by default:

```dart
GoRoute(
  path: '/about',
  builder: (
    BuildContext context,
    GoRouterState state,
  ) {
    return const AboutPage();
  },
);
```

Use `pageBuilder` only when page-level configuration is required.

---

# Path Parameters

Path parameters are external input.

Do not let an unvalidated `String` automatically become trusted domain state.

## String ID

```dart
GoRoute(
  path: '/products/:productId',
  builder: (
    BuildContext context,
    GoRouterState state,
  ) {
    final productId =
        state.pathParameters['productId'];

    if (productId == null ||
        productId.isEmpty ||
        productId.length > 128) {
      return const InvalidRouteParameterPage();
    }

    return ProductPage(
      productId: productId,
    );
  },
);
```

## Numeric ID

```dart
GoRoute(
  path: '/orders/:orderId',
  builder: (
    BuildContext context,
    GoRouterState state,
  ) {
    final raw =
        state.pathParameters['orderId'];
    final orderId =
        int.tryParse(raw ?? '');

    if (orderId == null || orderId <= 0) {
      return const InvalidRouteParameterPage();
    }

    return OrderPage(
      orderId: orderId,
    );
  },
);
```

## Prefer typed routes for pervasive type conversion

If an application has many numeric, enum, extension-type, or custom-encoded route parameters, `go_router_builder` can move conversion errors toward compile time.

---

# Query Parameters

Use query parameters for optional, externally reproducible URL state.

Good:

```text
/search?q=flutter
/products?sort=price
/orders?page=2
/users?role=admin
```

Read through `state.uri`:

```dart
GoRoute(
  path: '/search',
  builder: (
    BuildContext context,
    GoRouterState state,
  ) {
    final query =
        state.uri.queryParameters['q']?.trim() ?? '';

    final page = int.tryParse(
          state.uri.queryParameters['page'] ?? '',
        ) ??
        1;

    return SearchPage(
      query: query,
      page: page.clamp(1, 1000),
    );
  },
);
```

Current `GoRouterState` exposes the full `Uri`, path parameters, matched location, full path, route name, extra data, page key, and top route.

## Put state in the URL when it should survive

- refresh;
- copy/paste;
- bookmarking;
- deep linking;
- browser back/forward;
- notification links.

## Keep state outside the URL when it is

- ephemeral animation state;
- scroll offset;
- unsaved sensitive form input;
- large objects;
- confidential session state.

## Construct URLs safely

Prefer Dart's `Uri` APIs:

```dart
final location = Uri(
  pathSegments: <String>[
    'search',
  ],
  queryParameters: <String, String>{
    'q': query,
    'sort': sort,
  },
).toString();

context.go(location);
```

Using `Uri` avoids ad-hoc query escaping.

---

# `extra`

`extra` is an arbitrary object attached to a navigation event.

```dart
context.push(
  '/preview',
  extra: previewModel,
);
```

Read:

```dart
final preview =
    state.extra as PreviewModel?;
```

Current `go_router` can serialize extra data into browser history state. For complex objects, `GoRouter.extraCodec` can provide serialization; otherwise complex data can be dropped during browser serialization.

## Use `extra` for

- an optimization copy of already-identifiable data;
- transient non-URL information;
- return-channel-like ephemeral navigation state;
- objects where direct external reproduction is explicitly unnecessary.

## Do not use `extra` as the only source for

- resource ID;
- product ID;
- user ID;
- search query;
- checkout session identifier that must survive a link;
- route-critical state required after external launch.

Typed-routing documentation explicitly warns that `$extra` remains outside the location and is unsuitable as the basis for dynamic/deep linking.

## Robust pattern

```text
/products/42

path parameter:
  42

extra:
  optional already-loaded Product object
```

Builder:

```dart
final id =
    state.pathParameters['productId']!;

final prefetched =
    state.extra as Product?;

return ProductPage(
  productId: id,
  prefetchedProduct:
      prefetched?.id == id
          ? prefetched
          : null,
);
```

If `extra` disappears, the route still works.

---

# Named Routes

A `GoRoute` can have a unique name.

```dart
GoRoute(
  name: 'productDetails',
  path: '/products/:productId',
  builder: (
    BuildContext context,
    GoRouterState state,
  ) {
    return ProductPage(
      productId:
          state.pathParameters['productId']!,
    );
  },
);
```

Navigate:

```dart
context.goNamed(
  'productDetails',
  pathParameters: const <String, String>{
    'productId': '42',
  },
);
```

Generate location:

```dart
final location =
    context.namedLocation(
  'productDetails',
  pathParameters: const <String, String>{
    'productId': '42',
  },
);
```

These are current first-party APIs.

## Use names when

- callers should not depend directly on path strings;
- redirect code frequently builds destinations;
- routes are referenced broadly.

## Prefer typed routes when

the application already accepts code generation and wants compile-time parameter safety.

## Do not require names everywhere

A small internal route:

```dart
context.go('/privacy');
```

can be perfectly maintainable.

---

# Navigation Methods

Current `GoRouter` provides `go`, `push`, `replace`, `pushReplacement`, `pop`, named variants, `canPop`, and `refresh`.

| Intent | API | Stack behavior |
|---|---|---|
| Navigate to canonical app location | `go` | Rebuild configured stack for destination |
| Add route above current stack | `push` | Pushes page |
| Return | `pop` | Pops top route |
| Replace top but keep same page identity | `replace` | Replaces while preserving page key |
| Replace top with new page identity | `pushReplacement` | Replaces top page |
| Ask whether router can pop | `canPop` | Boolean |
| Named canonical navigation | `goNamed` | `go` semantics |
| Named stack push | `pushNamed` | `push` semantics |

## `go`

Official navigation docs define `go` as direct destination navigation: the current stack is replaced with the screens configured for that destination.

Use:

```dart
context.go('/home');
```

for:

- switching canonical application sections;
- login → app;
- deep-link-style navigation;
- filter URL change where prior page should not stack;
- tab destinations addressed as canonical URLs.

## `push`

Use when the destination should be added above the existing history:

```dart
final result =
    await context.push<bool>(
  '/products/42/edit',
);
```

Then:

```dart
context.pop(true);
```

`push` returns a Future that completes with the result supplied by `pop`.

Good:

```text
product list
→ push product details
→ push edit
→ pop edit
→ product details remains
```

## `replace`

Current `replace` replaces the top page but treats it as the same page, preserving the page key.

Use selectively for state/location variations where page identity should remain:

```dart
context.replace(
  Uri(
    path: '/search',
    queryParameters: <String, String>{
      'q': query,
    },
  ).toString(),
);
```

## `pushReplacement`

Use when top-page history should disappear and the new page should have new identity.

Example:

```text
temporary confirmation
→ pushReplacement receipt
```

Do not confuse it with `replace`.

---

# Browser History

Browser semantics deserve separate design.

Official `go_router` navigation documentation warns that imperative navigation (`push`) is known to cause issues with browser history. Since `go_router` 8.0, imperatively pushed `GoRoute`s no longer modify the browser URL by default, and browser back/forward respects imperative operations. A static `GoRouter.optionURLReflectsImperativeAPIs` option exists for URL reflection, but should be enabled only with deliberate testing.

## Web rule

Prefer `go` when the destination should be represented canonically in:

- address bar;
- bookmark;
- reload;
- browser history;
- external sharing.

Use `push` only when stack semantics are actually desired and its browser behavior has been tested.

## `Router.neglect`

To change location without recording browser history:

```dart
Router.neglect(
  context,
  () {
    context.go('/temporary');
  },
);
```

`GoRouter.routerNeglect` can disable history tracking application-wide, but that is a specialized option.

Do not enable `routerNeglect` merely to hide broken history behavior.

---

# Deep Linking

A routable destination should work when entered directly.

Current `go_router` maps platform deep-link URLs to configured screens. Native platform association/setup is handled by Flutter/platform configuration, not by the route table alone.

## Good deep-link screen

`/products/42` should be able to:

1. parse product ID `42`;
2. construct required state-management/repository dependencies;
3. load product `42`;
4. show loading/error/content.

It must not require:

```text
HomePage sets global selectedProduct
↓
ProductPage reads selectedProduct
```

because direct entry bypasses HomePage.

## Deep-linkable data

Encode required identity in:

- path;
- query;
- sometimes fragment.

Do not depend solely on:

- previously populated global state;
- `extra`;
- in-memory selected objects.

## Android

Configure Android app links/intent filters and domain verification separately. Flutter's official app-link cookbook uses `go_router` as the route layer after the link reaches Flutter.

## iOS

Configure associated domains/universal links separately. Flutter's universal-link documentation likewise uses `go_router` once the URL enters the application.

## Validation

Use Flutter DevTools' Deep Links validator for Android/iOS platform configuration where applicable.

---

# Web Routing

Flutter Web supports:

- hash URLs;
- path URLs.

The default is hash strategy. Path strategy uses browser History API and requires server fallback/rewrite configuration.

## Hash strategy

Example:

```text
https://example.com/#/products/42
```

No SPA path rewrite requirement for the part after `#`.

## Path strategy

Example:

```text
https://example.com/products/42
```

Enable:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_web_plugins/url_strategy.dart';

void main() {
  usePathUrlStrategy();
  runApp(const App());
}
```

Configure `flutter_web_plugins` as an SDK dependency.

The web server must serve the application's `index.html` for SPA route paths. Firebase Hosting, Nginx, CloudFront, Apache, and similar systems require the appropriate rewrite/fallback rule.

## Hosting under a subpath

If hosted under:

```text
https://example.com/flutter_app/
```

configure the appropriate `<base href>` in `web/index.html`.

## Important boundary

A route that works under:

```bash
flutter run -d chrome
```

can still fail after production refresh if the production web server does not rewrite `/products/42` to `index.html`.

That is a hosting configuration failure, not a `GoRoute` matching failure.

---
