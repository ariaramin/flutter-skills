# Permissions, Files, Telemetry, Plugins, Supply Chain, and CI/CD

> Source-derived reference split from the user-supplied Flutter Application Security Engineering Skill. Preserve its caveats and terminology when applying detailed guidance.

## Contents

- Permissions & Privacy
  - Rules
  - Privacy is a security requirement
- File Security
  - Validate
  - Path traversal
  - Extensions
  - Archives
  - Downloads
  - Temporary data
- Clipboard / Screenshots
  - Clipboard
  - Screenshots and recording
- Logging
  - Never log
  - Minimize PII
  - Development logging
- Crash Reporting
- Platform Channels
- Plugin Security
  - Security-sensitive packages
- Dependency & Supply-Chain Security
  - Lock application dependencies
  - Review dependency updates
  - Advisories
  - Supply-chain threats
  - Third-party SDK privacy
- CI/CD Security
  - Never store secrets
  - Use a CI secret manager
  - Third-party CI actions
  - CI logs
  - Protect release jobs

---

## Permissions & Privacy

Request the minimum privilege necessary for the current user-visible feature.

### Rules

- Request permissions contextually.
- Explain why a permission is needed.
- Degrade gracefully after denial.
- Do not request speculative future permissions.
- Remove permissions introduced by unused plugins.
- Prefer system pickers over broad library/storage access.
- Test denial and "limited" access modes.
- Recheck platform policy before release.

Android provides Photo Picker and Storage Access Framework flows that let applications obtain selected content without broad media/filesystem access in many scenarios.

Google Play increasingly requires minimum-scope alternatives for sensitive data categories and treats broad storage access as high-risk.

### Privacy is a security requirement

For every permission answer:

- What user-visible feature needs it?
- What data becomes available?
- Is a narrower system API possible?
- Is the data transmitted off device?
- Which SDKs see it?
- How long is it retained?
- How is it deleted?

---

## File Security

Treat user-selected and downloaded files as hostile inputs.

### Validate

- maximum size
- expected content type
- actual format/magic where relevant
- filename length
- archive structure
- decompressed size
- nesting depth
- image dimensions
- parser failures
- storage destination

### Path traversal

Never:

```dart
final file = File('${appDirectory.path}/$userFileName');
```

when `userFileName` is attacker-controlled.

Prefer:

- application-generated IDs
- system-provided file handles/content URIs
- dedicated app-private directories
- explicit basename policy
- canonical-path containment checks where path APIs expose them

### Extensions

Do not trust:

```text
invoice.pdf
```

merely because its extension is `.pdf`.

Validate content with the parser/format expectations relevant to the operation.

### Archives

Protect against:

- path traversal entries
- huge decompressed output
- excessive file count
- deeply nested archives
- symlink surprises where relevant
- disk exhaustion

Set explicit decompression limits.

### Downloads

Do not automatically execute or open a downloaded file using an attacker-controlled MIME type without user intent and platform-level handling.

### Temporary data

Treat temporary directories as storage:

- clean sensitive temporary files
- do not rely on automatic cleanup timing
- use unpredictable application-generated names where relevant

---

## Clipboard / Screenshots

### Clipboard

Avoid copying:

- access tokens
- refresh tokens
- private keys
- passwords
- recovery codes

unless the product workflow explicitly requires it.

If the user must copy a sensitive value:

- make the action explicit
- expose only the intended value
- avoid analytics
- consider platform-supported expiry/clearing behavior only when reliable
- warn appropriately for high-risk material

### Screenshots and recording

Threat-model sensitive displays such as:

- banking details
- health information
- recovery codes
- identity documents

Use platform protections only when the threat warrants them.

Do not block screenshots globally as security theater.

Flutter has platform-specific sensitive-content capabilities on Android for screen/media-projection scenarios, but the behavior is platform/version specific; verify what threat the API actually covers before claiming screenshot protection.

Also consider:

- task-switcher previews
- shoulder surfing
- external display
- accessibility
- screen readers

Do not break accessibility merely to create obscurity.

---

## Logging

Create an explicit redaction policy.

### Never log

- passwords
- access tokens
- refresh tokens
- session cookies
- OAuth authorization codes
- authorization headers
- private keys
- encryption keys
- complete password-reset URLs
- recovery codes
- full payment information
- sensitive document contents

### Minimize PII

Prefer:

```text
request_failed endpoint=/profile status=401 request_id=7d...
```

over:

```text
user=jane@example.com
Authorization=Bearer eyJ...
response={"address":"..."}
```

### Development logging

Do not assume debug logs are harmless.

