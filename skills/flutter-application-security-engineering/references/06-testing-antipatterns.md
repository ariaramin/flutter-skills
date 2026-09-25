# Security Testing, Review Workflows, and Anti-Patterns

> Source-derived reference split from the user-supplied Flutter Application Security Engineering Skill. Preserve its caveats and terminology when applying detailed guidance.

## Contents

- Security Testing
  - Unit tests
  - Integration tests
  - Negative tests
  - Security regression tests
  - Dynamic validation
- Static Analysis
- Security Code Review Workflow
- Security Architecture Workflow
- Common Anti-Patterns
  - 1. Hardcoded secrets, `.env` secrets, and obfuscation
  - 2. Tokens in ordinary preferences
  - 3. Logging authorization material
  - 4. Disabling certificate validation
  - 5. Plain HTTP and credentials in URLs
  - 6. Pinning without rotation
  - 7. Custom OAuth without PKCE/state
  - 8. Arbitrary embedded WebView for OAuth
  - 9. Unrestricted WebView navigation and JS bridge
  - 10. Loading arbitrary HTML with privileged JS
  - 11. Weak deep-link host check
  - 12. Treating custom URI schemes as trusted
  - 13. Client-side authorization
  - 14. Trusting price, role, or tenant from client
  - 15. Database key next to encrypted database
  - 16. Homemade cryptography or weak randomness
  - 17. SQL concatenation
  - 18. Trusting file extension and path
  - 19. Retaining sensitive cache after logout
  - 20. Copying credentials to clipboard
  - 21. Sensitive crash context
  - 22. Unnecessary permissions
  - 23. Debug menu in production
  - 24. Root detection as primary security
  - 25. Blind trust in a security SDK
  - 26. Abandoned or unreviewed package
  - 27. Secrets in Git or CI output
  - 28. Release credentials stored with source
  - 29. "Lints passed, therefore secure"
  - 30. "HTTPS solves authorization"
  - 31. Biometrics as server authorization
  - 32. Trusting notification or QR payload
  - 33. Privileged action directly from deep-link parameters

---

## Security Testing

Security controls require executable evidence.

### Unit tests

Test:

- URI allowlists
- host matching
- deep-link parser
- OAuth-state correlation
- token expiry decisions
- refresh single-flight state
- logout generation handling
- logging redaction
- file-name/path validators
- response schema validators
- permission-state mapping
- cache account namespace

### Integration tests

Test:

- login
- logout
- refresh
- rotated refresh token
- revoked session
- account switching
- permission denial
- deep-link startup
- warm-app deep link
- OAuth redirect
- local secure-storage restore
- malformed API response
- WebView navigation rejection
- platform channels

Flutter recommends integration coverage for platform-channel behavior because correctness spans Dart and native code.

### Negative tests

Actively test:

- wrong deep-link host
- wrong scheme
- unexpected port
- missing `state`
- mismatched `state`
- expired token
- invalid token
- refresh replay
- corrupted secure storage
- missing field
- unknown enum
- giant array
- oversized file
- file with mismatched extension/content
- `../` path attempts
- unauthorized object ID
- other-tenant ID
- HTTP redirect
- certificate failure
- WebView external navigation
- malformed JS bridge payload

### Security regression tests

For each fixed vulnerability, add a test when practical.

Name it for the threat, not merely the bug number:

```text
rejects_attacker_subdomain_as_trusted_redirect
logout_during_refresh_does_not_restore_session
account_switch_does_not_reuse_previous_cache
webview_blocks_navigation_outside_allowed_origin
```

### Dynamic validation

Where authorized and appropriate, verify:

- behavior under a debugging proxy
- TLS validation failure
- modified requests
- replayed requests
- local storage contents
- logout cleanup
- rooted/jailbroken risk behavior
- malicious links
- malicious WebView navigation
- malformed files

Focus testing on whether defenses hold; do not add exploit code to production repositories.

---

## Static Analysis

Run:

- `dart analyze`
- Flutter/Dart lints
- native Android lint
- Xcode warnings/static checks
- dependency/advisory checks
- secret scanning
- manifest/entitlement review

