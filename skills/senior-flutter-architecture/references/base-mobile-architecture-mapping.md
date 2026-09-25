# Base Mobile Architecture → Flutter Mapping

This skill is a specialization, not a replacement, of the source `senior-mobile-architecture` reasoning model.

## Requirements before architecture [B-D1/B-C]

Base rule:
> Requirements, constraints, contracts, state/data flow, architecture, deep dives, tradeoffs/tests.

Flutter translation:
- do not start from `Bloc`, `Riverpod`, `Provider`, `GetIt`, `go_router`, or folder templates;
- first determine the product state machine, data ownership, offline requirements, lifecycle behavior, and native/platform boundaries;
- package choices implement architecture; they do not define it.

## Presentation / domain / data [B-D1 + F]

Base rule:
> Separate responsibilities when complexity earns it.

Flutter translation:
- Views/widgets render and forward events;
- ViewModels/controllers/notifiers/BLoCs own presentation state and commands;
- repositories are sources of truth for model data;
- services/data sources isolate remote/local/platform boundaries;
- use-cases/domain objects are optional and should exist only for complex/reused orchestration.

## Mobile data as synchronization [B-D1]

Flutter translation:
- a repository can expose `Future`, `Stream`, or state snapshots;
- local DB/cache and remote API are coordinated behind the repository;
- UI should not decide whether local or remote wins;
- pending offline writes need identity/status if they survive process death.

## Explicit state [B-D1/B-I]

Flutter translation:
Avoid:
```dart
bool isLoading;
bool hasError;
T? data;
```
when combinations can become invalid.

Prefer a state model that makes legal transitions visible, whether implemented with sealed classes, generated unions, enums + immutable data, BLoC states, Riverpod async state, or another project convention.

## Pagination and prefetch [B-D1/B-D2]

Flutter translation:
- pagination belongs to repository/presentation policy, not `ListView.builder` alone;
- list widgets request the next page based on scroll/access pattern;
- state owns cursor/hasMore/loadingNextPage/errorNextPage;
- prefetch threshold should be measured and tuned.

## Retry policy [B-D1]

Flutter translation:
- classify errors before retry;
- bound retries and use backoff/jitter;
- avoid rebuilding a widget to “retry” implicitly;
- keep retry ownership outside `build()`;
- protect non-idempotent writes.

## App vs SDK/library design [B-D2/B-C]

Flutter translation:
- app code can optimize for product ownership and internal evolution;
- package/plugin APIs must optimize for stable public contracts, lifecycle, platform capability, error semantics, and backwards compatibility.

## Modularity [B-D1/B-I]

Flutter translation:
- directories are not modules;
- Dart/Flutter packages create stronger dependency/build/API boundaries;
- split only when ownership, reuse, compile/build isolation, release cadence, or dependency control earns the cost.

## Tradeoff reasoning [B-D1/B-C]

For any architectural recommendation, include:
- why;
- benefits;
- costs;
- alternatives;
- switch condition;
- migration impact if code already exists.
