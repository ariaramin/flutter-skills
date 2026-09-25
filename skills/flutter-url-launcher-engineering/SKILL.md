---
name: flutter-url-launcher-engineering
description: Design, implement, review, debug, secure, test, migrate, and optimize production Flutter external URI launching with url_launcher. Use this skill whenever a Flutter task involves launchUrl, LaunchMode, websites, mailto/tel/sms, maps, app stores, custom schemes, Universal/App Links, Android package visibility, iOS LSApplicationQueriesSchemes, web popup/user-gesture behavior, desktop file URIs, URI validation/encoding, OAuth or payment handoff boundaries, launch failures, deprecated launch/canLaunch APIs, or deciding whether url_launcher is the right integration mechanism.
compatibility: Source baseline is url_launcher 6.3.2. Inspect the repository's exact Flutter/Dart versions, pubspec.lock, resolved federated url_launcher platform packages, target platforms, and platform configuration before relying on version-sensitive launch-mode, capability-query, web, or desktop behavior.
---

# Flutter url_launcher Engineering

## Mission
Treat `url_launcher` as a **platform handoff API**, not a browser framework or proof that an external business action completed.
Use this loop:
```text
identify external action
→ decide whether url_launcher is appropriate
→ classify destination trust
→ construct a safe Uri
→ choose an intentional LaunchMode
→ query capability only if it changes UX
→ launch once
→ handle false/exception with fallback
→ verify downstream business completion separately
→ test platform-specific behavior
```

## Non-negotiable rules
1. Use `launchUrl(Uri, ...)`; do not introduce deprecated string-based `launch`/`canLaunch` APIs.
2. Use `Uri.parse` only for known complete trusted constants; use structured `Uri` construction for dynamic components.
3. For dynamic HTTP(S) query values, use `queryParameters` rather than string concatenation.
4. For non-HTTP(S) schemes such as `mailto:`, follow the package's documented `query` + `Uri.encodeComponent` workaround.
5. Treat API, CMS, chat, QR, push, deep-link, remote-config, and user-provided destinations as untrusted.
6. Allow only intentional schemes and validate exact hosts when the destination is product-controlled.
7. Prefer HTTPS for ordinary web navigation when policy requires trusted web transport; reject disallowed HTTP rather than silently rewriting arbitrary URLs.
8. Do not put credentials, session secrets, private keys, or server secrets into externally launched URLs unless a reviewed protocol explicitly requires it.
9. Do not log complete sensitive URIs, query strings, or fragments.
10. Choose `LaunchMode` from required UX semantics. Do not rely on today's observed `platformDefault` behavior when the surface matters.
11. Both in-app modes require HTTP(S); do not use them for `tel:`, `mailto:`, `sms:`, or arbitrary custom schemes.
12. Prefer attempting `launchUrl` and handling failure when capability detection is not needed for pre-launch UI.
13. Treat `canLaunchUrl` as a platform-sensitive query that may return false because visibility/querying is restricted.
14. Use `supportsLaunchMode` only when automatic fallback would violate product requirements.
15. Add Android `<queries>` and iOS `LSApplicationQueriesSchemes` only when the app genuinely needs capability querying.
16. On web, preserve direct user-gesture context for new tab/window launches.
17. Never interpret `launchUrl == true` as proof of email delivery, call completion, SMS send, OAuth authentication, payment, purchase, installation, or any other external result.
18. Custom schemes are routing mechanisms, not verified application identity.
19. Use verified HTTPS/App Link/Universal Link mechanisms when target identity matters.
20. Keep internal Flutter navigation in the router/Navigator, not `url_launcher`.
21. Use a dedicated WebView/browser integration when the app needs rich embedded browsing controls.
22. Keep external navigation as a presentation/platform side effect unless a deliberate application abstraction adds security, fallback, observability, or testing value.
23. Prevent harmful duplicate launches when rapid repeated taps could open multiple windows/apps.
24. Test Android, iOS, web, and desktop behavior independently where supported.
25. Inspect resolved federated platform package versions before making implementation-specific claims.

