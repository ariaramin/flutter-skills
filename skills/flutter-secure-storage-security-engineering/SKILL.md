---
name: flutter-secure-storage-security-engineering
description: Design, implement, review, migrate, test, debug, and secure persistent secrets in Flutter with flutter_secure_storage. Use this skill whenever a Flutter task involves access or refresh tokens, session credentials, encrypted-database keys, private credentials, Android Keystore or backup behavior, Apple Keychain/access groups/accessibility/Secure Enclave, Web Crypto storage, Linux libsecret, Windows migration, logout/account switching, credential rotation, secure-storage performance, package upgrades, or any decision about whether sensitive data belongs in secure storage—even if the user only asks where to save a token securely.
compatibility: Targets the supplied flutter_secure_storage 11.0.0 baseline and its documented platform behavior. Always inspect the repository's locked package version and platform configuration before applying version-sensitive Android, Apple, Web, Linux, or Windows guidance; migration paths can differ across v9, v10, and v11.
---
# Flutter Secure Storage Security Engineering

## Mission
Use `flutter_secure_storage` as a narrow persistence boundary for small sensitive values whose persistence is justified.
Never treat it as:
- a general database;
- an authentication system;
- a server-side secret vault;
- proof of confidentiality on a fully compromised runtime;
- automatic biometric protection;
- automatic token revocation;
- a substitute for backend authorization.
Optimize in this order:
1. Correct data classification.
2. Security and recoverability.
3. Lifecycle correctness.
4. Migration safety.
5. Platform correctness.
6. Testability.
7. Performance.
8. Maintainability.

## Reference Routing
Load only what the task requires:
- Read `references/01-foundations-storage-api.md` for the threat model, storage selection, architecture, package setup, key naming, environment separation, core API semantics, and storage-medium decisions.
- Read `references/02-platform-backends.md` for Android, iOS, macOS, Web, Linux, and Windows implementation/configuration details.
- Read `references/03-credentials-keys-migrations.md` for access/refresh tokens, session memory, logout, account switching, database/private keys, migrations, recovery, concurrency, logging, and runtime-secret handling.
- Read `references/04-performance-testing-debugging.md` for performance, startup, DI/Bloc integration, tests, platform integration tests, debugging, and observability.
- Read `references/05-antipatterns-workflows-checklists.md` for anti-patterns, implementation/review/refactoring workflows, platform checklists, and production release gates.
Use the bundled references as the authoritative basis for this skill. Do not silently replace their version-sensitive behavior with remembered package behavior.

