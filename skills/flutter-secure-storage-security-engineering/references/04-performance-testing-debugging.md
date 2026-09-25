# Contents

- Performance
- HTTP Request Performance
- High-Frequency Writes
- Startup
- Dependency Injection
- Bloc / Cubit Integration
- Testing Strategy
  - Unit tests
- Credential Store Tests
- Migration Tests
- Logout Tests
- Multi-Account Tests
- Platform Integration Tests
- Debugging Workflow
  - read() returns null
- Android unwrap/decryption error
- iOS value unexpectedly survives reinstall
- Apple read succeeds in one build mode but not another
- Web storage failure
- Linux failure
- Windows failure
- Production-Only Failure
- Observability

---

# Performance

Secure-storage operations may involve:

- Dart↔platform boundaries;
- cryptographic operations;
- OS credential services;
- disk I/O;
- biometric/user-presence prompts.

Do not place them on hot UI/request paths unnecessarily.

Bad:

```dart
Widget build(BuildContext context) {
  return FutureBuilder(
    future: storage.read(key: 'auth.access_token'),
    builder: ...,
  );
}
```

Better:

```text
bootstrap/session manager
↓
read once
↓
publish session state
↓
widgets observe state
```

---

# HTTP Request Performance

Bad:

```dart
Future<void> onRequest(
  RequestOptions options,
) async {
  final token = await storage.read(
    key: SecureStorageKeys.accessToken,
  );

  options.headers['Authorization'] =
      'Bearer $token';
}
```

for every request.

Better:

```text
secure storage
↓ startup
SessionManager
↓
in-memory access token
↓
HTTP interceptor
```

Persist only when credential state changes.

---

# High-Frequency Writes

Do not use secure storage for:

- keystrokes;
- animation state;
- counters;
- scroll position;
- telemetry events;
- rapidly changing form drafts.

Secure storage is not a write-ahead application state database.

---

# Startup

Prefer:

```text
runApp
↓
Bootstrap state = loading
↓
CredentialStore.read()
↓
server/session validation if required
↓
authenticated or unauthenticated state
```

This gives the application a UI while credential bootstrap occurs.

Do not block before `runApp()` merely because secure storage is asynchronous.

Pre-`runApp` credential reads are appropriate only when initialization truly cannot proceed without them.

---

# Dependency Injection

Register the low-level storage at application scope.

Conceptually:

```dart
final storage = FlutterSecureStorage(
  aOptions: const AndroidOptions(),
  iOptions: const IOSOptions(
    accessibility: KeychainAccessibility.unlocked,
  ),
);

final credentialStore =
    FlutterSecureCredentialStore(storage);

final authRepository = AuthRepository(
  credentialStore: credentialStore,
);
```

Inject `CredentialStore` into authentication code.

Do not inject raw `FlutterSecureStorage` into every feature.

---

# Bloc / Cubit Integration

Prefer:

```text
LoginScreen
↓
AuthCubit
↓
AuthRepository
↓
CredentialStore
↓
flutter_secure_storage
```

`AuthCubit` should reason about:

```text
authenticated
unauthenticated
loading
failure
```

rather than platform storage keys.

Do not scatter:

```dart
storage.read(key: 'refreshToken')
```

across blocs.

---

# Testing Strategy

Use multiple layers.

## Unit tests

Test application authentication code using a fake `CredentialStore`.

```dart
final class FakeCredentialStore
    implements CredentialStore {
  AuthCredentials? _credentials;

  @override
  Future<AuthCredentials?> read() async {
    return _credentials;
  }

  @override
  Future<void> write(
    AuthCredentials credentials,
  ) async {
    _credentials = credentials;
  }

  @override
  Future<void> clear() async {
    _credentials = null;
  }
}
```

Do not require Android Keystore/Apple Keychain for every repository unit test.

---

# Credential Store Tests

Test:

- missing credentials;
- write/read;
- overwrite;
- clear;
- partial credential state;
- platform failure mapping;
- migration;
- failed migration write;
- account isolation;
- logout;
- token rotation.

---

# Migration Tests

Migration tests must use values written with the old schema/configuration.

Test:

```text
old key exists
new key absent
→ migrate successfully
```

