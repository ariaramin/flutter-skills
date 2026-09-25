# Widgets, BuildContext, State, and Navigation

## Treat `build()` as repeatable rendering

A build method can run frequently and for reasons unrelated to the local widget. It should describe UI from current state, not orchestrate external work.

### Avoid

```dart
Widget build(BuildContext context) {
  analytics.trackScreen('home');
  fetchData();
  return const HomeView();
}
```

### Prefer

Put effects in explicit event/lifecycle/state mechanisms, depending on ownership.

## Future/stream builders

Do not create a new future in `FutureBuilder.future` during `build` unless restarting on every parent rebuild is intentionally part of the behavior.

```dart
class _ProfileState extends State<Profile> {
  late final Future<User> _user;

  @override
  void initState() {
    super.initState();
    _user = widget.repository.loadUser();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<User>(
      future: _user,
      builder: (context, snapshot) { ... },
    );
  }
}
```

If dependencies can change, update the future in `didUpdateWidget`/`didChangeDependencies` or, more often, let an application/state layer own the operation.

## BuildContext

A `BuildContext` identifies an element location, not a global service handle.

### Rules

- Do not store `BuildContext` in repositories/services/singletons.
- Do not cache inherited values for arbitrary future use unless the value itself is designed to outlive the context.
- After an `await`, either avoid context use or check `context.mounted` immediately before use.
- Sometimes acquire a durable object before the gap (for example a messenger/navigator state) when that object remains semantically valid for the intended UI.

```dart
onPressed: () async {
  await controller.save();
  if (!context.mounted) return;
  Navigator.of(context).pop();
}
```

## MediaQuery

Prefer aspect-specific accessors such as `MediaQuery.sizeOf(context)` or `paddingOf` when only one property is needed. `MediaQuery.of(context)` subscribes to the entire `MediaQueryData` and can rebuild for unrelated changes.

Do not use screen width alone as a proxy for every adaptive decision. Prefer constraints at the component's actual layout boundary (`LayoutBuilder`) when parent space matters.

## Composition

The source corpus correctly emphasizes composition, but “extract everything” is not the goal.

Extract a widget when it has one or more of:

- meaningful UI responsibility/name;
- reusable configuration;
- separate rebuild/state boundary;
- non-trivial layout/testing behavior;
- useful `const` construction.

Keep a tiny local builder/helper when a new class would reduce readability.

## Stateful vs stateless

Use stateful widgets for ephemeral framework/UI state that belongs to the widget lifecycle (controller ownership, animation, local selection). Move business/source-of-truth state out when it must survive widget recreation, coordinate features, or be tested independently.

## ValueNotifier / ChangeNotifier / package state managers

The repositories show `ValueNotifier`, `ChangeNotifier`, Bloc, Hooks, and extensive Riverpod techniques.

Normalize them as follows:

- `ValueNotifier` is excellent for one small value with simple listener semantics.
- `ChangeNotifier` is useful for modest mutable observable state, but can become broad/implicit if overloaded.
- Bloc/Riverpod/Hooks patterns are package-specific. Follow the project's established state-management approach.
- Do not introduce a package because one repository tip uses it.

## Side effects

Effects belong at explicit boundaries:

- user callbacks (`onPressed`, `onTap`, submit/refresh);
- lifecycle hooks with correct ownership;
- state-management listener/effect APIs;
- navigation observers for navigation-level analytics;
- service/repository layers for I/O.

Avoid effects in getters, `build`, equality/hash, or model `toString`.

## Navigation

### Push vs replace/location navigation

For Navigator/go_router, decide whether the user should be able to return to the previous route.

- “push” semantics add a page on top.
- “go/replace location” semantics set a new route location/stack according to router configuration.

Do not choose based on shorter syntax.

### Observers and analytics

Navigator observers/router delegate listeners can support screen tracking, but verify current router APIs and avoid double-reporting redirects/nested navigator changes.

### Async navigation

Guard context after awaits. Also protect against duplicate submits causing two route pushes.

## Dialogs, snackbars, sheets

Reusable wrappers are helpful when they encode app-wide policy (styling, error mapping, adaptivity), not merely to shorten one call.

Return typed values from dialogs/routes rather than mutating remote UI state through hidden globals.

## Pop handling

Older code using `WillPopScope` should be treated as **Deprecated** in current Flutter; use `PopScope` and current predictive-back-compatible APIs.

## Selection and rich text

- `SelectionArea` can enable selection across multiple widgets.
- `SelectableText` remains useful for a single text region.
- `TextSpan`/`RichText` allow mixed styles/recognizers; own/dispose recognizers if you create long-lived recognizer instances.

## Platform/adaptive widgets

Use adaptive Material/Cupertino presentation when it serves product behavior. Test platform branches explicitly. `ThemeData.platform` can help exercise different UI branches in tests; it should not become a substitute for correct capability/platform logic.
