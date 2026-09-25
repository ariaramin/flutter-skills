# Flutter Decision Frameworks

## 1. Local `setState` or external presentation owner?

Use local state when:
- only one widget/subtree owns it;
- it is ephemeral;
- it should die with the widget;
- no durable/business orchestration exists.

Use external owner when:
- state survives view replacement;
- multiple widgets/features consume it;
- async/error/retry state is non-trivial;
- testable business/presentation logic exists.

## 2. ViewModel/controller/BLoC/notifier?

First detect project convention.

Compare:
- state mutation model;
- event/command semantics;
- async ergonomics;
- scoping/disposal;
- testability;
- team familiarity;
- codegen/tooling cost.

Result:
Prefer consistency unless current mechanism causes a concrete limitation.

## 3. Do we need a domain/use-case layer? [F/B]

Add if logic:
- combines multiple repositories;
- is reused by several presentation owners;
- is complex enough to crowd them;
- deserves independent policy/testing.

Avoid if:
- it simply forwards one repository method.

## 4. One app package or multiple packages?

Split when:
- ownership boundaries are real;
- reuse spans apps/features;
- dependency enforcement/build isolation matters;
- native capability deserves plugin boundary.

Stay single-package when:
- team/app is small;
- boundaries are still evolving;
- package ceremony exceeds value.

## 5. `Navigator` or `Router`/routing package? [F]

`Navigator`:
- simple push/pop;
- small navigation model.

Router/package:
- deep links;
- web URL sync;
- complex nested navigation;
- guards/redirects;
- declarative route state.

Avoid named routes as a default for complex apps under current Flutter guidance.

## 6. Pass model or ID through route?

Pass ID when:
- model can become stale;
- repository is source of truth;
- deep links/restoration need reconstruction.

Pass small immutable model/config when:
- it is a snapshot by product definition;
- no authoritative reload exists;
- flow is temporary and isolated.

## 7. `Future` or `Stream`?

`Future`:
- one result;
- command/request;
- explicit refresh.

`Stream`:
- ongoing values;
- repository source-of-truth updates;
- realtime/local DB observation.

Do not expose a stream simply because state-management package likes streams.

## 8. Async on main isolate or new isolate? [D]

Async I/O:
- main isolate event loop is usually correct.

Isolate:
- measured CPU work blocks responsiveness enough to justify transfer overhead.

## 9. Remote-first or local-first?

Remote-first:
- freshness dominates;
- offline is secondary.

Local-first:
- immediate/offline access matters;
- repository can reconcile remote refresh.

Define stale and conflict behavior either way.

## 10. Optimistic or pessimistic mutation? [B]

Optimistic:
- immediate UX matters;
- failure is uncommon/recoverable;
- reconciliation is defined.

Pessimistic:
- irreversible/high-risk operations;
- server decision is essential before showing success.

## 11. Platform channel, Pigeon, plugin, or FFI? [F]

Platform channel:
- small app-specific native API.

Pigeon:
- typed multi-method Dart/native contract.

Plugin:
- reusable platform capability.

FFI:
- direct native library bindings/use case fits FFI.

## 12. Provider/DI container or constructor wiring?

Manual constructors:
- small/clear graph.

Provider/container:
- many scoped objects;
- lifetime management/test override ergonomics justify it.

Regardless, keep core dependencies explicit.

## 13. DTO/domain/view models: one type or several?

Reuse one type if:
- semantics and lifecycle are genuinely identical.

Separate when:
- transport/storage fields leak;
- domain invariants differ;
- UI formatting state differs;
- mutation/serialization requirements diverge.

## 14. Widget extraction?

Extract if:
- reused;
- semantically meaningful;
- rebuild isolation matters;
- lifecycle owner emerges;
- test surface benefits.

Do not extract based on line count alone.

## 15. Refactor architecture or leave it?

Refactor when:
- feature changes repeatedly hit same coupling;
- testability blocks safe delivery;
- state bugs stem from unclear ownership;
- module/team scale requires boundary;
- platform/data code leaks across many features.

Leave when:
- issue is stylistic;
- migration cost exceeds foreseeable benefit;
- current architecture is coherent and tested.
