# Architecture, testing, diagnostics, suppression, and review strategy

Use this reference for architectural placement of metadata, security/correctness boundaries, test strategy, common analyzer diagnostics, and suppression policy.

---

# Architecture Rules

Metadata should reinforce architecture, never substitute for it.

## Presentation

Use metadata to clarify immutable view state or narrowly supported component extension points.

Do not use annotations to hide uncontrolled mutable widget state.

---

## Application

Prefer:

```
final classes
explicit interfaces
composition
immutable command/state values

```

over elaborate subclass metadata unless the application genuinely exposes extension points.

---

## Domain

Good uses:

```
@immutable value objects
@useResult transformations
sealed language hierarchies

```

Do not put `@experimental` on half-designed domain entities instead of defining an actual migration/stability policy.

---

## Data

Repositories typically benefit more from:

```
interfaces
package privacy
dependency direction

```

than from `@protected`.

---

## Platform Integration

Use `_private` and `@internal` to keep platform glue out of supported domain/public APIs.

Do not expose plugin implementation types simply because cross-library access is convenient.

---

## Package Modules

If one package requires declarations from another package's `src` directory, treat that as an architecture violation before considering annotations.

The official `implementation_imports` lint exists specifically to discourage another package's implementation imports.

---

# Security and Correctness

`meta` can help prevent correctness mistakes such as:

- accidentally overriding a non-virtual algorithm;
- failing to invoke lifecycle bookkeeping;
- mutating a class that promises immutable fields;
- using package internals from consumers;
- discarding a critical result;
- persisting an ephemeral value;
- depending on a test-only API;
- unintentionally using an unstable API.

But metadata does **not** establish:

- authorization;
- confidentiality;
- cryptographic integrity;
- sandboxing;
- runtime access control.

Never use analyzer annotations as security mechanisms.

---

# Testing Strategy

## Behavioral tests first

Prefer:

```
test('invalid token is rejected', () {
  expect(
    repository.authenticate('bad-token'),
    throwsA(isA<AuthenticationException>()),
  );
});

```

over directly testing every private branch.

---

## Immutable models

Test:

- defensive collection ownership;
- equality/hash semantics where implemented;
- copy/update behavior;
- serialization if applicable;
- invariants.

Do not test merely that the `@immutable` annotation exists.

The analyzer already checks its static field contract.

---

## Package analyzer contracts

For reusable packages exposing meta-annotated APIs, consider analyzer fixture tests when the annotation contract is central to the package.

Examples:

```
external subclass cannot invoke protected helper
nonVirtual method cannot be overridden
mustCallSuper omission is diagnosed
useResult call cannot be silently discarded

```

Such tests are more valuable for framework/tooling packages than ordinary Flutter applications.

---

# Debugging Analyzer Diagnostics

## `must_be_immutable`

Ask:

1. Is the class truly supposed to be immutable?
2. Which direct or inherited instance field is non-final?
3. Should the field become final?
4. Is the wrong superclass/mixin introducing mutability?
5. Is the annotation itself incorrect?

Do not suppress the diagnostic while retaining a false immutability contract.

---

## `invalid_use_of_protected_member`

Ask:

1. Is this caller actually subclass implementation code?
2. Should the member be ordinary public API?
3. Should the operation move behind a public method?
4. Should the member have been `_private` instead?

Do not access protected members from arbitrary helper code merely because Dart permits the syntax.

---

## `invalid_use_of_internal_member`

Ask:

1. Is code crossing a package boundary?
2. Is the consumer importing another package's `src`?
3. Should the package expose a supported public facade?
4. Is `@internal` wrong for this declaration?

Do not simply ignore the diagnostic in downstream packages.

---

## `must_call_super`

Ask:

1. Which base implementation carries the invariant?
2. Should super be first or last according to the API docs?
3. Is every control-flow path invoking it?
4. Is the annotation itself still valid?

Do not assume super always belongs first. Flutter lifecycle documentation sometimes specifies start vs end ordering.

---

## `unused_result`

Ask:

1. Should the result actually be assigned/returned/handled?
2. Was the wrong method invoked?
3. Is ignoring this particular API legitimate?
4. Is `@useResult` too aggressive?

Fix caller or declaration according to actual semantics.

---

## `invalid_use_of_visible_for_testing_member`

Ask:

1. Why is production code depending on a testing seam?
2. Should the API become officially public?
3. Should production code use another abstraction?
4. Is the test seam being abused as architecture?

---

## `missing_override_of_must_be_overridden`

Ask:

1. Is this concrete subclass supposed to choose behavior?
2. Should it be abstract instead?
3. Should the base member be abstract?
4. Is `@mustBeOverridden` still appropriate?

---

## Deprecated Member Diagnostics

Follow the replacement path in the deprecation message.

If the message is inadequate and you own the API, improve the deprecation documentation instead of teaching consumers to suppress it.

---

# Suppression Policy

Never start with:

```
// ignore: must_call_super

```

or:

```
analyzer:
  errors:
    invalid_use_of_internal_member: ignore

```

Use this order:

```
1. Understand contract.
2. Determine whether caller or declaration is wrong.
3. Fix architecture/API.
4. If an exceptional suppression is truly necessary,
   make it as narrow as possible.
5. Document why the exception is safe.

```

Dart analysis supports diagnostic suppression and severity changes, but capability is not a recommendation to bypass API contracts.

---
