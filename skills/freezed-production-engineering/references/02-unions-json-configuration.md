# Reference: JSON serialization, unions, converters, generics, configuration, state modeling, and DTO/domain boundaries.

Original source lines: 1170–1922

## Table of contents

- [34. JSON serialization architecture](#34-json-serialization-architecture)
- [35. JSON DTO example](#35-json-dto-example)
- [36. Nested JSON model](#36-nested-json-model)
- [37. JSON field behavior](#37-json-field-behavior)
- [38. Missing, null, and default JSON values](#38-missing-null-and-default-json-values)
- [39. Enums](#39-enums)
- [40. Date and time serialization](#40-date-and-time-serialization)
- [41. When to use a `JsonConverter`](#41-when-to-use-a-jsonconverter)
- [42. Union serialization](#42-union-serialization)
- [43. Unknown union variants](#43-unknown-union-variants)
- [44. Generics](#44-generics)
- [45. Interfaces, mixins, and inheritance](#45-interfaces-mixins-and-inheritance)
- [46. Important current Freezed configuration](#46-important-current-freezed-configuration)
- [47. `@unfreezed`](#47-unfreezed)
- [48. Global `build.yaml` configuration](#48-global-buildyaml-configuration)
- [49. `invalid_annotation_target`](#49-invalidannotationtarget)
- [50. State-management guidance](#50-state-management-guidance)
  - [Prefer one data-class state when:](#prefer-one-data-class-state-when)
  - [Prefer variants when:](#prefer-variants-when)
- [51. Cubit-style state without a giant collection](#51-cubit-style-state-without-a-giant-collection)
- [52. Transient events](#52-transient-events)
- [53. DTO versus domain model](#53-dto-versus-domain-model)
  - [Create a dedicated DTO when:](#create-a-dedicated-dto-when)
  - [Separate persistence model when:](#separate-persistence-model-when)
  - [Keep one model when:](#keep-one-model-when)
- [54. Model-category guidance](#54-model-category-guidance)

---

# 34. JSON serialization architecture

Freezed and `json_serializable` have separate responsibilities.

**Freezed:**

- defines/generated Freezed model structure
- recognizes the serialization factory
- connects generated variants/model code to JSON generation
- supplies union metadata/configuration

**`json_serializable`****:**

- generates field mapping
- encodes/decodes supported Dart types
- applies `JsonKey`
- applies converters
- handles enum mapping
- handles nested generated serialization configuration

The current Freezed documentation states that adding:

```
part 'model.g.dart';

factory Model.fromJson(Map<String, dynamic> json) =>
    _$ModelFromJson(json);

```

causes Freezed to cooperate with `json_serializable`. It also notes that Freezed detects the `fromJson` factory using the `=>` form.

---

# 35. JSON DTO example

```
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

This model requires:

- `.freezed.dart`
- `.g.dart`
- `freezed_annotation`
- `json_annotation`
- Freezed generator
- `json_serializable`
- `build_runner`

Do not manually write a second JSON implementation in generated parts.

---

# 36. Nested JSON model

Use explicit nested serialization configuration when the generated JSON representation needs nested `toJson` calls.

```
import 'package:freezed_annotation/freezed_annotation.dart';

part 'order_dto.freezed.dart';
part 'order_dto.g.dart';

@freezed
abstract class CustomerDto with _$CustomerDto {
  const factory CustomerDto({
    required String id,
    required String name,
  }) = _CustomerDto;

  factory CustomerDto.fromJson(Map<String, Object?> json) =>
      _$CustomerDtoFromJson(json);
}

@freezed
abstract class LineItemDto with _$LineItemDto {
  const factory LineItemDto({
    required String sku,
    required int quantity,
  }) = _LineItemDto;

  factory LineItemDto.fromJson(Map<String, Object?> json) =>
      _$LineItemDtoFromJson(json);
}

@freezed
abstract class OrderDto with _$OrderDto {
  @JsonSerializable(explicitToJson: true)
  const factory OrderDto({
    required String id,
    required CustomerDto customer,
    @Default(<LineItemDto>[]) List<LineItemDto> items,
  }) = _OrderDto;

  factory OrderDto.fromJson(Map<String, Object?> json) =>
      _$OrderDtoFromJson(json);
}

```

Freezed documents `explicitToJson: true`, or the equivalent global `explicit_to_json`, for nested generated serialization where nested values need their own `toJson` invoked, including nested Freezed collections.

Do not enable it globally without determining whether that is the repository's intended serialization policy.

---

# 37. JSON field behavior

Current `json_serializable` supports configuration through:

1. `JsonKey` on an individual field
2. `JsonSerializable` on a class/Freezed constructor
3. `build.yaml`

Field-level settings take precedence over class-level/global equivalents where they overlap.

Relevant options include:

- field renaming
- null inclusion
- explicit nested `toJson`
- checked deserialization
- unknown-key policy
- converters
- generic argument factories
- UTC `DateTime` policy

Current `json_serializable` ignores unrecognized JSON keys by default; `disallowUnrecognizedKeys` can opt into stricter decoding.

Choose strictness according to the contract.

For a third-party API that may add fields over time, rejecting every unknown field can create unnecessary forward-compatibility failures.

For a security-sensitive or tightly controlled internal schema, stricter behavior may be appropriate.

---

# 38. Missing, null, and default JSON values

Do not blur these cases conceptually:

```
field absent
field present as null
field present with malformed type
field present with valid value

```

Decide what each means for the API.

Use:

- required non-nullable fields when omission is invalid
- nullable fields when explicit null is meaningful
- defaults when omission legitimately maps to a domain/default value
- converters or mapping layers when the upstream representation is inconsistent
- validation when generated decoding alone cannot enforce the business contract

Do not use `@Default` to silently hide an unexpectedly broken backend response.

---

# 39. Enums

`json_serializable`/`json_annotation` support:

- ordinary enum conversion
- `@JsonValue`
- `@JsonEnum`
- enhanced enum value fields

Current documentation explicitly supports enhanced enum serialization through `JsonEnum.valueField`.

Use enum representations rather than magic strings where the wire protocol is a genuinely finite stable set.

Plan unknown-value behavior for APIs that may add enum values independently of the application release.

---

# 40. Date and time serialization

`json_serializable` supports `DateTime` natively.

Do not introduce a `JsonConverter` for every `DateTime` automatically.

A converter is justified when the wire representation differs from the normal generated representation, for example:

- Unix epoch milliseconds
- Unix epoch seconds
- custom legacy strings
- backend-specific timezone semantics

Example:

```
import 'package:freezed_annotation/freezed_annotation.dart';

part 'event_dto.freezed.dart';
part 'event_dto.g.dart';

class EpochMillisecondsDateTimeConverter
    implements JsonConverter<DateTime, int> {
  const EpochMillisecondsDateTimeConverter();

  @override
  DateTime fromJson(int json) {
    return DateTime.fromMillisecondsSinceEpoch(
      json,
      isUtc: true,
    );
  }

  @override
  int toJson(DateTime object) {
    return object.toUtc().millisecondsSinceEpoch;
  }
}

@freezed
abstract class EventDto with _$EventDto {
  const factory EventDto({
    required String id,
    @EpochMillisecondsDateTimeConverter()
    required DateTime occurredAt,
  }) = _EventDto;

  factory EventDto.fromJson(Map<String, Object?> json) =>
      _$EventDtoFromJson(json);
}

```

`JsonConverter<T, S>` is specifically designed for converting model type `T` to/from JSON-compatible representation `S`, and it can be attached to a field, class, or serializer configuration.

---

# 41. When to use a `JsonConverter`

Prefer a converter when:

- one type has a stable alternate wire representation
- the conversion is reusable
- conversion is context-independent
- the representation can be described as `T <-> JSON type`
- collections of that type need the same conversion

Examples:

- epoch timestamp ↔ `DateTime`
- custom ID ↔ `String`
- integer-backed enum/value object
- stable money representation
- stable polymorphic discriminator handling

Prefer a field `JsonKey.fromJson`/`toJson` function for a small one-off field transformation.

Prefer a DTO mapper when:

- the backend schema is unstable
- one API object maps into several domain objects
- fields must be combined/split
- transformations depend on application context
- security filtering is involved
- domain invariants differ from transport constraints
- API null/default semantics should not leak into the domain

Prefer changing the API contract when you control both sides and the transport format itself is unnecessarily inconsistent.

---

# 42. Union serialization

For multiple-constructor Freezed classes, the default generated discriminator is a string field named `runtimeType`.

Constructor names determine the default discriminator values. Freezed supports changing both the discriminator key and value casing.

Example:

```
import 'package:freezed_annotation/freezed_annotation.dart';

part 'payment_event.freezed.dart';
part 'payment_event.g.dart';

@Freezed(
  unionKey: 'type',
  unionValueCase: FreezedUnionCase.snake,
)
sealed class PaymentEvent with _$PaymentEvent {
  const factory PaymentEvent.authorized({
    required String paymentId,
  }) = PaymentAuthorized;

  @FreezedUnionValue('payment_failed')
  const factory PaymentEvent.failed({
    required String paymentId,
    required String reason,
  }) = PaymentFailed;

  factory PaymentEvent.fromJson(Map<String, Object?> json) =>
      _$PaymentEventFromJson(json);
}

```

Do not expose the default `runtimeType` discriminator to a backend just because it is Freezed's default if the backend owns a different contract.

Match the external schema deliberately.

---

# 43. Unknown union variants

The current `@Freezed` API includes `fallbackUnion`, which can nominate a constructor to use when no discriminator matches.

Use fallback behavior only when it represents a coherent product/API contract.

For example, an API event stream that explicitly promises forward-compatible unknown event handling may benefit from an `unknown` variant.

Do not silently route malformed payloads into a random "default" variant.

When the backend union is irregular or lacks a stable discriminator, Freezed's docs recommend custom converter logic.

---

# 44. Generics

Freezed supports generic models.

Example:

```
import 'package:freezed_annotation/freezed_annotation.dart';

part 'api_result.freezed.dart';
part 'api_result.g.dart';

@Freezed(genericArgumentFactories: true)
sealed class ApiResult<T> with _$ApiResult<T> {
  const factory ApiResult.data({
    required T value,
  }) = ApiResultData<T>;

  const factory ApiResult.failure({
    required String message,
  }) = ApiResultFailure<T>;

  factory ApiResult.fromJson(
    Map<String, Object?> json,
    T Function(Object? json) fromJsonT,
  ) =>
      _$ApiResultFromJson(json, fromJsonT);
}

```

With generic argument factories enabled, generated JSON APIs receive converter callbacks for generic type parameters. Freezed and `json_serializable` both document this mechanism.

Do not build generic Freezed abstractions solely to avoid repeating small classes.

Generic generated models become questionable when every call site needs:

- nested serializer callbacks
- several generic type parameters
- custom union converters
- type-specific special cases

At that point a concrete model can be easier to understand.

---

# 45. Interfaces, mixins, and inheritance

Freezed supports per-variant interfaces/mixins through annotations such as:

- `@With`
- `@Implements`

It also has specific syntax/workarounds for generic annotation references.

Use these conservatively.

Prefer:

- composition
- ordinary interfaces with clear semantics
- small focused variants

over complex generated inheritance trees.

Factory-style Freezed inheritance can require `Class._(...)` constructors because redirecting factories cannot directly express normal `super(...)` constructor calls. Freezed documents the private-constructor technique for such cases.

When inheritance is becoming difficult to explain, use:

- classic Freezed class syntax
- composition
- native Dart

before introducing generator-specific tricks.

---

# 46. Important current Freezed configuration

The current `@Freezed` API exposes options including:

- `unionKey`
- `unionValueCase`
- `fallbackUnion`
- `copyWith`
- `equal`
- `toStringOverride`
- `fromJson`
- `toJson`
- `map`
- `when`
- `makeCollectionsUnmodifiable`
- `addImplicitFinal`
- `genericArgumentFactories`

Other important annotations include:

- `@freezed`
- `@Freezed(...)`
- `@unfreezed`
- `@Default`
- `@Assert`
- `@With`
- `@Implements`
- `@FreezedUnionValue`

JSON concerns normally use `json_annotation` annotations such as:

- `@JsonSerializable`
- `@JsonKey`
- `@JsonConverter`
- `@JsonEnum`
- `@JsonValue`

Do not memorize option sets indefinitely. Verify the installed annotation API before relying on version-sensitive features.

---

# 47. `@unfreezed`

`@unfreezed` creates mutable generated classes.

Current Freezed documentation notes that mutable properties can then be assigned and that custom value equality/hash semantics are no longer generated in the same manner.

Do not choose `@unfreezed` simply because changing state in place appears easier.

Ask whether the class should instead be:

- an ordinary mutable Dart class
- a controller
- an aggregate with encapsulated mutation

Using a code generator designed primarily around immutable value modeling for a highly mutable object can increase rather than reduce cognitive overhead.

---

# 48. Global `build.yaml` configuration

Freezed can apply global options through `build.yaml` next to `pubspec.yaml`.

Example:

```
targets:
  $default:
    builders:
      freezed:
        options:
          union_key: type
          union_value_case: snake

```

The same mechanism can globally configure options such as copying/equality behavior.

The official docs also expose a generated-file `format` option and explicitly warn that formatting generated Freezed files can significantly slow code generation.

### Global configuration rule

Use global settings for genuine repository-wide policy.

Examples:

- every API union uses `type`
- an entire API package uses a fixed discriminator casing
- the repository deliberately chooses a common generator output policy

Prefer local annotations when:

- only one endpoint is unusual
- global behavior would surprise readers
- different packages have different external contracts
- a setting affects semantics rather than mere style

Global hidden behavior is cheaper to type but harder to discover.

---

# 49. `invalid_annotation_target`

The Freezed README currently documents configurations where `json_serializable`/`meta` combinations can produce `invalid_annotation_target` warnings and suggests an analyzer suppression.

Do not automatically paste a repository-wide ignore whenever adding Freezed.

First determine:

- whether the warning actually occurs
- whether dependencies are compatible
- whether the repository already has a targeted suppression
- whether an upgrade removes the issue

Suppress only a known toolchain-generated false positive, and document why.

Do not use analyzer suppressions to hide unrelated invalid annotations.

---

# 50. State-management guidance

Freezed is a model tool, not a state-management framework.

It works naturally with:

- Bloc
- Cubit
- Riverpod
- ValueNotifier
- reducer/state-machine architectures
- ChangeNotifier-backed systems where immutable snapshots are useful

The choice between a data class and a union depends on the state semantics, not the framework.

## Prefer one data-class state when:

- several properties coexist independently
- old data remains visible while refreshing
- multiple operations can be active
- errors may be nonfatal
- individual fields are frequently updated

## Prefer variants when:

- modes are truly exclusive
- each mode requires different fields
- illegal field combinations are otherwise easy to express
- exhaustive transition handling is valuable

---

# 51. Cubit-style state without a giant collection

For large catalogs, it may be better for another owner to retain the large data set while screen state tracks the lightweight UI semantics.

```
import 'package:bloc/bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'catalog_cubit.freezed.dart';

@freezed
abstract class CatalogViewState with _$CatalogViewState {
  const factory CatalogViewState({
    @Default(false) bool isRefreshing,
    @Default('') String query,
    String? selectedProductId,
    @Default(0) int catalogRevision,
    String? nonFatalError,
  }) = _CatalogViewState;
}

final class CatalogCubit extends Cubit<CatalogViewState> {
  CatalogCubit() : super(const CatalogViewState());

  void setQuery(String query) {
    emit(state.copyWith(query: query));
  }

  void setRefreshing(bool value) {
    emit(state.copyWith(isRefreshing: value));
  }

  void selectProduct(String? productId) {
    emit(state.copyWith(selectedProductId: productId));
  }

  void catalogChanged(int revision) {
    emit(state.copyWith(catalogRevision: revision));
  }

  void reportError(String? error) {
    emit(state.copyWith(nonFatalError: error));
  }
}

```

This pattern is appropriate only when another repository/provider/cache already owns the catalog.

Do not split state merely to satisfy a theoretical performance rule.

A list of 20 objects does not need elaborate indirection because "large collections can be expensive."

---

# 52. Transient events

Navigation commands, toast requests, one-shot analytics triggers, and similar effects are often poor candidates for durable equality-based UI state.

Avoid patterns such as:

```
state.copyWith(showSuccessToast: true)
state.copyWith(showSuccessToast: false)

```

when the framework already offers a clearer effect/listener/event mechanism.

Whether this applies depends on the repository's architecture.

Do not force every transient action into a Freezed state union.

---

# 53. DTO versus domain model

Do not automatically create all three:

```
UserDto
UserEntity
UserModel

```

when they contain identical fields and have no independently evolving semantics.

Each extra layer creates:

- mapper code
- naming ambiguity
- duplicate tests
- migration work
- cognitive overhead

Separation is justified when a boundary is real.

## Create a dedicated DTO when:

- API schema is unstable
- backend naming/nullability differs materially
- domain invariants differ
- transport contains irrelevant/security-sensitive fields
- multiple API versions exist
- transport normalization is substantial

## Separate persistence model when:

- database schema differs from domain semantics
- storage migration constraints exist
- persistence annotations/codegen would pollute domain code
- storage shape is optimized differently

## Keep one model when:

- API and application semantics are genuinely the same
- serialization is stable
- there is no independent invariant/boundary
- the extra class adds no meaningful protection

Architecture boundaries should earn their maintenance cost.

---

# 54. Model-category guidance

### Network DTO

Freezed is often useful when the DTO:

- has many fields
- is immutable
- needs generated JSON
- needs copying/equality in tests or caching

A tiny decode-only payload may not need Freezed.

### Database model

Follow the persistence system first.

Do not stack Freezed on generated database models unless it provides meaningful behavior not already supplied by the persistence layer.

### Domain entity

Ask whether equality is:

- value-based
- identity-based

An entity representing the same account/order/customer across changing attributes may have identity semantics that differ from "every field must match."

Do not accept generated all-field structural equality automatically.

### UI state

Strong Freezed candidate when immutable copying and value equality fit the state mechanism.

### Event/action

Use Freezed when events carry meaningful variant payloads and equality/copying are useful.

Use native sealed classes or enums when simple.

### Value object

Strong candidate for Freezed when multiple fields define the value and invariants are manageable.

### Configuration

Tiny configuration classes often work perfectly well as ordinary const Dart classes.

### Navigation arguments

Use Freezed if the argument object is substantial or serialization/value semantics matter.

Do not codegen a one-field route parameter without a reason.

---

