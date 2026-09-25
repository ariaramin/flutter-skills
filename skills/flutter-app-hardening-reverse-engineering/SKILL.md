---
name: flutter-app-hardening-reverse-engineering
description: Harden Flutter applications against reverse engineering, static/dynamic analysis, secret exposure, tampering, repackaging, runtime manipulation, credential theft, API abuse, insecure local storage, transport interception, and platform/package integrity failures. Use this skill whenever a Flutter task involves application hardening, obfuscation, anti-tamper or anti-repackaging controls, secure release configuration, secure storage, OAuth/token protection, Play Integrity, App Attest, certificate pinning decisions, protected business logic/assets, dependency/FFI security, or a production security review—even when the user only asks how to make a Flutter app harder to crack or decompile.
compatibility: Applies to Flutter applications targeting Android, iOS, macOS, Windows, Linux, or Web. The bundled research baseline reflects Flutter 3.44.7 and Dart 3.12.2; re-verify version-sensitive Flutter, Dart, Android/AGP, Apple, Windows, Linux, browser, store, signing, privacy, attestation, and networking behavior before changing materially different toolchains.
---

# Flutter Application Hardening & Reverse-Engineering Resistance

## Mission

Apply layered security that raises attacker cost without confusing client-side resistance with trusted authority.

The central invariant is:

> Client hardening raises attacker cost. Trusted backend/platform controls establish security.

Never promise that a distributed Flutter app is impossible to decompile, inspect, patch, instrument, repackage, or reverse engineer.

Load references progressively:

- Read `references/hardening-guide.md` for detailed implementation guidance, platform controls, testing procedures, anti-patterns, architecture scenarios, and the complete production/release gates.
- Read `references/research-findings.md` when resolving security guarantees, residual-risk claims, deprecated guidance, control tradeoffs, or conflicting/ambiguous recommendations.
- Read `references/research-sources.md` when exact source attribution or version-sensitive re-verification is required. Prefer current official Flutter/Dart and platform-owner documentation over historical snippets.

The bundled research baseline reflects Flutter 3.44.7 and Dart 3.12.2.

## Security model

Assume a capable attacker can eventually inspect or manipulate Dart AOT/native code, Java/Kotlin/Swift/Objective-C/C/C++, JavaScript/Wasm, strings, URLs, configuration, assets, caches, local databases, process memory, client flags, and local integrity-checking code.

Therefore never trust the client as the final authority for authorization, ownership, admin/premium status, payment success, price, discounts, balances, fraud decisions, rate limits, privileged business rules, or permanent request-signing identity.

Client controls may still reduce accidental disclosure, increase static-analysis cost, protect data at rest from ordinary extraction, protect non-exportable keys, reduce interception exposure, detect repackaging, provide attestation/risk signals, and contain compromise through platform sandboxing.

For every control, state what remains possible if an attacker patches or instruments the app.

---

# Required workflow

## 1. Inspect the repository first

Before editing security, inspect the relevant repository and only the platforms actually shipped. Check Flutter/Dart versions, `pubspec.yaml`, `pubspec.lock`, dependencies/transitives, build scripts/flavors, `--dart-define`, environment/config files, generated config, hardcoded keys/tokens/certificates, auth/token flows, payments/entitlements, local storage, logging/crash reporting, debug menus, mocks, deep links, FFI/native libraries, manifests, entitlements, signing, permissions, backup rules, and network policy.

Do not harden from a generic checklist without repository evidence.

## 2. Write a threat model

For every meaningful risk record:

1. asset
2. attacker class
3. attack path
4. impact
5. actual trust boundary
6. existing control
7. proposed control
8. bypass/residual risk
9. operational cost
10. performance cost

Use rough attacker classes: casual archive/string/proxy inspection; intermediate disassembly/repackaging/root/runtime instrumentation; advanced patching/memory inspection/API emulation/automation.

Do not choose a control before naming the attack it is intended to reduce.

## 3. Classify client-visible keys and secrets

Classify each value as public client identifier, restricted client-visible API key, publishable key, or confidential secret.

