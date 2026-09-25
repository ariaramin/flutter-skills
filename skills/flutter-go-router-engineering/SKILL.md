---
name: flutter-go-router-engineering
description: Design, implement, review, debug, secure, test, migrate, and optimize Flutter navigation with go_router. Use whenever a Flutter task involves route trees, URLs, deep links, browser history, GoRoute, ShellRoute, StatefulShellRoute, bottom navigation with independent stacks, path/query parameters, extra, go vs push semantics, redirects, onEnter guards, authentication routing, nested Navigators, parentNavigatorKey, transitions, PopScope/onExit, error routes, restoration, typed routes with go_router_builder, notification routes, route analytics, or migration from Navigator/older go_router APIs—even when framed as auth flow, tabs, back-button bugs, web routing, or deep-link problems.
compatibility: The supplied research baseline targets go_router 17.4.0 and go_router_builder 4.4.x. Inspect the repository's actual Flutter, Dart, go_router, builder, platform-linking, web-hosting, and generated-code versions before applying version-sensitive APIs or migration advice.
---

# Flutter go_router Engineering
Use `go_router` as a URL-aware navigation architecture, not as a mechanical replacement for every `Navigator` call.
## Non-negotiable rules
1. Inspect the current router, package versions, route tree, keys, redirects, shells, deep-link setup, web strategy, and tests before editing.
2. Treat externally visible URLs as compatibility contracts.
3. Keep one stable `GoRouter` instance and stable navigator keys.
4. Keep route builders synchronous, predictable, and cheap.
5. Put route-critical identity in path/query data, not only in `extra`.
6. Validate path/query values as external input.
7. Keep secrets out of ordinary URLs and route telemetry.
8. Use `go` for canonical location changes; use `push` only for intentional stack history.
9. Use `ShellRoute` for one nested stack under persistent chrome.
10. Use `StatefulShellRoute` only for genuinely independent branch stacks.
11. Use `parentNavigatorKey` only to express intentional Navigator ownership.
12. Centralize global authentication routing.
13. Model auth loading separately from signed-out state.
14. Keep redirects deterministic and based on already-available state.
15. Do not perform network/database work in redirect callbacks or route builders.
16. Keep Bloc/Cubit/domain code independent of `BuildContext` and `GoRouter` where practical.
17. Trigger navigation effects outside `build()`.
18. Make important destinations work by direct cold entry.
19. Distinguish routing errors from resource/network/authorization failures.
20. Test browser history separately on Flutter Web.
21. Use current `PopScope`, not deprecated `WillPopScope`, for page-level back interception.
22. Do not confuse branch persistence with process state restoration.
23. Use typed routes only when generated type safety offsets build-system complexity.
24. Read migration notes before major `go_router` upgrades.
25. Test URLs and navigation state, not only button taps.
## Reference routing
The complete supplied guide is preserved in `references/`. Read only the relevant file:
- `references/01-routing-url-fundamentals.md` — route tree, paths, parameters, `extra`, named routes, navigation methods, browser history, deep links, web URLs.
- `references/02-auth-shell-navigation.md` — redirects, `onEnter`, auth, route refresh, state-management integration, shells, bottom navigation, nested Navigators, keys.
- `references/03-pages-restoration-typed-security.md` — pages, transitions, dialogs, back, errors, loading, initial location, restoration, typed routes, DI, observers, analytics, URL stability, notifications, security, performance.
- `references/04-testing-debugging-migration.md` — direct-route tests, redirect matrices, shell/web/restoration tests, debugging, upgrades.
- `references/05-antipatterns-workflows-checklists.md` — full anti-pattern catalog, implementation/refactor/review workflows, production checklists.
If repository behavior conflicts with the research baseline, verify the installed package and preserve working current semantics unless intentionally migrating them.
# Engineering workflow
## 1. Inspect before editing
Record:
```text
Flutter/Dart versions
go_router/go_router_builder versions
router construction owner
root/shell/branch navigator keys
route tree and public paths
onEnter / redirects / onExit
path/query/extra usage
go/push/replace/Navigator usage
deep-link platform setup
web hash/path strategy + hosting rewrites
restoration IDs
route observers/analytics
generated route code
routing tests
```
Search for:
```text
GoRouter(
GoRoute(
ShellRoute(
StatefulShellRoute
context.go / context.push
Navigator.push
parentNavigatorKey
refreshListenable
onEnter / redirect / onExit
pathParameters
uri.queryParameters
extra
TypedGoRoute / GoRouteData
```
Draw the actual URL and Navigator hierarchy before restructuring it.
## 2. Decide whether the destination is routable
Use a route when the destination benefits from URL identity, deep linking, browser history, notification entry, restoration, or canonical app navigation.
Keep temporary non-addressable UI such as ordinary confirmations as dialogs/bottom sheets when route semantics add no value.
## 3. Define the canonical URL first
Prefer semantic routes:
```text
/products/:productId
/orders/:orderId
/settings/security
/search?q=flutter&page=2
```
Avoid implementation names such as `/productBlocScreen2`.
Preserve exposed URLs. When changing one, add a compatibility redirect before removing the old path.
Use one casing convention. Do not model distinct resources by trailing slash alone.
## 4. Put data in the correct channel
Use path parameters for required resource identity.
Use query parameters for optional state that should survive refresh, sharing, bookmarking, and browser history.
Use `extra` only for secondary/transient information.
Preferred pattern:
```text
/products/42
path → productId=42
extra → optional prefetched Product(42)
```
The route must remain functional if `extra` is missing.
Build encoded locations with `Uri` rather than ad-hoc query concatenation.
## 5. Validate route input
Validate external path/query data for:
```text
presence
length
format
numeric range
enum membership
allowed internal return destination
```
Treat route guards as UX/navigation policy, not backend authorization.
For `from`/return URLs, reject schemes, authorities, external hosts, and unrecognized paths.
## 6. Choose route hierarchy and Navigator ownership
Use nested `GoRoute` when parent and child belong to one logical stack.
Use `ShellRoute` for persistent chrome plus one nested Navigator.
Use `StatefulShellRoute` when branches need independent stacks, e.g.:
```text
Home:    /home → /home/details/42
Search:  /search → /search/results/7
Profile: /profile → /profile/settings
```
For every page decide whether it belongs to root, shell, branch, or an explicit ancestor Navigator.
Use a root `parentNavigatorKey` only when a child intentionally needs to appear above the shell.
Never create Navigator keys in `build()`.
## 7. Choose `go`, `push`, and replacement semantics deliberately
Use:
```text
go                 canonical destination / configured stack
push               add page above current stack
pop(result)         return with optional result
replace             replace top with preserved page identity semantics
pushReplacement     replace top with new page identity
```
Typical intent:
```text
login → home                    go
list → detail                   push or canonical nested navigation
 detail → edit                  push
temporary step → final screen   pushReplacement
```
On Web, use canonical URL-driven navigation for locations that must survive sharing/reload. Test imperative `push` behavior in a browser rather than assuming mobile semantics.