Development devices, CI logs, screenshots, issue trackers, and shared terminals can all leak credentials.

Use test-only synthetic credentials where possible.

---

## Crash Reporting

Treat crash-reporting SDKs as data exporters.

Review:

- breadcrumbs
- HTTP metadata
- custom keys
- user identifiers
- route names containing IDs
- exception messages
- stack-adjacent state
- screenshots/session replay
- network request capture

Do not attach full request/response bodies to crash reports.

Make production crash reports useful through:

- error category
- request ID
- feature identifier
- sanitized route
- non-sensitive state-machine state
- package/build version

---

## Platform Channels

Treat:

```text
Dart
↔
MethodChannel
↔
native code
```

as a trust boundary.

Validate:

- method
- argument map
- primitive types
- numeric range
- maximum length
- file URI/path
- callback identifier
- expected lifecycle state

Do not give Dart a generic platform method such as:

```text
runCommand(command)
readAnyFile(path)
openAnyUrl(uri)
```

when a narrower API can be exposed.

Prefer:

```text
selectProfileImage()
storeCredential()
openKnownSupportPage()
```

with native-side validation.

Flutter's channel codecs permit dynamic cross-language values, and Flutter recommends platform-channel integration coverage because behavior depends on native implementation.

---

## Plugin Security

Before adding a package inspect:

- publisher
- repository
- package ownership
- maintenance activity
- release history
- issue/security responsiveness
- license
- transitive dependencies
- Android permissions
- iOS/macOS entitlements
- native code
- FFI
- build scripts
- network behavior
- analytics
- platform support
- known advisories

Do not add a package for five lines of trivial code if it introduces:

- native binaries
- broad permissions
- build hooks
- networking
- large transitive dependency trees

### Security-sensitive packages

Review source and platform implementation for:

- secure storage
- OAuth
- biometrics
- WebViews
- cryptography
- filesystem
- VPN/proxy detection
- root detection
- attestation

Package branding does not create a security guarantee.

---

## Dependency & Supply-Chain Security

### Lock application dependencies

Dart recommends committing `pubspec.lock` for application packages. Production/CI workflows can use `dart pub get --enforce-lockfile` to fail when dependency resolution or content hashes do not match the lockfile.

### Review dependency updates

For each meaningful update inspect:

- source diff
- changelog
- platform changes
- permissions
- new native code
- build scripts
- new hosts
- transitive changes
- security fixes
- breaking behavior

Do not blindly auto-merge major security-sensitive dependencies.

### Advisories

Dart/pub surfaces known package advisories from the GitHub Advisory Database during dependency resolution. Treat absence of a known advisory as only one signal.

### Supply-chain threats

Threat-model:

- compromised publisher account
- typosquatting
- abandoned package takeover
- malicious package update
- compromised transitive dependency
- malicious native binary
- poisoned build script
- compromised CI action
- dependency confusion in private ecosystems

### Third-party SDK privacy

Review what native SDKs collect automatically before user consent.

Google Play requires data-safety disclosures to include third-party libraries/SDKs. Apple requires App Store privacy information to account for third-party partners and uses privacy manifests for declared collection/required-reason APIs.

---

## CI/CD Security

Protect:

- Android upload/signing keys
- Apple distribution credentials
- App Store Connect credentials
- Play service accounts
- provisioning material
- backend deployment credentials
- signing certificates
- package registry tokens
- API tokens
- notarization credentials
- secret-scanning credentials

### Never store secrets

- in Git
- in committed `.env`
- in plaintext workflow YAML
- in build artifacts
- in test snapshots
- in console logs

### Use a CI secret manager

Restrict secrets by:

- environment
- branch
- job
- actor
- approval gate

Prefer short-lived workload identity/OIDC credentials over static cloud keys when the provider supports it.

### Third-party CI actions

If using GitHub Actions, GitHub recommends pinning third-party actions to full-length commit SHAs for immutable references and auditing action source for secret handling.

Apply the same principle to equivalent CI ecosystems:

- minimize third-party extensions
- pin immutable versions where supported
- review source
- restrict token privileges

### CI logs

Assume any command can accidentally print:

- environment
- shell tracing
- request headers
- signing commands
- exception payloads

Disable verbose secret-bearing traces.

Even when a CI provider performs automatic secret redaction, do not rely on pattern masking as the primary protection.

### Protect release jobs

Require:

- protected branches/tags
- reviewed changes
- limited release principals
- MFA where supported
- environment approvals for high-risk release actions
- artifact provenance/verification where available
- separation between ordinary CI and signing credentials

---

