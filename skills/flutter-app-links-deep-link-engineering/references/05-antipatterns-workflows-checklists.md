# Anti-patterns, implementation/review/refactoring workflows, checklists, quick reference and final rules

## Contents

- [Common Anti-Patterns](#common-anti-patterns)
  - [Creating `AppLinks()` and listeners in every widget](#creating-applinks-and-listeners-in-every-widget)
  - [Multiple global link subscriptions](#multiple-global-link-subscriptions)
  - [Not canceling owned subscriptions](#not-canceling-owned-subscriptions)
  - [Handling links inside `build`](#handling-links-inside-build)
  - [Manual URL splitting](#manual-url-splitting)
  - [Trusting every HTTPS host](#trusting-every-https-host)
  - [`startsWith()` domain security](#startswith-domain-security)
  - [Arbitrary redirect URL](#arbitrary-redirect-url)
  - [Passing raw URI strings throughout the app](#passing-raw-uri-strings-throughout-the-app)
  - [Executing destructive actions from the callback](#executing-destructive-actions-from-the-callback)
  - [Assuming possession means authorization](#assuming-possession-means-authorization)
  - [Logging reset tokens](#logging-reset-tokens)
  - [Sensitive custom scheme without threat analysis](#sensitive-custom-scheme-without-threat-analysis)
  - [Assuming Android intent filters are verified](#assuming-android-intent-filters-are-verified)
  - [Wrong Android signing fingerprint](#wrong-android-signing-fingerprint)
  - [Assuming Universal Links always open the app](#assuming-universal-links-always-open-the-app)
  - [Routing before startup is ready](#routing-before-startup-is-ready)
  - [Losing destination during login](#losing-destination-during-login)
  - [Reusing pending destination without revalidation](#reusing-pending-destination-without-revalidation)
  - [Processing the same link twice](#processing-the-same-link-twice)
  - [app_links plus router platform handling simultaneously](#applinks-plus-router-platform-handling-simultaneously)
  - [Long-lived BuildContext in service](#long-lived-buildcontext-in-service)
  - [Giant unchecked route chain](#giant-unchecked-route-chain)
  - [Silently ignoring malformed user-facing links](#silently-ignoring-malformed-user-facing-links)
  - [Assuming app_links verifies domains](#assuming-applinks-verifies-domains)
  - [Assuming app_links provides deferred install links](#assuming-applinks-provides-deferred-install-links)
  - [Adding app_links when go_router already solves the requirement](#adding-applinks-when-gorouter-already-solves-the-requirement)
- [New Deep-Link Implementation Workflow](#new-deep-link-implementation-workflow)
  - [1. Identify external use cases](#1-identify-external-use-cases)
  - [2. Decide whether app_links is required](#2-decide-whether-applinks-is-required)
  - [3. Determine platforms](#3-determine-platforms)
  - [4. Select URI mechanism](#4-select-uri-mechanism)
  - [5. Design the public URI contract](#5-design-the-public-uri-contract)
  - [6. Define origin allowlists](#6-define-origin-allowlists)
  - [7. Configure platform association](#7-configure-platform-association)
  - [8. Configure hosting](#8-configure-hosting)
  - [9. Create one app-scoped intake](#9-create-one-app-scoped-intake)
  - [10. Decide initial-link strategy](#10-decide-initial-link-strategy)
  - [11. Parse into `Uri`](#11-parse-into-uri)
  - [12. Validate origin](#12-validate-origin)
  - [13. Validate route shape](#13-validate-route-shape)
  - [14. Convert to typed intent](#14-convert-to-typed-intent)
  - [15. Resolve app readiness](#15-resolve-app-readiness)
  - [16. Resolve authentication](#16-resolve-authentication)
  - [17. Resolve authorization](#17-resolve-authorization)
  - [18. Deduplicate](#18-deduplicate)
  - [19. Navigate through one router](#19-navigate-through-one-router)
  - [20. Provide failure UX](#20-provide-failure-ux)
  - [21. Add redacted telemetry](#21-add-redacted-telemetry)
  - [22. Unit-test parser](#22-unit-test-parser)
  - [23. Integration-test coordinator](#23-integration-test-coordinator)
  - [24. Test cold start](#24-test-cold-start)
  - [25. Test runtime delivery](#25-test-runtime-delivery)
  - [26. Test auth deferral](#26-test-auth-deferral)
  - [27. Test production associations](#27-test-production-associations)
- [Existing-Code Review Workflow](#existing-code-review-workflow)
- [Refactoring Rules](#refactoring-rules)
- [Code Review Checklist](#code-review-checklist)
- [Android Checklist](#android-checklist)
- [iOS Checklist](#ios-checklist)
- [Security Checklist](#security-checklist)
- [Auth Deep-Link Checklist](#auth-deep-link-checklist)
- [Testing Checklist](#testing-checklist)
- [Production Readiness Checklist](#production-readiness-checklist)
- [Quick Reference](#quick-reference)
- [Final Engineering Rule](#final-engineering-rule)

---

# Common Anti-Patterns

## Creating `AppLinks()` and listeners in every widget

**Bad**

```dart
@override
void initState() {
  super.initState();

  AppLinks().uriLinkStream.listen((uri) {
    // navigate
  });
}
```

across multiple screens.

**Why it is problematic**

`AppLinks` is singleton-backed, but each Dart stream listener can still receive events and independently trigger navigation.

**Better**

Create one app-scoped coordinator.

---

## Multiple global link subscriptions

**Bad**

```dart
authLinks.start();
navigationLinks.start();
analyticsLinks.start();
```

where each independently subscribes to `uriLinkStream`.

**Why it is problematic**

Multiple components can process the same event.

**Better**

```text
one subscription
↓
one parse/validation
↓
dispatch typed event to interested components
```

---

## Not canceling owned subscriptions

**Bad**

```dart
_subscription = AppLinks().uriLinkStream.listen(...);

// never canceled
```

for a finite-lifetime service/widget.

**Better**

```dart
await _subscription?.cancel();
```

---

## Handling links inside `build`

**Bad**

```dart
Widget build(BuildContext context) {
  AppLinks().uriLinkStream.listen(...);
  return const Scaffold();
}
```

**Why it is problematic**

Every rebuild can add processing paths.

**Better**

Subscribe in stable lifecycle initialization.

---

## Manual URL splitting

**Bad**

```dart
final id = url.split('/').last;
```

**Why it is problematic**

Breaks on query strings, encoding, trailing separators, and alternate URI forms.

**Better**

```dart
final uri = Uri.tryParse(url);
final segments = uri?.pathSegments;
```

---

## Trusting every HTTPS host

**Bad**

```dart
if (uri.scheme == 'https') {
  router.go(uri.path);
}
```

**Why it is problematic**

Any website can craft an HTTPS URL.

**Better**

Require exact allowlisted hosts.

---

## `startsWith()` domain security

**Bad**

```dart
if (raw.startsWith('https://example.com')) {
```

**Why it is problematic**

Look-alike domains can pass prefix checks.

**Better**

```dart
uri.scheme == 'https' &&
uri.host == 'example.com'
```

---

## Arbitrary redirect URL

**Bad**

```dart
router.go(uri.queryParameters['next']!);
```

**Why it is problematic**

Can create an open redirect or unintended route injection.

**Better**

Map a small allowlisted route identifier.

---

## Passing raw URI strings throughout the app

**Bad**

```text
AppLinks
↓
String
↓
Bloc
↓
Repository
↓
Widget
↓
Router
```

**Why it is problematic**

Every layer must repeat validation and understand external protocol details.

**Better**

```text
Uri
↓
DeepLinkParser
↓
typed DeepLinkIntent
```

---

## Executing destructive actions from the callback

**Bad**

```dart
appLinks.uriLinkStream.listen((uri) {
  if (uri.path == '/delete-account') {
    api.deleteAccount();
  }
});
```

**Why it is problematic**

External URL activation becomes an unsafe command interface.

**Better**

Navigate to a validated confirmation flow and require normal authorization/user confirmation.

---

## Assuming possession means authorization

**Bad**

```dart
if (uri.pathSegments.first == 'invoice') {
  openInvoice(uri.pathSegments[1]);
}
```

**Better**

Check current authenticated account and backend permission.

---

## Logging reset tokens

**Bad**

```dart
debugPrint('deep link: $uri');
```

**Better**

```dart
debugPrint('deep link received: reset_password');
```

---

## Sensitive custom scheme without threat analysis

**Bad**

```text
myapp://magic-login?token=...
```

chosen solely because it is easy to configure.

**Better**

Prefer verified HTTPS links where possible and enforce protocol-level protections.

---

## Assuming Android intent filters are verified

**Bad assumption**

```text
intent filter exists
→
App Link verified
```

**Better**

Verify Digital Asset Links and device domain state.

---

## Wrong Android signing fingerprint

**Bad**

Use local upload/debug fingerprint for a Play-signed production app without checking Play App Signing.

**Better**

Use the installed production signing certificate fingerprint.

---

## Assuming Universal Links always open the app

**Bad**

Build critical UX around guaranteed app opening.

**Better**

Maintain a valid HTTPS web fallback and account for user/browser/platform behavior.

---

## Routing before startup is ready

**Bad**

```dart
appLinks.uriLinkStream.listen((uri) {
  router.go(uri.path);
});
```

before auth/router initialization.

**Better**

Parse and queue a typed pending intent until readiness.

---

## Losing destination during login

**Bad**

```text
protected link
↓
redirect /login
↓
original destination discarded
```

**Better**

Store validated typed pending intent.

---

## Reusing pending destination without revalidation

**Bad**

Store a link before login and trust it after account/session state changes.

**Better**

Revalidate authorization and resource state after authentication.

---

## Processing the same link twice

**Bad**

No duplicate/idempotency policy.

**Better**

Use one owner plus deduplication and business idempotency.

---

## app_links plus router platform handling simultaneously

**Bad**

Leave Flutter deep-link handling enabled while manually routing `app_links` events unless intentionally coordinated.

**Why it is problematic**

Two platform→router pipelines can handle one URL.

**Better**

Choose one owner.

---

## Long-lived BuildContext in service

**Bad**

```dart
final class DeepLinkService {
  DeepLinkService(this.context);

  final BuildContext context;
}
```

**Better**

Depend on a router/navigation abstraction.

---

## Giant unchecked route chain

**Bad**

```dart
if (url.contains('product')) ...
else if (url.contains('billing')) ...
else if (url.contains('invite')) ...
```

**Better**

Use exact URI structure and typed parser results.

---

## Silently ignoring malformed user-facing links

**Bad**

Discard an expected email invitation with no feedback.

**Better**

Show an appropriate unsupported/expired link state.

---

## Assuming app_links verifies domains

**Bad assumption**

```text
app_links received HTTPS URL
→
domain verified
```

**Better**

Treat Android/Apple association as an OS/hosting responsibility and still validate application input.

---

## Assuming app_links provides deferred install links

**Bad**

Use it expecting pre-install click attribution.

**Better**

Choose a dedicated deferred-link/install-attribution solution if that is a product requirement.

---

## Adding app_links when go_router already solves the requirement

**Bad**

Duplicate a working platform-router pipeline solely because a package example exists.

**Better**

Keep the simpler authoritative route pipeline.

---

# New Deep-Link Implementation Workflow

## 1. Identify external use cases

List exact links:

```text
/product/:id
/invite/:token
/reset-password/:token
/account/billing
```

Identify origin:

- web;
- email;
- QR;
- partner application;
- OAuth callback.

## 2. Decide whether app_links is required

Check:

- Flutter Router;
- `go_router`;
- existing native handler;
- notification pipeline;
- deferred-link provider.

Use `app_links` only if it solves a real link-delivery requirement.

## 3. Determine platforms

Explicitly list:

```text
Android
iOS
macOS
Windows
Linux
web
```

Do not configure unsupported behavior by assumption.

## 4. Select URI mechanism

Prefer:

```text
https://example.com/...
```

for publicly linkable sensitive/web-backed content.

Use custom schemes only when appropriate.

## 5. Design the public URI contract

Define:

- scheme;
- host;
- path vocabulary;
- path parameter types;
- query parameters;
- versioning strategy;
- web fallback.

Treat the contract as externally published API.

## 6. Define origin allowlists

Document exact allowed schemes/hosts.

## 7. Configure platform association

Android:

- manifest;
- intent filter;
- Flutter handler ownership.

iOS:

- custom scheme/Associated Domains;
- Flutter handler ownership.

Desktop:

- protocol/activation setup.

## 8. Configure hosting

Android:

```text
/.well-known/assetlinks.json
```

Apple:

```text
/apple-app-site-association
or
/.well-known/apple-app-site-association
```

according to current Apple deployment guidance.

## 9. Create one app-scoped intake

Use one `AppLinks`-backed source/coordinator.

## 10. Decide initial-link strategy

Choose either:

- stream handles initial + runtime;
- explicit `getInitialLink()` plus runtime stream.

If using both, deduplicate.

## 11. Parse into `Uri`

Do not manually tokenize strings.

## 12. Validate origin

Reject unknown schemes and hosts before route resolution.

## 13. Validate route shape

Require exact segments and parameter constraints.

## 14. Convert to typed intent

Discard raw routing ambiguity.

## 15. Resolve app readiness

Queue if startup is incomplete.

## 16. Resolve authentication

Store a safe typed pending intent if login is required.

## 17. Resolve authorization

Validate user/resource permissions.

## 18. Deduplicate

Prevent accidental duplicate navigation.

## 19. Navigate through one router

Do not bypass the application's routing authority.

## 20. Provide failure UX

Handle invalid, expired, unavailable, and unauthorized links.

## 21. Add redacted telemetry

Log semantic outcomes, not credentials.

## 22. Unit-test parser

Include malicious inputs.

## 23. Integration-test coordinator

Use fake link sources.

## 24. Test cold start

Kill app completely before test.

## 25. Test runtime delivery

Foreground/background app.

## 26. Test auth deferral

Logged out → login → destination.

## 27. Test production associations

Use release signing and production domains.

---

# Existing-Code Review Workflow

Before changing deep-link code, map the entire path.

Inspect:

- `pubspec.yaml` and locked `app_links` version;
- every `AppLinks()` usage;
- every stream subscription;
- `getInitialLink()` use;
- `getLatestLink()` use;
- `stringLinkStream` use;
- `uriLinkStream` use;
- Flutter built-in deep-link settings;
- `go_router` platform handling;
- Android manifest;
- `assetlinks.json`;
- production signing;
- iOS `Info.plist`;
- Associated Domains;
- AASA;
- macOS/desktop registration;
- parser;
- origin allowlists;
- route mapping;
- auth handling;
- authorization handling;
- pending intent storage;
- duplicate handling;
- logs;
- analytics;
- tests.

Draw:

```text
external tap
→ OS
→ native plugin/framework
→ Dart intake
→ parser
→ auth
→ router
→ screen
```

before editing.

---

# Refactoring Rules

Treat public deep-link formats as compatibility contracts.

Changing:

```text
/products/42
```

to:

```text
/p/42
```

can break:

- old emails;
- marketing links;
- QR codes;
- partner integrations;
- indexed web pages;
- push payloads;
- existing installed apps;
- password reset messages already sent.

For high-risk changes:

1. inventory existing public formats;
2. add characterization tests;
3. support old + new route during migration;
4. update association files;
5. update web fallback;
6. update outbound email/QR generators;
7. monitor old-route usage;
8. remove compatibility only after an intentional lifecycle.

Do not refactor public URLs like internal Dart class names.

---

# Code Review Checklist

- [ ] `app_links` is actually needed.
- [ ] Current package API is used.
- [ ] One application-level listener owns external links.
- [ ] Subscription lifecycle is correct.
- [ ] Cold-start handling is explicit.
- [ ] Runtime handling is explicit.
- [ ] Flutter router deep-link handling is not unintentionally duplicated.
- [ ] Every URI is parsed using `Uri`.
- [ ] Scheme allowlist exists.
- [ ] Host allowlist exists.
- [ ] Route allowlist exists.
- [ ] Redirect values are constrained.
- [ ] Sensitive tokens are not logged.
- [ ] Typed intent boundary exists where complexity warrants it.
- [ ] App readiness is handled.
- [ ] Auth-gated links retain safe destination.
- [ ] Pending destination is revalidated.
- [ ] Authorization is checked.
- [ ] Duplicate handling exists.
- [ ] High-value business operations are idempotent.
- [ ] User-facing failures are intentional.
- [ ] Platform association has tests.

---

# Android Checklist

- [ ] Flutter default deep linking disabled if `app_links` owns delivery.
- [ ] Activity contains correct intent filters.
- [ ] `VIEW` action present.
- [ ] `DEFAULT` category present.
- [ ] `BROWSABLE` category present.
- [ ] HTTPS App Link uses `android:autoVerify="true"`.
- [ ] Scheme exact.
- [ ] Host exact.
- [ ] Path rules intentional.
- [ ] `assetlinks.json` deployed.
- [ ] File served from correct host.
- [ ] Package/application ID exact.
- [ ] SHA-256 certificate exact.
- [ ] Play App Signing checked.
- [ ] Debug/release fingerprints intentionally managed.
- [ ] `pm get-app-links` verified.
- [ ] Real external tap tested.
- [ ] Browser fallback works when app absent.

---

# iOS Checklist

- [ ] Flutter default handler disabled if `app_links` owns delivery.
- [ ] Custom scheme registered if required.
- [ ] Associated Domains capability enabled for Universal Links.
- [ ] `applinks:` host exact.
- [ ] Every required subdomain configured.
- [ ] AASA deployed.
- [ ] AASA filename has no `.json`.
- [ ] `appID`/`appIDs` correct.
- [ ] Components/path rules correct.
- [ ] Signed bundle identity correct.
- [ ] Scene lifecycle compatibility reviewed for current Flutter/app_links.
- [ ] Real-device test performed.
- [ ] Safari/browser context behavior considered.
- [ ] Web fallback works.

---

# Security Checklist

- [ ] Every external URI treated as untrusted.
- [ ] Allowed schemes explicit.
- [ ] Allowed hosts explicit.
- [ ] No `startsWith()` domain validation.
- [ ] No `contains()` host validation.
- [ ] Route patterns explicit.
- [ ] Parameter types/lengths validated.
- [ ] Duplicate query parameters handled intentionally.
- [ ] Arbitrary external redirects rejected.
- [ ] Sensitive tokens not logged.
- [ ] Custom-scheme hijacking considered.
- [ ] Reset/magic/invite tokens expire appropriately.
- [ ] Backend enforces one-time use where required.
- [ ] Authentication checked.
- [ ] Authorization checked independently.
- [ ] Destructive actions require normal application controls.
- [ ] Business side effects are idempotent.

---

# Auth Deep-Link Checklist

- [ ] Destination is valid before storing it.
- [ ] Pending value is typed where possible.
- [ ] Pending value has bounded lifetime.
- [ ] Login cancellation clears/handles it correctly.
- [ ] Account switch invalidates inappropriate pending links.
- [ ] Destination revalidated after login.
- [ ] Resource authorization checked.
- [ ] Pending link consumed once.
- [ ] Secret tokens not persisted longer than required.

---

# Testing Checklist

- [ ] Valid parser routes.
- [ ] Invalid scheme.
- [ ] Invalid host.
- [ ] Look-alike host.
- [ ] Unsupported path.
- [ ] Missing ID.
- [ ] Invalid/long token.
- [ ] Percent encoding.
- [ ] Duplicate query parameter.
- [ ] External redirect rejection.
- [ ] Cold start.
- [ ] Foreground link.
- [ ] Background/resume link.
- [ ] Authentication deferral.
- [ ] Authorization rejection.
- [ ] Duplicate URI.
- [ ] Router duplication.
- [ ] Android App Link verification.
- [ ] Android production signing.
- [ ] iOS AASA.
- [ ] iOS production entitlements.
- [ ] Sensitive analytics/log redaction.

---

# Production Readiness Checklist

Before approving release, verify:

- [ ] Package APIs match the locked `app_links` version.
- [ ] One app-scoped external-link intake exists.
- [ ] Initial and runtime links are handled intentionally.
- [ ] No duplicate Router + `app_links` handler exists.
- [ ] `Uri` is used for parsing.
- [ ] Scheme/host/path allowlists are explicit.
- [ ] Raw external URLs do not bypass parser/validation.
- [ ] Android manifest is correct.
- [ ] Android App Link association is verified.
- [ ] Production Play signing fingerprint is correct.
- [ ] iOS Associated Domains is correct.
- [ ] Production AASA is correct.
- [ ] macOS/desktop setup is reviewed where targeted.
- [ ] Authentication-gated destinations survive startup/login safely.
- [ ] Pending destinations are revalidated.
- [ ] Authorization checks exist.
- [ ] Duplicate delivery is harmless.
- [ ] High-value actions are idempotent.
- [ ] Sensitive link parameters are redacted.
- [ ] User-facing invalid/expired states exist.
- [ ] Cold-start tests pass.
- [ ] Runtime tests pass.
- [ ] Security/malicious URI tests pass.
- [ ] Production domain association tested on actual devices.

---

# Quick Reference

| Situation | Preferred approach |
| --- | --- |
| Public web + app destination | Verified HTTPS App Link / Universal Link |
| Sensitive web-to-app flow | Prefer verified HTTPS where practical |
| Private custom application command | Custom scheme only when threat model allows |
| App terminated | Use current initial-link semantics or stream-first design |
| App running | Subscribe once to `uriLinkStream` |
| Need raw original value | Use string API deliberately |
| Raw URI received | Parse using `Uri`, then validate |
| Invalid URI | Reject safely |
| Unknown scheme | Reject |
| Unknown HTTPS host | Reject |
| Need route mapping | Convert to typed intent |
| Link requires login | Store safe typed intent, authenticate, revalidate |
| Protected resource | Perform authorization after auth |
| Same URI delivered twice | Deduplicate and ensure idempotency |
| go_router already handles links | Avoid redundant `app_links` pipeline |
| app_links owns deep links | Disable competing Flutter default handling |
| Need internal redirect target | Use allowlisted internal route identifier |
| Arbitrary external `redirect=` | Reject or strict allowlist |
| Password-reset link | Treat token as sensitive; never log |
| Magic-login link | Backend expiry/single-use validation |
| Android HTTPS opens browser | Inspect App Link verification and association |
| Android filter exists but not verified | Fix `assetlinks.json`/certificate/domain state |
| Play App Signing enabled | Use installed App Signing certificate fingerprint |
| iOS Universal Link opens Safari | Check Associated Domains, AASA, cache/context/user behavior |
| Custom scheme for sensitive auth | Evaluate hijacking; prefer verified HTTPS when possible |
| Link arrives before startup ready | Preserve bounded typed pending intent |
| Login completes | Revalidate pending intent before navigation |
| Business action triggered by link | Navigate to validated flow; backend enforces authorization/idempotency |
| Multiple widgets subscribe | Refactor to one application-scoped owner |
| Need deferred post-install link | Use a dedicated deferred-link/attribution solution |
| Flutter web URL navigation | Prefer router/browser URL integration |
| Performance concern | Fix correctness/lifecycle first, profile only if necessary |

---

# Final Engineering Rule

Do not start with:

```dart
AppLinks().uriLinkStream.listen((uri) {
  router.go(uri.path);
});
```

Start with:

```text
Who owns platform deep-link delivery?
↓
Does app_links need to exist?
↓
Which URI origins are trusted?
↓
Which public paths are supported?
↓
How is OS/domain association verified?
↓
How is raw input converted into a typed intent?
↓
Is the application ready?
↓
Is authentication required?
↓
Is the user authorized?
↓
Could this event have already been handled?
↓
Which single router owns navigation?
↓
What happens if validation or resource resolution fails?
```

Then implement the smallest infrastructure that preserves those guarantees.

`app_links` should remain the boundary that turns operating-system link delivery into Dart events. Keep routing, authorization, domain validation, pending-flow orchestration, idempotency, observability, and business semantics in explicit application layers where they can be tested independently.