Never ship long-term confidential backend secrets such as service-account keys, database admin credentials, payment-provider secret keys, JWT/server signing keys, HMAC master keys, private backend certificates, or long-lived privileged bearer tokens.

Do not treat `.env`, flavors, `--dart-define`, Base64, XOR, string splitting, generated wrappers, or moving a secret into native code as confidentiality.

If a provider intentionally requires a client-visible key, restrict it with provider-supported API/application/origin constraints, minimal scope, quotas, monitoring, and rotation. State that the value remains extractable.

## 4. Move authority to trusted systems

Prefer:

```text
Flutter client -> authenticated request -> trusted backend -> privileged service/data
```

For delegated client capabilities, use scoped, short-lived, revocable credentials instead of embedded master secrets.

For every sensitive endpoint the backend should independently validate authenticated identity, authorization/ownership, allowed state transition, authoritative price/product/entitlement, replay/idempotency, request limits, relevant integrity evidence, and abuse/risk policy.

## 5. Harden release artifacts

Production distributions must use release configuration and exclude debug menus, auth bypasses, internal admin screens, mock servers, staging credentials, test purchase paths, debug CAs, insecure TLS overrides, verbose network logging, and debug-only capabilities/entitlements.

### Flutter obfuscation

Use Dart obfuscation only where it adds justified friction on supported release targets. Typical pattern:

```bash
flutter build appbundle \
  --release \
  --obfuscate \
  --split-debug-info=artifacts/symbols/android
```

Use the correct target per platform. Archive matching split-debug symbols privately per release/platform.

Do not claim obfuscation encrypts code/assets/strings, hides embedded secrets, protects all native code, prevents hooking/patching, or prevents reverse engineering. Flutter Web must be treated as inspectable; minification/Wasm do not create confidentiality.

Search for code that depends on exact stringified Dart symbol names before enabling obfuscation.

### Android shrinking

Treat R8/DEX optimization and Flutter Dart obfuscation as separate layers. Keep only what reflection/JNI/framework behavior requires, avoid blanket keep rules, and verify the repository's actual AGP/Gradle version before changing configuration.

## 6. Preserve diagnostic symbols

Never delete release symbols/mappings to make analysis harder. Preserve the exact release's Flutter split-debug symbols, Apple dSYM, Windows PDB, Android R8 mapping, and other native symbols generated by the toolchain. Store them privately, immutably, and keyed to release identifiers.

## 7. Secure authentication and tokens

For native OAuth/OIDC applications, treat the app as a public client, prefer Authorization Code + PKCE, use provider-supported external/system authorization surfaces where required, never treat an embedded OAuth client secret as confidential, and validate state/nonce/redirect/protocol values.

Prefer short-lived access tokens with minimal scopes/audience. For persistent refresh credentials, use platform-protected storage and provider-supported rotation/replay protection or sender-constraining where available. Support server-side session/device/token revocation.

Never log passwords, bearer tokens, refresh tokens, Authorization headers, session cookies, or recovery secrets. Avoid credentials in URLs.

## 8. Protect local data and keys

Use platform secure storage for persistent client credentials/key material when appropriate, but treat it as protection at rest rather than protection from a compromised process.

Platform direction:

- Android: Keystore-backed keys; hardware/StrongBox only when the threat model justifies compatibility/performance cost.
- iOS/macOS: Keychain; Secure Enclave-backed keys when supported and materially useful.
- Windows: platform per-user credential/data-protection mechanisms.
- Linux: supported secret service/keyring with an explicit fallback policy.
- Web: do not treat localStorage, IndexedDB, sessionStorage, or service-worker caches as confidential against hostile same-origin code.

For sensitive databases/files, protect the data-encryption key through a platform-backed key. Never hardcode a meaningful encryption key in the app.

Define cache policy for encryption, expiration, account scoping, logout/account-switch cleanup, backup inclusion, and memory-vs-disk storage. Minimize secret copies and lifetime in process memory.

## 9. Use established cryptography

Never invent ciphers, MACs, password hashing schemes, or request-signing protocols. Use supported platform or reviewed cryptographic libraries, cryptographically secure randomness, and authenticated encryption when confidentiality plus integrity are required. Follow algorithm nonce/IV rules and define key purpose, rotation, and revocation.

