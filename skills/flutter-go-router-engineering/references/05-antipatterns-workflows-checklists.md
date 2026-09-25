# Anti-patterns, Workflows & Checklists

## Contents

- [Common Anti-Patterns](#common-anti-patterns)
  - [1. Rebuilding `GoRouter` inside frequently rebuilt widget](#1-rebuilding-gorouter-inside-frequently-rebuilt-widget)
  - [2. One giant flat route table](#2-one-giant-flat-route-table)
  - [3. Excessive nesting](#3-excessive-nesting)
  - [4. Navigation directly from Bloc/Cubit business logic](#4-navigation-directly-from-bloccubit-business-logic)
  - [5. Storing BuildContext](#5-storing-buildcontext)
  - [6. Injecting BuildContext](#6-injecting-buildcontext)
  - [7. Using `push` for canonical location](#7-using-push-for-canonical-location)
  - [8. Using `go` when history should stack](#8-using-go-when-history-should-stack)
  - [9. Critical state only in `extra`](#9-critical-state-only-in-extra)
  - [10. Assuming browser refresh always preserves complex `extra`](#10-assuming-browser-refresh-always-preserves-complex-extra)
  - [11. Auth redirects scattered across widgets](#11-auth-redirects-scattered-across-widgets)
  - [12. Network request in redirect](#12-network-request-in-redirect)
  - [13. Redirect loop](#13-redirect-loop)
  - [14. Redirect before auth state resolves](#14-redirect-before-auth-state-resolves)
  - [15. ShellRoute without understanding Navigator ownership](#15-shellroute-without-understanding-navigator-ownership)
  - [16. StatefulShellRoute when no independent stacks are needed](#16-statefulshellroute-when-no-independent-stacks-are-needed)
  - [17. Manual bottom-tab Navigator system when StatefulShellRoute fits](#17-manual-bottom-tab-navigator-system-when-statefulshellroute-fits)
  - [18. Incorrect parent navigator key](#18-incorrect-parent-navigator-key)
  - [19. New GlobalKey every rebuild](#19-new-globalkey-every-rebuild)
  - [20. Navigation from `build`](#20-navigation-from-build)
  - [21. Complex business logic in route builder](#21-complex-business-logic-in-route-builder)
  - [22. Secret in query](#22-secret-in-query)
  - [23. Unvalidated redirect URL](#23-unvalidated-redirect-url)
  - [24. Changing public route casually](#24-changing-public-route-casually)
  - [25. Deep link requires prior screen visit](#25-deep-link-requires-prior-screen-visit)
  - [26. Assuming `extra` is a URL](#26-assuming-extra-is-a-url)
  - [27. Ignoring unknown routes](#27-ignoring-unknown-routes)
  - [28. Parallel routing systems](#28-parallel-routing-systems)
  - [29. Every dialog becomes a route](#29-every-dialog-becomes-a-route)
  - [30. Custom transitions everywhere](#30-custom-transitions-everywhere)
  - [31. Old `GoRouterRefreshStream`](#31-old-gorouterrefreshstream)
  - [32. Old `state.queryParameters`](#32-old-statequeryparameters)
  - [33. Upgrade without migration notes](#33-upgrade-without-migration-notes)
- [New Route Implementation Workflow](#new-route-implementation-workflow)
  - [1. Decide whether the destination should be routable](#1-decide-whether-the-destination-should-be-routable)
  - [2. Define stable URL](#2-define-stable-url)
  - [3. Decide route hierarchy](#3-decide-route-hierarchy)
  - [4. Decide Navigator owner](#4-decide-navigator-owner)
  - [5. Define required path data](#5-define-required-path-data)
  - [6. Define optional query data](#6-define-optional-query-data)
  - [7. Evaluate `extra`](#7-evaluate-extra)
  - [8. Validate external values](#8-validate-external-values)
  - [9. Determine auth/access policy](#9-determine-authaccess-policy)
  - [10. Determine navigation semantics](#10-determine-navigation-semantics)
  - [11. Implement builder](#11-implement-builder)
  - [12. Add `pageBuilder` only if needed](#12-add-pagebuilder-only-if-needed)
  - [13. Handle direct entry](#13-handle-direct-entry)
  - [14. Handle missing resource](#14-handle-missing-resource)
  - [15. Handle unknown URL](#15-handle-unknown-url)
  - [16. Test back](#16-test-back)
  - [17. Test deep link](#17-test-deep-link)
  - [18. Test web](#18-test-web)
  - [19. Test auth states](#19-test-auth-states)
  - [20. Test shell ownership](#20-test-shell-ownership)
  - [21. Review security](#21-review-security)
  - [22. Review analytics](#22-review-analytics)
  - [23. Verify current APIs](#23-verify-current-apis)
- [Existing-Code Review Workflow](#existing-code-review-workflow)
  - [Package](#package)
  - [Router construction](#router-construction)
  - [Keys](#keys)
  - [Route tree](#route-tree)
  - [Paths](#paths)
  - [Names](#names)
  - [Typed routes](#typed-routes)
  - [Redirects](#redirects)
  - [Auth](#auth)
  - [Shells](#shells)
  - [Parameters](#parameters)
  - [Deep links](#deep-links)
  - [Web](#web)
  - [Navigation calls](#navigation-calls)
  - [Observers](#observers)
  - [Tests](#tests)
- [Refactoring Rules](#refactoring-rules)
- [Code Review Checklist](#code-review-checklist)
  - [Router lifecycle](#router-lifecycle)
  - [Route tree](#route-tree)
  - [URL design](#url-design)
  - [Deep links](#deep-links)
  - [Parameters](#parameters)
  - [Auth](#auth)
  - [Navigators](#navigators)
  - [Stack semantics](#stack-semantics)
  - [Errors](#errors)
  - [Security](#security)
  - [State management](#state-management)
  - [Version](#version)
- [Deep-Link Checklist](#deep-link-checklist)
- [Auth Routing Checklist](#auth-routing-checklist)
- [Shell Navigation Checklist](#shell-navigation-checklist)
- [Web Routing Checklist](#web-routing-checklist)
- [Performance Checklist](#performance-checklist)
- [Production Readiness Checklist](#production-readiness-checklist)
  - [Version](#version)
  - [URLs](#urls)
  - [Auth](#auth)
  - [Navigation](#navigation)
  - [Shells](#shells)
  - [Errors](#errors)
  - [Restoration](#restoration)
  - [Web](#web)
  - [State management](#state-management)
  - [Tests](#tests)
- [Quick Reference](#quick-reference)

---

# Common Anti-Patterns

## 1. Rebuilding `GoRouter` inside frequently rebuilt widget

**Bad**

```dart
Widget build(BuildContext context) {
  final router = GoRouter(
    routes: routes,
  );

  return MaterialApp.router(
    routerConfig: router,
  );
}
```

**Why it is problematic**

Router/Navigator state and configuration ownership become unstable.

**Better**

Create and reuse one router.

---

## 2. One giant flat route table

**Bad**

```text
/home
/home-details
/home-edit
/profile
/profile-settings
/profile-password
```

with no meaningful hierarchy.

**Why it is problematic**

Back-stack and URL relationships become harder to understand.

**Better**

Model semantic child routes or feature modules.

---

## 3. Excessive nesting

**Bad**

Every implementation layer becomes a route parent.

**Why it is problematic**

URL and Navigator hierarchy become coupled to code organization.

**Better**

Nest only for real URL/stack relationships.

---

## 4. Navigation directly from Bloc/Cubit business logic

**Bad**

```dart
class LoginCubit extends Cubit<LoginState> {
  LoginCubit(this.router);

  final GoRouter router;

  void success() {
    router.go('/home');
  }
}
```

**Why it is problematic**

Business state becomes navigation-framework dependent.

**Better**

Auth redirect or UI listener handles navigation.

---

## 5. Storing BuildContext

**Bad**

```dart
class NavigationService {
  late BuildContext context;
}
```

**Better**

Use navigation from current presentation context or a narrow router abstraction when truly needed.

---

## 6. Injecting BuildContext

**Bad**

```dart
Repository(
  BuildContext context,
)
```

**Better**

Business/data dependencies should not know UI context.

---

## 7. Using `push` for canonical location

**Bad**

```dart
context.push('/home');
```

after login.

**Why it is problematic**

Previous auth page remains part of stack and web URL behavior may be undesirable.

**Better**

```dart
context.go('/home');
```

---

## 8. Using `go` when history should stack

**Bad**

```dart
context.go('/products/42/edit');
```

if user expects Back → product details → list and route configuration does not establish that hierarchy.

**Better**

Use nested canonical stack or `push`, depending on desired semantics.

---

## 9. Critical state only in `extra`

**Bad**

```dart
context.go(
  '/product',
  extra: product,
);
```

where product ID is absent from URL.

**Better**

```dart
context.go(
  '/products/${product.id}',
  extra: product,
);
```

---

## 10. Assuming browser refresh always preserves complex `extra`

**Bad**

Design requires a complex object to survive because it was passed through `extra`.

**Better**

Route-critical identity lives in path/query. Configure `extraCodec` only for secondary browser-history serialization needs.

---

## 11. Auth redirects scattered across widgets

**Bad**

Every protected page:

```dart
if (!loggedIn) {
  context.go('/login');
}
```

**Better**

Central router policy.

---

## 12. Network request in redirect

**Bad**

```dart
redirect: (_, __) async {
  final user =
      await api.currentUser();

  ...
}
```

**Better**

Observe already-resolved session state.

---

## 13. Redirect loop

**Bad**

Every signed-in route redirects `/home` even when already `/home`.

**Better**

Return `null` when destination is already valid.

---

## 14. Redirect before auth state resolves

**Bad**

Treat `loading` as `signedOut`.

**Why it is problematic**

Cold-start deep links bounce through login incorrectly.

**Better**

Model loading/splash explicitly.

---

## 15. ShellRoute without understanding Navigator ownership

**Bad**

Add ShellRoute only to keep bottom bar visible, then assume each tab has a separate stack.

**Better**

Use `StatefulShellRoute` when independent stacks are required.

---

## 16. StatefulShellRoute when no independent stacks are needed

**Bad**

Two simple top-level views with no nested history each get separate branch Navigators.

**Why it is problematic**

Unnecessary Navigator/state complexity.

**Better**

`ShellRoute` or ordinary routes.

---

## 17. Manual bottom-tab Navigator system when StatefulShellRoute fits

**Bad**

Hand-maintain three `Navigator` widgets, route stacks, browser synchronization, and deep-link branch selection.

**Better**

Use `StatefulShellRoute`.

---

## 18. Incorrect parent navigator key

**Bad**

Full-screen page intended above shell uses branch navigator accidentally.

**Better**

Target root key deliberately.

---

## 19. New GlobalKey every rebuild

**Bad**

```dart
GlobalKey<NavigatorState>()
```

inside `build`.

**Better**

Long-lived final key.

---

## 20. Navigation from `build`

**Bad**

```dart
if (success) {
  context.go('/done');
}
```

**Better**

Listener/effect callback.

---

## 21. Complex business logic in route builder

**Bad**

Builder loads APIs, computes entitlements, mutates repositories.

**Better**

Builder parses route state and constructs the presentation boundary.

---

## 22. Secret in query

**Bad**

```text
/login?refreshToken=...
```

**Better**

Keep credentials in secure session state.

---

## 23. Unvalidated redirect URL

**Bad**

```dart
context.go(
  state.uri.queryParameters['from']!,
);
```

**Better**

Allow-list internal locations.

---

## 24. Changing public route casually

**Bad**

Rename `/orders/:id` because a feature folder changed.

**Better**

Keep URL or provide compatibility redirect.

---

## 25. Deep link requires prior screen visit

**Bad**

Detail screen reads a previous page's in-memory selected object.

**Better**

Load from URL ID.

---

## 26. Assuming `extra` is a URL

**Bad**

Expect copied `/preview` URL to recreate its `extra` object externally.

**Better**

Encode reconstructable data in location.

---

## 27. Ignoring unknown routes

**Bad**

Use default raw error experience in production without product review.

**Better**

Provide safe not-found/error UI.

---

## 28. Parallel routing systems

**Bad**

Canonical pages split arbitrarily between `go_router` and manual Navigator.

**Better**

Use go_router for page-backed navigable destinations; reserve imperative Navigator for pageless/local interactions.

---

## 29. Every dialog becomes a route

**Bad**

`/confirm-delete-item-42` for a temporary confirmation.

**Better**

Use `showDialog` unless URL/restoration semantics are required.

---

## 30. Custom transitions everywhere

**Bad**

Every route gets arbitrary fade/scale animations.

**Better**

Use platform/default behavior unless UX specifically calls for custom motion.

---

## 31. Old `GoRouterRefreshStream`

**Bad**

Copy old code:

```dart
refreshListenable:
    GoRouterRefreshStream(stream)
```

**Better**

Use current `refreshListenable` with an owned `Listenable` adapter.

---

## 32. Old `state.queryParameters`

**Bad**

```dart
state.queryParameters['q']
```

from old pre-v10 tutorials.

**Better**

```dart
state.uri.queryParameters['q']
```

---

## 33. Upgrade without migration notes

**Bad**

Raise major version and fix compiler errors until it builds.

**Better**

Review routing semantics and regression tests first.

---

# New Route Implementation Workflow

## 1. Decide whether the destination should be routable

Ask:

- should it have URL identity?
- deep link?
- browser history?
- notification entry?
- state restoration?

## 2. Define stable URL

Prefer:

```text
/products/:id
/settings/security
/users/:id
```

Avoid implementation naming:

```text
/productBlocScreen2
```

## 3. Decide route hierarchy

Choose:

- root;
- child;
- ShellRoute;
- StatefulShellRoute branch.

## 4. Decide Navigator owner

Ask:

- root?
- shell?
- branch?
- above shell?

## 5. Define required path data

Use path for resource identity.

## 6. Define optional query data

Use query for externally reproducible optional state.

## 7. Evaluate `extra`

Use only as secondary/transient information.

## 8. Validate external values

Format, bounds, enum membership, return URL.

## 9. Determine auth/access policy

Global auth redirect vs local route restriction.

## 10. Determine navigation semantics

Choose:

- `go`;
- `push`;
- `replace`;
- `pushReplacement`.

## 11. Implement builder

Keep it synchronous and predictable.

## 12. Add `pageBuilder` only if needed

Transitions/restoration/fullscreen config.

## 13. Handle direct entry

Pretend browser launches directly on this URL.

## 14. Handle missing resource

Inside page/domain state.

## 15. Handle unknown URL

Router error experience.

## 16. Test back

Mobile/system/nested.

## 17. Test deep link

Direct initial route.

## 18. Test web

If supported:

- URL;
- refresh;
- history.

## 19. Test auth states

Loading/out/in.

## 20. Test shell ownership

If nested.

## 21. Review security

No secrets/open redirects.

## 22. Review analytics

Use redacted/stable naming.

## 23. Verify current APIs

Check installed version/changelog.

---

# Existing-Code Review Workflow

Before modifying an existing routing architecture, inspect:

## Package

```text
go_router version
go_router_builder version
Flutter version
Dart version
```

## Router construction

Find:

```text
GoRouter(
GoRouter.routingConfig
MaterialApp.router
CupertinoApp.router
```

Determine lifecycle.

## Keys

Inventory:

```text
root navigator key
shell keys
branch keys
parentNavigatorKey
```

## Route tree

Draw it.

Do not refactor from a flat code listing alone.

## Paths

Identify external/public routes.

## Names

Determine whether named routes are consistently used.

## Typed routes

Inspect generated source and annotations.

## Redirects

Map:

```text
onEnter
top redirect
shell redirect
GoRoute redirect
onExit
```

## Auth

Determine:

- auth states;
- refresh mechanism;
- return URL;
- loop prevention.

## Shells

Identify one-stack vs multi-stack expectations.

## Parameters

Find:

```text
pathParameters
uri.queryParameters
extra
```

## Deep links

Inventory:

- app links;
- universal links;
- notification destinations;
- web links.

## Web

Inspect:

- hash/path strategy;
- server rewrite;
- subpath base href.

## Navigation calls

Search:

```text
context.go
context.push
context.replace
context.pushReplacement
Navigator.push
showDialog
```

## Observers

Review root/branch duplication.

## Tests

Identify direct deep-link and branch-stack coverage.

Only then refactor.

---

# Refactoring Rules

1. Preserve external paths unless intentionally migrating them.
2. Add compatibility redirects before removing old URLs.
3. Preserve browser-history semantics.
4. Preserve back-stack semantics.
5. Preserve branch ownership.
6. Keep navigator keys stable.
7. Characterize auth redirects before changing them.
8. Do not replace every `Navigator.push` mechanically with `context.go`.
9. Decide `go` vs `push` from UX semantics.
10. Move route-critical `extra` into path/query before removing old state.
11. Test deep links before and after.
12. Test notification routes.
13. Verify analytics route names.
14. Migrate imperative pages incrementally.
15. Keep route and networking/business refactors separate when possible.
16. Run code generation after typed-route changes.
17. Use golden/widget tests for transition changes.
18. Check changelog for every major package change.

---

# Code Review Checklist

## Router lifecycle

- [ ] One stable `GoRouter`.
- [ ] Stable root navigator key.
- [ ] Router disposed by owner where appropriate.
- [ ] Auth/theme rebuild does not recreate router.

## Route tree

- [ ] Hierarchy matches navigation semantics.
- [ ] Nesting not excessive.
- [ ] Persistent chrome uses correct shell type.
- [ ] Independent branches use StatefulShellRoute only when needed.

## URL design

- [ ] Paths are meaningful.
- [ ] Public paths stable.
- [ ] Case convention consistent.
- [ ] No implementation details leak.

## Deep links

- [ ] Important destinations support direct entry.
- [ ] Required state exists in path/query.
- [ ] No hidden dependency on previous page.

## Parameters

- [ ] Path values validated.
- [ ] Query values validated/defaulted.
- [ ] URLs constructed safely.
- [ ] `extra` is secondary only when appropriate.

## Auth

- [ ] Loading state represented.
- [ ] Protected redirect centralized.
- [ ] Login redirect loop impossible.
- [ ] Return URL validated.
- [ ] Logout re-evaluates routing.

## Navigators

- [ ] Parent navigator key correct.
- [ ] Branch keys stable.
- [ ] Global route really appears above shell.
- [ ] Shell route really belongs inside shell.

## Stack semantics

- [ ] `go` vs `push` intentional.
- [ ] Replacement API intentional.
- [ ] Back returns where expected.
- [ ] Browser semantics tested when relevant.

## Errors

- [ ] Unknown URL handled.
- [ ] Resource 404 not confused with route 404.
- [ ] Raw exception hidden from users.

## Security

- [ ] No secrets in URLs.
- [ ] External redirect targets validated.
- [ ] Analytics redacts sensitive parameters.
- [ ] Auth redirect not treated as server authorization.

## State management

- [ ] Business logic does not require BuildContext.
- [ ] Navigation side effects occur outside build.
- [ ] Router re-evaluation uses stable state.

## Version

- [ ] Current API verified.
- [ ] Migration notes checked.
- [ ] Old `GoRouterRefreshStream` absent.
- [ ] Old state parameter APIs absent.

---

# Deep-Link Checklist

- [ ] Platform association configured.
- [ ] Android app link verified if applicable.
- [ ] iOS universal link verified if applicable.
- [ ] Web direct URL works.
- [ ] Path/query values reconstruct page.
- [ ] Auth deep link preserves destination.
- [ ] Cold start works.
- [ ] Warm-app link works.
- [ ] Invalid ID handled.
- [ ] Unknown path handled.
- [ ] Browser refresh works.
- [ ] Notification link uses same route.
- [ ] No reliance on `extra`.
- [ ] Public URL migration strategy exists.
- [ ] Deep-link validator used where useful.

---

# Auth Routing Checklist

- [ ] States include unresolved/loading.
- [ ] Signed-out protected route redirects.
- [ ] Login route itself does not loop.
- [ ] Signed-in login route redirects appropriately.
- [ ] Return destination encoded safely.
- [ ] Return destination allow-listed.
- [ ] Auth changes trigger router refresh.
- [ ] No network request in every redirect.
- [ ] Logout removes access to protected route.
- [ ] Backend still enforces authorization.
- [ ] Redirect tests cover every auth state.
- [ ] `redirectLimit` not reached.

---

# Shell Navigation Checklist

- [ ] `ShellRoute` chosen for one nested stack.
- [ ] `StatefulShellRoute` chosen only for independent stacks.
- [ ] Branch routes are unique.
- [ ] Branch navigator keys stable.
- [ ] `goBranch` used for branch switching.
- [ ] Active-tab reset behavior intentional.
- [ ] Direct branch deep links work.
- [ ] Global/full-screen route targets root Navigator intentionally.
- [ ] Back pops active branch correctly.
- [ ] Branch restoration requirement understood.
- [ ] Branch `preload` justified.
- [ ] Root/branch observers do not double-count analytics.
- [ ] Branch-switch transitions tested if custom.

---

# Web Routing Checklist

- [ ] Hash vs path strategy selected intentionally.
- [ ] Path strategy has server rewrite to `index.html`.
- [ ] `<base href>` correct for subpath deployment.
- [ ] Direct URL refresh works.
- [ ] Browser Back works.
- [ ] Browser Forward works.
- [ ] `push` behavior understood.
- [ ] `routerNeglect` not hiding a bug.
- [ ] `extra` not required for reproducible location.
- [ ] Sensitive query/path data avoided.
- [ ] Deep links are valid without prior navigation.
- [ ] Static hosting/CDN fallback tested in production-like environment.

---

# Performance Checklist

- [ ] Router not recreated on rebuild.
- [ ] Redirects perform local deterministic checks.
- [ ] No network/database work in route builders.
- [ ] No unnecessary nested Navigators.
- [ ] Stateful branches not preloaded without reason.
- [ ] Shell scaffold rebuild scope reasonable.
- [ ] Custom transitions profiled if expensive.
- [ ] Observer/analytics work lightweight.
- [ ] Dynamic RoutingConfig used only when needed.
- [ ] Route generation not used solely as speculative optimization.
- [ ] Navigation latency measured before route-tree micro-optimization.

---

# Production Readiness Checklist

## Version

- [ ] Installed `go_router` version known.
- [ ] Current API used.
- [ ] `go_router_builder` compatible if used.
- [ ] Migration notes reviewed.

## URLs

- [ ] Stable.
- [ ] Meaningful.
- [ ] Deep-linkable.
- [ ] Case convention stable.
- [ ] Secrets absent.

## Auth

- [ ] Redirect deterministic.
- [ ] Loading handled.
- [ ] No loops.
- [ ] Return target safe.
- [ ] Logout tested.

## Navigation

- [ ] `go`/`push` semantics intentional.
- [ ] Back tested.
- [ ] Browser history tested.
- [ ] Replacement operations correct.

## Shells

- [ ] Correct shell type.
- [ ] Branch stacks preserved.
- [ ] Root escape routes correct.
- [ ] Tab reset behavior intentional.

## Errors

- [ ] Unknown URLs have production-safe UI.
- [ ] Malformed parameters handled.
- [ ] Domain 404 separate.

## Restoration

- [ ] Required restoration IDs configured.
- [ ] Stateful branch memory preservation not mistaken for process restoration.

## Web

- [ ] URL strategy configured.
- [ ] Hosting rewrites configured.
- [ ] Direct refresh tested.

## State management

- [ ] No BuildContext in business services.
- [ ] No navigation from build.
- [ ] Router observes stable app state.

## Tests

- [ ] Direct route entry.
- [ ] Redirect matrix.
- [ ] Deep links.
- [ ] Branch stacks.
- [ ] Back.
- [ ] Error route.
- [ ] Web/history where applicable.

---

# Quick Reference

| Situation | Preferred approach |
|---|---|
| Tiny mobile app with trivial navigation | Consider plain Navigator |
| Web/deep-link-heavy app | `go_router` |
| Canonical location change | `go` |
| Add temporary/details page to stack | `push` |
| Return with optional result | `pop(result)` |
| Replace top with same page identity | `replace` |
| Replace top with new page identity | `pushReplacement` |
| Build path with optional parameters | Dart `Uri` |
| Stable required resource identity | Path parameter |
| Optional externally reproducible state | Query parameter |
| Non-serializable/transient supplementary object | `extra` |
| State required after external deep link | Never rely only on `extra` |
| Many typed path/query params | Consider `go_router_builder` |
| Simple page | `GoRoute.builder` |
| Custom page/transition/restoration | `pageBuilder` |
| Custom route transition | `CustomTransitionPage` |
| No transition | `NoTransitionPage` |
| Persistent chrome + one nested stack | `ShellRoute` |
| Bottom nav with independent stacks | `StatefulShellRoute.indexedStack` |
| Custom branch switching animation | `StatefulShellRoute` + custom container |
| Switch branch and restore previous stack | `navigationShell.goBranch(index)` |
| Tap active tab to reset branch | `goBranch(..., initialLocation: true)` |
| Page inside shell | Branch/shell Navigator |
| Page above entire shell | `parentNavigatorKey` → root key |
| Protected route | Central redirect policy |
| Hard navigation guard | `onEnter` + `Allow` / `Block` |
| Auth state unresolved | Splash/loading route |
| Auth state changes | `refreshListenable` or inherited dependency |
| Old `GoRouterRefreshStream` tutorial | Do not use |
| Redirect target | Return location or `null` |
| Redirect loop | Fix conditions; do not raise limit |
| Unknown URL | `errorBuilder`/`errorPageBuilder`/`onException` |
| Programming route config error | Fix code; do not hide |
| Resource doesn't exist | Page/repository 404 state |
| Deep-link page | Must construct independently |
| Initial fallback route | `initialLocation` |
| Force initial location over platform deep link | `overridePlatformDefaultLocation: true`, only intentionally |
| Android app link | Platform setup + same go_router route |
| iOS universal link | Platform setup + same go_router route |
| Web hash URL | Default Flutter web strategy |
| Web path URL | `usePathUrlStrategy` + server rewrite |
| Disable one browser-history entry | `Router.neglect` |
| Pageless temporary dialog | `showDialog` |
| Route-driven modal | GoRoute + Page/fullscreenDialog |
| Dirty form predictive back | `PopScope` |
| Route exit guard | `GoRoute.onExit` |
| State restoration | `restorationScopeId` + page restoration IDs |
| Stateful branch restoration | Shell + branch restoration scopes |
| Route analytics | Stable route name/template; redact params |
| External return URL | Validate/allow-list |
| Secret/token | Keep out of ordinary URL |
| Navigation after Bloc success | UI listener |
| Authentication change | Router redirect re-evaluation |
| Dynamic route table | `GoRouter.routingConfig`, only when table truly changes |
| Router in widget build | Avoid |
| Navigator keys | Create once and reuse |
| Public path rename | Compatibility redirect |
| Notification destination | Use normal canonical route |
| Package upgrade | Read every intervening migration/changelog |

Before accepting a routing change, verify:

```text
Is this destination actually routable?
↓
Does it have a stable canonical URL?
↓
Can it be entered directly?
↓
Are required parameters encoded in the URL?
↓
Are those parameters validated?
↓
Is the correct Navigator responsible?
↓
Is GoRoute / ShellRoute / StatefulShellRoute correct?
↓
Are go / push / replacement semantics intentional?
↓
Can auth redirect without looping?
↓
Will browser back/forward behave correctly?
↓
Are external redirect targets safe?
↓
Are sensitive values excluded from URLs?
↓
Does system/browser back behave correctly?
↓
Are direct deep-link and auth cases tested?
↓
Is the code using the current go_router API?
```

If any answer is unknown, treat the navigation implementation as incomplete rather than assuming successful in-app button navigation proves the route architecture is correct.
