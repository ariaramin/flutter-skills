# Contents

- flutter_secure_storage Security Engineering Skill for Flutter
  - Purpose
  - When to Use This Skill
- When NOT to Use flutter_secure_storage
- Threat Model
  - What secure storage is intended to improve
  - What it does not guarantee
- Platform Backend Matrix
- Core Principles
- Architecture
- Package Setup
- Storage Instance Lifecycle
- Key Naming Strategy
- Environment Separation
- Basic Operations
- write
- read
- delete
- deleteAll
- readAll
- containsKey
- Secret Classification
- Secure Storage vs Preferences vs Database
- Secure Storage vs Encrypted Database

---

# flutter_secure_storage Security Engineering Skill for Flutter

## Purpose

Use this skill to design, implement, review, migrate, test, debug, and secure persistent secrets in production Flutter applications using `flutter_secure_storage`.

Treat `flutter_secure_storage` as a **small encrypted credential/key-value persistence boundary backed by platform-specific security mechanisms**, not as:

- a general database;
- a complete authentication system;
- a server-side secret vault;
- protection against a fully compromised runtime;
- automatic session revocation;
- automatic biometric authentication in every configuration;
- a substitute for authorization or backend security.

At the time of this skill's research, the current stable package is **`flutter_secure_storage` 11.0.0**. Version 11 is especially migration-sensitive on Android: deprecated Android algorithms and options removed in v11 must be migrated while running v10 before upgrading if existing installations may still contain data written with those deprecated mechanisms.

Always inspect the repository's locked package version before modifying existing code. Do not apply v11 assumptions blindly to a project still running v9 or v10.

---

## When to Use This Skill

Use this skill when implementing or reviewing:

- OAuth access-token persistence;
- refresh-token persistence;
- session identifiers;
- device-provisioned credentials;
- locally generated encryption keys;
- encrypted-database master keys;
- private cryptographic material;
- authentication bootstrap;
- logout cleanup;
- account switching;
- credential rotation;
- secure-storage migrations;
- Android Keystore behavior;
- Android backup/restore failures;
- Android biometric-protected storage;
- Apple Keychain accessibility;
- Apple Keychain access groups;
- Keychain synchronization;
- Secure Enclave-backed storage;
- macOS Keychain behavior;
- Web Crypto storage;
- Linux Secret Service/libsecret deployment;
- Windows secure-storage migration;
- credential-store dependency injection;
- performance problems caused by excessive secure-storage access;
- platform-specific secure-storage failures;
- package upgrades involving persisted secrets.

---

# When NOT to Use flutter_secure_storage

Do not use secure storage merely because data is persistent.

Classify the data first.

| Data | Preferred storage |
| --- | --- |
| Theme | Preferences |
| Locale | Preferences |
| Onboarding-complete flag | Preferences |
| Feature flag cache | Preferences/database |
| Ordinary cached API response | Cache/database |
| Large JSON document | Database/file |
| Image/video | File storage |
| Search history | Database/preferences depending on size |
| Scroll position | Preferences/state restoration |
| Analytics buffer | Database/file |
| Access token that must survive restart | Secure storage |
| Refresh token | Secure storage |
| Database encryption key | Secure storage |
| Runtime-provisioned private credential | Secure storage |
| Server-only API secret | Do not put it in the Flutter client |
| Large encrypted dataset | Encrypted database; secure-storage only for its key |

Do not turn secure storage into a general-purpose encrypted database.

Secure credential stores are optimized for relatively small secret values, not large datasets or high-frequency writes.

---

# Threat Model

## What secure storage is intended to improve

Use `flutter_secure_storage` primarily to protect sensitive values **at rest** using the security facilities available on the current platform.

Depending on platform/configuration, this improves protection against:

- casual inspection of application files;
- plaintext preference/database extraction;
- another ordinary sandboxed application reading the value;
- accidental plaintext backup exposure;
- direct inspection of encrypted payload files;
- opportunistic credential theft from ordinary local storage.

