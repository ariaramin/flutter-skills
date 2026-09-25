# Contents

- Android
  - Current Android Baseline
- Android Keystore
- Android Default Configuration
- Android Biometric-Protected Storage
- Android Backup / Restore
- Android Restore Failure Strategy
    - Auth credentials
    - Reconstructable provisioning credential
    - Database encryption key
    - Irreplaceable private key
- Android resetOnError
- Android Namespace Isolation
- Android Migration
  - v9/pre-v10 → v10 → v11
- Android Algorithm Migration
- Android Migration Safety
- iOS
- Keychain Accessibility
- Apple Device-Only Accessibility
- Apple Device Lock State
- Apple Keychain Access Groups
- Apple Synchronizable Credentials
- Secure Enclave on iOS/macOS
- Secure Enclave Migration
- Biometric / User Presence on Apple Platforms
- App Reinstall / Keychain Persistence
- macOS
- Web
- Web Storage Model
- Web and XSS
- Browser Persistence
- Linux
- Windows

---

# Android

Android requires especially careful version and backup reasoning.

## Current Android Baseline

The v11 release line:

- removes deprecated Android algorithms/options previously retained for migration;
- raises the Android minimum to API 24;
- removes the old `encryptedSharedPreferences` option;
- removes deprecated `sharedPreferencesName`;
- uses `storageNamespace` for namespace isolation.

If existing users may have storage written by versions before v10, upgrade them through v10 first so migration can occur before deploying v11.

Do not treat that requirement as optional cleanup.

---

# Android Keystore

Conceptually, current default non-biometric Android storage uses:

```text
Application secret
↓
AES-GCM encryption
↓
AES data-encryption key
↓
wrapped using RSA-OAEP
↓
RSA key protected by Android Keystore
```

Current v10+ defaults use:

```text
KeyCipherAlgorithm.RSA_ECB_OAEPwithSHA_256andMGF1Padding
StorageCipherAlgorithm.AES_GCM_NoPadding
```

The operating system protects Keystore key material according to device/platform capabilities.

Do not claim that every Android device provides identical hardware-backed protection.

Android Keystore can provide hardware-backed protection on suitable devices, but hardware properties vary.

---

# Android Default Configuration

For ordinary secure credentials, use the current defaults unless a specific threat model requires otherwise:

```dart
const storage = FlutterSecureStorage(
  aOptions: AndroidOptions(),
);
```

Do not copy old tutorials configuring:

```text
encryptedSharedPreferences
RSA_ECB_PKCS1Padding
AES_CBC_PKCS7Padding
sharedPreferencesName
```

into new v11 code.

Those belong to older package generations/migration paths.

---

# Android Biometric-Protected Storage

Current package versions support an Android biometric configuration:

```dart
final storage = FlutterSecureStorage(
  aOptions: AndroidOptions.biometric(
    enforceBiometrics: true,
    biometricPromptTitle: 'Authenticate',
  ),
);
```

Strict biometric/device-auth behavior is platform/API-level dependent.

For strong-biometric-only behavior:

```dart
final storage = FlutterSecureStorage(
  aOptions: AndroidOptions.biometric(
    enforceBiometrics: true,
    biometricType: AndroidBiometricType.strongBiometricOnly,
    biometricPromptTitle: 'Authenticate',
  ),
);
```

Add required Android biometric permissions when using this functionality.

Do not say:

```text
flutter_secure_storage = biometric storage
```

The ordinary default Android configuration does not inherently prompt for biometrics.

Use biometric-gated storage only when UX and threat requirements justify repeated authentication.

---

# Android Backup / Restore

This is a production-critical concern.

The package documentation warns that Android backup can restore encrypted preference data without restoring the corresponding Keystore material, producing errors such as:

```text
java.security.InvalidKeyException: Failed to unwrap key
```

Do not ignore this warning.

The simplest package-documented configuration is:

```xml
<application
    android:allowBackup="false"
    ...>
</application>
```

However, disabling all application backup affects more than secure storage.

