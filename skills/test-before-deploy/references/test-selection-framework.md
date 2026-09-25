# Test Selection Framework

## Status

Everything in this file is **operational inference [I]** derived from the PDF's categories. It is not a verbatim methodology from the source.

The purpose is to turn a taxonomy into a practical selection process without forcing all 34 tests onto every change.

# Step 1 - Identify risk surfaces

For the change being reviewed, mark which surfaces are materially affected:

- isolated logic;
- interaction between components;
- API contract/behavior;
- complete user journey;
- feature requirement;
- previously working behavior;
- release candidate basic usability;
- recent bug fix/change;
- whole-system integration;
- user/business acceptance;
- speed/latency/throughput;
- expected load;
- overload/failure boundary;
- sudden traffic/load increase;
- long-duration operation;
- growth/scaling;
- UI rendering/interaction;
- visual appearance;
- browser variation;
- device variation;
- accessibility;
- usability;
- security exposure;
- authentication/authorization;
- known vulnerabilities/security standards;
- compatibility;
- install/update behavior;
- crash/failure recovery;
- disaster recovery;
- backup/restore;
- data/schema/platform migration;
- monitoring/observability.

# Step 2 - Map risks to candidate tests

| Risk surface | First candidate categories |
|---|---|
| Isolated code logic | Unit, Functional |
| Multiple components/services interact | Integration, System |
| Request/Response/Status Code/API behavior | API, Integration |
| Critical full journey | E2E, Functional, possibly UAT |
| New feature | Functional, Unit/Integration as applicable, Regression |
| Bug fix | Sanity, Regression, relevant Unit/Integration/Functional |
| Broad shared-code change | Regression, Integration, System |
| Release-candidate basic viability | Smoke |
| Whole product behavior | System |
| Business/user acceptance | UAT |
| Speed/response concerns | Performance |
| Known expected load | Load |
| Failure under extreme pressure | Stress |
| Sudden burst | Spike |
| Long-running degradation/leaks | Endurance / Soak |
| Growth/capacity | Scalability |
| UI behavior | UI Testing |
| Visual appearance stability | Visual Regression |
| Browser support | Cross-Browser |
| Device/form-factor support | Cross-Device |
| Accessibility requirements | Accessibility |
| Human ease-of-use | Usability |
| General security exposure | Security Testing |
| Adversarial security assessment | Penetration Testing |
| Vulnerability discovery | Vulnerability Testing |
| Identity/permissions | Authentication & Authorization |
| OWASP-aligned requirement | OWASP Testing |
| Environment/version compatibility | Compatibility |
| Install/update path | Installation |
| Crash/failure recovery | Recovery |
| Major outage recovery | Disaster Recovery |
| Data backup/restore | Backup & Restore |
| Schema/data/platform transition | Migration |
| Detectability/diagnostics after deployment | Monitoring & Observability |

The table is a starting point, not an automatic mandate.

# Step 3 - Classify each candidate

Use:

- **Required**
- **Recommended**
- **Not applicable**
- **Blocked / unavailable**
- **Unknown**

A category should become Required only when you can state the concrete risk it mitigates.

# Step 4 - Avoid redundant confidence claims

Different categories may overlap in execution while serving different intents.

Example:

A checkout E2E scenario might also exercise an API and multiple integrations, but that does not automatically mean API Testing and Integration Testing are adequately covered. The question is whether the evidence validates those concerns intentionally and diagnostically.

Similarly, a broad Regression suite can contain Functional or E2E tests, but “Regression” describes the confidence goal: ensuring new changes did not break previous behavior.

# Step 5 - Scale depth to consequence

Ask:

- What is the user/business impact of failure?
- How reversible is the release?
- Can corrupted data be repaired?
- Can failure violate permissions/security?
- Can it cause money loss or permanent state changes?
- How broad is the blast radius?
- How frequently is the path used?
- Is the path observable after release?

Higher consequence generally justifies broader/deeper evidence, but the PDF itself does not define a risk-scoring system.

# Typical change examples

## Pure internal refactor with no contract change

Likely focus:

- Unit or Integration where implementation boundaries changed;
- Regression for previously working behavior;
- Smoke for release candidate.

Specialized tests only if the refactor touches their risk surface.

## API contract change

Likely focus:

- API Testing;
- Integration Testing;
- Functional Testing;
- Regression Testing;
- E2E for critical journeys;
- compatibility/migration if old clients or schema transitions are involved.

## UI redesign

Likely focus:

- UI Testing;
- Visual Regression;
- Cross-Device and/or Cross-Browser as applicable;
- Accessibility;
- Usability when user interaction meaningfully changes;
- Functional/Regression for behavior retained beneath the new UI.

## Authentication/authorization change

Likely focus:

- Authentication & Authorization Testing;
- Security Testing;
- relevant API/Integration/Functional/Regression tests;
- Vulnerability/Pen/OWASP categories when project policy or risk requires them.

## Data migration release

Likely focus:

- Migration Testing;
- Backup & Restore Testing;
- Recovery Testing;
- Integration/System/Regression tests;
- Monitoring & Observability Testing;
- compatibility when old/new versions coexist.

The exact plan still depends on project requirements and evidence.