## Reference routing
Read only what the task needs:
| Need | Read |
|---|---|
| Decide whether `url_launcher` fits; URI construction/encoding; `launchUrl`, `canLaunchUrl`, modes; HTTP/mail/tel/SMS | `references/01-foundations-uri-launch-apis.md` |
| Custom schemes, Universal/App Links, maps, stores, Android/iOS/web/desktop behavior | `references/02-schemes-platforms.md` |
| Destination security, failure UX, architecture, Bloc/DI, performance, observability | `references/03-security-failure-architecture.md` |
| Unit/widget/platform/web tests, debugging, OAuth/payment boundaries, migrations | `references/04-testing-debugging-migration.md` |
| Anti-patterns, implementation/review/refactor workflows, checklists, production gate | `references/05-antipatterns-workflows-checklists.md` |

## Step 1 — Inspect the repository before changing launch behavior
Record:
```text
Flutter + Dart versions
url_launcher constraint
pubspec.lock
resolved url_launcher_android / ios / web / desktop packages
current launch/canLaunch APIs
launch modes in use
URI builders and raw string concatenation
Android <queries>
iOS LSApplicationQueriesSchemes
webOnlyWindowName usage
fallback UX
security allowlists
logging/telemetry
tests for platform failures
```
Search for:
```text
launchUrl(
canLaunchUrl(
supportsLaunchMode(
LaunchMode.
launch(
canLaunch(
forceWebView
forceSafariVC
webOnlyWindowName
LSApplicationQueriesSchemes
<queries>
```
Before refactoring, write one sentence describing the intended user-visible action, for example:
```text
Open our trusted help center in the user's external browser.
```
Preserve that behavior intentionally.

## Step 2 — Decide whether `url_launcher` is the correct boundary
Use it when the operation is naturally:
```text
URI → operating-system/browser handler
```
Typical fits:
- external website;
- lightweight in-app HTTP(S) browser surface;
- `mailto:` composition;
- `tel:` dialer handoff;
- recipient-only `sms:`;
- maps/store/custom-scheme handoff;
- App/Universal Link launch;
- desktop `file:` where documented;
- opening an OAuth/payment page as one step of a larger protocol.
Do **not** use it for:
- internal Flutter routing;
- a full embedded browser/WebView architecture;
- complete OAuth/OIDC implementation;
- App/Universal Link association configuration;
- payment verification;
- direct-call semantics;
- universal SMS-body prefill;
- general cross-platform file opening.

## Step 3 — Classify destination trust
Use three categories:
```text
A. static application-owned constant
B. dynamic URI built from trusted identifiers
C. externally supplied/untrusted URI
```
For C, define an explicit policy before launching:
```text
allowed schemes
allowed hosts/subdomains
HTTPS requirement
userinfo policy
port policy
custom-scheme policy
sensitive parameter policy
confirmation policy
```
Syntax validity is not authorization.

## Step 4 — Build URIs safely
Static trusted constant:
```dart
final uri = Uri.parse('https://example.com/legal/privacy');
```
Dynamic web destination:
```dart
final uri = Uri(
  scheme: 'https',
  host: 'example.com',
  pathSegments: ['articles', articleId],
  queryParameters: {'q': query},
);
```
Do not concatenate dynamic path/query text into a URL string.
For non-HTTP(S) query values, use an encoder such as:
```dart
String encodeQueryParameters(Map<String, String> values) => values.entries
    .map((e) => '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value)}')
    .join('&');
```
then pass the encoded result through `Uri(query: ...)`.

## Step 5 — Validate untrusted destinations
For controlled web links, prefer a validator equivalent to:
```text
URI must be absolute
scheme == https
host non-empty
userinfo empty
host exactly allowlisted, or explicit approved subdomain rule
port allowed if product restricts it
```
Never use:
```dart
uri.host.contains('example.com')
```
because it admits lookalikes such as `example.com.evil.test`.
Reject unexpected schemes such as `javascript:`, `data:`, or `file:` unless a reviewed feature explicitly permits them.
Validate redirect targets too; a trusted redirector host does not make its eventual external target trusted.

## Step 6 — Choose `LaunchMode` by UX semantics
Use this decision table:
| Requirement | Prefer |
|---|---|
| Platform may choose the surface | `platformDefault` |
| Must leave app/use external handler | `externalApplication` |
| Lightweight in-app browser-style HTTP(S) surface | `inAppBrowserView` |
| Package-provided in-app WebView-style HTTP(S) surface | `inAppWebView` |
| Must avoid browser handling where supported | `externalNonBrowserApplication`, only after version/platform verification |
Rules:
- do not claim `platformDefault` means a fixed surface;
- do not use in-app modes for non-HTTP(S);
- if automatic fallback is acceptable, skip `supportsLaunchMode`;
- if exact surface is mandatory, verify support and define fallback.

