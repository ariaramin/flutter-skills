# Custom Schemes, Deep Links & Platform Behavior

> Preserved from source lines 769–1364 of `url_launcher Engineering Skill for Flutter.md`.
> Use this reference for detailed APIs, examples, caveats, platform notes, and source-grounded edge cases.

## Contents
  - [Portable baseline](#portable-baseline)
- [Custom Schemes](#custom-schemes)
  - [Fallback chain](#fallback-chain)
  - [Security](#security)
- [Universal Links and Android App Links](#universal-links-and-android-app-links)
- [Maps](#maps)
- [App Store / Play Store](#app-store-play-store)
  - [Google Play](#google-play)
  - [Apple App Store](#apple-app-store)
  - [Product rule](#product-rule)
- [Android](#android)
  - [Mental model](#mental-model)
  - [Android Package Visibility](#android-package-visibility)
  - [Query visibility is not launchability](#query-visibility-is-not-launchability)
  - [Android custom schemes](#android-custom-schemes)
  - [Android browser behavior](#android-browser-behavior)
  - [Android Custom Tabs / in-app browser](#android-custom-tabs-in-app-browser)
  - [Android WebView mode](#android-webview-mode)
  - [Android telephone behavior](#android-telephone-behavior)
  - [Android diagnostics](#android-diagnostics)
- [iOS](#ios)
  - [Mental model](#mental-model)
  - [`LSApplicationQueriesSchemes`](#lsapplicationqueriesschemes)
  - [iOS custom schemes](#ios-custom-schemes)
  - [iOS Universal Links](#ios-universal-links)
  - [iOS in-app browser behavior](#ios-in-app-browser-behavior)
  - [iOS `inAppWebView` nuance](#ios-inappwebview-nuance)
  - [Simulator limitations](#simulator-limitations)
- [Web](#web)
  - [User gesture](#user-gesture)
  - [`webOnlyWindowName`](#webonlywindowname)
  - [Web launch result](#web-launch-result)
  - [`canLaunchUrl` on web](#canlaunchurl-on-web)
  - [Web security](#web-security)
- [Desktop](#desktop)
  - [HTTP(S)](#https)
  - [Custom schemes](#custom-schemes)
  - [`file:`](#file)

---


### Portable baseline

Use:

```dart
Uri buildSmsUri(String recipient) {
  return Uri(
    scheme: 'sms',
    path: recipient,
  );
}
```

Do not publish a universal message-body recipe.

Apple's first-party SMS URL documentation specifies:

```text
sms:<phone>
```

and explicitly states that the URL must not include message text or other information.

The `url_launcher` changelog for 6.3.1 says incorrect SMS instructions were removed.

Therefore:

- recipient-only `sms:` is the safe cross-platform `url_launcher` pattern;
- if a body must be prefilled, investigate a platform-specific API or dedicated messaging package;
- do not assume Android and iOS accept identical SMS query syntax;
- test any platform-specific integration on the actual supported OS/application handlers;
- never treat a successful launch as "SMS sent."

---

## Custom Schemes

Example:

```dart
final uri = Uri(
  scheme: 'partnerapp',
  host: 'orders',
  pathSegments: <String>[orderId],
);
```

Use custom schemes only when:

- the target application documents them;
- product behavior genuinely requires the native app;
- a fallback exists when practical.

### Fallback chain

```dart
Future<bool> openPartnerApp({
  required Uri nativeUri,
  required Uri webUri,
}) async {
  try {
    final nativeOpened = await launchUrl(
      nativeUri,
      mode: LaunchMode.externalApplication,
    );

    if (nativeOpened) {
      return true;
    }
  } catch (_) {
    // Record a privacy-safe native-launch failure.
  }

  try {
    return await launchUrl(
      webUri,
      mode: LaunchMode.externalApplication,
    );
  } catch (_) {
    return false;
  }
}
```

In production, replace the broad catches with categorized error handling.

### Security

Do not use possession of a custom scheme as proof of application identity.

Apple explicitly warns:

- multiple apps can register the same custom scheme;
- the selected target is undefined;
- reverse-DNS naming does not prevent collision;
- universal links are recommended where verified association matters.

Treat app-specific schemes as routing mechanisms, not cryptographic identity.

---

## Universal Links and Android App Links

`url_launcher` opens an HTTP(S) URI.

It does **not**:

- configure the target application's associated domains;
- host or verify Apple's association file;
- configure Android Digital Asset Links;
- determine domain ownership;
- guarantee that an installed app receives the URI.

Apple Universal Links use verified website/application association and fall back to the browser when the app is unavailable.

For generic HTTPS:

```text
launching HTTPS
≠
forcing a specific installed app
```

Platform association, installed applications, defaults, and user/system state determine the final target.

---

## Maps

Treat maps as an external URI-integration problem.

Prefer, in order:

1. a product-owned or vendor-supported HTTPS maps link when browser fallback is acceptable;
2. a platform-recognized generic map URI where the target platform specification supports it;
3. a documented vendor-specific custom scheme only when opening that specific map application is a requirement.

Android documents map `ACTION_VIEW` URIs such as `geo:` as a platform integration option.

Do not:

- hardcode a vendor-specific custom scheme without fallback;
- assume a particular maps app is installed;
- assume generic HTTPS forces a native map application.

For location text, encode dynamic values properly.

---

## App Store / Play Store

Prefer stable HTTPS listing destinations where a web fallback is acceptable.

### Google Play

Construct a Play listing URI safely:

```dart
Uri buildPlayStoreUri(String packageName) {
  return Uri(
    scheme: 'https',
    host: 'play.google.com',
    path: '/store/apps/details',
    queryParameters: <String, String>{
      'id': packageName,
    },
  );
}
```

Google's Android documentation publishes the HTTPS store-listing form and notes that native Android code can constrain an intent to the Play Store if necessary. `url_launcher` does not expose an Android `Intent.setPackage` parameter, so do not claim that a generic `launchUrl` can force Google Play specifically.

### Apple App Store

Prefer the application's official public App Store product-page URI.

```dart
Uri buildAppStoreUri(String appId) {
  return Uri(
    scheme: 'https',
    host: 'apps.apple.com',
    path: '/app/id$appId',
  );
}
```

Validate the exact production listing format used by the product rather than generating arbitrary store targets from untrusted input.

### Product rule

Use store-specific schemes only when:

- explicitly required;
- documented for the target platform;
- tested;
- accompanied by an HTTPS fallback.

---

## Android

### Mental model

On Android, `url_launcher` ultimately depends on Android intent resolution.

The application asks the platform to handle a URI. Android decides:

- whether a matching activity exists;
- which eligible application receives the intent;
- whether a chooser/default applies;
- whether a browser or app receives an HTTP(S) URI.

Do not infer target identity from `launchUrl`.

### Android Package Visibility

Android 11/API 30 introduced package visibility rules that restrict queries about installed applications.

The `url_launcher` README specifically requires `<queries>` entries for schemes passed to `canLaunchUrl`; otherwise capability checks commonly return false on Android 11+. It also notes that querying support for `inAppBrowserView` needs a Custom Tabs service query.

Example:

```xml
<manifest ...>
    <queries>
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="sms" />
        </intent>

        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="tel" />
        </intent>

        <intent>
            <action android:name="android.support.customtabs.action.CustomTabsService" />
        </intent>
    </queries>

    <application ...>
        ...
    </application>
</manifest>
```

Add only queries your application actually uses.

Do not copy every possible scheme into the manifest.

### Query visibility is not launchability

Do not assume:

```text
cannot query handler
=
cannot send an intent
```

This distinction is exactly why `canLaunchUrl` can return false when a subsequent direct launch may work.

When the feature has a fallback, prefer:

```dart
final success = await launchUrl(uri);
```

over preflight detection.

### Android custom schemes

If the UI depends on knowing whether a custom-scheme handler exists:

1. add an appropriate `<queries>` declaration;
2. verify the target app is installed;
3. verify the URI exactly matches the target's documented scheme/host/path;
4. then use `canLaunchUrl`.

If the UI does not need advance knowledge, attempt launch and use the fallback chain instead.

### Android browser behavior

For generic HTTP(S):

- installed browsers and verified applications participate in Android resolution;
- user defaults may control the selected handler;
- an eligible verified app may receive a link;
- otherwise a browser can receive it.

Do not promise a specific browser unless using a different Android-specific integration capable of targeting a package.

### Android Custom Tabs / in-app browser

`LaunchMode.inAppBrowserView` is intended for a browser-style in-app surface such as Android Custom Tabs where supported.

If exact support matters:

```dart
final supported =
    await supportsLaunchMode(LaunchMode.inAppBrowserView);
```

and ensure the manifest contains the documented Custom Tabs service query if capability detection is used.

Do not perform this query repeatedly.

### Android WebView mode

Use `LaunchMode.inAppWebView` only for HTTP(S).

Example:

```dart
final launched = await launchUrl(
  uri,
  mode: LaunchMode.inAppWebView,
  webViewConfiguration: const WebViewConfiguration(
    enableJavaScript: true,
    enableDomStorage: true,
  ),
);
```

Do not assume `headers`, JavaScript, DOM storage, or browser configuration behave identically on iOS or desktop.

### Android telephone behavior

Do not add `CALL_PHONE` merely because the application launches `tel:`.

Direct calls and URI handoff are different operations. `ACTION_CALL` is the Android operation requiring `CALL_PHONE`; opening a telephone URI through an external handler is not justification for requesting that permission.

### Android diagnostics

If Android launch fails:

- inspect URI structure;
- inspect scheme;
- inspect requested mode;
- check target app installation;
- check `<queries>` if using capability checks;
- verify OS/API-level behavior;
- test the URI with platform tools;
- inspect `adb logcat`;
- verify resolved `url_launcher_android` version.

---

## iOS

### Mental model

On Apple platforms, `url_launcher` asks the operating system to open a URI.

For HTTP(S), the resulting target can depend on:

- browser behavior;
- Universal Link association;
- installed target application;
- user/system state;
- requested `LaunchMode`.

For custom schemes, another registered app may receive the URI.

### `LSApplicationQueriesSchemes`

If the application calls `canLaunchUrl` for nonstandard or queried schemes, add those schemes to `LSApplicationQueriesSchemes`.

The package README explicitly states that unlisted schemes passed to `canLaunchUrl` return false.

Example:

```xml
<key>LSApplicationQueriesSchemes</key>
<array>
    <string>sms</string>
    <string>tel</string>
    <string>partnerapp</string>
</array>
```

Do not add schemes merely because they are launched.

The configuration is primarily about querying availability.

### iOS custom schemes

Do not treat scheme registration as target verification.

Apple recommends Universal Links when unique association with a website/application matters and warns that another app can register the same custom scheme.

### iOS Universal Links

An HTTPS Universal Link can:

- open the associated installed application;
- otherwise open the web destination.

`url_launcher` does not own the domain/app association.

### iOS in-app browser behavior

`inAppBrowserView` maps conceptually to a Safari browser-style surface such as `SFSafariViewController`. The `LaunchMode` documentation names `SFSafariViewController` as a representative implementation.

Do not describe this as equivalent to arbitrary embedded WebView control.

### iOS `inAppWebView` nuance

The public API differentiates `inAppWebView` and `inAppBrowserView`, but individual platform implementations may map modes to similar native surfaces or ignore unsupported configuration fields.

If behavior such as JavaScript policy, headers, session handling, close control, or title visibility is critical, verify:

1. the resolved `url_launcher_ios` version;
2. its source/changelog;
3. behavior on supported iOS versions.

Do not extrapolate Android WebView semantics to iOS.

### Simulator limitations

The package README notes that iOS simulators do not have default email or phone apps, so `tel:` or `mailto:` can fail even though they work on a configured physical device.

Use real-device integration tests for those capabilities.

---

## Web

Web requires a different mental model.

### User gesture

Browsers commonly restrict new-tab/window opening unless directly associated with user activation.

The current `url_launcher_web` documentation specifically warns that awaiting a Future before launching can lose the browser's perception of direct user interaction. It recommends keeping the URI synchronously ready or using `_self` where appropriate.

Good:

```dart
final Uri helpUri = Uri.parse('https://example.com/help');

Future<void> onHelpPressed() async {
  await launchUrl(
    helpUri,
    webOnlyWindowName: '_blank',
  );
}
```

Risky:

```dart
Future<void> onHelpPressed() async {
  final uri = await fetchDestinationFromServer();

  // A browser may no longer regard this as directly user-initiated.
  await launchUrl(
    uri,
    webOnlyWindowName: '_blank',
  );
}
```

Design the flow so that:

- launch target is ready before the click where possible;
- a new tab/window is opened directly from the gesture;
- `_self` is considered when losing the current tab is acceptable;
- OAuth or complex redirect behavior is owned by an authentication integration designed for web.

### `webOnlyWindowName`

Current top-level API behavior includes:

- `_blank` → new tab/window;
- `_self` → current tab;
- default when unset → new tab.

Treat other standard browser target names according to browser semantics.

### Web launch result

On the current web implementation, `launchUrl` returns `true` for allowed schemes because it cannot determine whether the new browser window successfully opened when using its window-opening strategy.

Therefore:

```text
true on web
≠
user actually reached destination
```

This is even weaker than normal platform-handoff semantics.

### `canLaunchUrl` on web

Web pages cannot inspect installed native applications. The API documentation says web capability checks return false except for a small set of schemes assumed to work, such as HTTP(S).

Do not build install-detection UX around web `canLaunchUrl`.

### Web security

Never trust arbitrary URI schemes from externally controlled content.

Allowlist expected schemes before launch.

For ordinary links:

```dart
const allowedSchemes = <String>{
  'https',
};
```

For a feature that explicitly supports communication:

```dart
const allowedSchemes = <String>{
  'https',
  'mailto',
  'tel',
};
```

Reject unexpected:

```text
javascript:
data:
file:
unknown custom schemes
```

unless an explicitly reviewed feature requires them.

---

## Desktop

The published package supports Windows, macOS, and Linux.

Treat desktop launching primarily as default-application handoff.

### HTTP(S)

Expect the desktop OS to use its registered application/default browser.

Do not assume mobile-only in-app modes exist.

If a specific mode is required, call `supportsLaunchMode` rather than guessing.

### Custom schemes

A custom scheme requires an installed registered handler.

Provide fallback behavior where possible.

### `file:`

The package documents `file:` handling on:

- Windows;
- macOS;
- Linux.

Use `Uri.file`.

```dart
import 'dart:io';

import 'package:url_launcher/url_launcher.dart';

Future<bool> openDesktopFile(File file) async {
  if (!await file.exists()) {
    return false;
  }

  final uri = Uri.file(file.absolute.path);

  try {
    return await launchUrl(uri);
  } catch (_) {
    return false;
  }
}
```

For production, log a safe failure category rather than swallowing every exception.

On macOS, opening files outside the application sandbox can require appropriate entitlements.

Do not generalize this desktop `file:` support to Android/iOS.

---

