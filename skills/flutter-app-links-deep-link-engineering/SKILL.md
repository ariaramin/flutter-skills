---
name: flutter-app-links-deep-link-engineering
description: Design, implement, review, secure, debug, migrate, and productionize Flutter deep-link infrastructure using app_links across Android, iOS, macOS, Windows, Linux, and Web. Use this skill whenever work involves app_links, Android App Links, iOS Universal Links, custom URL schemes, web-to-app activation, cold-start/runtime link delivery, go_router or Navigator deep-link integration, auth-gated links, pending destinations, duplicate navigation, URI validation, assetlinks.json, AASA, release-signing association, or deep-link security—even when the user only reports that a link opens the browser, opens twice, is lost after login, or fails only in release.
compatibility: Inspect the repository's exact Flutter, Dart, app_links, router, native project, signing, and hosting configuration before making version-sensitive changes. Re-verify current package and platform documentation for materially different versions.
---
# Flutter `app_links` Deep-Link Engineering
## Mission
Build one secure, testable deep-link pipeline from operating-system delivery to application navigation. Treat `app_links` as a platform link-delivery adapter only; keep routing, validation, authentication, authorization, deduplication, business idempotency, and user-facing semantics in explicit application layers.
Use this governing model:
```text
external URI
→ OS association / registered scheme
→ app_links delivery
→ Uri parsing and origin validation
→ typed DeepLinkIntent
→ duplicate/idempotency gate
→ application readiness
→ authentication
→ authorization / backend validation
→ one router/navigation authority
→ destination
```
Never collapse these layers. A valid platform association does not make URI contents trusted, and a logged-in user is not automatically authorized for the linked resource.

## Non-negotiable invariants
1. Inspect the existing delivery path before adding `app_links`.
2. Choose exactly one authoritative platform deep-link owner.
3. Treat every incoming URI as untrusted external input.
4. Parse with `Uri`; do not split URLs manually.
5. Validate scheme, host, route shape, and parameters before routing.
6. Convert accepted URIs to typed intents in non-trivial applications.
7. Do not pass arbitrary raw external URLs deep into business logic.
8. Do not navigate until application readiness is resolved.
9. Revalidate pending intents after login/account changes.
10. Authentication never replaces authorization.
11. Possession of a link never proves resource permission.
12. Make duplicate delivery harmless.
13. Separate navigation deduplication from business-operation idempotency.
14. Prefer verified HTTPS App/Universal Links for sensitive public flows when practical.
15. Never execute destructive side effects directly from the link callback.
16. Never log reset tokens, magic codes, invitation secrets, auth codes, or complete sensitive URLs.
17. Test cold start, runtime delivery, auth deferral, and production association.
18. Verify release signing/domain association rather than assuming debug success proves production readiness.
19. Treat published URL formats as compatibility contracts.
20. Keep `app_links` vendor/package APIs at the infrastructure boundary.

## Load references only when needed
| Task | Read |
|---|---|
| Package role, lifecycle, initial/latest links, stream semantics, malformed URIs, parsing, dedup, typed intents | `references/01-foundations-package-lifecycle.md` |
| Android/iOS/macOS/Windows/Linux/Web registration, App Links, Universal Links, signing and association | `references/02-platform-association.md` |
| `go_router`, Navigator, readiness, auth, authorization, pending intents, security, coordinator, idempotency, observability | `references/03-routing-auth-security.md` |
| Parser, coordinator, cold/warm/auth/duplicate/platform tests and debugging | `references/04-testing-debugging.md` |
| Anti-patterns, new implementation workflow, existing-code review, refactoring, production checklists | `references/05-antipatterns-workflows-checklists.md` |
Read the smallest relevant reference set. For release-signing or association failures, read the platform reference before changing Dart routing code.

