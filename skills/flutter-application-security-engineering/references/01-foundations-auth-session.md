# Foundations, Authentication, Sessions, and Authorization

> Source-derived reference split from the user-supplied Flutter Application Security Engineering Skill. Preserve its caveats and terminology when applying detailed guidance.

## Contents

- Purpose
- When to Use This Skill
- Security Principles
  - Threat-model first
  - Treat the client as untrusted
  - Apply these invariants
  - Security priority order
- Threat Modeling
  - 1. Identify assets
  - 2. Identify attackers
  - 3. Enumerate entry points
  - 4. Mark trust boundaries
  - 5. Analyze each threat
- Trust Boundaries
  - Device boundary
  - Process boundary
  - Persistent-storage boundary
  - Secure-storage boundary
  - Network boundary
  - Backend boundary
  - Third-party SDK boundary
  - Platform-channel boundary
  - Browser boundary
- Data Classification
- Client Trust Model
  - The client may enforce
  - The client must not be authoritative for
- Secrets Management
  - Never embed server-only secrets
  - Public client identifiers are not secrets
  - API-key distinction
- Configuration vs Secrets
  - `.env`
  - `--dart-define`
  - Flavors
- Authentication
  - Password authentication
  - Third-party identity providers
  - Account recovery
- OAuth / OIDC / PKCE
  - Preferred native pattern
  - PKCE
  - State
  - OIDC nonce
  - Redirect URI
  - Custom URI schemes
  - Embedded WebViews
  - Implicit flow
- Session Management
  - Access tokens
  - Refresh tokens
- Token Rotation
  - Use single-flight refresh
  - Protect logout from stale refresh completion
  - Persist rotated tokens atomically enough for the storage model
  - Dio pattern
- Logout
  - Local session
  - Server session
  - User data
- Authorization

---

# Flutter Application Security Engineering Skill

## Purpose

Use this skill to design, implement, review, test, release, and remediate production Flutter applications across Android, iOS, macOS, Windows, Linux, and Flutter Web with senior-level security judgment.

Treat security as an architecture property, not a collection of packages or hardening switches. Begin with assets, attackers, trust boundaries, and data flows; choose controls only after determining what threat each control addresses.

This skill implements the production security scope and constraints defined for Flutter applications in the supplied requirements.

When guidance differs by source, distinguish it explicitly:

- **Flutter behavior**: behavior documented by Flutter or Dart.
- **Platform behavior**: Android, Apple, Windows, Linux, or browser behavior.
- **Protocol requirement**: OAuth, OIDC, TLS, WebAuthn, or another standard.
- **OWASP guidance**: MASVS, MASTG, API Security, or related guidance.
- **Engineering recommendation**: architecture judgment derived from the threat model.
- **Inference**: a conclusion based on several controls or behaviors; never present an inference as a platform guarantee.

OWASP MASVS organizes mobile controls around storage, cryptography, authentication, networking, platform interaction, code quality, and resilience; use it as a verification framework rather than a substitute for a feature-specific threat model.

---

## When to Use This Skill

Use this skill whenever work involves:

- application architecture or trust boundaries
- authentication or account recovery
- authorization or entitlements
- OAuth 2.0 or OpenID Connect
- access or refresh tokens
- secure storage
- local databases or caches
- networking or API clients
- TLS or certificate validation
- certificate pinning
- deep links, App Links, or Universal Links
- external URL launching
- WebViews or JavaScript bridges
- Flutter Web
- platform channels or FFI
- cryptography
- user-selected or downloaded files
- permissions or privacy-sensitive APIs
- push notifications or QR codes
- biometrics, MFA, or passkeys
- rooted or jailbroken-device risk
- Play Integrity or App Attest
- third-party packages and native SDKs
- CI/CD and signing
- production-release reviews
- security incident remediation
- security-focused refactoring
- code review
- security regression testing

Apply it before implementation for high-risk features and before approval for security-sensitive pull requests.

---

## Security Principles

### Threat-model first

**Do not recommend security controls before understanding what is being protected and from whom.**

For every security-sensitive feature identify:

1. assets
2. attackers
3. entry points
4. trust boundaries
5. data flows
6. threats
7. impact
8. existing controls
9. residual risk
10. tests proving the controls

