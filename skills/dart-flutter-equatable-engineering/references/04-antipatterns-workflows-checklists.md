# Reference navigation

Anti-patterns, implementation/review/refactoring workflows, migrations, checklists, quick reference, and final engineering rule.

## Contents
- Common Anti-Patterns
  - Forgetting a field in `props`
  - Putting only some state fields in `props`
  - Mutable fields in Equatable models
  - Mutating a list in `props`
  - Re-emitting the same mutated Bloc state
  - Equatable on controllers/services
  - Callbacks in `props`
  - Random IDs or timestamps without semantic reason
  - Redundant derived field
  - Assuming nested plain objects gain value equality
  - Assuming all collections behave identically
  - Mutable Equatable object as a Map key
  - Comparing entities by every field when identity should use ID
  - Comparing only by ID when full snapshot semantics are required
  - Combining generated equality with Equatable
  - Manually overriding `==` while relying on Equatable
  - Failing to include `super.props`
  - Assuming identical props across subclasses imply equality
  - Huge collections in hot-path state without profiling
  - Enabling stringify for secret-bearing models
  - Using equality as event deduplication/concurrency control
- New Model Implementation Workflow
  - 1. Identify what the type represents
  - 2. Decide whether equality is actually used
  - 3. Determine equality domain
  - 4. Define logical equality in plain language
  - 5. Identify equality-defining fields
  - 6. Inspect nested values
  - 7. Inspect collections
  - 8. Guarantee immutability
  - 9. Select equality technology
  - 10. Implement `props`
  - 11. Review nullable values
  - 12. Test the contract
  - 13. If used as state, test transitions
  - 14. If used in hash collections, test key behavior
  - 15. Review logging
  - 16. Profile only if necessary
- Existing-Code Review Workflow
- Refactoring Rules
- Migration from Manual Equality
- Migration from Equatable
- Equality Debugging Checklist
- Bloc State Checklist
- Immutability Checklist
- Performance Checklist
- Security/Logging Checklist
- Production Readiness Checklist
- Quick Reference
- Final Engineering Rule

---

## Common Anti-Patterns

### Forgetting a field in `props`

**Bad**

```dart
final class UserState extends Equatable {
  const UserState({
    required this.name,
    required this.isLoading,
  });

  final String name;
  final bool isLoading;

  @override
  List<Object> get props => [name];
}
```

**Why it is problematic**

`isLoading` changes do not produce a new equality value.

**Better**

```dart
@override
List<Object> get props => [name, isLoading];
```

---

### Putting only some state fields in `props`

**Bad**

```dart
@override
List<Object?> get props => [data];
```

when `status` and `errorMessage` are also logical state.

**Why it is problematic**

Distinct application states collapse into one equality value.

**Better**

```dart
@override
List<Object?> get props => [
      status,
      data,
      errorMessage,
    ];
```

---

### Mutable fields in Equatable models

**Bad**

```dart
final class CounterModel extends Equatable {
  CounterModel(this.count);

  int count;

  @override
  List<Object> get props => [count];
}
```

**Why it is problematic**

Equality and hash code change over the object's lifetime.

**Better**

```dart
final class CounterModel extends Equatable {
  const CounterModel(this.count);

  final int count;

  @override
  List<Object> get props => [count];
}
```

---

### Mutating a list in `props`

**Bad**

```dart
state.items.add(item);
```

**Why it is problematic**

The object changes without becoming a new immutable value.

**Better**

```dart
final nextItems = [...state.items, item];
emit(state.copyWith(items: nextItems));
```

---

### Re-emitting the same mutated Bloc state

**Bad**

```dart
state.items.add(item);
emit(state);
```

**Why it is problematic**

Same reference, corrupted old state, suppressed emission.

**Better**

```dart
emit(
  state.copyWith(
    items: [...state.items, item],
  ),
);
```

---

### Equatable on controllers/services

**Bad**

```dart
final class UserRepository extends Equatable {
  const UserRepository(this.api);

  final ApiClient api;

  @override
  List<Object> get props => [api];
}
```

**Why it is problematic**

