---
name: dart-flutter-equatable-engineering
description: Design, implement, review, debug, test, migrate, and optimize value equality in production Dart and Flutter code using Equatable or appropriate alternatives. Use this skill whenever work involves Equatable, `props`, immutable Bloc/Cubit states or events, equality bugs, suppressed state emissions, lists/sets/maps in equality, Map keys or Set elements, `hashCode`, `stringify`, entity-vs-value semantics, records/generated equality, or migrating manual equality—even if the user only says two objects compare incorrectly or the UI did not rebuild.
compatibility: Research baseline is Equatable 2.1.0 with Dart 3.x and current Bloc/flutter_bloc behavior described in the bundled source. Inspect the repository's locked Equatable, Dart, Bloc, and Flutter versions before applying version-sensitive API details.
---
# Dart & Flutter Equatable Engineering
## Goal
Treat Equatable as an implementation mechanism for an already-defined equality model.

Do not begin with `extends Equatable`. First determine:
1. what the type represents;
2. whether separately constructed instances should be interchangeable;
3. which fields define that logical value;
4. whether equality must remain stable for the object's lifetime;
5. whether Bloc, selectors, caches, sets, maps, or tests rely on that equality;
6. which single equality mechanism best represents the semantics.
Optimize for correctness first. Equality mistakes can silently alter state emission, rebuild behavior, cache keys, map/set lookup, deduplication, and tests.
## Research baseline and freshness guard
The bundled source is based on Equatable 2.1.0 behavior, Dart equality documentation, and current Bloc/flutter_bloc behavior from that research baseline.

Before changing repository code:
- inspect `pubspec.yaml` and `pubspec.lock`;
- identify the Equatable version;
- identify Dart/Flutter constraints;
- identify Bloc/flutter_bloc versions when state equality is involved;
- verify version-sensitive APIs before migrating legacy code.
Important baseline facts from the supplied research:
- Equatable 2.1.0 requires Dart `>=3.0.0 <4.0.0`;
- `Equatable` is an `abstract mixin class` in that version;
- legacy `EquatableMixin` is deprecated in favor of `with Equatable`;
- Equatable equality includes `runtimeType` and `props`;
- current Equatable structurally compares supported lists/iterables, sets, maps, and nested values;
- current Bloc/Cubit suppresses later emissions when the next state equals the current state, with the documented first-emission exception.
Do not silently project these details onto a repository using materially different versions.
## Reference routing
Load only the reference relevant to the task.
| Task | Read |
|---|---|
| Choosing equality semantics; Equatable API; `props`; nested objects; collections; inheritance; entities; records; generators; manual equality | `references/01-equality-modeling.md` |
| Bloc/Cubit states/events; `copyWith`; selectors; hash collections; `stringify`; sensitive output | `references/02-bloc-state-and-stringify.md` |
| Equality performance; large collections; profiling; tests; debugging wrong equality | `references/03-performance-testing-debugging.md` |
| Anti-pattern review; new-model workflow; existing-code review; migrations; production checklists | `references/04-antipatterns-workflows-checklists.md` |
Read the full relevant reference before making a high-risk semantic change.
## Non-negotiable invariants
1. Define equality semantics before choosing Equatable.
2. Use value equality only when the type represents a logical value or immutable snapshot whose values should be interchangeable.
3. Keep all equality-relevant state immutable for the object's lifetime.
4. Include every logically significant independent value in `props`.
5. Exclude a field only because the domain says it is outside equality—not to force fewer rebuilds.
6. Verify nested values' own equality semantics.
7. Treat mutable collections inside `props` as correctness hazards.
8. Preserve `a == b => a.hashCode == b.hashCode`.
9. Treat Map keys and Set elements as deeply immutable with respect to equality.
10. Use one authoritative equality implementation per type.
11. Do not mutate Bloc/Cubit state and re-emit the same object.
12. Treat changes to `props` as behavioral changes requiring tests.
13. Do not use equality as a substitute for event concurrency, debounce, retry, or deduplication policy.
14. Never expose secrets or sensitive personal data through `stringify`, `toString`, observers, logs, analytics, or crash tooling.
15. Optimize equality only after profiling identifies a real cost.
## Step 1 — Classify the type
Classify the type before editing it.

