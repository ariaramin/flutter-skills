# Contents

- Common Anti-Patterns
  - Storing ordinary preferences securely
  - Storing huge JSON documents
  - Reading secure storage in build()
  - Reading token for every request
  - Constructing storage everywhere
  - Scattered literal keys
  - readAll() for one value
  - Logging readAll()
  - Logging tokens
  - Hardcoded secret "protected" by secure storage
  - Assuming resistance to full device compromise
  - Assuming secure storage is biometric authentication
  - Plaintext encryption key beside encrypted database
  - Weak key generation
  - Regenerating a missing critical DB key
  - deleteAll() during every logout
  - Keeping refresh token after logout
  - Local deletion without server revocation
  - Refresh races with logout
  - Cross-account token reuse
  - Shared dev/prod credentials
  - Assuming uninstall clears iOS Keychain
  - Ignoring Android backup
  - Clearing everything after Android unwrap failure
  - Deprecated Android options
  - Treating web secure storage as XSS-safe
  - Server secret in Flutter binary
  - Writing every keystroke
  - Blocking runApp without requirement
  - Raw plugin exception shown to user
- New Secret Implementation Workflow
  - 1. Classify the value
  - 2. Determine whether persistence is required
  - 3. Determine whether secure storage is the correct medium
  - 4. Define threat model
  - 5. Define lifecycle
  - 6. Define namespace/key
  - 7. Define platform policy
  - 8. Define backup/reinstall behavior
  - 9. Implement a typed wrapper
  - 10. Decide memory-cache policy
  - 11. Define rotation
  - 12. Define logout
  - 13. Define account switching
  - 14. Define failure recovery
  - 15. Define migrations
  - 16. Add unit tests
  - 17. Add real platform tests
  - 18. Review logs
  - 19. Review backup configuration
  - 20. Verify upgrade path
- Existing-Code Review Workflow
- Refactoring Rules
- Code Review Checklist
- Android Security Checklist
- Apple Keychain Checklist
- Web Security Checklist
- Authentication Credential Checklist
- Encryption Key Checklist
- Performance Checklist
- Testing Checklist
- Production Readiness Checklist
- Quick Reference
- Final Engineering Rule

---

# Common Anti-Patterns

## Storing ordinary preferences securely

**Bad**

```dart
await storage.write(
  key: 'theme',
  value: 'dark',
);
```

**Why it is problematic**

It adds cryptographic/platform overhead without protecting meaningful secret material.

**Better**

Use preferences.

---

## Storing huge JSON documents

**Bad**

```dart
await storage.write(
  key: 'entire_user_cache',
  value: jsonEncode(hugeDataset),
);
```

**Why it is problematic**

Credential stores are not databases.

**Better**

Use an encrypted database if the dataset is sensitive.

---

## Reading secure storage in build()

**Bad**

```dart
Widget build(BuildContext context) {
  return FutureBuilder(
    future: storage.read(key: 'auth.access_token'),
    builder: ...,
  );
}
```

**Why it is problematic**

Rebuilds can cause repeated platform/crypto access.

**Better**

Load credentials through session/bootstrap state.

---

## Reading token for every request

**Bad**

```dart
final token = await storage.read(
  key: SecureStorageKeys.accessToken,
);
```

inside every HTTP interceptor call.

**Why it is problematic**

Adds unnecessary platform-channel/crypto/I/O latency.

**Better**

Cache the active access token in authoritative session memory.

---

## Constructing storage everywhere

**Bad**

```dart
final token = await const FlutterSecureStorage()
    .read(key: 'token');
```

throughout the codebase.

**Why it is problematic**

Configuration and policy become scattered.

**Better**

Inject one configured storage/wrapper.

---

## Scattered literal keys

**Bad**

```dart
'refresh_token'
'refreshToken'
'refresh-token'
```

**Why it is problematic**

Creates collisions and accidental credential loss.

**Better**

Use a centralized key registry.

---

## readAll() for one value

**Bad**

```dart
final token =
    (await storage.readAll())['refresh_token'];
```

**Better**

Use `read(key: ...)`.

---

## Logging readAll()

**Bad**

```dart
logger.debug(await storage.readAll());
```

**Why it is problematic**

This defeats the entire confidentiality boundary.

**Better**

Log only operation metadata.

---

## Logging tokens

**Bad**

```dart
logger.info('Refresh token: $refreshToken');
```

**Better**

```dart
logger.info('Refresh token updated');
```

---

## Hardcoded secret "protected" by secure storage

**Bad**

