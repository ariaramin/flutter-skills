# Package Evaluation Matrix

**Research date:** 2026-08-09

## Scope

A universal package ranking would violate the selection process because no application requirement, repository, Flutter version, OS minimums, or security policy was supplied.

Therefore this matrix contains:

1. a reusable production matrix
2. a source-grounded **calibration exercise** for one narrow capability:
   **simple, non-sensitive persistent key-value application settings**

Calibration assumptions:

- ordinary preferences/settings
- values are not secrets
- values are not critical durable records
- Android/iOS/macOS/Windows/Linux/Web are desirable
- dependency footprint should be modest
- no custom native implementation is preferred unless it clearly lowers risk
- normal production stability is required

Do not reuse the calibration verdict for secure credentials, databases, or critical data.

---

# Reusable Matrix

| Category | Weight | Candidate A | Candidate B | Candidate C |
|---|---:|---:|---:|---:|
| Functional fit | task-specific | 0–5 | 0–5 | 0–5 |
| Platform support | task-specific | 0–5 | 0–5 | 0–5 |
| Maintenance | task-specific | 0–5 | 0–5 | 0–5 |
| API quality | task-specific | 0–5 | 0–5 | 0–5 |
| Performance | task-specific | 0–5/UNKNOWN | 0–5/UNKNOWN | 0–5/UNKNOWN |
| Security | task-specific | 0–5/UNKNOWN | 0–5/UNKNOWN | 0–5/UNKNOWN |
| Privacy | task-specific | 0–5/UNKNOWN | 0–5/UNKNOWN | 0–5/UNKNOWN |
| Dependency footprint | task-specific | 0–5 | 0–5 | 0–5 |
| Native/build complexity | task-specific | 0–5 | 0–5 | 0–5 |
| Docs/tests | task-specific | 0–5 | 0–5 | 0–5 |
| Release stability | task-specific | 0–5 | 0–5 | 0–5 |
| Integration effort | task-specific | 0–5 | 0–5 | 0–5 |
| Repository compatibility | task-specific | 0–5 | 0–5 | 0–5 |
| Replaceability | task-specific | 0–5 | 0–5 | 0–5 |
| Hard blocker | — | Yes/No | Yes/No | Yes/No |
| Confidence | — | H/M/L | H/M/L | H/M/L |
| Weighted score | 100 | /100 | /100 | /100 |
| Verdict | — | — | — | — |

Rating guidance:

```text
5 = strongly satisfies criterion with good evidence
4 = satisfies with minor tradeoff
3 = acceptable but meaningful caveat
2 = material weakness
1 = major weakness
0 = fails
UNKNOWN = insufficient evidence; do not silently score as average
```

---

# Calibration Weights — Non-Sensitive Key-Value Preferences

| Category | Weight |
|---|---:|
| Functional fit | 25 |
| Platform support | 15 |
| Maintenance | 12 |
| API quality | 8 |
| Performance | 6 |
| Security | 4 |
| Privacy | 4 |
| Dependency footprint | 8 |
| Native/build complexity | 4 |
| Docs/tests | 6 |
| Release stability | 3 |
| Integration effort | 3 |
| Repository compatibility | 1 |
| Replaceability | 1 |
| **Total** | **100** |

These weights are deliberately specific to this calibration task.

---

# Candidate 1 — shared_preferences 2.5.5

## Functional Fit

**Rating:** 5/5

The package is specifically aimed at simple key-value preferences.

Its current documentation explicitly warns not to use it for critical data because persistence timing/durability is not guaranteed. That limitation is compatible with the calibration requirement but would be a hard mismatch for critical data. [S35]

## Platform Support

**Rating:** 5/5

Current package metadata/documentation lists:

- Android
- iOS
- macOS
- Windows
- Linux
- Web

The package is federated, so implementation packages must still be considered when debugging platform-specific failures. [S35][S37]

## Maintenance

**Rating:** 5/5

Current version reviewed: **2.5.5**.

The package is under the Flutter packages organization and its CHANGELOG shows continued maintenance. Importantly, the newest release itself is not treated as the entire maintenance argument; prior releases include API/platform/SDK work. [S36][S37]

## API Quality

**Rating:** 4/5

The current package exposes legacy and newer preference APIs.

Its documentation encourages new users to consider `SharedPreferencesAsync` or `SharedPreferencesWithCache` rather than assuming the legacy API is the only integration path. The cached forms have coherence considerations around multiple isolates/engines/external writers. [S35]

This is manageable but requires an agent to select the API intentionally.

## Performance

**Rating:** 3.5/5

No trustworthy primary-source comparative benchmark was found establishing this package as universally faster than alternatives.

Architecturally:

- cached access can reduce host calls
- asynchronous host-backed access favors coherence over cached reads

