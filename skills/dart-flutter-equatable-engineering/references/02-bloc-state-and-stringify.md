# Reference navigation

Bloc/Cubit state equality, state mutation, copyWith, events, selectors, hash collections, stringify, sensitive data, and EquatableConfig.

## Contents
- Bloc/Cubit State Equality
  - Good state
  - Dangerous omission
- State Mutation
- `copyWith` and Equality
- Bloc/Cubit Events
- Selectors and Rebuild Behavior
- `hashCode` and Hash Collections
  - Set/Map key warning
- `stringify` and Debugging
- Sensitive Data
- EquatableConfig

---

## Bloc/Cubit State Equality

Bloc/Cubit makes equality operationally important.

Current `BlocBase.emit` does nothing when the state being emitted is equal to the current state after a prior emission. The source contains one deliberate exception: the first emission may equal the initial state so listeners can be notified of the initial value.

Therefore incorrect state equality can suppress intended emissions.

### Good state

```dart
enum ProfileStatus {
  initial,
  loading,
  success,
  failure,
}

final class ProfileState extends Equatable {
  const ProfileState({
    required this.status,
    required this.profile,
    required this.errorMessage,
  });

  const ProfileState.initial()
      : status = ProfileStatus.initial,
        profile = null,
        errorMessage = null;

  final ProfileStatus status;
  final Profile? profile;
  final String? errorMessage;

  @override
  List<Object?> get props => [
        status,
        profile,
        errorMessage,
      ];
}
```

If loading status changes, equality changes.

### Dangerous omission

```dart
@override
List<Object?> get props => [
      profile,
      errorMessage,
    ];
```

If `status` changes but the other values do not, Bloc can treat the next state as equal to the current state and skip it.

---

## State Mutation

Never do this:

```dart
void addItem(Item item) {
  state.items.add(item);
  emit(state);
}
```

Problems:

- the current state object itself was mutated;
- there is no new immutable snapshot;
- `emit(state)` receives the same object reference;
- Equatable's initial `identical(this, other)` optimization means an object is always equal to itself;
- previous-state diagnostics and comparison semantics become corrupted.

Prefer:

```dart
void addItem(Item item) {
  emit(
    state.copyWith(
      items: [...state.items, item],
    ),
  );
}
```

and make the state own an immutable collection snapshot.

---

## `copyWith` and Equality

A correct `copyWith` creates a new state and preserves unchanged values.

```dart
final class CartState extends Equatable {
  CartState({
    required Iterable<CartItem> items,
    this.errorMessage,
  }) : items = List.unmodifiable(items);

  final List<CartItem> items;
  final String? errorMessage;

  CartState copyWith({
    Iterable<CartItem>? items,
    String? errorMessage,
  }) {
    return CartState(
      items: items ?? this.items,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  @override
  List<Object?> get props => [items, errorMessage];
}
```

The above cannot distinguish:

```text
leave errorMessage unchanged
```

from:

```text
set errorMessage to null
```

When that distinction matters, use a sentinel, wrapper, dedicated parameter object, generated `copyWith`, or another explicit technique.

Example with a private sentinel:

```dart
const _unset = Object();

final class ProfileState extends Equatable {
  const ProfileState({
    required this.profile,
    this.errorMessage,
  });

  final Profile? profile;
  final String? errorMessage;

  ProfileState copyWith({
    Object? profile = _unset,
    Object? errorMessage = _unset,
  }) {
    return ProfileState(
      profile: identical(profile, _unset)
          ? this.profile
          : profile as Profile?,
      errorMessage: identical(errorMessage, _unset)
          ? this.errorMessage
          : errorMessage as String?,
    );
  }

  @override
  List<Object?> get props => [profile, errorMessage];
}
```

---

## Bloc/Cubit Events

Events may use Equatable when value equality is concretely useful:

```dart
sealed class SearchEvent extends Equatable {
  const SearchEvent();
}

final class SearchSubmitted extends SearchEvent {
  const SearchSubmitted(this.query);

  final String query;

  @override
  List<Object> get props => [query];
}
```

Benefits can include predictable assertions and explicit event value semantics.

Do not claim that Equatable automatically deduplicates Bloc events.

Bloc's event processing policy is separate. Current Bloc documentation states that events pass through an `EventTransformer` and are processed concurrently by default unless transformation policy changes that behavior.

Equality does not itself provide:

- debounce;
- restartable processing;
- dropping duplicate events;
- sequential processing;
- cancellation.

Implement those policies explicitly.

---

## Selectors and Rebuild Behavior

`BlocBuilder` can apply `buildWhen(previous, current)` to decide whether its builder runs for a Bloc state change.

`BlocSelector` selects part of a state and avoids unnecessary builds when the selected value does not change. Official documentation explicitly requires the selected value to be immutable for accurate behavior.

Therefore:

```dart
BlocSelector<ProfileCubit, ProfileState, ProfileSummary>(
  selector: (state) => state.summary,
  builder: (context, summary) {
    return Text(summary.displayName);
  },
)
```

works best when `ProfileSummary` has deliberate stable value equality.

When UI appears not to rebuild, inspect in this order:

1. Did Bloc/Cubit actually accept the new state?
2. Does the new state compare equal to the previous state?
3. Is a state field omitted from `props`?
4. Was the existing state or one of its nested collections mutated?
5. Is `buildWhen` suppressing the builder?
6. Is `BlocSelector`/`context.select` returning an equal selected value?
7. Is the widget observing the expected Bloc instance?
8. Is another layer caching or filtering values?

Do not immediately blame Flutter rendering.

---

## `hashCode` and Hash Collections

Equatable computes a hash from:

- `runtimeType`;
- recursively hashed `props`.

Its current collection hashing logic handles maps, sets, and iterables specially.

Do not depend on the numeric value or internal Equatable hashing algorithm as a persistent protocol. Only rely on the equality/hash contract.

### Set/Map key warning

Bad:

```dart
final roles = <String>['reader'];
final user = User(roles);

final users = <User>{user};

roles.add('admin');

print(users.contains(user)); // Hash-collection behavior is now unsafe.
```

If an Equatable object is used as:

- a `Set` element;
- a `Map` key;

all equality-relevant state must remain stable.

---

## `stringify` and Debugging

Equatable's `stringify` controls whether `toString()` includes `props`.

Current source defines:

```dart
bool? get stringify => null;
```

A per-class non-null override takes precedence over global configuration. If neither class behavior nor global override explicitly determines it, `EquatableConfig.stringify` defaults to `true` in debug mode and `false` in release mode.

Example:

```dart
final class Point extends Equatable {
  const Point(this.x, this.y);

  final int x;
  final int y;

  @override
  List<Object> get props => [x, y];

  @override
  bool get stringify => true;
}
```

This can produce a representation such as:

```text
Point(1, 2)
```

Do not confuse `stringify` with equality. It only affects string representation.

---

## Sensitive Data

Never enable verbose property output blindly for models containing:

- passwords;
- access tokens;
- refresh tokens;
- session IDs where sensitive;
- API secrets;
- payment data;
- private keys;
- personal information;
- security answers.

Bad:

```dart
final class Credentials extends Equatable {
  const Credentials({
    required this.email,
    required this.accessToken,
  });

  final String email;
  final String accessToken;

  @override
  List<Object> get props => [email, accessToken];

  @override
  bool get stringify => true;
}
```

Better: keep equality semantics if needed but prevent sensitive output:

```dart
final class Credentials extends Equatable {
  const Credentials({
    required this.email,
    required this.accessToken,
  });

  final String email;
  final String accessToken;

  @override
  List<Object> get props => [email, accessToken];

  @override
  bool get stringify => false;

  @override
  String toString() => 'Credentials(email: $email, accessToken: [REDACTED])';
}
```

Also inspect logging frameworks, analytics, crash reports, and Bloc observers.

---

## EquatableConfig

Current global configuration supports `stringify`:

```dart
EquatableConfig.stringify = true;
```

or:

```dart
EquatableConfig.stringify = false;
```

Current source documents only global stringify configuration.

Per-class behavior wins:

```dart
@override
bool get stringify => false;
```

Use global configuration deliberately in tests. Because it is global mutable configuration, restore it when a test modifies it:

```dart
void main() {
  late bool previous;

  setUp(() {
    previous = EquatableConfig.stringify;
  });

  tearDown(() {
    EquatableConfig.stringify = previous;
  });

  test('does not expose sensitive props', () {
    EquatableConfig.stringify = true;

    const credentials = Credentials(
      email: 'user@example.com',
      accessToken: 'secret',
    );

    expect(credentials.toString(), isNot(contains('secret')));
  });
}
```

---