## Step 1 — Inspect the repository
Inspect before editing:
```text
pubspec.yaml
pubspec.lock
lib/ routing/navigation/bootstrap code
every AppLinks() use
every uriLinkStream/stringLinkStream subscription
getInitialLink()/getLatestLink() usage
Flutter/go_router platform deep-link configuration
android/
  AndroidManifest.xml
  flavors/application IDs
  signing configuration
ios/
  Info.plist
  entitlements
  schemes/bundle IDs
macos/
windows/
linux/
web/
assetlinks.json deployment
apple-app-site-association deployment
tests
logging/analytics
notification/deferred-link integrations
```
Record:
- Flutter and Dart versions
- locked `app_links` version
- router package/version
- target platforms
- public link domains and custom schemes
- production app/package/bundle identifiers
- production signing identities
- whether Flutter's built-in Router already owns platform links
- whether another plugin/native handler receives the same URLs
Do not add another listener until ownership is understood.

## Step 2 — Decide whether `app_links` should exist
Ask first:
```text
Does Flutter Router/go_router already receive every required external URL?
├─ yes → keep the router-native path unless a concrete capability is missing
└─ no
   └─ does app_links solve a real delivery gap?
      ├─ yes → use one app_links intake
      └─ no → keep existing native/plugin architecture
```
Do not add `app_links` for:
- internal `context.go()` / Navigator navigation
- notification delivery
- deferred-install attribution
- a requirement already handled cleanly by Router/native code
If `app_links` owns platform delivery, disable competing Flutter default deep-link handling using the configuration required by the pinned Flutter/package version.

## Step 3 — Define the public URI contract
Inventory the external formats the product promises to support, for example:
```text
https://example.com/products/:id
https://example.com/invite/:token
https://example.com/reset-password/:token
myapp://open/account/billing
```
For each, define:
- scheme
- host
- path grammar
- parameter type/length
- repeated-query semantics
- fragment semantics if any
- authentication requirement
- authorization requirement
- token expiry/single-use behavior
- web fallback
- compatibility/versioning policy
Do not refactor public URLs like internal class names. Existing emails, QR codes, partner links, indexed pages, and old app versions may depend on them.

## Step 4 — Configure OS and hosting association
Keep association failures separate from Dart routing failures.
### Android
For verified HTTPS links, verify:
```text
manifest VIEW + DEFAULT + BROWSABLE filter
+ android:autoVerify=true
+ exact https host/path policy
+ /.well-known/assetlinks.json
+ exact application ID
+ exact installed production signing certificate fingerprint
```
If Play App Signing is used, verify the App Signing certificate used on installed production builds rather than blindly using a local debug/upload certificate.
Use device verification tooling such as `pm get-app-links` when diagnosing association.
Custom schemes are registered handlers, not verified website ownership.
### iOS
For Universal Links, verify:
```text
Associated Domains entitlement: applinks:host
+ correct signed bundle/application identity
+ apple-app-site-association
+ matching components/path policy
```
Configure every required host/subdomain deliberately.
Do not promise that a matching Universal Link always opens the app; user/browser/platform context can keep a link on the website.
Custom schemes do not provide the ownership guarantees of Universal Links.
### macOS / Windows / Linux / Web
Read the platform reference before implementation. Do not copy mobile setup verbatim:
- macOS Universal Link forwarding has platform-specific integration.
- Windows protocol/web-to-app activation depends on package/registration model.
- Linux package docs emphasize custom-scheme desktop registration rather than a universal verified-HTTPS model.
- Web should normally use Router/browser URL handling; do not model `app_links` Web as a mobile-style runtime stream.

## Step 5 — Own delivery once
Prefer one app-scoped source/coordinator:
```text
AppLinks
→ one subscription
→ one parser/validator
→ typed intent
→ one coordinator
→ one navigation authority
```
Do not subscribe in `build()`. Do not create independent global listeners for auth, analytics, and navigation.
`AppLinks()` being singleton-backed does not make multiple subscriptions safe; each listener can still process the same event.
Cancel subscriptions owned by finite-lifetime objects.

