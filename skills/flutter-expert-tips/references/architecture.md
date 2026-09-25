# Architecture and Maintainability

## Architecture goals

Optimize for:

- clear dependency direction;
- explicit state ownership;
- testable policies;
- replaceable volatile infrastructure where realistic;
- feature discoverability;
- minimal ceremony.

## Feature-first vs layer-first

The Bizzotto corpus explicitly discusses feature-first/layer-first organization. Normalize the decision:

### Prefer feature-oriented grouping when

- the app has multiple user-facing features;
- developers usually change UI/state/data for one feature together;
- feature ownership/modules matter.

Example:

```text
lib/
  core/
  features/
    checkout/
      data/
      domain/   # only if domain abstractions earn their cost
      presentation/
    profile/
      ...
```

### Layer-oriented grouping can be fine when

- app is small;
- layer boundaries dominate development flow;
- team conventions make navigation predictable.

Do not reorganize a stable codebase for taxonomy aesthetics alone.

## Repository pattern

Repositories are valuable when they:

- aggregate/cache multiple data sources;
- translate infrastructure errors/models;
- define an application/domain-facing persistence/query contract;
- enable tests/fakes;
- isolate a volatile backend.

Avoid “repository per endpoint” wrappers that only forward one method with no policy/seam benefit.

## Program to interfaces, selectively

An abstract interface is justified when at least one is true:

- production and fake/test implementations exist;
- backend/provider may realistically change;
- the boundary protects domain/application code from vendor types;
- multiple implementations are already needed.

Do not add an interface to every final class by default.

## Backend-agnostic design

Useful at deliberate boundaries. Keep Firebase/Dio/SQLite/platform types from leaking throughout app state/domain code where replacement/testing matters.

But not every SDK must be wrapped. UI-specific framework APIs can stay in presentation; thin wrappers around stable primitives may add no value.

## State ownership

Use a single source of truth for durable state.

Separate:

- ephemeral widget state (focus, controller, animation, local expansion);
- feature/application state (loading/data/failure, selections that survive rebuilds);
- persistent/domain data;
- cross-cutting service state (auth/connectivity/config) with explicit scope.

## State-management packages

The source corpus is heavily Riverpod-oriented and also includes Bloc/Hooks. Treat package recipes as examples.

Agent behavior:

1. identify the project's existing state system;
2. follow its idioms;
3. apply universal principles (ownership, side effects, cancellation, immutability, testability);
4. do not migrate packages during unrelated work.

## Immutability

Immutable state/models reduce accidental shared mutation and make equality/change reasoning easier. Prefer creating new state values rather than mutating a published state object.

Do not deep-copy giant graphs unnecessarily; choose data structures and state granularity thoughtfully.

## Initialization

Explicitly model app readiness:

- bootstrap required dependencies;
- render a startup/loading/error state;
- inject ready dependencies;
- lazy-init optional/feature dependencies where appropriate.

Avoid starting critical async initialization in random widget builds.

## Global variables and singletons

Global constants/stateless service locators are not automatically harmful; global **mutable hidden state** is the danger.

Singleton drawbacks include:

- test order coupling;
- hidden dependencies;
- lifecycle ambiguity;
- difficult replacement.

Use dependency injection/explicit constructors when a dependency affects behavior and tests.

## Side-effect boundaries

Keep rendering declarative; place effects in controllers/state/effect listeners/services.

A useful flow:

```text
UI event -> state/controller intent -> use case/repository -> result
        <- state update/effect decision <-
```

Do not force every app to use “use case” classes. A controller can call a repository directly in a simple feature.

## Error model

Translate recoverable infrastructure failures at a meaningful boundary into project-level failures/result values when callers need typed handling.

Preserve unexpected errors and stacks. Avoid a single `Failure.unknown` that erases diagnostic information.

## Dependency volatility

Wrap high-volatility/vendor services more aggressively when switching cost matters: analytics, crash reporting, remote config, backend gateways, payments. Keep the interface focused on product needs rather than mirroring vendor APIs.

## Overengineering test

Before adding a layer ask:

- What dependency does this isolate?
- What policy belongs here?
- What test becomes easier?
- What future change becomes cheaper?
- Is that change plausible?

If answers are weak, keep the code local.
