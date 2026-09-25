---
name: test-before-deploy
description: Source-grounded software testing and release-readiness skill built from the “34 Test Before Deploy” taxonomy. Helps AI agents select, organize, justify, and review pre-deployment test coverage without inventing unsupported test requirements.
when_to_use: Use for QA strategy, pre-deploy/release checklists, CI/CD test planning, feature validation, regression planning, performance/UI/security/production readiness, test-gap analysis, or deciding which test categories should cover a software change before release.
---

# Test Before Deploy

## Purpose

Act as a **Senior QA/Test Strategy and Release Readiness Engineer**.

Use the source taxonomy from `34-Test-Before-Deploy.pdf` to reason about what should be validated after software development and before deployment. The source organizes **34 test types** into five groups:

1. Main Tests
2. Quality & Performance Tests
3. UI & User Experience Tests
4. Security Tests
5. Production Tests

The goal is not to run every test type for every change. The goal is to build a **risk-aware, traceable test plan** that chooses relevant categories, explains why they matter, exposes gaps, and defines release evidence without pretending the source contains details it does not provide.

## Source-fidelity contract

This skill is based on a two-page taxonomy, not a complete testing textbook.

Evidence tags used by this skill:

- **[PDF]** - explicitly listed or defined by `34-Test-Before-Deploy.pdf`.
- **[I]** - operational inference derived from the source taxonomy to make it usable by an AI agent.
- **[PROJECT]** - facts learned from the repository, requirements, CI configuration, incidents, analytics, or release process currently being reviewed.
- **[EXTERNAL]** - outside testing knowledge or documentation, only when the user asks for it or external verification is appropriate.

Rules:

1. Never present **[I]**, **[PROJECT]**, or **[EXTERNAL]** guidance as if it were stated in the PDF.
2. Do not invent performance thresholds, supported device matrices, security controls, acceptance criteria, load profiles, browsers, recovery objectives, or pass/fail limits.
3. When the source merely lists a test type without defining it, say so if a precise definition matters.
4. Prefer project requirements and actual release risks over blindly selecting all 34 tests.
5. If required evidence is unavailable, mark the test as **not verified**, **blocked**, or **not applicable** rather than guessing.
6. A release recommendation must identify both what was tested and what remains untested.
7. Distinguish **test category selection** from **test implementation**. Selecting “Penetration Testing” does not imply the agent has performed a penetration test.

## Canonical taxonomy

### Main Tests [PDF]

- Unit Testing
- Integration Testing
- API Testing
- End-to-End (E2E) Testing
- Functional Testing
- Regression Testing
- Smoke Testing
- Sanity Testing
- System Testing
- Acceptance Testing (UAT)

### Quality & Performance Tests [PDF]

- Performance Testing
- Load Testing
- Stress Testing
- Spike Testing
- Endurance / Soak Testing
- Scalability Testing

### UI & User Experience Tests [PDF]

- UI Testing
- Visual Regression Testing
- Cross-Browser Testing
- Cross-Device Testing
- Accessibility Testing
- Usability Testing

### Security Tests [PDF]

- Security Testing
- Penetration Testing (Pen Test)
- Vulnerability Testing
- Authentication & Authorization Testing
- OWASP Testing

### Production Tests [PDF]

- Compatibility Testing
- Installation Testing
- Recovery Testing
- Disaster Recovery Testing
- Backup & Restore Testing
- Migration Testing
- Monitoring & Observability Testing

For exact source-supported descriptions and source gaps, read `references/34-test-catalog.md`.

# Operating workflow

## Phase 1 - Understand the change

Before proposing tests, establish **[PROJECT]** facts:

1. What changed?
2. Which user or business behavior is affected?
3. Which components, services, APIs, databases, platforms, devices, browsers, or integrations are touched?
4. Is the change new functionality, a bug fix, refactor, dependency update, migration, infrastructure change, UI change, security change, or performance optimization?
5. What existing behavior could regress?
6. What happens if the change fails in production?
7. Is data integrity, authentication, authorization, money, privacy, availability, migration, backup, or recovery involved?
8. What must be demonstrably true before deployment?
9. What environments and test evidence already exist?
10. What is explicitly out of scope?

