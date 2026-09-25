# Auth, Guards & Shell Navigation

## Contents

- [Redirects](#redirects)
  - [Top-level redirect](#top-level-redirect)
  - [Route-level redirect](#route-level-redirect)
  - [Redirect limit](#redirect-limit)
- [`onEnter` Navigation Guards](#onenter-navigation-guards)
  - [Hard block](#hard-block)
  - [Use redirect instead when](#use-redirect-instead-when)
  - [Initial blocking](#initial-blocking)
- [Authentication Routing](#authentication-routing)
  - [Current re-evaluation options](#current-re-evaluation-options)
  - [Bloc-compatible refresh adapter](#bloc-compatible-refresh-adapter)
  - [Production auth router](#production-auth-router)
    - [Auth rules](#auth-rules)
- [Redirect Loop Prevention](#redirect-loop-prevention)
  - [Bad](#bad)
  - [Better](#better)
- [State Management Integration](#state-management-integration)
  - [Good separation](#good-separation)
  - [BlocListener example](#bloclistener-example)
- [Navigation Side Effects](#navigation-side-effects)
  - [Appropriate triggers](#appropriate-triggers)
- [ShellRoute](#shellroute)
  - [Do not assume ShellRoute preserves independent tab history](#do-not-assume-shellroute-preserves-independent-tab-history)
- [StatefulShellRoute](#statefulshellroute)
  - [Comparison](#comparison)
- [Bottom Navigation](#bottom-navigation)
  - [Complete configuration example](#complete-configuration-example)
  - [Active-tab tap](#active-tab-tap)
  - [Cross-branch navigation](#cross-branch-navigation)
- [Stateful Branch Preloading](#stateful-branch-preloading)
- [Nested Navigators](#nested-navigators)
- [Parent Navigator Keys](#parent-navigator-keys)
  - [Appropriate uses](#appropriate-uses)
  - [Avoid](#avoid)
- [Navigator Key Rules](#navigator-key-rules)

---

# Redirects

Current redirect callback signature:

```dart
FutureOr<String?> Function(
  BuildContext context,
  GoRouterState state,
)
```

Returning `null` allows the requested route; returning another location redirects. Asynchronous redirects remain supported.

## Top-level redirect

Use for application-wide policy:

- authentication;
- onboarding completion;
- account validity;
- maintenance mode when expressed as rerouting.

## Route-level redirect

Use when policy belongs specifically to a route/subtree.

Example:

```dart
GoRoute(
  path: '/legacy-profile',
  redirect: (
    BuildContext context,
    GoRouterState state,
  ) {
    return '/profile';
  },
);
```

## Redirect limit

Current default redirect limit is 5. Exceeding it results in a routing error.

Do not increase the limit to hide a redirect cycle.

---

# `onEnter` Navigation Guards

Current `go_router` has a top-level `onEnter` callback that runs before redirects and receives:

- current state;
- next state;
- router instance.

It returns `Allow` or `Block`, and is `FutureOr`.

Use it when you need to **block** a navigation attempt rather than transform the requested location.

## Hard block

```dart
onEnter: (
  BuildContext context,
  GoRouterState currentState,
  GoRouterState nextState,
  GoRouter router,
) {
  if (maintenanceMode &&
      nextState.uri.path != '/maintenance') {
    return Block.then(
      () {
        router.go('/maintenance');
      },
    );
  }

  return const Allow();
},
```

`Block.stop()` performs a hard stop. `Block.then(...)` runs a callback after the block is committed; current API also supports post-allow callbacks.

## Use redirect instead when

the correct navigation result is naturally:

```text
requested A
→ canonical B
```

Examples:

- signed-out protected route → login;
- old URL → new URL;
- `/` → `/home`.

## Initial blocking

Current 17.4.0 adds `BlockedInitialNavigationException` for the case where `onEnter` blocks initial navigation and there is no prior route state to restore. Handle this intentionally if you block startup navigation.

---

# Authentication Routing

Use one coherent auth-routing policy.

Recommended state model:

```dart
enum AuthStatus {
  loading,
  signedOut,
  signedIn,
}
```

Conceptual flow:

```text
Requested location
↓
Auth state loaded?
├── No → /splash
└── Yes
    ├── protected + signed out
    │       ↓
    │    /login?from=...
    │
    ├── login + signed in
    │       ↓
    │    safe return target or /home
    │
    └── otherwise
            ↓
           allow
```

## Current re-evaluation options

Current `GoRouter` still supports `refreshListenable`. Redirects also re-evaluate when they establish a dependency on an `InheritedWidget` that changes.

The old `GoRouterRefreshStream` helper was removed in `go_router` 5.0. Do not copy old tutorials using it.

## Bloc-compatible refresh adapter

```dart
import 'dart:async';

import 'package:flutter/foundation.dart';

final class RouterRefreshNotifier<T>
    extends ChangeNotifier {
  RouterRefreshNotifier(
    Stream<T> stream,
  ) {
    _subscription = stream.listen(
      (_) {
        notifyListeners();
      },
    );
  }

  late final StreamSubscription<T>
      _subscription;

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
```

## Production auth router

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

enum AuthStatus {
  loading,
  signedOut,
  signedIn,
}

abstract interface class AuthSession {
  AuthStatus get status;

  Stream<AuthStatus> get changes;
}

final class AppRouter {
  AppRouter(
    this._authSession,
  ) : _refreshNotifier =
            RouterRefreshNotifier<AuthStatus>(
          _authSession.changes,
        ) {
    router = GoRouter(
      initialLocation: '/splash',
      refreshListenable: _refreshNotifier,
      routes: <RouteBase>[
        GoRoute(
          path: '/',
          redirect: (_, __) => '/home',
        ),
        GoRoute(
          path: '/splash',
          builder: (_, __) {
            return const SplashPage();
          },
        ),
        GoRoute(
          path: '/login',
          builder: (
            BuildContext context,
            GoRouterState state,
          ) {
            return const LoginPage();
          },
        ),
        GoRoute(
          path: '/home',
          builder: (_, __) {
            return const HomePage();
          },
        ),
        GoRoute(
          path: '/profile',
          builder: (_, __) {
            return const ProfilePage();
          },
        ),
      ],
      redirect: _redirect,
    );
  }

  final AuthSession _authSession;
  final RouterRefreshNotifier<AuthStatus>
      _refreshNotifier;

  late final GoRouter router;

  String? _redirect(
    BuildContext context,
    GoRouterState state,
  ) {
    final status =
        _authSession.status;

    final path =
        state.uri.path;

    final isSplash =
        path == '/splash';
    final isLogin =
        path == '/login';

    switch (status) {
      case AuthStatus.loading:
        return isSplash
            ? null
            : '/splash';

      case AuthStatus.signedOut:
        if (isLogin) {
          return null;
        }

        if (_isPublic(path)) {
          return null;
        }

        return Uri(
          path: '/login',
          queryParameters:
              <String, String>{
            'from':
                state.uri.toString(),
          },
        ).toString();

      case AuthStatus.signedIn:
        if (isSplash || isLogin) {
          final from =
              state.uri
                  .queryParameters['from'];

          return _safeReturnLocation(from) ??
              '/home';
        }

        return null;
    }
  }

  bool _isPublic(String path) {
    return path == '/about' ||
        path.startsWith('/public/');
  }

  String? _safeReturnLocation(
    String? raw,
  ) {
    if (raw == null || raw.isEmpty) {
      return null;
    }

    final uri = Uri.tryParse(raw);

    if (uri == null ||
        uri.hasScheme ||
        uri.hasAuthority ||
        !uri.path.startsWith('/')) {
      return null;
    }

    const allowedPrefixes =
        <String>[
      '/home',
      '/profile',
      '/products',
      '/settings',
    ];

    final allowed =
        allowedPrefixes.any(
      (prefix) =>
          uri.path == prefix ||
          uri.path.startsWith(
            '$prefix/',
          ),
    );

    return allowed
        ? uri.toString()
        : null;
  }

  void dispose() {
    router.dispose();
    _refreshNotifier.dispose();
  }
}
```

### Auth rules

- Do not call network login/session APIs inside `redirect`.
- Let auth/session infrastructure resolve state.
- Represent unresolved startup explicitly.
- Let auth state changes trigger route re-evaluation.
- Do not perform both a global auth redirect **and** unrelated login-page navigation that fights it.
- Preserve intended deep-link destination using an internal validated return URL.

---

# Redirect Loop Prevention

Before adding a redirect, explicitly write:

```text
source condition
→ destination
→ destination's redirect condition
```

## Bad

```dart
redirect: (_, state) {
  if (!loggedIn) {
    return '/login';
  }

  return '/home';
}
```

Every `/home` evaluation returns `/home` again and every other logged-in route is forced home.

## Better

```dart
redirect: (_, state) {
  final isLogin =
      state.uri.path == '/login';

  if (!loggedIn && !isLogin) {
    return '/login';
  }

  if (loggedIn && isLogin) {
    return '/home';
  }

  return null;
}
```

Rules:

- Return `null` when no change is required.
- Make the redirect destination exempt from the condition that caused the redirect.
- Keep chained redirects short.
- Do not raise `redirectLimit` to compensate for poor logic.
- Test every auth state against every special route.

---

# State Management Integration

Recommended direction:

```text
Authentication backend
↓
Auth Repository / Session Manager
↓
Bloc / Cubit / Riverpod state
↓
Router policy observes stable state
```

Route infrastructure may **read** state.

Business logic should not usually own route execution.

## Good separation

```text
Cubit:
  CheckoutState.success(orderId)

UI BlocListener:
  context.go('/orders/$orderId')
```

## BlocListener example

```dart
BlocListener<CheckoutCubit, CheckoutState>(
  listenWhen: (
    CheckoutState previous,
    CheckoutState current,
  ) {
    return previous.status !=
            current.status &&
        current.status ==
            CheckoutStatus.success;
  },
  listener: (
    BuildContext context,
    CheckoutState state,
  ) {
    context.go(
      '/orders/${state.orderId}',
    );
  },
  child: const CheckoutView(),
);
```

For auth, prefer central redirect policy instead of manually navigating from every login/logout UI.

---

# Navigation Side Effects

Use navigation as a presentation side effect.

## Appropriate triggers

- login state resolved;
- form submitted successfully;
- checkout completed;
- item created;
- deletion completed;
- permission flow finished.

Do not navigate from:

```dart
Widget build(BuildContext context)
```

because builds can occur repeatedly.

Bad:

```dart
Widget build(BuildContext context) {
  if (state.completed) {
    context.go('/done');
  }

  return ...
}
```

Better:

```text
state changes
↓
listener/effect handler
↓
navigation
```

---

# ShellRoute

`ShellRoute` creates a nested Navigator and places matching child routes on that Navigator instead of the root Navigator. The shell builder receives the child produced by that nested navigation stack.

Use for:

- persistent app bar;
- drawer;
- navigation rail;
- simple bottom navigation where independent branch stacks are not required;
- common scaffold around several destinations.

Example:

```dart
ShellRoute(
  builder: (
    BuildContext context,
    GoRouterState state,
    Widget child,
  ) {
    return AppShell(
      child: child,
    );
  },
  routes: <RouteBase>[
    GoRoute(
      path: '/feed',
      builder: (_, __) {
        return const FeedPage();
      },
    ),
    GoRoute(
      path: '/settings',
      builder: (_, __) {
        return const SettingsPage();
      },
    ),
  ],
);
```

## Do not assume ShellRoute preserves independent tab history

A `ShellRoute` uses one shell Navigator.

If:

```text
Feed:
  /feed → /feed/item/42
```

then you change to:

```text
/settings
```

this is not the same architecture as maintaining two independent Navigator trees.

For that requirement, use `StatefulShellRoute`.

---

# StatefulShellRoute

`StatefulShellRoute` creates **separate Navigators for separate branches**. This allows parallel navigation trees and persistent history per branch. It is specifically suitable for bottom-navigation/tab interfaces where each tab owns its own stack.

## Comparison

| Need | GoRoute children | ShellRoute | StatefulShellRoute |
|---|---|---|---|
| Parent + details stack | Yes | Usually unnecessary | No |
| Persistent chrome | Parent may remain page | Yes | Yes |
| One nested Navigator | No/normal navigator | Yes | No |
| Independent tab stacks | No | No | Yes |
| Bottom navigation preserving each tab history | No | Limited | Yes |
| Branch-specific navigator keys | No | One shell key | One per branch |
| Branch initial locations | No | No | Yes |
| Branch preload | No | No | Yes |
| Custom branch switch animation | N/A | N/A | Custom container |
| Default branch container | N/A | N/A | `indexedStack` |

`StatefulShellRoute.indexedStack` supplies the standard IndexedStack-style container and does not animate branch changes. Custom branch-switch transitions are the responsibility of a custom `navigatorContainerBuilder`.

---

# Bottom Navigation

Production model:

```text
StatefulShellRoute
├── Home branch
│   ├── /home
│   └── /home/details/:id
│
├── Search branch
│   ├── /search
│   └── /search/results/:id
│
└── Profile branch
    ├── /profile
    └── /profile/settings
```

## Complete configuration example

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

final rootNavigatorKey =
    GlobalKey<NavigatorState>(
  debugLabel: 'root',
);

final homeNavigatorKey =
    GlobalKey<NavigatorState>(
  debugLabel: 'home',
);

final searchNavigatorKey =
    GlobalKey<NavigatorState>(
  debugLabel: 'search',
);

final profileNavigatorKey =
    GlobalKey<NavigatorState>(
  debugLabel: 'profile',
);

final GoRouter router = GoRouter(
  navigatorKey: rootNavigatorKey,
  initialLocation: '/home',
  routes: <RouteBase>[
    GoRoute(
      path: '/',
      redirect: (_, __) => '/home',
    ),
    StatefulShellRoute.indexedStack(
      builder: (
        BuildContext context,
        GoRouterState state,
        StatefulNavigationShell
            navigationShell,
      ) {
        return MainScaffold(
          navigationShell:
              navigationShell,
        );
      },
      branches: <StatefulShellBranch>[
        StatefulShellBranch(
          navigatorKey:
              homeNavigatorKey,
          routes: <RouteBase>[
            GoRoute(
              path: '/home',
              builder: (_, __) {
                return const HomePage();
              },
              routes: <RouteBase>[
                GoRoute(
                  path: 'details/:id',
                  builder: (
                    BuildContext context,
                    GoRouterState state,
                  ) {
                    return DetailPage(
                      id: state
                          .pathParameters[
                              'id']!,
                    );
                  },
                ),
                GoRoute(
                  path:
                      'fullscreen/:id',
                  parentNavigatorKey:
                      rootNavigatorKey,
                  builder: (
                    BuildContext context,
                    GoRouterState state,
                  ) {
                    return FullscreenPage(
                      id: state
                          .pathParameters[
                              'id']!,
                    );
                  },
                ),
              ],
            ),
          ],
        ),
        StatefulShellBranch(
          navigatorKey:
              searchNavigatorKey,
          routes: <RouteBase>[
            GoRoute(
              path: '/search',
              builder: (_, __) {
                return const SearchPage();
              },
              routes: <RouteBase>[
                GoRoute(
                  path: 'results/:id',
                  builder: (
                    BuildContext context,
                    GoRouterState state,
                  ) {
                    return SearchResultPage(
                      id: state
                          .pathParameters[
                              'id']!,
                    );
                  },
                ),
              ],
            ),
          ],
        ),
        StatefulShellBranch(
          navigatorKey:
              profileNavigatorKey,
          routes: <RouteBase>[
            GoRoute(
              path: '/profile',
              builder: (_, __) {
                return const ProfilePage();
              },
              routes: <RouteBase>[
                GoRoute(
                  path: 'settings',
                  builder: (_, __) {
                    return const
                        ProfileSettingsPage();
                  },
                ),
              ],
            ),
          ],
        ),
      ],
    ),
  ],
);

final class MainScaffold
    extends StatelessWidget {
  const MainScaffold({
    super.key,
    required this.navigationShell,
  });

  final StatefulNavigationShell
      navigationShell;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar:
          NavigationBar(
        selectedIndex:
            navigationShell
                .currentIndex,
        onDestinationSelected:
            (int index) {
          navigationShell.goBranch(
            index,
            initialLocation:
                index ==
                    navigationShell
                        .currentIndex,
          );
        },
        destinations: const <
            NavigationDestination>[
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon:
                Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon:
                Icon(Icons.search_outlined),
            selectedIcon:
                Icon(Icons.search),
            label: 'Search',
          ),
          NavigationDestination(
            icon:
                Icon(Icons.person_outline),
            selectedIcon:
                Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
```

`goBranch(index)` returns to the branch's last location. Passing `initialLocation: true` restores that branch's initial/default location instead.

## Active-tab tap

Common UX:

```dart
navigationShell.goBranch(
  index,
  initialLocation:
      index ==
          navigationShell.currentIndex,
);
```

This means:

- switch to another tab → restore its previous stack;
- tap current tab again → return to branch root.

Use only if product UX specifies this behavior.

## Cross-branch navigation

To navigate directly to a specific location in another branch:

```dart
context.go(
  '/search/results/42',
);
```

Prefer location-based navigation over:

```text
goBranch(search)
then push(...)
```

when the destination has a canonical deep-linkable URL.

---

# Stateful Branch Preloading

`StatefulShellBranch` currently has:

```dart
preload: bool
```

defaulting to `false`. If enabled, that branch can be eagerly loaded when the stateful shell is first entered.

Use `preload: true` only when:

- first branch switch latency is measurable;
- branch construction is predictable;
- memory cost is acceptable.

Do not preload every heavy tab automatically.

---

# Nested Navigators

There can be several Navigator layers:

```text
Root Navigator
└── StatefulShellRoute
    ├── Home Navigator
    ├── Search Navigator
    └── Profile Navigator
```

A route normally renders on:

- root Navigator;
- nearest shell Navigator;
- or explicitly targeted ancestor Navigator.

`GoRoute` documentation states that builder output is wrapped in a page and placed on the root Navigator, nearest ShellRoute Navigator, or Navigator referenced by `parentNavigatorKey`.

---

# Parent Navigator Keys

Use `parentNavigatorKey` when a route under a shell should intentionally escape that nested navigator.

Example:

```dart
GoRoute(
  path: 'checkout',
  parentNavigatorKey:
      rootNavigatorKey,
  builder: (
    BuildContext context,
    GoRouterState state,
  ) {
    return const CheckoutPage();
  },
);
```

This can render Checkout above the entire shell.

First-party ShellRoute examples use this exact mechanism for a child that should appear on the root Navigator rather than the shell Navigator.

## Appropriate uses

- global full-screen flow;
- full-screen modal page;
- authentication screen above shell;
- global content that must cover bottom navigation.

## Avoid

Using parent keys merely to fix an incorrectly structured route tree.

---

# Navigator Key Rules

Keys must be stable.

Good:

```dart
final rootNavigatorKey =
    GlobalKey<NavigatorState>();
```

created once with router configuration.

Bad:

```dart
Widget build(BuildContext context) {
  final key =
      GlobalKey<NavigatorState>();

  return MaterialApp.router(
    routerConfig: GoRouter(
      navigatorKey: key,
      routes: ...,
    ),
  );
}
```

New keys mean new Navigator identities.

Use custom branch/shell keys only when:

- targeting with `parentNavigatorKey`;
- external Navigator access is genuinely necessary;
- test/observer ownership requires one.

`StatefulShellBranch` creates a default Navigator key when none is provided.

---
