# Final Quality Audit

## Coverage

- [x] Both repositories inventoried through their maintained README topic indexes.
- [x] High-impact code/source entries sampled and inspected directly.
- [x] Dart, widgets/context, lifecycle, layout/rendering, async/streams, performance, architecture, testing/debugging, forms/accessibility/localization, platform/tooling/security covered.
- [x] Package-specific ecosystems (Riverpod, Bloc, Hooks, Firebase, Dio) separated from universal rules.

## Deduplication

- [x] Repeated async/context/disposal/list/performance/error topics merged into stronger normalized rules.
- [x] Equivalent Dart collection tricks grouped instead of repeated.
- [x] UI micro-recipes remain discoverable through taxonomy/source map without bloating `SKILL.md`.

## Modernization

- [x] `dart:html` marked deprecated; modern `package:web` direction documented.
- [x] obsolete Dart macros experiment marked legacy/abandoned.
- [x] Matrix4 dynamic transform APIs marked deprecated.
- [x] `Color.withOpacity` marked deprecated.
- [x] `WillPopScope` marked deprecated.
- [x] Intrinsic sizing downgraded to situational due official performance warning.
- [x] MediaQuery aspect-specific accessors preferred.
- [x] `debugPrint` release behavior captured.
- [x] `compute` native vs web behavior captured.

## Agent usability

- [x] Main skill is operational rather than encyclopedic.
- [x] Important rules use Trigger → Diagnosis → Action → Verification.
- [x] Finding priority distinguishes correctness/leaks/security/performance/maintainability/style.
- [x] Explicit overengineering guard included.
- [x] References route by task domain.
- [x] Examples include concise Avoid/Prefer-style patterns.

## Technical caution

- [x] No package-specific API is declared universally current without a verification caveat.
- [x] Performance claims are tied to profiling or official framework behavior.
- [x] Secret/config guidance distinguishes public client identifiers from privileged credentials.
- [x] Error-handling rules avoid swallowing programmer/unexpected failures.
- [x] Cancellation guidance distinguishes ignoring completion from canceling underlying work.

## Traceability

- [x] Source map includes both repositories and concrete paths for major normalized rules.
- [x] Modernization status recorded where source-era advice may be obsolete.
- [x] Repository prose is synthesized rather than copied wholesale.

## Remaining maintenance rule

Before applying any version-sensitive package/tooling rule in a future project, the consuming agent must verify the project's SDK/dependency versions and current official documentation. This is intentional: a static skill should encode durable decision logic, not freeze volatile package syntax.