For applications that require Android backup for other data, prefer carefully scoped Android backup/data-extraction rules that exclude the secure-storage files while preserving legitimate backup data.

Treat backup policy as a product/security decision, not a copy-pasted manifest flag.

Verify current Android backup syntax for the application's minimum/target SDK before implementation.

---

# Android Restore Failure Strategy

If restored encrypted data cannot be decrypted, recovery depends on secret type.

### Auth credentials

Reasonable policy:

```text
decrypt failure
↓
invalidate local session
↓
remove unusable auth state
↓
require login
```

### Reconstructable provisioning credential

Re-provision from the trusted server if protocol permits.

### Database encryption key

Do **not** automatically delete and regenerate if an existing important encrypted database depends on it.

### Irreplaceable private key

Do **not** silently reset.

Escalate to explicit recovery/error handling.

---

# Android resetOnError

Historical/current v10 behavior changed `resetOnError` defaults because many key-storage failures are unrecoverable.

Do not enable destructive reset behavior blindly for critical encryption keys.

Before relying on automatic reset, classify every value sharing that storage namespace.

A policy safe for:

```text
refresh token
```

may destroy access to:

```text
user's encrypted local archive
```

if both are coupled incorrectly.

Separate critical secret domains where appropriate.

---

# Android Namespace Isolation

Current Android APIs support `storageNamespace`.

Use it when independent secure-storage instances genuinely require isolated:

- encrypted data;
- Keystore aliases;
- configuration;
- key storage.

Example:

```dart
const authStorage = FlutterSecureStorage(
  aOptions: AndroidOptions(
    storageNamespace: 'auth',
  ),
);

const databaseKeyStorage = FlutterSecureStorage(
  aOptions: AndroidOptions(
    storageNamespace: 'database_keys',
  ),
);
```

Do not create namespaces casually. Changing a namespace later makes existing values appear absent unless explicitly migrated.

Treat namespace changes as data migrations.

---

# Android Migration

## v9/pre-v10 → v10 → v11

This is the important current migration path.

Version 11 removed deprecated Android algorithms/features.

If an installed population may contain pre-v10 data:

```text
old release
↓
deploy v10
↓
allow v10 migration to current ciphers/backend
↓
verify migration in production
↓
later deploy v11
```

Do not jump directly from old storage to v11 and assume removed algorithms can still decrypt old values.

---

# Android Algorithm Migration

Version 10 introduced `migrateOnAlgorithmChange`.

Migration behavior must be tested against actual old persisted fixtures/installations.

Current migration support also includes crash-resistant migration via `migrateWithBackup` in the v10-era migration tooling.

When performing a migration release, prefer the documented backup-protected migration mode for high-value credentials where supported by the selected version.

Do not confuse package migration backups with Android cloud Auto Backup. They solve different problems.

---

# Android Migration Safety

Before changing:

- key cipher;
- storage cipher;
- biometric mode;
- namespace;
- package version;

perform:

```text
write using released old version
↓
upgrade application
↓
read old data
↓
write new data
↓
restart
↓
read again
↓
test interrupted migration
```

Do not rely only on a fresh-install test.

---

# iOS

The Apple implementation uses Keychain Services.

The package supports shared Apple configuration through `IOSOptions`/`AppleOptions`, including current options for:

- accessibility;
- access groups;
- synchronizable items;
- access-control flags;
- metadata/query options;
- Secure Enclave mode.

Use Keychain as a credential store, not as a general application database.

---

# Keychain Accessibility

Current `KeychainAccessibility` values include:

```dart
KeychainAccessibility.passcode
KeychainAccessibility.unlocked
KeychainAccessibility.unlocked_this_device
KeychainAccessibility.first_unlock
KeychainAccessibility.first_unlock_this_device
```

Default package behavior uses:

```dart
KeychainAccessibility.unlocked
```

Choose the most restrictive accessibility level that still supports application behavior.

| Requirement | Candidate |
| --- | --- |
| Foreground credential needed only while unlocked | `unlocked` |
| Background processing after first post-reboot unlock | `first_unlock` |
| Same as above but device-bound migration semantics | `first_unlock_this_device` |
| Foreground secret that must not migrate to another device | `unlocked_this_device` |
| Require device passcode and device-only semantics | `passcode` |