Dart's analyzer and lint system are valuable correctness tools but do not prove authorization, secure protocol use, safe backend behavior, or the absence of design vulnerabilities.

Treat:

```text
0 analyzer warnings
```

as quality evidence, not a security certification.

---

## Security Code Review Workflow

For every security-sensitive diff ask:

1. What data enters this code?
2. Who controls it?
3. Which trust boundary did it cross?
4. Is its structure validated?
5. Does the operation require authentication?
6. Is authorization enforced server-side?
7. Is sensitive data persisted?
8. Is the chosen storage appropriate?
9. Could this value enter logs, analytics, crashes, or URLs?
10. Does the code modify TLS or certificate trust?
11. Could a deep link invoke this path directly?
12. Could a WebView or platform channel invoke it?
13. Does a plugin/native SDK expand privileges?
14. What happens on a compromised device?
15. What happens during account switch/logout?
16. What happens when the request is replayed?
17. What happens with oversized/malformed input?
18. Is there a safer OS API?
19. What failure mode is user-visible?
20. What test proves the control?

Do not approve "looks secure" as evidence.

---

## Security Architecture Workflow

For a new high-risk feature use:

```text
Feature
  ↓
Assets
  ↓
Data classification
  ↓
Data flows
  ↓
Trust boundaries
  ↓
Attackers / abuse cases
  ↓
Authentication
  ↓
Authorization
  ↓
Storage
  ↓
Network/protocol
  ↓
Input validation
  ↓
Privacy
  ↓
Dependencies/platform privileges
  ↓
Controls
  ↓
Negative tests
  ↓
Residual risk
```

Document the result alongside architecture/design work rather than reconstructing it after implementation.

---

## Common Anti-Patterns

### 1. Hardcoded secrets, `.env` secrets, and obfuscation

**Bad**

```dart
const paymentSecret = String.fromEnvironment(
  'PAYMENT_SECRET',
  defaultValue: 'sk_live_hidden',
);
```

**Why it is insecure**

The shipped application needs the value and can therefore expose or reuse it. Build variables change where the value originates, not the client's trust level. Obfuscation does not encrypt application resources.

**Threat**

Reverse engineering or runtime inspection recovers a server credential.

**Better**

```dart
final response = await api.createPaymentIntent(
  cartId: cartId,
);
```

Keep the payment-provider secret on your backend.

**Verification**

Inspect final APK/AAB/IPA/desktop/web artifacts for privileged secret material and verify the third-party call originates from the backend.

---

### 2. Tokens in ordinary preferences

**Bad**

```dart
await prefs.setString('refresh_token', refreshToken);
```

**Why it is insecure**

Ordinary preferences are not designed as credential storage.

**Threat**

Offline application-data extraction exposes a long-lived credential.

**Better**

Use an OS-backed credential store suitable for the target platform and persist only credentials that must survive process termination.

**Verification**

Inspect application preferences/files after authentication; no refresh token should appear in plaintext preference storage.

---

### 3. Logging authorization material

**Bad**

```dart
print('headers=${request.headers}');
print('refresh=$refreshToken');
```

**Why it is insecure**

Logs escape the credential-protection boundary.

**Threat**

Developer tooling, crash collection, CI, or support bundles expose credentials.

**Better**

```dart
print(
  'request_failed path=${request.uri.path} '
  'status=${response.statusCode}',
);
```

**Verification**

Search logs from login, refresh, logout, error, and crash paths for test token markers.

---

### 4. Disabling certificate validation

**Bad**

```dart
httpClient.badCertificateCallback =
    (certificate, host, port) => true;
```

**Why it is insecure**

Any certificate is accepted.

**Threat**

Man-in-the-middle attacker impersonates the API.

**Better**

Use normal platform trust validation and fix certificate deployment.

**Verification**

A proxy presenting an untrusted certificate must cause the request to fail.

---

### 5. Plain HTTP and credentials in URLs

**Bad**

```dart
final uri = Uri.parse(
  'http://api.example.com/profile?token=$accessToken',
);
```

**Why it is insecure**

The connection lacks TLS and the token is in a URL.

**Threat**

Network interception and credential leakage through URL logging.

**Better**