```dart
const secret = 'backend-private-key';
await storage.write(key: 'secret', value: secret);
```

**Why it is problematic**

The secret is already embedded in the client.

**Better**

Keep server secrets server-side.

---

## Assuming resistance to full device compromise

**Bad assumption**

```text
stored in Keychain/Keystore
→ impossible to extract
```

**Better**

Treat secure storage as at-rest defense on a partially trusted endpoint.

---

## Assuming secure storage is biometric authentication

**Bad**

Use default storage and advertise "Face ID protected."

**Better**

Configure and verify explicit biometric/access-control behavior where required.

---

## Plaintext encryption key beside encrypted database

**Bad**

```text
database.db
database_key.txt
```

**Better**

Store the database key in secure storage.

---

## Weak key generation

**Bad**

```dart
final key =
    DateTime.now().microsecondsSinceEpoch.toString();
```

**Better**

Use a cryptographically secure random generator.

---

## Regenerating a missing critical DB key

**Bad**

```dart
if (key == null) {
  key = generateNewKey();
}
```

when an existing critical encrypted DB exists.

**Why it is problematic**

It silently makes existing data inaccessible.

**Better**

Detect inconsistent state and invoke recovery policy.

---

## deleteAll() during every logout

**Bad**

```dart
await storage.deleteAll();
```

when the store also contains a database key.

**Better**

Delete only session-scoped credentials.

---

## Keeping refresh token after logout

**Bad**

Clear only UI/session memory.

**Better**

Clear persistent session credentials too.

---

## Local deletion without server revocation

**Bad assumption**

```text
token deleted locally
→ token globally invalid
```

**Better**

Perform server revocation when protocol/security policy requires it.

---

## Refresh races with logout

**Bad**

Allow refresh completion to persist credentials after logout.

**Better**

Serialize session mutation or use session epochs/cancellation.

---

## Cross-account token reuse

**Bad**

One global token key without account-transition policy in a multi-account application.

**Better**

Use account-scoped credentials and authoritative active-account state.

---

## Shared dev/prod credentials

**Bad**

Reuse application identity/namespace across environments unintentionally.

**Better**

Separate application identities and credential namespaces.

---

## Assuming uninstall clears iOS Keychain

**Bad**

Use uninstall as the logout/reset policy.

**Better**

Explicitly delete credentials and validate server sessions at startup.

---

## Ignoring Android backup

**Bad**

Ship secure storage without testing backup/restore.

**Better**

Disable or selectively exclude secure-storage backup according to application backup requirements.

---

## Clearing everything after Android unwrap failure

**Bad**

```dart
catch (_) {
  await storage.deleteAll();
}
```

**Why it is problematic**

Could destroy irreplaceable encryption keys.

**Better**

Recover according to secret classification.

---

## Deprecated Android options

**Bad**

Copy pre-v11 tutorials using removed algorithms/options into new code.

**Better**

Use current v11 defaults and migration guidance.

---

## Treating web secure storage as XSS-safe

**Bad assumption**

Encrypted browser storage prevents malicious same-origin JavaScript from obtaining credentials.

**Better**

Treat XSS as compromise of the web application security context.

---

## Server secret in Flutter binary

**Bad**

```dart
const stripeSecretKey = 'sk_...';
```

**Better**

Perform privileged API calls from a trusted backend.

---

## Writing every keystroke

**Bad**

```dart
onChanged: (value) {
  storage.write(key: 'draft', value: value);
}
```

**Better**

Use normal state/local persistence appropriate to draft data.

---

## Blocking runApp without requirement

**Bad**

```dart
final token = await storage.read(...);
runApp(...);
```

for an application that could show a bootstrap state.

**Better**

Start UI and perform session bootstrap deliberately.

---

## Raw plugin exception shown to user

**Bad**

```dart
showDialog(
  context: context,
  builder: (_) => Text(exception.toString()),
);
```

**Better**

Map platform failures to safe application error states.

---

# New Secret Implementation Workflow

## 1. Classify the value

Ask:

```text
Is it actually secret?
```

If no, use ordinary persistence.

## 2. Determine whether persistence is required

Prefer memory for ephemeral credentials when possible.

## 3. Determine whether secure storage is the correct medium

For large datasets, use an encrypted database.

## 4. Define threat model

Document which attacks are in and out of scope.

## 5. Define lifecycle

Specify:

```text
created
persisted
read
rotated
revoked
deleted
```

## 6. Define namespace/key

Centralize key names.

## 7. Define platform policy

Review:

- Android algorithm/biometric mode;
- Apple accessibility;
- Apple synchronization;
- Secure Enclave;
- Web persistence;
- desktop dependencies.

## 8. Define backup/reinstall behavior

Explicitly decide what should survive:

```text
process restart
device restart
application update
backup restore
application reinstall
device migration
```

## 9. Implement a typed wrapper

Use `CredentialStore` or a domain-specific equivalent for non-trivial applications.

## 10. Decide memory-cache policy

Frequently used access credentials normally belong in authoritative session memory after bootstrap.

## 11. Define rotation

Document ordering and race behavior.

## 12. Define logout

Specify local deletion and server revocation independently.

## 13. Define account switching

Prevent cross-account credential reuse.

## 14. Define failure recovery

Differentiate reconstructable tokens from critical keys.

## 15. Define migrations

Version key/configuration changes.

## 16. Add unit tests

Test wrapper/session behavior without platform channels.

## 17. Add real platform tests

Test platform-specific configuration and upgrade behavior.

## 18. Review logs

Search for token/key dumps.

## 19. Review backup configuration

Especially Android.

## 20. Verify upgrade path

Test using credentials created by the previous production version.

---

# Existing-Code Review Workflow

Before modifying secure storage, inspect:

- package version;
- package lockfile;
- all `FlutterSecureStorage` constructors;
- Android options;
- Apple options;
- Windows options;
- Web options;
- storage namespaces;
- literal key names;
- all `read`;
- all `write`;
- all `delete`;
- all `deleteAll`;
- all `readAll`;
- auth bootstrap;
- access-token lifecycle;
- refresh-token lifecycle;
- encryption keys;
- logout;
- account switching;
- HTTP interceptors;
- refresh synchronization;
- Android backup rules;
- Apple accessibility;
- Apple entitlements;
- synchronizable items;
- Secure Enclave configuration;
- Windows backward compatibility;
- Linux deployment dependencies;
- logs;
- crash-report metadata;
- migration history;
- tests.

Map:

```text
secret origin
↓
persistence
↓
memory copies
↓
use
↓
rotation
↓
deletion
```

before changing anything.

---

# Refactoring Rules

Treat these as migration-sensitive:

```text
key name
Android namespace
Android algorithm
Android backend
Apple access group
Apple account/service
Apple accessibility
Secure Enclave flag
synchronizable flag
application identifier
Windows storage compatibility
```

Changing them may make existing credentials appear missing or unreadable.

Before refactoring:

1. characterize existing production state;
2. identify all released configurations;
3. write migration tests;
4. implement read-old/write-new migration;
5. preserve old data until new write succeeds;
6. make migration restartable;
7. add sanitized telemetry;
8. test actual upgrade installation;
9. roll out cautiously for irreplaceable data.

A secure-storage rename is not necessarily "just refactoring."

---

# Code Review Checklist

- [ ] Data is classified.
- [ ] Persistence is necessary.
- [ ] Secure storage is appropriate.
- [ ] No server-only secret exists in client.
- [ ] Package version is known.
- [ ] Platform options match that version.
- [ ] Keys are centralized.
- [ ] Namespace is intentional.
- [ ] Storage access is outside hot UI paths.
- [ ] Frequently used token is cached appropriately.
- [ ] Refresh rotation is coordinated.
- [ ] Logout clears persistent credentials.
- [ ] Server revocation policy exists.
- [ ] Account switching is isolated.
- [ ] Android backup behavior is intentional.
- [ ] Apple accessibility is intentional.
- [ ] Apple synchronization is intentional.
- [ ] Secure Enclave use is intentional.
- [ ] Reinstall behavior is understood.
- [ ] Migration paths are tested.
- [ ] Critical encryption keys are not destructively reset.
- [ ] Secrets never reach logs.
- [ ] Platform failures map to safe app errors.
- [ ] Integration tests cover real platform behavior.

---

# Android Security Checklist

- [ ] Current package version identified.
- [ ] v11 migration prerequisites satisfied.
- [ ] No removed/deprecated Android options copied from old tutorials.
- [ ] Current cipher defaults intentionally accepted or overridden for documented reason.
- [ ] Android minimum SDK compatible.
- [ ] `storageNamespace` changes treated as migrations.
- [ ] Auto Backup policy reviewed.
- [ ] Secure-storage data excluded from backup where required.
- [ ] Restore failure tested.
- [ ] Biometric permission present if biometric storage is used.
- [ ] Biometric API-level behavior understood.
- [ ] `resetOnError` consequences reviewed.
- [ ] Upgrade from previous production build tested.
- [ ] Critical keys do not share destructive recovery policy with disposable tokens.