This is an implementation tradeoff, not a universal performance winner.

For high-frequency workloads, benchmark the selected API in the actual application.

## Security

**Rating:** 4/5 for this task

It is suitable only because the assumed data is **non-sensitive**.

Do not interpret this rating as approval for:

- auth tokens
- passwords
- cryptographic keys
- other secrets

## Privacy

**Rating:** 5/5 for ordinary local preferences

No separate analytics/telemetry capability is part of the package's documented purpose.

Still inspect platform storage/backups if the values become privacy-sensitive.

## Dependency Footprint

**Rating:** 4/5

It is a federated Flutter plugin and therefore pulls platform implementation/interface packages rather than being a single pure-Dart file.

That graph is justified by the six-platform requirement.

## Native Complexity

**Rating:** 4/5

Native platform implementations exist, but the application API remains focused.

The operational burden is much smaller than maintaining six project-owned platform implementations.

## Docs/Tests

**Rating:** 5/5

Strong official package documentation plus source/tests in the Flutter packages repository.

## Release Stability

**Rating:** 4/5

Mature API history, but the newer async/cache APIs mean agents should avoid copying older tutorial patterns without reviewing current recommendations.

## Integration

**Rating:** 5/5

For ordinary preferences, setup is comparatively small.

## Replaceability

**Rating:** 4/5

Replaceability is good if the application wraps persistence behind a small settings repository/service and avoids exposing package-specific types.

### Approximate Weighted Score

**92/100**

This score is task-specific and does not claim security or runtime superiority outside this calibration.

### Verdict

**Accept for the calibration task**, provided:

- data is non-critical
- data is non-secret
- project OS/SDK requirements match
- the appropriate modern API is selected
- multi-isolate/multi-engine cache semantics are understood

---

# Candidate 2 — flutter_secure_storage 11.0.0

## Functional Fit

**Rating:** 1.5/5 for this task

This package solves **secure secret storage**, a different abstraction level.

Using secure Keychain/Keystore-style storage for ordinary preferences introduces unnecessary platform/security/native complexity.

That does not make the package bad.

It makes it the wrong default for this calibration requirement.

## Platform Support

**Rating:** 3.5/5

Current package metadata advertises all six major Flutter platforms, but platform behavior and setup differ significantly.

Current documentation describes, among other platform-specific requirements:

- Web secure-context/WebCrypto considerations
- Linux secure-storage system requirements
- Windows native tooling requirements
- Apple Keychain configuration

The Web implementation is documented with important caveats rather than being identical to native secure stores. [S40]

## Maintenance

**Rating:** 4.5/5

Version **11.0.0** was published on **2026-08-06**, three days before this research date.

The release contains meaningful platform/security/migration changes. This is evidence of active work, but a fresh major release also deserves extra regression/migration scrutiny. [S41]

## Important Evidence Conflict

The current CHANGELOG for 11.0.0 specifies newer Android requirements, including an Android minimum SDK change and compile SDK update, while some README/setup wording can lag behind release-specific requirements.

For version-specific integration, the release CHANGELOG and actual released platform build files must win over stale generic README text. [S40][S41]

This is a useful example of why the skill cannot inspect only the landing page.

## API Quality

**Rating:** 3.5/5

Focused secure key-value API, but platform-specific behavior and migration requirements mean error/lifecycle/storage semantics require more attention than ordinary preferences.

## Performance

**Rating:** 2.5/5 for this task

No primary-source comparative benchmark was found proving superior latency for ordinary settings.

Secure platform storage necessarily solves a stronger problem than ordinary preferences.

Performance should be benchmarked if used in a high-frequency path.

## Security

**Rating:** 4/5 provisionally

Security is core to the package's purpose, and recent releases include security-oriented storage/migration work.

However, a production secret-storage selection should trigger a **separate high-scrutiny security review**, including platform-specific behavior and current advisories.

Do not infer security solely from the name.

## Privacy

**Rating:** 3.5/5

Platform-specific secure storage behavior must be understood; Web storage semantics differ materially from Apple/Android secure stores.

## Dependency Footprint

**Rating:** 2/5 for ordinary preferences

Federated/native implementation footprint is not justified for non-sensitive values.

## Native Complexity

**Rating:** 1.5/5 for ordinary preferences

Multiple native mechanisms/system dependencies are required.

## Docs/Tests

**Rating:** 4/5

Substantial platform documentation exists, but the observed version-specific README/CHANGELOG inconsistency requires source verification.

## Release Stability

**Rating:** 2/5 currently

The fresh 11.0.0 major release introduces meaningful breaking/migration behavior, including legacy-data implications documented in the CHANGELOG. [S41]

That does not make it unsuitable for secrets; it means migration must be planned.

