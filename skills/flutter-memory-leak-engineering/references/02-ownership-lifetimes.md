# Ownership, Flutter Lifetimes, State, DI, and Async Resources

> Preserved from the supplied research/engineering guide. Use this reference only when the active task needs these details.

## Contents

- Ownership and Lifetimes
  - Creator-owned
  - Externally owned
- Flutter Resource Lifecycle Table
- Scope and Ownership Architecture
  - Scope inversion
- BuildContext Retention
  - Closure nuance
- Closure Retention
  - Shared closure contexts
- Static/Global Retention
- Cache vs Leak
  - Healthy cache
  - Problematic cache
- Widget Leak Testing
- Route Lifecycle Testing
- Repeated Navigation Testing
- State Management Integration
  - Bloc/Cubit
  - ChangeNotifier
- Dependency Injection Integration
  - Bad graph
  - Good graph
  - Session scope
- Async Lifecycle
  - Generation guard
- Common Flutter Leak Sources

---

# Ownership and Lifetimes

Ask these questions for every resource:

1. Who creates it?
2. Who owns it?
3. Can ownership transfer?
4. What event ends ownership?
5. Does it require explicit cleanup?
6. Can it outlive the creator?
7. Can a longer-lived object retain it?
8. Does replacement require cleanup before reassignment?

## Creator-owned

```dart
class PageState extends State<Page> {
  final controller = TextEditingController();

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }
}
```

## Externally owned

If a parent passes a controller:

```dart
final class SearchField extends StatelessWidget {
  const SearchField({
    super.key,
    required this.controller,
  });

  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
    );
  }
}
```

`SearchField` should not dispose it.

Ownership is not determined by who can access an object.

---

# Flutter Resource Lifecycle Table

| Resource | Typical owner | Cleanup |
|---|---|---|
| `TextEditingController` | Creating `State` / component | `dispose()` |
| `FocusNode` | Creating `State` / component | `dispose()` |
| `ScrollController` | Creator unless externally provided | `dispose()` |
| `AnimationController` | `State` using `TickerProvider` | `dispose()` |
| `ValueNotifier<T>` | Creator | `dispose()` |
| `ChangeNotifier` | Creator/provider depending ownership | `dispose()` |
| `StreamSubscription<T>` | Object that calls `listen()` | `cancel()` |
| `Timer` | Object that starts timer | `cancel()` |
| Bloc/Cubit created manually | Creator | `close()` |
| Bloc/Cubit created by owning provider | Provider | Provider-owned close |
| `OverlayEntry` created manually | Creator | `remove()` then `dispose()` |
| App socket | App/session service | `close()` |
| Session socket | Session scope | `close()` on logout/scope end |
| Database watcher/subscription | Subscriber owner | cancel/close according API |
| Route observer subscription | Subscriber | unsubscribe |
| Custom listener registration | Registrant | matching remove |
| Custom controller | Creating scope | documented `dispose()`/`close()` |

Flutter documentation for `AnimationController`, `FocusNode`, `ScrollController`, `ChangeNotifier`, and `OverlayEntry` follows explicit owner cleanup semantics.

---

# Scope and Ownership Architecture

Prefer a lifetime hierarchy:

```text
Application scope
├── logger
├── analytics
├── app config
└── long-lived infrastructure

Session scope
├── authenticated socket
├── session cache
├── user repositories
└── session observers

Feature / route scope
├── Bloc / Cubit
├── feature controller
├── route subscription
└── temporary data coordinator

Widget scope
├── TextEditingController
├── FocusNode
├── ScrollController
└── AnimationController
```

## Scope inversion

Treat this as suspicious:

```text
Long-lived object
      ↓
strong reference
      ↓
Short-lived object
```

Examples:

```text
singleton → BuildContext
singleton → route controller
app service → State
static callback → page model
global event bus → unremoved page listener
```

A shorter-lived object depending on a longer-lived service is normal.

The reverse reference deserves review.

---

# BuildContext Retention

`BuildContext` is tied to an element in the widget tree.

Keeping one in a long-lived object can retain more of the widget tree than intended.

Bad:

```dart
final class AppService {
  BuildContext? context;

  void attach(
    BuildContext value,
  ) {
    context = value;
  }
}
```

Better: pass the operation or data at the point of use.

```dart
final class SessionService {
  SessionService(this._logout);

  final Future<void> Function() _logout;

  Future<void> logout() {
    return _logout();
  }
}
```

## Closure nuance

A short-lived callback capturing context is not automatically a leak.

The risk is lifetime mismatch:

```text
closure lifetime > widget/context lifetime
```

Flutter DevTools memory documentation explicitly notes that long-lived closures can retain a `BuildContext` and therefore associated widget-tree objects.

