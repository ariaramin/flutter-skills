# Flutter Architecture Review Checklist

## Repository inspection
- [ ] Read `pubspec.yaml`.
- [ ] Identify state/routing/network/storage/DI/codegen/test packages.
- [ ] Identify entry points/flavors.
- [ ] Identify internal packages.
- [ ] Trace a real feature read/write flow before judging structure.

## UI
- [ ] Widgets primarily render state and forward events.
- [ ] No data/business work in `build()`.
- [ ] Disposable UI resources have clear owners.
- [ ] Rebuild scope is reasonable.
- [ ] Large lists are lazy/paginated as required.
- [ ] Accessibility/localization/RTL requirements are considered.
- [ ] `BuildContext` does not leak into data/domain code.

## State
- [ ] One source of truth per datum.
- [ ] State scope matches lifetime.
- [ ] Invalid state combinations are controlled.
- [ ] One-shot effects cannot repeat accidentally.
- [ ] Async stale-result races are addressed.
- [ ] Durable state is persisted when required.

## Data
- [ ] Repositories own cohesive model data policy.
- [ ] Services isolate external sources.
- [ ] Remote/local source policy is not in UI.
- [ ] Cache freshness is defined.
- [ ] Pagination contract is explicit.
- [ ] Offline write/reconciliation is defined.
- [ ] Errors are mapped at boundaries.

## Async/lifecycle
- [ ] Futures/subscriptions/timers have owners.
- [ ] Subscriptions/controllers are disposed.
- [ ] Old requests cannot overwrite newer intent.
- [ ] Background assumptions match OS reality.
- [ ] CPU-heavy work is profiled before isolate use.

## Navigation
- [ ] Routing approach matches complexity/deep links.
- [ ] Route args are stable/minimal.
- [ ] Guards depend on explicit session/source-of-truth.
- [ ] Deep links and invalid states are handled.
- [ ] Repositories do not navigate.

## DI
- [ ] Dependencies are explicit.
- [ ] Lifetimes/scopes are understandable.
- [ ] Session state resets appropriately.
- [ ] Global service locator is not hiding architecture.
- [ ] Disposable dependencies are closed.

## Testing
- [ ] Presentation logic has focused unit tests.
- [ ] Important views have widget tests.
- [ ] Critical journeys/native seams have integration tests.
- [ ] Offline/retry/race cases are tested.
- [ ] Tests avoid arbitrary sleeps.

## Performance
- [ ] No expensive repeated work in `build()`.
- [ ] Images/data are sized/paginated intentionally.
- [ ] Large state changes do not rebuild entire app unnecessarily.
- [ ] Performance claims are measured in profile mode/DevTools.
- [ ] Optimization complexity is justified.

## Platform integration
- [ ] Native/channel details are isolated.
- [ ] Existing plugins were evaluated.
- [ ] Permissions/error/platform differences are modeled.
- [ ] Build-system changes are version-verified.
- [ ] Reusable capability is packaged appropriately.

## Modularity
- [ ] Package/module boundaries have ownership/reuse/dependency rationale.
- [ ] No cycles.
- [ ] Features do not import one another's internals.
- [ ] `core/shared` is not a dumping ground.

## Senior review output
For each major issue provide:
- symptom;
- evidence/location;
- impact;
- minimal fix;
- stronger optional refactor;
- tradeoffs;
- migration risk.