```dart
final uri = Uri.https(
  'api.example.com',
  '/profile',
);

final options = Options(
  headers: <String, Object>{
    'Authorization': 'Bearer $accessToken',
  },
);
```

**Verification**

Production network configuration permits no authenticated HTTP endpoint and logs contain no token query parameters.

---

### 6. Pinning without rotation

**Bad**

```text
Trust exactly one leaf certificate forever.
```

**Why it is insecure**

Operational certificate change can cause a fleet-wide outage.

**Threat**

Availability failure turns into unsafe emergency bypass.

**Better**

Do not pin unless threat-model justified. If pinning, use backup keys and a tested rotation/recovery design. Android and Apple both emphasize rotation risk.

**Verification**

Rotate the active server key in staging while a backup pin is deployed and confirm continuity.

---

### 7. Custom OAuth without PKCE/state

**Bad**

```dart
final code = redirect.queryParameters['code'];
await exchangeCode(code!);
```

**Why it is insecure**

There is no transaction binding or PKCE protection.

**Threat**

Authorization-response mix-up, CSRF-style login confusion, or authorization-code interception.

**Better**

Use a maintained OAuth/OIDC implementation that performs Authorization Code + PKCE, state validation, exact redirect handling, and OIDC nonce validation where required.

**Verification**

Tampered `state`, redirect URI, verifier, or nonce must fail.

---

### 8. Arbitrary embedded WebView for OAuth

**Bad**

```text
Load provider login page inside unrestricted WebView.
```

**Why it is insecure**

It violates native OAuth best practice and collapses browser/app isolation.

**Threat**

Credential interception or provider incompatibility.

**Better**

Use the system/external browser authorization flow unless provider guidance explicitly defines another secure flow.

**Verification**

Authentication opens through the supported external-user-agent mechanism.

---

### 9. Unrestricted WebView navigation and JS bridge

**Bad**

```dart
controller
  ..setJavaScriptMode(JavaScriptMode.unrestricted)
  ..addJavaScriptChannel(
    'Native',
    onMessageReceived: handleAnything,
  );
```

**Why it is insecure**

Any loaded attacker page may interact with privileged native capability.

**Threat**

JavaScript injection becomes native application abuse.

**Better**

Disable JS unless needed, restrict navigation to exact trusted origins, expose a minimal bridge, and validate every message.

**Verification**

Navigate to an attacker origin and send malformed/unauthorized bridge messages; all must be blocked.

---

### 10. Loading arbitrary HTML with privileged JS

**Bad**

```text
server/user HTML
+
JavaScript enabled
+
native bridge
```

**Why it is insecure**

Untrusted markup can execute privileged code.

**Threat**

Native-function abuse and sensitive data exfiltration.

**Better**

Disable script/bridges for untrusted content or render sanitized non-executable content in an isolated context.

**Verification**

Injected `<script>` and navigation attempts cannot invoke native capabilities.

---

### 11. Weak deep-link host check

**Bad**

```dart
if (uri.host.contains('example.com')) {
  open(uri);
}
```

**Why it is insecure**

Attacker subdomains such as `example.com.attacker.invalid` pass.

**Threat**

Phishing, open redirect, privileged route invocation.

**Better**

```dart
if (uri.scheme == 'https' &&
    uri.host.toLowerCase() == 'example.com') {
  openTrustedRoute(uri);
}
```

**Verification**

Test attacker prefixes/suffixes, Unicode/IDN cases relevant to the application, ports, userinfo, and wrong schemes.

---

### 12. Treating custom URI schemes as trusted

**Bad**

```text
myapp://reset?token=...
→ assume only our app could produce it
```

**Why it is insecure**

Custom schemes are public namespaces.

**Threat**

Another application intercepts or generates scheme URIs.

**Better**

Prefer verified HTTPS links for sensitive flows and still perform server-side token validation.

**Verification**

Attempt delivery from an unrelated application and verify no privileged operation occurs without normal checks.

---

### 13. Client-side authorization

**Bad**

```dart
if (user.isPremium) {
  await api.downloadPremiumData();
}
```

**Why it is insecure**

The client flag can be modified.

**Threat**

Unauthorized feature/data access.

**Better**

Use the flag for UI only; backend independently authorizes the request.

**Verification**