## Security Model
Start every task with this distinction:
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
application memory/runtime
↓
different threat boundary
```
A value encrypted at rest can still be exposed through:
- runtime instrumentation;
- debugger or memory inspection;
- malicious code in-process;
- logging or crash metadata;
- UI/clipboard exposure;
- same-origin XSS on Web;
- unsafe network/application logic.
Do not claim absolute secrecy on rooted, jailbroken, privileged, or otherwise compromised clients.

## Required Workflow
### 1. Inspect the repository first
Before changing code, identify:
- Flutter and Dart versions;
- `flutter_secure_storage` version in `pubspec.yaml` and lockfile;
- every `FlutterSecureStorage` construction site;
- Android, iOS, macOS, Web, Linux, and Windows options used;
- storage namespaces and key names;
- all `read`, `write`, `delete`, `deleteAll`, `readAll`, and `containsKey` calls;
- authentication bootstrap;
- access/refresh-token lifecycle;
- encryption/private keys;
- logout/account switching;
- refresh synchronization;
- backup/restore policy;
- migration history;
- logs and crash metadata;
- tests.
Map each sensitive value:
```text
origin
↓
persistence
↓
memory copies
↓
use
↓
rotation
↓
delete/revoke/recover
```
Do not change storage configuration before understanding existing persisted state.
### 2. Classify the value
For every value, decide which category it belongs to:
| Category | Default storage decision |
|---|---|
| Non-secret setting | Preferences/state restoration |
| Ordinary cache/data | Database/cache/file |
| Small persistent secret | Secure storage |
| Ephemeral access credential | Prefer controlled memory when restart persistence is unnecessary |
| Long-lived refresh/session credential | Secure storage |
| Large sensitive dataset | Encrypted database/file |
| Encryption-database master key | Secure storage |
| Runtime-provisioned private credential | Secure storage may be appropriate |
| Server-only credential | Never ship to Flutter client |
Do not use secure storage merely because a value is persistent.
### 3. Decide whether persistence is necessary
Ask:
- Must this value survive process termination?
- Must it survive device reboot?
- Should it survive reinstall?
- Should it migrate to another device?
- Can it be reconstructed from a trusted server?
- Is losing it acceptable?
Prefer memory for ephemeral credentials when persistence provides no product value.
### 4. Define the threat model
State what the storage design is intended to resist and what it cannot resist.
At minimum classify:
- ordinary sandbox/file inspection;
- backup extraction;
- another normal application;
- rooted/jailbroken/privileged compromise;
- runtime memory/instrumentation;
- XSS for Web;
- client binary reverse engineering;
- backend/token replay threats.
Do not use at-rest storage to make claims about runtime or backend security.
### 5. Choose the storage medium
Use `flutter_secure_storage` for small, security-sensitive key/value state.
For large sensitive data, prefer:
```text
secure storage
↓
small database/file encryption key
↓
encrypted database/file
```
Do not serialize large datasets into secure storage.
### 6. Centralize keys and platform policy
Centralize key names and namespaces.
Prefer names such as:
```text
auth.access_token
auth.refresh_token
storage.database_key
auth.account.<id>.refresh_token
```
Never include secret material in key names.
Centralize `AndroidOptions`, `IOSOptions`, `MacOsOptions`, `WindowsOptions`, and `WebOptions` so security policy is not scattered through UI/features.
Treat changes to keys, namespaces, application identity, and platform options as migrations.
### 7. Put storage behind a typed boundary
For non-trivial applications, prefer:
```text
UI / Bloc / Cubit / ViewModel
↓
Auth Repository / Session Manager
↓
CredentialStore
↓
flutter_secure_storage
↓
platform backend
```
Use constructor injection.
Do not make widgets, blocs, repositories, and interceptors each know literal secure-storage keys.
A typed store should expose domain operations such as:
- read credentials;
- persist credentials;
- clear session credentials;
- read/write database key;
- migrate storage schema.
### 8. Keep hot-path credentials in authoritative session memory
Secure persistence is not the ideal source for every HTTP request.
Prefer:
```text
startup
↓
secure storage read
↓
session manager
↓
in-memory access token
↓
HTTP interceptor
```
On token change:
```text
new credential state
↓
persist safely
↓
update/publish authoritative memory state
```
Do not perform a secure-storage read for every request unless a concrete requirement justifies the overhead.
### 9. Design auth lifecycle explicitly
For access tokens, decide whether restart persistence is needed.
For refresh tokens:
- persist securely when persistent login is required;
- rotate according to backend protocol;
- never log them;
- clear on logout;
- isolate by account;
- revoke server-side when required.
Keep one authoritative session state rather than uncontrolled token copies throughout the app.
### 10. Coordinate refresh, logout, and account switching
Secure storage does not provide transaction or session concurrency semantics.
Prevent this race:
```text
refresh starts
↓
logout clears credentials
↓
refresh completes
↓
refresh writes credentials again
```
Use a serialized auth coordinator, cancellation, or session generation/epoch strategy.
On logout, normally coordinate:
```text
invalidate session generation
↓
stop/reject in-flight refresh
↓
clear in-memory credentials
↓
server revocation if required
↓
delete persisted session credentials
↓
clear account/session caches/scopes
↓
publish logged-out state
```
Remember: local deletion does not revoke a credential already stolen or still valid server-side.
### 11. Make multi-key persistence recoverable
`write()` calls across multiple keys are not an application transaction.
If access and refresh tokens or related values must remain coherent:
- define write ordering;
- consider a schema/version marker;
- define partial-write recovery;
- verify on startup if necessary;
- never assume multiple plugin calls commit atomically.
### 12. Treat encryption/private keys differently from tokens
Classify recovery by secret type.
A corrupt auth token can often trigger reauthentication.
A missing database key for an existing critical encrypted database must not automatically trigger new-key generation.
For irreplaceable private keys, require an explicit backup/recovery design.
If non-exportable hardware-backed signing is required, use specialized platform cryptographic key APIs rather than assuming an extractable string in secure storage is equivalent.
### 13. Design migration before changing configuration
Treat these as migration-sensitive:
- package major version;
- Android cipher/backend/namespace/biometric mode;
- secure-storage key names;
- Apple accessibility/access group/service/account;
- Apple synchronization;
- Secure Enclave path;
- Android application ID;
- Apple bundle identifier;
- Windows identity/storage compatibility.
Use read-old → write-new → verify-new → delete-old migrations.
Make migration:
- idempotent;
- restartable;
- observable without secret values;
- tested using real old-version data.
### 14. Handle failures by secret classification
Do not collapse all plugin/platform failures into `null`.
Differentiate categories such as:
- unavailable;
- authentication required;
- entitlement/permission issue;
- corrupted or undecryptable;
- migration failure;
- platform failure.
Recovery must depend on the value:
| Secret | Typical recovery direction |
|---|---|
| Access token | Refresh or re-login |
| Refresh token | Reauthenticate |
| Reconstructable provisioning credential | Re-provision if protocol allows |
| Reconstructable cache DB key | Rebuild data only if policy permits |
| Critical database key | Explicit recovery; do not destroy automatically |
| User private key | Explicit backup/recovery strategy |
Never implement a universal `catch (_) => deleteAll()` policy.
### 15. Protect logs and diagnostics
Never log:
- access tokens;
- refresh tokens;
- private keys;
- database keys;
- raw `readAll()` output;
- secret-bearing platform exception context.
Log sanitized events such as:
```text
secure_storage_read_failed
credential_type=refresh_token
category=undecryptable
secure_storage_migration_completed
from_schema=2
to_schema=3
```
Review logging, analytics, crash reporting, Bloc observers, and debug screens.
### 16. Test unit behavior without platform stores
Use a fake typed `CredentialStore` for ordinary unit tests.
Test:
- missing values;
- read/write/overwrite/delete;
- partial credential state;
- migration;
- interrupted migration;
- logout cleanup;
- refresh/logout race;
- account isolation;
- error mapping.
Do not require Android Keystore or Apple Keychain for every application unit test.
### 17. Test platform behavior on real targets
Use real platform integration tests for version/configuration behavior that mocks cannot prove:
- Android Keystore and backup/restore;
- Android package upgrade migration;
- biometric mode;
- Apple Keychain accessibility/access groups;
- Secure Enclave migration;
- reinstall behavior;
- macOS entitlements;
- Linux Secret Service/keyring availability;
- Windows backward compatibility;
- Web HTTPS/origin/browser behavior.
### 18. Validate upgrade paths from released versions
For persisted secrets, a fresh-install test is insufficient.
Test:
```text
install/release old version
↓
write representative persisted secrets
↓
upgrade to new version
↓
read/migrate
↓
restart
↓
read again
```
Include interrupted migration where practical.

## Platform Gates
### Android
Before release:
- identify the package version and prior production versions;
- satisfy the supplied v11 migration prerequisite for older Android data;
- do not copy removed/deprecated algorithm options from old tutorials;
- review minimum SDK compatibility;
- review `storageNamespace` as a migration boundary;
- review Auto Backup/data-extraction rules;
- test restore/decryption failure;
- evaluate biometric configuration only when product/security requires it;
- ensure destructive recovery does not share a namespace with irreplaceable keys.
For pre-v10 installed data, follow the source's migration path through v10 before v11.
### iOS / macOS
Before release:
- choose Keychain accessibility from actual foreground/background/device-migration requirements;
- configure Keychain Sharing/access groups only when needed;
- keep Debug/Profile/Release entitlements consistent;
- do not enable synchronizable Keychain items without product intent;
- do not combine synchronization with incompatible device-only semantics;
- treat Secure Enclave adoption as an explicit migration;
- configure user-presence/biometric controls explicitly rather than implying default biometric protection;
- test reinstall behavior and validate server session state at bootstrap.
### Web
Treat Web as a different threat boundary:
- require HTTPS/secure context in production;
- treat package web storage as origin/browser dependent and experimental per the supplied baseline;
- assume same-origin XSS can compromise client credentials;
- do not embed server-only secrets or supposedly secret `wrapKey` constants in delivered JavaScript;
- test origin changes, cleared site data, private browsing, and session-storage choices.
### Linux
Verify:
- libsecret runtime/development dependencies;
- D-Bus session availability;
- a Secret Service/keyring provider;
- keyring unlock behavior;
- sandbox/package permissions.
Do not use a minimal headless CI container as proof that end-user keyring integration works.
### Windows
Verify:
- package version and storage backend;
- application/company/product identity;
- whether old values require `useBackwardCompatibility`;
- migration retirement plan.
Do not enable backward compatibility indefinitely without a reason.

## API Use Rules
Use `read(key:)` to read one value.
Use `containsKey()` only when existence itself matters; avoid `containsKey` + `read` when one read is sufficient.
Use `delete(key:)` for domain-scoped cleanup.
Use `deleteAll()` only when every value in that storage domain is intentionally disposable.
Use `readAll()` only for controlled migration or safe enumeration; never dump it to logs.
Use explicit `delete()` rather than relying on `write(value: null)` as deletion shorthand.

## Performance Rules
Do not use secure storage for:
- per-frame state;
- keystrokes;
- scroll position;
- high-frequency counters;
- telemetry buffers;
- rapidly changing drafts;
- large caches.
Avoid unnecessary secure-storage work in:
- widget `build()`;
- every HTTP request;
- high-frequency interceptors;
- animation/event loops.
Persist when credential state changes; use controlled in-memory state for frequent access.
Do not block `runApp()` on credential reads unless application correctness requires pre-widget readiness. A bootstrap/loading state is often preferable.

## Anti-Pattern Gates
Reject implementations that:
- store ordinary preferences or huge JSON in secure storage;
- construct raw `FlutterSecureStorage` throughout the codebase;
- scatter literal key names;
- log tokens or `readAll()`;
- embed a server secret and then write it to secure storage;
- claim Keystore/Keychain makes extraction impossible;
- claim default secure storage is biometric authentication;
- store an encryption key beside encrypted data in plaintext;
- generate cryptographic keys from timestamps or non-cryptographic randomness;
- regenerate a missing critical DB key without inspecting existing encrypted data;
- `deleteAll()` on logout when unrelated critical secrets must survive;
- clear only UI memory while retaining refresh tokens;
- equate local delete with server revocation;
- allow refresh to resurrect credentials after logout;
- reuse credentials across accounts/environments;
- assume iOS uninstall clears Keychain;
- ignore Android backup/restore;
- clear all storage after any Android unwrap failure;
- copy removed Android options into v11 code;
- describe Web storage as XSS-safe;
- use secure storage as high-frequency application persistence;
- surface raw platform exceptions to users.

## Review Output
When reviewing or changing secure-storage code, report:
1. **Repository baseline** — Flutter/Dart/package versions and current platform configuration.
2. **Secret inventory** — values, sensitivity, persistence requirement, reconstructability, owner, and lifecycle.
3. **Threat model** — what protection is expected and what remains out of scope.
4. **Architecture** — typed storage/session boundaries and memory-cache policy.
5. **Platform findings** — Android, Apple, Web, Linux, Windows issues relevant to the project.
6. **Migration risks** — old versions/configurations/data that could become unreadable.
7. **Concurrency risks** — refresh/logout/account-switch races.
8. **Recovery policy** — behavior for missing/corrupt/undecryptable values by secret type.
9. **Logging/security findings** — any leak paths or embedded secrets.
10. **Performance findings** — hot-path reads/writes or startup blocking.
11. **Tests added/required** — unit and real-platform upgrade/integration tests.
12. **Residual risks** — compromised runtime, XSS, server token replay, or platform limitations not solved by storage.
Do not report a secure-storage design as “secure” without stating its threat boundary and recovery/migration behavior.

## Production Definition of Done
Before approval, verify:
- the current package version and upgrade path are known;
- all stored values are actually persistence-worthy secrets;
- server-only secrets are absent from the client;
- key names and platform options are centralized;
- secure storage is behind an intentional application boundary where appropriate;
- active credentials have one authoritative session owner;
- hot HTTP paths do not repeatedly hit secure storage without justification;
- logout clears persistent session credentials and cannot race with refresh;
- server revocation policy is explicit;
- account and environment isolation are correct;
- Android backup/restore and v11 migration requirements are satisfied;
- Apple entitlements/accessibility/synchronization/reinstall semantics are verified;
- Secure Enclave/biometric behavior is explicit if used;
- Web threat model includes XSS and origin/browser loss;
- Linux/Windows deployment/migration requirements are tested where targeted;
- missing critical encryption keys do not trigger destructive automatic regeneration;
- migrations are idempotent, restartable, and tested from real old data;
- secrets do not enter logs, analytics, crash metadata, clipboard, or debug UI;
- unit tests cover lifecycle/concurrency/recovery;
- real platform tests cover security-sensitive configuration and upgrade paths.
The final engineering rule is simple: classify the secret, define its lifecycle and threat model, choose the narrowest correct persistence boundary, design migration and recovery before changing configuration, and keep backend authorization/revocation separate from local storage.
