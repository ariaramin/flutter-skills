# Contents

- Access Token Strategy
- Refresh Token Strategy
- Typed Credential Store
- Authentication Integration
- In-Memory Credential Cache
- Token Rotation
- Concurrency
- Logout
- Account Deletion
- Multi-Account Storage
- Database Encryption Key Strategy
- Losing a Database Encryption Key
    - Reconstructable cache
    - Critical local data
    - User-generated irreplaceable data
- Private Keys
- Hardcoded Secrets
- API Keys
    - Public client identifier
    - Restricted public mobile API key
    - Server private key/API secret
- Runtime Memory
- Logging
- Clipboard and UI
- Rooted / Jailbroken Devices
- Migration
- Key Rename Migration
- Migration Versioning
- Application Identifier Changes
- Error Handling
- Recovery by Secret Type

---

# Access Token Strategy

Access tokens are usually short-lived credentials.

Ask first:

```text
Does the access token need to survive process termination?
```

If no:

```text
login/refresh
↓
access token
↓
session memory
```

may be sufficient.

If restart persistence is required:

```text
secure storage
↓ startup
session manager
↓
memory
```

Do not read secure storage for every API request.

A common production architecture is:

```text
secure persistent refresh token
+
in-memory access token
```

with the access token reconstructed/refreshed at startup.

The exact strategy depends on backend protocol and offline requirements.

---

# Refresh Token Strategy

Treat refresh tokens as high-value credentials.

Persist them in secure storage when persistent login is required.

Requirements:

- never log them;
- rotate them according to server protocol;
- replace old persisted values when rotation succeeds;
- clear them on logout;
- separate accounts;
- coordinate refresh and logout;
- revoke server-side when logout/security policy requires it.

Do not store refresh tokens in ordinary preferences.

---

# Typed Credential Store

For production authentication code, prefer:

```dart
abstract interface class CredentialStore {
  Future<AuthCredentials?> read();

  Future<void> write(AuthCredentials credentials);

  Future<void> clear();
}

final class AuthCredentials {
  const AuthCredentials({
    required this.accessToken,
    required this.refreshToken,
  });

  final String accessToken;
  final String refreshToken;
}
```

Implementation:

```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

abstract final class SecureStorageKeys {
  static const accessToken = 'auth.access_token';
  static const refreshToken = 'auth.refresh_token';
}

final class FlutterSecureCredentialStore
    implements CredentialStore {
  FlutterSecureCredentialStore(this._storage);

  final FlutterSecureStorage _storage;

  @override
  Future<AuthCredentials?> read() async {
    final accessToken = await _storage.read(
      key: SecureStorageKeys.accessToken,
    );

    final refreshToken = await _storage.read(
      key: SecureStorageKeys.refreshToken,
    );

    if (accessToken == null || refreshToken == null) {
      return null;
    }

    return AuthCredentials(
      accessToken: accessToken,
      refreshToken: refreshToken,
    );
  }

  @override
  Future<void> write(AuthCredentials credentials) async {
    await _storage.write(
      key: SecureStorageKeys.accessToken,
      value: credentials.accessToken,
    );

    await _storage.write(
      key: SecureStorageKeys.refreshToken,
      value: credentials.refreshToken,
    );
  }

  @override
  Future<void> clear() async {
    await _storage.delete(
      key: SecureStorageKeys.accessToken,
    );

    await _storage.delete(
      key: SecureStorageKeys.refreshToken,
    );
  }
}
```

Remember: two independent writes are not an application transaction. Add versioning/recovery if partial token-pair persistence is unacceptable.

---

# Authentication Integration

Prefer:

```text
HTTP client
↓
Auth/Session Coordinator
↓
CredentialStore
↓
flutter_secure_storage
```

And:

```text
UI
↓
Auth Bloc/Cubit/ViewModel
↓
Auth Repository
↓
Session Coordinator
```

Do not let widgets own credential persistence.

---

# In-Memory Credential Cache

Secure storage is persistence, not necessarily the best hot-path token source.

Use:

```text
App startup
↓
secure storage read
↓
session manager
↓
in-memory credentials
↓
HTTP requests
```

Then:

```text
token refresh
↓
update secure persistence
↓
update memory
```

And:

```text
logout
↓
invalidate memory
↓
delete persistent credentials
```

Do not maintain multiple uncontrolled token copies across blocs, repositories, interceptors, and widgets.

One authoritative session state is preferable.

---

# Token Rotation

Refresh-token rotation is a concurrency problem as well as a storage problem.

