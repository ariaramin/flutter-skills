---
name: flutter-application-security-engineering
description: Audit, design, implement, test, harden, release, or remediate Flutter application security across Android, iOS, and Web. Use for security reviews; authentication, tokens, secure storage, networking/TLS, WebViews, browser/DOM interop, deep links, permissions, platform configuration, dependency or supply-chain risks, and release security. For an audit, trace untrusted data to a concrete sink and report only evidence-backed findings; do not invent backend flaws that the Flutter repository cannot establish.
---

# Flutter Application Security Engineering
Use security architecture, not security-looking switches. Start from assets, attackers, trust boundaries, and data flows; select controls only after identifying the threat they mitigate.

## Operating stance
Apply these rules throughout the task:

1. Treat the distributed Flutter client as attacker-controlled.
2. Keep authorization and privileged business truth on a trusted backend.
3. Never ship server-only secrets in client code, assets, configuration, native resources, or Web bundles.
4. Preserve normal TLS certificate and hostname validation.
5. Use established OS, protocol, and cryptographic primitives instead of custom security protocols.
6. Validate every trust-boundary input, including data from the project's own backend.
7. Minimize permissions, data collection, retention, third-party SDK access, and credential lifetime.
8. Make recovery, revocation, failure behavior, and account-switch/logout semantics explicit.
9. Add negative and regression tests for meaningful controls and fixed vulnerabilities.
10. Explain residual risk; do not claim that obfuscation, root detection, attestation, biometrics, screenshot blocking, or pinning makes the client trusted.

A useful invariant is:

```text
client-side validation != server-side authorization
obfuscation != secret protection
biometric success != server authorization
secure storage at rest != secrecy after the process reads the secret
```

## Load references only when needed
The original research is split into topical references so the core skill stays small. Read the relevant file before making detailed recommendations or code changes in that area.

| Topic | Reference |
|---|---|
| Principles, threat modeling, trust boundaries, secrets, authentication, OAuth/OIDC, sessions, refresh-token rotation, logout, authorization | `references/01-foundations-auth-session.md` |
| Secure storage, databases, cryptography, network security, TLS, certificate pinning, Dio/API client security | `references/02-storage-crypto-network.md` |
| Input validation, injection, deep links, external URLs, WebViews, Flutter Web/browser security | `references/03-input-links-webview-web.md` |
| Permissions/privacy, files, clipboard/screenshots, logging/crash reporting, platform channels, plugin and supply-chain security, CI/CD | `references/04-data-plugins-supply-chain.md` |
| Android, iOS, desktop, Web deployment, root/jailbreak, attestation, biometrics, MFA/passkeys, notifications, QR, multi-account/tenant, resource exhaustion | `references/05-platform-resilience.md` |
| Security testing, static analysis, code-review workflow, architecture workflow, common anti-patterns | `references/06-testing-antipatterns.md` |
| New-feature and existing-code workflows, checklists, production gate, security-theater rejection, incident remediation, quick reference, final operating rules | `references/07-workflows-checklists.md` |

For source-specific wording, caveats, examples, and platform details, prefer the reference text over memory.

## Security workflow
### Practical repository audit mode
Use this mode when the user asks to audit, assess, review, or find vulnerabilities in an existing Flutter project. It is an evidence exercise, not a keyword scan.

1. Establish scope from the repository: targets actually present (Web, Android, iOS), build flavors, and missing backend or hosting code.
2. Map security-relevant flows end to end: untrusted source, transformations, persistence, network requests, privileged operation, and sink. Search every caller before concluding a shared helper is safe or unsafe.
3. Review the applicable areas: DOM/JS interop and HTML rendering; WebViews and bridges; authentication/session/token lifecycle; cookies and CSRF architecture; Web CSP; dependency provenance and lockfiles; client-versus-server authorization; logging/errors; TLS and certificate callbacks; Android/iOS configuration; deep links; local data; permissions; and Firebase/third-party configuration.
4. Classify each observation precisely:
   - **Confirmed finding:** concrete source-to-sink evidence supports realistic exploitation.
   - **Potential risk / manual verification:** a required backend, hosting, runtime, or deployment fact is absent.
   - **Secure control / false positive:** the apparent pattern is mitigated or not a dangerous sink.
   - **Out of repository scope:** the relevant enforcement is backend-controlled and cannot be verified here.
