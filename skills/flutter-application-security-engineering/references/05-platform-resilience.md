# Platform Hardening, Integrity, Identity Resilience, and Resource Defense

> Source-derived reference split from the user-supplied Flutter Application Security Engineering Skill. Preserve its caveats and terminology when applying detailed guidance.

## Contents

- Android Hardening
  - Manifest security
  - Cleartext traffic
  - Debug trust
  - Backups
  - Debuggability
  - Permissions
  - Signing
  - Play Integrity
- iOS Hardening
  - App Transport Security
  - Keychain
  - Entitlements
  - URL schemes
  - Universal Links
  - Privacy usage descriptions
  - Signing
  - App Attest
  - Privacy manifests
- Desktop Hardening
  - macOS
  - Windows
  - Linux
  - All desktop targets
- Flutter Web Hardening
- Root / Jailbreak Risk
- Attestation / Integrity
  - Server verification requirements
- Biometrics
- Sensitive Actions
- MFA / Passkeys
  - MFA
  - Passkeys
- Push Notification Security
- QR / Deep-Link Inputs
- Multi-Account / Multi-Tenant Security
  - Multi-account
  - Multi-tenant
- Privacy Engineering
- Resource-Exhaustion Defense
- Performance vs Security

---

## Android Hardening

### Manifest security

Review every component:

- activity
- service
- receiver
- provider

Explicitly set `android:exported` based on whether another application genuinely needs access.

If external access is not required:

```xml
android:exported="false"
```

Android warns that exported components can be invoked by other applications and should not be exposed unnecessarily.

For exported components:

- validate incoming Intent data
- validate caller where the design allows
- require permissions when appropriate
- do not assume the launching app is trusted

### Cleartext traffic

Use Android Network Security Configuration as the primary explicit network policy.

Example:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false" />
</network-security-config>
```

Reference it from the application manifest.

Do not rely solely on historical `android:usesCleartextTraffic` defaults. Android's current documentation notes target-SDK-dependent behavior and evolving handling; Network Security Configuration is the more explicit per-application policy mechanism.

### Debug trust

Keep development CA overrides inside `debug-overrides`.

Verify they are unavailable when `android:debuggable=false`. Android's Network Security Configuration treats debug overrides specially based on application debuggability.

### Backups

Review backup rules for:

- tokens
- encryption keys
- installation/device identity
- sensitive local databases
- debug settings

Android Auto Backup participation and backup behavior vary by target/version; current Android uses `dataExtractionRules` for modern targets and older `fullBackupContent` rules for older versions. `allowBackup=false` is not a complete cross-device-transfer security model on every modern OEM behavior, so explicitly classify what must not be backed up.

### Debuggability

Release artifacts must not be debuggable.

Remove:

- debug activities
- test receivers
- hidden QA credentials
- mock backends
- network-trust bypasses
- developer menus capable of changing security state

Android warns against shipping test/debug functionality.

### Permissions

Audit the merged production manifest because plugins can introduce permissions.

Prefer system pickers and narrow permissions.

### Signing

Android requires application packages to be signed.

For Google Play:

- use Play App Signing where applicable
- separate upload key from app-signing key
- protect the upload key
- document compromise/reset workflow
- review signing-key upgrade capability

Google documents Play App Signing as separating the upload key from the protected application signing key and supporting upload-key reset/key upgrades.

### Play Integrity

Use Play Integrity only when the threat model benefits from app/device integrity signals.

Architecture:

```text
client requests integrity token
        ↓
token bound to server challenge/request
        ↓
client sends token to backend
        ↓
backend verifies response/freshness/context
        ↓
