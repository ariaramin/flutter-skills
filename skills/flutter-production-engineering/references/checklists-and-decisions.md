# Anti-patterns and decision shortcuts

| Anti-pattern | Observable symptom and impact | Correction | When correction may not apply |
| --- | --- | --- | --- |
| Ban `setState` / mandate state package | Simple local state gains global lifecycle and dependencies. | Keep state at its existing smallest correct owner. | Shared/durable workflows can need structured state. |
| File/function line limits / one widget per file | Churn and fragmented responsibility without better comprehension. | Extract around responsibility, identity or reuse. | A project may explicitly require organization rules. |
| Interface/use case for every class | Forwarding and more change sites without a useful boundary. | Keep concrete injection; extract real policy/test seams. | Multiple implementations or external contracts justify an interface. |
| Latest API without SDK check | Analyzer/compiler fails for supported users. | Check installed SDK, package language lower bound and direct consumers. | An explicitly scoped SDK upgrade can change compatibility. |
| Fresh future/request in every build | Rebuild repeats I/O and introduces stale results. | Own the future/request lifecycle and refresh on input changes. | A deliberately cached future returned by a method is not necessarily fresh I/O. |
| `mounted` as the only race guard | Old query overwrites new results while widget is still mounted. | Reject obsolete success/error/finally completions and invalidate on disposal. | A single non-overlapping operation may need only lifecycle checks. |
| Automatic `Future.wait` | Ordered effects race, or many requests exhaust resources. | Parallelize independent bounded work with partial-failure semantics. | Ordered work remains sequential; CPU requires a different execution decision. |
| Isolate for every payload / web `Isolate.run` | Startup/transfer costs exceed benefit, or browser path is unsupported. | Measure stages; native isolate for expensive blocking work; explicit web strategy. | Cheap work stays synchronous; normal async I/O generally needs no isolate. |
| Boundaries, keys or `const` as generic speed fixes | More layers/churn but original frame bottleneck remains. | Match identity, constant construction and repaint frequency to their actual roles. | Framework defaults may already provide boundaries; a valid const is still idiomatic. |
| Eager construction of huge lists | All children are constructed and retained up front. | Lazy builders/slivers and bounded data. | Eager lists suit small fixed collections; do not claim all offscreen children are necessarily painted. |
| Blanket shrink-wrap/intrinsics | Extra layout work hides faulty constraints. | Fix parent constraints or use composed slivers. | Small genuinely content-sized layouts can use these correctly. |
| Arbitrary image decode/cache expansion | High decoded memory and retained buffers. | Size supported native decodes; bound caches; request smaller assets. | Web hints differ; high-resolution viewing may need more detail. |
| Replace group opacity with per-child alpha | Overlapping children blend differently. | Preserve visual grouping; measure equivalent alternatives. | Single non-overlapping content can often use direct alpha. |
| Client `.env`/obfuscation treated as a secret store | Distributed credentials can be extracted. | Keep privileged secrets server-side; restrict public client keys. | Local protected user credentials need target-specific secure storage. |
| Delete all data at logout | User-owned offline content or decryption keys disappear. | Separate session cleanup from durable ownership policy. | Explicit authorized deletion and disposable caches have different contracts. |
| Broad catch returns empty success | Corrupt data/network failure appears valid. | Recover, translate or report at the right boundary; retain stack/context safely. | Global last-resort reporting can catch broadly but must not fake recovery. |
| Debug timing / unsupported speed multiplier | Unrepeatable performance claims drive unnecessary changes. | Same workload, target and mode with raw measurements. | Debug tools can locate a cause; their timings are not release evidence. |

Quick choices: local UI state → existing local owner; complex shared data policy → existing feature/repository boundary; I/O → async transport; proven blocking native CPU → algorithm/isolate; browser CPU → yielding work/worker when justified; raster cost → paint/layers, not state-package migration.

Before stopping, verify the requested behavior, affected callers, lifecycle/error paths, relevant check and remaining evidence gaps. The full task gates are in SKILL.md; this table adds no universal suite/build requirement.
