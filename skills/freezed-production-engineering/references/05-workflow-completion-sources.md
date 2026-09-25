# Reference: Implementation workflow, completion criteria, fast decisions, examples, annotation stance, conclusions, and source references.

Original source lines: 2756–3194

## Table of contents

- [80. Implementation workflow](#80-implementation-workflow)
  - [Step 1 — Inspect](#step-1-inspect)
  - [Step 2 — Classify](#step-2-classify)
  - [Step 3 — Decide](#step-3-decide)
  - [Step 4 — Design](#step-4-design)
  - [Step 5 — Implement](#step-5-implement)
  - [Step 6 — Generate](#step-6-generate)
  - [Step 7 — Validate](#step-7-validate)
  - [Step 8 — Review](#step-8-review)
  - [Step 9 — Optimize](#step-9-optimize)
- [81. Completion criteria](#81-completion-criteria)
- [82. Fast decision algorithm for AI agents](#82-fast-decision-algorithm-for-ai-agents)
- [83. Examples of good rejections](#83-examples-of-good-rejections)
- [84. Examples of strong Freezed candidates](#84-examples-of-strong-freezed-candidates)
- [85. Production stance on annotations](#85-production-stance-on-annotations)
- [86. Production stance on generated code](#86-production-stance-on-generated-code)
- [87. Source-grounded conclusions](#87-source-grounded-conclusions)
- [88. Source references](#88-source-references)
- [89. Final operating rule](#89-final-operating-rule)

---

# 80. Implementation workflow

## Step 1 — Inspect

Read the repository.

Identify:

- SDK/toolchain
- dependency versions
- modeling conventions
- generated-file policy
- architecture
- state-management approach
- JSON conventions
- CI generation

Do not write annotations first.

## Step 2 — Classify

Classify the object:

- DTO
- persistence model
- domain entity
- value object
- UI state
- event/action
- configuration
- navigation argument
- service/controller

Determine expected identity/value semantics.

## Step 3 — Decide

Choose between:

- native Dart class
- native sealed hierarchy
- Freezed data class
- Freezed union
- Freezed + JSON
- manual/custom implementation

Use the decision tables.

## Step 4 — Design

Define:

- required fields
- nullable semantics
- defaults
- equality ownership
- collection ownership
- invariant boundaries
- JSON contract
- union variants

Remove duplicated layers that do not represent real boundaries.

## Step 5 — Implement

Write only the source declaration.

Use:

- modern Dart
- repository-compatible Freezed syntax
- `const` where meaningful
- minimal annotations
- explicit external-contract mappings

Never manually edit generated output.

## Step 6 — Generate

Use the repository's generation script if one exists.

Otherwise, on compatible tooling:

```
dart run build_runner build

```

Use watch mode during active generation-heavy development:

```
dart run build_runner watch

```

Do not add destructive/legacy flags automatically.

## Step 7 — Validate

Run repository-appropriate:

```
dart format .
dart analyze
dart test

```

or Flutter equivalents:

```
dart format .
flutter analyze
flutter test

```

Run specific fixture/state/domain tests relevant to the modification.

## Step 8 — Review

Review public behavior:

- constructors
- `copyWith`
- equality semantics
- variant pattern matching
- serialization output
- API compatibility

Inspect generated files for diagnosis when necessary, but do not design application code around generated implementation details that are not intended public APIs.

## Step 9 — Optimize

Check:

- equality cost
- large collection ownership
- update frequency
- repeated object/collection copies
- generator volume
- redundant model layers
- serialization placement

Optimize only issues justified by scale, profiling, or clear architectural cost.

---

# 81. Completion criteria

A Freezed implementation is not complete merely because generation succeeds.

Confirm all of the following:

-  Freezed is actually appropriate for this model.
-  Native Dart was considered.
-  Syntax matches the installed Dart/Freezed versions.
-  Dependency versions are compatible.
-  Generated files are current.
-  Generated files were not manually modified.
-  Value equality is intentional.
-  `hashCode` semantics are appropriate.
-  Large collections were considered explicitly.
-  Collection ownership cannot unexpectedly violate immutability assumptions.
-  Nullable `copyWith` behavior is correct.
-  Defaults reflect the real model/JSON contract.
-  Release-critical validation does not rely solely on assertions.
-  Unions provide genuine semantic value.
-  New union consumption uses modern Dart patterns where supported.
-  Serialization matches the external contract.
-  Union discriminators match the API contract.
-  Generic serializers are correctly wired where applicable.
-  Converters are used for appropriate representation mismatches.
-  DTO/domain duplication has explicit justification.
-  State modeling does not impose obviously unnecessary equality/rebuild costs.
-  Analyzer passes.
-  Formatter policy passes.
-  Relevant tests pass.
-  Serialization fixtures pass when applicable.
-  CI can reproduce or validate generation.
-  Repository modeling conventions remain coherent.
-  The resulting code is easier—not merely shorter—to maintain.

---

# 82. Fast decision algorithm for AI agents

Use this sequence before every new model:

```
Does it need a closed set of variants?
├─ Yes
│  ├─ Need generated equality/copyWith/JSON or substantial payload boilerplate?
│  │  ├─ Yes → Consider Freezed union.
│  │  └─ No  → Prefer native sealed Dart.
│
└─ No
   ├─ Need value equality + copyWith and/or generated JSON?
   │  ├─ Yes → Consider Freezed data class.
   │  └─ No
   │     ├─ Tiny/simple value?
   │     │  └─ Prefer plain Dart/record/enum as appropriate.
   │     └─ Significant custom lifecycle/identity/mutation?
   │        └─ Prefer manual/native class.

```

Then perform a second pass:

```
Does it contain large/deep collections?
├─ Yes → Examine equality and ownership before accepting generated semantics.
└─ No  → Continue.

Is it an external JSON contract?
├─ Yes → Decide whether transport and domain may safely share one model.
└─ No  → Do not add JSON machinery.

Does this repository already have a clear modeling convention?
├─ Yes → Follow it unless there is a concrete problem.
└─ No  → Choose the lowest-complexity sound design.

```

---

# 83. Examples of good rejections

### Reject Freezed for an enum-like setting

Use:

```
enum ThemePreference {
  system,
  light,
  dark,
}

```

not a generated union with three parameterless cases.

### Reject Freezed for an identity service

Use:

```
final class SessionClock {
  const SessionClock();

  DateTime nowUtc() => DateTime.now().toUtc();
}

```

This has no value-model semantics.

### Reject Freezed for a trivial private tuple

When a value is local and ephemeral, consider a record:

```
({double width, double height}) measureCard(double availableWidth) {
  final width = availableWidth.clamp(240.0, 640.0);
  final height = width * 0.625;

  return (
    width: width,
    height: height,
  );
}

```

A named generated model would add no meaningful domain value here.

---

# 84. Examples of strong Freezed candidates

### Complex immutable value

```
@freezed
abstract class ShippingAddress with _$ShippingAddress {
  const factory ShippingAddress({
    required String recipient,
    required String line1,
    String? line2,
    required String city,
    required String postalCode,
    required String countryCode,
  }) = _ShippingAddress;
}

```

The generated equality and copying materially reduce repetitive maintenance.

### Payload-rich result hierarchy

```
@freezed
sealed class CheckoutResult with _$CheckoutResult {
  const factory CheckoutResult.completed({
    required String orderId,
  }) = CheckoutCompleted;

  const factory CheckoutResult.paymentRequired({
    required String paymentIntentId,
  }) = CheckoutPaymentRequired;

  const factory CheckoutResult.rejected({
    required String code,
    required String message,
  }) = CheckoutRejected;
}

```

The variants encode real mutually exclusive outcomes and prevent invalid combinations.

---

# 85. Production stance on annotations

Do not add annotations because they exist.

Every annotation should answer a concrete question:

- `@Default` → what legitimate default exists?
- `@JsonKey` → what external contract differs from Dart naming/default behavior?
- `@JsonSerializable(...)` → what serializer behavior differs from repository defaults?
- `@Freezed(...)` → what generated behavior should differ from defaults?
- `@FreezedUnionValue` → what backend discriminator value is required?
- `@JsonConverter` → what stable type representation mismatch exists?
- `@Assert` → what debug invariant is worth catching, knowing it is not production validation?

Minimal annotations make models easier to understand and easier to migrate.

---

# 86. Production stance on generated code

Generated source should be boring.

If developers must routinely inspect thousands of generated lines to understand ordinary domain behavior, the public model design is too coupled to generator internals.

Application code should primarily reason about:

```
Model(...)
model.property
model.copyWith(...)
Model.fromJson(...)
model.toJson()
switch (union) { ... }

```

rather than implementation class plumbing.

Variant implementation names are useful for Dart pattern matching, but do not scatter assumptions about private generated implementation details through unrelated code.

---

# 87. Source-grounded conclusions

The following are factual/version-sensitive conclusions established by the current primary documentation:

1. Freezed stable is currently 3.2.5; a 4.0 prerelease exists.
2. Freezed 3.2.x supports Dart from 3.8.
3. Freezed 3.1 restored `when`/`map` after their 3.0 removal, but current docs still call them legacy and recommend Dart patterns.
4. `freezed` and `build_runner` are generator/dev dependencies; `freezed_annotation` is the annotation dependency.
5. JSON integration adds `json_annotation` and `json_serializable`; `.g.dart` JSON mapping is generated through `json_serializable`.
6. Freezed normally generates immutable properties, `copyWith`, equality, `hashCode`, and `toString`.
7. Nullable `copyWith` supports explicitly setting a field to `null`.
8. Freezed protects `List`/`Map`/`Set` by default and allows disabling collection protection.
9. Current collection protection is implemented using unmodifiable views.
10. Freezed supports unions, custom union keys/values, fallback unions, generic argument factories, and configurable equality/copying.
11. Native Dart sealed classes provide a known subtype set and exhaustive switches.
12. Dart's new primary constructors require Dart 3.13 and change syntax rather than runtime semantics.
13. `json_serializable` supports configurable field/class/global serialization plus custom converters and common core Dart types.
14. `build_runner` 2.16 provides `--only-check`; current output handling also treats generated files as builder-owned.
15. Since `build_runner` 2.7, `-d` is ignored because conflicting output deletion became automatic.
16. Freezed's global generated-file formatting option is documented as potentially significantly slowing generation.

---

# 88. Source references

Use these sources before changing version-sensitive behavior.

### Freezed

- Current Freezed package documentation and README.
- Current stable/prerelease version list.
- Freezed changelog, including 3.0/3.1/3.2 changes.
- Current `Freezed` annotation API.
- Current union serialization documentation.
- Current custom converter/generic documentation.
- Current union/shared-property documentation.
- Current legacy pattern matching guidance.
- Current project-level configuration guidance.

### Dart

- Current Dart class-modifier documentation, including `sealed`.
- Current Dart primary-constructor documentation and language-version requirement.

### JSON generation

- Current `json_serializable` package documentation.
- Current `JsonSerializable` API.
- Current `JsonConverter` API.

### Build tooling

- Current `build_runner` package documentation.
- Current `build_runner` changelog, including `--only-check`, current output ownership, `-d` behavior, SDK requirements, and performance changes.

---

# 89. Final operating rule

When uncertain, do not ask:

> "How do I write this with Freezed?"

Ask:

> "What semantics does this object require, and what is the simplest Dart implementation that preserves them?"

Only choose Freezed after answering that question.

The best Freezed codebase is not the codebase with the most generated classes.

It is the codebase where generated value semantics are used precisely where they remove real complexity, while native Dart remains the default wherever it is already sufficient.
