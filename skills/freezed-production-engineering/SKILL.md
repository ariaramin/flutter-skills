---
name: freezed-production-engineering
description: Design, implement, review, refactor, debug, test, and migrate immutable Dart/Flutter models using Freezed, native Dart, or both. Use this skill whenever work involves @freezed/@Freezed, copyWith, value equality, sealed unions, JSON DTOs, json_serializable, generated .freezed.dart/.g.dart files, build_runner, Freezed upgrades, state models, collection immutability, converters, union discriminators, or deciding whether Freezed is appropriate—even when the request is phrased only as “create a model”, “clean up state”, “add JSON”, or “fix generated code”.
compatibility: Grounded in the supplied guide's August 2026 baseline (Freezed 3.2.5, freezed_annotation 3.1.0, json_serializable 6.14.1, build_runner 2.16.0, stable Dart 3.12.x). Always inspect the repository SDK constraints, pubspec.lock, generated output, and installed APIs before using version-sensitive syntax; do not introduce Freezed 4 prerelease or Dart 3.13 primary-constructor syntax unless the repository explicitly uses that toolchain.
---
# Freezed Production Engineering
## Mission
Choose the lowest-complexity Dart modeling mechanism that provides the semantics the repository actually needs. Use Freezed when generated immutable value semantics, copying, serialization integration, or payload-bearing sealed variants materially reduce maintenance or correctness risk. Prefer native Dart when it is equally safe and clearer.

Do not optimize for the number of generated classes. Optimize for explicit semantics, stable contracts, repository consistency, predictable runtime behavior, and maintainability.
## Non-negotiable rules
- Inspect the repository before changing models or generator syntax.
- Verify the Dart/Flutter SDK and the resolved `freezed`, `freezed_annotation`, `json_serializable`, `json_annotation`, and `build_runner` versions.
- Decide whether Freezed is justified before adding `@freezed`.
- Treat persisted or serialized JSON as an external contract, not incidental model syntax.
- Treat generated equality and `hashCode` as real runtime work, especially for large/deep collections.
- Treat Freezed collection protection as unmodifiable access, not recursive deep immutability.
- Never edit `*.freezed.dart` or `*.g.dart` manually.
- Regenerate after source/annotation/configuration changes.
- Prefer modern Dart `switch`/patterns for new union consumption when the repository supports them.
- Do not create duplicate DTO/entity/model layers without an independently evolving semantic boundary.
- Do not use `@Assert` as the sole production validation for untrusted or security-sensitive values.
- Do not disable equality, copying, or collection protection merely to make mutation easier; reconsider whether Freezed is the right model.
- Do not attribute a performance issue to Freezed until the expensive operation is identified and measured.
- Treat major Freezed/build-tool upgrades as migrations.
## Reference routing
Read only the reference needed for the task:
- `references/01-selection-immutability-copying.md` — choosing Freezed vs native Dart; dependencies; immutable data classes; collection ownership; equality/hash; `copyWith`; constructors; defaults; classic classes; unions and native patterns.
- `references/02-unions-json-configuration.md` — JSON architecture; DTO examples; nested JSON; defaults/nullability; enums; `JsonConverter`; union discriminators/fallbacks; generics; interfaces/mixins; Freezed/build configuration; state modeling; DTO/domain/persistence boundaries.
- `references/03-performance-build-tooling.md` — runtime/memory/large-collection analysis; build-time cost; code size; build_runner; `--only-check`; generated-file ownership; CI policy; major upgrades; primary constructors; stale generation and cache diagnostics.
- `references/04-testing-antipatterns-decisions.md` — testing strategy; serialization fixtures; anti-patterns; native-vs-Freezed, model-category, and serialization decision tables; performance/build/review checklists.
- `references/05-workflow-completion-sources.md` — full implementation workflow; completion criteria; fast decision algorithm; good rejections/strong candidates; annotation/generated-code stance; source-grounded conclusions and source list.

If an API, flag, generated form, or package behavior is version-sensitive, inspect the installed repository first and then consult the relevant reference instead of relying on memory.
## Repository inspection gate
Before editing, inspect:
```text
pubspec.yaml
pubspec.lock (for applications)
Dart SDK constraint
Flutter SDK/toolchain
freezed
freezed_annotation
build_runner
json_serializable
json_annotation
analysis_options.yaml
build.yaml
existing *.freezed.dart / *.g.dart
state-management package
persistence generators
custom JsonConverters
code-generation scripts
CI generation policy
whether generated files are committed
```
Also search existing model declarations to identify the repository convention:
```text
@freezed
@Freezed
@unfreezed
sealed class
abstract class
fromJson
toJson
copyWith
```
Preserve the dominant convention unless a concrete defect or migration goal justifies changing it.
## Model decision workflow
### 1. Classify the object
Identify whether it is a:
- network DTO;
- persistence model;
- domain entity;
- value object;
- UI state;
- event/action;
- configuration object;
- navigation argument;
- service/controller/repository/cache.

