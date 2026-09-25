# Source reference: Flutter Web boundary, capability/decision tables, testing, profiling, checklists, audits, migration and completion

## Table of contents

- [98. Flutter Web](#98-flutter-web)
- [99. Platform Capability Matrix](#99-platform-capability-matrix)
- [100. Browser Choice Decision Table](#100-browser-choice-decision-table)
- [101. Navigation Decision Table](#101-navigation-decision-table)
- [102. Session Strategy Table](#102-session-strategy-table)
- [103. Bridge Decision Table](#103-bridge-decision-table)
- [104. Android Composition Decision Table](#104-android-composition-decision-table)
- [105. Testing Strategy](#105-testing-strategy)
  - [Pure Dart unit tests](#pure-dart-unit-tests)
  - [Widget tests](#widget-tests)
  - [Platform-interface tests](#platform-interface-tests)
  - [Integration tests](#integration-tests)
- [106. Real-Device Validation](#106-real-device-validation)
- [107. Performance Profiling](#107-performance-profiling)
    - [Flutter](#flutter)
    - [Platform/browser](#platformbrowser)
    - [Web application](#web-application)
- [108. Performance Checklist](#108-performance-checklist)
- [109. Security Checklist](#109-security-checklist)
- [110. Privacy Checklist](#110-privacy-checklist)
- [111. Reliability Checklist](#111-reliability-checklist)
- [112. Existing-Code Audit](#112-existing-code-audit)
    - [Lifecycle](#lifecycle)
    - [Navigation](#navigation)
    - [Security](#security)
    - [Session](#session)
    - [Performance](#performance)
    - [Errors](#errors)
    - [Platform assumptions](#platform-assumptions)
- [113. Common Anti-Patterns](#113-common-anti-patterns)
- [114. Migration Guidance](#114-migration-guidance)
    - [Platform packages](#platform-packages)
    - [Flutter upgrades](#flutter-upgrades)
- [115. AI Agent Implementation Workflow](#115-ai-agent-implementation-workflow)
  - [Step 1 — Inspect](#step-1-inspect)
  - [Step 2 — Justify WebView](#step-2-justify-webview)
  - [Step 3 — Classify content](#step-3-classify-content)
  - [Step 4 — Define navigation policy](#step-4-define-navigation-policy)
  - [Step 5 — Define JavaScript policy](#step-5-define-javascript-policy)
  - [Step 6 — Define session architecture](#step-6-define-session-architecture)
  - [Step 7 — Create stable controller](#step-7-create-stable-controller)
  - [Step 8 — Configure platform features](#step-8-configure-platform-features)
  - [Step 9 — Configure session before loading](#step-9-configure-session-before-loading)
  - [Step 10 — Load once](#step-10-load-once)
  - [Step 11 — Implement error/back/external UX](#step-11-implement-errorbackexternal-ux)
  - [Step 12 — Add secure bridge](#step-12-add-secure-bridge)
  - [Step 13 — Test pure policies](#step-13-test-pure-policies)
  - [Step 14 — Integration test real browsers](#step-14-integration-test-real-browsers)
  - [Step 15 — Profile](#step-15-profile)
  - [Step 16 — Harden](#step-16-harden)
  - [Step 17 — Release validation](#step-17-release-validation)
- [116. Completion Criteria](#116-completion-criteria)
- [117. Source Priority](#117-source-priority)
- [118. Evidence Classification](#118-evidence-classification)
- [119. Primary References](#119-primary-references)
- [Final Agent Commandment](#final-agent-commandment)
# 98. Flutter Web

The endorsed `webview_flutter` package currently supports Android, iOS, and macOS, not Flutter web.

An official but **non-endorsed** `webview_flutter_web` implementation exists separately and is deliberately limited; current documentation describes essentially `loadRequest` and `loadHtmlString` support rather than full parity with the native package. Do not treat it as equivalent to Android WebView or WKWebView.

Architect cross-platform browser content behind an application capability when required:

```
abstract interface class EmbeddedContent {
  Widget build();
}

```

Native targets may use `WebViewWidget`.

Web may use:

- normal navigation;
- browser iframe where permitted;
- web-specific rendering;
- external page opening.

Do not import native-only implementation packages into web builds.

---

# 99. Platform Capability Matrix

| CapabilityAndroidiOSmacOS       |                            |                                                     |                                           |
| ------------------------------- | -------------------------- | --------------------------------------------------- | ----------------------------------------- |
| Embedded browser                | Supported                  | Supported                                           | Supported                                 |
| Backed by                       | Android WebView            | WKWebView                                           | WKWebView                                 |
| JavaScript                      | Supported                  | Supported                                           | Supported                                 |
| JS channels                     | Supported                  | Supported                                           | Supported                                 |
| Navigation delegate             | Supported                  | Supported                                           | Supported                                 |
| Cookies                         | Supported                  | Supported                                           | Supported                                 |
| Cookie retrieval                | Supported current versions | Supported current versions                          | Supported current versions                |
| Local HTML                      | Supported                  | Supported                                           | Supported                                 |
| Flutter assets                  | Supported                  | Supported                                           | Supported                                 |
| User agent get/set              | Supported                  | Supported                                           | Supported                                 |
| HTTP auth                       | Supported                  | Supported                                           | Supported                                 |
| SSL-error callback              | Supported                  | Supported                                           | Supported                                 |
| Camera/mic web permission       | Supported                  | Supported where WebKit exposes request              | WebKit-dependent                          |
| Geolocation controls            | Android-specific API       | No matching generic Android-style control           | No matching generic Android-style control |
| File chooser Dart callback      | Android-specific           | No matching public callback; native WebKit behavior | Known gap for default macOS open panel    |
| Fullscreen custom view callback | Android-specific           | Native/WebKit behavior                              | Native/WebKit behavior                    |
| Web content debugging           | `enableDebugging`          | `setInspectable`                                    | `setInspectable`                          |
| Third-party cookie toggle       | Android-specific           | Browser/WebKit policy                               | Browser/WebKit policy                     |
| Mixed-content mode toggle       | Android-specific           | ATS/WebKit policy                                   | ATS/WebKit policy                         |
| New-window config               | platform/browser-specific  | creation param available                            | creation param available                  |
| Cross-platform download manager | No                         | No                                                  | No                                        |
| Web target                      | Not applicable             | Not applicable                                      | Not applicable                            |

The generic supported OS matrix and platform-specific feature APIs are documented by the current package and implementation packages.

---

# 100. Browser Choice Decision Table

| RequirementPrefer                   |                                                             |
| ----------------------------------- | ----------------------------------------------------------- |
| Native application UI               | Flutter widgets                                             |
| First-party embedded web app        | `webview_flutter`                                           |
| Arbitrary external webpage          | System browser                                              |
| OAuth/OIDC login                    | Platform browser/auth session                               |
| Static text/legal copy              | Flutter or HTML depending content ownership                 |
| Rich page with existing web product | WebView                                                     |
| Background media                    | Dedicated media APIs                                        |
| Large file download                 | App/native download stack                                   |
| Full general browser                | Purpose-built browser architecture, not one `WebViewWidget` |

---

# 101. Navigation Decision Table

| URLDefault policy                |                                 |
| -------------------------------- | ------------------------------- |
| trusted HTTPS app host           | allow embedded                  |
| trusted HTTPS required subdomain | allow if explicitly allowlisted |
| unrelated HTTPS host             | external browser                |
| HTTP                             | block unless narrowly justified |
| `mailto:`                        | validated external mail action  |
| `tel:`                           | validated external phone action |
| known app deep link              | app router                      |
| unknown custom scheme            | block                           |
| `javascript:`                    | block                           |
| arbitrary `intent://`            | block                           |
| unexpected `file:`               | block                           |

---

# 102. Session Strategy Table

| StrategyAppropriate forAvoid when |                                          |                                                  |
| --------------------------------- | ---------------------------------------- | ------------------------------------------------ |
| Server secure cookie              | normal web login/session                 | backend cannot establish session                 |
| One-time bootstrap exchange       | native→web session handoff               | token cannot be scoped/expired                   |
| Initial custom header             | one controlled request                   | auth must persist across browser traffic         |
| JS token injection                | almost never                             | any long-lived secret                            |
| URL token                         | single-use tightly scoped bootstrap only | long-lived credentials                           |
| Platform auth session             | OAuth/OIDC                               | content genuinely must be app-embedded afterward |

---

# 103. Bridge Decision Table

| NeedRecommended                    |                                                       |
| ---------------------------------- | ----------------------------------------------------- |
| No native integration              | no JavaScript channel                                 |
| One event                          | one narrow channel/action                             |
| Several typed actions              | versioned structured protocol                         |
| High-frequency telemetry           | redesign/batch                                        |
| Large binary transfer              | avoid bridge                                          |
| Arbitrary native commands          | reject design                                         |
| Untrusted browsing                 | no privileged bridge                                  |
| Security-critical native operation | require stronger architecture than page message alone |

---

# 104. Android Composition Decision Table

| NeedStart with                                    |                                                   |
| ------------------------------------------------- | ------------------------------------------------- |
| Normal WebView                                    | Current default TLHC                              |
| Heavy Flutter UI around WebView                   | Benchmark TLHC                                    |
| Native fidelity issue under texture mode          | Test Hybrid Composition                           |
| Quick scrolling jank                              | Profile both modes                                |
| Need exact stable behavior across plugin upgrades | Configure mode explicitly                         |
| Experimental engine HCPP                          | Evaluate separately with pinned Flutter/toolchain |

Do not choose based on outdated 2020-era WebView advice.

---

# 105. Testing Strategy

Use layers.

## Pure Dart unit tests

Test:

- URL parsing;
- domain allowlist;
- navigation classification;
- bridge decoder;
- bridge action validation;
- session orchestration;
- error-state reducer.

These are fast and deterministic.

## Widget tests

Test Flutter UI around the browser:

- loading overlay;
- error overlay;
- toolbar state;
- navigation-policy integration through abstractions.

Do not expect a normal `flutter_test` environment to reproduce real Android WebView/WKWebView behavior. Flutter's testing environment stubs platform integration and cannot substitute for real plugin/native behavior.

## Platform-interface tests

`WebViewPlatform.instance` is replaceable, which allows platform-interface fakes in unit tests.

Use this for controller delegation tests when worthwhile.

Do not reimplement the whole browser in a fake.

## Integration tests

Run actual:

- navigation;
- redirects;
- cookies;
- JavaScript channels;
- permissions;
- file input;
- back handling;
- SSL failure;
- deep links

on actual supported platforms.

---

# 106. Real-Device Validation

WebView behavior depends on:

- OS;
- Android WebView version;
- platform-view composition;
- GPU;
- memory;
- page content;
- permissions;
- keyboard;
- authentication state.

Test representative real hardware.

Minimum useful Android matrix:

```
lower-end supported device
current mainstream device
recent Android version
older supported Android version

```

Test both arm64 performance and device WebView updates where relevant.

For Apple:

```
real iPhone
iPad where product supports it
real macOS hardware if shipping macOS

```

Simulators are valuable for function checks, not the final authority for memory/render performance.

---

# 107. Performance Profiling

Use Flutter profile mode for application performance analysis; Flutter documentation explicitly identifies profile mode as the mode intended for performance investigation and notes that emulator/simulator mobile performance is not representative.

Profile three layers independently:

### Flutter

Use:

- DevTools Performance;
- CPU profiler;
- frame timeline;
- rebuild analysis.

### Platform/browser

Use:

- Android Studio tools;
- Android WebView/Chrome inspection;
- Perfetto;
- Instruments;
- Safari Web Inspector.

### Web application

Measure:

- waterfall;
- JavaScript CPU;
- layout;
- paint;
- long tasks;
- resource sizes;
- memory.

Do not optimize Dart after discovering a third-party script consumes 800 ms on every page load.

---

# 108. Performance Checklist

-  Is an embedded browser genuinely required?
-  Is the controller created outside `build()`?
-  Is one controller retained for one logical WebView lifecycle?
-  Are unrelated Flutter rebuilds isolated from the WebView?
-  Are hidden WebViews minimized?
-  Are WebView tabs lazily created?
-  Are bridge messages event-driven?
-  Is high-frequency JS polling avoided?
-  Are bridge payloads small?
-  Is progress state narrowly rebuilt?
-  Is nested scrolling avoided?
-  Are platform-view transforms/clips necessary?
-  Has Android composition mode been profiled if jank exists?
-  Is page JavaScript itself profiled?
-  Are web assets optimized?
-  Is browser cache preserved appropriately?
-  Is WebView creation deferred off startup when possible?
-  Are native/browser allocations measured?
-  Is the workflow profiled on a real device?
-  Are measurements from profile/release-representative builds?

---

# 109. Security Checklist

-  Every WebView has a navigation policy.
-  URLs are parsed with `Uri`.
-  Domain checks use host semantics, not substring search.
-  HTTPS is default.
-  Cleartext exceptions are narrow.
-  SSL errors are canceled by default.
-  No production "proceed on all SSL errors" behavior exists.
-  Mixed content is not broadly enabled.
-  JavaScript is enabled only when required.
-  JavaScript channels are minimal.
-  Every bridge message is schema-validated.
-  Bridge message size is bounded.
-  No arbitrary native RPC exists.
-  No secrets are injected into JS.
-  Long-lived auth tokens are not put in URLs.
-  Untrusted pages cannot access privileged channels.
-  Unknown schemes are blocked.
-  External/deep-link URLs are validated.
-  Web permission requests are mediated.
-  Camera/microphone access requires app permission and trusted context.
-  Android file/content access is disabled when unused.
-  Third-party cookies are enabled only when required.
-  Production WebView debugging is reviewed/disabled.
-  OAuth uses provider-approved browser/auth flow.
-  Web content CSP/security headers are reviewed when first-party.

---

# 110. Privacy Checklist

-  Cookie usage is documented.
-  Third-party cookies are reviewed.
-  Page analytics/tracking is known.
-  Third-party scripts are inventoried.
-  Web permission access is disclosed appropriately.
-  Location access is justified.
-  Camera/mic access is contextual.
-  WebView debugging does not leak production data.
-  Console logs avoid sensitive information.
-  Logout clears the required browser session state.
-  "Incognito" is not claimed without actual platform guarantees.
-  Web storage retention is documented.
-  App privacy documentation includes embedded web behavior where required.

---

# 111. Reliability Checklist

-  Initial cookie/session setup finishes before navigation.
-  Initial URL loads only once.
-  Reactive state does not repeatedly reload the same URL.
-  URL observer updates do not trigger navigation loops.
-  JS is not executed before required page readiness.
-  SPA readiness uses explicit protocol if necessary.
-  Main-frame and subresource errors are distinguished.
-  HTTP errors and transport errors are distinguished.
-  Back policy is defined.
-  Predictive back is tested.
-  External links are intentionally handled.
-  Deep links are validated.
-  File input is tested by platform.
-  Download UX is intentionally implemented if needed.
-  Popup/new-window policy is defined.
-  Permission requests always receive an answer.
-  Rotation/resizing is tested.
-  App background/resume behavior is tested.
-  Authentication expiry does not cause reload loops.
-  Native/browser behavior is tested after Flutter/plugin upgrades.

---

# 112. Existing-Code Audit

Search aggressively for these problems:

### Lifecycle

```
WebViewController() inside build()
controller recreated by Bloc/Riverpod rebuild
controllers stored forever in singleton
one WebView per list cell
many Offstage WebViews

```

### Navigation

```
NavigationDecision.navigate for everything
url.contains('trusted.com')
arbitrary launchUrl(request.url)
intent:// accepted blindly
unknown scheme accepted

```

### Security

```
JavaScriptMode.unrestricted without need
huge privileged AppBridge
command name dynamically mapped to native method
tokens injected into JS
token in query string
SSL proceed()
global cleartext enabled
mixed content always enabled

```

### Session

```
loadRequest before setCookie finishes
clearCache used as logout
auth header expected on every page request
Flutter login assumed to equal WebView login

```

### Performance

```
loadRequest in build()
reload from every state emission
progress rebuilds whole route
runJavaScript on timer
bridge sends scroll position every frame
hidden preloaded WebViews
expensive blur/opacity around platform view

```

### Errors

```
all resource failures display "offline"
subresource error replaces entire page
onPageFinished interpreted as SPA-ready

```

### Platform assumptions

```
Android file-selector API assumed on macOS
Android composition advice applied to iOS
system browser OAuth replaced by embedded WebView
web target assumed supported

```

---

# 113. Common Anti-Patterns

Reject:

- using WebView for content Flutter can render more safely;
- creating a controller inside `build`;
- recreating WebView for unrelated state;
- preloading many browsers;
- putting WebViews in scrolling list cells;
- relying on old pre-4.x APIs;
- allowing every navigation;
- validating hosts using substring matching;
- enabling unrestricted JS automatically;
- exposing one giant native JavaScript RPC bridge;
- trusting JS channel messages as origin-authenticated;
- concatenating untrusted strings into JavaScript;
- transferring huge JSON repeatedly;
- putting auth tokens in URLs;
- expecting Dio interceptors to control WebView traffic;
- bypassing certificate failures;
- globally permitting cleartext traffic;
- globally enabling mixed content;
- clearing cache before every reload;
- using cache clearing as logout;
- automatically granting camera/mic/location;
- assuming file uploads work identically across OSes;
- assuming WebView is a download manager;
- treating `window.open` as browser tab support;
- relying on hidden WebViews for prefetch;
- using Dart heap data alone to diagnose WebView memory;
- profiling only emulator/debug builds;
- using ordinary WebView for OAuth when provider/platform browser flow is required;
- claiming incognito guarantees unsupported by the API.

---

# 114. Migration Guidance

For pre-4.x code, first refactor architecture:

```
old monolithic WebView widget
        ↓
WebViewController
        +
WebViewWidget
        +
NavigationDelegate

```

Then migrate methods.

Do not mix half-migrated patterns.

Current package migration documentation specifically replaces old widget configuration with explicit controller/delegate methods and separates cache/local-storage behavior.

### Platform packages

Do not import:

```
webview_flutter_android
webview_flutter_wkwebview

```

unless platform-specific functionality is actually used.

If directly imported, declare them as dependencies.

### Flutter upgrades

After an SDK/plugin update review:

- minimum OS levels;
- resolved endorsed implementation versions;
- Android platform-view composition;
- permission behavior;
- WebKit behavior;
- SSL callback behavior;
- file selection;
- macOS support;
- platform-view regressions.

Do not assume a semver-compatible umbrella package means the native engine underneath behaved identically.

---

# 115. AI Agent Implementation Workflow

## Step 1 — Inspect

Read package versions, current WebView code, native configs, auth architecture, routes, tests, and platform-specific imports.

## Step 2 — Justify WebView

Explain why Flutter UI or the system browser is not better.

## Step 3 — Classify content

Decide whether content is:

```
first-party
trusted third-party
arbitrary

```

## Step 4 — Define navigation policy

List allowed:

- schemes;
- hosts;
- subdomains;
- ports;
- deep links;
- external behavior.

## Step 5 — Define JavaScript policy

Decide:

- disabled/unrestricted;
- channels required;
- allowed actions;
- protocol version;
- payload size limits.

## Step 6 — Define session architecture

Decide:

- cookie;
- bootstrap exchange;
- HTTP auth;
- external OAuth.

## Step 7 — Create stable controller

Create outside `build()` and keep one logical lifecycle.

## Step 8 — Configure platform features

Only enable required:

- media;
- permissions;
- file access;
- file selector;
- composition mode;
- WebKit behavior.

## Step 9 — Configure session before loading

Await cookies/session bootstrap first.

## Step 10 — Load once

Do not duplicate initial navigation through reactive state.

## Step 11 — Implement error/back/external UX

Cover real browser workflow.

## Step 12 — Add secure bridge

Only if required.

## Step 13 — Test pure policies

Unit-test navigation and bridge parsing.

## Step 14 — Integration test real browsers

Android/iOS/macOS as applicable.

## Step 15 — Profile

Measure:

```
Flutter frames
WebView initialization
browser CPU
page network
web JS
memory

```

## Step 16 — Harden

Run security/privacy checklist.

## Step 17 — Release validation

Test the actual release configuration, TLS policy, app permissions, browser auth, and production URLs.

---

# 116. Completion Criteria

A WebView feature is not complete because a URL appeared on screen.

Confirm:

-  WebView is justified.
-  Current repository-compatible APIs are used.
-  Supported platforms are explicit.
-  Controller is stable.
-  Controller is not created in `build()`.
-  Unused controllers are not retained globally.
-  Initial page does not reload from unrelated state.
-  Navigation policy is explicit.
-  Host validation is correct.
-  Unsupported schemes are denied.
-  External links are intentional.
-  Deep links are validated.
-  Back navigation is defined.
-  Predictive back is tested.
-  JavaScript is disabled when unnecessary.
-  JS channels expose minimum capability.
-  Bridge messages are untrusted and validated.
-  Origin limitations are understood.
-  No long-lived secrets enter JS or URLs.
-  Session setup occurs before navigation.
-  Logout invalidates the correct state.
-  Cookies/cache/local storage are not conflated.
-  SSL errors are not bypassed.
-  HTTPS policy is correct.
-  Cleartext exceptions are narrow.
-  Mixed content is not broadly enabled.
-  Android permissions/features are minimized.
-  Apple platform behavior is validated independently.
-  File upload behavior is tested on each required OS.
-  Downloads have a deliberate application architecture.
-  Popups/new-window behavior is defined.
-  Loading/error UI exists.
-  Main-frame errors are distinguished.
-  Page readiness is not inferred incorrectly.
-  WebView is not nested in problematic scrolling UI without reason.
-  Multiple WebViews are bounded/lazy.
-  App lifecycle/media behavior is tested.
-  Accessibility is tested.
-  Real-device tests pass.
-  Flutter frame performance is profiled.
-  Web page performance is profiled.
-  Browser/native memory is reviewed.
-  Production debugging exposure is reviewed.
-  Privacy impact is documented.
-  OAuth uses an appropriate user agent.
-  Release builds have been tested.

---

# 117. Source Priority

When sources disagree, use approximately this order:

1. current `webview_flutter` documentation;
2. current Flutter packages source;
3. current platform implementation documentation/source;
4. current platform-interface documentation;
5. current official package example;
6. current changelog;
7. current Flutter platform-view documentation;
8. current Flutter performance documentation;
9. current Android WebView documentation;
10. current Apple WebKit documentation;
11. current browser/web security standards;
12. first-party Flutter issues for unresolved implementation gaps.

Do not use old Stack Overflow answers to override a current platform package API.

---

# 118. Evidence Classification

When writing code review guidance distinguish:

- **Package requirement**
- **Flutter framework requirement**
- **Android platform requirement**
- **Apple platform requirement**
- **Verified implementation behavior**
- **Web security requirement**
- **Performance recommendation**
- **Engineering recommendation**
- **Context-dependent product choice**

Examples:

Good:

> The current Android plugin defaults to Texture Layer Hybrid Composition, but the package says the default can change, so explicitly select a mode only if the application's behavior depends on it.

Bad:

> Texture mode is always best.

Good:

> A generic `JavaScriptMessage` contains only message text, so a bridge must not assume it receives authenticated origin metadata.

Bad:

> JavaScript channels know who sent every message.

Good:

> `clearCache()` and `clearLocalStorage()` are separate operations, so cache deletion is not a complete logout/storage wipe.

Bad:

> Clearing WebView cache logs users out.

---

# 119. Primary References

Current official `webview_flutter` package, support matrix, architecture, platform-specific access, and migration guidance.

Current `WebViewController`, `NavigationDelegate`, request-loading, storage, user-agent, and browser-control API.

Current Android implementation, platform-view display modes, file selector, permissions, mixed content, media, debugging, file/content access, and other Android-specific features.

Current WebKit implementation, platform-specific creation parameters, inspectability, media, permissions, navigation gestures, dialogs, and current WebKit package lifecycle changes.

Current cookie APIs and generic cookie-model limitations.

Current Flutter Android, iOS, and macOS platform-view composition/performance documentation.

Current Flutter predictive-back `PopScope` API.

Current Flutter profiling/build-mode guidance.

Current Apple App Transport Security behavior for WebView content.

Current Apple browser authentication-session API.

First-party Flutter issue documenting the current macOS `WKWebView` file-input limitation.

---

# Final Agent Commandment

When working on `webview_flutter`:

**Inspect the repository first.**
**Verify package versions second.**
**Define browser and navigation boundaries third.**
**Define JavaScript and security policy fourth.**
**Define session and permission lifecycle fifth.**
**Measure Flutter + platform-view + webpage behavior sixth.**
**Change the implementation last.**

Above all:

> **A WebView is another browser runtime embedded in your Flutter application. Keep it deliberate, stable, minimally privileged, explicitly navigated, and measured as a complete browser integration—not merely as a Dart widget.**