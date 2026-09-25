# Current Flutter/Dart Guidance Snapshot

This is a **snapshot of source-backed principles**, not a substitute for re-checking version-sensitive docs.

## Architecture [F]
- Separate UI and data layers.
- Repository pattern is a strong default for data access.
- Views + ViewModels/MVVM are a strong current Flutter-team recommendation.
- Keep non-view logic out of widgets.
- `ChangeNotifier`/`Listenable` is one conditional state-update mechanism, not mandatory.
- Domain/use-case layer is conditional and should solve actual complexity/reuse.

## Navigation [F]
- `Navigator` is suitable for simple navigation.
- `Router`/routing packages suit complex deep-link/stateful routing.
- named routes are not recommended for most applications in current guidance.

## Testing [F]
- use unit, widget, and integration tests;
- keep most logic testable below widget layer;
- use enough integration coverage for important journeys.

## Performance [F]
- avoid costly repeated work in `build()`;
- localize rebuilds;
- use `const` where appropriate;
- profile with DevTools before complex optimization.

## Concurrency [D]
- `Future`/`Stream` are asynchronous event-loop constructs;
- isolates enable parallel execution with separate memory;
- use isolates for sufficiently heavy CPU work, not routine waiting I/O.

## Platform integration [F]
- use platform channels or Pigeon for native message boundaries;
- use plugin/package architecture for reusable platform capability;
- verify current toolchain before changing native build configuration.
