# Operational Workflows, Checklists, Production Gate, and Incident Response

> Source-derived reference split from the user-supplied Flutter Application Security Engineering Skill. Preserve its caveats and terminology when applying detailed guidance.

## Contents

- New Feature Security Workflow
  - 1. Identify assets
  - 2. Identify trust boundaries
  - 3. Classify data
  - 4. Identify attackers and abuse cases
  - 5. Determine authentication requirements
  - 6. Determine authorization requirements
  - 7. Determine storage requirements
  - 8. Determine network protections
  - 9. Validate every external input
  - 10. Apply least privilege
  - 11. Review privacy impact
  - 12. Review third-party dependencies
  - 13. Add negative/security tests
  - 14. Review logs and analytics
  - 15. Review release configuration
  - 16. Reassess residual risk
- Existing-Code Security Review Workflow
- Refactoring Rules
- Code Review Checklist
- Authentication Checklist
- Network Security Checklist
- Local Storage Checklist
- Deep-Link Checklist
- WebView Checklist
- Android Checklist
- iOS Checklist
- Web Checklist
- Dependency/Supply-Chain Checklist
- CI/CD Checklist
- Privacy Checklist
- Security Testing Checklist
- Production Readiness Checklist
- Security Theater Rejection Rules
  - Obfuscation
  - Certificate pinning everywhere
  - Root detection as a gate
  - Custom cryptography
  - Encrypting everything locally
  - Blocking screenshots everywhere
  - Biometric prompts for every action
  - Giant security SDKs
- Incident Remediation
- Quick Reference
- Final Operating Rules for the AI Coding Agent

---

## New Feature Security Workflow

For every new security-sensitive feature:

### 1. Identify assets

Write the concrete valuable objects.

### 2. Identify trust boundaries

Draw the minimum data-flow diagram.

### 3. Classify data

Mark public, sensitive, credential, cryptographic, or server-only.

### 4. Identify attackers and abuse cases

Include malicious authenticated users, not just anonymous attackers.

### 5. Determine authentication requirements

Specify:

- whether login is required
- freshness
- MFA/step-up
- account recovery interaction

### 6. Determine authorization requirements

Specify the authoritative server rule.

### 7. Determine storage requirements

For every persisted field answer:

- why must it survive restart?
- what storage?
- what backup?
- what logout behavior?
- what account namespace?

### 8. Determine network protections

Specify:

- HTTPS endpoint
- token location
- retry/idempotency
- redirect behavior
- whether pinning is justified

### 9. Validate every external input

Write schema and limits before parsing code where possible.

### 10. Apply least privilege

Review platform permissions, entitlements, plugin privileges, and CI credentials.

### 11. Review privacy impact

Minimize collection and retention.

### 12. Review third-party dependencies

Avoid unnecessary package attack surface.

### 13. Add negative/security tests

At least one test should prove each important rejection path.

### 14. Review logs and analytics

Ensure the feature adds no accidental credential/PII leak.

### 15. Review release configuration

Check manifests, ATS/NSC, flavors, signing, debug code, and web headers.

### 16. Reassess residual risk

Document what remains possible, especially on a compromised client.

---

## Existing-Code Security Review Workflow

Before changing existing security-sensitive code inspect:

- authentication entry points
- authorization assumptions
- credentials
- secure storage
- refresh logic
- API clients
- TLS customization
- certificate pinning
- deep links
- App/Universal Links
- WebViews
- JavaScript channels
- files
- local databases
- caches
- permissions
- logs
- crash reporting
- analytics
- platform channels
- native plugins
- dependencies
- Android manifest
- Apple entitlements/Info.plist
- web deployment headers
- release flags
- CI credentials
- signing
- existing security tests

Map current behavior before refactoring.

---

## Refactoring Rules

**A security refactor can change trust assumptions even if user-visible behavior looks identical.**

Before refactoring:

- record current auth/session state machine
- add regression tests
- identify storage formats
- identify migration behavior
- identify token-rotation semantics
- inspect deep-link compatibility
- inspect platform configuration

Preserve intentionally:

- session restoration
- refresh-token rotation
- logout cleanup
- storage migration
- account isolation
- deep-link/OAuth callbacks
- biometric behavior
- data recovery
- release security configuration

Never "simplify" a security state machine without proving concurrency and recovery behavior.

---

## Code Review Checklist