5. Do not report ordinary Flutter text/widget rendering as XSS. For CSRF, first establish cookie-based browser authentication; bearer tokens explicitly sent in an Authorization header do not create conventional browser CSRF by themselves. Do not call a missing `HttpOnly` flag a Flutter defect when cookies are server-set.
6. Record file path, symbol, and line number for every confirmed finding. If the evidence or exploit path is incomplete, say **Needs manual verification** rather than upgrading it to a vulnerability.

For report structure, start with:

```markdown
# Executive Summary
Overall posture, Critical/High/Medium/Low counts, and the three highest-priority actions.

| ID | Severity | Platform | Category | File / location | Finding | Exploit scenario | Recommended fix |
|---|---|---|---|---|---|---|---|
```

Then provide a detailed entry for every confirmed finding: severity rationale, affected platform, source-to-sink evidence, realistic attack scenario, concrete remediation, and a Flutter/Dart secure example when it clarifies the change. Finish with **Potential Risks / Manual Verification**, **Security Controls Already Implemented**, and **Remediation Priority** (immediate, before release, defense-in-depth). Use OWASP MASVS/MSTG, OWASP Top 10, and OWASP API Security as guidance, but never invent a CVE, version, endpoint, file, or line number.

### 1. Inspect the repository before changing it
Map the real implementation first. Inspect at least the relevant portions of:

- `pubspec.yaml` and `pubspec.lock`
- authentication/session state machine
- API client and interceptors
- token persistence and refresh logic
- local databases, caches, files, and preferences
- deep-link and external-URL handlers
- WebViews and JavaScript channels
- platform channels and FFI/native libraries
- logging, analytics, and crash reporting
- permissions and privacy-sensitive SDKs
- Android manifest/network-security/backup configuration
- Apple entitlements, `Info.plist`, ATS, Keychain usage, associated domains
- Web bootstrap, scripts, headers, CORS/cookies/storage/service worker
- release flavors/configuration
- CI/CD, signing, secrets, and release jobs
- existing security tests and regression coverage

Do not refactor security-sensitive code before understanding current lifecycle and migration behavior.

### 2. Build a lightweight threat model
For each security-sensitive feature record:

```text
Asset
Attacker
Entry points
Trust boundaries
Data flows
Threat / abuse case
Impact
Existing control
Proposed control
What the control does not mitigate
Failure / recovery behavior
Performance and usability cost
Verification test
Residual risk
```

Consider malicious authenticated users and compromised clients, not only anonymous remote attackers.

### 3. Classify data
Classify each relevant value as one of:

- public
- user-sensitive
- credential/session material
- cryptographic material
- server-only secret
- security metadata
- operational diagnostics
- highly regulated/special-category data

For every non-public value define purpose, collection point, storage, network destinations, retention, account/tenant scope, deletion, backup, logging, analytics, export, and incident impact.

### 4. Mark enforcement location
For every decision, state whether the authoritative enforcement belongs in:

- client UX
- OS/platform control
- network/TLS layer
- backend/API
- CI/release infrastructure

Backend authority is required for roles, ownership, tenant membership, entitlement, price, payment state, balances, quotas, destructive actions, and other privileged business rules.

### 5. Select the narrowest effective controls
Prefer controls that directly address the modeled threat and are maintainable.

Reject controls that cannot explain:

1. threat mitigated
2. property protected
3. enforcement location
4. assumptions
5. bypass conditions
6. failure behavior
7. recovery path
8. operational/user cost
9. test evidence
10. residual risk

