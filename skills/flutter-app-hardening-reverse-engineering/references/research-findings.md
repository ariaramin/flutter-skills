# Research Findings

## Table of contents

- [research_findings.md](#researchfindingsmd)
- [Obsolete / Deprecated Guidance](#obsolete-deprecated-guidance)
- [Official-Documentation Ambiguities / Limits](#official-documentation-ambiguities-limits)
- [Recommended Architecture Conclusions](#recommended-architecture-conclusions)

---

# research_findings.md

## Executive Finding

The strongest Flutter hardening architecture is not a collection of anti-reversing tricks.

It is a layered trust model:

```text
MINIMIZE VALUE SHIPPED TO CLIENT
        +
RELEASE OBFUSCATION / SYMBOL REDUCTION
        +
PLATFORM SIGNING / SANDBOX / STORAGE
        +
PLATFORM ATTESTATION WHERE JUSTIFIED
        +
SECURE TRANSPORT
        +
SHORT-LIVED LEAST-PRIVILEGED CREDENTIALS
        +
TRUSTED BACKEND AUTHORIZATION
        +
REPLAY / ABUSE CONTROL
        +
REVOCATION / TELEMETRY
```

The backend remains the trust boundary for sensitive business decisions.

---

## Finding 1 — Reverse-engineering prevention is not achievable

### Guarantee

Obfuscation can increase the effort required to understand code.

### It does not guarantee

- secrecy
- non-extractability
- anti-tampering
- runtime integrity

Flutter states this directly for Dart obfuscation.

### Architecture conclusion

Move high-value secrets and security authority away from the client instead of trying to hide them more aggressively.

Confidence: Very high.

---

## Finding 2 — Flutter obfuscation has a narrow, well-defined security property

Flutter obfuscation:

- release-only
- renames Dart symbols
- supports native/mobile/desktop target families listed by Flutter
- does not support Web
- does not encrypt resources
- requires retained symbol files for practical crash diagnostics.

### Residual risk

Attackers still possess compiled code and runtime behavior.

### Performance

Primarily a build/release/diagnostics concern rather than a runtime security protocol.

### Operational risk

Losing split-debug symbols can make production crashes difficult to diagnose.

Confidence: Very high.

---

## Finding 3 — Android R8 and Flutter Dart obfuscation are separate controls

R8 operates on Android-side optimized application code/resources.

Flutter's Dart AOT output has its own obfuscation mechanism.

### Consequence

Do not describe R8/ProGuard rules as Dart obfuscation.

Current AGP 9.3 also changed the recommended optimization DSL, so historical Gradle snippets require version checking.

Confidence: High.

---

## Finding 4 — Symbol stripping should never destroy private diagnostics

Security benefit:

- fewer human-readable clues in distributed native binaries

Not provided:

- encryption
- resistance to serious disassembly

Operational conclusion:

- preserve Flutter split-debug symbols
- Apple dSYMs
- Windows PDBs
- R8 mappings
- relevant native symbols

privately and version them to exact production releases.

Confidence: High.

---

## Finding 5 — `.env` and Dart defines do not protect client secrets

A value supplied at build time and compiled into a distributed client remains a client-visible value.

### Correct role

Use configuration mechanisms for:

- API endpoints
- environment names
- public client identifiers
- restricted public API keys

not confidential backend credentials.

Confidence: Very high.

---

## Finding 6 — Some client API keys are intentionally public

Not every API key discovered in an app is a vulnerability.

Meaningful classification:

1. public identifier
2. restricted client API key
3. publishable client key
4. confidential backend key
5. private signing credential

Only categories intentionally designed as client-visible belong in the application.

Client-visible keys should be restricted, monitored, scoped, and revocable where provider controls support it.

Confidence: High.

---

## Finding 7 — Platform secure storage protects at-rest keys, not a compromised runtime

Android Keystore can prevent export of supported keys and can use secure hardware. Apple Keychain/Secure Enclave provide similar platform-backed protection for appropriate data/key types.

However:

- application code eventually consumes plaintext tokens/data
- a compromised process can sometimes invoke a protected key without extracting it
- storage security is not runtime authorization

Android explicitly documents this distinction for Keystore.

Confidence: Very high.

---

## Finding 8 — StrongBox should not be enabled mechanically

StrongBox:

- stronger hardware separation
- limited availability
- slower
- more constrained

Android specifically states that most applications do not require it.

### Decision

Use for very high-value platform-bound cryptographic identity only when threat model and UX justify it.

Confidence: High.

---

## Finding 9 — Web has no true confidential client storage

Flutter Web runs in a browser-controlled environment.

Browser JavaScript with same-origin execution can generally access browser-managed application data stores unless data is intentionally made inaccessible to JavaScript, such as appropriately configured HttpOnly cookies.

Even then, a compromised browser application can often invoke authenticated operations.

### Conclusion

Do not model Web as a native secure-storage platform.

For high-value Web sessions, backend-for-frontend/token-mediating architectures can reduce exposed token material. Current OAuth browser guidance explicitly addresses malicious same-origin JavaScript.

Confidence: Very high.

---

## Finding 10 — Native Flutter OAuth applications are public clients

RFC 8252 explicitly treats native applications as public OAuth clients.

Therefore a statically shipped OAuth "client secret" cannot be treated as confidential.

PKCE is required.

### Architecture

Use:

- Authorization Code + PKCE
- external user agent
- short-lived tokens
- secure refresh-token handling
- revocation

Confidence: Very high.

---

## Finding 11 — Token theft must be assumed possible

Secure storage substantially raises the cost of at-rest extraction but does not eliminate:

- compromised runtime access
- malware with sufficient privileges
- session theft through unrelated vulnerabilities
- malicious browser script on Web

### Impact reduction

Use:

- short-lived access tokens
- least scopes/audience
- refresh-token rotation or sender constraint
- server revocation
- risk-based step-up

Confidence: High.

---

## Finding 12 — TLS validation is mandatory; pinning is optional

Both Android and Apple provide strong default TLS trust models.

Android currently explicitly says certificate pinning is not recommended as a general application practice because certificate infrastructure changes can brick installed clients.

Apple similarly says pinning is unnecessary in most cases.

### When pinning can help

High-risk private endpoints where:

- reduced CA trust has value
- key ownership/rotation is mature
- backup pins exist
- outage recovery is planned

### Residual risk

Client pinning can still be patched/bypassed on a compromised runtime.

Confidence: Very high.

---

## Finding 13 — Disabling TLS verification is never a legitimate production hardening technique

A permissive TrustManager or trust callback directly enables server impersonation.

Use:

- proper certificates
- development-only CA trust
- Network Security Config
- ATS-compliant endpoints

Confidence: Very high.

---

## Finding 14 — Play Integrity belongs on the backend

Current Play Integrity is designed to help a backend evaluate:

- genuine application identity
- tampering
- device integrity
- account/licensing context
- environment risks

The backend receives and evaluates the verdict.

### Standard requests

Best default for action-bound checks:

- lower latency
- requestHash
- automatic replay mitigation
- on-demand use

### Classic

Higher latency/data/battery.

Use infrequently for exceptional high-value needs.

Confidence: Very high.

---

## Finding 15 — Apple explicitly rejects client self-attestation

Apple's App Attest documentation states the crucial security point:

a compromised application can falsify checks it performs against itself.

Therefore:

- server generates challenge
- app creates attestation/assertion
- server verifies
- server makes access decision.

This is the clearest official validation of the overarching security architecture.

Confidence: Very high.

---

## Finding 16 — Attestation is not a universal device-compromise detector

Apple explicitly notes App Attest cannot definitively identify every compromised operating system.

Play Integrity also returns multiple signals rather than a magical trusted/untrusted bit.

### Correct interpretation

Combine:

- integrity
- authentication
- account behavior
- operation sensitivity
- rate
- transaction history

into server risk.

Confidence: Very high.

---

## Finding 17 — Root/jailbreak/emulator checks are heuristics

They:

- are bypassable
- require maintenance
- can false-positive
- can interfere with enterprise/accessibility/testing users

Use only as supplementary risk.

Do not build payment or authorization correctness around them.

Confidence: High; consistent with OWASP resilience guidance.

---

## Finding 18 — Anti-debugging is primarily friction

Reliable release controls include:

- Android non-debuggable release
- Apple distribution without debug entitlement
- macOS Hardened Runtime
- signed packages

Bespoke anti-debugging can add attacker cost but should not become a security boundary.

Confidence: High.

---

## Finding 19 — Signing and package integrity prove identity/integrity, not secrecy

Android, Apple, and Windows signing ecosystems can make unauthorized modified packages easier to detect/reject.

They do not stop:

- disassembly
- assets inspection
- memory inspection on a compromised runtime

Windows MSIX package-integrity enforcement can block launch of a tampered installed package when configured.

Confidence: Very high.

---

## Finding 20 — App self-checks are patchable

Examples:

- checksum
- package-name check
- certificate comparison
- `isRooted`
- debugger flag

If computed and acted upon only inside the same hostile client, an attacker can patch:

- computation
- expected value
- conditional
- call site

Use them as defense-in-depth/telemetry.

Confidence: Very high.

---

## Finding 21 — A permanent symmetric request-signing secret in a client is structurally weak

Because the client must possess the signing secret, a sufficiently capable attacker can recover or use it.

Better options:

- attested asymmetric client key
- hardware-backed key
- sender-constrained credential
- short-lived server-issued credential

Yet those prove possession more than they prove legitimate application behavior.

Server authorization still applies.

Confidence: High.

---

## Finding 22 — Entitlement must be server/store authoritative

Local premium state can be changed.

Therefore:

- validate purchase/provider state
- maintain backend entitlement
- use client cache only for UX/offline policy

Google recommends secure backend purchase verification for durable entitlement. Apple's historical `verifyReceipt` API is now deprecated in favor of App Store Server APIs/signed transactions.

Confidence: Very high.

---

## Finding 23 — Sensitive algorithms cannot remain truly confidential when executed locally

Obfuscation/encryption can increase extraction effort, but the legitimate client must ultimately execute/decrypt the logic.

For algorithms/models whose secrecy is a primary security requirement, remote execution is the more defensible design.

Confidence: Very high.

---

## Finding 24 — Assets should be assumed extractable

Flutter obfuscation explicitly does not encrypt resources.

Asset encryption with an embedded client decryption key provides mostly reverse-engineering friction.

Confidence: Very high.

---

## Finding 25 — Local databases are never server authority

Database encryption protects confidentiality at rest.

It does not make:

- premium state
- account permissions
- balance
- payment state

trusted.

Backend validation remains mandatory.

Confidence: Very high.

---

## Finding 26 — Android backups require active review

Modern Android Auto Backup includes much application data unless configured otherwise.

Android 12+ uses `dataExtractionRules`; legacy rules remain relevant for older devices, and cloud/D2D behavior differs.

A blanket `allowBackup=false` should not be used as a substitute for reviewing actual data-transfer semantics on supported Android versions.

Confidence: Very high.

---

## Finding 27 — `FLAG_SECURE` has a legitimate but narrow purpose

Android secure-window flags can stop ordinary OS screenshot/non-secure display capture.

They do not stop:

- compromised devices
- external cameras
- every OEM/platform capture path

Useful for sensitive screens, not a complete data-protection strategy.

Confidence: High.

---

## Finding 28 — macOS Hardened Runtime is meaningful platform hardening

Hardened Runtime reduces classes of:

- code injection
- library manipulation
- runtime tampering

but exceptions weaken it.

App Sandbox separately limits resource access/impact.

Neither prevents static inspection of code.

Confidence: High.

---

## Finding 29 — Windows MSIX can add package-integrity enforcement

Signed MSIX packages participate in Windows package trust and can opt into runtime package integrity enforcement that blocks/remediates tampered package content.

Traditional full-trust desktop applications are still not automatically isolated like AppContainer applications.

Confidence: High.

---

## Finding 30 — Linux security is distribution-dependent

Flutter does not define one application sandbox for all Linux releases.

Snap strict confinement provides concrete AppArmor/seccomp/namespaces enforcement.

Classic confinement deliberately removes much of this boundary.

Do not apply Snap guarantees to generic `.deb`/tar/AppImage distribution.

Confidence: Very high.

---

## Finding 31 — Web source-map removal is only friction

With or without maps:

- JS/Wasm is delivered to browser
- runtime can be inspected
- requests can be observed

Source maps increase diagnostic/source readability. Keep them private if public availability is unnecessary.

Confidence: High.

---

## Finding 32 — CORS is not authorization

CORS determines browser access to cross-origin responses.

Non-browser clients are not constrained by browser CORS policy.

Backend authentication/authorization remains necessary.

Confidence: Very high.

---

## Finding 33 — CSP is valuable Web defense-in-depth

A strict CSP can reduce XSS/content injection exposure.

It does not solve:

- compromised allowed script
- API authorization
- secrets shipped in bundle

Confidence: High.

---

## Finding 34 — FFI expands the trusted computing base

FFI/native plugins introduce:

- native memory safety
- dynamic library trust
- platform permissions
- native dependency CVEs

Treat native code as privileged supply-chain surface.

Confidence: High.

---

## Finding 35 — Dependency hardening requires reproducibility and review

Useful controls:

- commit application `pubspec.lock`
- retain exact content-hash resolution
- use lockfile enforcement where current Dart supports it
- monitor advisories
- inspect native portions of plugins
- avoid unnecessary dependencies

Confidence: High.

---

## Finding 36 — Secret scanning must trigger revocation

If a secret was committed, deleting the current file does not invalidate:

- git history
- existing clones
- previous releases
- CI logs
- caches

Rotate/revoke the credential.

Confidence: Very high.

---

## Finding 37 — Deep-link ownership does not replace authorization

Verified Android App Links / Apple Universal Links reduce application-claiming/hijack risks.

They do not make deep-link parameters trusted.

Authorize the destination operation exactly as if invoked normally.

Confidence: High.

---

## Finding 38 — Hardening has measurable operational cost

Examples:

- Play Integrity Classic: seconds-scale assessment and more data/battery than Standard
- certificate pinning: rotation/outage risk
- StrongBox: slower/limited
- App Attest enrollment: remote call and rollout constraints
- local encryption: CPU/I/O cost
- excessive integrity scans: startup/battery cost

Security checks belong near the assets they protect rather than continuously in UI hot paths.

Confidence: Very high.

---

# Obsolete / Deprecated Guidance

## SafetyNet Attestation as new Android integrity architecture

Historical.

Use current Play Integrity architecture for new Google Play integrity work.

## Apple's `verifyReceipt` as the preferred new purchase-validation architecture

Deprecated.

Use App Store Server APIs / Apple-signed StoreKit transaction data.

## Assuming historical AGP/R8 Gradle snippets are current

AGP 9.3 introduced the updated `optimization` DSL in July 2026. Legacy DSL remains supported, so inspect project version before editing.

## Flutter Web `--obfuscate`

Unsupported. Release Web uses minification instead.

## Treating `get-task-allow` as harmless in macOS production

Incorrect for hardened production distribution.

## Universal certificate pinning

Contradicted by current Android/Apple guidance. Both advise against routine pinning.

---

# Official-Documentation Ambiguities / Limits

1. There is no official universal "best anti-debugger detection" for Flutter because local detection is not a durable trust boundary.

2. There is no Flutter-wide secure-storage guarantee. Security depends on the plugin plus underlying platform APIs.

3. Linux does not expose one universal secure-store/sandbox model. Distribution and desktop environment matter.

4. Windows security differs materially between normal full-trust desktop applications and sandboxed/package-specific models.

5. Flutter obfuscation provides symbol renaming but no formal reverse-engineering resistance metric.

6. No platform attestation guarantees that every compromised/rooted/jailbroken system is detected.

7. No official pinning guidance can eliminate the availability/rotation tradeoff.

8. Client-side encrypted assets cannot be made cryptographically confidential from a client that must possess the decryption capability.

---

# Recommended Architecture Conclusions

1. **Remove value before hiding value.**

2. Keep confidential long-term credentials only on trusted systems.

3. Treat all distributed client code as potentially inspectable and patchable.

4. Enable Flutter obfuscation where increased reverse-engineering cost is useful, but preserve symbols.

5. Configure Android R8 according to the actual AGP version; do not confuse it with Dart obfuscation.

6. Use platform signing and package-integrity features.

7. Use platform secure storage for client credentials, understanding runtime compromise limitations.

8. Prefer short-lived, least-privileged credentials.

9. Use OAuth standards rather than custom authentication protocols.

10. Use TLS with ordinary validation; do not disable verification.

11. Add pinning only after explicit threat/operations analysis.

12. Verify Android Play Integrity and Apple App Attest on backend systems.

13. Bind integrity evidence to the actual high-value request.

14. Treat root/jailbreak/emulator/debugger detection as risk signals.

15. Make payment, pricing, entitlement, and authorization server authoritative.

16. Define replay and idempotency controls server-side.

17. Keep Web free of confidential client secrets.

18. Use CSP/secure hosting/server cookies where appropriate for Web.

19. Review Android backup/transfer policy.

20. Apply least privilege to Android components, Apple entitlements, Windows/Linux package access, and native plugins.

21. Treat FFI/native dependencies as part of the privileged trusted computing base.

22. Commit and enforce dependency lockfiles for applications.

23. Scan secrets before release and rotate any real leaked credential.

24. Preserve private diagnostic artifacts.

25. Measure latency, battery, support, and false-positive cost of hardening controls.

26. Always document residual risk.