Modify/omit the client-side entitlement and request the API directly. Unauthorized accounts remain denied.

---

### 14. Trusting price, role, or tenant from client

**Bad**

```json
{
  "price": 1,
  "role": "admin",
  "tenantId": "victim"
}
```

**Why it is insecure**

The attacker controls request payloads.

**Threat**

Business-rule bypass and cross-tenant access.

**Better**

Server derives price/role and authorizes tenant/resource ownership.

**Verification**

Send manipulated values directly to the API.

---

### 15. Database key next to encrypted database

**Bad**

```text
files/
  app.db.enc
  app.db.key
```

**Why it is insecure**

Offline extraction obtains both ciphertext and key.

**Threat**

At-rest confidentiality collapses.

**Better**

Store database key in OS-backed credential/key storage.

**Verification**

Application data directory alone must not contain plaintext key material sufficient to decrypt the DB.

---

### 16. Homemade cryptography or weak randomness

**Bad**

```dart
final token = Random().nextInt(1 << 32).toString();
```

**Why it is insecure**

Ordinary pseudorandom generators are not security-token generators.

**Threat**

Token prediction.

**Better**

Use protocol/server-generated tokens or `Random.secure()` when Dart-side secure randomness is appropriate.

**Verification**

Security review confirms all security-sensitive randomness uses a cryptographically secure source and adequate entropy.

---

### 17. SQL concatenation

**Bad**

```dart
await database.rawQuery(
  "SELECT * FROM notes WHERE owner = '$owner'",
);
```

**Why it is insecure**

Input changes SQL syntax.

**Threat**

SQL injection.

**Better**

```dart
await database.rawQuery(
  'SELECT * FROM notes WHERE owner = ?',
  <Object?>[owner],
);
```

**Verification**

Quotes and SQL metacharacters remain data rather than syntax.

---

### 18. Trusting file extension and path

**Bad**

```dart
final file = File(
  '${privateDirectory.path}/${upload.name}',
);
```

**Why it is insecure**

Filename can contain traversal or deceptive format.

**Threat**

Overwrite/read outside intended directory or feed malicious content to parser.

**Better**

Generate the destination identifier yourself and validate actual content/size.

**Verification**

Test `../`, absolute paths, separators, symlink scenarios relevant to target OS, wrong content type, and oversized files.

---

### 19. Retaining sensitive cache after logout

**Bad**

```text
logout → clear token only
```

**Why it is insecure**

Cached private data remains visible.

**Threat**

Next account/user sees prior user's data.

**Better**

Clear or cryptographically isolate account-scoped sensitive caches according to the lifecycle policy.

**Verification**

Perform A → logout → B account-switch test.

---

### 20. Copying credentials to clipboard

**Bad**

```dart
Clipboard.setData(
  ClipboardData(text: refreshToken),
);
```

**Why it is insecure**

Clipboard contents may be exposed outside the application.

**Threat**

Credential leakage.

**Better**

Do not expose machine credentials through clipboard.

**Verification**

Search clipboard-writing callsites for credential classes/fields.

---

### 21. Sensitive crash context

**Bad**

```dart
crashReporter.setCustomKey(
  'authorization',
  authorizationHeader,
);
```

**Why it is insecure**

Credentials enter a third-party telemetry system.

**Threat**

Credential exposure through support/analytics infrastructure.

**Better**

Attach non-sensitive request IDs and error categories.

**Verification**

Inspect a real test crash payload.

---

### 22. Unnecessary permissions

**Bad**

```text
Request entire photo library to select one image.
```

**Why it is insecure**

Excessive privilege expands privacy and breach impact.

**Threat**

Application or SDK can access unrelated user data.

**Better**

Use a system picker where possible.

**Verification**

Merged manifest and runtime permission prompts contain only feature-required access.

---

### 23. Debug menu in production

**Bad**

```text
Hidden five-tap menu:
  change API host
  disable TLS check
  mint test session
```

**Why it is insecure**

Obscurity does not prevent attackers from finding the path.

**Threat**

Production security bypass.

**Better**

Exclude developer-only capabilities at build time and verify release artifacts.

**Verification**

Automated release test asserts debug routes/classes/configuration are absent or inert.