The actual protection comes substantially from the operating system or browser security backend, not from Dart code alone.

## What it does not guarantee

Do not claim that secure storage makes client-side secrets impossible to extract.

It does not inherently protect a secret from:

- a fully rooted/jailbroken and hostile device;
- privileged malware;
- debugger access to the running application;
- runtime instrumentation;
- memory inspection while the plaintext secret is being used;
- malicious code executing inside the application process;
- an XSS attacker executing JavaScript in the same web origin;
- application logging;
- screenshots of secrets displayed by the UI;
- clipboard leakage;
- network interception outside the storage boundary;
- reverse engineering of constants compiled into the application;
- a malicious or compromised backend;
- server-side token replay;
- application logic that sends the secret somewhere unsafe.

Use this mental model:

```text
Secret at rest
↓
flutter_secure_storage
↓
platform security mechanism
↓
improved resistance to local extraction

Secret being actively used
↓
application memory
↓
different threat boundary
```

`encrypted at rest` does not mean `secret from the running process`.

---

# Platform Backend Matrix

Do not assume equivalent implementation or security semantics across platforms.

| Platform | Current mechanism | Important characteristics |
| --- | --- | --- |
| Android | Package-managed encrypted storage with keys protected by Android Keystore; v10+ defaults use RSA-OAEP key wrapping + AES-GCM payload encryption | Android 11 package line requires migration of deprecated v10-era algorithms before upgrading; backup/restore requires special attention |
| iOS | Apple Keychain | Supports accessibility, access groups, synchronization controls, access-control flags, and optional Secure Enclave path |
| macOS | Apple Keychain | Shares Apple options; macOS also has Data Protection Keychain considerations |
| Web | Web Crypto + browser storage | Experimental package implementation; HTTPS/localhost required; origin/browser dependent; not XSS-resistant |
| Linux | libsecret / Secret Service-compatible keyring | Requires libsecret plus an available keyring/Secret Service provider |
| Windows | Encrypted file-based implementation with Windows security/credential facilities and migration support for older storage | `WindowsOptions.useBackwardCompatibility` exists for older stored values; do not assume old and new storage formats are interchangeable |

Always verify the package version and platform implementation before making stronger cryptographic claims.

---

# Core Principles

Apply these rules by default:

1. **Classify the value before storing it.**
2. **Persist secrets only when persistence is actually required.**
3. **Treat the client device as partially trusted, never fully trusted.**
4. **Never embed server-only secrets in a Flutter binary.**
5. **Centralize secure-storage keys.**
6. **Centralize platform options.**
7. **Wrap `FlutterSecureStorage` behind a typed application abstraction for non-trivial applications.**
8. **Keep secure-storage access out of widget `build()` methods.**
9. **Do not read secure storage for every authenticated HTTP request when a safe session-memory cache is appropriate.**
10. **Delete session credentials during logout.**
11. **Remember that local deletion does not revoke server credentials.**
12. **Design refresh-token rotation atomically at the application level.**
13. **Coordinate logout, refresh, and account switching.**
14. **Never log credential values.**
15. **Never dump `readAll()` into logs.**
16. **Use `deleteAll()` only when every item in that storage domain is intended to be destroyed.**
17. **Understand Android backup/restore behavior before release.**
18. **Do not assume uninstall clears Apple Keychain state.**
19. **Choose Apple accessibility based on actual background/device-migration requirements.**
20. **Do not enable Keychain synchronization without a product requirement.**
21. **Do not claim secure storage automatically implies biometric protection.**
22. **Recover reconstructable tokens differently from irreplaceable encryption keys.**
23. **Treat key names, namespaces, algorithms, accessibility settings, and application identifiers as migration-sensitive configuration.**
24. **Test migration using data written by the old released version.**
25. **Prefer security correctness and recoverability over minor performance optimizations.**

---

# Architecture

Prefer:

```text
UI / Bloc / Cubit / ViewModel
↓
Auth Repository / Session Manager
↓
CredentialStore
↓
flutter_secure_storage
↓
Platform security backend
```

Avoid:

```text
Widget
↓
FlutterSecureStorage().read(...)
↓
Widget
↓
FlutterSecureStorage().write(...)
```

throughout the application.

A secure-storage wrapper provides:

- typed operations;
- centralized key names;
- centralized platform options;
- migration boundaries;
- test replacement;
- controlled error handling;
- controlled logging;
- account isolation;
- future backend replacement.

Do not introduce unnecessary abstraction for a trivial one-secret application, but do not scatter storage primitives throughout a production authentication architecture.

---

# Package Setup

For a new repository targeting the current stable API:

```yaml
dependencies:
  flutter_secure_storage: ^11.0.0
```

Before upgrading an existing repository, inspect:

```text
pubspec.yaml
pubspec.lock
AndroidOptions
IOSOptions
MacOsOptions
WindowsOptions
WebOptions
historical package version
```

Do not upgrade directly from pre-v10 Android storage to v11 without reviewing migration requirements.

If secure storage is used before Flutter has initialized plugin channels, initialize bindings first:

```dart
import 'package:flutter/widgets.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  runApp(const App());
}
```

Do not block `runApp()` on secure-storage reads unless application architecture genuinely requires pre-widget initialization.

---

# Storage Instance Lifecycle

`FlutterSecureStorage` is lightweight Dart configuration around platform implementations, but do not instantiate it arbitrarily throughout the UI.

Prefer one configured application-scoped instance:

```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

abstract final class SecureStorageFactory {
  static const storage = FlutterSecureStorage(
    aOptions: AndroidOptions(),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.unlocked,
    ),
    mOptions: MacOsOptions(
      accessibility: KeychainAccessibility.unlocked,
    ),
  );
}
```

Or inject it:

```dart
final class SecureCredentialStore {
  SecureCredentialStore(this._storage);

  final FlutterSecureStorage _storage;
}
```

Keep platform policy consistent unless individual secrets intentionally require different policies.

---

# Key Naming Strategy

Centralize keys.

```dart
abstract final class SecureStorageKeys {
  static const accessToken = 'auth.access_token';
  static const refreshToken = 'auth.refresh_token';
  static const databaseKey = 'storage.database_key';
  static const activeAccountId = 'auth.active_account_id';

  static String accountRefreshToken(String accountId) {
    return 'auth.account.$accountId.refresh_token';
  }
}
```

Use namespaces such as:

```text
auth.*
storage.*
device.*
account.<id>.*
```

Do not include secret material in key names.

Bad:

```text
refresh_token_eyJhbGciOi...
```

Better:

```text
auth.refresh_token
```

Treat key-name changes as migrations.

---

# Environment Separation

Development, staging, and production must not unintentionally share credentials.

Use separate:

- Android application IDs;
- Apple bundle identifiers where practical;
- Android storage namespaces where required;
- Apple service/access-group configuration where required;
- storage-key prefixes where necessary.

Do not allow a staging build to accidentally reuse production refresh tokens.

Environment separation should primarily follow application identity, with logical key namespaces providing additional clarity.

---

# Basic Operations

Current `FlutterSecureStorage` exposes asynchronous operations including:

```dart
Future<void> write({
  required String key,
  required String? value,
  ...
});

Future<String?> read({
  required String key,
  ...
});

Future<void> delete({
  required String key,
  ...
});

Future<void> deleteAll({...});

Future<Map<String, String>> readAll({...});

Future<bool> containsKey({
  required String key,
  ...
});
```

Platform options can be configured on the `FlutterSecureStorage` instance and overridden per operation where supported.

---

# write

Use:

```dart
await storage.write(
  key: SecureStorageKeys.refreshToken,
  value: refreshToken,
);
```

Writing an existing logical key replaces/updates its value according to the platform implementation.