- [ ] Threat model exists for high-risk behavior.
- [ ] Trust boundaries are identified.
- [ ] Every external input has validation.
- [ ] Authentication requirement is explicit.
- [ ] Authorization is server-side.
- [ ] Client role/price/tenant state is non-authoritative.
- [ ] No server-only secret ships to client.
- [ ] Credential persistence is justified.
- [ ] Logs are redacted.
- [ ] API uses HTTPS.
- [ ] TLS validation is intact.
- [ ] Redirects are controlled.
- [ ] Deep links use exact URI checks.
- [ ] WebViews have narrow navigation.
- [ ] JS bridges are minimal.
- [ ] SQL uses parameters.
- [ ] Files have size/path/content controls.
- [ ] Caches are account-scoped.
- [ ] Logout lifecycle is complete.
- [ ] Dependencies are reviewed.
- [ ] Platform permissions are minimal.
- [ ] Security failures fail safely.
- [ ] Negative tests exist.
- [ ] Residual risks are documented.

---

## Authentication Checklist

- [ ] No third-party provider passwords are collected manually.
- [ ] Native OAuth uses Authorization Code + PKCE where applicable.
- [ ] External/system user-agent is used for native OAuth where required.
- [ ] `state` is securely generated and validated.
- [ ] OIDC nonce is used/validated where required.
- [ ] Redirect URI is exact and registered.
- [ ] Access tokens have appropriate scope/lifetime.
- [ ] Refresh tokens use secure persistence where needed.
- [ ] Public-client refresh replay protection is designed server-side.
- [ ] Refresh is single-flight.
- [ ] Logout cannot be undone by stale refresh completion.
- [ ] Server revocation is defined.
- [ ] Account switching clears/isolate state.
- [ ] Recovery flow is threat-modeled.
- [ ] Sensitive credential changes require appropriate recent auth/MFA.
- [ ] Authentication errors do not leak credential details.

---

## Network Security Checklist

- [ ] HTTPS for authenticated/private API traffic.
- [ ] Normal certificate validation preserved.
- [ ] Hostname validation preserved.
- [ ] No accept-all certificate callback.
- [ ] No production development CA.
- [ ] Cleartext disabled/restricted at platform configuration.
- [ ] Authorization headers redacted.
- [ ] Tokens absent from query strings.
- [ ] Redirect behavior reviewed.
- [ ] Retries bounded.
- [ ] State-changing retries are idempotent or safely designed.
- [ ] Timeouts exist.
- [ ] Cancellation exists for expensive calls.
- [ ] Pinning used only with threat-model justification.
- [ ] Pinning has backup/rotation/recovery if present.

---

## Local Storage Checklist

- [ ] Every persisted sensitive field has a reason.
- [ ] Refresh tokens use appropriate secure storage.
- [ ] Access tokens are memory-first where practical.
- [ ] Private keys are OS/library protected.
- [ ] Database encryption key is not beside DB in plaintext.
- [ ] Sensitive caches have retention.
- [ ] Backup rules reviewed.
- [ ] Temporary files reviewed.
- [ ] Logout cleanup reviewed.
- [ ] Account switching tested.
- [ ] Corrupt-storage recovery is safe.
- [ ] Reinstall/restore semantics tested where security depends on them.

---

## Deep-Link Checklist

- [ ] Incoming URI treated as untrusted.
- [ ] Scheme validated.
- [ ] Exact host validated.
- [ ] Port validated.
- [ ] Path validated.
- [ ] Parameter schema validated.
- [ ] No `contains()` hostname checks.
- [ ] No open redirect.
- [ ] Sensitive token not logged.
- [ ] Authentication required where needed.
- [ ] Authorization is server-side.
- [ ] One-time links expire/replay-protected.
- [ ] Android App Links used for owned sensitive HTTPS links where appropriate.
- [ ] iOS Universal Links used where appropriate.
- [ ] Custom-scheme collision risk documented.
- [ ] Cold/warm-start link handling both tested.

---

## WebView Checklist

- [ ] WebView is actually necessary.
- [ ] JavaScript disabled unless required.
- [ ] HTTPS only for sensitive content.
- [ ] Navigation uses exact origin rules.
- [ ] TLS errors fail.
- [ ] Mixed content blocked.
- [ ] Arbitrary untrusted HTML not combined with JS/native bridge.
- [ ] JS bridge minimized.
- [ ] JS messages schema-validated.
- [ ] Bridge cannot invoke generic native capabilities.
- [ ] Cookies/session behavior reviewed.
- [ ] Cache behavior reviewed.
- [ ] Downloads/popups reviewed.
- [ ] File/local-content access reviewed.
- [ ] OAuth does not use arbitrary embedded WebView.
- [ ] External navigation tests exist.

