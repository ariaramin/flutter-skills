---
name: flutter-webview-production-engineering
description: Design, implement, review, secure, debug, test, optimize, and migrate production Flutter embedded-browser features using webview_flutter. Use this skill whenever work involves WebViewController/WebViewWidget lifecycle, NavigationDelegate, domain allowlists, JavaScript channels, cookies/session handoff, OAuth browser choice, Android/WebKit platform features, permissions, file uploads/downloads, predictive back, platform-view composition, WebView memory/jank, or any embedded web content—even when the request sounds like a simple “open this URL in-app” task.
compatibility: "Inspect the repository's actual Flutter/Dart SDKs plus resolved webview_flutter, webview_flutter_android, webview_flutter_wkwebview, and platform-interface versions before version-sensitive changes. Source baseline is webview_flutter 4.14.1 with Android 24+, iOS 13+, and macOS 10.15+."
---
# Flutter WebView Production Engineering
Treat a WebView as a heavyweight platform-owned browser runtime and a security boundary, not as an ordinary Flutter widget.
A production flow must reason about three systems at once:
```text
Flutter application
      ↕
platform WebView integration
      ↕
web/browser runtime + page
```
Optimize and secure the complete pipeline rather than only the Dart wrapper.
## Reference routing
Read only what the task needs:
| Need | Reference |
|---|---|
| Package fit, controller lifecycle, platform views, URL loading, navigation policy | `references/01-lifecycle-platform-views-navigation.md` |
| HTTPS/TLS, JavaScript, bridge protocol, cookies, auth, storage, networking | `references/02-web-security-session-bridge.md` |
| Loading/error UX, SPA/back, gestures, platform APIs, media, permissions, uploads/downloads | `references/03-browser-ux-platform-capabilities.md` |
| Memory/startup/page performance, offline, security/privacy, accessibility, state architecture | `references/04-performance-security-architecture.md` |
| Web boundary, capability tables, tests, profiling, audits, migration, release gates | `references/05-platform-testing-migration-checklists.md` |
## 1. Decide whether WebView is justified
Before adding a WebView, answer:
Answer before coding: Why must the content remain embedded; Could Flutter render it more safely and accessibly; Could the system browser be a better trust boundary; Is authentication involved; Does the provider allow embedded user agents; Which origins may load; Is JavaScript required; Does the page need native app capabilities; Which camera/microphone/location/file permissions are required; How many simultaneous browser instances can exist; What is the lifecycle when hidden, backgrounded, logged out, or closed; Is Flutter web also a target.
Prefer:
```text
native product UI                    → Flutter widgets
first-party embedded web app         → webview_flutter
arbitrary external browsing          → system browser
OAuth/OIDC                           → provider-approved system auth/browser flow
background media                     → dedicated media APIs
large download                       → application/native download stack
```
Do not embed a browser merely because rendering HTML is convenient.
## 2. Inspect the repository before editing
Inspect:
Review: `pubspec.yaml` and `pubspec.lock`; Flutter/Dart SDK versions used by CI; resolved `webview_flutter` and endorsed platform package versions; direct imports of `webview_flutter_android` / `webview_flutter_wkwebview`; Android manifest/network-security configuration; Apple `Info.plist`, entitlements, permissions, ATS configuration; auth/session architecture; routes/deep links; file picker/download code; existing WebView abstractions and tests.
Search for:
```text
WebViewController
WebViewWidget
NavigationDelegate
WebViewCookieManager
JavaScriptMode
addJavaScriptChannel
runJavaScript
loadRequest
clearCache
clearLocalStorage
clearCookies
setCookie
onPermissionRequest
onSSlAuthError
onHttpAuthRequest
onWebResourceError
onHttpError
AndroidWebViewController
WebKitWebViewController
PopScope
WillPopScope
```
Flag controller creation in `build()`, unrestricted navigation, substring host checks, blanket JavaScript, broad bridges, token injection, SSL bypass, cache-as-logout, hidden WebView fleets, and platform assumptions.
## 3. Version-gate all platform APIs
The source baseline describes:
```text
webview_flutter                   4.14.1
webview_flutter_android           4.13.0
webview_flutter_wkwebview         3.26.0
webview_flutter_platform_interface 2.15.1
```
But platform implementation packages may have newer SDK floors than the umbrella package.
Always use the lockfile as source of truth.
If code directly imports a platform package, declare it as a direct dependency.
Do not upgrade the whole stack merely to copy a current example.
## 4. Use the modern controller architecture
Keep one `WebViewController` for one logical embedded-browser lifecycle.
Create it outside `build()` and attach it to one `WebViewWidget` at a time.
Do not do:
```dart
Widget build(BuildContext context) {
  final controller = WebViewController()..loadRequest(uri);
  return WebViewWidget(controller: controller);
}
```
A Flutter rebuild is normal. Browser recreation is not.
Do not invent `controller.dispose()` or `controller.pause()` if those methods do not exist in the resolved API.
Release application references when the browser is no longer needed and let the platform implementation manage native object disposal.
## 5. Keep browser instances bounded
A live WebView can retain:
Review: browser/native heap; JavaScript heap; DOM; images/fonts/video buffers; GPU surfaces; network connections; cookies/storage/cache state.
Reject:
Review: WebView per list row; WebView per carousel preview; many hidden/offstage WebViews; eagerly preloaded tab browsers without measured need.
Prefer lazy creation and a bounded keep-alive strategy.
## 6. Understand platform-view composition
A WebView is a platform view.
Review:
Review: clipping; opacity; transforms; overlays; gestures; scrolling; route transitions; accessibility.
On Android, start with the plugin's current default composition mode unless a measured product issue requires explicit Hybrid Composition or another engine-specific mode.
Do not cargo-cult `displayWithHybridComposition: true`.
Test Apple platform views separately; Android rendering advice does not automatically transfer to WKWebView.
## 7. Validate every URL before loading
Never pass arbitrary user input directly into `loadRequest`.
Validate with parsed `Uri` semantics:
```text
scheme
host
subdomain policy
port
path if required
```
Default remote content to HTTPS.
Reject substring checks such as:
```dart
url.contains('example.com')
```
because attacker-controlled hosts can contain the trusted text.
## 8. Define a navigation policy
Classify URLs explicitly:
```text
trusted embedded HTTPS
external HTTPS
app deep link
mailto
tel
download
blocked/unknown
```
Default-deny unknown schemes.
Treat these as high-risk unless deliberately supported:
```text
javascript:
file:
data:
content:
intent:
unknown custom schemes
```
Do not forward arbitrary page-supplied URIs to the OS.
## 9. Keep navigation decisions narrow
Use `NavigationDelegate` as an application policy boundary.
Allow only known embedded origins.
For untrusted/peer web destinations, prefer the external browser.
For deep links, validate the destination and pass through the application's router rather than letting page content become an unrestricted native command surface.
Distinguish main-frame failures from subresource failures.
Do not replace the entire screen because one image failed.
## 10. Enforce HTTPS/TLS policy
Do not globally weaken transport security because a test server uses HTTP.
Preferred order:
Answer before coding: serve HTTPS;; use environment-specific development configuration;; if unavoidable, create a narrow explicit platform exception;; prevent development exceptions from leaking into release..
On SSL errors, cancel by default.
Never ship “proceed on all certificate errors.”
URL allowlisting is not certificate pinning.
## 11. Enable JavaScript only when required
Set the mode explicitly.
Use `JavaScriptMode.disabled` for static/legal content when possible.
Use unrestricted JavaScript only when the actual web application requires it.
Do not enable JS because sample code does.
## 12. Keep Dart↔JavaScript traffic event-driven
Use `runJavaScript` for one-way commands and `runJavaScriptReturningResult` only when a result is needed.
Avoid:
Review: per-frame JS calls; continuous polling; pixel-by-pixel scroll synchronization; huge DOM snapshots; repeated large JSON objects.
Prefer meaningful events and compact payloads.
## 13. Never concatenate untrusted values into JavaScript
Encode values structurally, usually with JSON.
Bad:
```text
window.setName('$userInput')
```
Better:
```text
jsonEncode(value)
→ inject encoded JSON literal into a fixed script template
```
JSON encoding protects source-code structure; it does not make an untrusted page trusted.
## 14. Treat JavaScript channels as privileged native capability
A JavaScript channel exposes native application behavior to page scripts.
Assume an XSS in the page can invoke every bridge action exposed there.
Therefore:
Review: expose the minimum capability; version the message protocol; bound message size; validate every field; allowlist actions; reject unknown actions; avoid arbitrary method dispatch; never expose file/shell/native command execution; never send long-lived secrets through the bridge..
Do not assume generic `JavaScriptMessage` includes a cryptographically trustworthy origin. It does not.
A `currentUrl()` check may add context but is not sender-origin authentication.
## 15. Model a typed bridge protocol
For non-trivial integration, use an envelope such as:
```json
{
  "version": 1,
  "action": "openOrder",
  "requestId": "a8c19",
  "payload": {"orderId": "123"}
}
```
Validate:
Review: total message length; version; action; request ID; payload shape; identifier limits; authorization at the native application layer.
Pass only validated typed data into native application actions.
## 16. Separate WebView session state from Flutter HTTP clients
WebView networking is owned by Android WebView/WKWebView.
Do not assume Dio or Dart HTTP interceptors automatically affect:
Review: page redirects; CSS/images/scripts; XHR/fetch; browser cookies; TLS behavior.
Design browser authentication as browser authentication.
## 17. Prefer secure browser sessions over persistent custom headers
Use, where applicable:
```text
server-issued secure session cookie
one-time bootstrap exchange
HTTP auth when the server actually uses it
provider-approved external OAuth/OIDC session
```
Treat `loadRequest(headers: ...)` as headers for that request, not a permanent WebView interceptor.
Do not place long-lived bearer tokens in URLs or page-global JavaScript.
## 18. Initialize cookies/session before first navigation
If initial cookies are required:
```text
await setCookie/session bootstrap
→ then loadRequest
```
Do not race navigation against auth setup.
Prefer server-issued security-sensitive cookies because the generic cookie model does not expose every browser security attribute.
## 19. Keep cookies, cache, and local storage distinct
These are separate data classes:
```text
clearCookies()
clearCache()
clearLocalStorage()
```
Do not claim any one of them means “wipe all browser data.”
Logout should explicitly define:
```text
server session invalidation
cookie cleanup
native auth cleanup
navigation away from authenticated content
optional local-storage cleanup
```
Do not use cache clearing as logout.
## 20. Preserve browser cache unless policy requires clearing
Frequent cache clearing increases:
Review: network requests; TLS/DNS work; transferred bytes; image decode; page latency; battery/server load.
Fix incorrect HTTP caching at the server instead of deleting browser cache on every reload.
## 21. Distinguish browser error classes
Handle separately:
```text
transport/resource failure
HTTP response error
application-level error page
SSL failure
blocked navigation
```
Do not map every failure to “offline.”
For SPA readiness, do not interpret `onPageFinished` as “the web application is completely ready.”
If both sides are controlled, define an explicit `appReady` bridge event.
## 22. Define browser-history vs Flutter-route back behavior
There are two navigation stacks:
```text
WebView browser history
Flutter route history
```
A common policy is:
```text
if WebView can go back → browser goBack
else → Flutter route pops
```
But confirm product semantics.
For predictive back, keep browser-history capability as state rather than launching an asynchronous history query at the end of every gesture.
Use current `PopScope`, not legacy `WillPopScope` tutorials, when the repository supports predictive back.
## 23. Avoid nested scrolling unless necessary
A vertically scrolling WebView inside a vertically scrolling Flutter parent creates gesture and height complexity.
Prefer a bounded/full-screen WebView or render the content natively when it must participate in one Flutter scrollable.
## 24. Mediate browser permissions
Browser permission and OS permission are separate layers.
For camera/microphone/location:
Answer before coding: verify trusted page context;; verify product action;; check/request OS app permission;; grant only the requested browser resource;; deny unexpected requests..
Default-deny unused permissions.
Do not blindly grant every page request.
## 25. Enable platform-specific capabilities only when required
On Android, review features such as:
Review: debugging; file/content access; geolocation; mixed content; file selector; fullscreen custom views; media autoplay; third-party cookies.
On Apple platforms, review:
Review: inline media; navigation gestures; inspectability; popup/window behavior; permission callbacks.
Do not assume platform parity.
## 26. Treat file upload/download as separate product features
File chooser behavior differs by platform.
Test Android, iOS, and macOS independently.
Do not expose arbitrary filesystem paths.
`webview_flutter` is not a cross-platform download manager.
For downloads:
```text
validate download URL/origin
→ hand off to application download layer
→ stream to intended storage
→ show progress/error
→ open/share only after validation
```
Do not use a hidden WebView as a large-file downloader.
## 27. Keep popups and new windows controlled
Define policy for:
Review: `_blank`; login popups; payment popups; `window.open`; unknown new-window requests.
Do not enable automatic popup behavior globally unless a real feature needs it.
## 28. Keep console/debugging development-scoped
Android WebView debugging and WebKit inspectability are useful during development.
Do not enable production debugging by default.
Do not forward raw page console logs to telemetry without privacy review; they may contain URLs, tokens, or account data.
## 29. Handle lifecycle at the product level
The generic controller does not promise a universal pause/resume protocol.
When hidden/backgrounded:
Review: stop application-driven polling; tell first-party pages to pause expensive work when useful; stop/leave media intentionally; restore UI state deliberately on resume..
Do not invent unavailable lifecycle APIs.
## 30. Measure WebView memory outside the Dart heap
A WebView can consume substantial native/browser memory even when Dart heap looks stable.
Measure:
```text
Dart heap
Flutter graphics/raster memory
native platform-view memory
browser/WebView memory
JavaScript heap
web images/video buffers
```
Investigate repeated open→close cycles and long-term steady state.
Do not declare “no leak” from Dart heap alone.
## 31. Keep startup lazy by default
Avoid before first frame:
Review: hidden WebViews; hidden navigation; cookie/cache wipes; several preloaded tabs; unnecessary browser queries.
Create the browser when the feature is used unless profiling proves prewarming is worth the startup/memory tradeoff.
## 32. Profile the webpage, not just Flutter
Page load can be dominated by:
```text
DNS/TLS
server TTFB
HTML/CSS/JS
fonts/images
third-party scripts
DOM/layout
client API calls
browser painting
```
For first-party content, optimize the web application itself.
A stable controller cannot rescue an oversized JavaScript bundle or pathological DOM.
## 33. Optimize bridge and progress callbacks
Keep progress updates narrowly scoped to the loading indicator.
Avoid full-screen rebuilds from every progress event.
Keep bridge callbacks small and typed.
Do not write databases, run analytics pipelines, or perform large JSON work for every browser progress/scroll event.
## 34. Treat hidden real-time pages as battery consumers
Offstage pages may continue timers, WebSockets, polling, animations, audio, or video.
Stop expensive first-party page work when not visible if product semantics allow it.
Do not keep hidden real-time dashboards running indefinitely.
## 35. Define offline semantics explicitly
Browser cache is not a deterministic offline contract.
Choose intentionally among:
```text
web-app/service-worker offline strategy
local packaged HTML
Flutter-native offline screen
explicit no-offline behavior
```
Test each target browser runtime when service workers matter.
## 36. Classify page trust
Use at least:
```text
controlled first-party
trusted third-party
arbitrary browsing
```
Decrease native bridge capability as page ownership decreases.
For arbitrary browsing, expose no privileged JavaScript bridge.
## 37. Never put secrets in web-visible surfaces
Do not inject:
Review: private keys; API secrets; refresh tokens; long-lived bearer tokens; database credentials.
into page JS, bridge messages, or URLs.
Use proper browser sessions and short-lived scoped bootstrap tokens only when justified.
## 38. Review privacy as part of the app
A WebView may use:
Review: cookies; third-party scripts; trackers; local storage; media permissions; location; custom user agents.
Do not treat embedded web content as outside the application's privacy responsibilities.
Do not promise cross-platform incognito/private mode unless the actual platform implementation provides and verifies it.
## 39. Accessibility belongs to both Flutter and the webpage
Test:
Review: TalkBack/VoiceOver; keyboard/focus; zoom/text scaling; form labels/headings; contrast; focus order; rotation/resize.
Flutter cannot automatically repair inaccessible HTML.
Do not disable zoom/text scaling to hide bad responsive design.
## 40. Keep state architecture proportional
Store product state such as:
```text
loading/ready/failed
current URL
canGoBack
permission state
session state
```
Keep `WebViewController` near the presentation/integration layer.
Do not place it inside domain entities, serializable Bloc state, or persistence models.
Useful policy components may include:
```text
NavigationPolicy
BridgeProtocol
SessionCoordinator
```
Do not create five forwarding architecture layers around one browser page.
## 41. Flutter Web is a separate capability
The endorsed `webview_flutter` package targets Android/iOS/macOS, not Flutter web.
If web is required, design a conditional capability using normal web navigation, iframe/web-specific rendering, or another explicit web implementation.
Do not compile native implementation imports into web builds.
Do not assume non-endorsed web implementations have feature parity.
## 42. Testing gate
Unit-test pure policies:
Review: URL parsing; host allowlists; navigation classification; bridge schema/action validation; session coordination; error-state reducers.
Widget-test Flutter overlays and surrounding UI.
Use platform-interface fakes only where useful; do not fake an entire browser.
Run real integration tests for:
```text
navigation
redirects
cookies/session
JavaScript bridge
permissions
file input
back/predictive back
TLS failure
external links/deep links
lifecycle
```
Real devices are required for production confidence in platform-view performance, memory, keyboard, and browser-version behavior.
## 43. Performance gate
Profile in profile/release-representative conditions.
Separate:
```text
Flutter frame/build/raster cost
platform-view composition
browser CPU/memory
page network
page JavaScript/layout/paint
```
On Android, compare composition modes only when the current mode causes a measured issue.
Do not optimize Dart after discovering the webpage is the bottleneck.
## 44. Migration gate
For pre-4.x code, migrate architecture first:
```text
old WebView widget
→ WebViewController
 + WebViewWidget
 + NavigationDelegate
```
Then migrate individual methods.
Review after SDK/plugin upgrades:
Review: minimum OS versions; resolved endorsed implementation packages; platform-view behavior; SSL callbacks; permissions; file chooser behavior; macOS support; back navigation; platform regressions.
Do not mix half-migrated API styles.
## 45. Existing-code audit gates
Flag immediately:
Review: `WebViewController()` inside `build()`; controller recreated from routine Bloc/Riverpod state; globally retained controllers without lifecycle need; many hidden/offstage WebViews; allow-all `NavigationDecision.navigate`; `url.contains('trusted.com')`; arbitrary external URI launch; blanket `JavaScriptMode.unrestricted`; giant native bridge/RPC channel; token injection into JS or URLs; `SslAuthError.proceed()` in production; global cleartext/mixed-content allowances; cookie/session initialization racing first navigation; `clearCache()` used as logout; browser auth assumed to equal Flutter HTTP auth; `loadRequest()` inside `build()` or every state emission; bridge polling/timer spam; subresource error replacing the entire page; `onPageFinished` treated as SPA-ready; Android-only behavior assumed on Apple platforms; embedded WebView used for OAuth without policy review.
## 46. Production definition of done
Approve only when:
Review: WebView is the correct product abstraction; actual package/platform versions were inspected; controller lifecycle is stable; platform targets are explicit; navigation policy is default-deny and host-correct; HTTPS/TLS policy is correct; SSL failures are not bypassed; JavaScript is minimized; bridge capabilities are narrow, typed, size-bounded, and validated; origin limitations are understood; no long-lived secrets enter JS/URLs; session setup completes before navigation; cookies/cache/local storage are treated separately; logout invalidates the intended browser/native state; browser-history vs Flutter-back behavior is defined; predictive back is tested where relevant; web permissions are mediated with OS permissions; file upload behavior is verified per platform; downloads/popups/new windows have explicit architecture; hidden browser count is bounded; loading/error UX does not recreate the WebView; app lifecycle/media behavior is deliberate; accessibility is tested; privacy/tracking implications are reviewed; Flutter and browser performance are both profiled; native/browser memory is measured; production debugging exposure is reviewed; real-device integration tests pass; release configuration and production origins pass validation..
## Final engineering rule
Before writing:
```dart
final controller = WebViewController()
  ..loadRequest(uri);
```
answer:
```text
Why is this embedded?
Who owns the page?
Which origins may load?
Which schemes may leave the WebView?
Is JavaScript required?
What native capability does the bridge expose?
How is the web session established?
Which permissions can the page request?
What happens on logout?
What happens on Back?
How many WebViews may live at once?
How is memory/performance measured?
What is the web-target alternative?
```
Then implement the smallest browser integration that preserves those boundaries.