A repository represents behavior/dependency/lifecycle, not ordinarily a value.

**Better**

```dart
final class UserRepository {
  const UserRepository(this.api);

  final ApiClient api;
}
```

---

### Callbacks in `props`

**Bad**

```dart
final VoidCallback onRetry;

@override
List<Object> get props => [message, onRetry];
```

**Why it is problematic**

Function identity is usually transient implementation state.

**Better**

Keep commands/actions outside the value model when possible:

```dart
@override
List<Object> get props => [message];
```

Only exclude the callback after confirming that callback identity is not part of the logical value.

---

### Random IDs or timestamps without semantic reason

**Bad**

```dart
final DateTime createdAt = DateTime.now();

@override
List<Object> get props => [value, createdAt];
```

when `createdAt` exists solely to force inequality.

**Why it is problematic**

Equality is being manipulated rather than modeled.

**Better**

Define the actual state transition semantics. Use revision/event identity only if it is genuinely part of the domain.

---

### Redundant derived field

**Bad**

```dart
@override
List<Object> get props => [
      width,
      height,
      area,
    ];
```

when `area == width * height`.

**Why it is problematic**

Duplicates equality information and can create inconsistencies if the derivation changes.

**Better**

```dart
@override
List<Object> get props => [width, height];
```

---

### Assuming nested plain objects gain value equality

**Bad**

```dart
@override
List<Object> get props => [plainAddress];
```

while assuming Equatable compares `plainAddress.city`.

**Why it is problematic**

Ordinary object equality is still delegated to that object's own `==`.

**Better**

Give the nested model appropriate equality or convert it into a value representation.

---

### Assuming all collections behave identically

**Bad**

Treating list order, set order, and map insertion order as equivalent concepts.

**Why it is problematic**

Current Equatable uses ordered iterable comparison, unordered set matching, and key/value map comparison.

**Better**

Test the collection semantics your model depends on.

---

### Mutable Equatable object as a Map key

**Bad**

```dart
final key = MutableKey(...);
final map = {key: value};

key.parts.add(...);
```

**Why it is problematic**

The key's hash/equality may change after insertion.

**Better**

Use deeply immutable key values.

---

### Comparing entities by every field when identity should use ID

**Bad**

```dart
@override
List<Object> get props => [id, name, email, lastSeenAt];
```

for an entity whose domain identity is strictly `id`.

**Better**

Model entity identity explicitly:

```dart
@override
List<Object> get props => [id];
```

but only if that matches the intended semantics.

---

### Comparing only by ID when full snapshot semantics are required

**Bad**

```dart
@override
List<Object> get props => [id];
```

for a UI/state snapshot where changed name/email must produce a new value.

**Better**

Include the fields that define the snapshot.

---

### Combining generated equality with Equatable

**Bad**

Use a generator that emits equality and also extend Equatable.

**Why it is problematic**

Two equality systems compete for authority.

**Better**

Choose one implementation.

---

### Manually overriding `==` while relying on Equatable

**Bad**

```dart
final class Product extends Equatable {
  // ...

  @override
  bool operator ==(Object other) {
    // custom equality
  }

  @override
  List<Object> get props => [...];
}
```

**Why it is problematic**

`props` no longer clearly represents the equality contract.

**Better**

Either use Equatable completely or implement deliberate manual equality completely.

---

### Failing to include `super.props`

**Bad**

```dart
@override
List<Object> get props => [data];
```

when inherited `id` remains significant.

**Better**

```dart
@override
List<Object> get props => [
      ...super.props,
      data,
    ];
```

---

### Assuming identical props across subclasses imply equality

**Bad assumption**

```text
Loading.props == []
Initial.props == []
therefore Loading == Initial
```

**Why it is problematic**

Current Equatable requires equal runtime types.

**Better**

Treat each subtype as a separate equality domain unless manual modeling intentionally says otherwise.

---

### Huge collections in hot-path state without profiling

**Bad**

Rewrite semantic equality around a version number because a list "looks expensive."

**Better**

Measure first, then redesign only if the cost is material.

---

### Enabling stringify for secret-bearing models

