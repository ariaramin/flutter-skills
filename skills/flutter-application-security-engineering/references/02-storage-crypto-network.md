# Secure Storage, Cryptography, Network, TLS, and API Client Security

> Source-derived reference split from the user-supplied Flutter Application Security Engineering Skill. Preserve its caveats and terminology when applying detailed guidance.

## Contents

- Secure Storage
  - Android
  - iOS / macOS
  - Windows
  - Linux
  - Flutter Web
  - Storage rule
- Local Data / Databases
  - SharedPreferences
  - Hive / SQLite / files
  - Database encryption limitations
- Cryptography
  - Do not invent cryptography
  - Randomness
  - Authenticated encryption
  - Keys
  - Passwords
  - Web Crypto
- Network Security
  - Require TLS for credentials
  - Do not disable certificate validation
  - Preserve hostname validation
  - Sensitive query parameters
  - Redirects
  - Retries
- TLS
  - Default behavior
  - Development certificates
  - TLS failure
- Certificate Pinning
  - Consider pinning only when
  - If pinning is justified
  - Pinning does not protect against
- Dio / HTTP Client Security
  - Required properties
  - Redacted logging
- API Security
  - Client responsibilities
  - Server responsibilities

---

## Secure Storage

Choose storage based on threat model and platform.

### Android

For cryptographic keys and credential-protection designs, prefer mechanisms backed by Android Keystore or libraries that correctly use it. Android's security guidance recommends Keystore for stronger key protection and recommends established authenticated-encryption algorithms such as AES-GCM where application encryption is required.

### iOS / macOS

Use Keychain for small credential material such as:

- tokens
- passwords when a product genuinely must retain one
- private keys
- certificates
- database encryption keys

Apple documents Keychain as encrypted storage intended for passwords, keys, and similar small secrets.

### Windows

Use an appropriate Windows credential facility for credentials rather than a plaintext preferences file. Microsoft Credential Locker is designed for credential material, not arbitrary application blobs; verify persistence and account-roaming semantics for the application before relying on it.

### Linux

Where the desktop environment provides Secret Service/libsecret, use it for credential material. Do not put secrets into Secret Service lookup attributes because those attributes are metadata rather than secret values. Account for environments where the keyring is unavailable or locked.

### Flutter Web

Do not describe browser `localStorage`, IndexedDB, or JavaScript-managed encrypted storage as equivalent to OS secure storage.

An attacker executing same-origin JavaScript can often access JavaScript-readable secrets or use the authenticated application directly.

### Storage rule

Use secure credential storage for:

- refresh tokens
- small long-lived credentials
- database keys
- private device key material where the platform/library supports appropriate protection

Use a database for:

- structured application data
- caches
- larger datasets

When database encryption is justified:

```text
OS-backed credential store
        ↓
database encryption key
        ↓
encrypted database
```

Do not put the database and an unprotected plaintext database key beside each other.

---

## Local Data / Databases

Treat a cache as a data store.

For each local data set define:

- classification
- maximum retention
- encryption requirement
- account ownership
- tenant ownership
- backup eligibility
- logout cleanup
- deletion behavior
- crash-recovery behavior

### SharedPreferences

Use for non-sensitive preferences.

Do not persist refresh tokens, private keys, recovery codes, or high-value credentials in ordinary preferences.

### Hive / SQLite / files

Ordinary Hive/SQLite/filesystem persistence is not a secret store merely because the data is binary or not human-readable.

If sensitive structured data must survive restarts:

1. justify persistence
2. minimize stored fields
3. encrypt if the threat model requires at-rest protection
4. protect the encryption key separately
5. account for backups
6. clear account-scoped content when required
7. test corruption and migration

### Database encryption limitations

Encryption at rest protects against some forms of offline extraction.

It does **not** guarantee secrecy from an attacker who has compromised the running process after the application has obtained the database key.

---

## Cryptography

### Do not invent cryptography

Reject:

- custom ciphers
- homemade key exchange
- XOR "encryption"
- deterministic encryption used accidentally
- unauthenticated encryption for tamper-sensitive data
- custom token-signing protocols
- predictable token generation

### Randomness

Use cryptographically secure randomness for:

- PKCE verifiers
- nonces
- security tokens
- symmetric keys
- IVs/nonces when the selected algorithm requires application generation
- password-reset tokens generated server-side

Dart's ordinary `Random()` is not for cryptographic use. Use `Random.secure()` where a Dart-side cryptographically secure random source is appropriate.

### Authenticated encryption

When performing application-layer symmetric encryption, prefer a well-reviewed authenticated-encryption construction such as AES-GCM or ChaCha20-Poly1305 supplied by an established platform or cryptographic library.

Confidentiality without integrity can permit ciphertext modification attacks.

### Keys

Define:

- key origin
- storage
- rotation
- backup
- recovery
- deletion
- algorithm
- key length
- permitted operations
- compromise response

Never store the key in plaintext next to the encrypted data.

### Passwords

Flutter applications ordinarily should not store user passwords.

Backend password storage must use a purpose-built password hashing algorithm and periodically reassess work factors.

### Web Crypto

For Flutter Web, Web Crypto exposes cryptographic primitives in secure contexts, but it remains a low-level API. Use a vetted protocol design rather than assembling primitives into a new protocol.

---

## Network Security

Default to:

```text
HTTPS
+
normal platform trust validation
+
hostname validation
+
server-side authorization
```

### Require TLS for credentials

Never send:

- passwords
- OAuth codes
- access tokens
- refresh tokens
- session identifiers
- private personal data

over plaintext HTTP.

### Do not disable certificate validation

Reject production code equivalent to:

```dart
client.badCertificateCallback = (
  X509Certificate certificate,
  String host,
  int port,
) {
  return true;
};
```

A callback accepting every certificate converts an authenticated TLS connection into a connection vulnerable to a network attacker.

Apple explicitly warns not to disable server trust evaluation; Android likewise requires correct certificate validation.

### Preserve hostname validation

Do not validate only that "some certificate" is trusted. The certificate must also correspond to the intended server identity.

Apple's normal server trust process checks certificate integrity, expiry, DNS identity, and a chain to a trusted anchor.

### Sensitive query parameters

Avoid:

```text
https://api.example.com/action?access_token=SECRET
```

Prefer authorization headers or a request body where the protocol permits.

URLs may appear in:

- proxy logs
- browser history
- analytics
- server access logs
- crash breadcrumbs
- screenshots
- referrers in some web contexts

### Redirects

For security-sensitive clients:

- validate cross-origin redirects
- ensure authorization headers are not unintentionally forwarded
- place limits on redirect chains
- do not convert a trusted API request into an arbitrary attacker-controlled destination

### Retries

Retry only when semantics allow it.

For state-changing operations use:

- server-supported idempotency
- request IDs
- bounded retries
- backoff
- cancellation
- clear timeout behavior

Never blindly replay an irreversible payment or mutation because the client timed out.

---

## TLS

### Default behavior

Prefer the platform's ordinary certificate and hostname validation.

Do not add custom trust callbacks unless the threat model and platform requirements demand them.

### Development certificates

Do not ship production bypasses to support a development server.

Prefer a test CA trusted only in development/test environments and ensure production artifacts cannot activate that trust configuration.

Android Network Security Configuration provides debug-only trust overrides tied to debug builds.

### TLS failure

On certificate or hostname failure:

```text
fail connection
→ do not send credentials
→ show recoverable user-facing error
→ record non-sensitive diagnostics
```

Do not provide a "continue anyway" path for authenticated production API traffic.

---

## Certificate Pinning

Do not recommend pinning by default.

Android's current guidance explicitly says certificate pinning is not recommended for ordinary Android applications because server/CA changes can strand installed clients. Apple similarly says pinning is generally unnecessary and should be deployed cautiously only when justified.

### Consider pinning only when

- the threat model includes compromised/misissued public CA trust
- regulatory requirements demand restricted trust
- application/server ownership is stable
- there is operational capacity for key rotation
- outage risk is understood
- recovery is designed before deployment

### If pinning is justified

Require:

- public-key/SPKI-oriented strategy where appropriate
- at least one independently usable backup pin
- documented rotation process
- overlap between old and new keys
- failure telemetry that contains no secrets
- emergency application-release process
- expiry behavior reviewed deliberately
- staging tests simulating pin rotation and failure

Android's Network Security Configuration supports backup pins and pin expiration, but expiration deliberately stops pin enforcement and therefore changes the security property.

Apple recommends thinking through long-term key/CA rotation and fallback before shipping pinning.

### Pinning does not protect against

- compromised application process
- hooked TLS APIs
- stolen credentials already in memory
- backend authorization bugs
- malicious server logic
- attacker-controlled client

Treat it as defense in depth.

---

## Dio / HTTP Client Security

Use one networking layer so authentication, timeouts, logging, retries, and error handling are consistent.

### Required properties

- production HTTPS base URL
- TLS validation unchanged
- access token injected from current session state
- token refresh single-flight
- retry-at-most-once after refresh
- request cancellation
- bounded timeouts
- no sensitive query parameters
- no raw request/response logging in production
- no authorization-header logs
- idempotency support for state-changing retries
- explicit handling of redirects

### Redacted logging

Use metadata:

```dart
void logRequestFailure({
  required Uri uri,
  required int? statusCode,
}) {
  final safeUri = Uri(
    scheme: uri.scheme,
    host: uri.host,
    port: uri.hasPort ? uri.port : null,
    path: uri.path,
  );

  print(
    'request_failed '
    'endpoint=$safeUri '
    'status=${statusCode ?? 'network_error'}',
  );
}
```

Do not log:

```dart
print(request.headers);
print(response.data);
```

without a schema-specific redaction policy.

Dio's logging facilities can expose headers and bodies if configured to do so; production applications must make redaction intentional.

---

## API Security

Assign responsibilities correctly.

### Client responsibilities

- authenticate according to protocol
- send current credential
- validate basic response schema
- enforce reasonable local resource limits
- avoid accidental secret leakage
- present authorization failures correctly
- avoid unsafe replay

### Server responsibilities

- validate credentials
- authorize every protected object/action
- enforce tenant isolation
- validate request schema
- prevent mass-assignment/property authorization problems
- enforce business rules
- rate limit
- enforce quotas
- protect sensitive workflows
- implement idempotency
- constrain pagination
- limit resource consumption
- validate replay/freshness where required
- avoid verbose security error disclosure

Use OWASP API Security Top 10 as a review lens for backend endpoints consumed by Flutter.

---