## Authentication and session gate
Read `references/01-foundations-auth-session.md` for authentication or session work.

Use these defaults unless the provider/profile requires something else:

- Native OAuth/OIDC public clients: Authorization Code + PKCE + external/system user-agent.
- Generate unpredictable `state`; validate it exactly.
- Use and validate OIDC nonce when required by the profile.
- Treat redirect URIs as strict trust boundaries.
- Do not embed a confidential OAuth client secret in native or Web Flutter clients.
- Keep access tokens short-lived/scoped; prefer memory-first handling where practical.
- Treat refresh tokens as higher-value credentials.
- Use secure persistent storage only when restoration is required.
- Design server-side refresh-token replay protection/rotation.
- Make client refresh single-flight.
- Prevent stale refresh completion from resurrecting a logged-out session; use a session generation/epoch or equivalent state guard.
- Define local logout, server revocation, and account-data cleanup separately.
- Threat-model account recovery as part of authentication.

Do not infer authorization from a decoded JWT or a client-side role/entitlement flag.

## Storage and cryptography gate
Read `references/02-storage-crypto-network.md` when persistent sensitive data, keys, or encryption are involved.

Apply:

- ordinary preferences only for non-sensitive preferences
- OS-backed credential/key storage for small long-lived credentials or keys where available
- separate protected key material from encrypted databases/files
- explicit backup, restore, logout, account-switch, corruption, and migration behavior
- established authenticated encryption such as a vetted AES-GCM or ChaCha20-Poly1305 implementation when application-layer encryption is justified
- cryptographically secure randomness for security tokens/nonces/keys
- explicit key origin, storage, rotation, recovery, deletion, and compromise response

Do not invent ciphers, password hashing, request-signing schemes, key exchange, or token formats.

Encryption at rest is defense against some offline extraction; it does not make a running compromised process unable to access plaintext after legitimate decryption.

## Network and API gate
Read `references/02-storage-crypto-network.md` for network, TLS, pinning, and Dio details.

Require for protected traffic:

```text
HTTPS
+ normal platform trust validation
+ hostname validation
+ server-side authentication/authorization
```

Reject:

- accept-all certificate callbacks
- production debug CAs
- plaintext authenticated endpoints
- bearer credentials in URLs when avoidable
- blind retries of irreversible operations
- logging of Authorization headers or sensitive bodies

For retries of state-changing operations, require bounded retry logic and server-supported idempotency or equivalent safe semantics.

Do not recommend certificate pinning by default. If the threat model justifies it, require backup pins/keys, overlap, rotation, monitoring, staging failure tests, and an emergency recovery plan before approval.

## External-input gate
Read `references/03-input-links-webview-web.md` for URI, WebView, browser, and injection details.

Treat all of these as attacker-controlled:

- API responses
- deep links and OAuth redirects
- external URLs
- QR codes
- notification payloads
- WebView content and JS messages
- platform-channel payloads
- user-selected/downloaded files
- archive entries
- clipboard input
- restored local data

Validate type, required fields, enum membership, numeric ranges, lengths, collection counts, nesting depth, URI components, file size/content, decompression limits, and resource budgets as applicable.

Use exact URI component rules. Never use substring hostname trust checks such as `host.contains('example.com')`.

Parameterize SQL and avoid user-derived shell/HTML/JavaScript/path construction.

## Deep links and external URLs
For sensitive owned domains, prefer verified HTTPS associations where the target platform supports them, but still validate parameters and authorize server-side.

For each incoming URI validate:

- scheme
- exact host
- port policy
- path
- parameter schema
- transaction correlation/state where applicable
- authentication state
- server-side authorization
- one-time token expiry/replay where applicable

Do not execute irreversible actions directly from link parameters. Navigate to a trusted flow, fetch current server state, require authentication/step-up when needed, and confirm the action.

