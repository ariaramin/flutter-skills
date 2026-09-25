# Research Sources

## Table of contents

- [research_sources.md](#researchsourcesmd)
- [Flutter / Dart Obfuscation](#flutter-dart-obfuscation)
- [Android Hardening](#android-hardening)
- [R8 / Android Optimization](#r8-android-optimization)
- [Google Play Integrity](#google-play-integrity)
- [Android Secure Storage / Crypto](#android-secure-storage-crypto)
- [Apple Security](#apple-security)
- [App Attest / DeviceCheck](#app-attest-devicecheck)
- [Apple Payments](#apple-payments)
- [macOS Security](#macos-security)
- [Windows Security](#windows-security)
- [Linux Security](#linux-security)
- [Authentication / OAuth](#authentication-oauth)
- [Web Security](#web-security)
- [Dependency / Supply Chain Security](#dependency-supply-chain-security)
- [Cryptography](#cryptography)
- [OWASP / Industry Guidance](#owasp-industry-guidance)

---

# research_sources.md

## Research Baseline

### Flutter — Supported deployment platforms

URL: `https://docs.flutter.dev/reference/supported-platforms`

Establishes:

- Flutter 3.44.7 platform-support baseline
- Android, iOS, Windows, macOS, Linux, and Web support

Relevant: release/platform branches.

### Dart documentation

URL: `https://dart.dev/docs`

Establishes:

- Dart documentation baseline 3.12.2

Relevant: Dart language/build behavior.

---

# Flutter / Dart Obfuscation

### Flutter — Obfuscate Dart code

URL: `https://docs.flutter.dev/deployment/obfuscate`

Establishes:

- release-only Dart obfuscation
- `--obfuscate`
- `--split-debug-info`
- supported native targets
- Web unsupported
- symbol backup/symbolication
- obfuscation renames symbols
- does not encrypt resources
- does not prevent reverse engineering
- `runtimeType.toString()` compatibility caveat

Relevant:

- Flutter build
- `flutter symbolize`
- Dart AOT symbol names

Version: Flutter 3.44.7.

### Flutter — Build modes

URL: `https://docs.flutter.dev/testing/build-modes`

Establishes:

- debug/profile/release differences
- debugging/service extensions removed in release
- optimization/minification behavior

Relevant: production release gate.

---

# Android Hardening

### Android — Prepare your app for release / debuggable security

URL: `https://developer.android.com/studio/publish/preparing`

Establishes:

- production release configuration
- signing
- debugging considerations

Relevant: Android release.

### `android:debuggable`

URL: `https://developer.android.com/privacy-and-security/risks/android-debuggable`

Establishes:

- production debugging increases attack exposure
- release should not intentionally be debuggable

Relevant: manifest hardening.

### Android — Exported components

URL: `https://developer.android.com/privacy-and-security/risks/android-exported`

Establishes:

- unnecessary externally accessible Android components can expose operations/data
- component exposure must be deliberate

Relevant:

- Activity
- Service
- BroadcastReceiver
- ContentProvider



### Android — Network Security Configuration

URL: `https://developer.android.com/privacy-and-security/security-config`

Establishes:

- declarative trust
- cleartext policy
- debug trust anchors
- certificate pinning
- certificate transparency options

Relevant: Android transport hardening.

### Android — Security with network protocols

URL: `https://developer.android.com/privacy-and-security/security-ssl`

Establishes:

- never use permissive TrustManager
- platform TLS validation
- certificate pinning generally not recommended
- backup pins/expiration required if pinning is nevertheless used

Relevant: TLS/pinning decision model.

### Android — Security recommendations for backups

URL: `https://developer.android.com/privacy-and-security/risks/backup-best-practices`

Establishes:

- backup of sensitive application data requires deliberate policy
- exclusions
- encryption considerations
- Android-version differences

Relevant: data extraction/backup.

### Android — Auto Backup

URL: `https://developer.android.com/identity/data/autobackup`

Establishes:

- Auto Backup defaults
- backed-up locations
- `fullBackupContent`
- `dataExtractionRules`
- cloud vs device transfer
- Android 16 QPR2 cross-platform transfer additions

Relevant: Android local-data protection.

### Android 12 backup behavior

URL: `https://developer.android.com/about/versions/12/behavior-changes-12`

Establishes:

- D2D behavior
- `dataExtractionRules`
- `allowBackup` limitations for reasoning about all transfer paths
- debuggable ADB backup behavior

Relevant: current backup audit.

---

# R8 / Android Optimization

### Android Gradle Plugin 9.3 release notes

URL: `https://developer.android.com/build/releases/agp-9-3-0-release-notes`

Establishes:

- AGP 9.3 current optimization DSL
- `optimization {}` configuration
- legacy DSL compatibility
- current July 2026 context

Relevant: R8 configuration freshness.

### Enable app optimization with R8

URL: `https://developer.android.com/topic/performance/app-optimization/enable-app-optimization`

Establishes:

- release optimization
- AGP 9.3+ new DSL
- resource/code optimization
- build/debugging tradeoffs

Relevant: Java/Kotlin/DEX shrinking.

### Resource shrinking

URL: `https://developer.android.com/topic/performance/app-optimization/customize-which-resources-to-keep`

Establishes AGP-version-specific resource shrinking behavior.

---

# Google Play Integrity

### Play Integrity overview

URL: `https://developer.android.com/google/play/integrity/overview`

Establishes:

- app integrity
- device integrity
- account/licensing and environment signals
- Standard vs Classic
- latency/data/battery differences
- request binding
- risk-based backend response

Relevant: Android integrity.

### Standard Play Integrity requests

URL: `https://developer.android.com/google/play/integrity/standard`

Establishes:

- provider preparation
- on-demand verdict requests
- `requestHash`
- bind all relevant request values
- backend recomputation
- automatic Standard-request replay protection

Relevant: replay/tampering resistance.

### Integrity verdicts

URL: `https://developer.android.com/google/play/integrity/verdicts`

Establishes:

- backend receives verified verdict
- verify `requestDetails`
- expected package name
- request hash
- timestamp/freshness
- app/device/account/environment data

Relevant: trusted backend verification.

### Play Integrity terms/data safety

URL: `https://developer.android.com/google/play/integrity/terms`

Establishes current data collected/processed and privacy obligations.

Relevant: privacy review.

---

# Android Secure Storage / Crypto

### Android Keystore

URL: `https://developer.android.com/privacy-and-security/keystore`

Establishes:

- non-exportable key material
- hardware-backed keys
- TEE/security-level concepts
- StrongBox
- process compromise can still use a key even if not directly extract it

Relevant:

- local key storage
- key hierarchy



### Android cryptography

URL: `https://developer.android.com/privacy-and-security/cryptography`

Establishes use of platform-supported established cryptography and modern authenticated modes.

Relevant: AES-GCM etc.

### Android — Hardcoded cryptographic secrets

URL: `https://developer.android.com/privacy-and-security/risks/hardcoded-cryptographic-secrets`

Establishes hardcoded encryption keys as a weakness.

Relevant: key management.

---

# Apple Security

### Apple Security

URL: `https://developer.apple.com/security/`

Establishes:

- ATS
- Keychain
- App Attest
- platform security primitives

Relevant: iOS/macOS.

### Apple Security APIs

URL: `https://developer.apple.com/documentation/Security`

Establishes:

- Keychain
- code signing
- App Sandbox
- Hardened Runtime
- secure network links

Relevant: Apple platform hardening.

### Keychain Services

URL: `https://developer.apple.com/documentation/security/keychain-services`

Establishes encrypted storage for small secrets, keys, certificates, credentials.

Relevant: iOS/macOS secure storage.

### App Transport Security

URL: `https://developer.apple.com/documentation/security/preventing-insecure-network-connections`

Establishes:

- ATS default behavior
- TLS/server-trust requirements
- exceptions reduce security

Relevant: iOS/macOS networking.

### `NSAppTransportSecurity`

URL: `https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity`

Establishes:

- ATS configuration
- exceptions
- certificate transparency
- pinning

Relevant: Apple release audit.

### Apple identity pinning

URL: `https://developer.apple.com/news/?id=g9ejcf8y`

Establishes:

- pinning not required in most cases
- deploy only with caution/necessity

Relevant: certificate-pinning decision framework.

### `NSPinnedDomains`

URL: `https://developer.apple.com/documentation/bundleresources/information-property-list/nsapptransportsecurity/nspinneddomains`

Establishes platform-supported certificate/public-key pinning configuration.

Relevant: Apple native pinning.

---

# App Attest / DeviceCheck

### Apple — Establishing your app's integrity

URL: `https://developer.apple.com/documentation/DeviceCheck/establishing-your-app-s-integrity`

Establishes:

- a compromised app cannot reliably verify itself
- App Attest hardware-backed key
- backend attestation verification
- unique challenge
- assertions
- supported-device check
- reinstall implications
- use at sensitive moments

Relevant: iOS/iPadOS/tvOS integrity.

### DeviceCheck

URL: `https://developer.apple.com/documentation/devicecheck`

Establishes:

- complementary device-state/fraud mechanisms
- App Attest
- no single anti-fraud policy eliminates all fraud
- App Attest cannot definitively classify every compromised OS

Relevant: risk scoring.

---

# Apple Payments

### App Store Receipts

URL: `https://developer.apple.com/documentation/AppStoreReceipts`

Establishes:

- receipt API is deprecated
- `verifyReceipt` is deprecated
- use App Store Server API or signed `AppTransaction`/`Transaction` data

Relevant: in-app purchase migration.

### Validating receipts with App Store

URL: `https://developer.apple.com/documentation/StoreKit/validating-receipts-with-the-app-store`

Establishes current migration away from `verifyReceipt`.

Relevant: server-side purchase validation.

---

# macOS Security

### Hardened Runtime

URL: `https://developer.apple.com/documentation/security/hardened-runtime`

Establishes Hardened Runtime and exception entitlements for macOS distribution.

Relevant:

- runtime injection hardening
- notarization

### App Sandbox

URL: `https://developer.apple.com/documentation/security/app-sandbox`

Establishes:

- sandbox containment
- entitlement-based least privilege
- reduced impact of compromise

Relevant: macOS.

---

# Windows Security

### Windows DPAPI `CryptProtectData`

URL: `https://learn.microsoft.com/windows/win32/api/dpapi/nf-dpapi-cryptprotectdata`

Establishes:

- OS data protection
- normally same-user and same-machine protection

Relevant: Windows local credentials.

### Sign an MSIX package

URL: `https://learn.microsoft.com/windows/msix/package/signing-package-overview`

Establishes:

- MSIX signing required
- trusted certificate requirement
- signing enables package-integrity capabilities

Relevant: Windows distribution.

### MSIX Package Integrity Enforcement

URL: `https://learn.microsoft.com/windows/msix/desktop/tamper-protection`

Establishes:

- runtime package-integrity checks
- package remediation/launch blocking when tampering is detected

Relevant: Windows tamper resistance.

---

# Linux Security

### Snap confinement

URL: `https://snapcraft.io/docs/explanation/security/snap-confinement/`

Establishes:

- strict versus classic
- strict isolation
- interface-based access
- AppArmor/seccomp/namespaces

Relevant: Linux packaged Flutter apps.

### Snap security policies

URL: `https://snapcraft.io/docs/explanation/security/security-policies/`

Establishes:

- AppArmor
- seccomp
- cgroups
- traditional permissions
- least-privilege interfaces

Relevant: Linux confinement.

### Classic confinement

URL: `https://snapcraft.io/docs/explanation/security/classic-confinement/`

Establishes classic confinement is intentionally highly permissive and similar to traditional unsandboxed packages.

Relevant: residual risk.

---

# Authentication / OAuth

### RFC 8252 — OAuth 2.0 for Native Apps

URL: `https://www.rfc-editor.org/rfc/rfc8252`

Establishes:

- native apps are public clients
- PKCE required
- external user-agent best practice
- static shared native-app secrets cannot be treated as confidential

Relevant: Flutter mobile/desktop OAuth.

### RFC 9700 — OAuth 2.0 Security Best Current Practice

URL: `https://www.rfc-editor.org/rfc/rfc9700`

Establishes current OAuth security practices, including public-client refresh-token protection and least privilege.

Relevant: token lifecycle.

### RFC 10017 — OAuth 2.0 for Browser-Based Applications

URL: `https://www.rfc-editor.org/rfc/rfc10017`

Establishes current browser-app OAuth threat model, including malicious same-origin JavaScript risks and backend/token-mediating architectures.

Published: July 2026.

Relevant: Flutter Web authentication.

---

# Web Security

### MDN — Content Security Policy

URL: `https://developer.mozilla.org/docs/Web/HTTP/CSP`

Establishes CSP as defense-in-depth against code/content injection.

Relevant: Web hosting.

### MDN — CORS

URL: `https://developer.mozilla.org/docs/Web/HTTP/CORS`

Establishes browser cross-origin access model.

Important conclusion: CORS is not API authentication.

### MDN — Same-origin policy

URL: `https://developer.mozilla.org/docs/Web/Security/Same-origin_policy`

Establishes browser origin boundary.

Relevant: browser storage/DOM trust.

### MDN — Secure cookie configuration

URL: `https://developer.mozilla.org/docs/Web/Security/Practical_implementation_guides/Cookies`

Establishes `Secure`, `HttpOnly`, `SameSite`, Domain/Path guidance.

Relevant: Web sessions.

### MDN — HSTS

URL: `https://developer.mozilla.org/docs/Web/HTTP/Headers/Strict-Transport-Security`

Establishes HTTPS downgrade resistance at hosting/server layer.

### Browser WebAssembly debugging

Chrome DevTools documentation.

Establishes WebAssembly modules can be inspected/debugged and source maps can assist developer tooling.

Relevant: "Wasm is not secret."

---

# Dependency / Supply Chain Security

### Dart pub lockfile behavior

URL: `https://dart.dev/tools/pub/glossary#lockfile`

Establishes:

- exact versions
- package content hashes
- application lockfile use

Relevant: reproducible dependency resolution.

### Dart dependency best practices

URL: `https://dart.dev/tools/pub/dependencies`

Establishes dependency resolution/current package-management guidance.

Relevant:

- lockfile
- outdated dependencies
- dependency review

### GitHub secret scanning / push protection

URL: `https://docs.github.com/code-security/secret-scanning`

Establishes repository/provider-supported secret detection and push protection.

Relevant only when repository is hosted on GitHub.

---

# Cryptography

### Android cryptography

URL: `https://developer.android.com/privacy-and-security/cryptography`

Establishes supported cryptographic primitives and Keystore integration.

### Apple CryptoKit

URL: `https://developer.apple.com/documentation/cryptokit`

Establishes modern Apple cryptographic APIs.

Relevant: native Apple integration.

### Dart `Random.secure`

URL: `https://api.dart.dev/dart-math/Random/Random.secure.html`

Establishes cryptographically secure random number generation API.

Relevant: nonces/random secrets.

---

# OWASP / Industry Guidance

### OWASP MASVS

URL: `https://mas.owasp.org/MASVS/`

Establishes mobile application security categories:

- storage
- crypto
- auth
- network
- platform
- code
- resilience
- privacy

Relevant: secondary industry validation.

### OWASP MASVS Resilience

URL: `https://mas.owasp.org/MASVS/11-MASVS-RESILIENCE/`

Establishes:

- obfuscation
- anti-debugging
- tamper resistance
- root/jailbreak techniques

as resilience/attacker-cost controls rather than replacements for sound architecture.

---