Use:

```text
Asset
  ↓
Who can access it?
  ↓
Through which trust boundary?
  ↓
What can go wrong?
  ↓
What control prevents or limits it?
  ↓
What does the control not protect?
  ↓
How is the control tested?
  ↓
What residual risk remains?
```

### Treat the client as untrusted

Assume the user or attacker can control the device and can:

- decompile or inspect the application
- inspect bundled assets
- hook runtime functions
- patch binaries
- manipulate local storage
- inspect process memory
- automate or bypass UI
- invoke deep links directly
- modify API requests
- replay requests
- instrument platform APIs
- run the application on compromised devices
- install local certificates or proxies
- tamper with JavaScript-visible Flutter Web state

Therefore:

```text
Client-side validation
≠
server-side authorization
```

```text
Hidden API key in app
≠
secret API key
```

```text
Biometric success
≠
authorization to perform a server operation
```

```text
Obfuscated code
≠
trusted code
```

Flutter explicitly warns that obfuscation is not secret protection: symbol obfuscation does not encrypt resources or prevent determined reverse engineering, and Flutter Web does not support Dart obfuscation in the same manner as native release targets.

### Apply these invariants

- Enforce authorization on the backend.
- Keep server-only secrets off clients.
- Use least privilege.
- Minimize sensitive data collection and retention.
- Validate every trust-boundary input.
- Fail closed for authorization, trust validation, and credential ambiguity.
- Do not log secrets.
- Do not invent cryptography.
- Prefer established OS and protocol primitives.
- Make recovery behavior explicit.
- Make controls testable.
- Add security regression tests after fixing security defects.
- Use defense in depth without mistaking defense in depth for a trust boundary.
- Reject security theater.

### Security priority order

When recommendations compete, optimize in this order:

1. correct authorization
2. credential protection
3. data confidentiality and integrity
4. trust-boundary validation
5. privacy
6. secure recovery
7. maintainability
8. testability
9. performance
10. developer convenience

Do not weaken a meaningful control for micro-performance gains.

---

## Threat Modeling

For each feature, produce a lightweight security model before selecting controls.

### 1. Identify assets

Examples:

- account identity
- access and refresh tokens
- health information
- payment information
- private files
- encryption keys
- tenant data
- premium entitlements
- recovery codes
- API-side business state
- signing credentials

### 2. Identify attackers

Consider separately:

- unauthenticated remote attacker
- malicious authenticated user
- user from another tenant
- attacker controlling another installed app
- malicious website
- malicious WebView content
- malicious file or QR-code producer
- network attacker
- compromised package or SDK
- person with unlocked device access
- rooted/jailbroken device owner
- malicious browser extension
- compromised CI account
- compromised backend credential

Do not assume all attacker classes can be mitigated by client-side controls.

### 3. Enumerate entry points

Include:

- API responses
- text fields
- deep links
- OAuth redirects
- App Links and Universal Links
- clipboard
- notifications
- QR codes
- camera/photo imports
- files
- archives
- WebViews
- JavaScript bridges
- platform channels
- native SDK callbacks
- local databases
- restored backups
- service workers
- browser JavaScript interop

### 4. Mark trust boundaries

Typical boundaries:

```text
User
  ↓
Flutter widgets
  ↓
Dart application logic
  ↓
Session / credential layer
  ↓
OS-backed credential storage
  ↓
HTTP client
  ↓
TLS/network
  ↓
Backend API
  ↓
Authentication + authorization
  ↓
Business rules
  ↓
Server data stores
```

Also mark:

```text
Dart ↔ platform channel ↔ native plugin
Flutter ↔ WebView ↔ remote content
Flutter Web ↔ browser origin ↔ third-party scripts
Application ↔ local filesystem
Application ↔ OS permission boundary
Application ↔ third-party SDK
Repository ↔ CI runner ↔ signing infrastructure
```

### 5. Analyze each threat

For every proposed control record:

| Question | Required answer |
|---|---|
| Threat mitigated | What concrete attack becomes harder or impossible? |
| Not mitigated | Which attacker still wins? |
| Enforcement location | Client, OS, network, server, or CI? |
| Property | Confidentiality, integrity, authenticity, availability, privacy? |
| Assumptions | What must remain true? |
| Bypass | What happens on a compromised device? |
| Test | What proves the control? |
| Performance cost | CPU, memory, startup, network? |
| Usability cost | Prompts, friction, offline limitations? |
| Recovery | What happens when the control fails? |

