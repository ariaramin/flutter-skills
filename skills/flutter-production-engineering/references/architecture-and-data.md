# Architecture, Networking, and Dart Engineering Playbook

This guide covers layered architecture, network transport, state orchestration, offline data synchronization, and idiomatic Dart engineering standards for production Flutter systems.

---

## 1. Layered Application Architecture

Production Flutter systems benefit from clear layer boundaries without introducing speculative boilerplate.

```
┌─────────────────────────────────────────────────────────┐
│                    UI / Presentation Layer              │
│  - Widgets (StatelessWidget / StatefulWidget)           │
│  - Presentation state formatting & interaction capture  │
└────────────────────────────┬────────────────────────────┘
                             │ Dispatches user intents / commands
                             ▼
┌─────────────────────────────────────────────────────────┐
│               Feature Controller / View Model           │
│  - Orchestrates feature workflows                       │
│  - Manages loading, error, and presentation states      │
│  - Emits immutable view state snapshots                 │
└────────────────────────────┬────────────────────────────┘
                             │ Calls repository interfaces
                             ▼
┌─────────────────────────────────────────────────────────┐
│                   Domain Layer (Optional)               │
│  - Pure business entities & validation rules           │
│  - Use cases (introduced only when rules are shared)    │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                     Repository Layer                    │
│  - Application-facing data API                          │
│  - Coordinates persistence, memory caches & network     │
│  - Authoritative Single Source of Truth policy          │
│  - Maps external DTOs into domain models                │
└────────────────────────────┬────────────────────────────┘
                             │ Calls low-level data clients
                             ▼
┌─────────────────────────────────────────────────────────┐
│                 Data Source / Service Layer             │
│  - Raw HTTP clients (Dio, http)                         │
│  - Local databases (Drift, Hive, Isar, SharedPreferences)│
│  - Platform channels, Secure Storage, Sensor plugins    │
└─────────────────────────────────────────────────────────┘
```

### Layer Responsibilities
1. **UI / Presentation**:
   - Strictly renders state and captures user gestures.
   - Never executes direct HTTP requests, raw database SQL, or complex data transformations.
2. **Feature Controller / View Model**:
   - Manages asynchronous operation lifecycles, error reporting, and state emissions.
   - Keeps presentation state snapshots immutable.
3. **Domain Layer (Optional)**:
   - Contains pure business logic, invariants, and calculations.
   - Do not create empty forwarding "pass-through" use cases that do nothing except call `repository.getFoo()`. Introduce a domain use case only when non-trivial orchestration or reusable domain algorithms exist.
4. **Repository Layer**:
   - Acts as the boundary for data policies (e.g., cache-first, network-first, offline fallback).
   - Shields the application from third-party client API changes.
5. **Data Source / Service Layer**:
   - Handles physical transport, serialization/deserialization, headers, and platform plugins.

### Project Modularization and Structure
- **Feature-first organization**: Group code by feature (e.g., `features/authentication/`, `features/billing/`) rather than layer-first folders (`controllers/`, `views/`, `models/`). This bounds cross-feature coupling and makes ownership clear.
- **Package boundaries**: Extract distinct Dart/Flutter packages only when there is a concrete reuse boundary, ownership boundary, or independent deployment/CI test boundary (e.g., an internal design system package or shared analytics client). Do not split every folder into a separate package.

---

## 2. Networking and Transport Rules

### Keep Transport Outside Widgets
Widgets must never initiate raw HTTP requests or manage transport sockets. Transport belongs in dedicated service and repository classes.

### Prevent Duplicate and Build-Triggered Requests
**Anti-Pattern:**
```dart
// Broken: fetchProducts() creates a brand new HTTP request on every single rebuild!
FutureBuilder<List<Product>>(
  future: api.fetchProducts(),
  builder: (context, snapshot) => ...,
)
```

**Production Standard:**
- Initiate requests via explicit lifecycle events (`initState`, user tap, pull-to-refresh).
- Deduplicate in-flight requests in the repository or service so multiple simultaneous calls share the active `Future`.

### Request Timeouts
Always configure explicit connection, send, and receive timeouts:
```dart
final dio = Dio(
  BaseOptions(
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 15),
    sendTimeout: const Duration(seconds: 10),
  ),
);
```
Distinguish between timeout failures and server business errors to show actionable user recovery options.

