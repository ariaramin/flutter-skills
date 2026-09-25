# Parser/integration/platform tests and systematic debugging workflows

## Contents

- [Testing Strategy](#testing-strategy)
  - [Parser unit tests](#parser-unit-tests)
- [URI Security Test Matrix](#uri-security-test-matrix)
- [Integration Tests](#integration-tests)
- [Cold-Start Tests](#cold-start-tests)
- [Warm-Start Tests](#warm-start-tests)
- [Authentication Tests](#authentication-tests)
- [Duplicate Tests](#duplicate-tests)
- [Android Association Tests](#android-association-tests)
- [iOS Association Tests](#ios-association-tests)
- [Debugging Workflow](#debugging-workflow)
  - [Link never reaches Dart](#link-never-reaches-dart)
- [Android: HTTPS Link Opens Browser](#android-https-link-opens-browser)
- [iOS: Universal Link Opens Safari](#ios-universal-link-opens-safari)
- [Initial Link Missing](#initial-link-missing)
- [Link Received Twice](#link-received-twice)

---

# Testing Strategy

Use layered testing.

## Parser unit tests

Test raw URI → typed intent independently of `app_links`.

```dart
import 'package:flutter_test/flutter_test.dart';

void main() {
  const parser = DeepLinkParser();

  group('DeepLinkParser', () {
    test('parses valid product link', () {
      final result = parser.parse(
        Uri.parse('https://example.com/products/42'),
      );

      expect(result, isA<ValidDeepLink>());

      final intent = (result as ValidDeepLink).intent;
      expect(intent, isA<OpenProduct>());
      expect((intent as OpenProduct).productId, '42');
    });

    test('rejects untrusted host', () {
      final result = parser.parse(
        Uri.parse('https://example.com.evil.test/products/42'),
      );

      expect(result, isA<RejectedDeepLink>());
    });

    test('rejects unsupported scheme', () {
      final result = parser.parse(
        Uri.parse('javascript:alert(1)'),
      );

      expect(result, isA<RejectedDeepLink>());
    });

    test('rejects unsupported path', () {
      final result = parser.parse(
        Uri.parse('https://example.com/admin/delete/all'),
      );

      expect(result, isA<RejectedDeepLink>());
    });
  });
}
```

---

# URI Security Test Matrix

Test at least:

| Input | Expected |
| --- | --- |
| `https://example.com/products/42` | `OpenProduct("42")` |
| `https://www.example.com/products/42` | Valid only if allowlisted |
| `https://evil.example/products/42` | Reject |
| `https://example.com.evil.test/products/42` | Reject |
| `http://example.com/products/42` | Reject if HTTPS-only |
| `myapp://open/products/42` | Valid only if custom scheme supported |
| `javascript:alert(1)` | Reject |
| Missing product ID | Reject |
| Excessively long token | Reject |
| Unsupported path | Reject |
| Duplicated redirect parameter | Reject or resolve explicitly |
| External `next=https://evil.test` | Reject |

Also test:

- percent encoding;
- Unicode paths;
- empty host;
- unexpected port;
- trailing slash semantics;
- duplicated query keys;
- fragments;
- malformed tokens.

---

# Integration Tests

Test the coordinator with a fake source.

Define an abstraction:

```dart
abstract interface class DeepLinkSource {
  Future<Uri?> getInitialLink();

  Stream<Uri> get links;
}
```

Production:

```dart
final class AppLinksDeepLinkSource
    implements DeepLinkSource {
  AppLinksDeepLinkSource({AppLinks? appLinks})
      : _appLinks = appLinks ?? AppLinks();

  final AppLinks _appLinks;

  @override
  Future<Uri?> getInitialLink() {
    return _appLinks.getInitialLink();
  }

  @override
  Stream<Uri> get links {
    return _appLinks.uriLinkStream;
  }
}
```

Fake:

```dart
import 'dart:async';

final class FakeDeepLinkSource implements DeepLinkSource {
  FakeDeepLinkSource({
    this.initialLink,
  });

  final Uri? initialLink;
  final StreamController<Uri> _controller =
      StreamController<Uri>.broadcast();

  @override
  Future<Uri?> getInitialLink() async {
    return initialLink;
  }

  @override
  Stream<Uri> get links => _controller.stream;

  void emit(Uri uri) {
    _controller.add(uri);
  }

  Future<void> dispose() {
    return _controller.close();
  }
}
```

This enables deterministic tests without platform channels.

---

# Cold-Start Tests

Test explicitly:

```text
app terminated
↓
activate URI
↓
app process launches
↓
initial URI captured
↓
startup gates complete
↓
destination opens once
```

Do not consider a parser unit test equivalent to a cold-start platform test.

---

# Warm-Start Tests

Test:

```text
app running on unrelated screen
↓
activate URI externally
↓
uriLinkStream event received
↓
same parser used
↓
navigation occurs once
```

Also test while:

- app foregrounded;
- app backgrounded then resumed;
- modal/dialog open;
- nested Navigator active.

---

# Authentication Tests

Cover:

1. protected link while logged out;
2. login succeeds;
3. destination retained;
4. pending intent revalidated;
5. user reaches destination once.

Also test:

- login canceled;
- login fails;
- user switches account;
- token expires during login;
- authenticated user lacks resource permission;
- logout occurs before deferred resolution completes.

---

# Duplicate Tests

Feed the same valid URI twice:

```dart
final uri = Uri.parse(
  'https://example.com/products/42',
);

expect(
  deduplicator.shouldHandle(
    uri,
    DateTime(2026, 1, 1, 12),
  ),
  isTrue,
);

expect(
  deduplicator.shouldHandle(
    uri,
    DateTime(2026, 1, 1, 12, 0, 1),
  ),
  isFalse,
);
```

For high-value actions, separately test backend idempotency.

---

# Android Association Tests

Verify:

- manifest intent filter;
- scheme;
- host;
- path pattern;
- `autoVerify`;
- deployed `assetlinks.json`;
- application ID;
- release fingerprint;
- Play App Signing fingerprint;
- `adb shell pm get-app-links`;
- actual external tap behavior.

Do not stop after:

```bash
adb shell am start ...
```

because forcing an intent can test Activity routing without proving normal verified-web-link behavior.

---

# iOS Association Tests

Verify:

- Associated Domains capability;
- `applinks:` domain;
- correct bundle identifier;
- correct application identifier prefix/team setup;
- deployed AASA;
- AASA `components`;
- production signing;
- real device;
- Safari/context behavior.

Remember that Apple uses CDN-backed association fetching on current iOS/macOS versions, so updated AASA content can be affected by caching.

---

# Debugging Workflow

## Link never reaches Dart

Inspect in order:

```text
Does OS consider app eligible?
↓
Is scheme/domain registered?
↓
Does verification succeed?
↓
Is Flutter default handler competing?
↓
Did native app_links receive event?
↓
Did Dart listener start?
↓
Was URI rejected by parser?
```

Do not start by changing router code.

---

# Android: HTTPS Link Opens Browser

Check:

1. link uses expected HTTPS host;
2. intent filter matches exact host/path;
3. `VIEW`;
4. `DEFAULT`;
5. `BROWSABLE`;
6. `android:autoVerify="true"`;
7. `assetlinks.json` accessible;
8. package name correct;
9. production fingerprint correct;
10. domain state with `pm get-app-links`;
11. app installed/updated after association changes;
12. user defaults.

---

# iOS: Universal Link Opens Safari

Check:

1. Associated Domains capability exists;
2. entitlement contains exact `applinks:` host;
3. AASA exists for that host;
4. AASA app ID matches signed application;
5. path/components match;
6. device has refreshed association;
7. browser interaction context;
8. user previously chose website behavior;
9. third-party browser supports Universal Links as expected.

Do not claim app_links can override OS/user Universal Link policy.

---

# Initial Link Missing

Inspect:

- `AppLinks` created/subscribed early enough;
- package version/API;
- Android startup intent filter;
- iOS Scene lifecycle setup;
- Flutter default deep-link handler conflict;
- competing plugin;
- whether URI actually launched the application;
- whether `uriLinkStream` already delivered the event;
- whether application deduplication accidentally discarded it.

---

# Link Received Twice

Inspect:

- `getInitialLink()` plus `uriLinkStream`;
- multiple `uriLinkStream` subscriptions;
- `stringLinkStream` and `uriLinkStream` both being consumed;
- router native deep-link handling;
- widget recreation;
- notification handler;
- repeated external activation.

Solve ownership first, dedup second.

---

