# Dart Idioms and Data Rules

## Prefer language primitives over bespoke “cleverness”

The Vandad corpus contains many useful experiments with custom operators, extensions, range helpers, compact-map helpers, map subscripts, custom iterables, zip/tuple emulation, and generic conversion. These teach Dart's extension/operator capabilities well, but production code should first ask whether modern Dart already makes the operation clear.

### Preferred

- collection `if`, `for`, spread (`...`) and null-aware spread (`...?`).
- null-aware collection elements where supported by the project's Dart language version.
- records for small structural multi-values.
- patterns/destructuring for structured parsing when it improves clarity.
- `where`, `map`, `expand`, `fold`, `Map.update`, `Set`, and standard constructors.
- named helpers when behavior is domain-specific.

### Situational

Custom extensions are valuable when:

- the operation repeats across the codebase;
- the receiver/return type makes semantics obvious;
- complexity/allocation behavior is understood;
- the name is discoverable and unsurprising;
- tests define edge cases.

### Avoid

- overloading `+`/`-` for collection semantics that teammates cannot predict;
- extensions that silently swallow invalid input;
- generic “convert anything to int/string” helpers that erase type errors;
- deep recursive flatten/search helpers without depth/shape assumptions;
- performance claims based only on concise syntax.

## Const, final, var

Use `const` for compile-time immutable values and widgets when natural. Use `final` for runtime single-assignment values. Use `var` when inference is obvious and mutability is intentional or the variable remains effectively single-purpose.

Do not treat “prefer const over final over var” as a total ordering for every declaration: they encode different semantics.

```dart
const timeout = Duration(seconds: 10);
final startedAt = DateTime.now();
var retryCount = 0;
```

## Type annotations

Prefer explicit public API types and explicit types where inference hides important contracts. Local inference is idiomatic when the type is obvious.

```dart
Future<User> loadUser(UserId id) async { ... }
final user = await loadUser(id);
```

Avoid `dynamic` as an escape hatch for JSON. Parse at the boundary.

## JSON parsing

**Trigger:** `Map<String, dynamic>` flows deep into application code.  
**Action:** validate/convert near the transport boundary into typed models. Patterns can make structural checks concise, but generated serializers/manual constructors are still appropriate.

```dart
User parseUser(Object? json) {
  return switch (json) {
    {'id': final String id, 'name': final String name} => User(id: id, name: name),
    _ => throw const FormatException('Invalid user payload'),
  };
}
```

## Null safety

- Prefer promotion and null-aware syntax over `!`.
- `!` is appropriate only when an invariant is stronger than the static type and is locally obvious/tested.
- Do not convert null into a fabricated default unless the domain actually defines that default.
- Be careful with helpers named “safe list” or “optional first”; they may hide data-quality bugs. Prefer `firstOrNull`-style APIs only when “missing” is valid domain state and the API is available via the chosen standard/package approach.

## Equality and hashing

When overriding `==`, also provide a consistent `hashCode`. Prefer `Object.hash` / `Object.hashAll` for straightforward fields.

```dart
@immutable
class Point {
  const Point(this.x, this.y);
  final int x;
  final int y;

  @override
  bool operator ==(Object other) =>
      identical(this, other) || other is Point && other.x == x && other.y == y;

  @override
  int get hashCode => Object.hash(x, y);
}
```

Do not use `identical` when semantic equality is required; it tests identity/canonicalization.

## List/map equality

Dart collection `==` is not a universal deep structural equality operation. Choose order-sensitive vs order-insensitive semantics explicitly and use appropriate utilities/normalization.

Avoid converting to `Set` when duplicate multiplicity matters.

## Constructors

### Factory constructors

Use when construction may:

- return a cached/subtype/existing instance;
- validate/normalize before returning an instance;
- delegate to a private implementation.

Use a regular generative constructor when no alternative instance behavior is needed.

### Static factory method vs `factory`

Prefer the form that best communicates the API. `factory` participates in constructor syntax and can return another implementation; named static methods can communicate actions such as `parse`, `load`, or `tryCreate` more clearly.

## Enums, records, patterns

Older corpus tips on “classes as enums”, tuples, and associated values should be reconsidered with modern Dart:

- enhanced enums can own fields/methods;
- records replace many ad-hoc tuple classes;
- patterns can destructure records/lists/maps/classes;
- sealed class hierarchies remain appropriate for sum types with behavior/state beyond enum cases.

Do not modernize mechanically; keep a class if it encodes identity, invariants, extensibility, or domain behavior.

## Function tear-offs

Prefer a tear-off when a callback already matches the required signature.

```dart
items.map(parseItem); // Prefer
items.map((item) => parseItem(item)); // Extra wrapper unless adaptation is needed
```

## `unawaited` and ignored futures

Use `unawaited(future)` to document intentional fire-and-forget behavior. Use `.ignore()` when you intentionally discard both value and errors according to the API semantics—but do not use either to hide meaningful failures.

For analytics/telemetry fire-and-forget calls, ensure the SDK handles errors internally or attach an explicit error strategy.

## Exceptions and stack traces

- `rethrow` preserves the current exception and stack when inside `catch`.
- If translating an exception but preserving a chosen stack, use supported stack-preserving mechanisms such as `Error.throwWithStackTrace` where appropriate.
- Do not catch `Object` and return a default unless the boundary explicitly defines that recovery.

```dart
try {
  return await api.load();
} on ApiException catch (e, st) {
  Error.throwWithStackTrace(UserLoadException(e), st);
}
```

## Experimental/reflection features

### Dart mirrors

`dart:mirrors` is not a normal Flutter cross-platform solution. Reflection-based tips are educational/VM-specific and should be marked **Legacy/Situational** for Flutter app code.

### Macros

A source tip demonstrated experimental `JsonCodable` macros. Work on that macro experiment was stopped. Do not teach the old macro snippet as a current serialization solution. Use supported code generation/manual serialization or current language features appropriate to the project.