Do not choose `first_unlock` merely because it makes background access easier.

Do not choose device-only accessibility everywhere without considering legitimate device migration/recovery requirements.

---

# Apple Device-Only Accessibility

The `*_this_device` modes intentionally prevent migration of those Keychain items to a new device according to Apple Keychain accessibility semantics.

Use them when device binding is part of the security design.

Examples:

- device-specific private material;
- locally generated key that must not migrate.

Do not use them for credentials users reasonably expect to survive device migration unless the product has a re-provisioning strategy.

---

# Apple Device Lock State

With `unlocked` accessibility, reads may fail/be unavailable while protected data is inaccessible.

Do not assume a background task can always read Keychain values.

If background execution must occur after reboot while the device is locked, evaluate `first_unlock` against the threat model.

The package also exposes Cupertino protected-data availability functionality in supported versions. Use it only where lock-state-aware behavior is actually required.

---

# Apple Keychain Access Groups

Current Apple options support `groupId`/Keychain sharing scenarios.

Use access groups only when credentials must be shared between:

- multiple applications from the same team;
- an application and extension;
- intentionally related signed targets.

Correct entitlements are required.

The package documentation requires Keychain Sharing configuration for iOS/macOS and warns that incorrect access-group setup can cause writes to appear successful while later reads do not find the value.

Do not broaden Keychain access groups without a concrete sharing requirement.

---

# Apple Synchronizable Credentials

Current Apple options expose:

```dart
synchronizable: true
```

for supported Keychain items.

Do not enable synchronization by default.

Synchronizable Keychain items can propagate through iCloud Keychain subject to Apple platform behavior.

That changes the security/lifecycle model from:

```text
secret belongs to this device
```

to potentially:

```text
secret belongs to user's synchronized Keychain environment
```

Apple does not permit `ThisDeviceOnly` accessibility modes with synchronizable items.

Use synchronization only when cross-device credential availability is a deliberate product requirement.

Remember that deleting/updating synchronized Keychain items can affect synchronized copies.

---

# Secure Enclave on iOS/macOS

Current package documentation supports opt-in Secure Enclave-backed protection through Apple options:

```dart
final storage = FlutterSecureStorage();

await storage.write(
  key: SecureStorageKeys.refreshToken,
  value: refreshToken,
  iOptions: const IOSOptions(
    useSecureEnclave: true,
    accessControlFlags: [
      AccessControlFlag.userPresence,
    ],
  ),
);
```

The current package design encrypts the stored value using an AES key and protects/wraps that key using an elliptic-curve private key residing in the Secure Enclave.

Do not claim the secret string itself is literally stored inside Secure Enclave hardware.

The protected key operation is the hardware-backed part.

---

# Secure Enclave Migration

`useSecureEnclave` is a storage-path decision.

Existing ordinary Keychain values are not automatically converted merely because new reads use:

```dart
useSecureEnclave: true
```

For existing installations:

```text
read old value using old configuration
↓
write value using Secure Enclave configuration
↓
verify new read
↓
delete old representation
```

Do not switch the flag and assume old credentials remain visible.

Treat Secure Enclave adoption as a data migration.

---

# Biometric / User Presence on Apple Platforms

Current package APIs expose Keychain access-control flags.

Use flags such as user-presence requirements only when the secret should require interactive authorization.

Do not claim:

```text
Keychain storage = biometric prompt
```

Ordinary Keychain storage does not necessarily prompt for Face ID/Touch ID.

Biometric/user-presence behavior depends on configured access controls and device capabilities.

Also configure required platform privacy descriptions when using Face ID where Apple requires them.

---

# App Reinstall / Keychain Persistence

Do **not** design security assuming:

```text
uninstall app
↓
all iOS Keychain items deleted
```

Keychain lifecycle is not identical to the application sandbox lifecycle, and Keychain items may survive uninstall/reinstall in scenarios relevant to application design.

