# Coverage and Gaps

## What the source supports well

The PDF provides a compact taxonomy of 34 test types and, on page 1, short intent-level descriptions for the Main and Quality & Performance categories. It also provides a definition for Recovery Testing on page 2.

This is enough to support:

- classification of testing concerns;
- distinguishing several commonly confused test intents;
- building a source-aware test inventory;
- using the categories as a release-risk checklist.

## What the source does not support on its own

The PDF does **not** provide a complete testing methodology for:

- how to implement each test;
- how much of each test type to run;
- how to prioritize by risk;
- which tests belong at PR, nightly, staging, or production gates;
- coverage targets;
- exact performance thresholds;
- load models;
- device/browser matrices;
- accessibility standard/version;
- usability research method;
- penetration-test procedure;
- vulnerability severity policy;
- OWASP version or checklist;
- disaster-recovery objectives;
- backup schedules or restore objectives;
- migration strategy;
- observability tooling or alert thresholds.

## Operational additions in this skill

To make the taxonomy usable by an AI agent, this skill adds clearly marked **[I]** reasoning for:

- selecting only tests relevant to actual risk;
- classifying tests as Required/Recommended/Not applicable/Blocked/Unknown;
- defining evidence for each required test;
- separating change-level, release-candidate, and production-readiness checks;
- issuing a release-readiness recommendation;
- mapping typical change surfaces to candidate test categories.

These are not claimed as statements from the PDF.

## If more detail is required

The agent should first use **[PROJECT]** information: product requirements, codebase, CI/CD, infrastructure, release policy, incidents, and platform support.

If the user requests external expansion or current standards, introduce that material as **[EXTERNAL]** rather than silently attributing it to the PDF.
