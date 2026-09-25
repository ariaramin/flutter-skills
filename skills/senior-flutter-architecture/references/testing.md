# Testing Flutter Architecture

## Official test categories [F]

Flutter documents:
- unit tests;
- widget tests;
- integration tests.

A healthy suite usually has many focused unit/widget tests and enough integration tests for important end-to-end use cases.

## Unit tests

Best targets:
- presentation owners/ViewModels/controllers/BLoCs;
- use-cases;
- repository policies;
- mappers;
- pagination state machines;
- retry/reconciliation;
- validation;
- pure Dart utilities.

Where possible, presentation-owner unit tests should not require widget rendering.

## Widget tests

Test:
- state → UI mapping;
- user interaction → command;
- loading/empty/error/offline/pending rendering;
- focus/semantics;
- responsive variants;
- widget-local controllers/lifecycle;
- reusable design-system components.

Avoid making every widget test boot the entire production app.

## Integration tests

Use for:
- critical business journeys;
- navigation/deep links;
- real persistence wiring;
- plugin/platform integration;
- auth/payment flows;
- background/resume behavior where testable;
- flows whose correctness depends on multiple layers.

## Golden tests [S]

Use selectively when visual regression provides value:
- design-system components;
- high-value layouts;
- multi-theme/RTL states.

Costs:
- baseline maintenance;
- font/render environment sensitivity;
- false-positive churn.

Do not replace behavior tests with screenshots.

## Fakes vs mocks

Prefer fakes for stable architectural seams when realistic state behavior matters.

Mock when:
- verifying a call contract is the point;
- creating a fake is disproportionately expensive.

Avoid mocking Flutter internals or plugin platform channels when a higher-level abstraction can be faked. Flutter's plugin testing docs warn that channel internals can change. [F]

## Test matrix by layer

### View
- renders state;
- forwards events;
- navigation/effects.

### Presentation owner
- initial load;
- refresh;
- command transitions;
- stale response handling;
- retry;
- state restoration input.

### Repository
- local/remote selection;
- cache freshness;
- offline behavior;
- sync conflicts;
- error mapping.

### Service
- request/serialization contract;
- DB queries/migrations;
- platform adapter mapping.

### Plugin
- Dart API unit tests;
- platform implementation tests;
- integration with example app.

## Async tests

Control:
- fake clocks;
- completers;
- deterministic streams;
- explicit pumping.

Do not use arbitrary sleep durations to “wait for async.”

## High-value failure cases

Test:
- request fails with previous cached content;
- refresh fails but content remains;
- pagination page fails;
- duplicate mutation;
- process restoration;
- auth expires mid-request;
- stale search response;
- offline mutation then reconnect;
- plugin unavailable/permission denied.

## Testability architecture heuristic

If testing a simple state transition requires booting Flutter bindings, a router, a real DB, and network mocks, architecture may have too much hidden coupling.