backend combines result with risk policy
```

Do not let the client decide that its own integrity token is valid.

Google recommends backend interpretation of verdicts and request binding/freshness protections.

Do not make integrity attestation the sole authorization control.

---

## iOS Hardening

### App Transport Security

Keep ATS protections intact.

Avoid broad exceptions such as arbitrary loads.

If a legacy endpoint needs an exception:

- fix the server where possible
- scope the exception to the minimum domain/feature
- document the risk
- add a migration deadline

Apple states that default ATS settings are appropriate for most applications and warns that exceptions reduce application security.

### Keychain

Store credentials and small key material in Keychain rather than preferences or plaintext files.

Select accessibility/user-presence options based on:

- background-access requirements
- device-lock behavior
- migration/restore requirements
- threat model

Do not copy an accessibility setting from a sample without understanding when the item is available.

### Entitlements

Keep entitlements minimal.

Review:

- associated domains
- keychain access groups
- app groups
- push
- iCloud
- camera/microphone/location usage
- background modes

An entitlement expands application capability; it is not free configuration.

### URL schemes

Treat custom URL schemes as untrusted and potentially claimable.

Prefer Universal Links for owned HTTPS domains and sensitive routing when possible.

### Universal Links

Configure:

- Associated Domains entitlement
- HTTPS `apple-app-site-association`
- narrowly intended paths/components

Still validate every URI parameter at the application layer. Apple explicitly warns that malformed Universal Link parameters can create attacks even after association succeeds.

### Privacy usage descriptions

Every protected resource request must have accurate purpose strings and correspond to a real user-facing feature.

Apple requires applications to declare purposes for protected resources and holds applications responsible for third-party SDK access.

### Signing

Treat:

- Apple account credentials
- distribution certificates
- private keys
- App Store Connect keys

as high-value release assets.

Apple describes distribution certificates/account credentials as sensitive identity material that should remain protected and within the organization.

### App Attest

For high-value server operations, consider App Attest as a defense-in-depth application-integrity signal.

Use server-provided unpredictable challenges and perform assertion/attestation validation server-side, including freshness/replay-related state.

Do not equate successful App Attest with an infallibly trustworthy device or user.

### Privacy manifests

Review Flutter plugins/native SDKs for Apple privacy-manifest requirements. App Store submissions can be rejected for invalid manifests, and designated commonly used third-party SDKs have explicit manifest/signature requirements.

---

## Desktop Hardening

### macOS

For Mac App Store applications, respect App Sandbox and grant only the entitlements the application needs. Use user-selected-file mechanisms and security-scoped access rather than broad filesystem privileges when possible.

Treat persistent security-scoped bookmarks as sensitive capabilities.

### Windows

- Use OS credential facilities for credentials.
- Store application files under appropriate app/user directories.
- Avoid invoking shells for user-controlled input.
- Validate custom protocol activation.
- Review installer/update trust and signing.
- Never assume local filesystem ACLs protect data from the logged-in device owner.

### Linux

- Prefer Secret Service/libsecret for credentials where available.
- Use restrictive file permissions for sensitive app-private files.
- Handle absent/locked keyrings safely.
- Review Flatpak/Snap/native packaging permissions according to distribution method.
- Do not silently fall back from secure credential storage to plaintext persistence.

### All desktop targets

Desktop applications often have broader filesystem/process access than mobile sandboxes.

Threat-model:

- file associations
- custom URL schemes
- drag-and-drop files
- shell invocation
- native DLL/dylib/shared-object loading
- update mechanisms
- environment variables
- user-writable plugin directories
- browser-based OAuth redirect handlers

---

## Flutter Web Hardening

In addition to the earlier browser section, perform a deployment-specific review.

Verify:

- CSP
- HTML shell
- script origins
- CDN integrity/update policy
- CORS
- cookie attributes
- CSRF
- service worker
- caching headers
- authentication redirects
- browser storage
- JavaScript interop
- source-map exposure policy
- third-party analytics
- environment configuration embedded into compiled output

Do not ship server credentials in `web/index.html`, JavaScript globals, generated config, or compiled Dart.

A web application cannot keep a server secret from the person controlling the browser.

---

## Root / Jailbreak Risk

Treat a rooted/jailbroken device as a higher-risk environment, not as an automatically malicious user.

Possible responses based on threat model:

- collect risk signal
- require stronger authentication
- restrict high-value offline secrets
- require server challenge
- increase transaction verification
- reduce sensitive cache
- require fresh attestation
- block a narrow high-risk action when policy requires

Do not treat root/jailbreak detection as:

- unbypassable
- proof of compromise
- primary authorization
- reason to move server logic into the client

Attackers can patch or hook detection code.

---

## Attestation / Integrity

Attestation is defense in depth.

Use it to answer questions such as:

- Is this request associated with an expected application identity?
- Does the platform report integrity properties relevant to this transaction?
- Is the token fresh and bound to this request?

Do not use it to answer:

- Is this user authorized for object X?
- Is this price valid?
- Is the client incapable of tampering?
- Is the device permanently trustworthy?

### Server verification requirements

- issue/derive freshness challenge
- bind result to operation/request where supported
- validate token server-side
- reject replay
- expire results
- combine with authentication and authorization
- define degraded behavior for availability failures

Play Integrity and App Attest both require meaningful server-side interpretation rather than client-side self-verification.

---

## Biometrics

Biometric authentication answers a local question such as:

> Did the device's configured local authentication policy successfully confirm user presence?

It does not automatically answer:

> Is this account authorized to transfer money?

`local_auth` is an on-device authentication plugin; use it as a local-user-presence mechanism, not as backend authorization.

Use biometrics for:

- unlocking a locally protected credential
- reopening sensitive local UI
- step-up user presence
- protecting selected local actions

For server-sensitive operations also require:

- authenticated session
- server authorization
- recent server-side authentication where risk warrants
- MFA or transaction confirmation where warranted

Define fallback behavior for:

- no biometrics enrolled
- changed enrollment
- device credential fallback
- lockout
- unsupported platform

---

## Sensitive Actions

Classify high-risk actions explicitly.

Examples:

- password change
- email/phone change
- payout
- adding payment destination
- account deletion
- personal-data export
- MFA reset
- viewing recovery codes
- adding a passkey
- removing last strong authentication method
- changing tenant owner/admin

Consider:

- recent authentication
- step-up MFA
- transaction-specific confirmation
- server authorization
- one-time challenge
- notification to user
- audit log
- session revocation after credential change

Never rely on a local `bool recentlyAuthenticated` without server-side semantics when the action matters to the server.

---

## MFA / Passkeys

### MFA

Prefer stronger phishing-resistant methods when product/platform constraints permit.

Understand tradeoffs:

- TOTP: widely supported but phishable
- SMS: useful for some recovery/use cases but exposed to telephony/account takeover risks
- security keys/passkeys: public-key based and origin/relying-party scoped
- recovery codes: high-value fallback credentials

Protect recovery codes like passwords or refresh tokens.

### Passkeys

Use platform-standard passkey/WebAuthn mechanisms.

Android's current Credential Manager passkey flow obtains server-generated challenge/options, creates or uses a private credential through a credential provider, and sends the resulting assertion to the server for challenge/signature verification.

Apple's AuthenticationServices passkeys use public-private key credentials with the private key retained by the authenticator and the public key registered with the relying party.

For server verification validate the WebAuthn/profile requirements relevant to:

- challenge
- origin
- RP ID
- credential ID
- signature
- user/account binding
- ceremony type
- replay state

The current WebAuthn Level 3 work defines scoped public-key credentials and user-agent-mediated authenticator access; follow the deployed platform's supported WebAuthn profile rather than assuming candidate features are universally available.

---

## Push Notification Security

Treat notification payloads as untrusted.

Do not include highly sensitive data unnecessarily.

Prefer:

```text
"You have a new secure message"
```

over embedding the confidential message if the lock-screen privacy model does not justify exposure.

For notification actions:

- parse payload defensively
- validate identifier syntax
- authenticate user
- fetch current server state
- authorize server-side
- do not execute irreversible action based only on notification data

Never treat possession of a push payload as authorization.

---

## QR / Deep-Link Inputs

QR codes are arbitrary attacker-controlled input.

Validate:

- maximum payload length
- payload type
- scheme
- host
- path
- identifier format
- cryptographic signature if the protocol specifies one
- expiry
- replay state

Do not:

```text
scan QR
→ parse "transfer=1000"
→ transfer immediately
```

Use:

```text
scan
→ validate
→ fetch server-side object
→ authenticate/authorize
→ show confirmation
→ execute server-side
```

---

## Multi-Account / Multi-Tenant Security

### Multi-account

Namespace:

- credentials
- local databases
- cache directories
- preferences
- background jobs
- downloads
- push-token/account associations

Test:

```text
Account A
  ↓