## Step 6 — Choose startup semantics deliberately
The current package exposes both:
```dart
getInitialLink()
uriLinkStream
```
and the runtime stream can include the initial event according to package/platform behavior.
Choose one strategy:
- stream-first for initial + runtime delivery, or
- explicit initial-link orchestration plus runtime stream
If using both, route both through the same handler and deduplicate. Do not rely on subtle plugin timing as the only double-navigation defense.
Use `getLatestLink()` only for an explicit latest-link/diagnostic requirement; never poll it as a substitute for the stream.

## Step 7 — Parse and validate external input
Use `Uri` or `Uri.tryParse`.
Reject before route resolution if any required property fails:
- scheme allowlist
- exact host allowlist
- expected port policy
- route/path grammar
- parameter presence/type/length
- repeated-query rule
- redirect allowlist
- protocol-specific token shape
Never validate domains with:
```text
startsWith("https://example.com")
host.contains("example.com")
```
For subdomains, explicitly decide whether all descendants of a trusted suffix are actually trusted.
Normalize only semantics known to be equivalent. Do not alter signed URLs or case-sensitive/path-sensitive values casually.

## Step 8 — Convert to typed intents
For a non-trivial application, cross the trust boundary once:
```text
untrusted Uri
→ validation/parser
→ DeepLinkIntent
```
Examples:
```text
OpenProduct(productId)
OpenBilling
AcceptInvite(token)
ResetPassword(token)
```
Keep raw protocol details out of repositories/widgets/business services after this point unless the protocol specifically requires the original value.
Use explicit stable intent categories instead of substring route chains.

## Step 9 — Handle readiness, auth, and authorization
A link can arrive before:
- dependency injection
- auth restoration
- tenant/account state
- migration/update gates
- router readiness
Use a bounded pending-intent model:
```text
validated typed intent
→ readiness gate
→ auth gate
→ authorization/resource validation
→ consume once
→ navigate
```
For auth-gated links:
1. validate before storing
2. store typed intent, not arbitrary redirect URL
3. bound lifetime/queue size
4. authenticate
5. reload current account/tenant state
6. revalidate intent
7. authorize resource/action
8. clear/consume exactly once
9. navigate
Clear or invalidate pending intents on logout/account switch when appropriate.
Never let `?next=` become an unrestricted route or external redirect. Prefer a small allowlisted internal destination identifier.

## Step 10 — Deduplicate and make actions idempotent
Duplicate delivery can arise from:
- initial method + stream
- multiple subscriptions
- Router + `app_links`
- notification + link
- repeated taps
- lifecycle timing
- application retry
Use a short-window canonical-URI deduplicator for navigation duplication when useful.
For high-value actions, backend/domain idempotency is separate and mandatory.
Bad:
```text
link callback → POST accept-invite/payment/delete
```
Better:
```text
link → validated screen/intent
→ backend loads authoritative state
→ authenticated/authorized/idempotent operation
```

## Step 11 — Route through one authority
If using `go_router` deliberately after `app_links` intake:
```text
typed intent
→ explicit internal location
→ router.go()/push()
```
Do not call `router.go(uri.toString())` on arbitrary external input.
If Router/go_router already owns platform deep links, avoid adding the second `app_links` path.
For Navigator apps, depend on a root navigator abstraction/key rather than storing a long-lived `BuildContext` in the deep-link service.

## Step 12 — Protect sensitive links
Treat reset, magic-login, invitation, email-verification, OAuth, and payment-related URLs as credentials or security-sensitive protocol input.
Do not log complete URLs containing secrets.
The backend must enforce applicable:
- expiration
- one-time use
- intended account
- transaction/resource state
- authorization
- replay/idempotency
Prefer verified HTTPS flows for sensitive public links when practical. Custom-scheme uniqueness is not a security guarantee.
Do not execute destructive actions solely because the OS delivered a link.

## Step 13 — Add privacy-safe observability
Log semantic outcomes, not secret-bearing URLs:
```text
deep_link_received type=product
deep_link_rejected reason=unsupported_host
deep_link_deferred reason=auth_required
deep_link_navigation_completed destination=product
```
Useful diagnostic layers:
- platform eligibility/association
- native delivery
- listener started
- parser result
- duplicate suppression
- readiness/auth deferral
- authorization failure
- navigation completion
Keep platform delivery failure distinct from application route failure.

