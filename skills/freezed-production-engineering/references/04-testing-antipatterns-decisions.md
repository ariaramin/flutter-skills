# Reference: Testing, serialization fixtures, anti-patterns, decision tables, and review checklists.

Original source lines: 2486–2755

# 71. Testing strategy

Do not write large test suites proving that Freezed itself can:

- assign constructor parameters
- copy one ordinary field
- compare two simple generated objects

unless the repository has a specific regression reason.

Focus tests on code **you own** and contracts that matter.

Test:

- custom validation
- custom getters/methods
- domain invariants
- API fixtures
- JSON field names
- missing/null contract behavior
- converters
- enum compatibility
- union discriminators
- unknown union behavior
- DTO/domain mappers
- state transitions
- custom equality semantics
- collection ownership assumptions when externally mutable inputs are accepted
- migrations that alter serialized payloads

---

# 72. Serialization contract testing

For an important DTO, prefer realistic fixture tests.

Example:

```
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('UserDto decodes the backend user contract', () {
    final dto = UserDto.fromJson(
      <String, Object?>{
        'user_id': '42',
        'displayName': 'Ada',
        'isAdmin': true,
      },
    );

    expect(dto.id, '42');
    expect(dto.displayName, 'Ada');
    expect(dto.isAdmin, isTrue);
  });

  test('UserDto encodes the expected backend keys', () {
    const dto = UserDto(
      id: '42',
      displayName: 'Ada',
      isAdmin: false,
    );

    expect(
      dto.toJson(),
      <String, Object?>{
        'user_id': '42',
        'displayName': 'Ada',
        'isAdmin': false,
      },
    );
  });
}

```

Tests should protect the external contract, not merely the generator.

---

# 73. Anti-patterns

Reject or question these patterns.

### Freezed everywhere

Do not annotate every class.

Services, controllers, repositories, mutable caches, and trivial implementation objects usually are not value models.

### Union for every state

Mutually exclusive variants are useful.

Do not transform every boolean/loading/error combination into a five-level state hierarchy when ordinary fields better represent coexistence.

### Duplicate DTO/entity/model classes

Do not create several identical structures with one-to-one mapper boilerplate unless a real architecture boundary exists.

### Hidden mutable objects

Do not put a mutable graph inside a Freezed state and assume the state is immutable.

### Huge structural equality in hot paths

Do not repeatedly compare enormous collections without understanding state ownership and update frequency.

### Repeated `copyWith` in tight loops

Do not rebuild a growing collection and outer state thousands of times when changes can be batched.

### Blind `--delete-conflicting-outputs`

Do not treat a historical build flag as a universal repair operation.

### Forgetting generation

Annotated source and generated output must remain synchronized according to repository policy.

### Editing generated files

Never.

### Business logic in generated parts

Never.

### Directly coupling domain to unstable backend JSON

Use a DTO/mapper boundary where instability or incompatible semantics justify it.

### Old `when`/`map` tutorials

Current Freezed docs recommend native Dart patterns; preserve legacy APIs only when repository/version context requires them.

### Mixing major-version syntax

Do not paste Freezed 3/4 examples into a Freezed 2 repository.

### Codegen as model design

Freezed reduces boilerplate; it does not determine aggregates, ownership, domain boundaries, or state machines.

### Disabling collection protection for convenience

Understand the semantic consequences first.

### Freezed as an architecture layer

It is a modeling/code-generation tool.

---

# 74. Decision table — Native Dart vs Freezed

| OptionEquality`copyWith`JSONSealed matchingBoilerplateBuild costRuntime considerationsBest fit |                                            |           |                                      |                                          |                                           |                                    |                                              |                                                               |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------ | --------- | ------------------------------------ | ---------------------------------------- | ----------------------------------------- | ---------------------------------- | -------------------------------------------- | ------------------------------------------------------------- |
| Plain Dart class                                                                               | Identity by default; manual value equality | Manual    | Manual/generated separately          | No special union support                 | Low for tiny classes; grows with features | None unless other generators       | Exactly what you implement                   | Services, tiny models, identity objects, custom behavior      |
| Native sealed hierarchy                                                                        | Manual per subtype                         | Manual    | Manual/generated separately          | Excellent native exhaustive `switch`     | Moderate                                  | None unless serializer used        | Simple subtype dispatch                      | Small closed hierarchies needing no generated value semantics |
| Freezed data class                                                                             | Generated structural equality by default   | Generated | Optional through `json_serializable` | Not usually relevant for one constructor | Very low source boilerplate               | Freezed generator                  | Equality/copying/collection protection costs | Immutable value objects, substantial state, DTOs              |
| Freezed union                                                                                  | Generated per-variant value semantics      | Generated | Optional discriminated JSON          | Excellent with native Dart patterns      | Low relative to payload-rich union        | Freezed + optional JSON generation | Variant allocations plus value semantics     | Payload-bearing result/state hierarchies                      |