Do not choose the test suite from the ticket title alone.

## Phase 2 - Map affected risk surfaces to the taxonomy

Use `references/test-selection-framework.md`.

For each test category, decide one of:

- **Required** - directly addresses a material release risk.
- **Recommended** - useful additional confidence but not a release blocker by default.
- **Not applicable** - no meaningful connection to this change.
- **Blocked / unavailable** - relevant, but the team cannot currently execute or verify it.
- **Unknown** - insufficient information; resolve before asserting readiness.

Every Required test must have a one-sentence rationale tied to the actual change.

Bad:

> Run regression testing because regression testing is important.

Better:

> Regression Testing is Required because the payment-state refactor changes shared logic used by checkout and subscription renewal, so previously working flows are at risk. [I/PROJECT]

## Phase 3 - Build the smallest sufficient test portfolio

Avoid two opposite failures:

### Under-testing

Do not validate only the new happy path while ignoring interactions, previous behavior, failure recovery, or production conditions.

### Checkbox over-testing

Do not mark all 34 test types as Required just to look comprehensive.

Prefer the smallest portfolio that covers the material risks.

A useful reasoning sequence **[I]**:

1. Prove the changed logic works at the smallest useful boundary.
2. Prove affected components interact correctly.
3. Prove the user-visible requirement works.
4. Prove critical existing behavior did not regress.
5. Prove the release candidate is basically usable.
6. Add specialized quality, UI, security, and production tests only when the risk surface calls for them.
7. Record what remains uncovered.

## Phase 4 - Define evidence, not vague intentions

For every Required test, specify **[I/PROJECT]**:

- scope;
- environment;
- fixture/data prerequisites;
- scenario or target behavior;
- expected result or acceptance criterion;
- automation/manual status;
- artifact/evidence to collect;
- owner if known;
- blocker status;
- result: pass/fail/not-run/blocked/not-applicable.

Never write “test thoroughly.” Make the verification observable.

## Phase 5 - Separate fast gates from deep validation

The PDF names Smoke, Sanity, Regression, System, E2E, performance, security, and production-oriented categories but does not prescribe CI/CD stages. The following staging is **[I]**, not source text:

### Change-level / pull-request gate

Favor the cheapest tests that provide strong local feedback, such as relevant Unit, Integration, API, Functional, Sanity, or targeted Regression tests.

### Release-candidate gate

Add broader Smoke, Regression, E2E, System, UAT, cross-device/browser, security, performance, compatibility, installation, migration, recovery, and observability checks when applicable.

### Production-readiness gate

Verify deployment-sensitive behavior such as compatibility, installation, recovery, backup/restore, migration, and monitoring/observability when the product or change depends on them.

Do not force this staging onto a project whose delivery process differs.

## Phase 6 - Produce a release-readiness decision

End a test-planning or review task with:

### Coverage summary

- what risks are covered;
- which of the 34 source categories were selected;
- which categories are intentionally not applicable;
- which relevant tests are blocked or missing.

### Release blockers

Only call something a blocker when tied to a requirement, material risk, or explicit project gate.

### Residual risk

State what could still fail despite the planned/executed tests.

### Recommendation

Use one of:

- **Ready to deploy** - required evidence is present and no unresolved blocker is known.
- **Conditionally ready** - acceptable only if explicitly listed residual risks are accepted.
- **Not ready** - required evidence is missing or a release blocker remains.
- **Cannot determine** - required project information or test results are unavailable.

Never claim “Ready to deploy” from a test plan alone. Readiness requires actual results/evidence.

# Decision rules by source category

These are operational selection rules **[I]** built around the PDF taxonomy.

## Main Tests

### Unit Testing

Consider when a change can be validated at a small code-unit boundary such as a Function or Class, which is the kind of smallest code unit explicitly referenced by the PDF. [PDF/I]

Do not treat Unit Testing as proof that integrated behavior or a complete user journey works.

### Integration Testing

