# Hardening Guide — Full Research

## Table of contents

- [Flutter Application Hardening & Reverse-Engineering Resistance](#flutter-application-hardening-reverse-engineering-resistance)
- [Security Reality](#security-reality)
- [Security Boundaries](#security-boundaries)
- [Threat Modeling Workflow](#threat-modeling-workflow)
- [Attacker Classes](#attacker-classes)
- [Repository Security Audit](#repository-security-audit)
- [Secret Management](#secret-management)
- [API Key Classification](#api-key-classification)
- [Flutter Obfuscation](#flutter-obfuscation)
- [Android R8 and Shrinking](#android-r8-and-shrinking)
- [Native Symbol Handling](#native-symbol-handling)
- [Release Build Security](#release-build-security)
- [Secure Local Storage](#secure-local-storage)
- [Local Data Protection](#local-data-protection)
- [Cryptography](#cryptography)
- [Authentication](#authentication)
- [Token Security](#token-security)
- [Network Security](#network-security)
- [Android Network Security](#android-network-security)
- [Apple Network Security](#apple-network-security)
- [Certificate Pinning Decision Framework](#certificate-pinning-decision-framework)
- [Android Play Integrity](#android-play-integrity)
- [Apple App Attest](#apple-app-attest)
- [Root, Jailbreak, and Emulator Detection](#root-jailbreak-and-emulator-detection)
- [Debugger and Dynamic Instrumentation Resistance](#debugger-and-dynamic-instrumentation-resistance)
- [Runtime Tampering](#runtime-tampering)
- [App Signing and Repackaging](#app-signing-and-repackaging)
- [Tamper and Repackaging Resistance](#tamper-and-repackaging-resistance)
- [Replay Protection](#replay-protection)
- [Request Signing](#request-signing)
- [Backend API Protection](#backend-api-protection)
- [Entitlement Security](#entitlement-security)
- [Payment and In-App Purchase Security](#payment-and-in-app-purchase-security)
- [Sensitive Business Logic](#sensitive-business-logic)
- [Asset Protection](#asset-protection)
- [ML Model Protection](#ml-model-protection)
- [Database and Preference Security](#database-and-preference-security)
- [Sensitive Caches](#sensitive-caches)
- [Secrets in Process Memory](#secrets-in-process-memory)
- [Logging Security](#logging-security)
- [Crash Reporting Security](#crash-reporting-security)
- [Android Hardening](#android-hardening)
- [Android Backup and Data Extraction](#android-backup-and-data-extraction)
- [Android Screenshot Protection](#android-screenshot-protection)
- [Android Deep Links](#android-deep-links)
- [iOS Hardening](#ios-hardening)
- [iOS Screenshot / Recording Handling](#ios-screenshot-recording-handling)
- [macOS Hardening](#macos-hardening)
- [Windows Hardening](#windows-hardening)
- [Linux Hardening](#linux-hardening)
- [Web Hardening](#web-hardening)
- [Feature Flags](#feature-flags)
- [FFI and Native Plugin Security](#ffi-and-native-plugin-security)
- [Dependency Security](#dependency-security)
- [Static Secret Scanning](#static-secret-scanning)
- [Deep Links and External Inputs](#deep-links-and-external-inputs)
- [Clipboard](#clipboard)
- [Accessibility](#accessibility)
- [Tamper Telemetry](#tamper-telemetry)
- [Risk Scoring](#risk-scoring)
- [Fail-Secure vs Fail-Open](#fail-secure-vs-fail-open)
- [Offline Security](#offline-security)
- [Security Performance](#security-performance)
- [Startup Hardening](#startup-hardening)
- [Key Rotation](#key-rotation)
- [Revocation](#revocation)
- [Compromised Version Response](#compromised-version-response)
- [Security Headers and Hosting Cooperation](#security-headers-and-hosting-cooperation)
- [Security Anti-Patterns](#security-anti-patterns)
- [Security Architecture Scenarios](#security-architecture-scenarios)
- [Security Testing](#security-testing)
- [Penetration-Test Readiness](#penetration-test-readiness)
- [Release Security Gate](#release-security-gate)
- [Production Definition of Done](#production-definition-of-done)

---

# Flutter Application Hardening & Reverse-Engineering Resistance

## Purpose

Use this skill when hardening, reviewing, releasing, or modifying a Flutter application where reverse engineering, secret exposure, tampering, repackaging, credential theft, API abuse, local-data exposure, or runtime manipulation is relevant.

This skill helps an AI coding agent:

- reduce useful information exposed through compiled applications
- remove confidential secrets from client builds
- apply Flutter obfuscation correctly
- preserve crash and stack-trace diagnosability
- harden release builds
- protect locally stored credentials and sensitive data
- enforce secure transport
- use platform signing, integrity, and attestation mechanisms correctly
- make repackaging and tampering more expensive
- protect APIs through trusted backend enforcement
- design secure authentication and token lifecycles
- harden Android, Apple, Windows, Linux, and Web deployments
- audit dependencies, native plugins, and FFI code
- avoid security theater and brittle anti-debugging techniques
- explain residual risk for every important client-side control

Current research baseline:

- Flutter documentation: **3.44.7**
- Dart documentation: **3.12.2**
- officially supported Flutter deployment families: Android, iOS, Windows, macOS, Linux, and Web.

Re-check current platform and Flutter documentation before applying version-sensitive hardening to materially different SDK versions.

---

# Security Reality

## The client is not a trusted security boundary

A distributed Flutter application cannot be made impossible to reverse engineer.

Assume a sufficiently capable attacker can eventually inspect or manipulate:

- executable code
- Dart AOT code
- Java/Kotlin/Swift/Objective-C/C/C++ code
- JavaScript
- WebAssembly
- string constants
- API URLs
- configuration
- bundled assets
- local databases
- cached responses
- process memory
- client-side flags
- integrity-checking code
- local feature state

Flutter's own obfuscation documentation explicitly warns that obfuscation only changes symbols: it does not encrypt resources and does not prevent reverse engineering. Web does not support Flutter's Dart obfuscation mechanism at all.

Therefore:

> **Client hardening raises attacker cost. Backend authorization establishes security.**

Never claim that an application is:

- unhackable
- impossible to decompile
- impossible to tamper with
- protected because its code is obfuscated
- secure because its strings are encoded
- secure because root detection exists
- secure because certificate pinning exists

For every client-side control, explain what remains possible after an attacker patches or instruments the application.

---

# Security Boundaries

## Never trust the client as the authority for

- authorization
- data ownership
- administrative privileges
- premium entitlement truth
- subscription ownership
- purchase completion
- product price
- discounts
- account balances
- irreversible financial operations
- anti-fraud conclusions
- rate limits
- privileged business rules
- server resource quotas
- permanent request-signing identity
- security policy itself

The backend must independently validate these properties.

## Client-side controls can legitimately help

- increase static-analysis cost
- remove obvious symbol information
- reduce accidental disclosure
- protect data at rest against ordinary extraction
- make token theft harder
- protect non-exportable cryptographic keys
- make package modification detectable
- make legitimate-app identity attestable
- reduce network interception exposure
- reduce repackaging abuse
- detect suspicious environments
- collect risk signals
- hide sensitive UI from ordinary OS screenshot mechanisms where supported
- contain compromise through platform sandboxing
- increase cost of runtime manipulation

Do not confuse **resistance** with **authority**.

---

# Threat Modeling Workflow

Before adding any hardening mechanism, write down:

1. **Asset** — What has value?
2. **Attacker** — Casual, intermediate, or advanced?
3. **Attack path** — Static extraction, proxy, runtime instrumentation, local data manipulation, repackaging, API emulation, etc.
4. **Impact** — Privacy breach, fraud, IP loss, entitlement abuse, credential theft, account takeover, service cost.
5. **Trust boundary** — Which system can actually make the decision?
6. **Existing control** — What already prevents or detects the attack?
7. **Proposed control** — What security property does it add?
8. **Bypass/residual risk** — What remains possible?
9. **Operational cost** — Rotation, support, false positives, outages.
10. **Performance cost** — Startup, network latency, CPU, battery.

Do not add defenses merely because they appear on a mobile-hardening checklist.

---

# Attacker Classes

## Casual attacker

Assume the attacker can:

- unpack application archives
- inspect assets
- search strings
- inspect browser source
- proxy network traffic
- edit simple local state
- run common binary-inspection tools

Obfuscation, release mode, asset minimization, and secure storage provide useful friction here.

## Intermediate attacker

Assume knowledge of:

- APK/IPA/app-bundle structure
- Java/Kotlin/native disassembly
- runtime proxies
- repackaging/signing
- local database modification
- emulators
- rooted/jailbroken devices
- runtime instrumentation

Client-side boolean checks should no longer be considered trustworthy.

## Advanced attacker

Assume the attacker can:

- patch application code
- patch integrity-checking branches
- instrument native and Dart execution
- inspect process memory
- replace client behavior entirely
- replay or emulate legitimate network protocols
- automate APIs without using your UI

Against this attacker, meaningful protection comes primarily from:

- server authorization
- server validation
- platform/device attestation
- short-lived credentials
- platform-bound asymmetric keys
- replay protection
- abuse detection
- rate limits
- revocation
- limiting what valuable material is ever sent to the client

---

# Repository Security Audit

Inspect before editing.

## Flutter/Dart

Inspect:

- Flutter/Dart versions
- `pubspec.yaml`
- `pubspec.lock`
- dependencies and transitive dependencies
- build scripts
- flavors
- `--dart-define` usage
- environment/config files
- generated config
- hardcoded strings
- API URLs
- API keys
- tokens
- signing credentials
- private keys
- analytics/crash SDKs
- logs
- debug menus
- mock servers
- feature switches
- local databases
- caches
- authentication flow
- token storage
- entitlement logic
- payment logic
- deep-link handling
- FFI/native library loading

## Android

Inspect:

- `AndroidManifest.xml`
- build types
- signing config
- `android:debuggable`
- exported Activities
- Services
- BroadcastReceivers
- ContentProviders
- permissions
- network security configuration
- cleartext policy
- backup/data-extraction rules
- FileProviders
- deep/App Links
- Play Integrity integration
- native libraries
- R8 configuration

## iOS

Inspect:

- signing configuration
- entitlements
- `Info.plist`
- ATS exceptions
- Keychain access groups
- associated domains
- URL/deep-link handlers
- App Attest/DeviceCheck
- data-protection options
- debug-only capabilities
- native frameworks

## macOS

Additionally inspect:

- Hardened Runtime
- App Sandbox
- release entitlements
- `get-task-allow`
- library-validation exceptions
- Developer ID/App Store signing
- notarization

## Windows

Inspect:

- MSIX/package identity
- code signing
- package-integrity configuration
- credential/storage APIs
- filesystem permissions
- dynamic-library loading
- native plugins

## Linux

Inspect:

- package/distribution mechanism
- file permissions
- secrets storage backend
- native library loading
- package sandbox/confinement
- Snap interfaces when applicable

## Web

Inspect:

- generated Web output
- public assets
- configuration
- source-map deployment
- hosting headers
- CSP
- HTTPS/HSTS
- cookies
- localStorage
- IndexedDB
- service-worker caches
- CORS expectations
- JS/DOM interop
- HTML views
- authentication architecture
- exposed backend tokens

---

# Secret Management

## Absolute rule

**Never ship long-term confidential backend secrets in a Flutter client.**

This includes:

- backend API secrets
- service-account private keys
- database administrator credentials
- cloud administrator tokens
- payment-provider secret keys
- JWT/server signing private keys
- HMAC master keys
- private backend certificates
- long-lived privileged bearer tokens

If it must remain confidential from the application user, it does not belong in the client.

## Configuration is not secret storage

The following do not turn a secret into a client-safe secret:

- `.env` files
- build flavors
- `--dart-define`
- source-generation wrappers
- Base64
- XOR
- string reversal
- string splitting
- multiple constants recombined at runtime
- moving the value into native code
- encrypting it with another key embedded in the same application

Flutter/Dart compile-time environment declarations are configuration inputs. Flutter's own obfuscation documentation separately warns against storing secrets inside applications.

### Correct architecture

Prefer:

```text
Flutter client
    |
    | authenticated request
    v
Trusted backend
    |
    | secret is used here
    v
Third-party privileged API
```

or:

```text
Flutter client
    |
    | authenticated/attested request
    v
Backend
    |
    | returns scoped, short-lived credential
    v
Client uses only delegated capability
```

---

# API Key Classification

Before removing an apparent key, determine its security model.

## Public client identifier

Examples include OAuth client identifiers intended for distributed applications.

Property:

- identifies application/client
- not confidential
- still should not grant privileged authority by itself

## Restricted client API key

Some providers intentionally require a client-visible API key.

If allowed by that provider:

- restrict it to required APIs
- restrict Android key by expected package/signing identity where supported
- restrict Apple key by bundle/application identity where supported
- restrict Web key by appropriate site/origin mechanism
- monitor usage
- assign quotas
- keep client and server keys separate
- support rotation

Restriction reduces abuse. It does not transform the key into a confidential secret.

## Publishable key

Payment and similar SDKs often deliberately distinguish publishable/public keys from confidential server keys.

Use only the provider-designated public key client-side.

## Confidential secret

Never ship it.

---

# Flutter Obfuscation

## What it provides

Current Flutter supports Dart obfuscation for these release targets:

- AAR
- APK
- Android App Bundle
- iOS
- iOS framework
- IPA
- Linux
- macOS
- macOS framework
- Windows

It renames Dart symbols, making casual interpretation of compiled Dart code harder. It works only for release builds.

## Build pattern

Use the target appropriate to the repository, for example:

```bash
flutter build appbundle \
  --release \
  --obfuscate \
  --split-debug-info=artifacts/symbols/android
```

For iOS/macOS/Windows/Linux use the corresponding supported target.

## Preserve symbols

The symbol artifacts generated by `--split-debug-info` are security-sensitive operational artifacts but are also essential for crash symbolication.

Archive them:

- per release
- per platform/architecture
- with immutable release identifiers
- in restricted storage
- backed up
- accessible to incident/crash tooling

Use `flutter symbolize` with the exact matching symbol file when symbolication is required. Flutter explicitly tells developers to back up these files.

Never solve code exposure by deleting the only diagnostics needed to investigate production crashes.

## What Dart obfuscation does NOT provide

Do not claim that it:

- encrypts code
- encrypts assets
- encrypts string values
- securely hides API URLs
- securely stores API secrets
- protects native plugin symbols
- prevents dynamic analysis
- prevents runtime hooking
- prevents patching
- prevents determined reverse engineering

Flutter explicitly states that obfuscation does not encrypt resources or prevent reverse engineering.

## Web

Flutter's Dart obfuscation mechanism is unsupported on Web. Release Web builds are minified instead.

Minification is not a confidentiality boundary.

JavaScript and WebAssembly delivered to a browser must be considered inspectable.

## Obfuscation compatibility audit

Before enabling it, search for code that depends on stringified Dart symbols, such as:

```dart
runtimeType.toString()
```

Flutter documents that code depending on exact class/function/library names can break after obfuscation. Enum names are currently not obfuscated, which should not be treated as a security guarantee for future versions.

---

# Android R8 and Shrinking

R8 optimizes Android Java/Kotlin/DEX resources and code. It does not replace Flutter's Dart obfuscator.

Flutter Dart code is compiled separately; therefore:

> **R8 hardens the Android JVM/native integration layer. Flutter `--obfuscate` affects Dart symbols.**

Do not claim that a ProGuard/R8 configuration automatically obfuscates Flutter Dart business logic.

Current AGP 9.3 introduced an updated:

```text
optimization { enable = true }
```

DSL that enables code and optimized resource processing together. Legacy configuration remains supported, so inspect the repository's AGP version before modifying Gradle files.

## R8 rules

- keep only what reflection/JNI/framework semantics require
- investigate warnings instead of adding blanket `-keep class **`
- verify release behavior with tests
- preserve matching mapping/diagnostic artifacts required by crash tooling
- do not disable optimization/obfuscation globally merely to silence a plugin issue

Avoid cargo-cult ProGuard rule sets copied from unrelated applications.

---

# Native Symbol Handling

Dart split-debug symbols and platform-native debug symbols are different artifacts.

Preserve all symbols needed to diagnose the exact production binary.

Examples:

- Apple: dSYM
- Windows: PDB
- Android JVM layer: R8 mapping
- Linux/native Android native-code debug artifacts where generated by the release toolchain
- Flutter: `--split-debug-info` symbol files

Apple documents that dSYMs are build-specific and matched by UUID; Microsoft likewise uses exact binary/PDB matching for reliable symbols.

Stripping symbols raises analysis cost but is not encryption.

Never sacrifice incident response merely to remove symbols from the distributed binary.

---

# Release Build Security

Production distributions must use release configuration.

Flutter release mode:

- disables assertions
- removes debugging support
- disables service extensions
- optimizes code
- strips debugging information from the application where appropriate.

Release mode alone does not:

- remove hardcoded secrets
- provide authorization
- encrypt assets
- prevent runtime compromise

## Release audit

Verify that production does not include:

- debug menus
- bypass authentication switches
- internal admin pages
- staging credentials
- local mock servers
- test purchase success paths
- debug certificate authorities
- insecure TLS overrides
- verbose request/response logging
- debugger-only permissions
- developer-only native entitlements

---

# Secure Local Storage

Secure storage protects against some storage-at-rest attacks. It does not make a credential safe against a fully compromised process.

## Android

Use Android Keystore-backed cryptographic keys for valuable local key material where appropriate.

Android Keystore can keep key material non-exportable and can use hardware-backed implementations. However, Android explicitly distinguishes **extracting** a key from **using** a key: an attacker who controls the application process may be able to request cryptographic operations even when the underlying key cannot be exported.

### StrongBox

StrongBox provides stronger hardware isolation on supported devices but has:

- performance cost
- more limited resources
- limited hardware availability

Android documentation states that most applications do not require StrongBox. Use it only when the threat model justifies the added assurance and operational cost.

## iOS/macOS

Use Keychain for small secrets, credentials, keys, and certificates.

Apple describes Keychain as encrypted secure storage for small secret data.

Use Secure Enclave-backed keys when:

- the algorithm/use case is supported
- non-exportability materially improves the threat model
- application/device compatibility is understood

Secure Enclave protects private-key material from direct application access, but a compromised application may still be able to ask the legitimate key to perform permitted operations. It is a stronger key boundary, not an authorization oracle.

## Windows

For native Windows applications, prefer Windows-provided data-protection/credential mechanisms rather than application-hardcoded encryption keys.

DPAPI `CryptProtectData` normally ties protected data to the same Windows user and computer.

Validate the exact storage semantics of the Flutter plugin used to expose Windows credential protection.

## Linux

There is no single Flutter-level Linux secure-storage guarantee.

Prefer the desktop's supported secret-service/keyring mechanism where available. If distributing through a sandboxed package format, also use the package system's least-privilege controls.

Define a fallback policy for environments where an appropriate secret service is unavailable.

Do not silently fall back to plaintext without an explicit product/security decision.

## Web

Do not treat:

- localStorage
- sessionStorage
- IndexedDB
- service-worker Cache Storage

as confidential storage against a hostile same-origin script, browser inspection, or compromised browser environment.

If using cookie-based browser sessions, server-set `Secure`, `HttpOnly`, and appropriate `SameSite` cookies can reduce JavaScript token exposure, but cookie/CSRF/session architecture must be designed server-side.

For high-value browser OAuth applications, consider a Backend-for-Frontend/token-mediating architecture instead of placing long-lived tokens in browser-accessible storage. Current OAuth browser-app guidance explicitly recognizes malicious same-origin JavaScript as a token threat.

---

# Local Data Protection

Classify data before encrypting it.

## Public/reconstructible

Examples:

- public catalog data
- public images
- reconstructible caches

Encryption may have little value.

## Private but locally needed

Examples:

- private documents
- messages
- health data
- offline business data

Evaluate encrypted-at-rest storage.

## Authentication/session secrets

Use platform secure storage rather than ordinary preferences/files.

## Encryption architecture

Prefer:

```text
protected platform key
        |
        v
wraps / derives access to
        |
        v
data-encryption key
        |
        v
encrypted local database/files
```

Do not use:

```text
const key = 'secret-key-inside-app';
```

for meaningful local protection.

Android specifically identifies hardcoded cryptographic keys as a security weakness.

---

# Cryptography

## Rules

- never invent a cipher
- never invent a MAC
- never invent a password hashing construction
- never invent a request-signing protocol
- use established platform or reviewed cryptographic libraries
- use cryptographically secure random generation for security-sensitive randomness
- use authenticated encryption when confidentiality and integrity are both required
- follow the chosen algorithm's nonce/IV requirements
- separate encryption keys by purpose
- define key rotation
- authenticate ciphertext before trusting decoded content

Established authenticated encryption schemes such as AES-GCM or ChaCha20-Poly1305 are preferable to encryption without integrity when supported by the selected trusted library/platform. Android and Apple both provide supported modern cryptographic primitives.

Dart provides `Random.secure()` for cryptographically secure random values where its platform implementation supports it; ordinary pseudo-random APIs are not security RNGs.

---

# Authentication

For OAuth/OIDC native Flutter applications:

- treat the app as a **public client**
- use Authorization Code flow with PKCE
- use an external user-agent/system browser for OAuth authorization where protocol/provider guidance requires it
- never treat a statically embedded OAuth client secret as confidential
- validate state/nonce/protocol values
- use provider-supported redirect mechanisms

RFC 8252 explicitly classifies distributed native applications as public clients and requires PKCE; static shared secrets in such clients cannot be treated as confidential.

Never implement privileged password/authorization truth purely in Flutter local code.

---

# Token Security

## Access tokens

Prefer:

- short lifetime
- minimal scopes
- minimal audience
- least privilege

## Refresh tokens

For public clients, use the authorization server's supported defenses, including rotation/replay detection or sender-constrained approaches where available. Current OAuth security guidance requires stronger handling for public-client refresh tokens.

## Storage

Use platform-protected storage on native platforms when persistent refresh credentials are required.

## Revocation

Support server-side:

- logout/session revocation
- device/session revocation
- stolen refresh-token response
- compromised-version response

## Never log

- bearer tokens
- refresh tokens
- Authorization headers
- password credentials
- session cookies

## URLs

Avoid placing bearer credentials in URLs because URLs can leak through:

- analytics
- logs
- histories
- referrers
- diagnostics

unless a protocol explicitly requires a particular mechanism and its threat model has been reviewed.

---

# Network Security

## Baseline

Production traffic carrying authentication or private data must use TLS.

Never:

- globally trust every certificate
- disable hostname verification
- return `true` from every certificate callback
- ship permissive debug trust managers
- downgrade to HTTP to "fix" certificate errors

Android explicitly warns against no-op `TrustManager` implementations because they allow attackers to impersonate servers.

---

# Android Network Security

Use Android Network Security Configuration for native Android transport policy where applicable.

Review:

- cleartext traffic
- trust anchors
- debug-only certificate authorities
- certificate transparency if appropriate/current
- pinning only when justified

Modern Android defaults increasingly restrict cleartext for appropriately targeted apps, but do not depend on a global manifest default without inspecting the actual network stack. Some low-level networking paths can bypass higher-level policy assumptions.

Use debug-only trust configuration rather than disabling TLS verification in production.

---

# Apple Network Security

App Transport Security applies secure defaults to supported URL Loading System networking, including HTTPS/TLS and server trust requirements. Apple recommends improving server security rather than broadly weakening ATS.

Audit for:

- `NSAllowsArbitraryLoads`
- broad exception domains
- Web content exceptions
- manual trust callbacks
- third-party/lower-level network stacks that may not receive normal ATS enforcement

Avoid broad ATS exceptions unless there is a documented, narrowly scoped requirement.

---

# Certificate Pinning Decision Framework

**Default: do not add pinning automatically.**

Android explicitly states that certificate pinning is not recommended for Android applications because certificate/CA changes can break installed clients. Apple similarly says pinning is unnecessary in most applications and should be used cautiously.

Evaluate pinning only when all are true:

- threat model specifically benefits from reducing trust in the public CA ecosystem
- the endpoint is high value
- operational ownership of certificates/keys is mature
- backup pins/keys exist
- rotation is tested
- stale client versions are considered
- failure behavior is acceptable
- monitoring exists

If pinning is used:

- keep ordinary certificate/hostname validation
- pin stable public-key identities/SPKI where platform guidance supports it
- provision backup pins
- stage rotations before removing old pins
- test expiry/rotation/disaster scenarios
- document a recovery path
- do not execute custom pin checks continuously in UI hot paths

Apple ATS supports SPKI-based pinned identities for configured domains. Android Network Security Configuration also supports pin sets and recommends backup pins when pinning is used.

## Residual risk

Pinning:

- can reduce some MITM opportunities
- does not protect against a compromised backend
- does not protect stolen application tokens
- can be patched out of a compromised client
- can be bypassed by sufficiently capable runtime manipulation
- can cause an outage if rotation fails

Backend authorization must not depend on pinning.

## Web

Application JavaScript does not control browser certificate trust like a native TLS stack.

Use:

- HTTPS
- secure hosting
- HSTS at the server
- normal browser certificate validation

Do not design a Flutter Web "certificate pinning" scheme in JavaScript as if it were equivalent to native certificate validation.

---

# Android Play Integrity

Prefer current Play Integrity signals over bespoke root/emulator booleans when the Google Play ecosystem and threat model support it.

Play Integrity can provide signals concerning:

- recognized application identity
- application tampering
- device integrity
- account/licensing context
- risky application environments
- some emulation or environment risk

Google explicitly describes these as signals your **backend** should use when deciding how to handle an action.

## Standard requests

Prefer Standard requests for ordinary protected actions.

Current guidance describes Standard requests as:

- suitable for on-demand application/server actions
- typically a few hundred milliseconds
- lower data/battery cost than Classic

Bind the verdict to the protected operation using `requestHash`.

Include a digest of all security-relevant request values, then recompute the digest on the backend. Do not put sensitive raw values into the request hash field. Standard requests include automatic replay protections, but the backend must still verify the request details and expected package/request context.

## Classic requests

Reserve Classic requests for exceptional high-value cases where their stronger fresh assessment is specifically justified.

Google documents:

- materially higher latency, often seconds
- higher data use
- higher battery use

Do not invoke Classic Integrity continuously.

## Enforcement workflow

1. client authenticates user/session
2. client constructs high-value request
3. client binds request parameters to integrity request
4. client receives integrity token
5. client sends operation + token to backend
6. backend obtains/verifies decoded verdict
7. backend verifies request details/freshness
8. backend evaluates integrity signals with account/risk context
9. backend allows, steps up, limits, or rejects action

Never:

```text
client:
  if integrityGood:
    grantPremium()
```

as the security authority.

---

# Apple App Attest

Apple explicitly warns that a compromised application can falsify security checks it performs on itself. App Attest therefore requires the application to send attestation/assertions to a trusted server for verification.

## Architecture

1. check `DCAppAttestService` support
2. create App Attest key
3. backend creates unique one-time challenge
4. client hashes challenge/client data
5. Apple attests application key
6. backend validates attestation
7. backend stores key association
8. for sensitive operations, backend creates a new challenge
9. client signs bound request data with assertion
10. backend verifies assertion and business authorization

Apple recommends reserving assertions for sensitive moments rather than mechanically applying them to every request.

## Operational rules

- do not reuse one attestation key across multiple unrelated users
- handle unsupported devices deliberately
- distinguish development and production environments
- keys may need regeneration after reinstall/migration
- phase rollout for large user populations
- combine attestation with authentication and server authorization

## DeviceCheck

DeviceCheck provides complementary per-device fraud state/signals.

It is not the same mechanism as App Attest and should not be presented as a cryptographic replacement for application assertions.

Apple explicitly states that no single policy eliminates all fraud and App Attest does not definitively identify every compromised operating system.

---

# Root, Jailbreak, and Emulator Detection

Treat local detection as a heuristic.

Do not treat:

```text
isRooted == false
```

or:

```text
isEmulator == false
```

as a security guarantee.

Problems include:

- bypassability
- false positives
- custom ROMs
- enterprise/testing environments
- accessibility/security software
- maintenance burden
- platform evolution

For Android, prefer Play Integrity signals where suitable.

For Apple, prefer App Attest/DeviceCheck as supported integrity/fraud inputs rather than equating jailbreak detection with attestation.

Use local root/jailbreak/emulator signals only when they add useful risk context.

Possible response:

- log risk
- reduce high-risk functionality
- require stronger authentication
- require online verification
- deny a very high-risk action

Do not automatically lock every user out unless the explicit threat model justifies that policy.

OWASP's mobile resilience guidance similarly treats anti-tamper/root/anti-debug techniques as resilience controls that increase attacker cost rather than replacement security boundaries.

---

# Debugger and Dynamic Instrumentation Resistance

## Reliable baseline

Use platform release controls:

### Android

- release build
- `android:debuggable=false`
- no debug-only CAs
- no development services

Android warns that shipping debuggable applications increases exposure to runtime inspection.

### Apple

- release signing
- no shipping `get-task-allow`
- proper entitlements
- Hardened Runtime on applicable macOS distribution

Apple's production export workflows normally remove the entitlement allowing debugger task access; shipping it undermines hardened distribution.

### Windows/Linux

- release artifacts
- signing/package confinement where applicable
- no debugging services intentionally shipped
- no permissive development package mode

## Anti-debugging checks

Additional local debugger detection is:

- bypassable
- platform-specific
- maintenance-heavy
- capable of breaking legitimate testing/accessibility/enterprise environments

Do not add undocumented `ptrace`, signal, crash, timing, or anti-hook tricks without an explicit risk assessment and supported platform justification.

The architecture must remain secure when such checks are bypassed.

---

# Runtime Tampering

Assume an advanced attacker can patch a client-side integrity condition.

Therefore use multiple layers:

- signed distribution
- Flutter symbol obfuscation
- native shrinking/stripping
- platform runtime hardening
- platform attestation
- server authorization
- request binding
- short-lived tokens
- telemetry
- abuse controls
- revocation

A local checksum of your own executable can create friction, but because both the check and expected value run client-side, it remains patchable.

Do not make client-computed hashes your sole integrity gate.

---

# App Signing and Repackaging

Signing primarily establishes package/publisher identity and allows platform integrity enforcement. It does not prevent code analysis.

## Android

Use Play App Signing where appropriate.

Keep separate:

- app-signing key
- upload key

Treat signing keys as high-value CI/release secrets.

Use Play Integrity backend verification for high-value genuine-app checks instead of trusting package name alone.

## iOS

Use normal Apple code signing/provisioning.

Verify expected:

- bundle identity
- team identity
- entitlements
- production distribution profile

For server-sensitive operations, App Attest adds stronger instance-level evidence than a client-side bundle-ID test.

## macOS

For appropriate non-App-Store distribution:

- Developer ID signing
- Hardened Runtime
- notarization

For Mac App Store:

- signing
- App Sandbox
- minimum required entitlements

Hardened Runtime is intended to resist classes of code injection and runtime manipulation; exceptions weaken these protections and should be narrowly justified.

## Windows

Prefer signed MSIX when its deployment model fits.

Windows requires MSIX packages to be signed, and package integrity enforcement can verify package contents and block/remediate tampered packages when enabled.

Code signing improves publisher/integrity assurance. It does not conceal the executable.

## Linux

There is no one universal Flutter Linux signing/security model.

Use the security model of the selected distribution mechanism.

For Snap:

- strict confinement uses kernel isolation mechanisms including AppArmor, seccomp, and namespaces
- classic confinement is intentionally substantially more permissive

Request only the interfaces/permissions actually required.

---

# Tamper and Repackaging Resistance

Use layered controls:

```text
signed official package
        +
Dart/native obfuscation/stripping
        +
platform package integrity
        +
app/device attestation where justified
        +
backend authentication
        +
backend authorization
        +
request replay/tamper binding
        +
abuse monitoring
```

Never trust:

- package name alone
- bundle ID alone
- client-side certificate comparison alone
- local `isOriginalApp` boolean alone

Backend responses to invalid integrity should be proportionate to action risk.

---

# Replay Protection

Use protocol-appropriate server-controlled replay protection.

Possible components:

- unique server nonce/challenge
- request binding
- short validity window
- sequence/state where required
- one-time nonce consumption
- idempotency key for mutations
- token rotation/replay detection

Play Integrity Standard provides request binding and replay protection when used as documented. App Attest uses unique server challenges for attestation/assertions.

Do not invent:

```text
SHA256(secret + timestamp + request)
```

with a permanent client secret and call it secure request signing.

---

# Request Signing

Request signing can be useful only if the signing identity actually improves the trust model.

## Weak design

```text
mobile app contains permanent HMAC secret
```

Attacker extracts the shared secret and reproduces signatures independently.

## Stronger patterns where warranted

- hardware/platform-bound asymmetric key
- attested per-install key
- server-issued short-lived credential
- sender-constrained token
- platform-backed client certificate where appropriate

Even then:

> key possession does not prove that the legitimate UI initiated a safe request.

A compromised runtime can sometimes invoke a non-exportable key.

Therefore the backend still validates:

- authenticated user
- action
- authorization
- request values
- replay state
- fraud/risk context

---

# Backend API Protection

For every sensitive endpoint, the backend must independently validate:

- authenticated identity
- authorization
- ownership
- expected resource state
- permitted transition
- price/product identity
- entitlement
- request limits
- replay/idempotency
- relevant integrity/attestation evidence
- abuse/risk policy

## Apply

- rate limiting
- quotas
- anomaly detection
- bot/automation controls
- credential-stuffing protection
- account lock/step-up policies
- token revocation
- request deduplication/idempotency

Flutter UI state is not an API security control.

---

# Entitlement Security

Never make:

```dart
bool isPremium = true;
```

or an editable local preference the authority for paid access.

Preferred model:

```text
Store/provider purchase
        |
        v
trusted server/provider validation
        |
        v
backend entitlement record
        |
        v
client receives current entitlement
```

A locally cached entitlement can improve offline UX, but it needs:

- signed/trusted origin
- expiration
- explicit offline grace period
- revocation-delay policy
- synchronization after reconnect

Server-controlled content should continue to enforce entitlement even if a modified client enables hidden UI.

---

# Payment and In-App Purchase Security

## General payment rule

Never trust:

- amount calculated by client
- currency selected by client
- product price copied from UI
- client boolean saying "payment succeeded"

Backend/provider must validate authoritative payment state.

## Google Play

Google Play guidance recommends moving sensitive purchase logic to a secure backend and verifying purchases before granting durable entitlement.

## Apple

Apple's historical `verifyReceipt` endpoint is now deprecated. Current Apple guidance directs server validation toward App Store Server APIs and Apple-signed transaction/subscription data.

Do not create a new architecture around deprecated receipt endpoints.

---

# Sensitive Business Logic

Ask:

> Does this logic need to be **executed locally**, or does it need to be **kept secret**?

If secrecy is essential, do not ship the full algorithm to the client.

Options:

- execute sensitive policy server-side
- split local presentation from server validation
- deliver server-controlled signed policy/configuration
- expose only minimum required transformation
- use remote inference for high-value proprietary models

Obfuscation can raise reverse-engineering cost. It cannot convert client-side code into a server-side secret.

---

# Asset Protection

Assume shipped Flutter assets are extractable.

Examples:

- images
- fonts
- JSON
- configuration
- SQLite seed databases
- media
- ML models
- rules
- certificates
- public keys

Flutter's asset system deliberately bundles declared assets with the application for runtime access. Obfuscation does not encrypt them.

## Asset encryption

Asset encryption can deter casual extraction when:

- key provisioning comes from a stronger source
- decrypted lifetime is minimized
- access is authorized online
- key revocation is possible

It offers limited IP protection if:

```text
encrypted_asset + decryption_key
```

are both permanently shipped inside the same client.

The attacker can instrument the legitimate decryption path.

---

# ML Model Protection

Assume an on-device model can ultimately be extracted or reconstructed by a capable attacker.

Use on-device inference when priorities such as:

- latency
- offline operation
- privacy
- device computation cost

outweigh model secrecy concerns.

If model confidentiality is a critical business requirement, consider server inference or a split architecture.

Obfuscating/encrypting the model increases extraction cost but is not a secrecy guarantee.

---

# Database and Preference Security

## Ordinary preferences

Do not store:

- refresh tokens
- encryption master keys
- passwords
- service secrets

in ordinary preference storage merely because it is convenient.

## Databases

If local data is sensitive:

- evaluate database/file encryption
- protect key material using platform storage
- exclude sensitive files from inappropriate backups
- clear account-scoped data on logout/account switch
- validate local data before use

Local database rows are never authoritative for backend security.

An attacker changing:

```text
premium = 0 -> 1
```

must not obtain server premium content.

---

# Sensitive Caches

Define a policy for:

- authentication responses
- private images
- documents
- API bodies
- user-profile data
- search data
- Web service-worker caches

Specify:

- memory only vs disk
- encryption
- expiration
- account scoping
- logout cleanup
- account-switch cleanup
- backup inclusion
- OS memory pressure behavior

Never allow account A's cached data to remain readable after switching to account B if the product treats the data as private.

---

# Secrets in Process Memory

Platform secure storage protects data **while stored**, not every subsequent use.

After retrieval, secret material may exist in process memory.

Therefore:

- retrieve only when needed
- minimize copies
- do not convert binary secrets to unnecessary Strings
- do not cache indefinitely
- do not place secrets into application state trees
- do not serialize them into logs/crash metadata

Do not promise "secure strings" in ordinary Dart heap memory unless a specifically verified platform/library primitive provides the required property.

---

# Logging Security

Production logs must not contain:

- passwords
- access tokens
- refresh tokens
- API secrets
- private keys
- Authorization headers
- session cookies
- complete payment credentials
- recovery codes
- personally sensitive request bodies

Android explicitly treats sensitive log output as an information-disclosure risk.

Use:

- identifiers safe for operations
- redaction
- truncated hashes where legitimately useful
- structured error category
- request correlation IDs that are not credentials

Disable verbose HTTP interceptors in production.

---

# Crash Reporting Security

Crash systems often receive:

- stack traces
- breadcrumbs
- route names
- device metadata
- request metadata
- application logs

Before sending:

- redact headers
- redact tokens
- sanitize URLs/query values
- sanitize payloads
- minimize PII
- review custom metadata
- respect privacy requirements

Preserve private symbol files separately rather than shipping unnecessary source/symbol information publicly.

---

# Android Hardening

## Manifest

Review each release manifest.

### `debuggable`

Production must not intentionally ship debuggable unless an extraordinary product requirement exists.

### Exported components

Audit every:

- Activity
- Service
- BroadcastReceiver
- ContentProvider

Set external exposure only when required.

For exposed entry points:

- validate every input
- authenticate/authorize privileged operations
- use signature/permission protections where appropriate
- do not assume "only our app will invoke this Intent"

Android warns that unnecessary component export can expose application behavior/data to other applications.

### Permissions

Use least privilege.

Remove permissions not used by current production code.

Do not preserve a dangerous permission because an abandoned dependency once requested it.

### Cleartext

Restrict unnecessary cleartext network traffic.

### FileProvider

Use narrow paths and expected grants. Never expose a broad filesystem root merely to fix a sharing problem.

---

# Android Backup and Data Extraction

Android Auto Backup can include most application data by default.

Explicitly decide what may be:

- cloud backed up
- device-to-device transferred
- cross-platform transferred where current platform support applies

For current Android:

- Android 12+ uses `android:dataExtractionRules` for the newer backup/transfer configuration
- Android 11 and lower still require the older backup-rule configuration when those versions are supported
- `allowBackup=false` is not sufficient to reason about every modern device-transfer behavior.

Exclude or specially protect:

- long-lived authentication secrets
- private keys
- device-binding data that must not migrate
- sensitive databases
- high-value cached data

Test backup **and restore**.

---

# Android Screenshot Protection

For highly sensitive screens, Android `FLAG_SECURE` can stop ordinary screenshots and display on non-secure displays.

Use it selectively for:

- secret recovery data
- financial details
- protected documents

Do not call it complete exfiltration prevention.

A compromised/rooted runtime or external camera remains outside this control's guarantee.

---

# Android Deep Links

Prefer verified App Links for HTTPS application links where appropriate.

Verified association helps prevent another application from claiming links for a domain, but it does not validate:

- user authorization
- resource ownership
- query parameters
- business intent

Every deep-linked action still passes normal input validation and authorization.

---

# iOS Hardening

## Code signing

Use standard App Store/distribution signing.

Keep private signing material out of source control.

## Keychain

Store persistent small credentials through Keychain rather than ordinary files/preferences.

Use access-control policies matching the product's UX/security requirements.

## App Attest

Use for server-sensitive operations where application integrity materially affects fraud/risk.

## ATS

Avoid broad ATS exceptions.

## File protection

For sensitive local files, evaluate Apple data-protection classes appropriate to required availability. For example, protected files can be made unavailable while the device is locked where the application can tolerate that behavior.

## Entitlements

Request only required capabilities.

Audit:

- Keychain access groups
- associated domains
- push
- App Groups
- background modes
- iCloud
- network extensions
- camera/microphone/etc.

Entitlements expand capability and should follow least privilege.

---

# iOS Screenshot / Recording Handling

iOS does not provide a general application-level equivalent that guarantees prevention of every screenshot.

Applications can respond to screen-capture state/notifications for sensitive UI, but such detection should be treated as UX/privacy defense-in-depth.

Do not claim it stops a compromised device or an external capture device.

---

# macOS Hardening

Use the distribution model's platform security features.

For Developer ID/notarized distribution:

- sign release code
- enable Hardened Runtime
- notarize
- avoid unnecessary runtime exceptions

For Mac App Store:

- App Sandbox
- least-privilege entitlements
- appropriate signing

Avoid shipping release builds with:

- `get-task-allow`
- disable-library-validation without necessity
- broad filesystem/device/network entitlements without requirement
- unnecessary executable-memory exceptions

Apple documents Hardened Runtime as a key security requirement for notarized macOS software and App Sandbox as containment that limits system/user-data access after application compromise.

---

# Windows Hardening

## Signing

Use trusted production signing for distributed packages/installers.

For MSIX:

- sign package
- use trusted certificate/Store signing
- evaluate package-integrity enforcement

Windows can verify signed MSIX package contents and block/remediate tampered packages when package integrity enforcement is configured.

## Credential data

Prefer Windows-provided per-user data protection rather than hardcoded application keys.

## Native library loading

Do not load DLL names or paths from untrusted input.

Prefer:

- known packaged libraries
- controlled paths
- system safe-search APIs
- explicit verification for downloaded native modules

## Filesystem

Use per-user application directories and least-required ACL exposure.

Do not assume a conventional Win32 desktop process receives AppContainer-style isolation automatically.

---

# Linux Hardening

Flutter itself does not create one universal Linux security sandbox.

Security depends heavily on:

- distribution
- package format
- desktop environment
- filesystem ownership
- sandbox technology

## Secrets

Prefer a supported desktop secret service/keyring rather than plaintext config.

## Packaging

If using Snap, strict confinement provides substantially stronger isolation than classic confinement through AppArmor, seccomp, namespaces, and narrow interfaces.

Use the narrowest interfaces possible.

Do not claim a `.deb`, tarball, AppImage, Flatpak, or Snap has properties belonging to another packaging model.

## Native libraries

Load only trusted libraries from controlled locations.

---

# Web Hardening

## Security reality

A Flutter Web application is delivered to a browser.

Therefore assume users can inspect:

- JavaScript
- WebAssembly
- requests
- public configuration
- assets
- DOM/JS interop
- browser storage
- runtime state

No confidential backend secret belongs in a Flutter Web bundle.

Removing source maps, minifying code, or compiling to Wasm does not change this trust boundary.

## Source maps

Source maps improve diagnostics and can make original-source structure easier to inspect.

Production strategy:

- generate them only when needed
- avoid publicly serving them unless intentionally accepted
- privately upload to error-reporting infrastructure where supported
- protect them as operational artifacts

Removing public source maps raises casual analysis cost but does not prevent reverse engineering. Browser developer tooling can inspect and debug WebAssembly as well.

## CSP

Configure Content Security Policy in the hosting layer.

Prefer a restrictive policy based on actual application resources.

Avoid defaulting to:

- `unsafe-inline`
- `unsafe-eval`
- wildcard script sources

unless current Flutter/plugin requirements force a narrowly documented exception.

CSP is defense-in-depth against script/content injection. It is not authentication.

## CORS

CORS controls whether browser scripts may access cross-origin resources.

It is **not** API authorization.

A server must still authenticate and authorize every sensitive request.

Do not say:

```text
Only our origin is allowed by CORS, therefore the API is protected.
```

Attackers can call APIs outside browser CORS enforcement.

## XSS / interop

Minimize:

- dynamic HTML
- direct DOM insertion
- unsafe JavaScript interop
- untrusted values entering HTML/script sinks

Flutter rendering does not eliminate Web security concerns introduced by:

- hosting HTML
- JS libraries
- plugins
- platform views
- interop

## Cookies

For cookie-session architectures, consider:

- `Secure`
- `HttpOnly`
- suitable `SameSite`
- narrow Domain
- narrow Path
- short session lifetime

along with server-side CSRF/session protections.

## HSTS

Configure HTTPS and HSTS at the Web hosting/server layer.

Flutter application Dart code is not where HSTS is authoritatively configured.

---

# Feature Flags

Feature flags are not authorization.

A modified application can often:

- turn a boolean on
- call hidden navigation directly
- invoke the backing API
- remove a UI gate

Use feature flags for:

- rollout
- UX
- experimentation
- kill switches

Backend permissions still enforce access.

---

# FFI and Native Plugin Security

Treat FFI/native code as high-risk because it can:

- access arbitrary native memory
- introduce memory-safety defects
- load system libraries
- invoke privileged APIs
- bypass Dart safety assumptions

Audit:

- library provenance
- version
- native CVEs/advisories
- binary hashes/provenance
- dynamic-library path
- native permissions
- memory ownership
- unsafe functions
- callbacks
- native networking

Never load a dynamic library from an attacker-controlled path.

When a build downloads a precompiled native artifact, verify integrity/provenance using the supplying ecosystem's supported mechanism.

---

# Dependency Security

## Minimize

Every dependency adds potential:

- Dart code
- native code
- permissions
- network behavior
- transitive dependencies
- supply-chain exposure

Do not add a security package merely because its marketing claims "anti-hacking."

## Lock dependencies

Application repositories should commit `pubspec.lock`.

Dart's package manager records exact resolved versions and package content hashes for locked dependencies. Use lockfile enforcement in CI where supported by the current Dart toolchain.

## Review

Before upgrading or introducing a package:

- check maintenance
- inspect platform implementations
- inspect requested permissions
- inspect native libraries
- review security advisories
- review transitive dependencies
- test behavior

Avoid mass dependency churn during a hardening change without evidence.

---

# Static Secret Scanning

CI should detect known secret formats before release.

Scan:

- Dart
- Android native files
- Apple project files
- Windows/Linux config
- Web config
- test fixtures
- JSON/YAML
- shell scripts
- CI files
- repository history where appropriate

Look for:

- private-key blocks
- cloud credentials
- service-account files
- bearer tokens
- database passwords
- payment secrets
- signing passwords
- production test accounts

Use a reputable repository-provider or dedicated secret-scanning system.

If a real secret is committed:

> **remove it AND rotate/revoke it.**

Deleting a file from the latest commit does not invalidate copies in history, clones, caches, logs, or previous builds.

---

# Deep Links and External Inputs

Treat every external URI as attacker-controlled input.

Validate:

- scheme
- host
- path
- parameter types
- allowed resource IDs
- authentication state
- authorization
- redirect destinations

Do not permit:

```text
myapp://admin/delete?id=...
```

to bypass the same authorization used by the normal application flow.

Prefer verified Android App Links and Apple Universal Links where applicable for HTTPS ownership binding.

---

# Clipboard

Do not automatically place:

- refresh tokens
- private keys
- recovery secrets
- long-lived passwords

onto the system clipboard.

If product requirements require copying a sensitive value:

- make the action explicit
- minimize displayed duration where possible
- warn according to sensitivity
- avoid retaining duplicate copies in logs/state

Clipboard behavior is platform-dependent and not an appropriate secret vault.

---

# Accessibility

Hardening must not unnecessarily block:

- screen readers
- accessibility services
- enterprise device-management scenarios
- legitimate development/test environments

Do not classify every overlay/accessibility capability as malware.

When platform risk APIs distinguish verified accessibility tools from risky control/capture applications, preserve that nuance.

Use risk scoring and step-up controls instead of brittle blanket bans where possible.

---

# Tamper Telemetry

Collect only information useful to security decisions.

Potential signals:

- attestation failure category
- package/app identity mismatch
- impossible request sequencing
- token replay
- repeated integrity failures
- abnormal request volume
- invalid signature
- unsupported/stale application version

Send detailed diagnostic information to the trusted server where appropriate.

Client UI should generally receive a simple product-facing result such as:

```text
Unable to complete this action securely.
```

rather than an exact list of anti-tamper tests that failed.

Do not collect invasive telemetry without privacy/legal review.

---

# Risk Scoring

Weak signals become more useful when combined.

Example server-side risk inputs:

- authentication strength
- session age
- account history
- Play Integrity/App Attest
- impossible geography
- rate anomalies
- credential-reuse indicators
- device history
- payment risk
- request replay
- app version

Avoid:

```text
rooted -> permanently ban
```

as a universal policy.

Prefer:

```text
risk signals
   |
   v
operation risk policy
   |
   +--> allow
   +--> step up auth
   +--> lower limits
   +--> require online verification
   +--> deny high-risk mutation
```

Apple explicitly frames DeviceCheck/App Attest as part of broader fraud-risk assessment rather than a single perfect policy.

---

# Fail-Secure vs Fail-Open

Choose failure behavior based on asset value.

## High-value irreversible action

Examples:

- funds transfer
- password reset
- private-key export
- subscription grant
- sensitive administrative action

If required authentication/integrity evidence cannot be validated:

- fail closed
- or require step-up recovery

## Medium-risk action

Examples:

- viewing moderately sensitive cached data
- nonfinancial account update

Possible strategy:

- degrade capabilities
- require reauthentication
- disable only risky mutations

## Low-risk/public action

Examples:

- public catalog
- public help pages

An unavailable attestation service should not necessarily make the entire application unusable.

Security availability decisions belong in the threat model.

---

# Offline Security

Define exactly what "offline authenticated" means.

For offline operation specify:

- what data is available
- maximum offline duration
- what stale entitlement is accepted
- whether high-risk changes may queue
- how queued mutations are authorized after reconnect
- what happens after server revocation
- how account logout clears offline data

Offline operation inherently delays some server-side revocation/entitlement decisions.

Do not pretend an offline client can instantly know that a server revoked a session.

---

# Security Performance

Hardening must not become a battery or responsiveness bug.

## Avoid continuous checks

Do not:

- hash enormous binaries every frame
- perform remote attestation for every low-risk request
- run root-detection filesystem scans continuously
- run heavy cryptography in build/animation paths

## Play Integrity

Standard Integrity is designed for lower-latency operation and can prepare its token provider before protected actions. Classic requests are materially slower and use more battery/data, so reserve them for infrequent high-value cases.

## App Attest

Attest a key as part of appropriate enrollment/install lifecycle, then use assertions strategically around sensitive operations rather than regenerating keys repeatedly. Apple also advises large applications to phase rollout to avoid attestation service pressure.

## Secure storage

Cache only what does not weaken security.

Avoid prompting biometric/keychain authentication repeatedly in rapid UI loops.

## Measure

Measure:

- startup delay
- protected-request p50/p95 latency
- crypto CPU
- battery/network overhead
- failed-attestation rate
- unsupported-device rate
- false-positive rate

---

# Startup Hardening

Only put security work before the first meaningful frame if the user must not proceed without it.

Good candidates for early startup:

- production environment selection
- minimum critical local configuration
- session availability determination

Possible lazy/operation-scoped work:

- Play Integrity provider warmup
- App Attest enrollment
- remote security-policy refresh
- high-value transaction integrity
- deep forensic checks

Do not block public UI on a multi-second remote integrity assessment if the check only protects a later payment operation.

---

# Key Rotation

Architecture must tolerate replacement of:

- backend API credentials
- client-restricted API keys
- TLS certificates
- pins
- device credentials
- local data-encryption keys
- signing certificates where platform allows
- session keys

Prefer:

- key identifiers
- overlapping validity windows
- versioned key metadata
- backend-controlled rollout
- backup pin/key where required
- telemetry during transition

A hardcoded single pin/key with no update path creates operational fragility.

---

# Revocation

Support server-controlled invalidation for:

- sessions
- refresh tokens
- device credentials
- compromised keys
- high-risk devices
- vulnerable application releases

Client-side logout is not sufficient revocation for a stolen token.

---

# Compromised Version Response

Maintain a backend concept of supported application versions when the risk model requires it.

Possible responses:

- warning
- feature kill switch
- disabling only vulnerable operation
- mandatory reauthentication
- minimum-version enforcement
- forced upgrade for critical vulnerabilities

Do not implement the only version gate as:

```dart
if (version < X) ...
```

because a modified client can patch it.

Backend enforcement is required for security-critical deprecation.

---

# Security Headers and Hosting Cooperation

For Flutter Web, hosting/backend infrastructure is responsible for controls such as:

- HSTS
- CSP response header
- cookie attributes
- CORS
- cache policy
- MIME/content policies
- TLS configuration

Do not create Dart constants that merely describe headers without configuring the actual HTTP response.

---

# Security Anti-Patterns

## Secret in Dart source

**Why it fails:** shipped application contains recoverable value.  
**Correct architecture:** move secret to backend; issue scoped client credential.  
**Residual risk:** public/scoped client keys remain extractable.

## `.env` as secret protection

**Why it fails:** build process eventually embeds value.  
**Correct:** CI secret only for server/build actions, not compiled client value.

## Base64/XOR/string splitting

**Why it fails:** decoder/reconstruction must ship with data.  
**Correct:** remove secret from client.

## Obfuscation as encryption

**Why it fails:** Flutter says it only renames symbols.  
**Correct:** use it for friction while moving security authority server-side.

## Delete symbol files

**Why it fails:** destroys crash diagnosability, not attacker's copy of distributed binary.  
**Correct:** private immutable symbol archive.

## R8 means Dart is protected

**Why it fails:** R8 operates on Android code/resources, while Flutter's Dart obfuscation is a separate pipeline.  
**Correct:** configure both layers independently when justified.

## Pin every API

**Why it fails:** creates rotation/outage risk; Android/Apple explicitly caution against routine pinning.  
**Correct:** normal TLS by default; pin selectively after threat/operations review.

## Disable TLS validation

**Why it fails:** enables server impersonation.  
**Correct:** correct trust store/certificates/debug-only trust.

## Root detection as authorization

**Why it fails:** bypassable heuristic.  
**Correct:** backend auth + attestation/risk.

## Emulator detection as only gate

**Why it fails:** bypassable and false-positive prone.  
**Correct:** integrity/risk signals and backend rules.

## Client premium boolean

**Why it fails:** local state can be edited/patched.  
**Correct:** trusted backend/store entitlement.

## Client-calculated price

**Why it fails:** modified request can submit arbitrary value.  
**Correct:** backend selects price using trusted product ID.

## Client payment-success boolean

**Why it fails:** attacker patches result.  
**Correct:** provider/backend transaction validation.

## Permanent HMAC request secret in app

**Why it fails:** attacker can recover and reproduce signing.  
**Correct:** attested/platform-bound asymmetric identity or short-lived server-issued credentials where required.

## Encrypt asset + hardcode decryption key

**Why it fails:** both algorithm and key are available to client/runtime.  
**Correct:** acknowledge friction-only protection or provision keys dynamically under authorization.

## CORS as authentication

**Why it fails:** CORS governs browsers, not raw API clients.  
**Correct:** authentication + authorization.

## WebAssembly as secrecy

**Why it fails:** browser receives and can inspect/debug the module.  
**Correct:** server-side confidential logic.

## Remove source maps and call code protected

**Why it fails:** built JS/Wasm is still present.  
**Correct:** treat source-map removal as limited analysis friction.

## Client-side attestation verification

**Why it fails:** compromised client can patch the verifier.  
**Correct:** backend verification. Apple explicitly documents this property.

## Package-name check only

**Why it fails:** local code/value can be modified.  
**Correct:** platform signing/integrity + server validation.

## Feature flag as permission

**Why it fails:** UI flag can be patched.  
**Correct:** backend authorization.

---

# Security Architecture Scenarios

## Small consumer app

Use:

- release mode
- no confidential client secrets
- normal TLS
- secure token storage
- server authorization
- Flutter obfuscation if IP/friction value justifies it
- dependency/secret scanning

Do not introduce a complex attestation system without a fraud/use case.

## Banking / financial app

Prioritize:

- strong standards-based authentication
- short-lived/scoped tokens
- secure hardware-backed keys where justified
- Android Play Integrity
- Apple App Attest
- backend risk scoring
- transaction-bound challenges
- server-controlled amounts/beneficiaries
- replay defense
- screenshot/privacy controls for sensitive screens where appropriate
- strict logging
- high-quality incident telemetry

Assume local anti-debug checks can be bypassed.

## Subscription application

- trusted backend/store entitlement
- server validation
- local cache only for UX/offline grace
- Play Integrity/App Attest where fraud risk justifies
- obfuscate but do not rely on hidden premium code

## E-commerce

- server owns catalog prices
- server owns discounts
- provider/backend owns payment truth
- client sends product/quantity intent
- backend calculates authoritative amount
- idempotent order/payment operations
- rate/automation controls

## Enterprise

- OAuth/OIDC
- organization authorization backend
- platform secure storage
- device-management/attestation integration where required
- strong revocation
- least privilege
- avoid brittle root policies that conflict with managed enterprise devices without policy approval

## Offline-first

- encrypted sensitive local data
- platform-protected key material
- explicit offline session duration
- signed/trusted cached entitlement
- safe queued mutations
- conflict/revocation handling after reconnect
- logout data wipe

## Flutter Web

- no confidential browser secrets
- backend authority
- CSP/HSTS
- secure session architecture
- minimal browser token exposure
- no assumption source/Wasm is secret
- sanitized interop
- service-worker cache policy

## Desktop

- signed packages/installers
- platform credential storage
- sandbox/confinement where available
- long-lived credential/cache cleanup
- secure native library loading
- no development entitlements/debug services

---

# Security Testing

Testing is only for applications/environments you are authorized to assess.

## Static release inspection

Verify the actual release artifact for:

- obvious confidential strings
- private keys
- staging URLs
- debug flags
- debug resources
- internal menu strings
- asset exposure
- package permissions
- exported components
- obfuscation status

## Network validation

In an authorized test environment:

- confirm invalid certificates fail
- confirm hostname mismatch fails
- confirm HTTP downgrade fails where prohibited
- verify production does not trust debug CAs
- verify protected API calls still require backend authorization even when client UI is modified

## Tampered-build test

Create an authorized internal modified build and verify:

- backend integrity policy responds as intended
- premium/payment APIs remain server protected
- local state manipulation cannot grant server capabilities
- telemetry is generated appropriately

Do not test by compromising third-party applications.

## Authentication/token tests

Verify:

- token expiry
- refresh rotation
- logout revocation
- stolen/replayed refresh handling
- account switch
- secure-storage cleanup

## Offline tests

Verify:

- maximum offline trust window
- stale entitlement behavior
- queued mutations
- reconnection after revocation

## Backup/restore

Verify sensitive Android data does not migrate unexpectedly.

## Attestation failures

Test:

- unsupported device
- service outage
- invalid token
- stale token
- mismatched request binding
- app integrity failure
- low-risk versus high-risk response

---

# Penetration-Test Readiness

For an authorized assessment prepare:

- dedicated staging backend
- isolated test accounts
- nonproduction payment environment
- production-like hardened build
- optionally a separate diagnostic build
- exact release symbols retained privately
- documented authentication flow
- API schema
- expected integrity/attestation policy
- expected root/jailbreak behavior
- support contact
- test-data handling rules

Do not weaken the production architecture permanently merely to make testing easier.

---

# Release Security Gate

Do not ship until:

- application is release build
- no confidential secret is embedded
- Flutter obfuscation decision is documented
- split-debug symbols are securely archived when obfuscation is used
- native/R8 diagnostic mappings are preserved
- signing is valid
- Android is non-debuggable
- Android exported components are reviewed
- permissions are minimal
- Android backup rules are reviewed
- TLS validation is intact
- ATS exceptions are minimal
- certificate pinning, if any, has backup/rotation plan
- tokens use secure platform storage where persistent native storage is required
- logs/crash metadata are sanitized
- no staging/debug credentials exist
- backend authorizes every privileged action
- entitlement/payment truth comes from trusted system
- integrity/attestation is server verified
- replay controls exist for high-risk operations
- key/token revocation is supported
- vulnerable app versions can be restricted server-side when necessary
- dependencies and native plugins are reviewed
- secret scanning passes
- Web has no confidential bundled credentials
- Web hosting headers are reviewed
- sensitive caches have logout/account-switch cleanup
- security-control latency/false-positive rates have been measured

---

# Production Definition of Done

A hardened Flutter application is production-ready when the applicable conditions below are demonstrably true.

## Trust

- no sensitive authorization decision depends solely on client code
- payments, pricing, entitlement, and privileged access use trusted backend/provider truth

## Secrets

- no confidential backend private credential ships in the application
- persistent client credentials are least-privileged and platform-protected
- rotation and revocation exist

## Reverse-engineering resistance

- release build is used
- Flutter obfuscation is enabled where justified
- native shrinking/stripping is appropriate
- diagnostic symbols are privately retained
- assets contain no accidental confidential secrets

## Transport

- TLS validation works
- production does not trust arbitrary certificates
- Android cleartext policy is intentional
- ATS exceptions are minimal
- pinning, if present, has tested rotation/recovery

## Integrity

- platform signing is correct
- high-risk integrity/attestation signals are validated by backend where used
- replay/request binding is correct
- the architecture remains secure if local integrity checks are bypassed

## Storage

- sensitive native data uses appropriate platform-backed storage
- encryption keys are not hardcoded
- backups are reviewed
- account-scoped caches clear correctly

## Platform

- Android components/permissions are least privilege
- Apple entitlements are least privilege
- macOS runtime/sandbox settings are hardened
- Windows packages are properly signed
- Linux distribution/confinement security is documented
- Web is treated as fully inspectable

## Operations

- secrets can rotate
- tokens can revoke
- vulnerable versions can be restricted
- alerts exist for material integrity/auth abuse
- security failures have defined fail-open/fail-closed behavior

## Performance

- integrity and cryptographic controls are not continuously executed in UI hot paths
- protected-operation latency has been measured
- high-cost attestation is scoped to justified operations
- accessibility and legitimate enterprise/test use have been considered

## Evidence

Never claim an application is "protected from reverse engineering."

State instead which attacks are:

- prevented by trusted backend/platform controls
- detected
- made more expensive
- still possible

Security work is complete only when the residual risk is explicitly understood.