---

# Apple Keychain Checklist

- [ ] Keychain Sharing entitlements configured.
- [ ] Debug/Profile/Release entitlements consistent.
- [ ] Access group intentional.
- [ ] Accessibility selected from actual lifecycle requirements.
- [ ] Device-only mode used only deliberately.
- [ ] Synchronization disabled unless required.
- [ ] Synchronization not combined with incompatible device-only accessibility.
- [ ] Secure Enclave adoption migrated explicitly.
- [ ] Access-control/biometric requirements verified.
- [ ] Reinstall behavior tested.
- [ ] Session validated after startup.
- [ ] macOS Data Protection Keychain behavior reviewed where relevant.

---

# Web Security Checklist

- [ ] HTTPS production deployment.
- [ ] Localhost used only for development.
- [ ] XSS threat explicitly considered.
- [ ] CSP/security headers reviewed.
- [ ] No server-only secret embedded in `wrapKey`.
- [ ] Browser/origin portability not assumed.
- [ ] Clearing site data handled as credential loss.
- [ ] Private browsing behavior tested if supported.
- [ ] `useSessionStorage` selected intentionally.
- [ ] Backend session architecture reviewed as alternative where appropriate.

---

# Authentication Credential Checklist

- [ ] Access token persistence justified.
- [ ] Refresh token stored securely.
- [ ] Token values never logged.
- [ ] Session memory has one authoritative owner.
- [ ] HTTP requests avoid repeated secure-storage reads.
- [ ] Refresh is serialized/coordinated.
- [ ] Logout cannot race into credential resurrection.
- [ ] Server revocation handled where required.
- [ ] Expired/invalid credentials force appropriate reauthentication.
- [ ] Multi-account credentials isolated.
- [ ] Reinstall does not bypass server session validation.

---

# Encryption Key Checklist

- [ ] Key generated using cryptographically secure randomness.
- [ ] Key not hardcoded.
- [ ] Key not stored beside encrypted data in plaintext.
- [ ] Key persistence/recovery requirements documented.
- [ ] Device migration expectations documented.
- [ ] Backup expectations documented.
- [ ] Missing-key behavior explicit.
- [ ] Existing encrypted data detected before key regeneration.
- [ ] Irreplaceable data has a recovery/backup strategy.
- [ ] Hardware-backed/non-exportable requirements evaluated separately.

---

# Performance Checklist

- [ ] No secure-storage read in `build()`.
- [ ] No per-frame operations.
- [ ] No per-request token reads without justification.
- [ ] `readAll()` not used for single keys.
- [ ] Writes happen only when state changes.
- [ ] High-frequency data uses another store.
- [ ] Startup is not unnecessarily blocked.
- [ ] In-memory credential cache used where appropriate.
- [ ] Cache clears on logout/account switch.
- [ ] Performance changes do not weaken credential lifecycle correctness.

---

# Testing Checklist

- [ ] Missing-key test.
- [ ] Read/write test.
- [ ] Overwrite test.
- [ ] Delete test.
- [ ] Domain-clear test.
- [ ] Migration test.
- [ ] Interrupted migration test.
- [ ] Old-release → new-release upgrade test.
- [ ] Logout cleanup test.
- [ ] Refresh/logout race test.
- [ ] Multi-account isolation test.
- [ ] Environment isolation test.
- [ ] Android restore test.
- [ ] Android biometric test if enabled.
- [ ] iOS accessibility test.
- [ ] iOS reinstall test where relevant.
- [ ] Secure Enclave migration test if enabled.
- [ ] Linux real keyring test.
- [ ] Windows backward-migration test if required.
- [ ] Web HTTPS/origin test.
- [ ] Log/redaction test.

---

# Production Readiness Checklist

Before approving release:

