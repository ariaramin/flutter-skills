# Pages, Restoration, Typed Routes & Security

## Contents

- [Page Builders](#page-builders)
  - [`builder`](#builder)
  - [`pageBuilder`](#pagebuilder)
- [Page Identity](#page-identity)
  - [Why identity matters](#why-identity-matters)
- [Transitions](#transitions)
  - [Transition rules](#transition-rules)
- [Modals and Dialogs](#modals-and-dialogs)
- [Back Navigation](#back-navigation)
  - [Do not globally replace system back](#do-not-globally-replace-system-back)
- [Pop Interception](#pop-interception)
  - [Dirty form](#dirty-form)
  - [`GoRoute.onExit`](#gorouteonexit)
- [Error Handling](#error-handling)
  - [Programming/configuration errors](#programmingconfiguration-errors)
  - [User/request routing exceptions](#userrequest-routing-exceptions)
  - [Simple production error page](#simple-production-error-page)
- [404 / Not Found](#404-not-found)
  - [Router 404](#router-404)
  - [Resource 404](#resource-404)
  - [Forbidden](#forbidden)
  - [Network failure](#network-failure)
- [Route-Level Loading](#route-level-loading)
- [Async Navigation Decisions](#async-navigation-decisions)
- [Initial Location](#initial-location)
- [State Restoration](#state-restoration)
  - [Top-level restoration](#top-level-restoration)
  - [GoRoute](#goroute)
  - [ShellRoute](#shellroute)
  - [StatefulShellRoute](#statefulshellroute)
- [Typed Routes](#typed-routes)
  - [Example](#example)
  - [Type conversion](#type-conversion)
  - [Typed `$extra`](#typed-extra)
- [Typed Stateful Shell Routes](#typed-stateful-shell-routes)
- [Code Generation](#code-generation)
  - [Do not manually edit generated routing code](#do-not-manually-edit-generated-routing-code)
  - [CI](#ci)
- [Refresh / Route Re-evaluation](#refresh-route-re-evaluation)
  - [Avoid](#avoid)
  - [`refreshListenable` adapter](#refreshlistenable-adapter)
- [Dependency Injection](#dependency-injection)
- [Navigation Observers](#navigation-observers)
  - [Analytics implication](#analytics-implication)
- [Analytics](#analytics)
- [URL Stability](#url-stability)
- [Notifications and Deep Links](#notifications-and-deep-links)
- [Cross-Feature Navigation](#cross-feature-navigation)
- [Security](#security)
  - [Validate path/query parameters](#validate-pathquery-parameters)
  - [Do not put secrets in URLs](#do-not-put-secrets-in-urls)
  - [Auth guard is not authorization](#auth-guard-is-not-authorization)
  - [Return URL validation](#return-url-validation)
  - [Analytics](#analytics)
- [Performance](#performance)
- [Router Recreation](#router-recreation)
- [Redirect Performance](#redirect-performance)
- [Dynamic RoutingConfig](#dynamic-routingconfig)
- [Large Applications](#large-applications)
- [Imperative Navigator Interop](#imperative-navigator-interop)

---

# Page Builders

## `builder`

Use by default:

```dart
GoRoute(
  path: '/details',
  builder: (_, __) {
    return const DetailsPage();
  },
);
```

`go_router` creates the appropriate page type for the app context: Material, Cupertino, or no-transition WidgetsApp behavior.

## `pageBuilder`

Use when page-level behavior is required:

- custom transition;
- fullscreen dialog;
- custom page key;
- custom restoration ID;
- barrier configuration.

```dart
GoRoute(
  path: '/details',
  pageBuilder: (
    BuildContext context,
    GoRouterState state,
  ) {
    return MaterialPage<void>(
      key: state.pageKey,
      restorationId:
          'details-page',
      child: const DetailsPage(),
    );
  },
);
```

---

# Page Identity

`GoRouterState.pageKey` identifies the route page.

When building a custom page, prefer:

```dart
key: state.pageKey
```

unless you intentionally need another identity.

Current typed route generation uses `state.pageKey` for default generated page identity and restoration behavior.

## Why identity matters

Page identity affects:

- whether Flutter updates an existing page;
- widget state retention;
- transitions;
- `replace` semantics.

Do not casually replace page keys during unrelated refactors.

---

# Transitions

Use `pageBuilder` with `CustomTransitionPage`.

```dart
GoRoute(
  path: '/details',
  pageBuilder: (
    BuildContext context,
    GoRouterState state,
  ) {
    return CustomTransitionPage<void>(
      key: state.pageKey,
      transitionDuration:
          const Duration(
        milliseconds: 250,
      ),
      reverseTransitionDuration:
          const Duration(
        milliseconds: 200,
      ),
      child:
          const DetailsPage(),
      transitionsBuilder: (
        BuildContext context,
        Animation<double> animation,
        Animation<double>
            secondaryAnimation,
        Widget child,
      ) {
        return FadeTransition(
          opacity: animation,
          child: child,
        );
      },
    );
  },
);
```

`CustomTransitionPage` currently supports forward/reverse duration, fullscreen dialog, barriers, opacity, maintainState, restoration ID, and transition builder.

For no transition:

```dart
NoTransitionPage<void>(
  key: state.pageKey,
  child: const DashboardPage(),
);
```



## Transition rules

- Prefer platform/default transitions unless UX needs otherwise.
- Avoid long transitions on frequently visited routes.
- Avoid complex blur/shader work on every route transition without profiling.
- Test nested Navigator transitions separately from branch-switch transitions.

StatefulShellRoute branch switching is controlled by its Navigator container; the default indexed-stack variant does not animate branch switches.

---

# Modals and Dialogs

Use ordinary `showDialog` when the UI is:

- temporary;
- not externally deep-linkable;
- not bookmarkable;
- not a canonical destination.

```dart
await showDialog<void>(
  context: context,
  builder: (_) {
    return const AlertDialog(
      title: Text('Delete item?'),
    );
  },
);
```

Flutter documents these imperative/pageless routes as not deep-linkable. They may also be removed when an associated page-backed parent route is removed by declarative navigation.

Use a route when the modal state itself should be:

- addressable;
- restorable;
- browser-history aware;
- deep-linkable.

Example:

```dart
GoRoute(
  path: '/compose',
  pageBuilder: (
    BuildContext context,
    GoRouterState state,
  ) {
    return MaterialPage<void>(
      key: state.pageKey,
      fullscreenDialog: true,
      child:
          const ComposePage(),
    );
  },
);
```

Do not turn every confirmation dialog into a URL.

---

# Back Navigation

`GoRouter.pop()` and `context.pop()` pop the top-most route on the current route stack. `canPop()` indicates whether the router has a route to pop.

Use:

```dart
if (context.canPop()) {
  context.pop();
} else {
  context.go('/home');
}
```

when fallback navigation is part of UX.

## Do not globally replace system back

Android/iOS/browser back behavior is part of the Router/Navigator system.

Test:

- root exit;
- nested detail back;
- active branch back;
- shell exit;
- browser back.

---

# Pop Interception

Do not use old `WillPopScope` patterns.

Flutter replaced just-in-time `WillPopScope` interception with `PopScope` to support Android predictive back.

## Dirty form

```dart
PopScope<void>(
  canPop: !isDirty,
  onPopInvokedWithResult: (
    bool didPop,
    void result,
  ) async {
    if (didPop || !isDirty) {
      return;
    }

    final shouldLeave =
        await showDialog<bool>(
              context: context,
              builder: (_) {
                return AlertDialog(
                  title: const Text(
                    'Discard changes?',
                  ),
                  actions: <Widget>[
                    TextButton(
                      onPressed: () {
                        Navigator.of(context)
                            .pop(false);
                      },
                      child:
                          const Text('Stay'),
                    ),
                    FilledButton(
                      onPressed: () {
                        Navigator.of(context)
                            .pop(true);
                      },
                      child:
                          const Text('Discard'),
                    ),
                  ],
                );
              },
            ) ??
            false;

    if (shouldLeave &&
        context.mounted) {
      context.pop();
    }
  },
  child: const EditProfileView(),
);
```

## `GoRoute.onExit`

Current `GoRoute` also supports an asynchronous `onExit` callback returning `bool`; `false` aborts the route exit.

Use it when route-level removal policy should apply to go_router operations.

Do not independently show duplicate confirmation dialogs from both `PopScope` and `onExit` without coordinating them.

Recent go_router 17.4 fixes `onExit` handling for routes nested inside `ShellRoute`, so verify package version before diagnosing nested exit behavior.

---

# Error Handling

Differentiate:

## Programming/configuration errors

`GoError` / assertions indicate incorrect router usage/configuration and should be fixed rather than caught as user-facing errors.

## User/request routing exceptions

`GoException` means incoming navigation cannot be handled, such as an unmatched/invalid route. These can be handled through:

- `onException`;
- `errorPageBuilder`;
- `errorBuilder`.

`onException` supersedes the other error handlers when supplied.

## Simple production error page

```dart
GoRouter(
  routes: routes,
  errorBuilder: (
    BuildContext context,
    GoRouterState state,
  ) {
    return NotFoundPage(
      requestedUri: state.uri,
    );
  },
);
```

Do not show:

```dart
Text(state.error.toString())
```

to production users.

Use internal diagnostics separately.

---

# 404 / Not Found

Differentiate four cases.

## Router 404

```text
/no-such-route
```

No route matches.

Handle through router error handling.

## Resource 404

```text
/products/42
```

Route matches, but product `42` does not exist.

That is a repository/page state:

```text
ProductPage
→ load 42
→ NotFound domain state
```

not router error.

## Forbidden

A resource exists but user lacks access.

Use authorization state / appropriate page/redirect.

## Network failure

A valid route failed to load due to connectivity.

Show page error/retry UI.

Do not send every failure to `/404`.

---

# Route-Level Loading

Keep route builders deterministic.

Bad:

```dart
builder: (
  BuildContext context,
  GoRouterState state,
) async {
  final product =
      await repository.load(...);
  ...
}
```

`GoRoute.builder` is synchronous.

Do not bury uncontrolled initialization in routing logic.

Prefer:

```dart
builder: (
  BuildContext context,
  GoRouterState state,
) {
  return ProductPage(
    productId:
        state.pathParameters[
            'productId']!,
  );
}
```

Then page/state management loads data.

Use redirect only for lightweight prerequisites already represented in application state.

---

# Async Navigation Decisions

Both redirects and `onEnter` can return `FutureOr`.

That does **not** mean every redirect should perform network I/O.

Bad:

```dart
redirect: (_, state) async {
  final subscription =
      await api.fetchSubscription();

  ...
}
```

This can execute repeatedly during navigation/re-evaluation.

Better:

```text
subscription/session repository
↓
state manager
↓
already-available state
↓
router decision
```

Use `/splash` or a loading route while prerequisite application state is unresolved.

---

# Initial Location

`initialLocation` is used when the application starts **without** a platform-provided deep link.

```dart
GoRouter(
  initialLocation: '/home',
  routes: routes,
);
```

Do not assume it overrides incoming launch deep links.

Current `GoRouter` exposes:

```dart
overridePlatformDefaultLocation
```

which determines whether a configured `initialLocation` should ignore the platform's initial location. Default is `false`.

Only set:

```dart
overridePlatformDefaultLocation: true
```

when the product intentionally wants to ignore the incoming platform location.

---

# State Restoration

StatefulShellRoute branch preservation and OS process-death restoration are different features.

Official documentation explicitly distinguishes them.

## Top-level restoration

```dart
final router = GoRouter(
  restorationScopeId:
      'router',
  routes: routes,
);

MaterialApp.router(
  restorationScopeId: 'app',
  routerConfig: router,
);
```

## GoRoute

When using ordinary `builder`, no additional route-level configuration is required by go_router.

When using `pageBuilder`, give the returned Page a `restorationId`.

## ShellRoute

For shell restoration:

- `ShellRoute.restorationScopeId`;
- `pageBuilder`;
- returned Page `restorationId`.

## StatefulShellRoute

For complete restoration:

- router restoration scope;
- StatefulShellRoute restoration scope;
- shell `pageBuilder` with Page restoration ID;
- each `StatefulShellBranch.restorationScopeId`.



Do not claim full restoration merely because branch stacks remain alive while switching tabs.

---

# Typed Routes

Use `go_router_builder` when compile-time route parameter safety and generated navigation helpers justify code generation.

Current first-party approach uses:

- `GoRouteData`;
- `@TypedGoRoute`;
- generated mixins;
- `$appRoutes`;
- `go_router_builder`;
- `build_runner`.

## Example

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

part 'routes.g.dart';

@TypedGoRoute<HomeRoute>(
  path: '/',
  routes: <TypedRoute<RouteData>>[
    TypedGoRoute<ProductRoute>(
      path: 'products/:productId',
    ),
  ],
)
final class HomeRoute
    extends GoRouteData
    with $HomeRoute {
  const HomeRoute();

  @override
  Widget build(
    BuildContext context,
    GoRouterState state,
  ) {
    return const HomePage();
  }
}

final class ProductRoute
    extends GoRouteData
    with $ProductRoute {
  const ProductRoute({
    required this.productId,
    this.preview = false,
  });

  final int productId;
  final bool preview;

  @override
  Widget build(
    BuildContext context,
    GoRouterState state,
  ) {
    return ProductPage(
      productId:
          productId.toString(),
      preview: preview,
    );
  }
}

final typedRouter = GoRouter(
  routes: $appRoutes,
);
```

Here:

- `productId` is a path parameter because it appears in the path;
- `preview` becomes a query parameter because it does not.

Navigation:

```dart
const ProductRoute(
  productId: 42,
).go(context);
```

Push:

```dart
final result =
    await const ProductRoute(
  productId: 42,
).push<bool>(context);
```

Current generated route classes support `location`, `go`, `push`, `pushReplacement`, and `replace`.

## Type conversion

Builder supports conversions for types such as:

- `int`;
- enums;
- extension types;
- custom query encoding with current annotations/codecs.

## Typed `$extra`

A constructor field named `$extra` maps to route extra:

```dart
final class PreviewRoute
    extends GoRouteData
    with $PreviewRoute {
  const PreviewRoute(
    this.$extra,
  );

  final Product $extra;

  ...
}
```

It remains unsuitable as the only externally reproducible route state.

---

# Typed Stateful Shell Routes

Current typed API includes:

- `TypedShellRoute`;
- `TypedStatefulShellRoute`;
- `TypedStatefulShellBranch`;
- `ShellRouteData`;
- `StatefulShellRouteData`;
- `StatefulShellBranchData`.

Use typed shells only when the application already benefits from typed routing.

Do not add typed shell code generation merely because a bottom navigation exists.

---

# Code Generation

Current generator package is `go_router_builder`.

Typical configuration:

```yaml
dependencies:
  go_router: ^17.4.0

dev_dependencies:
  build_runner: ^2.6.0
  go_router_builder: ^4.4.0
```

Use repository-compatible versions rather than blindly copying exact versions.

Generate:

```bash
dart run build_runner build
```

Current builder docs use `[source_file].g.dart` part files and generate `$appRoutes`.

## Do not manually edit generated routing code

Modify:

- route data class;
- annotation;
- constructor parameter;
- typed route tree;

then regenerate.

## CI

Run generation verification according to project conventions.

Stale generated route code can produce misleading path/constructor behavior.

---

# Refresh / Route Re-evaluation

Use state re-evaluation without rebuilding the router.

Current mechanisms include:

- `refreshListenable`;
- inherited dependencies used by redirect;
- `router.refresh()` when explicitly necessary.

Good for:

- login/logout;
- role changes;
- onboarding completion;
- subscription changes;
- feature availability.

## Avoid

```text
auth state changes
↓
construct a new GoRouter
```

Use state-driven re-evaluation instead.

## `refreshListenable` adapter

If a state library exposes a Stream but not a `Listenable`, adapt it deliberately as shown earlier.

Do not resurrect removed `GoRouterRefreshStream`.

---

# Dependency Injection

Router dependencies should be few and architectural.

Reasonable:

- auth/session manager;
- feature/access policy;
- analytics observer;
- route diagnostics.

Avoid injecting:

- every repository;
- page-specific use case;
- page state objects;
- `BuildContext`.

Example:

```dart
final class AppRouting {
  AppRouting({
    required AuthSession authSession,
    required RouteAnalyticsObserver
        analyticsObserver,
  }) {
    router = GoRouter(
      observers: <NavigatorObserver>[
        analyticsObserver,
      ],
      routes: createRoutes(),
      redirect: (
        context,
        state,
      ) {
        ...
      },
    );
  }

  late final GoRouter router;
}
```

Pages should obtain feature dependencies through their normal DI/composition mechanisms.

---

# Navigation Observers

`GoRouter` accepts root `NavigatorObserver`s.

`ShellRoute` accepts its own observers.

`StatefulShellBranch` can have branch observers.

Important migration behavior:

Starting in go_router 17.0, navigation inside ShellRoutes notifies GoRouter's root observers by default. `notifyRootObserver` controls this.

## Analytics implication

If both:

```text
root observer
+
branch observer
```

emit analytics, test for duplicate events.

Do not assume observer behavior from pre-17 versions.

---

# Analytics

Prefer stable, non-sensitive screen identifiers.

Good:

```text
product_details
settings_security
profile
```

or route templates:

```text
/products/:productId
```

Current `GoRouterState.fullPath` exposes the route template path.

Avoid logging:

```text
/products/12345?email=user@example.com&token=...
```

Raw locations can contain:

- user IDs;
- search terms;
- private filters;
- reset tokens.

Define a redaction policy.

---

# URL Stability

Treat public URLs as external interfaces.

Changing:

```text
/products/:id
```

to:

```text
/catalog/item/:id
```

can break:

- bookmarks;
- browser history;
- marketing campaigns;
- push notifications;
- email links;
- QR codes;
- external integrations.

If a path must change, keep a redirect:

```dart
GoRoute(
  path: '/products/:id',
  redirect: (
    BuildContext context,
    GoRouterState state,
  ) {
    final id =
        state.pathParameters['id']!;

    return '/catalog/item/'
        '${Uri.encodeComponent(id)}';
  },
);
```

Treat route migration like API migration.

---

# Notifications and Deep Links

Represent notification destinations with the same app routes used elsewhere.

Good notification data:

```text
route = /orders/42
```

or structured data mapped to:

```text
OrderRoute(orderId: 42)
```

Avoid a parallel system:

```text
notificationType == x
→ manually instantiate widget
```

Validate all notification-supplied route data before navigation.

---

# Cross-Feature Navigation

Feature A should not import Feature B's screen widget simply to navigate.

Prefer:

```text
stable path
typed route API
application navigation service abstraction at presentation boundary
```

Example:

```dart
const ProductRoute(
  productId: 42,
).go(context);
```

instead of:

```dart
Navigator.push(
  context,
  MaterialPageRoute(
    builder: (_) =>
        ProductPage(...),
  ),
);
```

when the product page is a canonical application route.

---

# Security

Route input is user-controlled input.

## Validate path/query parameters

Do not assume:

```text
/users/:userId
```

contains a legitimate ID just because routing matched.

Validate:

- format;
- length;
- range;
- enum membership;
- allowed characters;
- business authorization separately.

## Do not put secrets in URLs

Avoid:

```text
/reset-password?accessToken=...
/profile?refreshToken=...
```

unless an externally defined protocol specifically requires a URL token.

URLs may appear in:

- browser history;
- analytics;
- reverse-proxy logs;
- screenshots;
- referrers;
- support logs.

## Auth guard is not authorization

Routing a user away from `/admin` does not secure backend resources.

Server/backend authorization must independently enforce access.

## Return URL validation

Bad:

```dart
final from =
    state.uri.queryParameters['from'];

context.go(from!);
```

if `from` came from external input.

Validate that it is an allowed internal location.

Reject:

- schemes;
- authorities;
- external hosts;
- unrecognized routes.

This prevents open-redirect-style behavior.

## Analytics

Do not record sensitive query/path data without redaction.

---

# Performance

Navigation performance problems usually come from:

- router reconstruction;
- expensive redirects;
- expensive page builders;
- overbuilt shells;
- heavy route transitions;
- unnecessary nested Navigators;
- excessive listeners/observers.

Do not micro-optimize string path matching before measuring actual navigation latency.

---

# Router Recreation

Avoid:

```dart
Widget build(BuildContext context) {
  final router = GoRouter(
    routes: ...
  );

  return MaterialApp.router(
    routerConfig: router,
  );
}
```

in a frequently rebuilding widget.

First-party getting-started examples create a stable router configuration outside `build`.

Use:

- a final field initialized once;
- DI singleton/application-scoped router;
- `State.initState` when router must be owned by one StatefulWidget.

Dispose it when its owner dies.

---

# Redirect Performance

Keep redirect logic approximately:

```text
read local state
↓
simple condition
↓
return URI or null
```

Avoid:

- network requests;
- database migrations;
- expensive JSON parsing;
- large collections scanning;
- page construction;
- side-effect logging storms.

Redirect may run many times.

If access state is expensive to compute, precompute it in application state.

---

# Dynamic RoutingConfig

Current `GoRouter.routingConfig` can consume a `ValueListenable<RoutingConfig>`. Updating the config reparses the current RouteMatchList against the new route table.

Use this only when the actual route **table** changes dynamically.

Possible:

- plug-in module loaded;
- tenant exposes a different route set;
- runtime app composition genuinely changes.

Do not use dynamic route tables for ordinary authentication. Redirects are simpler.

---

# Large Applications

Optional structure:

```text
lib/
  routing/
    app_router.dart
    route_names.dart

  features/
    auth/
      presentation/
      auth_routes.dart

    home/
      home_routes.dart

    profile/
      profile_routes.dart
```

Feature files can export:

```dart
List<RouteBase> profileRoutes() {
  return <RouteBase>[
    ...
  ];
}
```

But preserve route-tree meaning.

Do not flatten semantically nested routes merely because separate files are convenient.

Do not build an abstraction so generic that reviewers can no longer see:

```text
path
navigator
redirect
builder
```

---

# Imperative Navigator Interop

Flutter explicitly supports Router and Navigator together. Imperatively pushed pages are pageless/non-deep-linkable and can be removed when their page-backed parent is removed by declarative navigation.

Acceptable:

```dart
await showDialog<void>(...);
```

or temporary:

```dart
Navigator.of(context).push(...);
```

when direct-link semantics are unnecessary.

Avoid maintaining two competing canonical page stacks:

```text
half the app → go_router
half the app → manual Navigator.push
```

because deep-link/back/history behavior becomes difficult to reason about.

---
