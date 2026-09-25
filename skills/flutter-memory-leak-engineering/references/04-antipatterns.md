# Common Memory Lifecycle Anti-Patterns

> Preserved from the supplied research/engineering guide. Use this reference only when the active task needs these details.

## Contents

- Common Anti-Patterns
  - 1. TextEditingController without disposal
  - 2. FocusNode without disposal
  - 3. AnimationController without disposal
  - 4. StreamSubscription never canceled
  - 5. Timer never canceled
  - 6. Listener registered but never removed
  - 7. Listener registered repeatedly
  - 8. BuildContext retained in singleton
  - 9. State retained through global callback
  - 10. Route controller stored in app singleton
  - 11. Static map never cleared
  - 12. Unbounded cache
  - 13. Manually created Bloc/Cubit never closed
  - 14. Wrong GetIt singleton lifetime
  - 15. Session resources survive logout
  - 16. Async callback retains disposed widget state
  - 17. `mounted` used as cleanup
  - 18. Assuming `dispose()` means unretained
  - 19. Assuming GC proves proper cleanup
  - 20. Silencing every report
  - 21. Broad ignore rules
  - 22. Leak test runs before owner is released
  - 23. Test depends on exact GC timing
  - 24. Background timers survive between tests
  - 25. Maximum diagnostics everywhere
  - 26. RSS growth treated as proof of a leak
  - 27. Passing leak tests treated as proof of no memory problems
  - 28. OverlayEntry disposed without removal
  - 29. Disposed child still stored by owner
  - 30. Closure captures huge short-lived object

---

# Common Anti-Patterns

## 1. TextEditingController without disposal

**Bad**

```dart
final class SearchPage extends StatefulWidget {
  const SearchPage({super.key});

  @override
  State<SearchPage> createState() {
    return _SearchPageState();
  }
}

final class _SearchPageState
    extends State<SearchPage> {
  final TextEditingController controller =
      TextEditingController();

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
    );
  }
}
```

**Why it is problematic**

The state creates and owns the controller but never disposes it.

**Better**

```dart
final class SearchPage extends StatefulWidget {
  const SearchPage({super.key});

  @override
  State<SearchPage> createState() {
    return _SearchPageState();
  }
}

final class _SearchPageState
    extends State<SearchPage> {
  final TextEditingController controller =
      TextEditingController();

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
    );
  }
}
```

---

## 2. FocusNode without disposal

**Bad**

```dart
final class FormStateOwner {
  final FocusNode focusNode = FocusNode();
}
```

**Why it is problematic**

No lifecycle boundary cleans an owned disposable.

**Better**

```dart
final class FormStateOwner {
  final FocusNode focusNode = FocusNode();

  void dispose() {
    focusNode.dispose();
  }
}
```

---

## 3. AnimationController without disposal

**Bad**

```dart
late final AnimationController controller;

void initialize(
  TickerProvider vsync,
) {
  controller = AnimationController(
    vsync: vsync,
    duration: const Duration(seconds: 1),
  );
}
```

**Why it is problematic**

Ticker/controller lifetime survives owner teardown.

**Better**

```dart
late final AnimationController controller;

void initialize(
  TickerProvider vsync,
) {
  controller = AnimationController(
    vsync: vsync,
    duration: const Duration(seconds: 1),
  );
}

void disposeAnimation() {
  controller.dispose();
}
```

---

## 4. StreamSubscription never canceled

**Bad**

```dart
final class UserWatcher {
  UserWatcher(Stream<String> stream) {
    stream.listen(
      (String value) {
        latest = value;
      },
    );
  }

  String? latest;
}
```

**Better**

```dart
final class UserWatcher {
  UserWatcher(Stream<String> stream) {
    _subscription = stream.listen(
      (String value) {
        latest = value;
      },
    );
  }

  late final StreamSubscription<String>
      _subscription;

  String? latest;

  Future<void> dispose() {
    return _subscription.cancel();
  }
}
```

---

## 5. Timer never canceled

**Bad**

```dart
final class Poller {
  Poller() {
    Timer.periodic(
      const Duration(seconds: 5),
      (_) {
        ticks++;
      },
    );
  }

  int ticks = 0;
}
```

**Better**

```dart
final class Poller {
  Poller() {
    _timer = Timer.periodic(
      const Duration(seconds: 5),
      (_) {
        ticks++;
      },
    );
  }

  Timer? _timer;
  int ticks = 0;

  void dispose() {
    _timer?.cancel();
    _timer = null;
  }
}
```

---

## 6. Listener registered but never removed

**Bad**

```dart
notifier.addListener(
  handleChange,
);
```

with no matching teardown.

**Why it is problematic**

The notifier can retain the listener target.

**Better**

```dart
notifier.addListener(
  handleChange,
);

void disposeListener() {
  notifier.removeListener(
    handleChange,
  );
}
```

---

## 7. Listener registered repeatedly

**Bad**

```dart
@override
void didUpdateWidget(
  ListenerWidget oldWidget,
) {
  super.didUpdateWidget(oldWidget);

  widget.notifier.addListener(
    _changed,
  );
}
```

**Why it is problematic**

Each update adds another registration.