---

# Closure Retention

Closures strongly capture referenced objects.

Potentially dangerous:

```dart
final class GlobalEventBus {
  final List<VoidCallback> _callbacks =
      <VoidCallback>[];

  void addListener(
    VoidCallback callback,
  ) {
    _callbacks.add(callback);
  }

  void removeListener(
    VoidCallback callback,
  ) {
    _callbacks.remove(callback);
  }

  void emit() {
    for (final callback
        in List<VoidCallback>.of(_callbacks)) {
      callback();
    }
  }
}
```

Page:

```dart
class EventPageState extends State<EventPage> {
  EventPageState(this.eventBus);

  final GlobalEventBus eventBus;

  @override
  void initState() {
    super.initState();
    eventBus.addListener(_onEvent);
  }

  void _onEvent() {
    if (!mounted) {
      return;
    }

    setState(() {});
  }

  @override
  void dispose() {
    eventBus.removeListener(_onEvent);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return const SizedBox.shrink();
  }
}
```

Without `removeListener`, the bus can retain the `State`.

## Shared closure contexts

First-party leak-tracker troubleshooting also notes that multiple closures created in one lexical context can share captured state. A live closure can therefore keep data referenced by sibling closures alive. Converting callbacks to explicit instance methods can sometimes clarify and reduce capture.

---

# Static/Global Retention

Inspect:

```dart
static final Map<String, Object> cache = {};
```

and:

```dart
final globalListeners = <VoidCallback>[];
```

for:

- boundedness;
- removal policy;
- lifecycle;
- weak-vs-strong reference needs;
- session separation.

A global collection retaining an object forever is not automatically a bug if that is its intended lifetime.

It becomes a problem when its ownership contract says entries should leave.

---

# Cache vs Leak

A cache is intentional retention.

A leak is unintended retention.

## Healthy cache

Has at least one of:

- size bound;
- TTL;
- LRU eviction;
- lifecycle reset;
- memory-pressure response;
- explicit clear policy.

Example:

```dart
final class BoundedCache<K, V> {
  BoundedCache({
    required this.maximumEntries,
  }) : assert(maximumEntries > 0);

  final int maximumEntries;

  final Map<K, V> _entries =
      <K, V>{};

  V? get(K key) {
    final value =
        _entries.remove(key);

    if (value != null) {
      _entries[key] = value;
    }

    return value;
  }

  void put(
    K key,
    V value,
  ) {
    _entries.remove(key);
    _entries[key] = value;

    while (_entries.length >
        maximumEntries) {
      _entries.remove(
        _entries.keys.first,
      );
    }
  }

  void clear() {
    _entries.clear();
  }
}
```

## Problematic cache

```text
Every API response ever seen
↓
static map
↓
no TTL
↓
no size bound
↓
never cleared
```

Leak tracker may not report that pattern if the entries are ordinary reachable uninstrumented objects.

Use heap profiling and application-level cache metrics.

---

# Widget Leak Testing

A good widget leak test has three phases:

```text
Mount
↓
Exercise
↓
Unmount
```

Example:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:leak_tracker_flutter_testing/leak_tracker_flutter_testing.dart';

void main() {
  testWidgets(
    'search field releases controller resources',
    (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: SearchScreen(),
        ),
      );

      await tester.enterText(
        find.byType(TextField),
        'flutter',
      );

      await tester.pumpWidget(
        const MaterialApp(
          home: SizedBox.shrink(),
        ),
      );

      await tester.pumpAndSettle();
    },
    experimentalLeakTesting:
        LeakTesting.settings,
  );
}

final class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() {
    return _SearchScreenState();
  }
}

final class _SearchScreenState
    extends State<SearchScreen> {
  late final TextEditingController
      _controller;

  @override
  void initState() {
    super.initState();
    _controller =
        TextEditingController();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: TextField(
        controller: _controller,
      ),
    );
  }
}
```

Do not end a test while the widget is still intentionally mounted and then classify its controller as leaked.

---

# Route Lifecycle Testing

Test navigation lifetimes explicitly.

```text
Open route
↓
Create controllers/subscriptions
↓
Use route
↓
Pop route
↓
Finish transition
↓
Verify lifecycle cleanup
```

Example:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:leak_tracker_flutter_testing/leak_tracker_flutter_testing.dart';

void main() {
  testWidgets(
    'details route disposes its focus node',
    (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: RouteHost(),
        ),
      );

      await tester.tap(
        find.text('Open details'),
      );
      await tester.pumpAndSettle();

      expect(
        find.byType(DetailsPage),
        findsOneWidget,
      );

      await tester.pageBack();
      await tester.pumpAndSettle();

      expect(
        find.byType(DetailsPage),
        findsNothing,
      );
    },
    experimentalLeakTesting:
        LeakTesting.settings,
  );
}

final class RouteHost extends StatelessWidget {
  const RouteHost({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: FilledButton(
          onPressed: () {
            Navigator.of(context).push<void>(
              MaterialPageRoute<void>(
                builder: (_) {
                  return const DetailsPage();
                },
              ),
            );
          },
          child:
              const Text('Open details'),
        ),
      ),
    );
  }
}

final class DetailsPage extends StatefulWidget {
  const DetailsPage({super.key});

  @override
  State<DetailsPage> createState() {
    return _DetailsPageState();
  }
}

final class _DetailsPageState
    extends State<DetailsPage> {
  late final FocusNode _focusNode;

  @override
  void initState() {
    super.initState();
    _focusNode = FocusNode();
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(),
      body: TextField(
        focusNode: _focusNode,
      ),
    );
  }
}
```