## 10. Enforce secure transport

Authentication/private data traffic must use TLS. Never globally trust every certificate, disable hostname verification, ship permissive debug trust managers, or downgrade to HTTP to fix certificate errors.

Audit Android cleartext/network-security configuration and Apple ATS exceptions.

### Pinning

Do not add certificate pinning automatically. Use it only when the threat model specifically benefits, endpoint value is high, certificate/key operations are mature, backup pins/keys exist, rotation and stale-client behavior are tested, and recovery is acceptable.

If used, keep normal certificate/hostname validation, prefer stable public-key identities where supported, configure backups, stage rotations, and test expiry/disaster recovery.

State residual risk: pinning can be patched out on a compromised client and can cause outages. Do not create JavaScript-side Flutter Web pinning as if it were native certificate validation.

## 11. Treat integrity and attestation as server-side evidence

Never let a local integrity boolean grant privilege.

### Android Play Integrity

When appropriate, prefer Standard requests for ordinary protected actions, bind security-relevant request values using the documented mechanism, send operation + integrity token to the backend, verify decoded verdict/request context server-side, and combine signals with authentication/risk policy. Reserve heavier Classic requests for exceptional high-value cases.

### Apple App Attest

For sensitive server operations, use backend-created unique challenges, attested per-install keys as appropriate, and server verification of attestation/assertions bound to operation data. Handle unsupported devices, reinstall/key lifecycle, and rollout deliberately. DeviceCheck can add fraud signals but is not a replacement for App Attest assertions.

### Root/jailbreak/emulator checks

Treat them as bypassable heuristics. Use them only as risk inputs. Prefer proportional responses such as step-up auth, reduced limits, online verification, or denial of high-risk mutations. Never treat `isRooted == false` or `isEmulator == false` as a security guarantee.

## 12. Prevent replay and weak request signing

Use server-controlled mechanisms such as unique nonces/challenges, short validity windows, request binding, one-time consumption, sequence/state where required, idempotency keys, and refresh-token replay detection.

Do not invent permanent client-HMAC-secret request signing. If signing is required, prefer platform-bound asymmetric keys, attested per-install keys, short-lived server-issued credentials, or sender-constrained tokens. The backend still validates user, action, authorization, request values, replay state, and risk context.

## 13. Keep pricing, payments, and entitlements authoritative

Never trust a client-calculated amount, local premium boolean, client-reported payment success, or editable purchase state.

Use trusted store/provider/backend truth. Maintain durable entitlement server-side where appropriate. Offline entitlement cache is UX only and must have explicit expiration, grace period, revocation-delay, and resynchronization policy.

## 14. Protect proprietary logic and assets realistically

Assume shipped assets, rules, media, configuration, local models, and on-device ML weights are extractable by a capable attacker.

Do not treat `encrypted asset + permanently embedded decryption key` as strong secrecy. If confidentiality of business logic or a model is essential, move the sensitive part server-side or use a split architecture. Describe local asset/model protection as friction only.

## 15. Sanitize logs, crash reports, and telemetry

Production logs/crash metadata must not expose credentials, tokens, private keys, sensitive headers/cookies, recovery secrets, or complete private request bodies. Redact URLs/query values and review breadcrumbs/custom metadata/PII.

Tamper/risk telemetry should contain only signals useful to server decisions and must respect privacy/legal constraints.

## 16. Audit dependencies, plugins, FFI, and native code

Every dependency can add Dart/native code, permissions, telemetry/network behavior, transitive supply-chain risk, and dynamic-library loading.

Before adding/upgrading security-sensitive dependencies: inspect maintenance/provenance, platform implementations, permissions, native libraries/advisories, transitives, and lockfile changes; then test the release build.

Commit `pubspec.lock` for applications and use lockfile/content enforcement in CI where supported.

For FFI/native code also inspect binary provenance, dynamic-library paths, memory ownership, unsafe APIs, callbacks/thread assumptions, native networking, and downloaded build artifacts. Never load libraries from attacker-controlled paths.

