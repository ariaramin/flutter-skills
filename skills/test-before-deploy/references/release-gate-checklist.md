# Release Gate Checklist

This checklist operationalizes the source taxonomy. Items marked as selection/decision logic are **[I]** rather than direct PDF instructions.

## A. Scope and requirements

- [ ] The release/change is described in user-visible terms.
- [ ] Affected components and integrations are identified.
- [ ] Failure consequences are understood.
- [ ] Acceptance criteria are explicit or missing criteria are flagged.
- [ ] Out-of-scope behavior is recorded.

## B. Main Tests

- [ ] Unit Testing considered for changed small code units.
- [ ] Integration Testing considered for interacting sections/components.
- [ ] API Testing considered when Request/Response/Status Code/API behavior is involved.
- [ ] E2E considered for critical complete scenarios.
- [ ] Functional Testing covers applicable Feature requirements.
- [ ] Regression Testing covers previously working behavior at risk.
- [ ] Smoke Testing verifies the release candidate is basically usable.
- [ ] Sanity Testing covers recent changes or Bug Fixes where appropriate.
- [ ] System Testing considered when whole-product integration matters.
- [ ] UAT considered where user/Business acceptance is required.

## C. Quality & Performance

- [ ] Performance Testing considered when speed/performance is material.
- [ ] Load Testing considered when specified load matters.
- [ ] Stress Testing considered when failure boundary matters.
- [ ] Spike Testing considered when sudden load increase matters.
- [ ] Endurance / Soak considered when long-duration behavior matters.
- [ ] Scalability Testing considered when growth/capacity matters.
- [ ] Numeric targets come from project requirements, not invention.

## D. UI & User Experience

- [ ] UI Testing considered.
- [ ] Visual Regression considered.
- [ ] Cross-Browser considered when browser support is relevant.
- [ ] Cross-Device considered when device support is relevant.
- [ ] Accessibility considered.
- [ ] Usability considered when interaction/workflow changes materially.
- [ ] Any precise methodology not present in the PDF is sourced from project/external guidance.

## E. Security

- [ ] Security Testing considered.
- [ ] Penetration Testing considered when policy/risk requires it.
- [ ] Vulnerability Testing considered.
- [ ] Authentication & Authorization Testing considered for identity/permission changes.
- [ ] OWASP Testing considered when an OWASP-aligned requirement exists.
- [ ] No security activity is claimed complete without evidence.
- [ ] No OWASP version or severity threshold is invented.

## F. Production Tests

- [ ] Compatibility Testing considered.
- [ ] Installation Testing considered.
- [ ] Recovery Testing covers relevant Crash/Failure recovery.
- [ ] Disaster Recovery Testing considered where applicable.
- [ ] Backup & Restore Testing considered for persisted/critical data.
- [ ] Migration Testing considered for data/schema/platform transitions.
- [ ] Monitoring & Observability Testing considered for production detectability.

## G. Evidence

For every Required test:

- [ ] Environment is known.
- [ ] Scenario/scope is known.
- [ ] Expected result is known.
- [ ] Result is recorded.
- [ ] Evidence location/artifact is known where available.
- [ ] Blocked/unexecuted tests are not represented as passed.

## H. Release decision

- [ ] Required test failures are resolved or explicitly accepted according to project policy.
- [ ] Blocked Required tests are visible.
- [ ] Residual risks are documented.
- [ ] “Ready” is based on results/evidence, not merely planned tests.
- [ ] Recommendation is one of Ready / Conditionally ready / Not ready / Cannot determine.