Typical categories:
- value object;
- entity identity;
- immutable entity snapshot;
- Bloc/Cubit state;
- Bloc event;
- DTO;
- UI/view model;
- configuration value;
- service/repository;
- controller/resource/lifecycle object;
- short tuple-like internal result.
Default decisions:
- value object: value equality is usually appropriate;
- immutable state snapshot: value equality is often appropriate;
- service/repository/controller/resource: usually retain identity semantics;
- DTO used only for decode-map-discard: equality may be unnecessary;
- generated immutable model: keep generated equality rather than layering Equatable;
- short internal tuple: consider a Dart record;
- approximate numeric comparison: model explicitly rather than expecting Equatable to provide tolerance.
State the intended contract in one sentence before implementation, for example:
> Two `Money` values are equal when minor-unit amount and currency match.
For an entity, distinguish identity semantics from snapshot semantics. `User(id)` and `UserSnapshot(id, name, email)` can legitimately have different equality contracts.
## Step 2 — Inspect equality consumers
Search for where the type is compared or hashed:
- direct `==` / `!=`;
- unit tests;
- Bloc/Cubit `emit`;
- `buildWhen` / `listenWhen`;
- `BlocSelector` / `context.select`;
- `Set` membership;
- `Map` keys;
- caches;
- memoization;
- deduplication;
- collections using equality;
- test matchers;
- logging/stringification.
If equality has no consumer and no clear semantic value, do not add machinery by default.
## Step 3 — Choose one equality mechanism
Choose exactly one authoritative implementation:
- `extends Equatable` when the type is a value and no other superclass is required;
- `with Equatable` when another superclass is required and the repository's version supports it;
- Dart record for compact tuple-like values;
- generated equality when the project's model generator already owns `==` and `hashCode`;
- manual equality for specialized semantics Equatable does not express cleanly;
- default identity equality for lifecycle/resource/service objects.
Do not combine Equatable with another generated or manual equality system merely for convenience.

Do not introduce new `EquatableMixin` usage on the 2.1.0 baseline.
## Step 4 — Design `props` from semantics
For every field ask:
> If only this field changes, should the object become a different logical value?
If yes, include it.

If no, document why it is outside equality.

Usually include:
- scalar values defining the value;
- state/status enums;
- domain IDs when identity participates;
- nested immutable values;
- nullable logical values;
- semantically relevant collections.
Usually exclude only when semantically irrelevant:
- caches derived fully from included fields;
- services/repositories/loggers;
- controllers/subscriptions/resources;
- callbacks when callback identity is not part of the logical value;
- diagnostic-only metadata;
- redundant pure derived fields.
Use `List<Object?>` when nullable equality fields exist.

Keep `props` deterministic and stable.
## Step 5 — Guarantee immutability
`final List<T>` does not make the list contents immutable.

When mutable data enters a value object/state:
- defensively copy where external aliases can mutate it;
- expose unmodifiable collections when appropriate;
- ensure nested equality objects are also immutable;
- create a new snapshot for every semantic state change.
Examples of safe boundaries:
```dart
items = List.unmodifiable(items);
roles = Set.unmodifiable(roles);
values = Map.unmodifiable(values);
```
An unmodifiable outer collection does not freeze mutable objects contained inside it. Copy as deeply as the mutation boundaries require.

Never mutate equality-relevant state after inserting an object into a `HashSet` or using it as a `HashMap` key.
## Step 6 — Verify nested and collection semantics
Equatable cannot manufacture value equality for arbitrary nested classes.

For every nested object in `props`, inspect its `==` and `hashCode` behavior.

On the supplied 2.1.0 baseline:
- ordered iterables/lists are compared structurally and order matters;
- sets are compared structurally without relying on insertion order;
- maps compare corresponding keys and recursively compared values;
- supported nested collections recurse through those rules;
- nested Equatable values use their own equality;
- ordinary nested objects still use whatever equality they implement.
Do not infer that a plain class becomes structurally equal simply because it appears inside a list or map contained in `props`.
## Step 7 — Handle inheritance deliberately
Equatable requires matching runtime types after the identical-instance fast path.

Therefore two subclasses with identical empty `props` remain unequal if their runtime types differ.