Do not approve a control that cannot answer these questions.

---

## Trust Boundaries

Treat each crossing as validation-relevant even when both sides are shipped by the same application.

### Device boundary

The device is controlled by the user. OS isolation raises attack cost but does not make server-side decisions trustworthy.

### Process boundary

Sensitive values loaded into process memory can potentially be exposed through runtime compromise, instrumentation, debugging, crashes, or native code.

### Persistent-storage boundary

Anything persisted can outlive the UI session, crash, process, account switch, or sometimes application update/backup lifecycle. Test actual removal, backup, restore, and reinstall semantics.

### Secure-storage boundary

OS credential stores can significantly improve at-rest protection, but:

```text
secure storage at rest
≠
secret after the application legitimately reads it
```

### Network boundary

Treat the network as hostile. Use TLS and preserve server identity validation.

### Backend boundary

The backend is the authoritative enforcement point for:

- authorization
- tenant isolation
- pricing
- balances
- entitlements
- payment status
- object ownership
- quotas
- irreversible actions

### Third-party SDK boundary

Treat every third-party SDK as code executing with the application's privileges. Review its native code, permissions, network behavior, data collection, update path, and transitive dependencies.

Google Play explicitly holds applications responsible for third-party SDK behavior and data collection. Apple likewise requires developers to account for integrated third-party code and has privacy-manifest/signature requirements for designated SDKs.

### Platform-channel boundary

Flutter platform channels carry dynamically encoded data between Dart and native code. `MethodChannel`/message-channel payloads are not a substitute for schema validation; validate method names, argument types, ranges, identifiers, and authorization state on both sides where relevant.

### Browser boundary

Flutter Web runs inside a browser security model. Same-origin JavaScript compromise can access JavaScript-readable state and can generally act with the permissions of the compromised origin. Treat browser extensions and third-party scripts as additional threat actors where relevant.

---

## Data Classification

Classify data before choosing storage, logging, retention, transport, or analytics behavior.

| Class | Examples | Client handling | Persistence |
|---|---|---|---|
| Public | public endpoints, feature metadata, public strings | No secrecy assumption | Ordinary storage acceptable |
| User-sensitive | email, profile, location, photos, contacts | Minimize exposure and logs | Persist only as needed |
| Credentials | access tokens, refresh tokens, session cookies, OAuth codes | Never log; tightly scope | Secure persistence only when required |
| Cryptographic material | private keys, local DB keys, device secrets | Use established key stores/APIs | Protect separately from encrypted data |
| Server-only secrets | signing keys, payment processor secrets, private API credentials | **Never ship to Flutter** | Server/secret-manager only |
| Security metadata | attestation nonces, replay counters, risk signals | Integrity-sensitive | Scope and expire |
| Operational diagnostics | request IDs, error categories | Redact identifiers | Retention-limited |
| Highly regulated/special category | health, financial, identity documents | Threat-model explicitly | Strong minimization and lifecycle controls |

For every non-public class define:

- purpose
- collection point
- storage location
- network destinations
- retention duration
- account/tenant scope
- deletion behavior
- backup behavior
- logging policy
- analytics policy
- export behavior
- incident-response impact

---

## Client Trust Model

### The client may enforce

- local UX rules
- input sanity checks
- reducing accidental exposure
- local-user-presence checks
- least-privilege permissions
- storage protection
- TLS validation
- local cache isolation
- defensive parsing
- limits against malformed data
- attestation collection
- local anti-tamper signals

### The client must not be authoritative for

- account roles
- object ownership
- tenant membership
- subscription state
- price
- discount eligibility
- account balance
- payment success
- inventory reservation
- security-sensitive rate limits
- authorization to delete/export/change protected data
- server-side API secrets
- irreversible business rules

If the UI sends:

```json
{
  "role": "admin",
  "price": 1,
  "tenantId": "another-tenant"
}
```

the backend must derive or authorize those values independently.

OWASP API Security identifies broken object-level authorization, broken function-level authorization, broken authentication, unrestricted resource consumption, and unsafe handling of properties as major API risks; hiding a Flutter route or button does not address them.

