---
name: flutter-squadron-concurrency-engineering
description: Design, implement, review, debug, test, migrate, and optimize production Flutter/Dart concurrency built with Squadron. Use this skill whenever work involves CPU-heavy processing, Dart isolates, Web Workers, Squadron workers or worker pools, squadron_builder code generation, marshaling custom DTOs, cancellation, worker streams, pool sizing, backpressure, worker lifecycle, stale-result races, web worker deployment, or diagnosing whether offloading improves Flutter responsiveness—even when the user only reports UI jank, slow parsing, expensive image processing, worker startup latency, queue saturation, or worker-related memory/thermal issues.
compatibility: Source baseline is Squadron 7.4.3 with the corresponding 7.4.x-era generated worker APIs and squadron_builder 9.x guidance. Inspect the repository's exact Dart, Flutter, squadron, squadron_builder, cancelation_token, web target, generated files, and deployment pipeline before using version-sensitive APIs or migration advice.
---

# Flutter Squadron Concurrency Engineering

## Mission
Move only the **right computation** off Flutter's main isolate, using the smallest justified worker boundary, message volume, concurrency, and lifecycle cost.
Use this decision loop:
```text
measure the slow stage
→ classify CPU vs I/O
→ estimate transfer/startup cost
→ choose main/Future/compute/Worker/Pool/server
→ define coarse worker API + wire types
→ bound concurrency/backpressure
→ add cancellation + stale-result protection
→ own worker lifecycle
→ test native and web separately
→ profile end-to-end + UI frames + memory/thermals
```
Squadron is structured worker/RPC infrastructure, not a generic wrapper around every `Future`.

## Non-negotiable rules
1. Measure before offloading.
2. Use workers mainly for meaningful CPU-bound or long-running isolated work.
3. Do not offload ordinary HTTP, socket, storage, or timer waits merely because they are asynchronous.
4. Measure total worker cost, including startup, marshaling, transfer, queue wait, compute, and result handling.
5. Treat every worker method as a serialization boundary API.
6. Keep messages compact and task APIs coarse-grained.
7. Batch tiny operations rather than issuing thousands of RPC calls.
8. Reuse persistent workers when recurring work justifies startup amortization.
9. Use a pool only when true parallel throughput is needed.
10. Bound `maxWorkers`; do not unintentionally leave CPU burst workloads unbounded.
11. For CPU-heavy pool tasks, default to `maxParallel: 1` unless measurement and semantics prove otherwise.
12. Do not set pool size mechanically to processor count.
13. Preserve CPU headroom for Flutter UI/raster work and the operating system.
14. Keep worker computation pure and platform-independent where practical.
15. Never pass `BuildContext`, Widgets, RenderObjects, controllers, or other UI/runtime objects across workers.
16. Verify any Flutter plugin used from workers explicitly supports the required background-isolate/platform behavior.
17. Use supported wire types or explicit `SquadronMarshaler`s for custom DTOs.
18. Do not claim zero-copy unless the exact platform/type path truly provides transfer semantics.
19. Use cooperative cancellation when expensive running CPU work must actually stop.
20. Reject stale results even when cancellation exists.
21. Treat one worker's async methods as potentially interleaving across `await` points.
22. Do not assume pool calls hit the same worker; use a dedicated worker or `pool.execute()` for state affinity.
23. Own worker/pool lifecycle explicitly and call `stop()`.
24. Build and deploy web worker artifacts explicitly; native success does not prove web correctness.
25. Optimize user responsiveness, memory, battery, and thermals—not just raw throughput.

## Reference routing
Read only what the task needs:
| Need | Read |
|---|---|
| Decide whether Squadron is appropriate; compare Future/compute/isolates; setup generation; worker lifecycle/startup | `references/01-foundations-workers-lifecycle.md` |
| Pools, `ConcurrencySettings`, backpressure, stateful workers, marshaling, typed data, streams, cancellation, stale results, errors, observability | `references/02-pools-state-serialization-cancellation.md` |
| Flutter/Bloc/DI integration, plugins, Web Workers, JS/Wasm build/deploy, workload patterns, profiling, memory, battery/thermals | `references/03-flutter-web-workloads-performance.md` |
| Unit/integration/pool/web tests, debugging, migrations, behavior-preserving refactors | `references/04-testing-debugging-migration.md` |
| Anti-patterns, new-worker workflow, existing-code review, checklists, production gate | `references/05-antipatterns-workflows-checklists.md` |