Then state its intended identity semantics: value equality, object identity, or custom identity-by-key.
### 2. Ask what generated semantics are required
Evaluate separately:
```text
value equality?
copyWith?
JSON serialization?
payload-bearing closed variants?
defaults?
collection protection?
reusable converters?
```
Do not choose Freezed because the object merely “has fields.”
### 3. Choose the lowest-machinery solution
Use this default decision tree:
```text
Closed set of variants?
├─ yes
│  ├─ need generated equality/copyWith/JSON or substantial payload boilerplate?
│  │  ├─ yes → Freezed union
│  │  └─ no  → native sealed Dart
└─ no
   ├─ need value equality + copyWith and/or generated JSON?
   │  ├─ yes → Freezed data class
   │  └─ no
   │     ├─ tiny/local aggregate → plain Dart / record / enum
   │     └─ identity, mutation, lifecycle, services → native class
```
Prefer an enum for finite parameterless choices. Prefer a record for local transient aggregates. Prefer native sealed classes when exhaustive variants are useful but generated value semantics are not.
## Freezed data-class baseline
For a current compatible Freezed 3.x factory-style one-constructor model:
```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'user_profile.freezed.dart';

@freezed
abstract class UserProfile with _$UserProfile {
  const factory UserProfile({
    required String id,
    required String displayName,
    String? avatarUrl,
  }) = _UserProfile;
}
```
Use `const factory` when field/default constraints permit it and const construction has value.

Do not paste this syntax into older Freezed repositories without checking the installed version. Freezed 3 changed declaration requirements for factory-style classes.
## Immutability and collection ownership
Treat Freezed immutability precisely:
- generated fields are immutable through the public assignment API;
- `List`/`Map`/`Set` are protected by unmodifiable views by default;
- nested mutable objects remain mutable;
- an unmodifiable view does not guarantee a defensive snapshot if another owner can mutate the backing collection.

When long-lived value state accepts an externally owned mutable collection, establish ownership deliberately, for example:
```dart
final tags = List<String>.unmodifiable(externalTags);
final state = ArticleState(tags: tags);
```
Be especially strict when the object is emitted as state, used for memoization, or used as a map/set key.

Before using `makeCollectionsUnmodifiable: false`, ask whether a native mutable class is clearer. Mutable collection content plus generated value equality can create unstable `hashCode`, undetected state mutation, and misleading “immutable” APIs.
## Equality and hash semantics
Generated structural equality is valuable when value identity is intentional. It is not automatically appropriate for every domain entity or state graph.

Review:
- whether identity should instead be based on an ID;
- collection size and nesting depth;
- comparison frequency;
- state-emission frequency;
- whether selectors could observe a smaller slice;
- whether a repository/cache should own large data while UI state holds IDs/revisions.

Do not disable equality globally as the first optimization. Fix oversized state ownership or inappropriate value semantics first.
## `copyWith` rules
Use generated `copyWith` for immutable updates. Remember:
- omitted argument → preserve current value;
- explicit `null` → clear a nullable field;
- only changed path objects are recreated in nested Freezed copying;
- unchanged references are structurally shared;
- collection spread/copy cost comes from the Dart collection operation, not from `copyWith` itself.

Avoid repeated growing-list copies in tight loops. Batch collection updates when scale makes the cost meaningful.

Use meaningful model/domain methods when a generic `copyWith` chain hides the business transition, e.g. `approve()`, `applyPatch()`, or `advanceWorkflow()`.
## Constructors, methods, validation, and defaults
Use a private constructor when a factory-style model needs inherited instance methods/getters:
```dart
@freezed
abstract class Money with _$Money {
  const Money._();

  const factory Money({
    required int minorUnits,
    required String currency,
  }) = _Money;

  bool get isZero => minorUnits == 0;
}
```
Keep deterministic value behavior in the model when it directly expresses the model's invariants. Keep I/O, repository access, orchestration, and unstable transport normalization outside.

Use `@Default` only when a legitimate constant default exists. Do not use a default to hide malformed external payloads.

Use explicit runtime validation for production invariants. `@Assert` is a development/debug aid, not a release-security mechanism.