Do not assume multiple writes across several keys form a transaction.

This:

```dart
await storage.write(key: 'access', value: access);
await storage.write(key: 'refresh', value: refresh);
```

can fail between operations.

If two credentials must remain logically consistent, design application-level recovery/versioning.

A `null` write value has package-defined behavior and historical semantics; do not use `write(value: null)` as a clever substitute for explicit deletion. Use:

```dart
await storage.delete(key: key);
```

when deletion is the intention.

---

# read

Use:

```dart
final token = await storage.read(
  key: SecureStorageKeys.refreshToken,
);
```

A missing key normally resolves to `null`.

Distinguish:

```text
key absent
```

from:

```text
platform operation failed
```

Do not convert every platform exception into `null`; doing so can hide corruption or configuration failures.

---

# delete

Delete specific secret domains explicitly:

```dart
await storage.delete(
  key: SecureStorageKeys.accessToken,
);

await storage.delete(
  key: SecureStorageKeys.refreshToken,
);
```

Prefer explicit deletion during ordinary logout when unrelated secrets must survive.

---

# deleteAll

Use:

```dart
await storage.deleteAll();
```

only when the entire storage namespace is disposable.

Do not use it casually if storage contains both:

```text
auth.refresh_token
storage.database_key
device.private_key
```

because logging out of a session should not necessarily destroy an encrypted database or device identity.

Prefer domain-aware deletion.

---

# readAll

Use `readAll()` for:

- controlled migration;
- diagnostic tooling that never exposes values;
- intentionally enumerating a small secure namespace.

Do not use it merely to retrieve one key.

Bad:

```dart
final all = await storage.readAll();
final token = all['auth.refresh_token'];
```

Better:

```dart
final token = await storage.read(
  key: SecureStorageKeys.refreshToken,
);
```

Never:

```dart
print(await storage.readAll());
```

---

# containsKey

Use:

```dart
final exists = await storage.containsKey(
  key: SecureStorageKeys.databaseKey,
);
```

when existence itself is the required answer.

Do not perform:

```dart
if (await storage.containsKey(key: key)) {
  final value = await storage.read(key: key);
}
```

unless the distinction matters. That doubles platform work and introduces a race between operations.

Usually:

```dart
final value = await storage.read(key: key);

if (value != null) {
  ...
}
```

is sufficient.

---

# Secret Classification

Classify every persisted value.

| Class | Examples | Strategy |
| --- | --- | --- |
| Non-sensitive | theme, locale | Preferences |
| Sensitive, reconstructable | short-lived access token | Memory preferred; secure persistence only when restart requirements justify it |
| Sensitive, long-lived | refresh token | Secure storage |
| Local cryptographic key | encrypted-database key | Secure storage; strong recovery policy |
| User critical private key | wallet/private signing material | Secure storage may be part of architecture, but require explicit threat/recovery design |
| Server-only credential | backend private API key | Never ship in client |

The more irreplaceable the secret, the less acceptable automatic destructive recovery becomes.

---

# Secure Storage vs Preferences vs Database

| Requirement | Preferred mechanism |
| --- | --- |
| Small secret | `flutter_secure_storage` |
| Non-secret setting | Preferences |
| Large structured data | SQLite/Hive/other database |
| Large sensitive dataset | Encrypted database |
| Database encryption key | Secure storage |
| Ephemeral access credential | Memory |
| Binary file | File storage, encrypt separately if required |

Do not encrypt every application value merely because encryption exists.

---

# Secure Storage vs Encrypted Database

Use this common architecture for large sensitive datasets:

```text
Secure Storage
↓
Database master key
↓
Encrypted database
↓
Application records
```

Advantages:

- secure storage holds only a small high-value key;
- database provides indexing/query/transactions;
- large payloads avoid credential-store overhead;
- cryptographic responsibility is clearer.

Do not store thousands of database rows as thousands of secure-storage key/value entries.

---