load sensitive data
  ↓
logout
  ↓
Account B logs in
  ↓
verify no A data appears
```

### Multi-tenant

Never trust the tenant selected by the client as proof of membership.

Backend authorization should evaluate:

```text
authenticated principal
+
requested tenant
+
requested resource
+
required permission
```

Prevent cross-tenant caches and background sync.

---

## Privacy Engineering

Apply:

- data minimization
- purpose limitation
- retention limits
- consent where required
- deletion
- export
- correction
- third-party data review
- telemetry minimization

Do not collect data because a permission is available.

Review every SDK for:

- device identifiers
- location
- contact access
- ad identifiers
- installed-app information
- network hosts
- automatic initialization
- consent timing

Google Play's Data safety declaration includes third-party SDK collection, and Apple App Privacy details likewise require third-party partner practices to be represented.

---

## Resource-Exhaustion Defense

Flutter applications can be attacked through memory, CPU, disk, and parser exhaustion.

Threat-model:

- giant JSON
- huge arrays
- deeply nested objects
- enormous images
- decompression bombs
- archives with millions of entries
- oversized text
- malicious PDFs/documents
- infinite pagination
- huge WebView resources
- unbounded logs

Apply:

- server response-size limits
- client sanity limits
- pagination
- image dimension limits
- file-size limits
- decompression limits
- cancellation
- timeouts
- bounded retries
- background parsing/isolate use where appropriate
- streaming instead of full buffering where justified

OWASP API Security specifically treats unrestricted resource consumption as an API risk; enforce server-side limits in addition to defensive client handling.

---

## Performance vs Security

Never improve micro-performance by:

- disabling TLS validation
- skipping authorization
- storing sensitive data in plaintext
- removing validation
- logging credentials for debugging
- using predictable randomness
- retaining sensitive caches forever

Also do not add expensive controls without a threat model.

Evaluate:

- security value
- CPU cost
- network cost
- startup impact
- battery impact
- failure modes
- operational burden
- user friction

Security engineering is risk reduction, not maximum use of security-looking features.

---

