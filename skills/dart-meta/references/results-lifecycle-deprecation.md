# Result usage, lifecycle, deprecation, and testing boundaries

Use this reference for `@useResult`, `@awaitNotRequired`, Flutter lifecycle contracts, internal/public API categories, deprecation strategy, and testing seams.

## Table of contents

- [Result Usage](#result-usage)
- [Do Not Mark Every Return Value](#do-not-mark-every-return-value)
- [Async Result Rules](#async-result-rules)
- [Lifecycle Contracts](#lifecycle-contracts)
- [Flutter Lifecycle Override Example](#flutter-lifecycle-override-example)
- [Internal APIs](#internal-apis)
- [Deprecation](#deprecation)
- [Prefer `@Deprecated(...)` With Migration Guidance](#prefer-deprecated-with-migration-guidance)
- [Targeted Deprecation](#targeted-deprecation)
- [Deprecation Lints](#deprecation-lints)
- [Testing Boundaries](#testing-boundaries)

---

# Result Usage

Use `@useResult` when ignoring a return value is almost certainly incorrect.

Strong candidates:

- immutable-state updates;
- validation APIs;
- parse APIs returning success/failure;
- resource acquisition where the handle must be used;
- transactional result objects;
- functional transformations;
- APIs returning errors rather than throwing.

Example:

```
import 'package:meta/meta.dart';

@immutable
final class CounterState {
  const CounterState(this.value);

  final int value;

  @UseResult('Use the returned immutable state.')
  CounterState increment() {
    return CounterState(value + 1);
  }
}

```

Bad:

```
state.increment();

```

Good:

```
state = state.increment();

```

The ignored call can produce `unused_result`.

---

# Do Not Mark Every Return Value

Avoid:

```
class User {
  @useResult
  String get displayName => ...;

  @useResult
  bool get isActive => ...;

  @useResult
  String toDisplayString() => ...;
}

```

if discarding those values is harmless.

Overuse creates noise and trains maintainers to suppress useful diagnostics.

Use the annotation where:

```
ignored result ≈ likely bug

```

not merely:

```
method happens to return something

```

---

# Async Result Rules

Do not confuse:

```
@useResult
Future<Result> save()

```

with:

```
@awaitNotRequired
Future<void> log()

```

They express nearly opposite caller intent.

`@useResult`:

> The returned value should be used.

`@awaitNotRequired`:

> The returned future may intentionally be ignored under the documented safe-to-ignore contract.

Avoid placing both on the same API unless there is a highly unusual, carefully verified reason.

---

# Lifecycle Contracts

Flutter framework APIs provide useful examples because Flutter exposes a large inheritance-oriented framework surface.

Current `State` APIs include:

- `didUpdateWidget`: `@mustCallSuper` + `@protected`;
- `didChangeDependencies`: `@protected` + `@mustCallSuper`;
- `dispose`: `@protected` + `@mustCallSuper`;
- `activate`: `@protected` + `@mustCallSuper`;
- `deactivate`: `@protected` + `@mustCallSuper`.

Flutter's documentation explicitly tells overrides where to invoke the superclass implementation.

In contrast, `State.build` is:

```
@protected
abstract

```

and does not have a `@mustCallSuper` contract.

Therefore:

> Never infer that "Flutter lifecycle method" automatically means `@mustCallSuper`.

Read the API contract.

---

# Flutter Lifecycle Override Example

```
class SearchPageState extends State<SearchPage> {
  late final SearchController controller;

  @override
  void initState() {
    super.initState();
    controller = SearchController();
  }

  @override
  void didUpdateWidget(covariant SearchPage oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.accountId != widget.accountId) {
      controller.switchAccount(widget.accountId);
    }
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return const SizedBox();
  }
}

```

Do not add a meaningless:

```
super.build(context);

```

because `State.build` is abstract.

---

# Internal APIs

Package authors should make a conscious distinction between:

```
public stable API
public experimental API
package-internal API
library-private API
test-only API
subclass extension API

```

Recommended mapping:

| BoundaryMechanism           |                                                     |
| --------------------------- | --------------------------------------------------- |
| Same Dart library only      | `_private`                                          |
| Same package implementation | `lib/src` + curated exports; optionally `@internal` |
| Public stable               | normal exported declaration                         |
| Public unstable             | `@experimental`                                     |
| Subclass implementation     | `@protected`                                        |
| Override-only seam          | `@visibleForOverriding`                             |
| Exceptional test access     | `@visibleForTesting`                                |

Do not use a single annotation for all forms of "not really public."

---

# Deprecation

Deprecation is a Dart-core feature, not primarily a `package:meta` feature.

Modern Dart provides:

```
@Deprecated('message')

```

and the shorthand:

```
@deprecated

```

The current `Deprecated` API also provides targeted forms for deprecating particular uses:

```
@Deprecated.extend(...)
@Deprecated.implement(...)
@Deprecated.instantiate(...)
@Deprecated.mixin(...)
@Deprecated.optional(...)
@Deprecated.subclass(...)

```

These allow API maintainers to phase out specific usage modes without immediately deprecating every use of a declaration.

---

# Prefer `@Deprecated(...)` With Migration Guidance

Bad:

```
@Deprecated('Deprecated')
void connect() {}

```

Bad:

```
@deprecated
void connect() {}

```

for a package API where callers need an actionable migration path.

Better:

```
@Deprecated(
  'Use NetworkClient.connect instead. '
  'Deprecated in 3.2.0.',
)
void connect() {}

```

If project/package policy has a credible removal schedule:

```
@Deprecated(
  'Use NetworkClient.connect instead. '
  'Deprecated in 3.2.0; planned for removal in 4.0.0.',
)
void connect() {}

```

Only include a removal version/date when maintainers actually intend to honor it.

Dart's documentation says a deprecation message should explain how callers can achieve the same effect.

---

# Targeted Deprecation

If constructing a class remains supported but subclassing no longer should be:

```
@Deprecated.subclass(
  'Subclassing LegacyClient is deprecated. '
  'Implement ClientAdapter instead.',
)
class LegacyClient {
  LegacyClient();
}

```

Choose the targeted `Deprecated` constructor matching the capability being phased out.

Do not deprecate the entire class unnecessarily.

---

# Deprecation Lints

Useful package-maintenance lints include:

```
deprecated_consistency
provide_deprecation_message
remove_deprecations_in_breaking_versions

```

`deprecated_consistency` helps keep related fields/constructors/parameters consistently marked. `remove_deprecations_in_breaking_versions` can flag deprecated declarations still present in a breaking-version release.

Treat removal policy as a package-management decision, not a universal app rule.

---

# Testing Boundaries

Preferred order:

```
1. Test observable public behavior.
2. Extract a cohesive collaborator and test it.
3. Use package/library-private tests where architecture permits.
4. Only then consider @visibleForTesting.

```

Use `@visibleForTesting` for a narrow exceptional seam, not to turn private implementation into a parallel public test API.

---