## 17. Scan and rotate secrets

Scan source, native project files, config, fixtures, scripts, CI files, and relevant repository history for real credential patterns.

If a secret was committed:

> Remove it and rotate/revoke it.

Deleting the latest copy does not invalidate history, clones, logs, caches, or previous builds.

## 18. Validate every external input

Treat deep links, URLs, intents, route parameters, native entry points, and redirects as attacker controlled. Validate scheme/host/path, types, allowed values, authentication state, authorization/ownership, and redirect destinations.

Verified Android App Links and Apple Universal Links improve ownership binding but do not replace authorization.

## 19. Preserve accessibility and legitimate environments

Do not automatically classify accessibility services, overlays, emulators, custom ROMs, or enterprise management as malicious. Where signals are uncertain, prefer risk scoring and step-up controls over brittle blanket bans unless explicit policy requires denial.

## 20. Choose fail-open/fail-closed deliberately

High-value irreversible actions should generally fail closed or require recovery/step-up when required auth/integrity evidence cannot be validated. Lower-risk public/read-only functionality may remain available during attestation/risk-service outages.

Document the failure policy per operation.

## 21. Keep hardening off UI hot paths

Do not continuously hash large binaries, perform remote attestation, scan for root, or run heavy crypto in animation/build paths. Scope expensive controls to protected operations.

Measure startup impact, protected-request p50/p95 latency, crypto CPU/battery/network cost, attestation failure rate, unsupported-device rate, and false positives.

Only block startup on security work that must complete before the user can safely proceed.

## 22. Support rotation, revocation, and compromised-version response

Design rotation for relevant credentials, certificates, pins, device keys, and encryption keys. Support server revocation of sessions, refresh tokens, device credentials, compromised keys, and vulnerable app releases.

Security-critical minimum-version enforcement must involve the backend because a local version gate can be patched.

---

# Platform gates

Read `references/hardening-guide.md` for the complete platform sections before making platform-specific changes, and consult `references/research-sources.md` before applying version-sensitive platform behavior.

## Android

Review non-debuggable release config, exported Activities/Services/Receivers/Providers, least-privilege permissions, cleartext/network policy, backup/data-extraction rules, FileProvider grants, verified App Links, Play Integrity when justified, signing/Play App Signing separation, R8, native libraries, and selective `FLAG_SECURE` for truly sensitive screens.

Do not assume `allowBackup=false` describes every modern backup/device-transfer behavior.

## iOS

Review production signing/provisioning, least-privilege entitlements, Keychain access groups, ATS exceptions, associated domains, file protection, App Attest/DeviceCheck where justified, and capture-state handling as privacy defense-in-depth.

Do not claim iOS universally prevents screenshots.

## macOS

Review signing/distribution model, Hardened Runtime, notarization where applicable, App Sandbox where applicable, least-privilege entitlements, absence of production `get-task-allow`, and narrowly justified runtime/library-validation exceptions.

## Windows

Review trusted signing, MSIX identity/integrity when used, platform credential/data protection, controlled DLL loading, and least-required filesystem ACL exposure. Do not assume ordinary Win32 apps receive AppContainer isolation.

## Linux

Document the actual distribution/security model. Review file ownership/permissions, supported secret service, native library locations, package sandbox/confinement, and least-privilege Snap interfaces when Snap is used. Do not transfer guarantees between package formats.

## Web

Treat browser-delivered code/config/assets as inspectable. Review HTTPS/HSTS, CSP, cookie/CSRF/session architecture, CORS without treating it as auth, source-map publication, browser storage/service-worker caches, JS/DOM interop and XSS sinks, and exposed backend credentials.

Do not claim minification, Wasm, or removed source maps create secrecy.

---

# Anti-patterns to reject

