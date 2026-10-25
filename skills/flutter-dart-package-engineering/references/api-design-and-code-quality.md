# API design and code quality

Effective Dart distilled for public package APIs, plus analyzer/lint/format configuration. Strength labels per SKILL.md §1.

## Public API surface rules (Effective Dart Design)

Rule labels are the page's own (DO/PREFER/AVOID/CONSIDER/DON'T) — treat DO/DON'T as MANDATORY for style consistency, PREFER/AVOID as RECOMMENDED.

Naming — public names are forever; renaming is a breaking change:

- DO use terms consistently with the core libraries (`to___()` conversions, `as___()` casts). PREFER most-descriptive-noun-last (`pageCount`, not `numPages`).
- PREFER positive boolean names (`isConnected`, not `isDisconnected`); non-imperative verb phrases for booleans, noun phrases for values.
- AVOID `get`-prefixed method names — use a getter or `create`/`fetch`/`calculate`. AVOID abbreviations unless more common than the full term.
- DO follow type-parameter mnemonics: `E`, `K`/`V`, `R`, then `T`/`S`/`U`.

Members and signatures:

- PREFER making declarations private; expose only what consumers need (`lib/src` for implementation). AVOID single-member abstract classes where a `typedef` function type does; AVOID static-only classes.
- PREFER `final` fields. CONSIDER `const` constructors when the type supports it — const-ness is an API commitment. DO use getters for conceptual properties (argument-free, idempotent, no side effects); DON'T add a setter without a getter.
- AVOID positional boolean parameters — named arguments, named constructors, or enums (`Task.oneShot()`, not `Task(true)`). AVOID optional positional parameters consumers may want to skip past. AVOID mandatory parameters with sentinel "no value" — make them optional.
- AVOID returning nullable `Future`/`Stream`/collections — empty means none. AVOID `this`-returning fluent APIs (use cascades). AVOID runtime type tests faking overloading — separate named methods.
- DO use `Future<void>` for async members producing no value. AVOID `FutureOr<T>` in return types (parameters only). PREFER inline function types; use modern `typedef X<T> = ... Function(...)` syntax.

Types and equality:

- AVOID `dynamic` in public signatures unless intentionally unchecked; `Object`/`Object?` plus `is` checks keep static checking. Validate and translate external data at the boundary before it crosses into typed code.
- DO override `hashCode` with `==`, obeying reflexive/symmetric/transitive laws; DON'T type the `==` parameter nullable (null equals only itself). AVOID custom equality on mutable classes (hash-based collections assume stable hashes).

Error contracts: document thrown errors in the doc comment ("Throws `FormatException` if..."); never let `Future`/`Stream` APIs fail silently — an unhandled async error is a contract hole. Follow [error-handling guidance](https://dart.dev/language/error-handling) for `Error` (programmer bugs) vs `Exception` (recoverable failure).

Source: https://dart.dev/effective-dart/design

## Class modifiers for API maintenance

Modifiers control how the API can be consumed **outside your library** — the tool for evolving a package without breaking consumers:

| Modifier | Outside library may extend | Outside library may implement | Use for |
| --- | --- | --- | --- |
| (none) | yes | yes | Unrestricted extension point |
| `abstract` | yes | yes (no construction) | Uninstantiable base |
| `base` | yes | **no** | Guarantee every instance inherits real implementation; prevents outside `implements` from missing members (incl. private) |
| `interface` | **no** | yes | Pure contract; protects against fragile-base-class overrides |
| `final` | **no** | **no** | Maximal maintainer freedom; only constructors/factories instantiate |
| `sealed` | no (same-library subtypes only) | no | Exhaustive `switch` over a closed family |
| `mixin class` | — | — | Opt-in mixin + class behavior in one declaration (Dart 3) |

Decision guidance for maintainers:

- `sealed` when you define the subtype family and won't add subtypes without a major bump — **adding a sealed subtype is a breaking change** (like adding an enum value: consumers' exhaustive switches stop compiling).
- `final` when you may add subtypes later without breaking consumers (forced `default` arm survives).
- `base` is contagious: every direct/indirect subtype must itself be `base`, `final`, or `sealed`.
- Adding any modifier to an existing public class is a breaking change — release as a major version bump.

Sources: https://dart.dev/language/class-modifiers , https://dart.dev/language/class-modifiers-for-apis

## Modern language features and version gates

- Records/patterns/sealed types/extension types require language ≥3.0 — set the `environment.sdk` lower bound accordingly (a package's language version is capped by its SDK lower bound even on newer toolchains). Extension types are zero-cost static wrappers, not runtime validation.
- Null safety: model absence with nullable types; `!`/`late` only with demonstrable invariants (they convert contract violations into runtime throws in consumers' apps).

## Doc comments (SCORING: documentation points)

pub.dev scores documentation on ≥20% of public API members documented plus a code example. The rules that produce good dart doc output:

- DO use `///` (not block `/* */`) — dart doc only processes `///`. PREFER doc comments on public APIs — "you should document most of them". CONSIDER a library-level doc comment (before the `library` directive): summary, terminology, samples, links.
- DO open with a single-sentence summary in its own paragraph — dart doc renders it as the short description.
- PREFER third-person verbs for methods ("Starts the stopwatch."), noun phrases for properties, "Whether ..." for booleans; PREFER "this" over "the" for the instance. DON'T document both a getter and its setter (setter comments are discarded).
- DO use prose, not JavaDoc tags — "Returns:"/"Throws:" sections, parameters in `[brackets]` (which also create dart doc links: `[Point.polar]`, `[Point.new]`).
- PREFER fenced code blocks (```dart) over indentation; CONSIDER a code sample — one real example beats paragraphs. AVOID markdown/HTML excess.
- DO format comments like sentences (capitalized, terminal punctuation); DO place doc comments before annotations.

Source: https://dart.dev/effective-dart/documentation

## Static analysis, lints, formatting

- `lints` provides exactly two official sets — `core` (critical) and `recommended` (core + style). The Dart team will **likely not** add a stricter official tier such as `strict`. `dart create` enables recommended by default; pub.dev pub points are computed against the **core** set. `flutter_lints` extends recommended with Flutter-specific rules. Pin a `lints` / `flutter_lints` major that matches the package's SDK lower bound; majors move (6.x required Dart 3.8).
- Configuration (RECOMMENDED — the ecosystem default):

```yaml
# analysis_options.yaml
include: package:flutter_lints/flutter.yaml   # Flutter packages
# include: package:lints/recommended.yaml     # pure Dart packages
```

  with `dart pub add dev:lints` (or `dev:flutter_lints`). Add tighter project lints deliberately, never loosen shipped rules to pass.
- `dart format` is the canonical formatter; CI checks with `dart format --output=none --set-exit-if-changed .`. Format deliberately — never mix style churn into functional changes.
- `dart fix --dry-run` previews bulk fixes; `--apply` applies them; wire deprecations into fix data via `lib/fix_data.yaml` so consumers migrate mechanically.

Sources: https://pub.dev/packages/lints , https://pub.dev/packages/flutter_lints , https://dart.dev/tools/dart-fix