## Integration

**Rating:** 2/5 for this task

Too much complexity for ordinary settings.

### Approximate Weighted Score

**56/100**

The low score is caused primarily by **scope mismatch**, not a claim that the package is low quality.

### Verdict

**Reject for ordinary non-sensitive preferences.**

**Re-evaluate as a separate top-tier candidate when the actual requirement is secret/credential storage.**

---

# Candidate 3 — shared_prefs 0.1.0

## Functional Fit

**Rating:** 3/5

The package wraps `shared_preferences` and adds seed-key convenience.

If seed initialization is a hard requirement, the extra API may have value.

If not, this is overlapping functionality.

## Platform Support

**Rating:** 4.5/5

Platform capability largely derives from the underlying `shared_preferences` dependency rather than independent platform implementation.

## Maintenance

**Rating:** 1/5

The reviewed pub.dev history shows only **0.1.0**, published roughly 23 months before this research date. [S45]

Low release frequency alone is not proof of abandonment, but for a wrapper whose underlying dependency continues evolving, sparse maintenance increases compatibility/API-drift uncertainty.

## API Quality

**Rating:** 3/5

The wrapper supplies a narrow convenience abstraction.

The main question is whether that abstraction earns its extra dependency.

## Performance

**Rating:** 3.5/5

No independent performance advantage was found.

Runtime behavior substantially depends on the underlying `shared_preferences` implementation.

## Security

**Rating:** 4/5 for non-sensitive values

Same restriction: ordinary preferences only.

## Privacy

**Rating:** 5/5 for calibration scope

No evidence was found that the wrapper's purpose adds telemetry.

## Dependency Footprint

**Rating:** 2/5

It adds another package layer while still depending on `shared_preferences`.

For the calibration requirements this duplicates an already-sufficient dependency unless seed-key behavior provides concrete value.

## Native Complexity

**Rating:** 4/5

Most native complexity remains delegated to `shared_preferences`.

## Docs/Tests

**Rating:** 2/5

Evidence and ecosystem history are substantially thinner than the underlying official package.

## Release Stability

**Rating:** 1/5

Insufficient release history to establish meaningful upgrade behavior.

## Integration

**Rating:** 4/5

Simple API, but simplicity alone does not justify an extra wrapper.

### Approximate Weighted Score

**60/100**

### Verdict

**Reject by default for the calibration requirement.**

Reconsider only when its specific seed-key abstraction demonstrably removes project code worth depending on.

---

# Calibration Comparison

| Package | Version | Fit | Platforms | Maintenance | Performance evidence | Security/privacy | Footprint | Native complexity | Docs/tests | License | Integration | Key risk | Score | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---:|---|
| `shared_preferences` | 2.5.5 | Excellent for noncritical settings | 6 major Flutter targets | Strong | No universal comparative benchmark; API architecture understood | Not for secrets/critical records | Moderate/federated | Moderate | Strong | BSD-3-Clause | Low | cache/coherence semantics; not critical storage | 92 | Accept for stated calibration |
| `flutter_secure_storage` | 11.0.0 | Wrong abstraction for ordinary settings | Broad but materially platform-specific | Active; fresh major | No comparative ordinary-settings benchmark | Designed for secrets; separate deep security review required | Larger | High | Good, with version-doc conflict to verify | Package license recorded | Medium–high | migration/platform setup/recent major | 56 | Reject for this task; candidate for secrets |
| `shared_prefs` | 0.1.0 | Partial/convenience wrapper | Inherits underlying support | Sparse history | No demonstrated advantage | Same ordinary-settings restriction | Redundant wrapper | Delegated | Thin evidence | MIT | Low | extra dependency with unclear value | 60 | Reject unless unique API is required |

---

# No-Package Option

For six-platform persistent preferences, directly implementing each platform's storage API would create more application-owned native code, testing burden, and lifecycle/build responsibility than the focused package approach.

For **ephemeral settings that do not need persistence**, no package is better:

- keep state in the application's existing state-management layer
- persist nothing

For one or two simple persistent values on a single platform, a project-owned native implementation can still be considered if the repository already has a clean platform integration layer.

---

# Calibration Decision

For the narrow scenario examined:

**Best fit:** `shared_preferences` 2.5.5

Why:

- correct abstraction
- explicit six-platform support
- active first-party Flutter ecosystem ownership
- documented limitations
- current API choices support either cache-oriented or coherence-oriented access
- avoids security/native complexity unnecessary for non-secret settings

The decision would change if the requirement changed to:

- **secrets** → evaluate secure storage candidates
- **critical durable records** → evaluate database/durable-storage candidates
- **structured/queryable data** → evaluate database candidates
- **ephemeral state** → use no persistence dependency