---

## Android Checklist

- [ ] `android:exported` explicit for relevant components.
- [ ] Unnecessary components not exported.
- [ ] Exported Intent inputs validated.
- [ ] Network Security Configuration reviewed.
- [ ] Cleartext denied for production endpoints.
- [ ] Debug trust overrides restricted to debug builds.
- [ ] `android:debuggable` false in production.
- [ ] Merged manifest permissions reviewed.
- [ ] System pickers used where narrower.
- [ ] Backup/data-extraction rules reviewed.
- [ ] Sensitive data excluded from backup as required.
- [ ] Signing/upload keys protected.
- [ ] Play App Signing configuration documented.
- [ ] Key-reset/rotation process documented.
- [ ] App Links verified for sensitive owned domains.
- [ ] Play Integrity server verification used only where justified.
- [ ] No release debug menu/test credential.

---

## iOS Checklist

- [ ] ATS remains enabled.
- [ ] ATS exceptions are narrow and justified.
- [ ] Keychain used for appropriate credentials.
- [ ] Keychain accessibility semantics reviewed.
- [ ] Entitlements are minimal.
- [ ] Keychain access groups reviewed.
- [ ] Associated Domains narrowly configured.
- [ ] Universal Link parameters validated.
- [ ] URL schemes treated as untrusted.
- [ ] Protected-resource purpose strings accurate.
- [ ] Privacy manifests valid/applicable.
- [ ] Third-party SDK privacy behavior reviewed.
- [ ] Distribution credentials protected.
- [ ] App Attest server verification used only if justified.
- [ ] Sensitive content/task-switcher behavior reviewed where required.

---

## Web Checklist

- [ ] No server-only secret in compiled web assets.
- [ ] XSS threat modeled.
- [ ] CSP deployed/tested where compatible.
- [ ] Third-party scripts minimized.
- [ ] CORS origins narrow.
- [ ] Credentialed CORS does not use wildcard origin.
- [ ] Cookie sessions use Secure/HttpOnly/SameSite as appropriate.
- [ ] CSRF defense exists for cookie-authenticated mutations.
- [ ] JavaScript-accessible bearer-token risk documented if used.
- [ ] localStorage not described as secure storage.
- [ ] Service-worker cache does not retain sensitive stale responses.
- [ ] JS interop reviewed.
- [ ] DOM injection sinks reviewed.
- [ ] Security headers/CDN configuration tested in deployed environment.

---

## Dependency/Supply-Chain Checklist

- [ ] `pubspec.lock` committed for app.
- [ ] CI enforces expected lockfile resolution.
- [ ] Package publisher reviewed.
- [ ] Repository reviewed.
- [ ] Maintenance activity reviewed.
- [ ] Transitive dependencies reviewed.
- [ ] Native code/FFI reviewed.
- [ ] Permissions/entitlements reviewed.
- [ ] Build scripts/hooks reviewed.
- [ ] Outbound network behavior reviewed.
- [ ] Advisory status reviewed.
- [ ] Third-party SDK privacy reviewed.
- [ ] Major updates require review.
- [ ] Abandoned packages have replacement/ownership plan.
- [ ] No dependency added for trivial value with disproportionate attack surface.

---

## CI/CD Checklist

- [ ] No release secret committed to Git.
- [ ] Secret manager/workload identity used.
- [ ] CI token permissions minimized.
- [ ] Protected release branch/tag.
- [ ] Release approval policy defined.
- [ ] Third-party CI actions pinned/reviewed.
- [ ] Build logs inspected for secrets.
- [ ] Signing credentials restricted.
- [ ] Android upload key protected.
- [ ] Apple distribution/App Store credentials protected.
- [ ] Artifact integrity/provenance checked where available.
- [ ] Production configuration selected explicitly.
- [ ] Dev/test endpoints absent.
- [ ] Secret scanning runs.
- [ ] Dependency checks run.
- [ ] Release artifacts smoke-tested before promotion.

---

## Privacy Checklist

- [ ] Data inventory exists.
- [ ] Every collected field has a purpose.
- [ ] Collection is minimized.
- [ ] Retention is defined.
- [ ] Deletion is defined.
- [ ] Export flow is authenticated/authorized.
- [ ] SDK collection is documented.
- [ ] Analytics excludes credentials/sensitive payloads.
- [ ] Crash reports exclude secrets.
- [ ] Permissions are minimum scope.
- [ ] Consent occurs before optional collection where required.
- [ ] Store privacy disclosures match real behavior.
- [ ] Account deletion cleans appropriate local data.
- [ ] Logs have retention/access controls.

