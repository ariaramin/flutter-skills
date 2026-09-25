# Source Traceability

## Primary source

`34-Test-Before-Deploy.pdf`

Two-page Persian/English infographic attributed visually to `pouyamaroufi` / `t.me/thepoufi`.

## Page 1

Visible heading: **34 Test Before Deploy**.

### Main Tests

The page lists and explains:

- Unit Testing - smallest code units, examples Function/Class.
- Integration Testing - interaction of multiple sections.
- API Testing - Request, Response, Status Code, API behavior.
- End-to-End (E2E) Testing - complete scenario from start to finish.
- Functional Testing - Feature works according to requirement.
- Regression Testing - new changes have not broken previous capabilities.
- Smoke Testing - quick check that a new version is basically usable.
- Sanity Testing - focused review of recent changes or Bug Fixes.
- System Testing - whole system as an integrated product.
- Acceptance Testing (UAT) - product from user or Business perspective.

### Quality & Performance Tests

The page lists and explains:

- Performance Testing - speed/performance.
- Load Testing - behavior under specified load.
- Stress Testing - failure/breaking point under severe pressure.
- Spike Testing - response to sudden load increase.
- Endurance / Soak Testing - performance under long-duration load.
- Scalability Testing - ability to scale.

## Page 2

### UI & User Experience Tests

The page lists, without adjacent definitions:

- UI Testing
- Visual Regression Testing
- Cross-Browser Testing
- Cross-Device Testing
- Accessibility Testing
- Usability Testing

### Security Tests

The page lists, without adjacent definitions:

- Security Testing
- Penetration Testing (Pen Test)
- Vulnerability Testing
- Authentication & Authorization Testing
- OWASP Testing

### Production Tests

The page lists:

- Compatibility Testing
- Installation Testing
- Recovery Testing - with the explicit note that it checks recovery after Crash or Failure.
- Disaster Recovery Testing
- Backup & Restore Testing
- Migration Testing
- Monitoring & Observability Testing

The other Production test names are not further defined by the source.

## Traceability rule

When using this skill:

- Use **[PDF]** only for claims above.
- Use **[I]** for test-selection logic created to operationalize the taxonomy.
- Use **[PROJECT]** for repository/release-specific facts.
- Use **[EXTERNAL]** for outside testing guidance when explicitly introduced.