Conceptually:

```text
old refresh token
↓
server refresh request
↓
server returns new refresh/access pair
↓
persist new credential state
↓
publish new in-memory state
↓
old token no longer used
```

However, handle failures carefully.

If the server invalidates the old refresh token immediately and the application crashes before persisting the new one, the session may become unrecoverable.

The correct strategy depends on server rotation semantics.

Do not claim secure storage itself makes multi-key token rotation atomic.

---

# Concurrency

Secure storage does not solve application-level races.

Dangerous sequence:

```text
Task A: starts token refresh
Task B: logs out
Task B: deletes tokens
Task A: refresh succeeds
Task A: writes new token
```

Result:

```text
user appears logged out
but valid credential is persisted again
```

Coordinate session mutations.

A simple application-level mutex/epoch strategy:

```dart
final class SessionEpoch {
  int _value = 0;

  int snapshot() => _value;

  void invalidate() {
    _value++;
  }

  bool isCurrent(int snapshot) => snapshot == _value;
}
```

Refresh:

```text
capture epoch
↓
perform network refresh
↓
verify epoch still current
↓
only then persist
```

Logout increments the epoch before/while invalidating state.

For complex clients, use a serialized auth coordinator.

---

# Logout

A robust logout flow commonly looks like:

```text
invalidate session generation
↓
stop/reject in-flight refresh
↓
clear in-memory credentials
↓
request server revocation if required
↓
delete persisted session credentials
↓
clear account-scoped caches
↓
reset authenticated dependency scope
↓
show logged-out UI
```

Do not leave local tokens active merely because remote revocation failed unless product policy explicitly requires retry behavior.

Remember:

```text
secure storage delete
≠
server token revocation
```

If a stolen refresh token remains valid on the server, deleting the local copy does not invalidate the stolen copy.

---

# Account Deletion

Account deletion may require broader cleanup than logout.

Identify:

```text
session credentials
account encryption keys
account-specific device credentials
encrypted local user data
account caches
```

Do not destroy unrelated device-scoped secrets automatically.

---

# Multi-Account Storage

Never allow account A to read account B's token accidentally.

Use account-scoped keys:

```dart
String refreshTokenKey(String accountId) {
  return 'auth.account.$accountId.refresh_token';
}
```

Keep active-account identity separate:

```text
auth.active_account_id
```

Switching accounts should:

```text
invalidate current in-memory session
↓
select target account
↓
read target account credentials
↓
validate target session
↓
publish target session
```

Do not reuse the previous account's in-memory access token during transition.

---

# Database Encryption Key Strategy

For a large encrypted local database:

```text
first launch
↓
generate cryptographically secure random database key
↓
store key in flutter_secure_storage
↓
create/open encrypted database using key
```

Do not store:

```text
database.db
database_key.txt
```

next to each other in plaintext.

Use a cryptographically secure random source appropriate to the selected Dart/platform cryptography implementation.

Never generate cryptographic keys with predictable values such as:

```dart
DateTime.now().millisecondsSinceEpoch.toString()
```

or non-cryptographic `Random()`.

---

# Losing a Database Encryption Key

If:

```text
encrypted database exists
+
database key is missing
```

do not automatically:

```text
generate new key
↓
continue
```

That can silently orphan all existing encrypted data.

Instead classify the database:

### Reconstructable cache

It may be acceptable to delete database + create new key.

### Critical local data

Enter recovery/error flow.

### User-generated irreplaceable data

Require an explicit backup/recovery architecture before shipping.

Secure storage is not itself a backup system.

---

# Private Keys

For high-value private cryptographic keys, determine whether the key must ever exist as extractable plaintext.

`flutter_secure_storage` can protect stored bytes, but a protocol that requires loading the private key into Dart memory has a different threat model from non-exportable hardware-backed signing.

If non-exportable hardware-backed signing is required, use platform cryptographic key APIs/appropriate specialized packages rather than assuming a stored string provides equivalent protection.

---

# Hardcoded Secrets

Never do:

```dart
const backendSecret =
    'super-secret-production-private-key';
```

then:

```dart
await storage.write(
  key: 'api_secret',
  value: backendSecret,
);
```

This does not protect the secret.

An attacker can recover the original constant from the application binary/runtime.

Secure storage is useful for secrets provisioned/generated **after installation** or otherwise legitimately available to the client.

A mobile/web client cannot safely hold a server-only secret.

---

# API Keys

Classify API credentials.

### Public client identifier

