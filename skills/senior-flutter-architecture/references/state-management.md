# Flutter State Management

## Principle: solve ownership before choosing a package [B/F/S]

State-management tools answer *how changes propagate*. Architecture must first answer *who owns the state and who may mutate it*.

## State categories

### 1. Ephemeral view state
Examples:
- current tab within a local component;
- expansion state;
- animation progress;
- focus/selection;
- text-editing controller state;
- drag/gesture state.

Usually keep close to the widget unless another owner needs it.

### 2. Feature presentation state
Examples:
- search query + results + loading;
- checkout form/submission state;
- pagination state;
- screen-specific filters;
- mutation progress/error.

Own in a ViewModel/controller/notifier/BLoC equivalent.

### 3. Shared app/session state
Examples:
- signed-in user;
- session capabilities;
- in-memory shared cache;
- global connectivity-derived product state;
- user preferences used across features.

Own at a scope matching the session/app lifetime, commonly a repository/session owner.

### 4. Durable state
Examples:
- persisted settings;
- offline entities;
- pending mutations;
- drafts that must survive process death.

Persistence belongs behind a repository/service boundary.

## Package-neutral state contract

A presentation owner should ideally expose:
- immutable/read-only renderable state;
- explicit commands/events;
- predictable async transitions;
- testable dependencies.

Example conceptual model:

```dart
sealed class ProfileState {
  const ProfileState();
}

final class ProfileLoading extends ProfileState {}

final class ProfileReady extends ProfileState {
  const ProfileReady(this.profile, {this.isRefreshing = false});
  final Profile profile;
  final bool isRefreshing;
}

final class ProfileFailure extends ProfileState {
  const ProfileFailure(this.message, {this.previous});
  final String message;
  final Profile? previous;
}
```

Use the project's preferred modeling style; do not introduce sealed classes purely for aesthetics.

## `setState`

Good:
- truly local state;
- owner is the widget;
- no other feature needs the value;
- state dies with the widget.

Bad:
- network response becomes the shared source of truth;
- multiple screens need the data;
- retry/offline/persistence logic grows around it;
- top-level state causes broad rebuilds.

## `ChangeNotifier` / `Listenable` [F]

Current Flutter architecture material demonstrates `ChangeNotifier`/`Listenable` as one valid mechanism and labels the choice conditional rather than mandatory.

Use when:
- the team understands it;
- mutable model + notification semantics are acceptable;
- state graph is modest.

Watch for:
- hidden mutation;
- broad notifications;
- forgotten disposal;
- difficult async state modeling.

## Provider / Riverpod / BLoC / other packages [S]

The skill must not select one by brand.

Evaluate:
- compile-time vs runtime wiring;
- async-state ergonomics;
- scoping/disposal;
- test overrides;
- event/state auditability;
- team familiarity;
- generator/build_runner cost;
- debug tooling;
- package longevity;
- interoperability with existing code.

### Existing project rule

If a project consistently uses one state solution:
- continue it for new features by default;
- do not mix paradigms within one feature without a migration plan;
- migrate only for measurable architectural/maintenance value.

## Async race model

For search/filter/reload:
- assign request identity or use cancellation when available;
- prevent old results from overwriting newer intent;
- distinguish refresh vs initial load;
- maintain previous content when product UX benefits.

## Side effects

Do not trigger analytics, navigation, network mutation, dialogs, or snackbars merely because `build()` ran.

Prefer:
- explicit command result;
- effect/event channel with one-shot semantics;
- listener tied to state transition;
- navigation coordinator/router reaction where appropriate.

## State restoration

If state must survive process death, widget/provider memory is insufficient.
Persist the minimum durable representation and restore through repositories/state restoration mechanisms as appropriate.

## Review checklist

- Who owns each field?
- Who can mutate it?
- Is scope correct?
- Can invalid combinations exist?
- Are async races handled?
- Can errors be retried intentionally?
- Does pending/offline state survive as required?
- Are one-shot effects separate from durable render state?
- Are consumers observing only what they need?