## Step 7 — Prefer launch-with-fallback over unnecessary preflight
Default:
```text
launchUrl(uri)
→ true: handoff initiated
→ false/exception: fallback UX
```
Use `canLaunchUrl` only when advance knowledge changes UI or flow.
Its `false` result may mean:
```text
no verifiable handler
OR
handler not query-visible to the app
```
Do not interpret it as authoritative installation/security proof.
Avoid repeated `canLaunchUrl → launchUrl` pairs when the preflight adds no product value.

## Step 8 — Configure capability querying only when needed
### Android
If querying schemes on Android 11+, add narrowly scoped `<queries>` entries. If querying support for `inAppBrowserView`, add the documented Custom Tabs service query.
Do not broaden package visibility unnecessarily.
### iOS
If `canLaunchUrl` must query nonstandard schemes, add the required scheme names to `LSApplicationQueriesSchemes`.
Do not confuse query permission with launch authorization or unique app identity.

## Step 9 — Handle common schemes correctly
### HTTP(S)
- use structured `Uri` construction for dynamic data;
- validate untrusted hosts/schemes;
- choose external vs in-app behavior deliberately.
### `mailto:`
- encode subject/body/cc/bcc using the non-HTTP query workaround;
- do not assume every mail client handles optional fields identically;
- success means composer/handoff, not delivery.
### `tel:`
- preserve leading `+` and normalize according to product rules;
- launching is a dialer/platform handoff, not proof of a completed call;
- do not add direct-call permissions merely for a `tel:` handoff.
### `sms:`
- use recipient-only `sms:<recipient>` as the portable baseline;
- do not promise cross-platform message-body prefill through `url_launcher`.

## Step 10 — Design app-to-app and external fallbacks
For a custom app URI, prefer:
```text
attempt documented native/custom URI
→ if unavailable/fails
→ trusted HTTPS destination
→ if that fails
→ user-visible fallback/copy action
```
Do not treat custom-scheme ownership as verified identity. For security-sensitive handoff, prefer verified HTTPS association mechanisms where available.
For generic HTTPS, do not promise that a specific installed app will open; the OS owns resolution.

## Step 11 — Respect platform-specific behavior
### Android
Reason about Android intent resolution, package visibility, installed handlers, verified links, user defaults, and resolved `url_launcher_android` behavior.
Do not assume generic HTTPS targets a specific app or browser.
### iOS
Reason about `LSApplicationQueriesSchemes`, custom-scheme collision, Universal Links, simulator mail/phone limitations, and resolved `url_launcher_ios` behavior.
Do not extrapolate Android WebView semantics to iOS.
### Web
New tabs/windows are subject to browser user-activation rules. Keep destination preparation synchronous before the click where possible.
A web `true` result does not prove a window opened.
Do not use web `canLaunchUrl` as installed-app detection.
### Desktop
Expect default-handler behavior. Use `Uri.file` only for documented desktop file flows and verify file existence first.

## Step 12 — Keep security boundaries explicit
Never launch external input directly after `Uri.parse`/`Uri.tryParse` without policy checks.
Avoid sending:
```text
access tokens
refresh tokens
passwords
private keys
server API secrets
sensitive reset/session URLs
```
through external destinations unless the protocol explicitly requires it and the threat model accepts the exposure.
Telemetry should prefer:
```text
destination category
scheme
safe host category
mode
platform
failure category
fallback used
```
over raw URI strings.

## Step 13 — Model launch failure separately from external outcome
Useful application categories include:
```text
invalid target
disallowed scheme/host
unsupported requested mode
no handler/unavailable app
query visibility/configuration issue
browser popup blocked
platform exception
unexpected failure
```
Choose fallback by action:
```text
mailto unavailable → contact form / copy address
tel unavailable → show/copy number
custom app unavailable → HTTPS fallback
store app unavailable → public HTTPS listing
maps app unavailable → HTTPS map
browser failure → trusted copyable URL/retry
```
Do not swallow a user-requested failure silently.