Therefore:

- validate persisted tokens with the server during bootstrap;
- maintain explicit logout cleanup;
- do not use reinstall as a security reset mechanism;
- consider detecting fresh-install application state if product policy requires Keychain cleanup.

Never automatically restore an authenticated UI merely because a Keychain token exists. Validate session state.

---

# macOS

macOS uses Apple Keychain through the Darwin implementation.

Configure Keychain Sharing entitlements correctly.

`MacOsOptions` extends Apple options and includes Data Protection Keychain configuration.

Apple notes that accessibility attributes on macOS Keychain items require the Data Protection Keychain or synchronizable behavior where applicable.

Do not assume legacy macOS Keychain and iOS-style Data Protection Keychain semantics are identical.

Test:

- Debug;
- Profile;
- Release;
- sandboxed distribution configuration.

Entitlement differences frequently explain "works locally, fails in release" behavior.

---

# Web

Treat web as a fundamentally different threat environment.

The package's web implementation is documented as **experimental** and uses Web Crypto plus browser storage.

It requires:

```text
HTTPS
```

or:

```text
localhost
```

for supported development behavior.

Do not assume mobile secure-storage guarantees apply to web.

---

# Web Storage Model

The package uses browser-generated cryptographic material so encrypted stored values are intended to be tied to the browser/origin environment rather than being portable ciphertext that can simply be copied elsewhere.

Current `WebOptions` include:

```dart
const WebOptions(
  dbName: 'FlutterEncryptedStorage',
  publicKey: 'FlutterSecureStorage',
  wrapKey: '',
  wrapKeyIv: '',
  useSessionStorage: false,
);
```

`useSessionStorage: true` changes persistence semantics toward browser-session storage.

Do not hardcode a supposedly secret application `wrapKey` into Flutter web JavaScript and then describe it as an inaccessible secret. Client-delivered JavaScript cannot hide a server-only secret from the client.

---

# Web and XSS

This is non-negotiable:

```text
encrypted browser storage
≠
protection from malicious JavaScript executing in the same origin
```

If an attacker gains same-origin script execution through XSS, the attacker may invoke application/browser APIs in the same security context and steal credentials while the application uses them.

Therefore web credential security requires:

- XSS prevention;
- Content Security Policy where appropriate;
- secure dependencies;
- HTTPS;
- secure cookies/server session architecture where appropriate;
- careful token exposure design.

Do not present `flutter_secure_storage` as an XSS defense.

---

# Browser Persistence

Do not promise web credentials survive:

- clearing site data;
- private/incognito session closure;
- browser-profile deletion;
- origin changes;
- browser migration;
- storage policy changes.

The package explicitly describes encrypted web data as non-portable across browser/machine/origin contexts.

Treat browser persistence as best-effort application storage, not durable identity infrastructure.

---

# Linux

The Linux implementation depends on `libsecret`.

For Debian/Ubuntu-style environments, package documentation requires development/runtime packages equivalent to:

```text
libsecret-1-dev
libsecret-1-0
```

Other distributions provide equivalent packages.

A compatible keyring/Secret Service provider must also exist, commonly:

- GNOME Keyring;
- KDE-compatible keyring infrastructure;
- another Secret Service provider.

Do not assume Linux secure storage works in a minimal headless CI container.

CI and headless deployments may have:

- no D-Bus session;
- no unlocked keyring;
- no Secret Service;
- no interactive unlock UI.

Use fakes for ordinary unit tests and reserve real keyring behavior for configured integration environments.

---

# Windows

Current Windows implementations no longer simply mirror the original credential-store-only design.

The package migrated to encrypted file-based storage in modern versions and retains backward-compatibility behavior for older values.

Current options include:

```dart
const WindowsOptions(
  useBackwardCompatibility: false,
);
```

Enable backward compatibility only when upgrading an installed population that may contain values written using the old Windows backend.

The option can impose additional lookup/migration behavior and has restrictions around some key names.

Do not enable it forever without a migration retirement plan.

Treat changes to Windows application/company/product identity as storage-location/migration risks.

---