**Bad**

```dart
@override
bool get stringify => true;
```

for access-token models.

**Better**

Disable or redact sensitive output.

---

### Using equality as event deduplication/concurrency control

**Bad assumption**

```text
Two events are Equatable,
therefore Bloc won't process duplicates.
```

**Why it is problematic**

Event equality does not define Bloc event transformation policy.

**Better**

Implement explicit debounce/deduplication/concurrency behavior where required.

---

## New Model Implementation Workflow

Follow this sequence before writing code.

### 1. Identify what the type represents

Classify it as:

- value object;
- entity;
- immutable snapshot;
- DTO;
- UI model;
- state;
- event;
- service;
- resource/controller;
- configuration.

### 2. Decide whether equality is actually used

Identify consumers:

- direct comparisons;
- tests;
- Bloc/Cubit;
- selectors;
- cache keys;
- `Set`;
- `Map`;
- deduplication;
- memoization.

If equality is irrelevant, do not automatically introduce Equatable.

### 3. Determine equality domain

Ask whether different subclasses/types should ever compare equal.

With standard Equatable, differing runtime types do not.

### 4. Define logical equality in plain language

Example:

```text
Two Money values are equal when amountInMinorUnits and currency match.
```

Write this before `props`.

### 5. Identify equality-defining fields

For every property ask:

> If only this field changed, should the object become a different logical value?

### 6. Inspect nested values

Verify each nested type's equality.

Do not assume.

### 7. Inspect collections

Determine:

- whether order matters;
- whether keys/values are immutable;
- whether elements have value equality;
- whether defensive copying is necessary.

### 8. Guarantee immutability

Use:

- final fields;
- immutable nested objects;
- defensive copies;
- unmodifiable collections.

### 9. Select equality technology

Choose exactly one:

- Equatable;
- `with Equatable`;
- records;
- generated equality;
- specialized manual equality;
- identity/no custom equality.

### 10. Implement `props`

Use a stable, deterministic list of logical equality values.

### 11. Review nullable values

Use `List<Object?>` when appropriate.

### 12. Test the contract

Verify:

- equal values;
- unequal defining fields;
- equal hash codes for equal values;
- nested values;
- nullable cases;
- collections;
- subtype behavior.

### 13. If used as state, test transitions

Ensure each meaningful state change becomes unequal when required.

### 14. If used in hash collections, test key behavior

Confirm immutable, stable equality.

### 15. Review logging

Check `stringify`, custom `toString`, observers, analytics, crash logs.

### 16. Profile only if necessary

Measure before modifying semantically correct equality.

---

## Existing-Code Review Workflow

Before editing an existing Equatable model, inspect:

1. what the type represents;
2. where equality is used;
3. current `props`;
4. all fields omitted from `props`;
5. whether omission is deliberate;
6. nullable fields;
7. nested types;
8. collection fields;
9. mutation paths;
10. constructors and defensive copying;
11. inheritance;
12. `super.props`;
13. runtime type assumptions;
14. Bloc/Cubit state use;
15. selectors and rebuild filters;
16. hash collection use;
17. `stringify`;
18. tests;
19. generated/manual equality elsewhere.

Do not "fix" `props` merely by including every field before understanding existing semantics.

An omitted field may be a bug, or it may be an intentional non-equality field. Determine which.

---

## Refactoring Rules

Treat equality refactoring as behavior changes.

> Changing `props` can change behavior even when no public field changes.

It can affect:

- Bloc/Cubit emission suppression;
- widget rebuilds;
- selectors;
- cache keys;
- deduplication;
- `Set`;
- `Map`;
- tests;
- memoization.

For high-risk changes:

1. write characterization tests;
2. document the intended equality semantics;
3. modify equality;
4. re-run state transition tests;
5. verify hash collection behavior;
6. verify caches/selectors;
7. inspect logs/stringification.

---

## Migration from Manual Equality

Do not mechanically replace handwritten equality.

Use this sequence:

1. inspect current `operator ==`;
2. inspect current `hashCode`;
3. identify runtime-type rules;
4. identify all equality fields;
5. inspect nested and collection behavior;
6. write characterization tests;
7. implement Equatable using equivalent semantics;
8. verify all characterization tests;
9. verify Set/Map behavior;
10. remove redundant manual overrides.

Example manual implementation:

```dart
final class Point {
  const Point(this.x, this.y);

  final int x;
  final int y;

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        other is Point &&
            runtimeType == other.runtimeType &&
            x == other.x &&
            y == other.y;
  }

  @override
  int get hashCode => Object.hash(x, y);
}
```

Migration:

```dart
final class Point extends Equatable {
  const Point(this.x, this.y);

  final int x;
  final int y;

  @override
  List<Object> get props => [x, y];
}
```

Do not migrate if the manual implementation contains deliberate semantics Equatable does not represent.

---

## Migration from Equatable

Removing Equatable is reasonable when:

- moving to generated immutable models;
- replacing a temporary class with a record;
- changing the type to identity semantics;
- eliminating equality because it is no longer used.

Use behavior-preserving tests before changing implementation.

Do not assume two equality mechanisms are equivalent because both are described as "value equality." Compare collection behavior, runtime type rules, nested equality, and hash behavior where relevant.

---

## Equality Debugging Checklist

- [ ] Are the runtime types the same?
- [ ] Are the objects actually intended to be in the same equality domain?
- [ ] Are all logically significant fields in `props`?
- [ ] Are any intentionally insignificant fields incorrectly included?
- [ ] Are `props` values in deterministic order?
- [ ] Do nullable fields participate correctly?
- [ ] Do nested classes define the expected equality?
- [ ] Are lists being compared with the intended order?
- [ ] Are sets being treated as unordered?
- [ ] Are map keys and values correct?
- [ ] Is any collection mutable after construction?
- [ ] Is any nested object mutable?
- [ ] Has equality-relevant state changed after insertion into a Set/Map?
- [ ] Is a superclass property missing?
- [ ] Is a callback/resource accidentally in equality?
- [ ] Is another generated/manual equality mechanism involved?
- [ ] Is Bloc suppressing an equal state?
- [ ] Is `buildWhen`, `BlocSelector`, or `context.select` filtering the update?

---

## Bloc State Checklist

- [ ] Is the state immutable?
- [ ] Does every logical state field participate in equality?
- [ ] Are state collections immutable snapshots?
- [ ] Is `copyWith` creating new state rather than mutating old state?
- [ ] Can nullable fields be explicitly cleared when necessary?
- [ ] Do nested state objects have correct equality?
- [ ] Are state subclasses intentionally distinct?
- [ ] Does every intended state transition produce the intended equality result?
- [ ] Has an equal state been intentionally emitted?
- [ ] Are `buildWhen`/selectors contributing to missing UI updates?
- [ ] Are error/loading/status fields accidentally omitted?
- [ ] Are timestamps or revision fields being used only to force inequality?

---

## Immutability Checklist

- [ ] All equality-relevant fields are `final`.
- [ ] Final collection references cannot be mutated through retained external aliases.
- [ ] Constructor collections are copied or wrapped when required.
- [ ] Nested equality objects are themselves immutable.
- [ ] `copyWith` never mutates the source.
- [ ] No controller/service/resource is stored as equality data without deliberate semantics.
- [ ] Objects used as map keys/set elements remain stable for their entire membership lifetime.

---

## Performance Checklist

- [ ] How many properties are in `props`?
- [ ] How large are collection properties?
- [ ] How deeply nested are values?
- [ ] How frequently is `==` called?
- [ ] How frequently is `hashCode` requested?
- [ ] Is the object used in large hash collections?
- [ ] Is Bloc/state selection causing repeated comparisons?
- [ ] Has profiling demonstrated measurable cost?
- [ ] Can state be normalized or split without weakening semantics?
- [ ] Would a smaller selected value solve the actual UI performance issue?
- [ ] Does any proposed version/revision optimization preserve exact semantics?
- [ ] Is optimization preserving maintainability and correctness?

---

## Security/Logging Checklist