---

## Secrets Management

### Never embed server-only secrets

Reject:

```dart
const stripeSecretKey = 'sk_live_...';
```

Reject the same value when hidden through:

- `.env`
- `--dart-define`
- generated Dart files
- flavors
- base64
- XOR
- asset encryption with a client-held key
- native resource files
- string splitting
- obfuscation
- remote configuration available to the app

If the application needs plaintext or equivalent secret material to perform its function, a determined attacker controlling the client can generally recover or reuse it.

Use:

```text
Flutter client
   ↓ authenticated request
Your backend
   ↓ server-side secret
Third-party service
```

### Public client identifiers are not secrets

OAuth `client_id` values for public clients are identifiers, not confidential client credentials. Do not invent a client secret and embed it in a native or web Flutter application.

### API-key distinction

Some services issue keys intended for public mobile applications and restrict them using package identity, signing certificate, API scope, quota, origin, or backend validation. Treat those as **public-but-restricted identifiers**, not secrets.

Still:

- minimize scopes
- enable provider restrictions
- monitor abuse
- keep true privileged keys server-side

---

## Configuration vs Secrets

### `.env`

Use `.env` for configuration organization only when appropriate.

If a `.env` file is bundled as an asset, its contents are available to the shipped client. It does not become a secure secret store.

### `--dart-define`

Use `--dart-define` for:

- API base URLs
- public feature configuration
- public project identifiers
- environment selection

Do not use it to protect server-only secrets.

### Flavors

Use flavors to separate:

- development endpoints
- staging endpoints
- production endpoints
- app IDs
- analytics projects
- feature configurations

Flutter supports platform flavor configuration, but flavor separation is an environment-management mechanism, not a secrecy mechanism.

Add release tests proving production artifacts do not contain:

- development endpoints
- test credentials
- debugging backdoors
- staging certificates
- insecure network overrides

---

## Authentication

Design authentication as a protocol and lifecycle, not as a login screen.

### Password authentication

If the application directly authenticates passwords to its own backend:

- send passwords only over authenticated TLS
- never persist passwords after authentication
- never log passwords
- do not put passwords in URLs
- use rate limiting and account-abuse defenses server-side
- use established password hashing server-side
- handle credential stuffing and recovery flows
- require step-up authentication for high-risk actions where justified

Do not hash a password once with SHA-256 and call that password storage. OWASP recommends purpose-built slow password hashing such as Argon2id, with alternatives such as scrypt, bcrypt for appropriate legacy cases, or PBKDF2 where required by policy; parameters must be reviewed over time.

### Third-party identity providers

**Do not manually collect a user's Google, Apple, Microsoft, GitHub, or other identity-provider password.**

Use the provider's supported authentication protocol or platform API.

### Account recovery

Threat-model recovery as an authentication mechanism of equal importance to login.

Review:

- recovery email changes
- phone-number changes
- reset links
- one-time-code replay
- MFA reset
- recovery-code exposure
- support-assisted recovery
- active-session revocation after recovery

---

## OAuth / OIDC / PKCE

### Preferred native pattern

For ordinary native public clients use:

```text
Authorization Code
+
PKCE
+
external/system browser
```

RFC 8252 requires native apps to use an external user-agent for OAuth authorization, and RFC 9700 requires PKCE for public clients.

Do not treat `url_launcher` by itself as an OAuth implementation. The official Flutter plugin delegates URLs to platform handlers; the application still needs an OAuth/OIDC implementation that generates and validates protocol state, performs PKCE, exchanges the code, and validates responses.

### PKCE

Generate a high-entropy `code_verifier` using a cryptographically secure random source.

Derive:

```text
code_challenge = BASE64URL(SHA256(code_verifier))
```

Use `S256`.

PKCE binds the authorization request to the token exchange so interception of an authorization code alone is insufficient.

RFC 9700 requires public clients to use PKCE and describes `S256` as the challenge mechanism that avoids exposing the verifier-derived secret directly.

### State

Generate unpredictable `state` and bind it to the pending authorization transaction.

Validate it exactly when handling the redirect.

Do not:

```dart
if (uri.queryParameters.containsKey('code')) {
  acceptCode();
}
```