## WebView gate
Treat a WebView as a browser trust boundary.

Default posture:

- avoid it for sensitive functionality when native Flutter UI suffices
- disable JavaScript unless required
- HTTPS only for sensitive content
- exact-origin navigation allowlist
- fail on TLS errors
- avoid mixed content
- do not combine untrusted HTML + JavaScript + privileged native bridge
- expose only narrow, allowlisted JS bridge actions
- schema/size-validate every bridge message
- authorize privileged actions independently

Do not implement general native OAuth login in an arbitrary embedded WebView unless the provider/protocol explicitly supports that design.

## Flutter Web gate
Treat the browser-delivered application as inspectable. Never place server-only secrets in compiled Dart/JS/Wasm, `web/index.html`, generated config, or browser storage.

Review:

- XSS and JS/DOM interop
- third-party scripts
- CSP
- cookie attributes and CSRF
- CORS
- JavaScript-readable token storage
- service-worker/cache behavior
- source-map exposure policy
- hosting/TLS/security headers

Remember:

```text
CORS != authentication
CSP != input validation
Wasm/minification != secrecy
localStorage/IndexedDB != OS secure storage
```

## Permissions, privacy, files, and telemetry gate
Read `references/04-data-plugins-supply-chain.md`.

Use least privilege and contextual permission requests. Prefer system pickers over broad storage/media access when possible.

For files, validate size, actual format, filename/path policy, archive entry count, decompressed size, nesting, parser behavior, and destination. Generate destination identifiers rather than trusting attacker filenames.

Never log or send to crash/analytics systems:

- passwords
- access/refresh tokens
- session cookies
- OAuth codes
- Authorization headers
- private/encryption keys
- recovery codes
- full sensitive request bodies

Treat crash reporters and analytics as external data destinations with explicit redaction and privacy review.

## Plugin, native, and supply-chain gate
Read `references/04-data-plugins-supply-chain.md` before adding or approving security-relevant dependencies.

Review:

- publisher and repository ownership
- maintenance and release history
- transitive dependencies
- native/FFI code and binaries
- build hooks/scripts
- permissions and entitlements
- network hosts and analytics
- advisories
- privacy behavior
- platform-specific implementations

Commit `pubspec.lock` for applications and use lockfile enforcement in CI when compatible with the toolchain.

Do not add a broad security SDK merely because it advertises anti-hacking features. Map each enabled feature to a concrete threat and data flow.

## CI/CD and signing gate
Read `references/04-data-plugins-supply-chain.md` for release infrastructure details.

Protect signing and release credentials outside source control. Prefer CI secret management and short-lived workload identity where supported.

Restrict release jobs with protected branches/tags, least-privilege tokens, approvals for high-risk release steps, and immutable/pinned third-party automation where supported.

Scan repositories and build logs for secrets. If a real secret was committed, remove it **and rotate/revoke it**.

## Platform review gate
Read `references/05-platform-resilience.md` for the target platform before release approval.

### Android
Verify at least:

- production is non-debuggable
- exported components are intentional and validate external input
- merged permissions follow least privilege
- Network Security Configuration/cleartext policy is intentional
- debug trust is unavailable in release
- backup/data-extraction rules protect credentials/sensitive local data
- signing/upload-key workflow is protected
- App Links are verified where sensitive owned HTTPS links are used
- Play Integrity, if used, is bound to the protected request and verified/interpreted server-side

### iOS/macOS
Verify at least:

- ATS remains intact with narrow exceptions only
- Keychain is used appropriately for small credentials/keys
- entitlements are minimal
- Universal Link parameters remain treated as untrusted
- protected-resource purpose strings are accurate
- privacy-manifest/third-party SDK requirements are reviewed
- distribution credentials are protected
- App Attest, if used, is challenge-based and server-verified
- macOS sandbox/runtime/signing settings match the distribution model

