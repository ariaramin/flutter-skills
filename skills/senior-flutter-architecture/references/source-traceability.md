# Source Traceability

This specialization uses the existing `senior-mobile-architecture` skill as its architectural base and adds current Flutter/Dart primary documentation.

## Base skill

Source package:
`senior-mobile-architecture`

Inherited concepts include:
- requirements-first system design;
- explicit tradeoffs;
- repositories/layers;
- offline synchronization;
- pagination/prefetch;
- optimistic mutation/reconciliation;
- retry policy;
- modularity;
- app vs SDK/library architecture.

Preserve the base package's original D1/D2/C/I/S provenance if making claims about Andrey Tech.

## Official Flutter sources [F]

### Architecture overview and recommendations
- https://docs.flutter.dev/app-architecture
- https://docs.flutter.dev/app-architecture/recommendations
- https://docs.flutter.dev/app-architecture/guide
- https://docs.flutter.dev/app-architecture/concepts

Key supported points:
- UI/data separation is strongly recommended.
- repository pattern is strongly recommended.
- Views + ViewModels/MVVM are strongly recommended by the guide.
- logic should not live in widgets except simple view/layout/animation/routing logic.
- `ChangeNotifier`/`Listenable` is conditional rather than mandatory.
- domain/use-case layer is conditional for sufficiently complex/reused logic.

### Architecture case study
- https://docs.flutter.dev/app-architecture/case-study
- https://docs.flutter.dev/app-architecture/case-study/testing

Key supported points:
- repositories/services + MVVM;
- command pattern example;
- Provider for DI in the case study;
- package organization example;
- unit testing ViewModels with fake repositories.

### Offline-first
- https://docs.flutter.dev/app-architecture/design-patterns/offline-first

Key supported points:
- repository as single access/source boundary;
- repository combines local and remote services;
- offline behavior depends on product requirements.

### Navigation
- https://docs.flutter.dev/ui/navigation

Key supported points:
- `Navigator` for simple navigation;
- `Router` for more advanced deep-link/navigation needs;
- named routes are not recommended for most apps in current guidance.

### Testing
- https://docs.flutter.dev/testing/overview
- https://docs.flutter.dev/testing/integration-tests
- https://docs.flutter.dev/testing/plugins-in-tests
- https://docs.flutter.dev/testing/testing-plugins

### Performance
- https://docs.flutter.dev/perf/best-practices
- https://docs.flutter.dev/tools/devtools/performance
- https://docs.flutter.dev/perf/isolates

Key supported points:
- avoid expensive repeated work in `build()`;
- localize state changes;
- use `const` where valid;
- profile before optimizing.

### Platform integration/packages
- https://docs.flutter.dev/platform-integration/platform-channels
- https://docs.flutter.dev/packages-and-plugins/developing-packages

Key supported points:
- platform channels and Pigeon for native integration;
- plugin packages combine Dart API with platform implementations;
- current documentation describes modern FFI package workflows.

## Official Dart sources [D]

- https://dart.dev/language/concurrency
- https://dart.dev/language/async
- https://dart.dev/language/isolates
- https://dart.dev/libraries/async/async-await
- https://dart.dev/libraries/async/using-streams
- https://dart.dev/effective-dart/design

Key supported points:
- Futures/Streams and isolates form Dart's concurrency model;
- isolates have separate memory/event loops;
- async I/O and CPU parallelism are different concerns.

## Source discipline

When current toolchain details matter:
- verify Flutter SDK docs;
- verify Dart docs;
- verify package owner's primary docs/pub.dev page;
- verify Android/iOS build docs for native configuration.

Do not encode a community package's current API as permanent skill law.
