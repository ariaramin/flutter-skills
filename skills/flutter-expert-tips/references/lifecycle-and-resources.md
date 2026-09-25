# Lifecycle and Resource Ownership

## Ownership rule

For every closeable/cancelable resource, answer:

1. Who creates it?
2. Who owns it?
3. When does it become invalid?
4. Who disposes/cancels/closes it?
5. Can callbacks arrive after disposal?

The creator is often the owner, but dependency injection can transfer ownership. Never blindly dispose resources received from a parent/service.

## Common `State`-owned resources

- `AnimationController`
- `TextEditingController`
- `ScrollController`
- `PageController`
- `FocusNode`
- `TabController`
- `StreamSubscription`
- `Timer`
- listeners added to `Listenable`s
- platform/event channel subscriptions
- isolate receive ports or long-lived worker handles

```dart
class _SearchState extends State<SearchPage> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  StreamSubscription<Result>? _subscription;

  @override
  void dispose() {
    _subscription?.cancel();
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }
}
```

If disposal itself is asynchronous, follow the API's lifecycle model; Flutter's `State.dispose()` is synchronous, so async teardown may need to be initiated earlier or owned by another scope.

## Listener symmetry

When registering a listener manually, remove the same listener when ownership ends.

```dart
@override
void initState() {
  super.initState();
  widget.notifier.addListener(_onChanged);
}

@override
void didUpdateWidget(covariant MyWidget oldWidget) {
  super.didUpdateWidget(oldWidget);
  if (oldWidget.notifier != widget.notifier) {
    oldWidget.notifier.removeListener(_onChanged);
    widget.notifier.addListener(_onChanged);
  }
}

@override
void dispose() {
  widget.notifier.removeListener(_onChanged);
  super.dispose();
}
```

This pattern is more important than any particular state-management library.

## App lifecycle

`WidgetsBindingObserver`/lifecycle APIs are useful for pause/resume/inactive/detached concerns such as:

- pausing sensors/media;
- saving transient state;
- refreshing stale data on resume;
- reacting to locale/metrics changes when lower-level access is required.

Do not treat lifecycle callbacks as guaranteed process-shutdown hooks; mobile OSes can terminate processes without a graceful callback.

## Stream/provider disposal

The corpus contains Riverpod `StreamProvider` disposal examples. Generalize the principle:

- subscriptions should be scoped to the consumer/owner;
- auto-dispose behavior is useful only when recreation cost/state loss is acceptable;
- cancellation must propagate to the underlying source when possible;
- do not keep a network/socket stream alive merely because a provider/container is global.

## Text controllers in state-management objects

A source tip stores `TextEditingController` in Bloc-oriented code. Treat this as **Situational**.

Usually prefer:

- keep controller/focus ownership in the widget layer;
- send text values/events into application state;
- store domain text state independently from framework controllers.

Move a controller outside the widget only when its lifecycle is explicitly owned and UI coupling is intentional.

## Network clients

Creating a fresh `HttpClient`/client per tiny call can lose connection reuse; never leave long-lived clients unclosed when the API requires closure. Conversely, do not close a shared injected client from an individual repository method.

Define client ownership at app/service scope.

## Timers and debounce

A debounce timer must be canceled when superseded and when the owning scope ends.

```dart
Timer? _debounce;

void onQueryChanged(String query) {
  _debounce?.cancel();
  _debounce = Timer(const Duration(milliseconds: 300), () {
    search(query);
  });
}

void disposeDebounce() => _debounce?.cancel();
```

For complex reactive pipelines, a stream/state library operator may express cancellation more safely than hand-managed timers.

## Animation controllers

- create with a valid ticker provider;
- dispose exactly once;
- avoid starting an animation from `build()`;
- prefer implicit animation widgets when they express the transition and no custom controller coordination is required.

## Verification recipes

### Leak check

1. Open/close the feature repeatedly.
2. Trigger controllers/subscriptions/timers.
3. Leave the route.
4. Confirm no callbacks/logs/state writes continue.
5. Inspect memory/allocation behavior if symptoms persist.

### Race check

1. Start async work.
2. Navigate away immediately.
3. Re-open the feature.
4. Complete old/new operations out of order.
5. Verify stale completion cannot overwrite newer state.