and:

```text
old key exists
new write fails
→ old key remains
```

and:

```text
migration interrupted
→ rerun safely
```

For Android major upgrades, run real application upgrade tests using an APK/build containing the previous released package version.

---

# Logout Tests

Verify:

```text
memory access token = null
memory refresh token = null
persistent access token absent
persistent refresh token absent
unrelated database key still present
```

if that is the intended policy.

Also test in-flight refresh cancellation/race behavior.

---

# Multi-Account Tests

Verify:

```text
account A token
≠
account B token
```

and switching does not leak old memory state.

Test deletion of one account without deleting another.

---

# Platform Integration Tests

Use real platforms for:

- Android Keystore;
- Android backup/restore behavior;
- Android biometric mode;
- Android package upgrade migration;
- iOS Keychain accessibility;
- iOS access groups;
- Apple Secure Enclave;
- reinstall behavior;
- macOS entitlements;
- Linux keyring availability;
- Windows backward-compatibility migration;
- Web HTTPS/origin behavior.

Mocks cannot prove platform security configuration.

---

# Debugging Workflow

## read() returns null

Inspect:

1. exact key name;
2. package version;
3. platform options;
4. environment/application identity;
5. Android namespace;
6. Apple access group/service;
7. account namespace;
8. whether the value was written;
9. whether a migration changed configuration;
10. uninstall/reinstall behavior;
11. Secure Enclave path mismatch;
12. Windows old/new backend;
13. web origin/browser storage state.

Do not immediately assume the value was deleted.

---

# Android unwrap/decryption error

Inspect:

1. Android Auto Backup/restore;
2. Keystore state;
3. package version;
4. old algorithm;
5. migration path;
6. namespace;
7. biometric configuration;
8. whether data was restored from another device/install;
9. `resetOnError` policy.

For auth tokens, forced reauthentication may be appropriate.

For critical keys, do not blindly clear storage.

---

# iOS value unexpectedly survives reinstall

Do not treat this as proof of package corruption.

Inspect:

- Keychain item lifecycle;
- service/account configuration;
- access group;
- synchronizable state;
- fresh-install policy.

If product security requires "reinstall means logged out", implement explicit application policy rather than assuming sandbox deletion clears Keychain.

---

# Apple read succeeds in one build mode but not another

Inspect:

- Debug entitlements;
- Profile entitlements;
- Release entitlements;
- Keychain Sharing;
- code-signing entitlement file path;
- access group.

The package documentation specifically warns about incorrectly configured Keychain Sharing causing values to appear written but not be retrievable.

---

# Web storage failure

Inspect:

1. HTTPS/secure context;
2. localhost development environment;
3. browser support;
4. origin;
5. private browsing;
6. cleared site data;
7. storage restrictions;
8. changed `WebOptions`;
9. Content Security Policy/runtime JavaScript failures.

Do not assume encrypted browser data is portable to another origin/browser.

---

# Linux failure

Inspect:

1. `libsecret` development dependency;
2. runtime `libsecret`;
3. D-Bus session;
4. Secret Service provider;
5. keyring daemon;
6. keyring unlock state;
7. sandbox/Flatpak permissions;
8. headless CI environment.

---

# Windows failure

Inspect:

- package version;
- current storage location;
- `useBackwardCompatibility`;
- application/company/product identity;
- key-name restrictions under backward compatibility;
- whether data was written by an older Windows implementation.

Do not delete old values before confirming migration.

---

# Production-Only Failure

Compare Debug vs Release:

```text
Android applicationId/signing/backup rules
Apple bundle ID/entitlements/access groups
macOS sandbox entitlements
Windows product/company identity
Web production origin/HTTPS
Linux packaged runtime dependencies
```

Release identity differences are frequently storage-identity differences.

---

# Observability

Record non-secret metadata:

```text
secure_storage_read_failed
credential_type=refresh_token
platform=android
category=undecryptable
```

Good:

```text
secure_storage_migration_completed
from_schema=2
to_schema=3
```

Bad:

```text
refresh_token=eyJ...
database_key=1f92...
```

Do not attach raw platform exceptions to analytics if they may contain sensitive contextual data without sanitization.

---