## Step 1 — Inspect the repository and measure the actual bottleneck
Before changing concurrency, inspect:
```text
Flutter + Dart versions
squadron + squadron_builder versions
cancelation_token version
generated *.worker.g.dart / *.activator.g.dart files
worker ownership and stop() paths
pool ConcurrencySettings
service annotations + baseUrl + targetPlatform
custom marshalers/exceptions
payload sizes and task frequency
web worker build/deployment scripts
state-management integration
existing benchmarks/profile captures
```
Search for:
```text
@SquadronService
@SquadronMethod
WorkerPool
ConcurrencySettings
maxWorkers
maxParallel
pool.execute
CancelationToken
TimeoutToken
SquadronMarshaler
TransferableTypedData
channelLogger
stop()
```
Then identify the precise slow stage. Prefer evidence such as:
```text
"parsing 18 MB JSON blocks the main isolate for ~95 ms"
```
over vague claims such as:
```text
"loading is slow"
```

## Step 2 — Classify CPU-bound vs I/O-bound
Good worker candidates:
```text
large parse/transform
audio/image processing
compression/decompression
CPU-heavy hashing/crypto
large sorting/aggregation
local indexing/search
binary parsing/decoding
large model transforms
```
Usually keep ordinary waiting on async I/O:
```text
HTTP/socket waits
database/file waits
secure-storage calls
timers
```
For mixed pipelines, isolate the CPU stage:
```text
HTTP wait
→ large response decode/transform  ← worker candidate
```
Do not offload an entire repository method merely because one substage is expensive.

## Step 3 — Choose the smallest execution model that fits
Use this default ladder:
| Situation | Prefer |
|---|---|
| Tiny synchronous work | Main isolate |
| Ordinary nonblocking I/O | `Future`/async I/O |
| Occasional native CPU-heavy task | Consider `compute()` / `Isolate.run()` |
| Recurring CPU-heavy operation | Persistent Squadron `Worker` |
| Multiple independent recurring CPU jobs | `WorkerPool`, after profiling |
| Cross-platform VM + Web Worker abstraction | Squadron |
| Full custom isolate protocol required | Raw `Isolate` |
| Better done remotely | Backend/server processing |
A worker can be worthwhile even when elapsed task time is similar if it removes a visible main-isolate stall.

## Step 4 — Model total cost, not only worker compute time
Use:
```text
Tworker =
  startup/warmup
+ marshal input
+ transfer/copy input
+ queue wait
+ compute
+ marshal output
+ transfer/copy output
+ main-isolate postprocessing
```
Measure at least:
- cold first call;
- warm call;
- request/result size;
- queue wait;
- worker runtime;
- end-to-end latency;
- Flutter frame impact.
Do not benchmark only code inside the worker and call that the architecture's latency.

## Step 5 — Design a coarse generated service API
Expose meaningful expensive operations, not tiny implementation steps.
Prefer:
```text
resizeImage(bytes, width, height)
transformRows(batch)
search(indexQuery)
parseDocument(bytes)
```
Avoid:
```text
readByte()
transformOneTinyValue()
writeByte()
```
for huge loops.
Keep core algorithms extractable as ordinary Dart logic so most correctness tests do not require workers.
After changing service signatures/annotations/marshalers, regenerate:
```bash
dart run build_runner build --delete-conflicting-outputs
```
Never hand-edit generated protocol files.

## Step 6 — Choose worker lifecycle deliberately
Use:
```text
one-shot      → rare + very expensive + startup justified
feature scope → expensive rarely used feature
lazy app      → recurring but not every session
app scope     → common recurring workload; startup amortized
```
Workers auto-start on first use; call `start()` when you intentionally want earlier initialization or clearer startup-error handling.
Always establish one owner responsible for `stop()`.
Do not prewarm many rare workers at app launch.

## Step 7 — Decide whether a pool is actually necessary
Use one worker when:
- jobs are sequential;
- state affinity matters;
- throughput is already sufficient;
- more workers would duplicate large state.
Use a pool when independent tasks benefit from genuine parallel throughput.
For CPU-heavy pools start conservatively, for example:
```dart
const ConcurrencySettings(
  minWorkers: 1,
  maxWorkers: 2,
  maxParallel: 1,
)
```
then benchmark alternatives.
Important:
```text
maxWorkers == 0 → unbounded maximum
```
Do not leave that accidental in bursty production CPU paths.
`maxParallel` controls how many tasks may be posted to one worker; it does not create extra CPU threads inside that isolate.