When subclass equality extends parent semantics, include the parent values intentionally:
```dart
@override
List<Object?> get props => [
  ...super.props,
  childValue,
];
```
Do not spread `super.props` automatically if the subclass intentionally defines a different equality contract. Review the hierarchy first.
## Step 8 — Apply Bloc/Cubit rules
Bloc/Cubit state equality is operational, not cosmetic.

For each state:
- include every logical state field;
- keep nested values and collections immutable;
- make `copyWith` return a new snapshot;
- support explicit null-clearing when nullable state requires it;
- preserve meaningful status/loading/error fields in equality;
- test every important transition.
Never do:
```dart
state.items.add(item);
emit(state);
```
Prefer:
```dart
emit(
  state.copyWith(
    items: [...state.items, item],
  ),
);
```
When a UI does not update, inspect in this order:
1. did Bloc/Cubit accept the new state;
2. does `state == nextState` return true;
3. is a logical field missing from `props`;
4. was the existing state/nested collection mutated;
5. is `buildWhen` suppressing the rebuild;
6. does `BlocSelector`/`context.select` return an equal selected value;
7. is the widget observing the intended Bloc instance;
8. is another layer caching/filtering the value.
Do not claim Equatable deduplicates Bloc events. Event concurrency/transformation policy is separate.
## Step 9 — Review `copyWith`
A `copyWith` should preserve unchanged fields and create a new immutable snapshot.

For nullable properties, detect whether the API must distinguish:
- leave current value unchanged;
- explicitly set value to `null`.
If that distinction matters, use a sentinel, wrapper, generated `copyWith`, or another explicit representation. Do not silently make null impossible to set.
## Step 10 — Protect hash semantics
For objects used as Map keys or Set elements:
- equality-relevant data must never mutate while stored;
- equal instances must produce equal hash codes;
- do not persist or externally depend on Equatable's numeric hash algorithm;
- test lookup with a separately constructed equal key when behavior matters.
If a key needs mutable lifecycle state, redesign the key as an immutable value.
## Step 11 — Control stringification and sensitive output
`stringify` affects `toString`, not equality.

On the supplied baseline:
- per-class `stringify` can override global behavior;
- `EquatableConfig.stringify` is global mutable configuration;
- default behavior differs between debug and release according to current source.
For secret-bearing or privacy-sensitive models:
- set `stringify` to false where appropriate;
- provide a redacted `toString` only if useful;
- inspect Bloc observers, logs, analytics, crash reports, and test snapshots;
- restore `EquatableConfig.stringify` after tests that mutate it.
Never expose passwords, access tokens, refresh tokens, private keys, payment secrets, or unnecessary personal information through automatic property output.
## Step 12 — Performance discipline
Do not optimize semantically correct small models based on folklore.

Equality cost can become meaningful for:
- thousands of list/set/map elements;
- deeply nested structures;
- repeated equality in hot state paths;
- repeated hash computation;
- large hash collections.
Profile before redesigning.

Measure:
- equality call frequency;
- `hashCode` call frequency;
- collection sizes;
- nested depth;
- state-selection comparison frequency;
- actual CPU/allocation cost.
Prefer architectural improvements such as:
- pagination;
- normalized state;
- smaller selected view models;
- splitting independent state;
- immutable/persistent data structures when justified.
Do not replace full semantic equality with a revision number unless the architecture proves:
```text
same revision ⇔ same logical value
```
and guarantees every semantic change updates that revision correctly.
## Step 13 — Test equality behavior
For important value types, test behavior rather than the literal `props` list.

Cover:
- separately constructed equal values;
- equal values have equal hash codes;
- each equality-defining field varied independently;
- nullable fields;
- nested values;
- list order;
- set/map semantics where relied upon;
- subtype behavior;
- hash-map/set lookup;
- Bloc state transitions;
- sensitive stringification where relevant.
For high-risk models, create a props regression matrix: hold all fields constant and change one logical field per test. This catches accidental omissions while preserving implementation flexibility.
## Step 14 — Debug equality systematically
When equality is wrong:
1. compare `runtimeType`;
2. inspect both `props` values;
3. identify omitted or accidental fields;
4. compare each nested object's equality directly;
5. inspect list order, set members, map keys/values, and nested collections;
6. search mutation paths;
7. check hash-key/set use;
8. compare current and next Bloc state directly;
9. inspect selectors/build filters;
10. add a characterization test reproducing the issue.
Do not change `props` until the intended semantics are explicit.
## Step 15 — Refactor and migrate safely
Changing `props`, equality technology, or mutability can change application behavior without changing the public field list.