without correlating the response to the initiating request.

### OIDC nonce

When OIDC requires a nonce:

- generate it securely
- bind it to the authentication attempt
- send it with the authorization request
- validate the returned ID-token nonce according to the provider/profile
- reject missing or mismatched values

Do not substitute `state` for `nonce`; they address overlapping but different protocol concerns.

### Redirect URI

Register the narrowest possible redirect URI.

Validate:

- scheme
- hostname
- port where relevant
- path
- request correlation
- `state`
- expected issuer/provider where multiple issuers exist

RFC 9700 requires exact redirect-URI matching other than narrowly defined native-loopback behavior and warns against open redirectors.

### Custom URI schemes

Custom schemes can be claimed by other applications. If the provider/platform supports claimed HTTPS redirects, prefer verified links for sensitive redirects.

RFC 8252 explains that claimed HTTPS redirects can benefit from OS association with the destination app, while private-use schemes remain interceptable public namespaces.

### Embedded WebViews

Do not implement general OAuth authorization in an arbitrary embedded WebView unless the identity provider and protocol profile explicitly support that design.

External user-agents provide stronger isolation and let identity providers reuse trusted browser sessions.

### Implicit flow

Do not choose implicit-flow-style access-token delivery for a new ordinary public client. Current OAuth Security BCP recommends authorization-code-based patterns instead.

---

## Session Management

Design the complete state machine:

```text
Unauthenticated
  ↓
Authentication pending
  ↓
Authenticated
  ↓
Access token active
  ↓
Refresh required
  ↓
Refreshed / reauthenticated
  ↓
Logout or revocation
  ↓
Local credentials cleared
```

### Access tokens

Prefer:

- short lifetime appropriate to risk
- memory-first storage when practical
- audience and scope restriction
- no logs or analytics
- no URL query parameters
- server-side signature/introspection/audience validation
- secure persistence only when product requirements need session restoration

Do not treat decoding a JWT in Flutter as authorization.

### Refresh tokens

Treat refresh tokens as higher-value credentials because they can mint new access tokens.

Require:

- OS-backed secure persistence where available
- TLS
- server-side revocation
- server-side scope/client binding
- replay protection
- inactivity expiration appropriate to risk
- deletion during logout
- account-scoped storage
- race-safe rotation handling

RFC 9700 requires refresh tokens for public clients to be sender-constrained or use refresh-token rotation to detect replay.

---

## Token Rotation

### Use single-flight refresh

Reject:

```text
Request A → sees 401 → refresh
Request B → sees 401 → refresh
Request C → sees 401 → refresh
```

This can break rotating refresh tokens.

Use:

```text
Request A ─┐
Request B ─┼→ one shared refresh Future → new credential set
Request C ─┘
```

### Protect logout from stale refresh completion

Threat:

```text
refresh starts
   ↓
user logs out
   ↓
storage cleared
   ↓
old refresh request succeeds
   ↓
credentials written again
```

Prevent this with a session generation/epoch.

Concept:

```text
generation = 7
refresh captures 7

logout:
  generation = 8
  clear credentials

refresh completes:
  if capturedGeneration != generation:
      discard result
```

### Persist rotated tokens atomically enough for the storage model

Do not write a new access token and then crash before replacing the corresponding refresh token if that leaves the session unrecoverable.

Design the refresh protocol and persistence sequence together.

### Dio pattern

For Dio, use a separate client for refresh operations so the refresh request does not recursively trigger the same authentication interceptor.

Dio interceptors are concurrent by default and provide `QueuedInterceptor` when serialized interceptor access is needed; do not assume adding an interceptor automatically makes refresh single-flight.

A production pattern is:

```dart
import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final class SessionTokens {
  const SessionTokens({
    required this.accessToken,
    required this.refreshToken,
  });

  final String accessToken;
  final String refreshToken;
}

final class SessionManager {
  SessionManager({
    required Dio refreshClient,
    required FlutterSecureStorage secureStorage,
    required Uri tokenEndpoint,
    required String publicClientId,
  })  : _refreshClient = refreshClient,
        _secureStorage = secureStorage,
        _tokenEndpoint = tokenEndpoint,
        _publicClientId = publicClientId;

  static const _refreshTokenKey = 'oauth_refresh_token';

  final Dio _refreshClient;
  final FlutterSecureStorage _secureStorage;
  final Uri _tokenEndpoint;
  final String _publicClientId;

  String? _accessToken;
  Future<String?>? _refreshInFlight;
  int _sessionGeneration = 0;

  String? get accessToken => _accessToken;

  Future<void> restore() async {
    final refreshToken = await _secureStorage.read(key: _refreshTokenKey);
    if (refreshToken == null) {
      return;
    }
    await refreshAccessToken();
  }

  Future<void> establish(SessionTokens tokens) async {
    final generation = ++_sessionGeneration;
    await _secureStorage.write(
      key: _refreshTokenKey,
      value: tokens.refreshToken,
    );

    if (generation != _sessionGeneration) {
      await _secureStorage.delete(key: _refreshTokenKey);
      return;
    }

    _accessToken = tokens.accessToken;
  }

  Future<String?> refreshAccessToken() {
    return _refreshInFlight ??= _performRefresh().whenComplete(() {
      _refreshInFlight = null;
    });
  }

  Future<String?> _performRefresh() async {
    final generation = _sessionGeneration;
    final oldRefreshToken =
        await _secureStorage.read(key: _refreshTokenKey);

    if (oldRefreshToken == null) {
      return null;
    }

    final response = await _refreshClient.postUri<Map<String, dynamic>>(
      _tokenEndpoint,
      data: <String, Object>{
        'grant_type': 'refresh_token',
        'refresh_token': oldRefreshToken,
        'client_id': _publicClientId,
      },
      options: Options(
        contentType: Headers.formUrlEncodedContentType,
        responseType: ResponseType.json,
      ),
    );

    if (generation != _sessionGeneration) {
      return null;
    }

    final data = response.data;
    final accessToken = data?['access_token'];
    final newRefreshToken = data?['refresh_token'];

    if (accessToken is! String ||
        accessToken.isEmpty ||
        newRefreshToken is! String ||
        newRefreshToken.isEmpty) {
      throw StateError('Invalid token response');
    }

    await _secureStorage.write(
      key: _refreshTokenKey,
      value: newRefreshToken,
    );

    if (generation != _sessionGeneration) {
      await _secureStorage.delete(key: _refreshTokenKey);
      return null;
    }

    _accessToken = accessToken;
    return accessToken;
  }

  Future<void> logout() async {
    _sessionGeneration++;
    _accessToken = null;
    await _secureStorage.delete(key: _refreshTokenKey);
  }
}
```

This is a client-side concurrency pattern, not a replacement for authorization-server refresh-token replay detection.

Do not copy its token endpoint fields blindly; follow the identity provider's documented OAuth profile.

`flutter_secure_storage` is a community package rather than a Flutter framework primitive. Review its current backend on every target platform before adopting it; notably, its web implementation does not provide the same security semantics as Android Keystore or Apple Keychain.

---

## Logout

Define logout at three levels.

### Local session

Clear:

- in-memory access token
- persisted refresh/session credentials
- account-specific keys
- cached authorization state
- pending refresh operations
- sensitive navigation state

### Server session

Where supported and required:

- revoke refresh tokens
- invalidate server sessions
- invalidate remembered devices
- rotate/revoke credential families after security events

RFC 9700 explicitly recognizes revocation on events such as logout or password change and recommends inactivity expiry for refresh tokens.

### User data

Determine whether logout should delete:

- profile caches
- messages
- downloaded documents
- thumbnails
- decrypted databases
- search history
- temporary exports

Account switching must never reveal account A's cache to account B.

---

## Authorization

**Authenticate who the user is. Authorize what they may do.**

Every protected API operation must authorize on the server using trustworthy server-side state.

Examples requiring server enforcement:

- admin actions
- tenant access
- object ownership
- premium features
- subscription state
- payment status
- price
- payout destination
- account deletion
- data export
- MFA changes
- role assignment

Reject:

```dart
if (currentUser.role == 'admin') {
  showDeleteEveryoneButton();
}
```

as a security control.

That condition is valid UX, but the server must still authorize the operation.

Never trust a client-supplied tenant ID without checking that the authenticated principal has rights to the referenced tenant and resource.

---