## Step 8 — Add backpressure before increasing concurrency
If producers can outpace workers, choose explicit policy:
```text
debounce
throttle
batch
coalesce
latest-wins
bounded upstream queue
cancel obsolete pending work
reject/drop low-value work
```
Use task `waitTime` vs `runningTime` to distinguish queue pressure from slow computation.
A 900 ms wait and 30 ms run time is a scheduling/load problem, not an algorithm problem.

## Step 9 — Treat stateful workers as an exception
Default to:
```text
input → compute → output
```
State can be justified for expensive reusable indexes/tables/codecs, but introduces affinity, memory, and interleaving risks.
One worker thread does not prevent async logical interleaving:
```text
request A mutates field
→ await
request B mutates same field
→ A resumes with B's state
```
For stateful multi-call operations:
- prefer a dedicated Worker; or
- reserve one pool worker with `pool.execute()`;
- generally keep `maxParallel: 1` for exclusive stateful workflows.
Never assume two ordinary pool calls land on the same worker.

## Step 10 — Design wire data intentionally
Prefer:
```text
null/bool/int/double/String
small Lists/Maps/Sets
Uint8List / typed numeric data
explicit DTO wire forms via SquadronMarshaler
```
Keep marshalers compact, stable, and round-trip tested:
```text
unmarshal(marshal(value)) ≈ value
```
Do not send giant arbitrary domain graphs when a small DTO will do.
For binary workloads prefer typed data over object-heavy `List<int>` when appropriate.
Native and web transfer semantics differ. Treat `TransferableTypedData` as a deliberate VM-specific optimization, including its creation/materialization/ownership costs; do not leak native-only assumptions into cross-platform APIs.

## Step 11 — Minimize repeated large transfers
Before moving a payload, estimate:
```text
input MB × calls
+
output MB × calls
```
If the same large dataset is reused repeatedly, consider whether a dedicated worker should own a worker-local copy and receive small queries.
Only do this when lifecycle, memory, state affinity, and invalidation are explicit.
Do not send a 100 MB dataset repeatedly to compute a tiny answer.

## Step 12 — Design cancellation and stale-result safety separately
Cancellation may mean either:
```text
caller stops caring
```
or:
```text
worker CPU work stops
```
For expensive running CPU loops, use cooperative `CancelationToken` checks.
A caller-side timeout or task cancel does not automatically prove CPU work has stopped.
For interactive latest-wins flows use both:
```text
debounce
+ cancel previous token
+ monotonically increasing revision/request ID
+ discard result if revision is stale
```
Cancellation saves resources; revision checks guarantee correctness.

## Step 13 — Handle streams carefully
Use worker streams for meaningful progressive output, not per-byte/per-iteration chatter.
Throttle/coalesce high-frequency progress events so message overhead does not dominate.
Test:
- event order within one stream;
- completion;
- worker-side errors;
- subscription cancellation;
- cleanup.

## Step 14 — Keep Flutter UI concerns on the main isolate
Keep on main isolate:
```text
Widgets / BuildContext
navigation
rendering
state emission
framework object manipulation
```
Preferred architecture:
```text
Widget
→ Cubit/ViewModel
→ Repository/Application service
→ CPU processing abstraction
→ Squadron Worker/Pool
```
Do not expose Worker/Pool/Task/WorkerException in UI state unless the product explicitly manages worker infrastructure.
Verify background-isolate support before using Flutter plugins inside workers. When uncertain, keep plugin I/O on its supported isolate and offload pure CPU transformation only.

## Step 15 — Treat web as a separate deployment target
Squadron web uses browser Web Workers, not native isolates.
Verify:
```text
targetPlatform
baseUrl
generated *.web.g.dart
compiled JS or Wasm worker artifact
deployed URL
CSP
custom marshaling
browser compatibility
```
Automate the pipeline:
```text
build_runner
→ compile generated web worker entry
→ flutter build web
→ verify/copy artifacts
→ deploy
→ browser worker-start smoke test
```
Do not assume native tests or `flutter build web` alone prove the worker artifact is available at runtime.

