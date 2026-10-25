# Architecture, Dart, and data decisions

## Language and API contracts

Check package language version and installed SDK before adopting syntax. Records, patterns, and most class modifiers require Dart 3; extension types require Dart 3.3; non-binding wildcard variables require Dart 3.7. Verify later features independently rather than copying latest documentation into an older project.

| Construct | Choose when | Guardrail and check |
| --- | --- | --- |
| Inference and generics | Types are evident or a container/algorithm needs a reusable contract. | Type empty collections deliberately; keep public boundaries clear. `dynamic` disables useful static checks. `Object?` is appropriate for unknown values before narrowing. |
| Nullability, `!`, `late` | Absence is meaningful, or a lifecycle invariant proves initialization. | Prefer promotion/pattern checks; test missing fields and access ordering. A cast/assertion is not input validation. |
| Records and destructuring | A small positional/named result has structural meaning without a domain identity. | Use a named class for invariants, behavior, documentation, or evolving public APIs. |
| Sealed unions and exhaustive switches | A closed set of states benefits from compiler checking. | A default/wildcard arm can hide new cases. A union is unnecessary for a single flag. |
| `interface`, `base`, `final` | External implementation/inheritance needs a deliberate contract. | Modifiers change consumers' ability to subtype or fake the class; inspect exports/tests. |
| Extension methods | Cohesive operations belong on an unowned type. | Resolution is static; avoid hidden global state and surprising collisions. |
| Extension types | A static representation wrapper restricts available operations. | Runtime representation is unchanged; this is not runtime validation or a security boundary. |
| Mixins / inheritance / composition | A shared capability, substitutable subtype, or owned collaborator respectively expresses the relationship. | Prefer composition when lifecycle or behavior varies independently; avoid inheritance solely to reuse a method. |
| Equality and collections | Value semantics matter for state, maps, sets, or deduplication. | Equal values need equal hashes. Do not mutate equality fields in keys; `final List` does not freeze contents. |

Dart generics are covariant with runtime checks; widening a `List<int>` to `List<num>` does not allow storing a double safely. Overridden method parameters generally accept the same type or a supertype. Use `covariant` only for an intentional runtime-checked narrowing, not to silence an incompatible contract. Do not assume experimental variance syntax is stable.

Keep imports within public package boundaries; do not import another package's `src/`. Match the project's lint-supported import style. Document units, nullability, thrown failures, ownership, and compatibility of public APIs. Avoid expensive/I/O getters that appear to be cheap property reads.

## Architecture and state

Treat official UI/data separation and repository/MVVM guidance as strong defaults. Existing coherent architectures can satisfy the same concerns. Compare change cost and actual ownership needs before migration.

- Views render presentation state and capture events; keep data policy and complex rules in existing owners. Local animation/layout/ephemeral state belongs in widgets.
- Feature controllers coordinate commands and their loading/error/result states. Data repositories own a source-of-truth policy; services handle external mechanisms.
- Add a domain/use-case layer for complex reused orchestration, not forwarding methods. Split DTOs/domain models when transport details contaminate business behavior, not automatically for every object.
- Keep feature-first or layer-first folders consistent. Extract packages for actual reuse/ownership/dependency boundaries; verify exports and monorepo CI consumers.
- Constructor injection is sufficient for many dependencies. Preserve existing DI registration and scope; a borrower must not dispose a shared service.
- Retain Navigator for simple stacks; consider Router/current routing library for URL synchronization, nested navigation, or deep-link requirements. Validate route inputs and authorize the underlying operation independently of route guards.

## Async ownership

`async` does not move synchronous work off the current isolate. A plain `Future` has no general cancellation operation. A timeout stops waiting, not necessarily the underlying request or side effect.

Use transport cancellation when supported, and generation/disposal guards before publishing success, error, or finally state. A mounted widget can still receive an obsolete result: mounted checks alone do not solve request ordering. Replace subscriptions when their source changes; cancel subscriptions/timers and remove owned listeners on teardown.

See [the runnable latest-search example](examples/latest_search.dart) for guarded success, error, finally and disposal paths with controlled-future assertions. It uses only Dart's standard library; connect publication to the project's existing state mechanism. The guard invalidates results, not the underlying operation; cancel owned transport work separately when supported. Keep this distinction when adapting it to Flutter notifiers or widgets.

Use `Future.wait` for independent, suitably bounded operations. It preserves input result order; `eagerError` reports early without canceling other futures. Decide cleanup and partial-failure behavior. Keep dependent writes and ordered migrations sequential; bound high-volume concurrency.

Native `Isolate.run` is for substantial computation or blocking work whose transfer/startup cost is acceptable. Keep captured state minimal and sendable. Its result transfer is not always a full copy; `Isolate.run` uses isolate exit to return results. Ordinary asynchronous I/O usually needs no isolate. Dart web does not support isolates; Flutter web `compute` executes on the current event loop. A worker/chunking solution needs its own browser integration and tests.

## Network, persistence, and security boundaries

- Validate external JSON, deep links, imports, and platform responses for shape, ranges, size, identity, and allowed operations. Keep raw values at the boundary until narrowed into trusted types.
- Configure timeouts using the installed transport's capabilities and user workflow. Preserve meaningful operational errors; redact credentials, personal payloads, and sensitive identifiers in logs.
- Retry only eligible transient failures with a bounded budget/backoff/jitter. Mutating requests require explicit idempotency semantics; an HTTP timeout does not prove the server did nothing. Do not bypass TLS/certificate validation to fix connectivity.
- Define pagination/in-flight guards and a stable query identity. Bound expensive caches by scope/capacity with freshness/invalidation policies.
- Distinguish disposable session caches from user-owned offline documents. On logout, revoke session access and clear appropriate credentials/caches; retain durable content and required decryption material according to product ownership policy. Never delete data or keys merely as cleanup.
- Use transactions/atomic replacement and tested schema migrations where applicable. Preserve the previous usable data when import, migration, or restore fails. Inspect backup/key-loss behavior before changing encryption or storage.
- Privileged secrets belong on a server. `.env`, `--dart-define`, assets, minification, and obfuscation do not make distributed values confidential. Public restricted client identifiers differ from server secrets. Platform secure storage protects appropriate local credentials at rest, with target-specific backup/access guarantees; verify the actual plugin/version rather than prescribing one universally.
- Enforce authorization at the trusted service/data boundary. Review dependency provenance, resolved versions, maintenance, licenses, native permissions, and platform support before adding/upgrading a package. Preserve existing lock/CI policies.
- Preserve framework and uncaught asynchronous error reporting (`FlutterError.onError`, `PlatformDispatcher.instance.onError`) when applicable. Global reporting does not replace local recovery; redact reports and retain diagnosable stack traces.

Sources: Effective Dart, Dart type system/class modifiers/extension types/error handling, `Future.wait`, `Isolate.run`, `compute`, Flutter architecture/navigation/error handling, and obfuscation documentation in [sources](sources.md). Persistence, retry, and security boundary choices above include explicit engineering judgment; verify package contracts for implementation details.