**Better**

```dart
@override
void didUpdateWidget(
  ListenerWidget oldWidget,
) {
  super.didUpdateWidget(oldWidget);

  if (oldWidget.notifier !=
      widget.notifier) {
    oldWidget.notifier.removeListener(
      _changed,
    );

    widget.notifier.addListener(
      _changed,
    );
  }
}
```

---

## 8. BuildContext retained in singleton

**Bad**

```dart
final class GlobalNavigationState {
  BuildContext? context;

  void attach(BuildContext value) {
    context = value;
  }
}
```

**Better**

Represent navigation/action through a current presentation boundary rather than persisting context.

---

## 9. State retained through global callback

**Bad**

```dart
globalCallbacks.add(
  () {
    setState(() {});
  },
);
```

with no removal.

**Better**

Register a named callback and remove it in `dispose`.

---

## 10. Route controller stored in app singleton

**Bad**

```dart
getIt.registerSingleton(
  ProductEditorController(),
);
```

when controller belongs to one route.

**Better**

Use route/provider ownership or a factory and dispose with the route.

---

## 11. Static map never cleared

**Bad**

```dart
static final Map<String, Object>
    objects = <String, Object>{};
```

where every feature visit adds entries forever.

**Better**

Define bounded eviction or scope cleanup.

---

## 12. Unbounded cache

**Bad**

```dart
cache[id] = loadedObject;
```

with no maximum or expiration policy.

**Better**

Use an explicit cache bound/eviction strategy.

---

## 13. Manually created Bloc/Cubit never closed

**Bad**

```dart
final cubit =
    ProfileCubit(repository);
```

with creator never closing it.

**Better**

Have the owning scope call:

```dart
await cubit.close();
```

or transfer ownership to an owning provider.

---

## 14. Wrong GetIt singleton lifetime

**Bad**

A screen controller is a permanent singleton because service-location is convenient.

**Better**

Register with the lifetime that matches route/feature ownership.

---

## 15. Session resources survive logout

**Bad**

Authenticated socket and user subscriptions remain in app scope after logout.

**Better**

Dispose/pop/reset session scope and its resources during logout.

---

## 16. Async callback retains disposed widget state

**Bad**

A long-running Future closure captures an entire `State` unnecessarily.

**Better**

Cancel the operation when supported, minimize captured data, and guard stale completion.

---

## 17. `mounted` used as cleanup

**Bad**

```dart
if (!mounted) {
  return;
}
```

used as the only handling for an owned stream/timer.

**Why it is problematic**

It prevents invalid UI access but does not cancel the resource.

**Better**

Cancel owned resources in `dispose()`.

---

## 18. Assuming `dispose()` means unretained

**Bad**

```text
dispose called
therefore object cannot leak
```

**Better**

For `notGCed`, inspect strong references after disposal.

---

## 19. Assuming GC proves proper cleanup

**Bad**

```text
object was collected
therefore subscription lifecycle was correct
```

**Better**

Verify required disposal/cancel contract separately.

---

## 20. Silencing every report

**Bad**

Global ignores added until CI is green.

**Better**

Classify each report by ownership and cause.

---

## 21. Broad ignore rules

**Bad**

Ignore all `ScrollController` leaks because one framework test is noisy.

**Better**

Ignore only the specific validated external class/count/test.

---

## 22. Leak test runs before owner is released

**Bad**

The page is still mounted when the test expects its controllers to disappear.

**Better**

Unmount/pop owner, settle transitions, then allow leak evaluation.

---

## 23. Test depends on exact GC timing

**Bad**

Sleep 10 ms and assume collection must have happened.

**Better**

Use leak-trackers' collection machinery and deterministic lifecycle teardown.

---

## 24. Background timers survive between tests

**Bad**

A periodic timer started by a fake service remains alive after test.

**Better**

Expose teardown and register it with `addTearDown`.

---

## 25. Maximum diagnostics everywhere

**Bad**

Every CI test collects:

```text
creation stack
disposal stack
retaining path
experimental not-GCed
```

for every object.

**Better**

Run high-signal defaults and enable diagnostics only for focused failures.

---

## 26. RSS growth treated as proof of a leak

**Bad**

```text
RSS went up 100 MB,
so TextEditingController must leak.
```

**Better**

Use heap snapshots/diffs and lifecycle data to identify actual retention.

---

## 27. Passing leak tests treated as proof of no memory problems

**Bad**

```text
LeakTesting passed,
therefore memory is perfect.
```

**Better**

Profile caches/native memory/allocation growth separately.

---

## 28. OverlayEntry disposed without removal

**Bad**

```dart
entry.dispose();
```

while still inserted.

**Better**

```dart
entry.remove();
entry.dispose();
```

---

## 29. Disposed child still stored by owner

**Bad**

```dart
controller.dispose();
// field still references controller for rest of owner's long lifetime
```

**Better**

If the child is intentionally disposed early:

```dart
controller?.dispose();
controller = null;
```

where field type/lifecycle supports it.

---

## 30. Closure captures huge short-lived object

**Bad**

A global callback references an entire page model only to access one flag.

**Better**

Capture the minimal immutable value or remove callback with owner.

---