## Step 16 — Map errors at the processing boundary
Treat Squadron errors as infrastructure details.
Preferred:
```text
WorkerException / worker-channel failure
→ ProcessingFailure / SearchFailure / ImageFailure
→ state-management failure state
→ user-facing recovery
```
Preserve sanitized diagnostics:
```text
task type
payload size
queue wait
worker runtime
worker/pool initialization
error category
```
Do not log full sensitive payloads.
Retry only operations proven safe to replay; do not assume worker crashes make external side effects idempotent.

## Step 17 — Test correctness without depending on concurrency first
Extract pure computation and unit-test it directly.
Then add boundary tests for:
- worker start/call/stop;
- result + exception propagation;
- marshaler round trips;
- cancellation;
- streams;
- pool queueing/bounds;
- state affinity if used;
- web worker artifact startup and RPC.
Do not assert exact completion order unless the API/business contract guarantees it.
Native tests do not replace real browser worker tests.

## Step 18 — Debug from the boundary inward
If a worker fails to start, check:
```text
versions
annotations
generated code
constructor marshaling
target platform
web artifact/baseUrl
```
If method-not-found occurs, regenerate before debugging protocol IDs.
If work hangs, inspect:
```text
pending vs running
queue saturation
await that never resolves
stateful interleaving/affinity
channel/worker crash
cancellation
```
If worker is slower than local, inspect startup + transfer + queue + granularity before adding workers.
If UI still janks, profile main-isolate preprocessing, result materialization, state mapping, widget build/layout, and raster work. Squadron cannot fix a raster bottleneck.

## Step 19 — Profile performance as a system
Compare appropriate variants:
```text
A main isolate
B compute / Isolate.run
C persistent Worker
D pool size 2
E other bounded pool sizes
```
Use production-sized workloads and profile/release conditions.
Measure:
- median and tail latency;
- cold/warm latency;
- queue wait and compute time;
- Flutter frame timings;
- CPU;
- memory peaks;
- mobile battery/thermals;
- browser-specific behavior.
A faster CPU benchmark that introduces scrolling jank, excessive memory, or thermal throttling is not a win.

## Step 20 — Review migrations behavior-first
Before upgrading Squadron or moving local code into workers:
1. record `squadron` and `squadron_builder` versions;
2. read intervening changelog/migration notes;
3. regenerate code;
4. characterize results/errors/ordering/cancellation first;
5. rerun native integration tests;
6. rebuild web worker artifacts;
7. run browser tests;
8. benchmark representative workloads.
Worker-boundary changes can alter timing, copying, object identity, exception shape, cancellation, state affinity, and plugin availability even when public business signatures look unchanged.

## Existing-code review output
When reviewing a repository, report findings in this order:
1. **Workload suitability** — which stages are actually CPU-bound and measured.
2. **Execution strategy** — whether main/compute/Worker/Pool is justified.
3. **Lifecycle** — startup, ownership, and missing `stop()` paths.
4. **Pool policy** — worker bounds, `maxParallel`, queue/backpressure.
5. **Message boundary** — payload sizes, granularity, marshalers, native/web differences.
6. **Concurrency correctness** — async interleaving, affinity, stale results, cancellation.
7. **Flutter integration** — UI/plugin boundary violations.
8. **Web deployment** — generated artifacts, base URL, CSP, browser verification.
9. **Performance evidence** — cold/warm, queue, frames, memory, thermals.
10. **Tests/migration risk** — missing boundary, browser, or regression coverage.
For each problem give:
```text
finding
→ why it matters
→ evidence
→ smallest safe change
→ verification
```

## Production definition of done
A Squadron change is production-ready only when:
- workload suitability is demonstrated;
- main-isolate baseline and end-to-end worker behavior are measured;
- worker/pool lifecycle and `stop()` ownership are explicit;
- concurrency is bounded;
- queue/backpressure policy exists for bursty producers;
- task granularity is sensible;
- payload sizes and marshaling are reviewed;
- custom DTOs round-trip correctly;
- stateful worker interleaving/affinity is deliberate;
- long-running obsolete CPU jobs can stop when required;
- stale results cannot overwrite newer state;
- worker errors map to application failures;
- plugin/background-isolate assumptions are verified;
- web artifacts are generated, deployed, and browser-tested when web is supported;
- profile/release measurements include frames and memory;
- low-end/mobile thermal implications are acceptable;
- generated code and package versions are compatible;
- pure logic and worker-boundary tests pass.
Use Squadron only when the worker boundary produces a measurable improvement in responsiveness, throughput, or isolation that justifies its communication and lifecycle cost.