Use classic Freezed syntax when ordinary constructor initialization is clearer than redirecting-factory workarounds.
## Union modeling
Use a Freezed union for genuinely mutually exclusive modes with variant-specific payloads:
```dart
@freezed
sealed class SessionState with _$SessionState {
  const factory SessionState.signedOut() = SessionSignedOut;
  const factory SessionState.loading() = SessionLoading;
  const factory SessionState.authenticated({
    required SessionUser user,
  }) = SessionAuthenticated;
  const factory SessionState.failure({
    required String message,
  }) = SessionFailure;
}
```
Prefer native Dart pattern matching:
```dart
final label = switch (state) {
  SessionSignedOut() => 'Sign in',
  SessionLoading() => 'Loading…',
  SessionAuthenticated(:final user) => 'Hello ${user.displayName}',
  SessionFailure(:final message) => message,
};
```
Do not convert coexisting state dimensions into exclusive variants. Loaded content can coexist with refresh, selection, pagination, and nonfatal errors. Model coexistence with fields when that is the true state machine.

Current Freezed 3.2.x may still expose restored `when`/`map` helpers, but the supplied guide classifies them as legacy for new code. Preserve them where repository/version consistency requires; prefer native patterns for new modern code.
## JSON boundary
Freezed and `json_serializable` have separate responsibilities. Freezed generates model/union semantics; `json_serializable` generates ordinary JSON mapping when Freezed recognizes the `fromJson` factory.

Typical JSON model:
```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'user_dto.freezed.dart';
part 'user_dto.g.dart';

@freezed
abstract class UserDto with _$UserDto {
  const factory UserDto({
    @JsonKey(name: 'user_id') required String id,
    required String displayName,
    @Default(false) bool isAdmin,
  }) = _UserDto;

  factory UserDto.fromJson(Map<String, Object?> json) =>
      _$UserDtoFromJson(json);
}
```
Treat missing, explicit `null`, malformed type, and valid value as different contract states. Choose nullable fields, defaults, validation, or mapping intentionally.

Use `JsonConverter<T, S>` for stable reusable type↔wire representation conversions. Use field `JsonKey.fromJson/toJson` for small one-off transforms. Use a DTO mapper when transport and domain shape/invariants differ materially.

For nested generated serialization, configure `explicitToJson` only when required by the actual serializer contract. Do not enable it globally by habit.
## Union JSON contracts
Do not expose Freezed's default `runtimeType` discriminator merely because it is convenient. Match the API's discriminator deliberately with `unionKey`, `unionValueCase`, or `@FreezedUnionValue`.

Use fallback union behavior only when “unknown variant” is a coherent forward-compatibility contract. Do not route malformed payloads into an arbitrary default variant.

If the upstream union has irregular or unstable discriminator logic, use explicit converter/mapping code instead of forcing annotations to emulate it.
## DTO/domain/persistence boundaries
Create a separate DTO or persistence model only when a real boundary exists.

Separate transport from domain when:
- naming/nullability differs materially;
- API schema is unstable;
- domain invariants differ;
- security-sensitive fields must be filtered;
- multiple API versions must normalize into one domain model.

Separate persistence when storage migrations/schema constraints differ from domain semantics or another generator owns the storage model.

Do not automatically create `UserDto`, `UserModel`, and `UserEntity` with identical fields and 1:1 mappers.
## State-management rules
Freezed is a model tool, not a state-management framework.

Use one immutable state object when independent conditions can coexist. Use variants when modes are truly exclusive and exhaustive transition handling provides correctness.

For very large collections, consider keeping the dataset in its natural repository/cache/provider owner while UI state tracks lightweight semantics such as query, selected ID, revision, loading flags, or nonfatal errors. Apply this only when scale/equality measurements justify it.

Keep transient effects such as navigation, snackbars, and one-shot analytics out of durable equality-based state when the repository architecture already has a clearer effect mechanism.
## Performance gate
Before changing generated semantics for performance, identify which operation is expensive:
```text
construction
copyWith
collection replacement
equality
hashCode
JSON encode/decode
collection wrappers
build generation
analyzer work
```
Important review questions:
- Is a large/deep collection compared frequently?
- Is the state recreated at high frequency?
- Are large collections repeatedly spread/copied?
- Is the same data duplicated across DTO/domain/UI layers?
- Is JSON work happening synchronously on a latency-sensitive path?
- Is the bottleneck runtime code or build-time code generation?

Measure before disabling protections or rewriting models.
## Build and generated-code workflow
Use repository scripts first. Otherwise, on compatible tooling:
```bash
dart run build_runner build
```
During active generator-heavy development:
```bash
dart run build_runner watch
```
Do not cargo-cult `--delete-conflicting-outputs`. Its behavior is `build_runner`-version-sensitive; the supplied guide notes current versions handle conflicting outputs differently and newer versions ignore historical `-d` semantics.

For repositories committing generated files and using a compatible current `build_runner`, `build --only-check` can verify generated output without writing. Version-gate this command.

Never edit generated files. If output is wrong, change source/configuration and regenerate.
## Generated-file policy
Follow repository policy. Committing generated files can improve reviewability, package publication, and checkout reproducibility. Ignoring them can reduce generated diffs when CI/dev workflows always regenerate reliably.

