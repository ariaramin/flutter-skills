# Refactoring, legacy modernization, and review

## Behavior-preserving changes

Record the invariant: output, ordering, errors, persistence, timing guarantees, public API, navigation/state lifetime and accessibility. Find direct and exported consumers before touching code. If behavior is unclear, write a focused characterization test around a stable seam before moving logic.

| Observed problem | Candidate | Keep / stop condition |
| --- | --- | --- |
| A method mixes decisions and mechanics | Extract a named operation around one responsibility. | Preserve sequencing/errors; stop when the reader can follow the decision. |
| A class changes for unrelated reasons | Extract one cohesive collaborator with explicit ownership. | Keep together when splitting only adds forwarding or shared mutable state. |
| Logic repeatedly reaches through another object's internals | Move it to the owner of its invariant/data. | Check call sites and visibility; do not increase coupling to save parameters. |
| Indirection hides trivial behavior | Inline a forwarding method/class. | Preserve meaningful public seams and test boundaries. |
| Nested conditions obscure policy | Use guard clauses or exhaustive state handling. | Preserve evaluation order, short-circuit side effects and error distinctions. |
| Primitive values allow invalid combinations | Add a validated domain type at a real boundary. | Keep primitives for simple values with no confused units/identity/invariants. |
| Repeated code represents one stable policy | Extract that policy. | Similar syntax with independently changing semantics can remain duplicated. |
| A dependency makes behavior untestable | Inject the narrow dependency or wrap the external boundary. | Prefer an existing constructor/function seam; avoid interface-per-class rules. |

SOLID, DRY, KISS and YAGNI are decision aids: favor cohesive responsibilities, valid substitutability, small meaningful contracts, and dependency direction toward stable policy. Do not count classes, deduplicate unlike concepts, or invent future extension points.

## Legacy modernization

Inventory SDK/language lower bounds, deprecations, package/native compatibility and persistence consumers. Use formatter/analyzer/migration diagnostics as evidence. Migrate one boundary at a time; retain compatibility adapters only while actual old callers require them. Use a strangler approach when an old subsystem can be replaced behind a stable boundary without a broad rewrite.

Separate SDK/dependency/schema upgrades from stylistic cleanup where failures need different rollback or verification. Test stored fixtures and upgrade paths before writing new data formats. Do not delete the old data/key after a failed migration. Public API or sealed/modifier changes can break downstream packages even if local tests pass.

## Review protocol

Read the diff and sibling callers before judging it. Check requirements, reachable correctness failures, state/data ownership, async ordering/disposal, API compatibility, errors, input trust, secrets/authorization, storage integrity, runtime costs, accessible interaction, and affected targets/tests.

Use project severity definitions; otherwise:

- **P0:** immediately release-blocking catastrophic failure supported by concrete evidence.
- **P1:** serious data loss, security exposure or core-function failure under a reachable condition.
- **P2:** important bounded correctness, regression, reliability or maintainability defect.
- **P3:** minor actionable issue with concrete impact; omit preferences that do not matter to the task.

Finding contract: `[priority] title — path:line`, followed by trigger, observed implementation/evidence, impact, smallest correction and focused regression check. Use tight line spans and identify assumptions; do not invent exact locations from an excerpt without line numbers.

Do not report a hypothetical optimization as a defect without a demonstrated issue or clear resource bound violation. Do not demand a rewrite, package swap or coverage quota to fix a local bug. A small code diff can still require broad verification if the contract is shared. If no findings exist, state that and report review/test limits. Review authorization does not imply code edits, commits or publishing.

Engineering judgment: transformation choices, incremental legacy strategy and review severity are a synthesis, not official Flutter mandates. Technical invariants map to [sources](sources.md).