## Step 14 — Test in layers
### Parser tests
Cover:
- valid routes
- unsupported scheme
- exact-host/look-alike host attacks
- unsupported path
- missing/oversized parameters
- percent encoding
- Unicode
- unexpected port
- trailing-slash semantics
- repeated query keys
- fragments
- external redirects
### Coordinator tests
Use a fake `DeepLinkSource` rather than platform channels.
Verify:
- initial-link handling
- runtime stream handling
- deduplication
- readiness
- auth deferral
- pending intent consumption
- logout/account switch
- reporter/navigation behavior
### Platform tests
Test actual terminated and running application flows.
Android:
- normal external tap
- association state
- production/release signing
- browser fallback
iOS:
- production Associated Domains/AASA
- real-device Universal Link behavior
- custom scheme where used
Desktop/Web:
- actual registration/browser-routing behavior for the selected deployment model
A parser unit test is not proof that OS association works.

## Step 15 — Debug by layer
When a link does not work, locate the failing layer:
```text
OS considers app eligible?
→ registration/association valid?
→ competing Flutter/plugin owner?
→ native app_links receives event?
→ Dart listener active?
→ parser accepts URI?
→ readiness/auth/authorization passes?
→ router navigates?
```
If an Android HTTPS link opens the browser, inspect App Link verification before changing Dart routes.
If an iOS Universal Link stays in Safari, inspect Associated Domains/AASA and browser/user context before blaming `app_links`.
If a link is received twice, solve ownership first, deduplication second.

## Migration and refactoring rules
When changing an existing deep-link system:
1. map the full existing delivery path
2. inventory published URL contracts
3. add characterization tests
4. choose one delivery owner
5. centralize validation
6. introduce typed intents where complexity warrants it
7. preserve old public routes during migration when needed
8. update association files and web fallbacks
9. test release association
10. monitor old-route usage before removal
Do not regenerate native platform projects or replace the router merely to adopt `app_links`.

## Review output
When reviewing a repository, report:
```text
Deep-link scope
SDK/package/router versions inspected
Target platforms
Current delivery owner(s)
Public URI contracts
Platform association status
Security/trust-boundary findings
Duplicate-delivery risks
Readiness/auth/authorization flow
Pending-intent behavior
Routing integration
Logging/privacy findings
Tests present/missing
Production-association evidence
Recommended changes in priority order
Residual risks / unverified assumptions
```
For each material finding use:
```markdown
### [Severity] Finding
- Evidence:
- Failing layer:
- Impact:
- Recommended fix:
- Verification:
```

## Production gate
Do not call the implementation production-ready until applicable conditions are evidenced:
- one authoritative delivery pipeline exists
- locked package APIs match implementation
- initial/runtime behavior is intentional
- competing Router/plugin handling is disabled or intentionally coordinated
- all external URIs cross scheme/host/path/parameter validation
- typed intent boundary exists where complexity warrants it
- readiness is explicit
- auth-gated destinations are preserved safely
- pending intents are revalidated
- authorization is independent from authentication
- duplicate delivery is harmless
- high-value actions are idempotent
- sensitive URL data is redacted
- Android production association and signing are verified
- Apple production association/signing are verified
- targeted desktop/Web behavior is tested
- cold-start and runtime tests pass
- malicious URI tests pass
- user-facing invalid/expired/unauthorized states are intentional
- public URI compatibility/migration behavior is understood
If an important production association, signing, authorization, or security condition is not verified, say so explicitly rather than claiming success.

## Final operating rule
Start every deep-link task with:
```text
Who owns platform delivery?
→ Does app_links need to exist?
→ Which URI origins and routes are accepted?
→ Is OS/domain association verified?
→ How is raw input converted into a typed intent?
→ Is the app ready?
→ Is authentication required?
→ Is the user authorized?
→ Could this event already have been handled?
→ Which single router owns navigation?
→ How will failure be tested and observed?
```
Then implement the smallest architecture that preserves those guarantees.
