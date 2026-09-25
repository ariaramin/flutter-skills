# Testing, Debugging, OAuth/Payments & Migration

> Preserved from source lines 2021–2424 of `url_launcher Engineering Skill for Flutter.md`.
> Use this reference for detailed APIs, examples, caveats, platform notes, and source-grounded edge cases.

## Contents
- [Testing Strategy](#testing-strategy)
  - [Unit tests](#unit-tests)
  - [URI encoding tests](#uri-encoding-tests)
  - [Security tests](#security-tests)
  - [Widget tests](#widget-tests)
  - [Platform integration tests](#platform-integration-tests)
    - [Android](#android)
    - [iOS](#ios)
    - [Desktop](#desktop)
  - [Web tests](#web-tests)
- [Debugging Workflow](#debugging-workflow)
  - [`launchUrl` returns false or fails](#launchurl-returns-false-or-fails)
  - [`canLaunchUrl` false but launch may work](#canlaunchurl-false-but-launch-may-work)
  - [Android custom scheme cannot be detected](#android-custom-scheme-cannot-be-detected)
  - [iOS custom scheme cannot be detected](#ios-custom-scheme-cannot-be-detected)
  - [Web opens nothing](#web-opens-nothing)
  - [In-app mode fails](#in-app-mode-fails)
  - [Wrong application opens](#wrong-application-opens)
- [OAuth / Authentication Flows](#oauth-authentication-flows)
- [Payments](#payments)
- [Migration Workflow](#migration-workflow)

---

## Testing Strategy

### Unit tests

Unit-test application policy without external apps.

Test:

- allowed schemes;
- rejected schemes;
- host allowlist;
- exact versus subdomain handling;
- HTTPS requirement;
- fallback selection;
- email URI construction;
- query encoding;
- phone URI construction;
- SMS recipient construction;
- redaction/logging policy.

### URI encoding tests

Include:

```text
hello world
a&b
?q=
#
%
Unicode: Tere maailm
emoji: 🚀
```

Example:

```dart
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('HTTP query parameters cannot alter URL structure', () {
    final uri = Uri(
      scheme: 'https',
      host: 'example.com',
      path: '/search',
      queryParameters: <String, String>{
        'q': 'a&b ?q= 🚀',
      },
    );

    expect(uri.host, 'example.com');
    expect(uri.queryParameters['q'], 'a&b ?q= 🚀');
  });

  test('mailto query uses percent encoding', () {
    final uri = Uri(
      scheme: 'mailto',
      path: 'support@example.com',
      query: encodeQueryParameters(
        <String, String>{
          'subject': 'Hello world & Dart',
        },
      ),
    );

    expect(uri.query, contains('Hello%20world%20%26%20Dart'));
  });
}
```

### Security tests

Include:

```dart
import 'package:flutter_test/flutter_test.dart';

void main() {
  const allowedHosts = <String>{
    'example.com',
  };

  test('rejects lookalike domain', () {
    final uri = Uri.parse('https://example.com.evil.test/path');

    expect(
      isAllowedExternalWebUri(
        uri,
        allowedHosts: allowedHosts,
      ),
      isFalse,
    );
  });

  test('rejects javascript scheme', () {
    final uri = Uri.parse('javascript:alert(1)');

    expect(
      isAllowedExternalWebUri(
        uri,
        allowedHosts: allowedHosts,
      ),
      isFalse,
    );
  });

  test('rejects http when https required', () {
    final uri = Uri.parse('http://example.com');

    expect(
      isAllowedExternalWebUri(
        uri,
        allowedHosts: allowedHosts,
      ),
      isFalse,
    );
  });
}
```

Also test:

- `data:`;
- `file:` where not permitted;
- unexpected custom schemes;
- userinfo;
- nonstandard ports if disallowed;
- open-redirect targets;
- URLs containing secrets.

### Widget tests

Use a fake application abstraction.

```dart
final class FakeUriLauncher implements UriLauncher {
  bool result = true;
  int callCount = 0;
  Uri? lastUri;
  LaunchMode? lastMode;

  @override
  Future<bool> launch(
    Uri uri, {
    LaunchMode mode = LaunchMode.platformDefault,
  }) async {
    callCount++;
    lastUri = uri;
    lastMode = mode;
    return result;
  }
}
```

Verify:

- one tap triggers one launch;
- correct URI is built;
- expected mode is requested;
- failure renders fallback UX;
- duplicate taps are controlled where required;
- accessibility labels are meaningful.

### Platform integration tests

Use actual platform behavior for:

#### Android

- manifest `<queries>`;
- custom scheme;
- `canLaunchUrl`;
- browser launch;
- `inAppBrowserView`;
- fallback;
- API-level differences.

#### iOS

- `LSApplicationQueriesSchemes`;
- custom schemes;
- Universal Link behavior;
- in-app browser mode;
- real-device mail/phone handlers;
- simulator limitations.

#### Desktop

- default browser;
- custom scheme where supported;
- `file:` handling;
- missing file behavior.

### Web tests

Verify:

- launch called directly from a user gesture;
- `_blank` behavior;
- `_self` fallback where used;
- delayed asynchronous flows;
- browser popup blocking;
- safe fallback;
- security allowlists.

Do not consider a web `true` result proof that the destination opened. The current web implementation explicitly cannot determine that.

---

## Debugging Workflow

### `launchUrl` returns false or fails

Check in this order:

1. **Inspect the resolved package versions.**
2. **Print/log only safe URI metadata.**
3. **Verify URI syntax and components.**
4. **Verify the scheme is appropriate for the intended action.**
5. **Verify the requested launch mode.**
6. **For in-app modes, verify URI is HTTP(S).**
7. **Verify target handler/application exists.**
8. **Verify platform implementation supports the mode if exact behavior matters.**
9. **Inspect Android/iOS query configuration if capability checks are involved.**
10. **Check browser user-gesture restrictions on web.**
11. **Check platform console/logs.**
12. **Try a minimal known URI.**
13. **Compare with the current package/platform changelog.**
14. **Verify that the problem is launch failure, not downstream business-flow failure.**

### `canLaunchUrl` false but launch may work

Inspect:

- Android package visibility;
- iOS `LSApplicationQueriesSchemes`;
- web limitations;
- whether `canLaunchUrl` is needed at all.

The official package documentation explicitly calls out this situation.

### Android custom scheme cannot be detected

Check:

1. target application installed;
2. exact custom scheme;
3. host/path syntax;
4. `<queries>` intent;
5. API level;
6. resolved `url_launcher_android`;
7. actual launch as a diagnostic where safe.

### iOS custom scheme cannot be detected

Check:

1. target app on a physical device;
2. `LSApplicationQueriesSchemes`;
3. exact scheme spelling;
4. target application registration;
5. simulator versus real-device difference.

### Web opens nothing

Check:

1. whether launch originates directly from click/tap;
2. whether an awaited Future occurred first;
3. target `_blank` versus `_self`;
4. popup-blocker/browser policy;
5. browser console;
6. URI validation;
7. whether an external scheme is actually supported by the browser environment.

### In-app mode fails

Check:

1. HTTP(S) requirement;
2. `supportsLaunchMode`;
3. manifest query required for Android mode detection;
4. resolved platform implementation;
5. whether the requirement really needs a dedicated WebView package instead.

### Wrong application opens

The OS owns generic handler selection.

If a specific target application is genuinely required:

1. use its documented custom scheme or verified HTTPS mechanism;
2. validate availability where necessary;
3. provide an HTTPS/store fallback;
4. do not assume generic HTTPS forces the application.

---

## OAuth / Authentication Flows

Use `url_launcher` only as an opening mechanism.

A real OAuth/OIDC implementation must separately own:

- authorization URL generation;
- exact redirect URI;
- PKCE;
- state;
- nonce where required;
- callback validation;
- token exchange;
- token storage;
- browser-session security.

Do not improvise these around `launchUrl`.

Prefer a maintained authentication SDK/package when one exists.

Do not put bearer tokens or refresh tokens into arbitrary launch URLs.

Do not interpret:

```dart
await launchUrl(authorizationUri)
```

as authentication success.

Success comes from a validated callback/token flow.

---

## Payments

`url_launcher` can open a payment-provider URL.

It does not prove:

- payment authorization;
- capture;
- settlement;
- subscription creation;
- purchase completion.

Use provider/backend status as authoritative.

Never write:

```dart
if (await launchUrl(paymentUri)) {
  markOrderAsPaid();
}
```

The launch result only concerns launch initiation/handoff.

---

## Migration Workflow

The current URI-first API was introduced in `url_launcher 6.1.0`, deprecating the original `launch` and `canLaunch` APIs. That migration also replaced `forceSafariVC` / `forceWebView` with `LaunchMode` and moved WebView settings into `WebViewConfiguration`.

When upgrading:

1. inspect the current top-level `url_launcher` version;
2. inspect `pubspec.lock`;
3. find deprecated `launch(` calls;
4. find deprecated `canLaunch(` calls;
5. find string concatenation around URLs;
6. inspect legacy launch flags;
7. determine intended historical launch surface;
8. construct a `Uri`;
9. map old behavior to an intentional `LaunchMode`;
10. preserve fallback behavior;
11. add non-HTTP query encoding correctly;
12. reassess capability checks;
13. verify Android `<queries>`;
14. verify iOS `LSApplicationQueriesSchemes`;
15. test web activation behavior;
16. test desktop behavior if supported;
17. run integration tests on target OS versions.

Do not blindly replace:

```dart
launch(url);
```

with:

```dart
launchUrl(Uri.parse(url));
```

until you know:

- where `url` originated;
- whether it was safely encoded;
- which launch behavior users relied on;
- whether old force flags were present;
- whether fallback/error handling existed.

---