### Windows/Linux
Verify credential storage, package/update signing/trust, native library loading, filesystem exposure, custom protocol handlers, and distribution-specific sandbox/confinement semantics.

Do not claim one packaging model provides another model's isolation guarantees.

## Resilience and integrity controls
Read `references/05-platform-resilience.md` for root/jailbreak, attestation, biometrics, passkeys, and sensitive actions.

Treat:

- root/jailbreak detection
- emulator/debugger checks
- obfuscation
- screenshot restrictions
- Play Integrity/App Attest
- biometrics

as scoped defense-in-depth signals/controls, not replacements for backend authorization.

For high-risk actions, consider recent authentication, MFA/step-up, transaction-specific confirmation, server authorization, one-time challenges, audit logs, and session revocation after credential changes.

## Resource-exhaustion gate
Bound attacker-controlled work:

- response size
- collection size
- nesting depth
- file size
- image dimensions
- decompressed archive size/file count
- parser time
- retry count
- pagination
- disk/cache growth

Use cancellation, timeouts, streaming, and background parsing/isolate work where appropriate, but keep authoritative service-side limits too.

## Security testing workflow
Read `references/06-testing-antipatterns.md` before final approval.

Test the rejection paths, not only the happy path.

Minimum relevant coverage includes:

- auth/session expiry and revocation
- refresh single-flight and rotation races
- logout-vs-refresh session resurrection
- account-switch cache isolation
- malformed API responses
- wrong deep-link scheme/host/port/path/state
- OAuth state/nonce/PKCE failures
- WebView external navigation and malformed bridge messages
- TLS/certificate failure
- file traversal/size/content attacks
- corrupted secure storage
- permission denial/limited modes
- unauthorized object and cross-tenant requests on the server
- release configuration and secret scanning

For every practical fixed vulnerability, add a regression test named for the threat when possible.

## Security refactoring
Read `references/07-workflows-checklists.md` for detailed review/refactor checklists.

Before simplifying or moving security-sensitive code, preserve intentionally:

- auth/session state transitions
- token rotation semantics
- logout cleanup
- account isolation
- storage migration
- OAuth/deep-link callbacks
- platform configuration
- recovery paths

A refactor that keeps the UI identical can still weaken a trust boundary.

## Security-review output
For a review or implementation task, report:

```text
Security scope
Repository context inspected
Assets and data classification
Threat model / trust boundaries
Findings ranked by severity and exploitability
Authoritative enforcement location for each finding
Recommended code/config changes
Platform-specific changes
Tests added or required
Operational/recovery implications
Residual risk
Unverified assumptions / missing evidence
```

For findings, prefer this structure:

```markdown
### [Severity] Finding title
- Threat:
- Evidence:
- Trust boundary / enforcement location:
- Impact:
- Recommended fix:
- What the fix does not protect:
- Verification:
```

Do not describe a client as "secure from reverse engineering" or "unhackable." State what is prevented by trusted controls, detected, made more expensive, or still possible.

## Production approval gate
Do not approve a security-sensitive release until applicable conditions are demonstrated:

- high-risk features have a threat model
- no server-only secret ships in any client target
- authentication uses current supported protocol behavior
- server-side authorization covers protected objects/actions/tenants/business rules
- token storage, refresh, logout, revocation, and account switching are safe
- TLS trust and hostname validation are intact
- pinning, if used, has tested rotation/recovery
- deep links, URLs, WebViews, files, and platform channels are strictly validated
- SQL/injection-sensitive contexts are safely constructed
- permissions and entitlements follow least privilege
- logs, crash reports, and analytics are redacted
- third-party dependencies/native SDKs are reviewed
- Android/Apple/Web/desktop release configuration is reviewed for targeted platforms
- CI secrets and signing authority are protected
- negative/security regression tests cover material controls
- residual risks, assumptions, and recovery behavior are documented

If an important condition cannot be evidenced, return **not approved** with the blocking evidence gap or risk.