| Anti-pattern | Correct direction |
|---|---|
| Secret in Dart/native source | Move secret use to trusted backend |
| `.env` or `--dart-define` as secret protection | Treat as configuration only |
| Base64/XOR/string splitting | Remove confidential value from client |
| Obfuscation as encryption | Use only for analysis friction |
| Delete symbol files | Keep private release-matched symbols |
| R8 means Dart logic is protected | Harden JVM/native and Dart separately |
| Pin every endpoint | Normal TLS by default; pin selectively |
| Disable TLS validation | Fix trust configuration |
| Root/emulator check as authorization | Backend authorization + risk/attestation |
| Client premium/price/payment truth | Trusted backend/store/provider truth |
| Permanent HMAC secret in app | Bound/attested/short-lived identity if needed |
| CORS as API security | Authenticate/authorize the API |
| WebAssembly as secrecy | Keep confidential logic server-side |
| Client-side attestation verification | Verify on trusted server |
| Feature flag as permission | Backend authorization |

---

# Validation

Testing must target applications/environments the user is authorized to assess.

## Static release inspection

Inspect the actual production-like artifact for confidential strings/keys, staging URLs, debug flags/resources, internal menus, sensitive assets, permissions/exported components, and expected obfuscation/shrinking state.

## Network validation

Confirm invalid certificates fail, hostname mismatches fail, prohibited cleartext downgrade fails, production does not trust debug CAs, and backend authorization still holds when local UI/state is modified.

## Tamper and authorization tests

Using an authorized internal modified build, verify backend risk/integrity policy, confirm local premium/payment state cannot grant server capabilities, confirm protected endpoints validate user/action/ownership, and verify relevant telemetry.

## Token/lifecycle tests

Test token expiry, refresh replay/rotation, logout revocation, account switching and secure-storage cleanup, offline trust windows, reconnect after revocation, backup/restore of sensitive Android data where relevant, and attestation outage/unsupported/invalid/stale/mismatch cases.

---

# Required output

For a real hardening or security-review task, return:

```text
Repository/security context
Threat model
Assets and attacker classes
Trust boundaries
Critical findings by severity
Secrets/configuration findings
Authentication/token findings
Backend authorization findings
Release/obfuscation/symbol findings
Storage/crypto findings
Transport/pinning findings
Integrity/attestation findings
Platform-specific findings
Dependency/FFI/native findings
Logging/privacy findings
Performance/availability impact
Recommended changes in priority order
Validation/tests performed or required
Residual risks
Release gate status
```

For each finding include affected component/platform, security property, likely attack path, recommended fix, whether the fix prevents/detects/raises cost, residual risk, and relevant compatibility/operational/performance impact.

Do not describe a client-only control as a complete security boundary.

---

# Release gate

Do not approve production release until all applicable requirements are demonstrated:

- release build; no confidential embedded backend secrets
- explicit obfuscation decision and privately retained exact symbols/mappings
- valid signing; Android release non-debuggable
- exported components/permissions/entitlements follow least privilege
- Android backup/data-extraction policy is intentional
- TLS validation intact; ATS exceptions minimal
- pinning, if used, has tested backup/rotation/recovery
- persistent client credentials use appropriate platform protection
- logs/crash metadata sanitized; no staging/debug credentials/trust overrides
- backend authorizes every privileged action
- payment, price, and entitlement truth come from trusted systems
- integrity/attestation is server verified where used
- replay protection exists for high-risk operations
- key/token revocation exists; vulnerable versions can be restricted server-side when required
- dependencies/native plugins reviewed; secret scanning passes
- Web bundle contains no confidential backend credential and hosting/session headers are reviewed
- sensitive caches clear on logout/account switch
- security-control latency and false-positive behavior are acceptable

If a mandatory requirement cannot be demonstrated, report:

> Not approved for production release.

## Definition of done

A hardened Flutter application is not one that cannot be reversed. It is one where trusted systems own privileged truth, confidential secrets are absent from the distributed client, client credentials are scoped/protected/revocable, release artifacts are hardened without destroying diagnosability, transport validation is intact, integrity signals are server verified when used, local data and backups follow explicit policy, platform privileges are minimal, Web is treated as inspectable, dependencies/native code are understood, controls are rotatable and performant, and residual risk is explicit.

Never finish with “protected from reverse engineering.” State which attacks are prevented by trusted controls, which are detected, which are only made more expensive, and which remain possible.
