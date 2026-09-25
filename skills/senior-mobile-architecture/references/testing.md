# Testing & Testability

## Evidence status

Andrey's current course explicitly includes **Dependency Injection & Testing** and his mind-map includes **Observability & Testing** [C]. Facebook feedback praises DI/layering [D1]. Full lesson transcripts were not accessible, so the detailed test matrix below is **S — supplemental operationalization**.

## Testability by design [D1/C/S]

A boundary is valuable when it lets tests control uncertainty:
- network responses;
- persistence;
- time;
- IDs/randomness;
- connectivity;
- auth/session;
- feature flags/config.

Avoid interface proliferation when no substitution/control is required.

## Recommended test pyramid [S]

### Unit
- state reducers/view models/state holders;
- business/domain decisions;
- pagination state machine;
- retry policy;
- merge/conflict rules;
- cache freshness decisions.

### Integration
- repository + DB + mocked/fixture network;
- storage migrations;
- offline mutation queue and recovery;
- auth refresh + request replay;
- downloader resume/finalization.

### UI
- critical user flows;
- loading/empty/error/offline states;
- navigation/deep-link restoration;
- terminal failed optimistic mutation.

## High-value failure cases [S]

- app killed after optimistic local write but before network confirmation;
- duplicate server response;
- cursor page contains overlapping item;
- refresh and load-more race;
- 429/rate-limit response;
- loss/recovery of connectivity;
- corrupt local cache;
- download interrupted and resumed;
- auth expires mid-request.

## Architecture tests [S]

For large modular codebases, enforce dependency rules automatically where tooling permits: feature modules must not reach infrastructure implementations directly; domain/policy code must not import UI framework where independence is intended.