Finish route transitions before expecting route-owned objects to disappear.

---

# Repeated Navigation Testing

Some retention bugs only become obvious after repetition.

Pattern:

```text
Open feature
↓
Close feature
↓
repeat 20 times
↓
inspect lifecycle failures / heap growth
```

Leak tests can catch repeated undisposed tracked objects.

Heap profiling is better when the suspected problem is:

```text
10 cycles → 10 MB growth
20 cycles → 20 MB growth
```

with no tracked lifecycle failure.

Do not use an arbitrary repeat count as a universal leak threshold.

Use repetition to make a stable reproduction.

---

# State Management Integration

Ownership rules remain the same across Bloc/Cubit, Provider, Riverpod, ChangeNotifier, and custom state systems.

## Bloc/Cubit

If code manually creates a Bloc/Cubit:

```dart
final cubit = ProfileCubit(
  repository,
);
```

the creator owns `close()` unless ownership is explicitly transferred.

If an owning provider creates it, the provider can own closing.

Do not:

```text
route-scoped Cubit
↓
register as app singleton
```

unless state is genuinely app-scoped.

## ChangeNotifier

If a widget creates it manually:

```dart
late final SearchController controller;
```

dispose it.

If a provider owns it, do not double-dispose from the child.

---

# Dependency Injection Integration

DI containers are common causes of lifetime inversion.

## Bad graph

```text
GetIt app singleton
↓
route-scoped controller
↓
TextEditingController
```

Even if the page is gone, the global singleton still retains the route graph.

## Good graph

```text
App scope
↓
Repository

Route scope
↓
Controller
↓
Repository
```

Long-lived dependency flows downward.

Short-lived controller does not flow upward.

## Session scope

On logout:

```text
pop/reset session DI scope
↓
dispose session subscriptions
↓
close session socket
↓
release user caches/controllers
```

Leak tests are useful for verifying scope boundaries when tracked Flutter objects sit inside the retained graph.

---

# Async Lifecycle

An async operation can outlive its widget.

```dart
Future<void> load() async {
  final result =
      await repository.fetch();

  if (!mounted) {
    return;
  }

  setState(() {
    data = result;
  });
}
```

The `mounted` check prevents invalid UI mutation.

It does **not**:

- cancel the request;
- cancel a timer;
- release a closure before the Future completes;
- unsubscribe a stream;
- remove a listener.

If the operation supports cancellation and the owner no longer needs it, cancel it.

## Generation guard

For non-cancelable Futures:

```dart
class SearchState extends State<SearchPage> {
  int _generation = 0;
  String _result = '';

  Future<void> search(
    String query,
  ) async {
    final generation =
        ++_generation;

    final result =
        await widget.repository
            .search(query);

    if (!mounted ||
        generation != _generation) {
      return;
    }

    setState(() {
      _result = result;
    });
  }

  @override
  void dispose() {
    _generation++;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Text(_result);
  }
}
```

This prevents stale completion from mutating current state.

It still does not make a non-cancelable Future disappear early.

---

# Common Flutter Leak Sources

Review these first:

- `TextEditingController`;
- `FocusNode`;
- `ScrollController`;
- `AnimationController`;
- `Ticker`;
- `ChangeNotifier`;
- `ValueNotifier`;
- `StreamSubscription`;
- periodic `Timer`;
- manually registered listeners;
- callbacks stored in singleton services;
- `OverlayEntry`;
- manually owned Bloc/Cubit;
- event-bus subscriptions;
- route observers;
- navigation listeners;
- dependency-injection scopes;
- WebSocket clients;
- database watchers;
- image caches;
- static collections;
- custom caches;
- async closures;
- `BuildContext` retained by long-lived callbacks.

---

