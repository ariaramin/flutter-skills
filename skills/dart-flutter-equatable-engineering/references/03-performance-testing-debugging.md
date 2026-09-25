# Reference navigation

Performance behavior, props allocation, large collections, profiling, equality tests, props regression tests, and debugging workflow.

## Contents
- Performance
  - Typical small models
  - `props` allocation
  - Large collections
  - Profiling strategy
  - Revision/version fields
- Testing Strategy
  - Basic equality
  - Different field
  - Nullable field
  - Collection equality
  - Nested equality
  - Subclasses
  - Hash collection
- Props Regression Tests
- Debugging Workflow
  - 1. Inspect runtime type
  - 2. Inspect `props`
  - 3. Verify each nested object's equality
  - 4. Inspect collections
  - 5. Check mutation
  - 6. Check hash-based use
  - 7. Check Bloc/Cubit emission
  - 8. Check rebuild filters
  - 9. Add characterization tests

---

## Performance

### Typical small models

For normal immutable models containing a handful of scalar/nested values, prioritize correctness and maintainability.

Do not remove Equatable based on folklore.

### `props` allocation

A getter such as:

```dart
@override
List<Object?> get props => [a, b, c];
```

constructs a list when evaluated.

Equatable may access `props` during equality, hash calculation, and string formatting.

For ordinary application models this allocation is usually not a reason to introduce exotic caching.

Do not cache a `props` list when doing so would make equality stale or complicate correctness.

### Large collections

Equality for ordered iterables may inspect elements until a mismatch is found or the iterable is exhausted. Set matching and map comparison likewise involve collection traversal; current source contains explicit loops for these structures. Hashing recursively traverses collection contents.

Equality can therefore become significant for:

- thousands of items;
- deeply nested structures;
- large maps;
- repeated state comparisons;
- equality on animation/frame-adjacent hot paths;
- repeated hash computation.

### Profiling strategy

Optimize in this order:

1. confirm the equality contract;
2. make the model immutable;
3. measure equality/hash frequency;
4. measure collection sizes;
5. identify actual hot paths;
6. redesign data representation if justified;
7. re-test semantic correctness.

Possible architectural improvements include:

- pagination;
- normalized state;
- smaller selected view models;
- splitting independent state;
- persistent immutable data structures;
- revision fields where architecture guarantees they accurately represent semantic changes.

### Revision/version fields

Do not replace:

```dart
props => [items]
```

with:

```dart
props => [revision]
```

merely because the list is large.

Version-only equality is correct only if the architecture guarantees:

```text
same revision
⇔
same logical value
```

and every semantic mutation produces the correct revision.

Treat this as an advanced invariant, not an Equatable optimization trick.

---

## Testing Strategy

For important value types, test the equality contract explicitly.

### Basic equality

```dart
test('equal values are equal', () {
  const a = Money(
    amountInMinorUnits: 1000,
    currency: 'EUR',
  );
  const b = Money(
    amountInMinorUnits: 1000,
    currency: 'EUR',
  );

  expect(a, equals(b));
  expect(a.hashCode, equals(b.hashCode));
});
```

### Different field

```dart
test('different currency is unequal', () {
  const a = Money(
    amountInMinorUnits: 1000,
    currency: 'EUR',
  );
  const b = Money(
    amountInMinorUnits: 1000,
    currency: 'USD',
  );

  expect(a, isNot(equals(b)));
});
```

### Nullable field

```dart
test('nullable field participates in equality', () {
  const a = Profile(name: 'Ava', avatarUrl: null);
  const b = Profile(
    name: 'Ava',
    avatarUrl: Uri.parse('https://example.com/a.png'),
  );

  expect(a, isNot(equals(b)));
});
```

### Collection equality

```dart
test('list contents participate structurally and in order', () {
  final a = Tags(['flutter', 'dart']);
  final b = Tags(['flutter', 'dart']);
  final c = Tags(['dart', 'flutter']);

  expect(a, equals(b));
  expect(a.hashCode, equals(b.hashCode));
  expect(a, isNot(equals(c)));
});
```

### Nested equality

Test both nested Equatable values and intentionally identity-based nested values when relevant.

### Subclasses

Verify that distinct state subclasses do not compare equal unexpectedly.

### Hash collection

For business-critical hash keys:

```dart
test('equal keys address the same map entry', () {
  const keyA = ProductId('p-1');
  const keyB = ProductId('p-1');

  final map = <ProductId, String>{
    keyA: 'value',
  };

  expect(map[keyB], 'value');
});
```

---

## Props Regression Tests

For high-risk models, vary each equality-defining field independently.

Given:

```dart
final class CheckoutState extends Equatable {
  const CheckoutState({
    required this.status,
    required this.total,
    required this.promoCode,
  });

  final CheckoutStatus status;
  final Money total;
  final String? promoCode;

  @override
  List<Object?> get props => [
        status,
        total,
        promoCode,
      ];
}
```

write tests where each field differs while the others remain constant.

This catches accidental omission from `props`.

Do not test the literal `props` list as the primary behavior:

```dart
expect(state.props, [...]);
```

Prefer testing observable equality semantics. That keeps tests focused on the contract instead of an implementation detail.

---

## Debugging Workflow

When equality is wrong, follow this sequence.

### 1. Inspect runtime type

Check:

```dart
print(a.runtimeType);
print(b.runtimeType);
```

Different Equatable runtime types are not equal.

### 2. Inspect `props`

Compare:

```dart
print(a.props);
print(b.props);
```

Look for:

- omitted fields;
- incorrect order;
- transient values;
- accidental callbacks;
- stale mutable data.

### 3. Verify each nested object's equality

For every nested field:

```dart
print(a.child == b.child);
```

Determine whether it has value or identity equality.

### 4. Inspect collections

Check:

- list order;
- set membership;
- map keys;
- nested collections;
- plain-object elements.

### 5. Check mutation

Search for:

```dart
list.add(...)
map[...] = ...
set.add(...)
state.field...
```

on data already owned by an Equatable object.

### 6. Check hash-based use

Determine whether the object was inserted into a `Set` or used as a `Map` key before its equality data changed.

### 7. Check Bloc/Cubit emission

Compare:

```dart
state == nextState
```

before calling `emit`.

Remember current Bloc suppresses equal subsequent states.

### 8. Check rebuild filters

Inspect:

- `buildWhen`;
- `listenWhen`;
- `BlocSelector`;
- `context.select`;
- custom selectors.

### 9. Add characterization tests

Reproduce the bug using direct equality assertions before changing code.

---