## 8. Build authentication routing from stable state

Model at least:

```text
loading
signedOut
signedIn
```

Use this flow:

```text
requested route
↓
auth unresolved → splash/loading
↓
signed out + protected → /login?from=<validated internal route>
↓
signed in + login/splash → safe return target or home
↓
otherwise allow
```

Use top-level redirect for app-wide auth policy.

Use route-level redirect for route/subtree rewrites.

Use `onEnter` when the requirement is to block an attempt rather than map A → B.

Return `null` when no redirect is required. Ensure the redirect destination is exempt from the source condition. Never raise `redirectLimit` to hide loops.

Do not call auth/network APIs from every redirect evaluation; observe already-resolved session state.

## 9. Re-evaluate routing without rebuilding the router

Use the installed version's supported mechanisms such as `refreshListenable`, inherited dependencies, or explicit `router.refresh()` where justified.

If state is exposed as a Stream, adapt it to a long-lived `Listenable` with deterministic disposal.

Do not reintroduce removed `GoRouterRefreshStream` patterns from old tutorials.

## 10. Keep routing at the presentation/composition boundary

Route builder:

```text
parse/validate route state
construct presentation boundary
```

Feature state/repository:

```text
load resource
handle domain state
perform business work
```

Prefer:

```text
Cubit emits success(orderId)
UI listener performs navigation
```