### Cancellation and Stale Response Prevention
Flutter `Future`s cannot be arbitrarily cancelled from the outside without transport support.
- Use transport cancellation tokens (e.g., Dio's `CancelToken`) when an owning screen is disposed or an active search query is replaced.
- **Generation Tokens**: If transport cancellation is unavailable, track request generation tokens in the controller:
```dart
class SearchController extends ChangeNotifier {
  int _activeSearchId = 0;
  List<Result> results = [];

  Future<void> search(String query) async {
    final searchId = ++_activeSearchId;
    final data = await api.query(query);
    
    // Ignore stale response if a newer search was initiated
    if (searchId != _activeSearchId) return;
    
    results = data;
    notifyListeners();
  }
}
```

### Thoughtful Retry Policies
- Never blindly retry non-idempotent operations (e.g., credit card charge `POST` requests).
- Apply retries with **exponential backoff and random jitter** for transient network dropouts and idempotent read queries (`GET`).
- Stop retrying immediately on client errors (`401 Unauthorized`, `403 Forbidden`, `422 Unprocessable Entity`).

### Pagination Backpressure
- Model pagination states explicitly: `items`, `isLoadingFirstPage`, `isLoadingNextPage`, `hasReachedEnd`, `error`.
- Apply backpressure: enforce a guard flag preventing request `N+1` while request `N` is active.

### Handling Large JSON Payloads
- Decoding a 10 MB JSON response using `jsonDecode()` on the UI thread blocks frame rendering for dozens of milliseconds.
- On native platforms (Android, iOS, macOS, Windows, Linux), offload parsing of proven heavy payloads using `Isolate.run`:
```dart
Future<List<Item>> parseLargeJson(String rawJson) {
  return Isolate.run(() {
    final dynamic list = jsonDecode(rawJson);
    return (list as List).map((e) => Item.fromJson(e as Map<String, dynamic>)).toList();
  });
}
```
- On Web, `Isolate.run` runs on the main browser thread; use chunking or Web Workers for massive browser-side transformations.

### Caching and Offline Synchronization
- Specify an authoritative single source of truth (e.g., local database is source of truth; network updates write to database; UI observes database reactive streams).
- Define cache freshness, Time-To-Live (TTL), and clear invalidation policies.
- Always purge user-specific caches upon authentication logout.

---

## 3. Navigation and Deep Linking

### Declarative Routing for Production Apps
- For apps requiring deep linking, browser URL synchronization, nested routing, or authentication redirection, use declarative routing (`Router` / `go_router`).
- Do not introduce legacy string-based named routes (`Navigator.pushNamed`) as the architectural foundation for new production apps.
- Treat deep links as untrusted external user inputs: validate route parameters, missing entity IDs, and authorization guards.

### Handling Android Back Navigation
- Use `PopScope` to handle form abandonment checks and confirmation dialogs cleanly without breaking Android predictive back gestures.

---

## 4. Dart Engineering and Code Quality Rules

Follow current Effective Dart rules and maintain a clean static analysis baseline.

### Null Safety
- Model absence explicitly with nullable types (`T?`).
- **Never scatter force unwraps (`!`)** to suppress analyzer warnings. Every `!` is an unhandled runtime crash waiting to happen. Use defensive null checks, `if-case` matching, or default values (`??`).
- Late initialization (`late`) should only be used when an object's lifecycle guarantees assignment before first access (e.g., `initState`).

### Sound Static Typing
- Avoid `dynamic` and `Object?` except at low-level interop boundaries.
- At JSON, platform-channel, and external boundaries, immediately validate and deserialize raw maps into strongly typed immutable domain models. Never pass raw `Map<String, dynamic>` across business layers.

### Immutability and State
- Mark state models immutable using `final` fields.
- Use `const` constructors where possible.
- Avoid modifying collection fields in place; emit new collection instances or copy methods (`copyWith`).

### Dart Pattern Matching and Records
Use modern Dart 3+ pattern matching and records where they improve clarity:
- **Records**: Return lightweight, typed multi-value results without creating single-use tuple classes:
```dart
(double min, double max) calculateExtents(List<double> values) { ... }
```
- **Switch Expressions**: Handle state hierarchies exhaustively:
```dart
Widget buildState(ScreenState state) => switch (state) {
  Initial() => const EmptyView(),
  Loading() => const LoadingIndicator(),
  Success(:final items) => ItemList(items: items),
  Failure(:final message) => ErrorBanner(message: message),
};
```

### Sealed Class Hierarchies
Model state machines and domain variants using `sealed class` hierarchies. The Dart analyzer enforces compile-time exhaustiveness checking, guaranteeing that adding a new state variant forces all handling code to be updated:
```dart
sealed class CheckoutState {}
final class CartReview extends CheckoutState {}
final class PaymentProcessing extends CheckoutState {}
final class OrderSuccess extends CheckoutState {
  final String orderId;
  OrderSuccess(this.orderId);
}
final class OrderFailure extends CheckoutState {
  final String error;
  OrderFailure(this.error);
}
```

### Exception and Error Discipline
- Use exceptions for recoverable operational failures (network loss, disk full, invalid response).
- Catch specific exception types (`on SocketException`, `on FormatException`); never catch bare `catch (e)` and swallow silently.
- Dart `Error` (e.g., `ArgumentError`, `RangeError`) indicates programmer error or bug, not recoverable operational flow.

### Clean API Design
- Prefer clear, unambiguous naming over clever abbreviations.
- Keep public class surfaces small. Expose getters rather than mutable public fields.
- Avoid getters that perform expensive synchronous computations, network I/O, or allocate large objects on every invocation.
- Restrict extension methods to cohesive utility logic on unowned types; never build hidden global architectures out of unrelated extensions.