**Decision rule:** choose the lowest-machinery option that provides the semantics actually required.

---

# 75. Decision table — Model category

| Model categoryFreezed suitabilityDefault reasoning |                                    |                                                                                      |
| -------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------ |
| Network DTO                                        | Often good                         | Strong when JSON + immutability + several fields/value semantics are useful          |
| Domain model                                       | Context-dependent                  | Use for genuine value semantics; reconsider all-field equality for identity entities |
| UI state                                           | Often strong                       | Immutable snapshots, copying, equality, and variants are frequently useful           |
| Event/action                                       | Context-dependent                  | Freezed for payload-rich value variants; enum/native sealed for simple cases         |
| Value object                                       | Often strong                       | Good fit when several fields jointly define a value                                  |
| Persistence model                                  | Tool-dependent                     | Prefer the database/persistence model generator unless Freezed adds real value       |
| Configuration                                      | Often unnecessary for tiny classes | Native const classes can be clearer                                                  |
| Navigation args                                    | Context-dependent                  | Useful for substantial values; overkill for trivial one-field arguments              |

---

# 76. Decision table — Serialization strategy

| StrategyPrefer whenAvoid when |                                                                        |                                                                               |
| ----------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Direct Freezed + JSON         | Wire schema and app semantics are stable and closely aligned           | Backend is unstable or domain semantics differ materially                     |
| Dedicated DTO                 | Transport boundary deserves isolation                                  | DTO and domain object are permanently identical with no independent evolution |
| Custom mapper                 | Transformation, normalization, filtering, or invariants are meaningful | Mapping is a pointless 1:1 copy with no boundary benefit                      |
| `JsonConverter`               | One type has reusable stable wire conversion                           | Conversion depends heavily on context or changes object structure             |
| `JsonKey.fromJson/toJson`     | One field needs a small isolated conversion                            | Conversion is reused widely or represents complex normalization               |
| Manual serializer             | Schema is highly irregular or strict custom behavior matters           | Normal `json_serializable` already describes the contract cleanly             |

---

# 77. Performance checklist

Before approving a Freezed model, inspect:

-  Is equality comparing a large `List`, `Set`, or `Map`?
-  Is equality recursively comparing large nested value graphs?
-  Is the state recreated at high frequency?
-  Does one state object own too much unrelated data?
-  Could large data live in a repository/provider/cache with lightweight UI references?
-  Are large collections reconstructed unnecessarily?
-  Is `copyWith` called repeatedly inside a tight loop?
-  Are JSON encode/decode operations on a latency-sensitive UI path?
-  Are unmodifiable wrappers being disabled without evidence?
-  Are mutable objects hidden inside supposedly immutable state?
-  Is the same dataset duplicated across DTO/domain/UI layers?
-  Is identity equality more appropriate?
-  Are generated models excessively numerous?
-  Is generator performance affecting iteration?
-  Has a real profile/measurement identified the bottleneck?
-  Is Freezed solving an actual problem in this class?

---

# 78. Build/CI checklist

-  Dart SDK constraint is known.
-  Flutter version/toolchain is known.
-  Installed `freezed` version is known.
-  `freezed_annotation` is compatible.
-  `build_runner` is compatible.
-  `json_serializable` is compatible if used.
-  `json_annotation` is compatible if used.
-  Required `.freezed.dart` parts are declared.
-  Required `.g.dart` parts are declared.
-  Generated-file Git policy is understood.
-  Generation command matches the installed `build_runner`.
-  CI regenerates or verifies generated code.
-  CI does not depend on undocumented local state.
-  Analyzer runs.
-  Formatter policy runs.
-  Relevant tests run.
-  Serialization fixtures run when external contracts changed.
-  Major upgrades have migration-guide review.
-  `.dart_tool` is treated as cache, not source.
-  Clean builds are not used as the default development workflow.

---

# 79. Code-review checklist

For each changed model ask:

-  Was native Dart considered?
-  Is value equality intentional?
-  Is `copyWith` useful?
-  Are nullable copy semantics correct?
-  Are collections appropriately owned?
-  Can external code mutate a backing collection?
-  Are nested references themselves immutable enough for this context?
-  Does `@Default` represent real contract semantics?
-  Are production invariants enforced outside debug-only assertions?
-  Are union variants actually mutually exclusive?
-  Does pattern matching use modern Dart syntax where supported?
-  Is the JSON discriminator owned by the API rather than generator convenience?
-  Are enum unknown values considered?
-  Is converter logic reusable and context-independent?
-  Is DTO/domain separation actually justified?
-  Is all-field structural equality appropriate for this domain type?
-  Is any large collection likely to dominate equality?
-  Are generated source files untouched?
-  Does syntax match installed Freezed/Dart versions?
-  Is the implementation simpler after introducing Freezed?

---