May legitimately exist in client configuration.

### Restricted public mobile API key

May exist client-side with server/provider restrictions such as application identity, quotas, or limited permissions.

### Server private key/API secret

Must remain server-side.

Do not use secure storage to pretend a compiled server secret became private.

---

# Runtime Memory

Every usable token eventually exists in process memory in some representation.

Therefore:

- minimize unnecessary copies;
- do not put tokens into global debug state;
- do not serialize them into crash metadata;
- do not display them;
- do not retain them after logout longer than necessary.

Dart does not provide a general guarantee that immutable `String` secret bytes can be securely zeroed immediately.

Do not promise secure memory erasure that the runtime cannot guarantee.

---

# Logging

Never log:

```dart
print(accessToken);
debugPrint(refreshToken);
logger.info(await storage.readAll());
```

Log semantic metadata:

```text
credential_read_failed
credential_rotation_completed
credential_delete_failed
secure_storage_migration_started
```

If key identity is useful, log a non-secret category:

```text
credential_type=refresh_token
```

not the credential value.

---

# Clipboard and UI

Do not copy secrets to clipboard unless explicitly required.

Do not expose tokens through debug screens in production.

If a private value must be shown, consider platform screenshot/privacy controls appropriate to the threat model.

Secure storage cannot protect a secret deliberately rendered on screen.

---

# Rooted / Jailbroken Devices

Do not promise security against a fully compromised device.

Platform secure stores substantially improve protection compared with plaintext files, but privileged attackers may:

- instrument the app;
- inspect memory;
- intercept API calls;
- bypass application controls.

Root/jailbreak detection can be a risk signal, not an absolute security boundary.

Server-side authorization, short token lifetimes, rotation, revocation, anomaly detection, and device risk controls remain important.

---

# Migration

Treat migration as a first-class feature whenever changing:

- package major version;
- Android cipher;
- Android storage namespace;
- Android backend;
- secure-storage key name;
- Apple accessibility;
- Apple Secure Enclave usage;
- Apple access group;
- Apple service/account configuration;
- Windows backend compatibility;
- application/bundle identifier.

Never assume a configuration refactor is data-neutral.

---

# Key Rename Migration

Use:

```text
read new key
↓
if found → use it
↓
otherwise read old key
↓
if absent → no credential
↓
write new key
↓
verify/read new key if critical
↓
delete old key
```

Example:

```dart
Future<String?> migrateKey({
  required FlutterSecureStorage storage,
  required String oldKey,
  required String newKey,
}) async {
  final current = await storage.read(key: newKey);
  if (current != null) {
    return current;
  }

  final legacy = await storage.read(key: oldKey);
  if (legacy == null) {
    return null;
  }

  await storage.write(
    key: newKey,
    value: legacy,
  );

  final verified = await storage.read(key: newKey);
  if (verified != legacy) {
    throw StateError(
      'Secure storage migration verification failed',
    );
  }

  await storage.delete(key: oldKey);

  return verified;
}
```

Do not delete the old value before the new value is successfully persisted.

---

# Migration Versioning

For complex migrations, maintain a non-secret schema/migration version separately.

Example:

```text
secure_storage_schema_version = 3
```

The version itself does not need secure storage unless it reveals sensitive information.

Use migration code that is:

- idempotent;
- restartable;
- observable without logging secrets;
- tested from every supported upgrade path.

---

# Application Identifier Changes

Changing:

```text
Android applicationId
Apple bundle ID
Keychain access group
service/account namespace
Windows application/company identity
```

can change what secure storage is accessible.

Treat rebranding/package-renaming projects as credential migrations.

Do not discover this after production rollout.

---

# Error Handling

Map platform failures into application-level categories.

```dart
enum SecureCredentialFailure {
  unavailable,
  authenticationRequired,
  permissionOrEntitlement,
  corruptedOrUndecryptable,
  migrationFailed,
  platformFailure,
}
```

Do not expose raw platform exception messages directly to end users.

Retain sanitized technical details for diagnostics.

---

# Recovery by Secret Type

| Secret | Typical recovery |
| --- | --- |
| Access token | Refresh/re-login |
| Refresh token | Reauthenticate |
| Device-provisioned credential | Re-provision if protocol allows |
| Reconstructable database cache key | Rebuild cache if policy permits |
| Critical database key | Do not destroy automatically |
| User private key | Explicit recovery/backup strategy required |

Do not implement one universal:

```dart
catch (_) {
  await storage.deleteAll();
}
```

policy.

---