---

### 24. Root detection as primary security

**Bad**

```dart
if (!isRooted) {
  allowPayout();
}
```

**Why it is insecure**

Detection is bypassable and says nothing about account authorization.

**Threat**

Patched application bypasses local check.

**Better**

Authorize payout server-side and optionally use device-risk signal for step-up policy.

**Verification**

Backend denies unauthorized payout independently of client risk state.

---

### 25. Blind trust in a security SDK

**Bad**

```text
Add giant "security SDK"
→ assume app is secure
```

**Why it is insecure**

The SDK may add permissions, telemetry, native code, or bypassable local checks.

**Threat**

Supply-chain/privacy risk plus false confidence.

**Better**

Threat-model first; add only controls that solve identified threats and review the SDK like any other dependency.

**Verification**

Document each enabled feature, threat, data flow, outbound host, and bypass condition.

---

### 26. Abandoned or unreviewed package

**Bad**

```text
Add package because it has a convenient API.
```

**Why it is insecure**

Maintenance and ownership risk become application risk.

**Threat**

Known vulnerability or malicious update.

**Better**

Review publisher, repository, native code, transitive dependencies, maintenance, advisories, and permissions.

**Verification**

Record dependency review in the change.

---

### 27. Secrets in Git or CI output

**Bad**

```yaml
env:
  APP_STORE_PRIVATE_KEY: |
    -----BEGIN PRIVATE KEY-----
```

**Why it is insecure**

Repository readers and history gain the release credential.

**Threat**

Supply-chain compromise.

**Better**

Use CI secret management/workload identity and least-privileged release jobs.

**Verification**

Run secret scanning and inspect complete workflow logs.

---

### 28. Release credentials stored with source

**Bad**

```text
repo/
  android/
    release-keystore.jks
    passwords.txt
```

**Why it is insecure**

Source compromise becomes signing compromise.

**Threat**

Malicious release signing.

**Better**

Use dedicated signing infrastructure/secret storage and restricted release access.

**Verification**

Clone repository into a clean environment; no private signing material is present.

---

### 29. "Lints passed, therefore secure"

**Bad**

```text
dart analyze → zero issues → security approved
```

**Why it is insecure**

Static analysis does not prove protocol correctness or authorization.

**Threat**

Architectural security bug survives linting.

**Better**

Combine static analysis with threat modeling, code review, negative tests, dynamic validation, and server checks.

**Verification**

Review has evidence for authorization, storage, network, trust-boundary, and lifecycle controls.

---

### 30. "HTTPS solves authorization"

**Bad**

```text
Request uses HTTPS → trust any object ID sent by client
```

**Why it is insecure**

TLS protects transport, not application permissions.

**Threat**

Authenticated user accesses another user's resource.

**Better**

Authorize the requested object server-side.

**Verification**

Cross-user object-ID test returns denial.

---

### 31. Biometrics as server authorization

**Bad**

```dart
final ok = await localAuthentication.authenticate(
  localizedReason: 'Approve transfer',
);
if (ok) {
  await api.transferWithoutServerStepUp();
}
```

**Why it is insecure**

Local authentication is not a server authorization decision.

**Threat**

Compromised client bypasses the local branch.

**Better**

Use biometrics as local user presence and require normal server-side transaction authorization.

**Verification**

Direct API invocation without valid server authorization fails.

---

### 32. Trusting notification or QR payload

**Bad**

```text
notification says action=deleteAccount
→ execute
```

**Why it is insecure**

Payload data is not proof of authorization.

**Threat**

Spoofed/tampered input triggers privileged action.

**Better**

Treat payload as navigation/context, fetch server state, authenticate, authorize, and confirm.

**Verification**

Malformed/spoofed payload cannot invoke the protected endpoint.

---

### 33. Privileged action directly from deep-link parameters

**Bad**

```text
myapp://transfer?to=X&amount=1000
→ execute transfer
```

**Why it is insecure**

A link is attacker-controlled input.

**Threat**

Unintended transaction.

**Better**

Parse → validate → fetch server context → authenticate/step up → show explicit confirmation → authorize server-side.

**Verification**

Opening a crafted URI alone never completes the action.

---

