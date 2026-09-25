# Anti-Patterns, Workflows & Production Checklists

> Preserved from source lines 2425–3597 of `url_launcher Engineering Skill for Flutter.md`.
> Use this reference for detailed APIs, examples, caveats, platform notes, and source-grounded edge cases.

## Contents
- [Common Anti-Patterns](#common-anti-patterns)
  - [1. Deprecated string-based launch APIs](#1-deprecated-string-based-launch-apis)
  - [2. Manually concatenating query strings](#2-manually-concatenating-query-strings)
  - [3. Not encoding email subject/body](#3-not-encoding-email-subjectbody)
  - [4. Calling `canLaunchUrl` during every build](#4-calling-canlaunchurl-during-every-build)
  - [5. Assuming `canLaunchUrl == false` means impossible](#5-assuming-canlaunchurl-false-means-impossible)
  - [6. Assuming launch success means task completion](#6-assuming-launch-success-means-task-completion)
  - [7. Launching unvalidated user-provided URLs](#7-launching-unvalidated-user-provided-urls)
  - [8. Allowing arbitrary schemes](#8-allowing-arbitrary-schemes)
  - [9. Weak host checks with `contains`](#9-weak-host-checks-with-contains)
  - [10. Logging URLs with tokens](#10-logging-urls-with-tokens)
  - [11. Using url_launcher for internal navigation](#11-using-urllauncher-for-internal-navigation)
  - [12. Using an in-app mode for a non-HTTP scheme](#12-using-an-in-app-mode-for-a-non-http-scheme)
  - [13. Assuming custom schemes are secure/verified](#13-assuming-custom-schemes-are-secureverified)
  - [14. Assuming HTTPS opens a specific application](#14-assuming-https-opens-a-specific-application)
  - [15. App-specific scheme without fallback](#15-app-specific-scheme-without-fallback)
  - [16. Ignoring Android package visibility](#16-ignoring-android-package-visibility)
  - [17. Ignoring `LSApplicationQueriesSchemes`](#17-ignoring-lsapplicationqueriesschemes)
  - [18. Delayed asynchronous web launch](#18-delayed-asynchronous-web-launch)
  - [19. Duplicate launch on double-tap](#19-duplicate-launch-on-double-tap)
  - [20. Embedding server secrets in launch URLs](#20-embedding-server-secrets-in-launch-urls)
  - [21. Treating url_launcher as OAuth implementation](#21-treating-urllauncher-as-oauth-implementation)
  - [22. Treating payment launch as confirmation](#22-treating-payment-launch-as-confirmation)
  - [23. Wrapping every call unnecessarily](#23-wrapping-every-call-unnecessarily)
  - [24. Assuming SMS body syntax is universal](#24-assuming-sms-body-syntax-is-universal)
  - [25. Treating `platformDefault` as fixed](#25-treating-platformdefault-as-fixed)
  - [26. Assuming mode-support checking is always required](#26-assuming-mode-support-checking-is-always-required)
- [New External-Link Implementation Workflow](#new-external-link-implementation-workflow)
  - [1. Identify the actual external action](#1-identify-the-actual-external-action)
  - [2. Determine whether `url_launcher` is appropriate](#2-determine-whether-urllauncher-is-appropriate)
  - [3. Choose the URI scheme](#3-choose-the-uri-scheme)
  - [4. Determine ownership of destination data](#4-determine-ownership-of-destination-data)
  - [5. Construct with `Uri`](#5-construct-with-uri)
  - [6. Encode query values correctly](#6-encode-query-values-correctly)
  - [7. Validate untrusted input](#7-validate-untrusted-input)
  - [8. Choose `LaunchMode`](#8-choose-launchmode)
  - [9. Decide whether capability detection adds value](#9-decide-whether-capability-detection-adds-value)
  - [10. Decide whether exact mode support must be known](#10-decide-whether-exact-mode-support-must-be-known)
  - [11. Add Android query configuration only if required](#11-add-android-query-configuration-only-if-required)
  - [12. Add iOS query configuration only if required](#12-add-ios-query-configuration-only-if-required)
  - [13. Design fallback behavior](#13-design-fallback-behavior)
  - [14. Add confirmation only if warranted](#14-add-confirmation-only-if-warranted)
  - [15. Prevent duplicate launches](#15-prevent-duplicate-launches)
  - [16. Add privacy-safe telemetry](#16-add-privacy-safe-telemetry)
  - [17. Test encoding](#17-test-encoding)
  - [18. Test handler absence](#18-test-handler-absence)
  - [19. Test target platforms](#19-test-target-platforms)
  - [20. Test web user activation](#20-test-web-user-activation)
  - [21. Verify business completion separately](#21-verify-business-completion-separately)
  - [22. Verify deprecated APIs are absent](#22-verify-deprecated-apis-are-absent)
- [Existing-Code Review Workflow](#existing-code-review-workflow)
- [Refactoring Rules](#refactoring-rules)
  - [Basic migration](#basic-migration)
  - [Legacy force flags](#legacy-force-flags)
  - [Preserve fallbacks](#preserve-fallbacks)
  - [Improve security during migration](#improve-security-during-migration)
- [Code Review Checklist](#code-review-checklist)
- [Security Checklist](#security-checklist)
- [Android Checklist](#android-checklist)
- [iOS Checklist](#ios-checklist)
- [Web Checklist](#web-checklist)
- [Performance Checklist](#performance-checklist)
- [Production Readiness Checklist](#production-readiness-checklist)
- [Quick Reference](#quick-reference)
- [Final Engineering Rule](#final-engineering-rule)

---

## Common Anti-Patterns

### 1. Deprecated string-based launch APIs

**Bad**

```dart
await launch('https://example.com');
```

**Why it is problematic**

The original `launch` API is deprecated. It encourages string-first URI handling and carries obsolete configuration patterns.

**Better**

```dart
final uri = Uri.parse('https://example.com');

final launched = await launchUrl(
  uri,
  mode: LaunchMode.externalApplication,
);
```

---

### 2. Manually concatenating query strings

**Bad**

```dart
final uri =
    Uri.parse('https://example.com/search?q=$query&lang=$language');
```

**Why it is problematic**

User-controlled values can contain reserved URI characters.

**Better**

```dart
final uri = Uri(
  scheme: 'https',
  host: 'example.com',
  path: '/search',
  queryParameters: <String, String>{
    'q': query,
    'lang': language,
  },
);
```

---

### 3. Not encoding email subject/body

**Bad**

```dart
final uri = Uri.parse(
  'mailto:support@example.com?subject=$subject&body=$body',
);
```

**Why it is problematic**

Spaces, ampersands, line breaks, `?`, Unicode, and other characters can corrupt the URI.

**Better**

```dart
final uri = Uri(
  scheme: 'mailto',
  path: 'support@example.com',
  query: encodeQueryParameters(
    <String, String>{
      'subject': subject,
      'body': body,
    },
  ),
);
```

---

### 4. Calling `canLaunchUrl` during every build

**Bad**

```dart
@override
Widget build(BuildContext context) {
  canLaunchUrl(uri).then((value) {
    setState(() {
      _canOpen = value;
    });
  });

  return ...;
}
```

**Why it is problematic**

Build can run repeatedly. This causes repeated platform queries and can trigger set-state/build loops.

**Better**

Resolve capability once during an appropriate lifecycle phase only if capability actually affects UI.

---

### 5. Assuming `canLaunchUrl == false` means impossible

**Bad**

```dart
if (!await canLaunchUrl(uri)) {
  return;
}
```

**Why it is problematic**

Query visibility restrictions can produce false negatives.

**Better**

```dart
try {
  final launched = await launchUrl(uri);

  if (!launched) {
    await showFallback();
  }
} catch (_) {
  await showFallback();
}
```

---

### 6. Assuming launch success means task completion

**Bad**

```dart
if (await launchUrl(emailUri)) {
  markSupportEmailAsSent();
}
```

**Why it is problematic**

Launch success means only that the handoff/launch request succeeded to the extent observable by that platform.

**Better**

Track only:

```text
email composer opened/requested
```

unless an authoritative system separately confirms delivery.

---

### 7. Launching unvalidated user-provided URLs

**Bad**

```dart
final uri = Uri.parse(message.url);
await launchUrl(uri);
```

**Why it is problematic**

The URI may contain a malicious scheme or destination.

**Better**

```dart
final uri = Uri.tryParse(message.url);

if (uri == null ||
    !isAllowedExternalWebUri(
      uri,
      allowedHosts: const {'example.com'},
    )) {
  return;
}

await launchUrl(uri);
```

---

### 8. Allowing arbitrary schemes

**Bad**

```dart
if (uri.hasScheme) {
  await launchUrl(uri);
}
```

**Why it is problematic**

This authorizes any syntactically present scheme.

**Better**

```dart
const allowedSchemes = <String>{
  'https',
  'mailto',
  'tel',
};

if (!allowedSchemes.contains(uri.scheme.toLowerCase())) {
  return;
}
```

---

### 9. Weak host checks with `contains`

**Bad**

```dart
if (uri.host.contains('example.com')) {
  await launchUrl(uri);
}
```

**Why it is problematic**

It accepts `example.com.evil.test`.

**Better**

```dart
if (uri.host.toLowerCase() == 'example.com') {
  await launchUrl(uri);
}
```

or explicitly controlled subdomain matching.

---

### 10. Logging URLs with tokens

**Bad**

```dart
logger.error('Launch failed: $uri');
```

**Why it is problematic**

Query parameters can contain sensitive data.

**Better**

```dart
logger.error(
  'external_link_launch_failed '
  'scheme=${uri.scheme} '
  'host=${uri.host}',
);
```

---

### 11. Using url_launcher for internal navigation

**Bad**

```dart
await launchUrl(
  Uri.parse('myapp://settings'),
);
```

for a destination already inside the current Flutter app.

**Why it is problematic**

It routes an internal UI concern through platform app resolution.

**Better**

```dart
context.go('/settings');
```

---

### 12. Using an in-app mode for a non-HTTP scheme

**Bad**

```dart
await launchUrl(
  Uri(
    scheme: 'tel',
    path: '+37255501234',
  ),
  mode: LaunchMode.inAppBrowserView,
);
```

**Why it is problematic**

The top-level API requires HTTP(S) for both in-app modes and throws `ArgumentError`.

**Better**

```dart
await launchUrl(
  Uri(
    scheme: 'tel',
    path: '+37255501234',
  ),
  mode: LaunchMode.externalApplication,
);
```

---

### 13. Assuming custom schemes are secure/verified

**Bad**

```dart
final uri = Uri.parse('partnerapp://login?token=$secretToken');
await launchUrl(uri);
```

**Why it is problematic**

Custom schemes can collide and may be handled by an unexpected application.

**Better**

Use verified HTTPS mechanisms for security-sensitive handoff and keep secrets out of arbitrary app-launch URIs.

---

### 14. Assuming HTTPS opens a specific application

**Bad**

```dart
await launchUrl(partnerHttpsUri);
// "This always opens Partner App."
```

**Why it is problematic**

HTTP(S) resolution is platform-owned.

**Better**

Describe it as:

```text
Open the partner destination. The OS may use its associated app or browser.
```

---

### 15. App-specific scheme without fallback

**Bad**

```dart
await launchUrl(
  Uri.parse('partnerapp://orders/123'),
);
```

**Why it is problematic**

The application may not be installed.

**Better**

Attempt the documented app URI, then an HTTPS fallback.

---

### 16. Ignoring Android package visibility

**Bad**

```dart
final installed = await canLaunchUrl(partnerUri);
```

with no corresponding manifest query on Android 11+.

**Why it is problematic**

The result can be false because handler visibility is restricted.

**Better**

Either:

- avoid the preflight check; or
- add the narrowly required `<queries>` declaration.

---

### 17. Ignoring `LSApplicationQueriesSchemes`

**Bad**

```dart
final installed = await canLaunchUrl(
  Uri.parse('partnerapp://home'),
);
```

without iOS query configuration.

**Why it is problematic**

Capability detection can fail regardless of installed target.

**Better**

Declare `partnerapp` under `LSApplicationQueriesSchemes` when the application genuinely needs to query it.

---

### 18. Delayed asynchronous web launch

**Bad**

```dart
Future<void> onPressed() async {
  final destination = await repository.loadDestination();
  await launchUrl(
    destination,
    webOnlyWindowName: '_blank',
  );
}
```

**Why it is problematic**

The browser may no longer consider the window opening directly user-initiated.

**Better**

Precompute the destination or deliberately use same-tab navigation when appropriate.

---

### 19. Duplicate launch on double-tap

**Bad**

```dart
onPressed: () => launchUrl(uri),
```

when repeated windows/app launches are undesirable.

**Why it is problematic**

Two quick taps can create duplicate external actions.

**Better**

Disable while the launch request is pending.

---

### 20. Embedding server secrets in launch URLs

**Bad**

```dart
final uri = Uri(
  scheme: 'https',
  host: 'partner.example',
  path: '/start',
  queryParameters: <String, String>{
    'api_key': serverSecret,
  },
);
```

**Why it is problematic**

Client applications must not expose backend secrets, especially through external URLs.

**Better**

Have the backend exchange secrets server-side and return only protocol-approved short-lived/user-facing state.

---

### 21. Treating url_launcher as OAuth implementation

**Bad**

```dart
final opened = await launchUrl(oauthUri);

if (opened) {
  authCubit.loggedIn();
}
```

**Why it is problematic**

No callback, PKCE, state validation, or token exchange has happened.

**Better**

Use a complete OAuth/OIDC implementation and treat launching as one step only.

---

### 22. Treating payment launch as confirmation

**Bad**

```dart
if (await launchUrl(paymentUri)) {
  order.markPaid();
}
```

**Why it is problematic**

Opening a provider is not payment confirmation.

**Better**

Wait for provider/backend confirmation.

---

### 23. Wrapping every call unnecessarily

**Bad**

```text
Widget
 ↓
ExternalUrlFacade
 ↓
UrlLauncherManager
 ↓
PlatformUrlCoordinator
 ↓
launchUrl
```

with each layer merely forwarding arguments.

**Why it is problematic**

It adds maintenance cost without policy.

**Better**

Call `launchUrl` directly in simple screens, or create one thin boundary that adds real security/fallback/testing value.

---

### 24. Assuming SMS body syntax is universal

**Bad**

```dart
final uri = Uri.parse(
  'sms:$phone?body=${Uri.encodeComponent(message)}',
);
```

**Why it is problematic**

Apple's official SMS URL scheme does not permit message text, and client/platform behavior differs.

**Better**

Use recipient-only `sms:` for portable `url_launcher` use. Choose a specialized platform-specific integration if body prefill is required.

---

### 25. Treating `platformDefault` as fixed

**Bad**

```dart
await launchUrl(uri);
// "This means Custom Tabs on Android."
```

**Why it is problematic**

The package explicitly reserves the right for `platformDefault` behavior to change.

**Better**

Request the required mode explicitly.

---

### 26. Assuming mode-support checking is always required

**Bad**

```dart
if (await supportsLaunchMode(mode)) {
  await launchUrl(uri, mode: mode);
}
```

for every launch.

**Why it is problematic**

Unsupported modes already fall back. Support checking is needed only if knowing the exact surface matters.

**Better**

Call `launchUrl` directly when fallback is acceptable.

---

## New External-Link Implementation Workflow

Follow this sequence.

### 1. Identify the actual external action

State precisely:

```text
open trusted documentation in external browser
```

not:

```text
open URL
```

The desired action determines security policy and launch mode.

### 2. Determine whether `url_launcher` is appropriate

Ask:

- Is this internal Flutter navigation?
- Is a complete embedded WebView required?
- Is this a full authentication integration?
- Does direct platform functionality require another API?

Reject `url_launcher` when it is merely the easiest-looking API rather than the right boundary.

### 3. Choose the URI scheme

Use only the protocol intended by the destination:

- `https`
- `mailto`
- `tel`
- `sms`
- documented custom scheme
- documented platform URI such as a map URI
- `file` on documented desktop flows.

### 4. Determine ownership of destination data

Classify the URI as:

- static trusted application constant;
- dynamically constructed from trusted identifiers;
- external/untrusted destination.

This determines validation.

### 5. Construct with `Uri`

Use:

- `Uri.parse` for static complete constants;
- structured constructor for dynamic host/path/query data;
- `pathSegments` for dynamic path components.

### 6. Encode query values correctly

For HTTP(S), use `queryParameters`.

For non-HTTP(S), use the package's documented `query` + `Uri.encodeComponent` workaround.

### 7. Validate untrusted input

Check:

- absolute URI where required;
- allowed scheme;
- allowed host;
- userinfo;
- port if policy restricts it;
- destination category;
- sensitive parameters.

### 8. Choose `LaunchMode`

Ask:

- should the user leave the app?
- is a lightweight in-app browser acceptable?
- is exact in-app mode essential?
- is native non-browser handling required?

Never use `platformDefault` as an undocumented shortcut for a required behavior.

### 9. Decide whether capability detection adds value

Do not default to `canLaunchUrl`.

Use it only when the result changes UI before launch.

### 10. Decide whether exact mode support must be known

Use `supportsLaunchMode` only when automatic fallback would violate the requirement.

### 11. Add Android query configuration only if required

If calling capability APIs:

- add narrowly scoped `<queries>`;
- add Custom Tabs service query if checking `inAppBrowserView`;
- do not over-declare.

### 12. Add iOS query configuration only if required

If using `canLaunchUrl` for a scheme:

- ensure appropriate `LSApplicationQueriesSchemes`;
- do not mistake it for launch authorization.

### 13. Design fallback behavior

Examples:

```text
partner scheme → HTTPS
mailto → contact form
maps app → HTTPS map
store app → public HTTPS store page
```

### 14. Add confirmation only if warranted

Consider:

- unknown domain;
- leaving app;
- sensitive external action;
- phone action.

Avoid confirmation fatigue.

### 15. Prevent duplicate launches

Use pending state when repeated browser/app launches are undesirable.

### 16. Add privacy-safe telemetry

Record:

- category;
- mode;
- platform;
- safe result.

Do not record secrets.

### 17. Test encoding

Use reserved characters, Unicode, and emoji.

### 18. Test handler absence

Use fakes for deterministic application behavior and real platform tests for integration.

### 19. Test target platforms

Do not assume Android behavior equals iOS or web.

### 20. Test web user activation

Especially if any awaited work occurs between tap and launch.

### 21. Verify business completion separately

For OAuth/payment/email/etc., identify the authoritative completion signal.

### 22. Verify deprecated APIs are absent

Search for:

```text
launch(
canLaunch(
forceSafariVC
forceWebView
closeWebView
```

and migrate intentionally.

---

## Existing-Code Review Workflow

Before modifying an existing launch flow, inspect:

1. `pubspec.yaml`;
2. `pubspec.lock`;
3. top-level `url_launcher` version;
4. resolved federated platform packages;
5. deprecated APIs;
6. URI construction;
7. string concatenation;
8. query encoding;
9. URI source/trust boundary;
10. allowed schemes;
11. allowed hosts;
12. launch mode;
13. assumptions about `platformDefault`;
14. `canLaunchUrl` usage;
15. repeated capability checks;
16. `supportsLaunchMode`;
17. Android `<queries>`;
18. iOS `LSApplicationQueriesSchemes`;
19. web target name;
20. asynchronous work before web launch;
21. fallback UX;
22. exception handling;
23. logging;
24. secrets in URI;
25. repeated-tap behavior;
26. OAuth/payment completion assumptions;
27. unit/widget/integration coverage.

Before refactoring, write one sentence describing the intended external action.

Example:

```text
The button should open our trusted help center in the user's external browser.
```

Then preserve that behavior deliberately.

---

## Refactoring Rules

Given legacy:

```dart
launch('https://example.com');
```

do not mechanically transform it without examining intent.

### Basic migration

```dart
final uri = Uri.parse('https://example.com');

final launched = await launchUrl(
  uri,
  mode: LaunchMode.externalApplication,
);
```

Use `externalApplication` only if historical/product behavior means external handling is desired.

If exact external behavior was not required:

```dart
final launched = await launchUrl(uri);
```

may be the faithful migration.

### Legacy force flags

For code using:

```text
forceWebView
forceSafariVC
universalLinksOnly
```

inspect the old semantics and current platform requirement before selecting:

- `inAppWebView`;
- `inAppBrowserView`;
- `externalApplication`;
- `externalNonBrowserApplication`.

Do not assume a name-to-name replacement preserves platform behavior.

### Preserve fallbacks

If old code:

```text
attempt mail client → open support site
```

retain that product behavior while modernizing the API.

### Improve security during migration

Migration is an opportunity to replace:

```dart
Uri.parse(serverProvidedUrl)
```

with an explicit destination policy.

Do not expand allowed schemes while modernizing syntax.

---

## Code Review Checklist

- [ ] Uses current URI-first `launchUrl`.
- [ ] No deprecated `launch`/`canLaunch`.
- [ ] Dynamic HTTP query values use structured encoding.
- [ ] Non-HTTP query parameters follow package encoding guidance.
- [ ] URI scheme is intentional.
- [ ] Untrusted targets are validated.
- [ ] Host checks use exact/safe subdomain logic.
- [ ] HTTPS policy is explicit.
- [ ] Launch mode matches UX.
- [ ] `platformDefault` is not relied upon for fixed semantics.
- [ ] `canLaunchUrl` is justified.
- [ ] Capability checks do not run during rebuilds.
- [ ] Exact mode checking is performed only when needed.
- [ ] Android query visibility config matches capability checks.
- [ ] iOS query-scheme config matches capability checks.
- [ ] Web launch remains user-gesture-compatible.
- [ ] Failure paths are visible/actionable.
- [ ] Duplicate taps are controlled where needed.
- [ ] Logs omit sensitive URI values.
- [ ] Custom schemes have fallback where practical.
- [ ] Custom schemes are not treated as identity verification.
- [ ] Business success is confirmed independently.
- [ ] Tests include unavailable-handler behavior.
- [ ] Platform-sensitive behavior is verified against resolved package versions.

---

## Security Checklist

- [ ] External input is treated as untrusted.
- [ ] Allowed schemes are explicit.
- [ ] Unexpected custom schemes are rejected.
- [ ] `javascript:` is rejected.
- [ ] `data:` is rejected unless explicitly required and reviewed.
- [ ] `file:` is rejected except intentional file workflows.
- [ ] HTTP is rejected where HTTPS is required.
- [ ] Host allowlist uses exact or explicit subdomain matching.
- [ ] Userinfo is rejected for controlled web destinations.
- [ ] Unexpected ports are rejected when applicable.
- [ ] Open-redirect targets are validated.
- [ ] Tokens/passwords/private keys are not unnecessarily placed in URLs.
- [ ] Complete sensitive URIs are not logged.
- [ ] Custom scheme is not treated as authenticated target identity.
- [ ] External target receives minimum necessary data.
- [ ] OAuth uses proper state/PKCE/callback validation outside `url_launcher`.
- [ ] Payment status comes from provider/backend truth.

---

## Android Checklist

- [ ] URI matches the intended Android handler.
- [ ] `canLaunchUrl` is used only when necessary.
- [ ] Required `<queries>` entries exist for schemes being queried.
- [ ] No unnecessary package visibility is declared.
- [ ] Custom Tabs service query exists if mode detection requires it.
- [ ] Target behavior tested on Android 11+ when querying handlers.
- [ ] Generic HTTPS is not assumed to open a specific app.
- [ ] `tel:` handoff is not confused with direct `ACTION_CALL`.
- [ ] No unnecessary `CALL_PHONE` permission was added.
- [ ] `inAppWebView` is only used for HTTP(S).
- [ ] `inAppBrowserView` exact support is checked only when required.
- [ ] Resolved `url_launcher_android` version is inspected for version-sensitive modes.
- [ ] Unavailable-target fallback is tested.
- [ ] `adb`/logcat is used for platform-resolution debugging when needed.

---

## iOS Checklist

- [ ] Schemes queried through `canLaunchUrl` are configured under `LSApplicationQueriesSchemes` where required.
- [ ] Query configuration is not added merely because a scheme is launched.
- [ ] Custom schemes are not treated as uniquely owned.
- [ ] Universal Link ownership is configured by the target app/domain, not attributed to `url_launcher`.
- [ ] Simulator mail/phone limitations are considered.
- [ ] Real-device testing covers `mailto:` and `tel:` when relevant.
- [ ] `sms:` body is not assumed to be supported.
- [ ] In-app mode behavior is tested on supported iOS versions.
- [ ] Android WebView configuration semantics are not assumed on iOS.
- [ ] Resolved `url_launcher_ios` version is inspected for version-sensitive behavior.
- [ ] External navigation fallback is tested.

---

## Web Checklist

- [ ] New-tab/window launch occurs directly from a user gesture.
- [ ] No unnecessary long `await` occurs before `_blank` launch.
- [ ] Destination URI can be prepared synchronously where practical.
- [ ] `_self` is considered when same-tab navigation is acceptable.
- [ ] `launchUrl == true` is not treated as proof of opened window.
- [ ] `canLaunchUrl` is not used as installed-app detection.
- [ ] Arbitrary external schemes are rejected.
- [ ] Popup-blocked behavior has a fallback.
- [ ] Browser-console diagnostics are considered.
- [ ] OAuth flows use a web-appropriate auth integration where needed.
- [ ] Accessibility reflects actual link behavior.

---

## Performance Checklist

- [ ] `canLaunchUrl` is not called on each build.
- [ ] Mode-support checks are not repeated unnecessarily.
- [ ] Static capability state is resolved at an appropriate lifecycle point if required.
- [ ] Duplicate launches are prevented where necessary.
- [ ] No excessive wrapper layers exist.
- [ ] URI creation is not prematurely optimized.
- [ ] External-link side effects are not triggered by rebuilds.
- [ ] A capability-check-then-launch sequence exists only for a justified product reason.

---

## Production Readiness Checklist

- [ ] Current package and resolved platform versions have been checked.
- [ ] Deprecated APIs are absent.
- [ ] All dynamic URIs are constructed safely.
- [ ] Non-HTTP query encoding follows current package guidance.
- [ ] Untrusted URLs are validated.
- [ ] Allowed schemes are intentional.
- [ ] Allowed hosts are intentional.
- [ ] HTTP/HTTPS policy is documented.
- [ ] Launch mode is intentional.
- [ ] `platformDefault` is used only when platform choice is acceptable.
- [ ] Android queries are configured only where needed.
- [ ] iOS query schemes are configured where needed.
- [ ] Web user-gesture behavior has been tested.
- [ ] Browser popup failure has usable UX where relevant.
- [ ] No sensitive URI logging occurs.
- [ ] External action has a failure fallback.
- [ ] Repeated taps cannot trigger harmful duplicate launches.
- [ ] Email launch is not equated with email sent.
- [ ] Phone launch is not equated with completed call.
- [ ] SMS launch is not equated with sent message.
- [ ] OAuth launch is not equated with authenticated session.
- [ ] Payment launch is not equated with payment completion.
- [ ] Custom schemes are not treated as secure identity.
- [ ] App-specific launch has fallback where practical.
- [ ] Tests cover unavailable target applications.
- [ ] Special-character encoding tests exist.
- [ ] Security tests include malicious schemes and lookalike hosts.
- [ ] Real platform tests cover version/configuration-sensitive behavior.

---

## Quick Reference

| Situation | Preferred approach |
|---|---|
| Open normal trusted website | HTTPS `Uri` + intentional mode |
| Open external browser | `LaunchMode.externalApplication` |
| Let platform choose web surface | `LaunchMode.platformDefault` only when either result is acceptable |
| Open lightweight in-app browser surface | `LaunchMode.inAppBrowserView` where supported |
| Use package's in-app WebView-style surface | `LaunchMode.inAppWebView`, HTTP(S) only |
| Need exact mode rather than fallback | `supportsLaunchMode` before launch |
| Send email | `mailto:` + encoded non-HTTP query |
| Add mail subject/body | Encode keys/values with `Uri.encodeComponent`; do not raw-concatenate |
| Dial/handoff phone number | `tel:` |
| Place a direct phone call | Use an appropriate direct-call platform API, not inferred `url_launcher` behavior |
| Compose SMS recipient | `sms:<recipient>` |
| Need guaranteed SMS body prefill cross-platform | Do not rely on `url_launcher`; use platform-specific integration |
| Open maps generically | Supported HTTPS/platform map URI |
| Force a specific maps vendor | Documented vendor scheme + fallback |
| Open specific installed app | Documented custom scheme or verified link + fallback |
| Need to know whether app handler is available | `canLaunchUrl` only when UI logic genuinely requires it |
| Static trusted link with fallback | Direct `launchUrl` is usually sufficient |
| `canLaunchUrl` false on Android | Inspect package visibility / `<queries>` and question whether preflight is needed |
| Android check for in-app browser support | Add Custom Tabs service `<queries>` entry if using the check |
| iOS scheme capability check fails | Inspect `LSApplicationQueriesSchemes` |
| Custom scheme on iOS | Do not assume unique ownership |
| Security-sensitive app-to-app link | Prefer verified HTTPS/App/Universal Link mechanisms where possible |
| Universal Link | Launch HTTPS; target app/domain owns association |
| Android App Link | Launch HTTPS; target app/domain owns verification |
| User-provided URL | Parse, validate scheme, validate host/policy, then launch |
| User-provided `javascript:` URL | Reject |
| External URL contains secret | Redesign if possible; never log complete URI |
| Unknown external domain | Validate; consider confirmation |
| Internal Flutter destination | Router/Navigator, never `url_launcher` |
| Store listing | Stable public HTTPS listing URI |
| Google Play listing | HTTPS Play Store listing + external handling |
| Desktop local file | `Uri.file`, verify existence, desktop only per package docs |
| Cross-platform mobile file opening | Prefer a specialized file/document integration |
| OAuth authorization page | Auth SDK/package preferred; `url_launcher` may be only the opener |
| Payment page | Launch only; backend/provider confirms payment |
| Launch returns true | Handoff/launch initiation only, not task completion |
| Web `launchUrl` returns true | Even weaker: current implementation cannot confirm window opened |
| Web new-tab launch | Trigger directly from user action |
| Web launch after long async delay | Risk of popup blocking; precompute or consider `_self` |
| Repeated launch taps | Guard with pending/debounce state when needed |
| In-app mode with `tel:`/`mailto:` | Invalid approach; use external/platform handling |
| Need full embedded browser control | Use a dedicated WebView/browser package |
| `platformDefault` observed to use specific surface today | Do not rely on it as a guarantee |
| Unsupported requested launch mode | Package may fall back; precheck only if fallback unacceptable |
| Capability query required across mobile platforms | Configure Android/iOS visibility deliberately |
| Debugging unexplained platform difference | Inspect `pubspec.lock`, platform implementation, OS config, and current changelog |

---

## Final Engineering Rule

For every external action, require the implementation to answer these questions before coding:

1. **What user action are we actually trying to perform?**
2. **Is `url_launcher` the right abstraction?**
3. **Who controls the destination?**
4. **Which URI scheme is legitimate?**
5. **Is every dynamic URI component encoded safely?**
6. **What scheme/host policy protects untrusted input?**
7. **Which launch surface does product UX require?**
8. **Can platform fallback be accepted?**
9. **Is `canLaunchUrl` genuinely necessary?**
10. **Does capability querying require Android/iOS configuration?**
11. **What happens when the handler is unavailable?**
12. **Does the action need confirmation?**
13. **Can repeated taps cause duplicate external actions?**
14. **What metadata can be logged without exposing secrets?**
15. **Which platform-specific tests prove the integration?**
16. **What authoritative signal proves the external business operation completed?**

If any answer is missing, do not compensate by adding more launcher calls. Resolve the product, platform, security, or architecture decision first.