Do not change `.gitignore` during an unrelated model edit.

For publishable packages, ensure generated library source required by consumers is actually included in the published package; downstream users should not be expected to run your dev generators.
## Migration gate
Treat Freezed major upgrades and generator-stack upgrades as migrations.

Before upgrading:
1. inspect current and target SDK constraints;
2. read migration guide and changelog across the entire version gap;
3. solve `freezed`, `freezed_annotation`, `json_serializable`, `json_annotation`, analyzer/source-gen, and `build_runner` compatibility together;
4. update declaration syntax deliberately;
5. regenerate;
6. analyze and test;
7. run serialization fixtures;
8. inspect public generated API changes and union pattern matches;
9. review generated diffs for accidental model churn.

Do not introduce Freezed 4 prerelease or Dart 3.13 primary-constructor examples into stable Dart 3.12/Freezed 3 repositories unless the repository explicitly opts in.
## Diagnostics
When generation fails, inspect the first root error before cleaning caches.
### Missing `.freezed.dart`
Check generator dependencies, annotation, exact `part` filename, source filename, generation command, and preceding analyzer/build errors.
### Missing `.g.dart`
Check `json_serializable`, `json_annotation`, `.g.dart` part, recognized `fromJson` factory shape, and converter/type errors.
### Freezed 3 upgrade errors
Verify whether factory-style one-constructor models need `abstract class` and unions need `sealed class` for the installed version.
### Missing `copyWith`
Check `copyWith: false`, the static reference type, union common/variant fields, stale generated output, and version mismatch.
### Unknown union discriminator
Check backend value, union key/casing, `FreezedUnionValue`, global config, fallback policy, and whether a custom converter is needed.
### Stale generated code
Run normal generation first. Diagnose part filenames, changed fields/variants, generator compatibility, and generated ownership. Do not jump immediately to `flutter clean`, deleting `.dart_tool`, or deleting all generated files.

Clean generator state only when evidence indicates cache/build-graph corruption or a major toolchain transition.
## Testing strategy
Test application contracts, not Freezed's basic generated mechanics.

Prioritize:
- production validation/invariants;
- custom model methods/getters;
- JSON fixtures and exact key contracts;
- missing/null/default semantics;
- converters and enum compatibility;
- union discriminators and unknown variants;
- DTO/domain mapping;
- state transitions;
- custom equality/identity rules;
- externally mutable collection ownership;
- serialized-format migrations.

Use historical or realistic API fixtures where serialization compatibility matters.
## Review anti-patterns
Reject or challenge:
- Freezed on every class;
- a union for every state flag;
- identical DTO/entity/model layers;
- mutable graphs hidden inside “immutable” state;
- huge all-field equality in hot state paths;
- repeated growing collection copies inside tight loops;
- blind `--delete-conflicting-outputs` fixes;
- hand-edited generated files;
- unstable backend JSON coupled directly into domain objects without justification;
- new code copied from legacy `when`/`map` tutorials without version context;
- Freezed 2/3/4 syntax mixed together;
- `makeCollectionsUnmodifiable: false` used for convenience;
- code generation treated as architecture.
## Review output
When reviewing or proposing a model change, report:
```text
Model category:
Required semantics:
Recommended mechanism: native Dart / native sealed / Freezed / Freezed+JSON / manual
Why this is the lowest-complexity correct option:
Version/tooling constraints:
Equality/collection risks:
Serialization-contract risks:
Generation/migration steps:
Tests required:
```
For existing code, distinguish correctness defects from optional style improvements.
## Production definition of done
Do not approve the change until:
- Freezed is actually justified for the model;
- native Dart was considered;
- syntax matches the installed Dart/Freezed versions;
- generator dependencies are mutually compatible;
- generated output is current and tool-owned;
- equality and `hashCode` semantics are intentional;
- large/deep collections were reviewed;
- collection ownership does not violate immutability assumptions;
- nullable `copyWith` semantics are correct;
- defaults match the true model/JSON contract;
- release-critical validation does not rely only on assertions;
- unions encode truly exclusive states;
- new union code uses modern patterns where appropriate;
- JSON names, nullability, converters, and union discriminators match the external contract;
- DTO/domain/persistence duplication has an explicit reason;
- relevant formatter/analyzer/tests pass;
- serialization fixtures pass when the external contract changed;
- CI can regenerate or verify generated output reproducibly;
- repository modeling conventions remain coherent;
- the resulting code is easier to maintain, not merely shorter.
## Final decision rule
Do not begin with “How do I write this with Freezed?” Begin with:
```text
What semantics does this object require?
↓
What is the simplest Dart implementation that preserves them?
↓
If generated value semantics materially reduce complexity, use Freezed.
Otherwise prefer native Dart.
```