## Step 14 — Do not confuse handoff with business success
Never write logic equivalent to:
```text
launch succeeded
→ mark email sent
→ mark SMS sent
→ mark call completed
→ mark user authenticated
→ mark order paid
```
For OAuth/OIDC, authoritative completion comes from the validated callback/token flow with required state/PKCE/nonce semantics.
For payments, authoritative completion comes from provider/backend status.
For store/email/phone/SMS actions, model only what the app can actually know.

## Step 15 — Keep architecture proportional
Small app / one trusted link:
```text
button handler → launchUrl
```
is fine.
Create a thin `ExternalLinkService`/adapter when it adds real value:
- centralized destination policy;
- reusable fallbacks;
- privacy-safe telemetry;
- deterministic tests;
- platform-specific implementations.
Do not build several forwarding layers that merely mirror `launchUrl`.
Keep `BuildContext` out of long-lived launcher services; presentation owns dialogs/snackbars/navigation.

## Step 16 — State-management integration
Prefer:
```text
business/application state says an external action is needed
→ UI listener/effect performs platform launch
```
over coupling domain entities or state objects to `url_launcher` types.
If UI awaits launch before showing fallback, check `context.mounted` before using context.
Prevent duplicate launches with a pending flag only where repeated windows/apps would be undesirable.

## Step 17 — Test policy separately from platform integration
Unit-test:
- URI builders;
- reserved-character/Unicode encoding;
- scheme allowlist;
- host allowlist and lookalike rejection;
- HTTPS/userinfo/port rules;
- fallback selection;
- redaction policy.
Widget-test with a fake launcher:
- one user action → one launch;
- expected URI/mode;
- duplicate-tap behavior;
- fallback UI;
- accessible labels.
Integration-test platform-sensitive behavior:
- Android `<queries>` and mode support;
- iOS query schemes and real-device mail/phone;
- web user gesture / `_blank` / `_self` / popup behavior;
- desktop default/file handlers.

## Step 18 — Debug systematically
If launch fails:
```text
resolved package versions
→ safe URI components
→ correct scheme
→ requested mode
→ HTTP(S) requirement for in-app modes
→ handler availability
→ capability-query configuration
→ web user gesture
→ platform logs/browser console
→ minimal known URI
→ current platform implementation/changelog
```
If `canLaunchUrl` says false but launch may work, inspect Android package visibility or iOS query-scheme configuration and reconsider whether preflight is needed.
If the wrong app opens, remember generic handler selection is OS-owned.

## Step 19 — Migrate deprecated code intentionally
Before replacing legacy code, inspect:
```text
launch(
canLaunch(
forceWebView
forceSafariVC
universalLinksOnly
closeWebView
raw URL concatenation
```
Then preserve the historical/product intent while moving to:
```text
Uri
launchUrl
LaunchMode
WebViewConfiguration / BrowserConfiguration
```
Do not mechanically translate old flags by name. Re-test platform behavior, fallbacks, capability-query configuration, and web activation.

## Review output format
When reviewing or implementing `url_launcher`, report in this order:
1. **Intent** — what external action the feature actually needs.
2. **Fit** — whether `url_launcher` is the right boundary.
3. **URI policy** — construction, encoding, trust, allowed schemes/hosts.
4. **Launch semantics** — requested mode and whether fallback is acceptable.
5. **Platform configuration** — Android/iOS/web/desktop requirements.
6. **Security/privacy** — secrets, target validation, logging, custom-scheme trust.
7. **Failure UX** — false/exception and fallback path.
8. **Business completion** — authoritative downstream success signal.
9. **Tests** — deterministic policy tests plus platform integration coverage.
10. **Migration/version risks** — deprecated APIs or federated-platform assumptions.

## Production gate
Do not approve a launch flow until all applicable answers are known:
```text
Is this truly an external platform handoff?
Is destination ownership/trust classified?
Is the URI structurally encoded?
Are untrusted schemes/hosts constrained?
Are secrets excluded from URL/logs?
Is LaunchMode intentional?
Is platformDefault acceptable if used?
Is capability querying actually needed?
Are Android/iOS query declarations minimal and correct?
Does web launch preserve user activation?
Is there a useful handler-unavailable fallback?
Can duplicate taps cause harm?
Is downstream success verified independently?
Are platform-sensitive behaviors tested against resolved versions?
```
If any critical answer is unknown, treat the integration as incomplete rather than adding more launcher calls.
