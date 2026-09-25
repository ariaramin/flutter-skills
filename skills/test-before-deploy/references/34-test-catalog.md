# 34-Test Catalog

## Provenance

Source: `34-Test-Before-Deploy.pdf`.

The rendered PDF contains exactly five visible groups totaling 34 named test types. Page 1 contains Main Tests and Quality & Performance Tests. Page 2 contains UI & User Experience, Security, and Production Tests.

This file distinguishes descriptions that are explicitly present in the PDF from test names that are only listed.

# 1. Main Tests - 10

| # | Test | Source-supported meaning |
|---:|---|---|
| 1 | Unit Testing | Testing the smallest code units, with Function or Class given as examples. |
| 2 | Integration Testing | Checking interaction between multiple parts/sections. |
| 3 | API Testing | Checking Request, Response, Status Code, and API behavior. |
| 4 | End-to-End (E2E) Testing | Testing a complete scenario from beginning to end. |
| 5 | Functional Testing | Checking whether a Feature works according to its requirement. |
| 6 | Regression Testing | Ensuring new changes have not broken previous capabilities. |
| 7 | Smoke Testing | Quickly checking that the new version is basically usable. |
| 8 | Sanity Testing | Focused checking of recent changes or Bug Fixes. |
| 9 | System Testing | Testing the whole system as one integrated product. |
| 10 | Acceptance Testing (UAT) | Evaluating the product from the user or Business perspective. |

# 2. Quality & Performance Tests - 6

| # | Test | Source-supported meaning |
|---:|---|---|
| 11 | Performance Testing | Checking system speed and performance. |
| 12 | Load Testing | Checking system behavior under a specified load. |
| 13 | Stress Testing | Finding the system's breaking point under severe pressure. |
| 14 | Spike Testing | Checking system reaction to a sudden increase in load. |
| 15 | Endurance / Soak Testing | Checking performance under long-duration load. |
| 16 | Scalability Testing | Checking the system's ability to scale. |

# 3. UI & User Experience Tests - 6

The PDF lists these names on page 2 but does not provide explanatory definitions beside them:

| # | Test | Source status |
|---:|---|---|
| 17 | UI Testing | Listed; no definition in source. |
| 18 | Visual Regression Testing | Listed; no definition in source. |
| 19 | Cross-Browser Testing | Listed; no definition in source. |
| 20 | Cross-Device Testing | Listed; no definition in source. |
| 21 | Accessibility Testing | Listed; no definition in source. |
| 22 | Usability Testing | Listed; no definition in source. |

# 4. Security Tests - 5

The PDF lists these names on page 2 but does not define methodology or scope:

| # | Test | Source status |
|---:|---|---|
| 23 | Security Testing | Listed; no definition in source. |
| 24 | Penetration Testing (Pen Test) | Listed; no definition in source. |
| 25 | Vulnerability Testing | Listed; no definition in source. |
| 26 | Authentication & Authorization Testing | Listed; no definition in source. |
| 27 | OWASP Testing | Listed; no OWASP version/methodology specified. |

# 5. Production Tests - 7

| # | Test | Source-supported meaning/status |
|---:|---|---|
| 28 | Compatibility Testing | Listed; no definition in source. |
| 29 | Installation Testing | Listed; no definition in source. |
| 30 | Recovery Testing | Checking recovery after a Crash or Failure. |
| 31 | Disaster Recovery Testing | Listed; no definition in source. |
| 32 | Backup & Restore Testing | Listed; no definition in source. |
| 33 | Migration Testing | Listed; no definition in source. |
| 34 | Monitoring & Observability Testing | Listed; no definition in source. |

# Important distinctions explicitly supported by the source

- Unit Testing is smaller in scope than Integration Testing.
- Integration Testing concerns interaction among multiple sections.
- E2E Testing concerns a full scenario from start to finish.
- Functional Testing is requirement/Feature-oriented.
- Regression Testing protects previously working capabilities from new changes.
- Smoke Testing is a quick basic-usability check for a new version.
- Sanity Testing is focused on recent changes or bug fixes.
- System Testing concerns the whole system as an integrated product.
- UAT views the product from the user/Business perspective.
- Load, Stress, Spike, Soak, and Scalability are intentionally distinct performance-related categories.

# What this PDF does not specify

It does not specify:

- tools or frameworks;
- automation strategy;
- CI/CD stages;
- test pyramid/trophy proportions;
- pass/fail thresholds;
- code coverage targets;
- environments;
- supported browsers/devices;
- performance SLAs/SLOs;
- security severity thresholds;
- penetration-testing procedures;
- OWASP version;
- RPO/RTO;
- release ownership;
- defect severity taxonomy;
- rollback strategy.

Do not attribute any such detail to the PDF.