---

## Security Testing Checklist

- [ ] Validator unit tests.
- [ ] Session lifecycle tests.
- [ ] Refresh-race tests.
- [ ] Logout-vs-refresh test.
- [ ] Account-switch leakage test.
- [ ] Deep-link negative tests.
- [ ] OAuth state/nonce/PKCE tests.
- [ ] TLS failure test.
- [ ] WebView navigation tests.
- [ ] File traversal/size tests.
- [ ] Malformed API-response tests.
- [ ] Other-user/other-tenant authorization tests server-side.
- [ ] Permission-denial test.
- [ ] Secure-storage failure/corruption test.
- [ ] Release-config test.
- [ ] Secret-scanning test.
- [ ] Dependency/advisory check.
- [ ] Security regression for every practical fixed defect.

---

## Production Readiness Checklist

Do not approve a security-sensitive production release until at minimum:

- [ ] Threat model exists for high-risk features.
- [ ] No server-only secrets are embedded in clients.
- [ ] Authentication uses current secure protocol patterns.
- [ ] PKCE is used for applicable public OAuth clients.
- [ ] OAuth state is validated.
- [ ] OIDC nonce is handled where required.
- [ ] Redirect URIs are strictly validated.
- [ ] Server-side authorization is enforced.
- [ ] Tenant/object ownership is server-validated.
- [ ] Tokens are stored appropriately.
- [ ] Refresh-token replay protections exist server-side.
- [ ] Client refresh is race-safe.
- [ ] Logout clears/revokes appropriately.
- [ ] Account switching cannot leak data.
- [ ] TLS validation is intact.
- [ ] No insecure certificate bypass exists.
- [ ] Pinning, if present, has a rotation strategy.
- [ ] Cleartext traffic is not used for protected data.
- [ ] Deep-link and external URL hosts are strictly validated.
- [ ] Sensitive links use verified HTTPS associations where appropriate.
- [ ] WebView navigation is restricted.
- [ ] WebView bridges are minimal and validated.
- [ ] All external inputs are schema/range/size validated.
- [ ] SQL uses parameters.
- [ ] File/path operations resist traversal and exhaustion.
- [ ] Sensitive logs are redacted.
- [ ] Crash/analytics payloads are reviewed.
- [ ] Permissions are least-privileged.
- [ ] Third-party packages/SDKs are reviewed.
- [ ] Dependency lock/advisory workflow exists.
- [ ] Android release manifest is reviewed.
- [ ] iOS/macOS entitlements and ATS are reviewed.
- [ ] Flutter Web headers/storage/auth model are reviewed.
- [ ] No debug backdoor exists in production.
- [ ] CI secrets are protected.
- [ ] Signing assets are protected.
- [ ] Security-sensitive bugs have regression coverage.
- [ ] Residual risks and security assumptions are documented.
- [ ] Recovery behavior exists for credential, pinning, signing, and storage failures relevant to the product.

---

## Security Theater Rejection Rules

Do not automatically recommend:

### Obfuscation

Use obfuscation only as reverse-engineering friction.

Do not claim it protects secrets or authorization. Flutter explicitly makes this distinction.

### Certificate pinning everywhere

Use only after threat-model justification and operational design. Android explicitly discourages general pinning, and Apple says it is usually unnecessary.

### Root detection as a gate

Use as one risk signal only.

### Custom cryptography

Reject unless implementing a reviewed standard through vetted primitives is genuinely unavoidable and expert cryptographic review is available.

### Encrypting everything locally

Encrypt when the asset/threat model warrants it. Encryption adds keys, migration, availability, backup, and recovery problems.

### Blocking screenshots everywhere

Use narrowly for genuinely sensitive screens and understand exact platform coverage.

### Biometric prompts for every action

Use local authentication when user presence materially reduces risk.

### Giant security SDKs

Add only when their concrete controls, telemetry, permissions, privacy impact, and operational dependence are understood.

For every proposed security control ask:

1. What threat does this mitigate?
2. What does it not mitigate?
3. Where is the trust boundary?
4. What assumptions must hold?
5. What bypass conditions exist?
6. What operational cost is introduced?
7. What user cost is introduced?
8. What happens when it fails?
9. How is it tested?
10. What recovery path exists?

---

## Incident Remediation

When a security defect is discovered:

1. Determine whether the issue is client-only, server-side, or cross-boundary.
2. Identify exposed assets.
3. Determine affected versions/accounts/time window.
4. Revoke or rotate credentials when exposure is plausible.
5. Fix authoritative server controls first when applicable.
6. Disable dangerous server-side capability remotely when possible.
7. Release client remediation.
8. Add regression tests.
9. Review nearby variants of the same flaw.
10. Update threat model.
11. Review logging/telemetry for accidental exposure.
12. Document residual risk.
13. Update dependency/platform configuration if the root cause was supply-chain related.

Do not wait for a mobile client rollout when a server-side mitigation can immediately block unauthorized operations.

---

## Quick Reference

| Situation | Preferred approach | Security reasoning |
|---|---|---|
| Server API secret needed | Keep on backend; never ship in Flutter | Client is attacker-controlled |
| `.env` contains production secret | Move secret server-side | Bundled config is recoverable |
| `--dart-define` secret | Move secret server-side | Build-time injection is not secret protection |
| Public API identifier | Restrict scope/provider usage | Public identifier can be extracted |
| Access token frequently needed | Keep in session memory; persist only if product requires | Reduce persistent exposure |
| Refresh token | OS-backed secure storage + server replay protection | High-value long-lived credential |
| OAuth login on native | Authorization Code + PKCE + external user-agent | Current native OAuth BCP |
| OIDC login | Validate issuer/profile, redirect, state, nonce where required | Prevent transaction/replay confusion |
| OAuth redirect | Exact scheme/host/path + state correlation | Redirect is a trust boundary |
| Concurrent token expiry | Single-flight refresh | Prevent rotation races |
| Logout during refresh | Session generation/epoch invalidates stale completion | Prevent session resurrection |
| Authorization check | Enforce on backend | Client condition is bypassable |
| Tenant ID | Authorize tenant/resource server-side | Prevent cross-tenant access |
| Price or entitlement | Derive/authorize on backend | Client value is mutable |
| Local small credential | OS credential/key store | Better at-rest isolation |
| Sensitive structured local DB | Encrypt only if threat model warrants; keep key separately | Encryption adds key-management burden |
| Database key | OS-backed credential/key store | Do not colocate with ciphertext |
| HTTP certificate error | Fail safely | Do not permit MITM |
| Development self-signed cert | Use test CA/debug-only configuration | Keep bypass out of production |
| Certificate pinning | Usually avoid; if justified use backup/rotation/recovery | Operational outage risk |
| Sensitive query parameter | Header/body where protocol permits | URLs leak widely |
| User-provided URL | Parse and exact-allowlist scheme/host/port | Prevent URL injection |
| Sensitive deep link | Verified HTTPS association + app validation + server authorization | Delivery verification is not parameter trust |
| Android owned web link | Android App Link | OS verifies app-domain association |
| Apple owned web link | Universal Link | Associated-domain verification with app validation |
| Custom URI scheme | Treat as interceptable/untrusted | Namespace can collide |
| One-image selection | Prefer system picker | Avoid broad media access |
| WebView external content | Strict origin/navigation, JS off unless needed, no privileged bridge | Browser content is hostile |
| WebView JS bridge | Minimal allowlisted API + message validation | Bridge is native attack surface |
| Flutter Web credential storage | Prefer secure server-session architecture where suitable; avoid long-lived JS storage | Same-origin XSS can access JS-readable state |
| Web cookie session | Secure + HttpOnly + appropriate SameSite + CSRF defense | Layered browser controls |
| Flutter Web CSP | Deploy restrictive tested policy as defense in depth | Reduces injection impact, not replacement for validation |
| SQL user input | Bound parameters | Prevent SQL injection |
| User file | Size/type/content/path validation | File metadata is attacker-controlled |
| Archive import | File-count/decompressed-size/path limits | Prevent bombs/traversal |
| Clipboard secret | Avoid | Clipboard crosses app boundary |
| Sensitive screen | Threat-model screenshot/task-switcher protection | Avoid indiscriminate UX/accessibility damage |
| Crash diagnostics | IDs/categories, not raw payloads | Telemetry is another data destination |
| Android cleartext | Network Security Configuration denying cleartext | Explicit network policy |
| Android exported component | `exported=false` unless intentionally external | Reduce inter-app entry points |
| Android backup | Explicitly classify/exclude credentials/sensitive data | Backup is another persistence boundary |
| Android signing | Play App Signing + separate protected upload key where applicable | Reduce signing-key exposure |
| Play Integrity | Server-verified risk signal bound to operation | Defense in depth, not authorization |
| iOS network | Keep ATS defaults; narrowly justify exceptions | Platform transport hardening |
| iOS credential | Keychain | Purpose-built credential storage |
| App Attest | Server challenge + verification + replay handling | Client cannot trust its own attestation |
| macOS filesystem access | Sandbox/user-selected scoped access where applicable | Least privilege |
| Windows credential | OS credential facility | Avoid plaintext preference storage |
| Linux credential | Secret Service/libsecret where available | Avoid plaintext file |
| Rooted/jailbroken device | Higher-risk signal; server controls remain authoritative | Detection is bypassable |
| Emulator/debugger detection | Defense in depth only | Local detection can be patched |
| Biometric confirmation | Local user-presence/secret-unlock control | Not backend authorization |
| MFA | Prefer strong methods; protect recovery path | Recovery is part of auth |
| Passkey | Platform WebAuthn/passkey APIs + server challenge verification | Public-key, relying-party scoped auth |
| Push payload | Treat as untrusted routing/context | Payload is not authorization |
| QR content | Strict parser + validation + server checks | Arbitrary attacker input |
| Account switch | Namespace and clear account-scoped state | Prevent cross-account leakage |
| New package | Review source, native code, permissions, maintenance, advisories | Dependency executes with app privileges |
| Application lockfile | Commit and enforce in CI | Improve dependency reproducibility |
| Third-party native SDK | Review privacy + outbound data + permissions | App is responsible for SDK behavior |
| CI secret | Secret manager/workload identity | Repository and logs are not secret stores |
| Third-party CI action | Pin/review immutable revision where supported | Reduce workflow supply-chain risk |
| Release build | No debug endpoints, bypasses, test credentials, or debuggability | Production must fail securely |
| Obfuscation | Optional reverse-engineering friction | Not secret protection |
| Security bug fixed | Add regression test | Prevent recurrence |
| Expensive security control proposed | Require threat model and failure/recovery design | Avoid security theater |
| Client-only "security" rule | Ask what server enforces | Client is untrusted |