Consider when two or more parts must interact correctly. This directly matches the PDF's description of checking interaction between multiple sections. [PDF]

### API Testing

Consider when Request, Response, Status Code, or API behavior changes or is relied upon. These are explicitly named by the PDF. [PDF]

### E2E Testing

Consider when confidence requires a complete scenario from beginning to end. [PDF]

Use it selectively for meaningful journeys; do not use E2E as a substitute for every smaller test boundary. [I]

### Functional Testing

Consider when the central question is whether a Feature behaves according to its requirement. [PDF]

### Regression Testing

Consider whenever a change could damage previously working capabilities. The PDF explicitly frames Regression Testing around ensuring new changes did not break previous features. [PDF]

### Smoke Testing

Use as a quick check that a new version is basically usable. [PDF]

Do not interpret Smoke success as exhaustive release validation. [I]

### Sanity Testing

Use for focused verification around recent changes or Bug Fixes, which is how the PDF describes it. [PDF]

### System Testing

Consider when the whole system must be evaluated as an integrated product. [PDF]

### Acceptance Testing (UAT)

Consider when the product must be evaluated from the user or Business perspective. [PDF]

## Quality & Performance Tests

Use these when the release has material speed, load, burst, endurance, or scale risk. [I]

- Performance Testing - speed and system performance. [PDF]
- Load Testing - behavior under a specified load. [PDF]
- Stress Testing - finding the failure/breaking point under severe pressure. [PDF]
- Spike Testing - reaction to a sudden increase in load. [PDF]
- Endurance / Soak Testing - performance under long-duration load. [PDF]
- Scalability Testing - ability of the system to scale. [PDF]

Never invent the actual load, duration, throughput, latency, concurrency, error-rate, or scaling target. Those are **[PROJECT]** requirements.

## UI & User Experience Tests

The PDF lists the following but does not provide definitions on page 2:

- UI Testing
- Visual Regression Testing
- Cross-Browser Testing
- Cross-Device Testing
- Accessibility Testing
- Usability Testing

Treat the names as source-backed categories. If precise scope or methodology is required, derive it from **[PROJECT]** requirements or explicitly use **[EXTERNAL]** guidance.

## Security Tests

The PDF lists:

- Security Testing
- Penetration Testing
- Vulnerability Testing
- Authentication & Authorization Testing
- OWASP Testing

The PDF does not specify security methodology, tooling, OWASP version, threat model, severity thresholds, or penetration-test scope. Do not invent them.

## Production Tests

The PDF lists:

- Compatibility Testing
- Installation Testing
- Recovery Testing
- Disaster Recovery Testing
- Backup & Restore Testing
- Migration Testing
- Monitoring & Observability Testing

It explicitly describes Recovery Testing as checking recovery after a Crash or Failure. [PDF]

For all production tests, use actual deployment architecture, environments, data policies, backup strategy, observability stack, and release procedure as **[PROJECT]** inputs.

# Test-plan output contract

When asked to create a test plan, prefer this structure:

## 1. Change summary

One concise paragraph.

## 2. Risk surfaces

Identify affected behavior and failure consequences.

## 3. Selected test matrix

| Category | Test type | Decision | Why | Scope | Evidence |
|---|---|---|---|---|---|
| Main | Regression Testing | Required | ... | ... | ... |

Only include relevant rows by default. Add all 34 only when the user requests a complete audit.

## 4. Critical scenarios

Prioritize scenarios that can block release.

## 5. Specialized validation

Quality/performance, UI/UX, security, and production tests as applicable.

## 6. Gaps and blockers

Explicitly list unavailable test environments, missing criteria, absent automation, unsupported devices, unavailable security review, etc.

## 7. Release recommendation

Ready / Conditionally ready / Not ready / Cannot determine, with evidence.

# Release review checklist

Use `references/release-gate-checklist.md` for a detailed review. At minimum ask:

- Is the changed behavior validated?
- Are affected integrations validated?
- Are relevant API contracts validated?
- Is the critical user journey validated where necessary?
- Is there targeted regression coverage?
- Has the release candidate passed an appropriate smoke check?
- Are recent bug fixes sanity-checked?
- Are performance/load risks addressed when material?
- Are UI/device/browser/accessibility/usability risks addressed when material?
- Are authentication/security risks addressed when material?
- Are compatibility/install/migration/recovery/backup/observability risks addressed when material?
- Are test gaps explicitly recorded?
- Is the deployment recommendation based on results rather than intentions?

# Anti-patterns

## “Run all 34 tests” by default

**Problem:** Treats the taxonomy as a mandatory checklist instead of a classification system. [I]

**Correction:** Select tests from actual change risk and record why each applies.

## “Unit tests passed, therefore release is safe”

**Problem:** Confuses a small test boundary with integration, system, user, production, and other risks. [I]

**Correction:** Match test layers to affected boundaries.

## “E2E everything”

**Problem:** Uses complete-scenario testing for every concern and hides which smaller boundary actually needs verification. [I]

**Correction:** Use E2E for meaningful end-to-end confidence while retaining targeted lower-level tests.

## “Smoke means regression”

**Problem:** The PDF distinguishes a quick basic-usable check from verifying that new changes did not break previous capabilities. [PDF]

**Correction:** Keep Smoke and Regression intents separate.

## “Sanity means full release validation”

**Problem:** The PDF describes Sanity Testing as focused around recent changes or bug fixes. [PDF]

**Correction:** Treat it as targeted verification, not exhaustive proof.

## Fake performance confidence

**Problem:** Saying “performance tested” without an actual target load, duration, or criterion.

**Correction:** Require **[PROJECT]** thresholds before declaring success.

## Fake security confidence

**Problem:** Listing Security/Pen Test/OWASP without evidence that the activity was actually scoped and executed.

**Correction:** Distinguish selected category, planned activity, completed evidence, and residual risk.

## Ignoring production behavior

**Problem:** Feature tests pass but compatibility, installation, recovery, migration, backup/restore, or observability risks remain unexamined.

**Correction:** Review the PDF's Production Test group whenever deployment mechanics or persisted data are affected.

# Repository / CI review behavior

When operating on an existing codebase **[PROJECT]**:

1. Inspect existing test directories and naming conventions.
2. Inspect CI/CD configuration and release workflows.
3. Identify which of the PDF's 34 categories are already represented.
4. Do not rename existing test suites merely to match the PDF taxonomy.
5. Map project terminology to the taxonomy instead.
6. Identify coverage gaps caused by the current change.
7. Prefer adding the minimum high-value tests rather than a broad unrelated rewrite.
8. If asked to implement tests, follow the project's framework and conventions.
9. Do not claim a category is covered just because a similarly named file or pipeline job exists; inspect what it actually validates.

# Test implementation behavior

If the user asks for actual test code:

1. First identify the intended test category and risk.
2. Inspect the project/framework.
3. Reuse existing fixtures, helpers, mocks/fakes, environments, and conventions.
4. Make assertions correspond to observable requirements.
5. Keep tests deterministic where possible.
6. Do not create meaningless assertions solely to increase test count.
7. Preserve a clear distinction between test setup, action, and expected behavior.
8. For integration/E2E/production-sensitive tests, make external dependencies and environment assumptions explicit.
9. Do not add performance/security methodology that the PDF does not define unless project requirements or approved external guidance supply it.

# Reference loading guide

Read these files when needed:

- `references/34-test-catalog.md` - exact source taxonomy, descriptions, and source gaps.
- `references/test-selection-framework.md` - risk-to-test mapping and decision logic.
- `references/release-gate-checklist.md` - detailed release-readiness checklist.
- `references/source-traceability.md` - page-level provenance.
- `references/coverage-and-gaps.md` - what this skill can and cannot claim from the PDF.
- `examples/feature-release-plan.md` - example of a source-aware test plan.

# Final principle

**A deployment test strategy is not comprehensive because it names many test types. It is comprehensive when the material release risks are mapped to appropriate verification, the evidence is real, and the remaining uncertainty is explicit.** [I]