- [ ] Does `stringify` expose credentials?
- [ ] Does global `EquatableConfig.stringify` change output unexpectedly?
- [ ] Does custom `toString()` redact sensitive fields?
- [ ] Are models logged by Bloc observers?
- [ ] Could analytics/crash tooling capture `toString()`?
- [ ] Do tests accidentally snapshot secret values?
- [ ] Are email addresses, tokens, payment data, or personal information exposed unnecessarily?

---

## Production Readiness Checklist

Before approving an important Equatable type, verify:

- [ ] Equality semantics are intentionally documented or obvious from the domain.
- [ ] Value equality is actually appropriate.
- [ ] All equality-defining fields are represented.
- [ ] Excluded fields are intentionally excluded.
- [ ] Equality data is immutable.
- [ ] Mutable inputs are defensively copied where required.
- [ ] Nested equality semantics have been reviewed.
- [ ] Collection behavior is understood.
- [ ] `hashCode` remains stable.
- [ ] Hash-key usage is safe.
- [ ] Inheritance and `super.props` are correct.
- [ ] Runtime-type behavior is understood.
- [ ] Bloc states are immutable.
- [ ] State mutation/re-emission is absent.
- [ ] Selectors/build filters have been considered.
- [ ] `EquatableMixin` is not introduced in new 2.1.0 code.
- [ ] Generated/manual equality is not duplicated.
- [ ] Sensitive data is not leaked through `stringify`.
- [ ] Important equality behavior has tests.
- [ ] Performance changes are profiling-driven.

---

## Quick Reference

| Situation | Preferred approach |
| --- | --- |
| Immutable domain value object | Equatable is often appropriate |
| Immutable Bloc/Cubit state | Equatable when explicit value equality is desired |
| Bloc event | Use if value equality has a concrete purpose |
| Service/repository | Usually identity semantics; avoid Equatable |
| Controller/resource | Avoid Equatable |
| Disposable object | Prefer lifecycle/identity semantics |
| Model already generated with equality | Use generated equality only |
| Short tuple-like internal value | Consider a Dart record |
| Nested Equatable field | Include normally |
| Nested plain class | Verify its own equality semantics |
| Nullable field matters | Include it using `List<Object?>` |
| Mutable list in `props` | Avoid; defensively copy/make immutable |
| Ordered list | Order participates in Equatable structural comparison |
| Set | Current Equatable comparison is structural and order-insensitive |
| Map | Current Equatable compares keys and corresponding values structurally |
| Nested collections | Current implementation recursively compares supported collection types |
| Entity with stable domain identity | Define equality from domain semantics |
| Full entity snapshot | Include all fields defining the snapshot |
| DTO never compared | Avoid unnecessary equality |
| Large collection in hot-path state | Preserve semantics, then profile |
| Version/revision-only equality | Use only with a proven architectural invariant |
| Sensitive token model | Do not expose sensitive props through stringify |
| Equal objects used as Map keys | Require immutable props and stable hash code |
| State changed but UI did not update | Inspect equality, mutation, `props`, selectors, and build filters |
| Two subclasses have identical props | Still unequal under standard Equatable because runtime types differ |
| Existing superclass requires value equality | Use `with Equatable` |
| Legacy `EquatableMixin` | Migrate; deprecated in Equatable 2.1.0 |
| Approximate floating-point equality | Use specialized domain comparison/modeling |
| Manual equality already captures special rules | Preserve unless migration tests prove equivalence |
| Generated equality plus Equatable | Avoid duplicate equality systems |
| Mutable object used as Set element/Map key | Redesign as immutable before relying on value equality |

---

## Final Engineering Rule

Do not ask:

```text
How do I add Equatable to this class?
```

Ask:

```text
What does this type represent?
What does equality mean for it?
Must that equality remain stable?
Which fields define that value?
Do nested values obey the same contract?
Will state management or hash collections rely on it?
Which single equality implementation best expresses those semantics?
```

Only after those questions are answered should you implement:

```dart
@override
List<Object?> get props => [...];
```

Equatable is successful when `props` is not merely a list of fields, but a precise, immutable, tested statement of the model's equality semantics.