---

## Final Operating Rules for the AI Coding Agent

When implementing or reviewing Flutter security-sensitive code:

1. **Threat-model before selecting controls.**
2. **Treat the Flutter client as untrusted.**
3. **Never ship server-only secrets.**
4. **Make the backend authoritative for authorization and business rules.**
5. **Use current protocol flows instead of custom authentication protocols.**
6. **Use Authorization Code + PKCE and an external user-agent for applicable native OAuth flows.**
7. **Treat refresh tokens as high-value credentials and refresh them race-safely.**
8. **Prevent stale async work from resurrecting logged-out sessions.**
9. **Use OS-backed credential storage where the platform provides it.**
10. **Do not equate encrypted storage with protection from a compromised running process.**
11. **Preserve TLS certificate and hostname validation.**
12. **Do not accept arbitrary certificates.**
13. **Do not recommend pinning without threat justification, backup keys, rotation, and recovery.**
14. **Validate deep links, URLs, QR codes, notifications, files, API data, WebView messages, and platform-channel payloads.**
15. **Use exact scheme/host/path rules rather than substring matching.**
16. **Treat WebView bridges as privileged native APIs.**
17. **Treat Flutter Web according to browser/XSS/CSRF/CORS/CSP/storage semantics, not mobile storage semantics.**
18. **Use least privilege for permissions, entitlements, SDKs, filesystem access, and CI credentials.**
19. **Use established cryptographic implementations and secure randomness.**
20. **Never invent a cryptographic protocol.**
21. **Parameterize SQL and safely construct every injection-sensitive context.**
22. **Apply size, nesting, count, timeout, and decompression limits to attacker-controlled resources.**
23. **Redact credentials and sensitive personal data from logs, crash reports, and analytics.**
24. **Treat third-party packages, native SDKs, build scripts, and CI actions as supply-chain trust decisions.**
25. **Keep release signing assets outside source control and tightly restrict release authority.**
26. **Treat root detection, attestation, obfuscation, screenshot restrictions, and biometrics as narrowly scoped defense-in-depth controls—not trust boundaries.**
27. **Test denial paths, malformed inputs, concurrency, logout, account switching, authorization, and compromised assumptions.**
28. **Add a regression test for every security defect when practical.**
29. **Document residual risk instead of claiming perfect client security.**
30. **When a security recommendation cannot explain its threat, limitations, assumptions, failure mode, recovery path, and test, do not recommend it.**
