# Testing, Debugging & Migration

## Contents

- [Testing Strategy](#testing-strategy)
  - [Route configuration tests](#route-configuration-tests)
  - [Widget route tests](#widget-route-tests)
  - [Prefer minimal harnesses](#prefer-minimal-harnesses)
- [Redirect Tests](#redirect-tests)
- [Deep-Link Tests](#deep-link-tests)
- [StatefulShellRoute Tests](#statefulshellroute-tests)
- [Web Tests](#web-tests)
- [Error Tests](#error-tests)
- [State Restoration Tests](#state-restoration-tests)
- [Debugging Workflow](#debugging-workflow)
  - [Route does not match](#route-does-not-match)
  - [Wrong route opens](#wrong-route-opens)
  - [Path parameter missing](#path-parameter-missing)
  - [Query wrong](#query-wrong)
  - [Redirect loop](#redirect-loop)
  - [Auth redirect never updates](#auth-redirect-never-updates)
  - [Stack replaced unexpectedly](#stack-replaced-unexpectedly)
  - [Browser back broken](#browser-back-broken)
  - [Bottom navigation state resets](#bottom-navigation-state-resets)
  - [Shell not shown](#shell-not-shown)
  - [Route appears beneath wrong chrome](#route-appears-beneath-wrong-chrome)
  - [Deep link opens wrong branch](#deep-link-opens-wrong-branch)
  - [Duplicate pages](#duplicate-pages)
  - [Page state lost](#page-state-lost)
- [Migration Workflow](#migration-workflow)
  - [1. Record current package version](#1-record-current-package-version)
  - [2. Read every intervening changelog/migration guide](#2-read-every-intervening-changelogmigration-guide)
  - [3. Characterize navigation before changing code](#3-characterize-navigation-before-changing-code)
  - [4. Update APIs without redesigning routes](#4-update-apis-without-redesigning-routes)
  - [5. Run typed-route generator](#5-run-typed-route-generator)
  - [6. Review navigator observer changes](#6-review-navigator-observer-changes)
  - [7. Test external URLs](#7-test-external-urls)
  - [8. Test web history separately](#8-test-web-history-separately)

---

# Testing Strategy

Test routing behavior at multiple levels.

## Route configuration tests

Verify:

- known paths;
- path parameters;
- query parameters;
- named/typed location generation.

## Widget route tests

Pump a small `MaterialApp.router`.

```dart
testWidgets(
  'direct product URL opens product page',
  (WidgetTester tester) async {
    final router = GoRouter(
      initialLocation:
          '/products/42',
      routes: <RouteBase>[
        GoRoute(
          path:
              '/products/:productId',
          builder: (
            BuildContext context,
            GoRouterState state,
          ) {
            return Scaffold(
              body: Text(
                'Product '
                '${state.pathParameters['productId']}',
              ),
            );
          },
        ),
      ],
    );

    addTearDown(router.dispose);

    await tester.pumpWidget(
      MaterialApp.router(
        routerConfig: router,
      ),
    );

    await tester.pumpAndSettle();

    expect(
      find.text('Product 42'),
      findsOneWidget,
    );
  },
);
```

## Prefer minimal harnesses

Do not boot:

- databases;
- real API;
- analytics SDK;
- entire production DI graph;

for a path-parsing test.

---

# Redirect Tests

Required auth cases:

| Auth state | Requested route | Expected |
|---|---|---|
| Loading | `/products/42` | `/splash` |
| Signed out | `/products/42` | `/login?from=...` |
| Signed out | `/login` | `/login` |
| Signed in | `/login` | `/home` or safe `from` |
| Signed in | `/products/42` | stays |
| Logout while protected page visible | login redirect |
| Invalid return URL | safe fallback |
| Redirect destination itself | no loop |

Also test `redirectLimit` is never reached during valid flows.

---

# Deep-Link Tests

Test direct initial entry:

```text
/products/123
/profile/settings
/search?q=flutter
```

Do not only test:

```text
tap home button
tap products
tap product
```

Direct entry exposes hidden assumptions.

Also test:

- cold-start auth;
- logged-out deep link;
- invalid ID;
- encoded parameter;
- unknown path.

---

# StatefulShellRoute Tests

When stateful branches exist, test:

1. enter Home branch;
2. push Home details;
3. switch Search;
4. push Search result;
5. switch Home;
6. Home details remains;
7. tap active Home tab with `initialLocation: true`;
8. Home returns to root;
9. deep link directly to Search result activates Search branch;
10. back behavior pops correct branch.

Do not assume branch retention merely because tab selection works.

---

# Web Tests

Use browser/integration tests for behaviors that depend on browser history.

Test:

- direct URL;
- reload;
- browser Back;
- browser Forward;
- query parameter changes;
- path URL strategy;
- deep link after page reload;
- shell branch URL behavior;
- `push` behavior if used.

A widget test cannot fully prove hosting rewrite configuration.

---

# Error Tests

Test:

```text
/unknown-url
```

and verify the production-safe error experience.

Also test malformed parameters separately from unmatched routes.

---

# State Restoration Tests

Where restoration matters, test:

- route stack restoration;
- shell restoration;
- StatefulShellRoute branch restoration.

Official go_router state-restoration documentation includes distinct requirements for GoRoute, ShellRoute, and StatefulShellRoute.

---

# Debugging Workflow

## Route does not match

Check:

1. Current installed version?
2. Case sensitivity?
3. Exact path?
4. Parent path?
5. Nested route location?
6. Leading/trailing slash assumptions?
7. Redirect changed destination?
8. Route table dynamically changed?

Enable:

```dart
debugLogDiagnostics: true,
```

for development diagnostics.

## Wrong route opens

Inspect:

```dart
state.uri
state.matchedLocation
state.fullPath
state.topRoute
```

## Path parameter missing

Check:

- path template spelling;
- parameter key casing;
- nested path composition.

## Query wrong

Use:

```dart
state.uri.queryParameters
```

not old pre-v10 `state.queryParameters` tutorials. `GoRouterState` switched to `Uri` in go_router 10.

## Redirect loop

Log sanitized:

```text
requested URI
auth state
redirect result
```

Then manually trace destination's redirect.

## Auth redirect never updates

Check:

- `refreshListenable`;
- notifier emits;
- redirect reads current state;
- inherited dependency is actually subscribed;
- router wasn't rebuilt/replaced.

## Stack replaced unexpectedly

Search for:

```text
context.go
```

where `push` was intended.

## Browser back broken

Check:

- use of `push`;
- `Router.neglect`;
- `routerNeglect`;
- `GoRouter.optionURLReflectsImperativeAPIs`;
- manual Navigator routes;
- web server/history assumptions.

## Bottom navigation state resets

Check:

- using `ShellRoute` instead of `StatefulShellRoute`;
- router recreated;
- branch Navigator keys recreated;
- calling `go` to branch root instead of `goBranch`;
- intentionally passing `initialLocation: true`.

## Shell not shown

Check route is actually under the shell route tree.

## Route appears beneath wrong chrome

Inspect its Navigator owner and `parentNavigatorKey`.

## Deep link opens wrong branch

Verify branch route paths are unique and canonical.

## Duplicate pages

Check:

- repeated `push`;
- listener firing multiple times;
- navigation from `build`;
- duplicate state listeners;
- `go` plus redirect causing a second navigation.

## Page state lost

Check:

- page key;
- router/key reconstruction;
- wrong shell choice;
- `replace` vs replacement;
- branch reset.

---

# Migration Workflow

`go_router` has had many breaking changes. Never upgrade routing by package version alone.

## 1. Record current package version

```bash
flutter pub deps | grep go_router
```

## 2. Read every intervening changelog/migration guide

Important historical changes that still explain outdated tutorials include:

- v5: old `GoRouterRefreshStream`, navigatorBuilder, old redirection APIs removed/reworked;
- v8: imperative pushed routes stopped changing browser URL by default;
- v9: `GoRouter` stopped extending `ChangeNotifier`, `GoRouter.location` removed;
- v10: `GoRouterState` moved location/query data to `Uri`;
- v14: route/onExit/stateful-shell behavior evolved;
- v15/16: case-sensitive URL behavior and typed-route API changes;
- v16.3: `onEnter` added;
- v17: shell navigation observer behavior changed;
- v17.3/17.4: typed `onExit` and nested shell `onExit` fixes.

## 3. Characterize navigation before changing code

Test:

- important URLs;
- browser back;
- redirects;
- shell stacks;
- notification routes;
- custom transitions;
- analytics.

## 4. Update APIs without redesigning routes

Avoid combining:

```text
go_router upgrade
+
URL rename
+
new auth architecture
+
new bottom nav
```

in one migration when possible.

## 5. Run typed-route generator

If used.

## 6. Review navigator observer changes

Especially across v17.

## 7. Test external URLs

Old bookmarks/links are the compatibility target.

## 8. Test web history separately

---