- [ ] Current `flutter_secure_storage` API/version verified.
- [ ] Upgrade path from current production version verified.
- [ ] Secrets classified.
- [ ] Only persistence-worthy secrets use secure storage.
- [ ] No confidential server secret is hardcoded.
- [ ] Key names centralized.
- [ ] Platform options centralized.
- [ ] Android backup behavior configured intentionally.
- [ ] Android v11 migration requirements satisfied.
- [ ] Apple Keychain entitlements correct.
- [ ] Apple accessibility policy documented.
- [ ] Reinstall behavior tested where security-sensitive.
- [ ] Synchronizable Keychain use intentional or disabled.
- [ ] Secure Enclave use migrated correctly if enabled.
- [ ] Refresh token deleted on logout.
- [ ] Access-token persistence justified.
- [ ] Server revocation policy defined.
- [ ] Token refresh cannot race with logout.
- [ ] Account isolation correct.
- [ ] Environment separation correct.
- [ ] Database encryption keys have safe missing-key recovery.
- [ ] No secrets in logs/crash metadata.
- [ ] Web threat model includes XSS.
- [ ] Linux deployment includes keyring prerequisites.
- [ ] Windows legacy migration configured only when needed.
- [ ] Secure storage is not being used as a general database.
- [ ] Migration/failure tests pass on real target platforms.

---

# Quick Reference

| Situation | Preferred approach |
| --- | --- |
| Theme setting | Preferences |
| Locale | Preferences |
| Ordinary API cache | Database/cache |
| Large sensitive dataset | Encrypted database |
| Short-lived access token | Memory when possible; secure persistence only if required |
| Refresh token | Secure storage |
| Session identifier | Secure storage if persistent and security-sensitive |
| Database encryption key | Secure storage |
| User private key | Explicit high-value key architecture; secure storage may be one component |
| Server API secret | Never embed in Flutter client |
| Frequent HTTP auth header | In-memory session token |
| App startup | Load persisted credentials once through session/bootstrap layer |
| Logout | Clear memory + persisted session credentials; revoke server token where required |
| Account switch | Isolate account credentials and invalidate previous memory state |
| Android production app | Review backup/restore and current cipher/backend configuration |
| Android v9/pre-v10 → v11 | Migrate through v10 first |
| Android restored ciphertext cannot decrypt | Recover according to secret type; auth may require login |
| Android critical key cannot decrypt | Do not blindly clear/regenerate |
| Apple foreground-only secret | Consider `KeychainAccessibility.unlocked` |
| Apple background-after-first-unlock requirement | Consider `first_unlock` after threat review |
| Secret must not migrate devices | Consider appropriate `*_this_device` accessibility |
| Cross-device Keychain credential | Enable `synchronizable` only deliberately |
| iOS reinstall | Do not assume Keychain was cleared |
| Need Face ID/Touch ID/user presence | Configure supported access-control/biometric mechanism explicitly |
| Need hardware-backed Apple key protection | Evaluate current Secure Enclave option |
| Existing Apple value moving to Secure Enclave | Explicit read-old/write-new/delete-old migration |
| Web application | Treat Web Crypto storage as origin/browser-bound and experimental |
| Web with XSS | Assume same-origin malicious JS can compromise client credentials |
| Linux | Ensure libsecret + Secret Service/keyring provider |
| Windows old stored credentials | Use backward compatibility only for planned migration |
| High-frequency secret use | Read once, retain in controlled session memory |
| High-frequency writes | Use another persistence mechanism |
| Need one value | `read(key:)`, not `readAll()` |
| Need existence only | `containsKey()` when that distinction matters |
| Logout should retain database key | Delete auth keys individually, not `deleteAll()` |
| Encryption key missing but DB exists | Enter recovery policy; do not silently regenerate |
| Package option/key rename | Treat as migration |
| Rooted/jailbroken device | Do not claim absolute confidentiality |
| Secret hardcoded in source | Secure storage cannot fix it |
| Need backend authorization | Secure storage is irrelevant to authorization; enforce server-side |

---

# Final Engineering Rule

Do not begin with:

```dart
await const FlutterSecureStorage().write(
  key: 'token',
  value: token,
);
```

Begin with:

```text
What is this value?
↓
Is it actually secret?
↓
Does it need to persist?
↓
Is secure key/value storage the right medium?
↓
What attacker are we protecting against?
↓
What platform backend protects it?
↓
What should happen after restart?
↓
What should happen after reinstall?
↓
What should happen after backup/restore?
↓
What should happen after device migration?
↓
When does the secret rotate?
↓
When must it be deleted?
↓
What happens if storage becomes unreadable?
↓
Can it be reconstructed?
↓
Would deleting it destroy irreplaceable data?
↓
Can refresh/logout/account switching race?
↓
Could this value reach logs or crash reports?
↓
Does changing configuration require migration?
```

Then implement the smallest secure-storage architecture that satisfies those requirements.

`flutter_secure_storage` should remain a narrow persistence boundary for small sensitive values. Let the operating system provide the underlying credential protection, let the session/authentication architecture own credential lifecycle, let the backend own revocation and authorization, and never describe a client device as an absolute secret vault.
