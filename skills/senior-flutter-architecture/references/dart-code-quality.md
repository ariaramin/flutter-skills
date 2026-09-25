# Dart Code Quality & API Design

## Clarity over cleverness

Prefer code that communicates ownership and state transitions directly.

## Immutability

Use immutable values for:
- view state;
- domain values;
- events/commands;
- configuration.

Mutation can be valid inside tightly owned repositories/caches/controllers. Do not expose mutable internal collections directly.

## `final`

Use `final` by default when a variable/reference is not reassigned.
Do not convert local code into `const` gymnastics when readability suffers.

## Null safety

Model absence intentionally.
Avoid routine `!`.
If an invariant guarantees non-null, prefer structure that makes the invariant obvious or assert it at the boundary.

## Sealed classes / exhaustive switches [D/S]

Use when they make a state machine or result domain clearer and invalid cases harder to represent.

Do not create a class hierarchy for a two-state local toggle.

## Exceptions vs result types

Boundary failures should be normalized.

A project may use:
- exceptions internally + mapping at boundary;
- `Result`/`Either`-style values;
- sealed success/failure.

Choose consistency and meaningful semantics over ideology.

Do not catch every exception and convert it to `false`.

## API surface

For packages/public components:
- export only intended API;
- avoid leaking implementation types;
- document lifecycle/ownership;
- use semantic names;
- preserve backwards compatibility.

For app-internal classes, avoid interface ceremony without a reason.

## Collections

Expose unmodifiable/read-only views when callers should not mutate internal state.
Avoid repeated large `map/sort/where/toList` pipelines inside hot rebuild paths.

## Async

Await futures unless intentionally detached.
Handle stream errors intentionally.
Do not swallow async errors.

## Naming

Name by responsibility:
- `UserRepository`
- `AuthService`
- `CheckoutViewModel`

Avoid vague:
- `Manager`
- `Helper`
- `Utils`
- `CommonService`

unless the responsibility is genuinely that broad (rare).

## Extensions

Use extensions for cohesive convenience on a type.
Do not hide side effects/business workflows in surprising extensions.

## Mixins/inheritance

Prefer composition for app architecture.
Use mixins/inheritance when the type relationship and lifecycle contract are genuinely shared.

## Code generation

Use generation when it materially improves:
- serialization;
- immutable models;
- typed routing;
- DI boilerplate;
- union/state modeling.

Costs:
- build_runner time;
- generated diffs;
- toolchain coupling;
- migration burden.

Do not add codegen to avoid writing a few stable lines.

## Analyzer/lints

Keep analyzer clean.
Prefer fixing code over global ignore rules.
When a lint is intentionally disabled, scope it narrowly and document why.

## Comments

Explain:
- why;
- invariants;
- unusual platform constraints;
- non-obvious tradeoffs.

Do not narrate obvious syntax.