Before migration:
- characterize current equality with tests;
- record runtime-type behavior;
- record nested/collection semantics;
- inspect Set/Map usage;
- inspect Bloc emission/selectors;
- inspect stringification/logging.
### Manual equality → Equatable
Preserve existing semantics first. Migrate only if Equatable can represent the same contract. Remove manual `==`/`hashCode` after tests prove equivalence.
### Equatable → generated model/record/manual equality
Compare behavior before removing Equatable. Different “value equality” mechanisms can differ in runtime-type, nested collection, and hashing semantics.
### Legacy `EquatableMixin`
On repositories using Equatable 2.1.0-compatible APIs, migrate toward `with Equatable` when appropriate and covered by tests.
## Common review findings to reject
Reject these patterns unless a documented domain invariant proves them correct:
- every data class extends Equatable automatically;
- services/controllers/resources use value equality merely because they have fields;
- logical state fields omitted from `props` to reduce rebuilds;
- mutable list/map/set stored directly in `props`;
- state mutated and re-emitted by reference;
- timestamps/random IDs added solely to force inequality;
- callback identity placed in equality without semantic reason;
- generated equality combined with Equatable;
- manual `operator ==` layered on top of Equatable;
- entity equality chosen mechanically as “all fields” or “ID only” without domain reasoning;
- revision-only equality introduced solely because collections are large;
- `stringify` enabled on credentials or sensitive personal models;
- Equatable event equality described as Bloc deduplication/concurrency control.
## Repository review workflow
When reviewing existing code:
1. inventory Equatable types and manual/generated equality;
2. classify each type's semantics;
3. identify equality consumers;
4. inspect `props` and excluded fields;
5. inspect nested equality;
6. inspect collection ownership and mutation;
7. inspect inheritance and `super.props`;
8. inspect Bloc states, events, selectors, and transitions;
9. inspect hash-key/set use;
10. inspect `stringify` and logging exposure;
11. inspect equality tests;
12. profile only where cost is suspected;
13. make the smallest semantics-preserving fix;
14. rerun affected tests and repository checks.
Do not rewrite unrelated application architecture while fixing equality.
## Change report format
For a meaningful equality change, report:

**Type and role**
- value object / entity / state / event / DTO / resource / other.
**Intended equality**
- plain-language statement of when two instances are equal.
**Existing issue**
- missing field, mutation, wrong nested equality, duplicate implementation, hash instability, state suppression, sensitive stringify, or measured performance cost.
**Change**
- exact equality/immutability/migration modification.
**Behavioral impact**
- Bloc emission, selector behavior, Set/Map lookup, cache/deduplication, tests, or logging affected.
**Verification**
- tests run and relevant equality/hash/state assertions.
**Residual risk**
- unverified versions, callers, or performance assumptions.
## Production definition of done
An important equality implementation is ready when:
- the type's equality semantics are intentional;
- value equality is appropriate for the type;
- one equality mechanism owns `==` and `hashCode`;
- all independent equality-defining fields participate;
- excluded fields are intentionally outside equality;
- equality-relevant state is immutable;
- external mutable inputs are defensively handled;
- nested equality has been verified;
- collection semantics match the domain;
- hash code remains stable for the object's lifetime;
- Set/Map key behavior is safe where used;
- inheritance/runtime-type behavior is understood;
- Bloc/Cubit states create immutable snapshots;
- intended state transitions do not collapse accidentally;
- selectors/build filters have been considered;
- sensitive values cannot leak through stringification;
- important equality behavior has regression tests;
- performance changes, if any, are profiling-driven;
- repository checks pass.
## Final operating rule
Do not ask only:
> How do I add Equatable to this class?
Resolve instead:
```text
What does the type represent?
→ Should two distinct instances be interchangeable?
→ Which values define that sameness?
→ Can those values remain immutable?
→ What do nested values mean by equality?
→ Will Bloc/selectors/hash collections rely on it?
→ Which one equality mechanism best expresses the contract?
→ Can tests prove the behavior?
```
Then implement the smallest equality design that preserves those guarantees.