Avoid injecting `BuildContext` or `GoRouter` into ordinary repositories/use cases/Blocs.

## 11. Implement shell navigation intentionally

For `StatefulShellRoute`:

- switch with `navigationShell.goBranch(index)`;
- preserve branch history by default;
- use `initialLocation: true` only when reset-to-root UX is intentional;
- deep link directly to the canonical destination in another branch;
- preload branches only when measured first-switch latency justifies memory cost;
- test root and branch observers for duplicate analytics.

Do not emulate branch switching by manually composing multiple unrelated Navigator systems when the stateful shell already fits the requirement.

## 12. Use `builder` vs `pageBuilder` correctly

Use `builder` by default.

Use `pageBuilder` only for Page-level behavior such as:

```text
custom transition
fullscreenDialog
restorationId
special Page configuration
```

For custom pages, preserve `state.pageKey` unless different identity is intentional.

Prefer default platform transitions unless product UX requires custom motion. Profile expensive transition effects.

Keep ordinary temporary dialogs pageless unless they need URL/history/restoration semantics.

## 13. Handle back and exit policy at the right layer

Use normal router/Navigator back behavior for ordinary routes.

Use `PopScope` for page-level interception such as dirty forms and predictive-back-compatible behavior.

Use `GoRoute.onExit` for route-level removal policy when appropriate.

Do not independently wire both to show duplicate confirmations.

Test system back, app-bar back, branch back, shell exit, and browser Back/Forward.

## 14. Separate navigation errors from domain failures

```text
unknown path                  → router error/not-found UI
matched product path, no row  → product/resource not-found state
known resource, no access     → authorization/access state
valid route, request failed   → page network/retry state
```

Do not route every failure to `/404`.

Do not expose raw routing exception strings to production users.

## 15. Design direct entry and deep links

For every important route ask:

```text
Can the app launch cold directly here?
Can the page reconstruct from URL + services?
Does it depend on a prior page setting selected state?
```

If prior navigation is required, the deep-link architecture is incomplete.

Remember that Android App Links and iOS Universal Links require platform association configuration outside the `go_router` route table.

## 16. Treat Flutter Web as a separate surface

Select hash vs path strategy intentionally.

For path URLs ensure:

```text
usePathUrlStrategy()
server/CDN fallback to index.html
correct base href under subpath hosting
```

Test direct URL, reload, Back, Forward, query changes, and branch URLs in production-like hosting.

A server 404 after refreshing `/products/42` is usually a hosting rewrite problem, not route matching.

## 17. Add restoration only when required

Do not confuse keeping branch Navigators alive with restoration after process death.

When restoration is required, configure the router, shell, branch, and custom Page restoration IDs required by the installed APIs and test actual restoration behavior.

## 18. Use typed routes when they reduce meaningful risk

Consider `go_router_builder` for large/shared route surfaces with many typed path/query parameters.

Keep route-critical identity out of typed `$extra` for the same reason as untyped `extra`.

Never edit generated routing code manually.

After typed-route source changes, run the repository's generation workflow, commonly:

```bash
dart run build_runner build
```

## 19. Secure route analytics

Prefer stable names/templates:

```text
product_details
settings_security
/products/:productId
```

Do not send raw URLs containing user IDs, search terms, email addresses, reset tokens, or sensitive filters unless an explicit redaction/privacy policy permits it.

## 20. Optimize only measured routing costs

Investigate performance only when evidence points to:

```text
router reconstruction
expensive redirects
heavy route builders
unnecessary nested Navigators
branch preloading
custom transition rendering
observer/analytics work
```

Do not micro-optimize path matching without measured navigation latency.

# Validation gates

## Route and URL behavior

- [ ] Important routes support direct entry.
- [ ] Required identity is in path/query state.
- [ ] Path/query validation handles malformed input.
- [ ] Public path changes preserve compatibility.
- [ ] Unknown path and resource-not-found are distinct.

## Auth routing

Cover at least:

```text
loading + protected → splash
signed out + protected → login + safe from
signed out + login → login
signed in + login → home/safe from
signed in + protected → stays
logout while protected → signed-out route
invalid from → safe fallback
```

Valid flows must never hit redirect-limit errors.

## Stateful shell

Test:

1. push inside branch A;
2. switch to B;
3. push inside B;
4. switch back to A and preserve A stack;
5. verify active-tab reset behavior if implemented;
6. deep link directly into B;
7. verify active branch and back behavior.

## Web

Use browser/integration coverage for history-sensitive behavior. Widget tests cannot prove production server rewrites.

## Restoration

Test process restoration separately when required.

# Migration workflow

For a `go_router` upgrade:

1. Record installed Flutter/Dart/router/builder versions.
2. Read every intervening changelog/migration guide.
3. Capture baseline public URLs, auth redirects, back behavior, shells, web history, observers, and deep links.
4. Update APIs without simultaneously redesigning routes unless necessary.
5. Regenerate typed routes.
6. Re-check shell/observer behavior.
7. Test old external URLs and compatibility redirects.
8. Test browser history separately.
9. Remove obsolete APIs rather than wrapping them indefinitely.

Treat these patterns as version-warning signs:

```text
GoRouterRefreshStream
old state.queryParameters
GoRouter.location assumptions
WillPopScope route guards
pre-current shell observer assumptions
```

Verify the installed-version replacement before editing.

# Reject these anti-patterns

- Recreating `GoRouter` or navigator keys during rebuilds.
- Navigating from `build()`.
- Storing/injecting `BuildContext` in business layers.
- Network/database work inside redirects or route builders.
- Critical identity stored only in `extra`.
- Scattered page-level auth redirects.
- `ShellRoute` used while expecting independent tab stacks.
- `StatefulShellRoute` used without an independent-stack requirement.
- Secrets placed in query/path data.
- External `from` URLs trusted without validation.
- Deep-linked pages that require prior in-app navigation.
- Public paths renamed because implementation folders changed.
- Canonical app pages split arbitrarily between go_router and manual Navigator stacks.
- Every dialog turned into a route.
- Custom transitions applied everywhere without UX/performance reason.
- Raw router exceptions exposed to users.
- Major upgrades performed by compiler-error whack-a-mole.

Read `references/05-antipatterns-workflows-checklists.md` for all supplied anti-patterns and detailed review checklists.

# Production Definition of Done

- [ ] Stable router and navigator-key ownership.
- [ ] Route tree matches URL and Navigator semantics.
- [ ] Correct `GoRoute` / `ShellRoute` / `StatefulShellRoute` choice.
- [ ] Canonical URLs are meaningful, stable, and deep-linkable.
- [ ] Route-critical values are reconstructable and validated.
- [ ] `go`/`push`/replacement semantics match UX and browser history.
- [ ] Auth loading, signed-out, and signed-in routing are deterministic and loop-free.
- [ ] Return URLs are internal and allow-listed.
- [ ] Secrets are absent from URLs and route analytics.
- [ ] Backend authorization remains independent from route guards.
- [ ] Root/shell/branch Navigator ownership is intentional.
- [ ] Direct cold entry works for important destinations.
- [ ] Platform deep-link association is configured separately.
- [ ] Browser direct refresh/back/forward works when Web is supported.
- [ ] Unknown-route, domain-not-found, forbidden, and network failures are distinct.
- [ ] Restoration is configured/tested only where required.
- [ ] Typed generated code is current where used.
- [ ] Direct-route, auth, shell, back, and error tests cover critical paths.
- [ ] Installed-version migration notes were reviewed.

# Final decision rule

Before accepting a routing change, answer:

```text
What is the canonical URL?
Can it be entered directly?
Which data belongs in path/query vs extra?
How is external input validated?
Which Navigator owns the page?
Why this route/shell type?
Why go vs push vs replacement?
What happens from a cold authenticated/unauthenticated deep link?
What happens on system/browser back?
Are return targets, URLs, and analytics safe?
How are router errors distinguished from domain failures?
Which tests prove these semantics?
```

If those answers are unclear, the routing design is not finished.
