# Anti-Pattern Library

Evidence tags indicate whether the problem is directly visible in accessible channel material or supplemental generalization.

## 1. Solution Before Requirements [D1/D2]

**Symptoms:** architecture diagram appears before clarifying use cases/scale/offline.

**Why it happens:** memorized interview template or favorite pattern.

**Consequence:** solves the wrong constraints; misses mobile-specific risks.

**Detection:** cannot explain which requirement caused each major component.

**Alternative:** functional + nonfunctional + out-of-scope first.

**Refactor:** stop implementation, write constraints, delete unjustified components.

---

## 2. Pattern Name as Reasoning [C/I]

**Symptoms:** “Use Clean Architecture/MVVM because it's scalable.”

**Consequence:** unnecessary layers/boilerplate and no switch condition.

**Alternative:** compare responsibility, state ownership, dependency direction, testing, complexity.

---

## 3. Backend-Only System Design [D1]

**Symptoms:** client is a single box; no lifecycle/offline/local storage/state discussion.

**Consequence:** ignores the actual mobile architecture problem.

**Alternative:** high-level system context plus separate client-side architecture/deep dives.

---

## 4. Infinite Feed Without Pagination [D1/D2]

**Symptoms:** fetch-all endpoint or load-more with no continuation model.

**Consequence:** latency/memory/data inefficiency and inconsistent feed behavior.

**Alternative:** explicit offset/cursor choice + page state + end condition + dedupe.

---

## 5. Offline Read Only Pretending to Be Offline Support [D1]

**Symptoms:** cached screen works offline but user mutations disappear/fail silently.

**Consequence:** product promise is incomplete.

**Alternative:** define offline write scope, pending mutation queue, reconciliation, terminal UX.

---

## 6. Optimistic Update Without Reconciliation [D1]

**Symptoms:** UI flips state instantly, but request failure leaves false state.

**Consequence:** user sees data server never accepted.

**Alternative:** mutation ID/status, retry/rollback or correction, user feedback.

---

## 7. Retry Storm [D1/S]

**Symptoms:** every failure retried immediately/unbounded.

**Consequence:** battery/data waste, server rate limiting, outage amplification.

**Alternative:** classify retryability, exponential backoff (+ jitter [S]), retry budget, terminal state.

---

## 8. Repository as God Object [I/S]

**Symptoms:** one repository handles feed, comments, auth, navigation, analytics, UI formatting.

**Why:** repository misunderstood as “place for all non-UI code.”

**Alternative:** cohesive capability repositories/data sources; orchestration at appropriate layer.

---

## 9. Duplicate Sources of Truth [D1/S]

**Symptoms:** UI object, memory cache, DB row, and server response each mutate independently.

**Consequence:** stale/contradictory state.

**Alternative:** define authoritative source + client serving source + merge/invalidation policy.

---

## 10. Pass the Whole Mutable Model Through Navigation [D1/S]

**Symptoms:** large serializable model passed to detail screen and treated as current truth.

**Consequence:** stale state, restoration/deep-link difficulty, tight feature coupling.

**Alternative:** stable ID/minimal params; destination resolves state.

---

## 11. Permanent Monolith at Organizational Scale [D1/I]

**Symptoms:** every team/feature touches same module; dependency graph unenforced.

**Consequence:** ownership/build/test contention.

**Alternative:** coarse feature/capability modules with contracts when scale justifies it.

---

## 12. Micro-Modules for Aesthetics [S]

**Symptoms:** dozens/hundreds of tiny modules with no independent ownership/reuse/build value.

**Consequence:** dependency ceremony, navigation complexity, slow developer reasoning.

**Alternative:** module boundaries follow ownership/change/dependency needs.

---

## 13. App Architecture Copied Into a Library [D2/S]

**Symptoms:** reusable library exposes app-specific UI/state/navigation and hidden global lifecycle.

**Consequence:** difficult adoption/testing/versioning.

**Alternative:** stable facade, explicit lifecycle/task handles, caller-controlled configuration, deterministic cancellation/error behavior.

---

## 14. No Prefetch Discussion for Predictable Infinite Scroll [D1]

**Symptoms:** pagination works but every next page starts only after user reaches the end.

**Consequence:** visible loading gaps.

**Alternative:** bounded prefetch threshold tuned to network/data budget.

---

## 15. Abstraction Without Volatility [S]

**Symptoms:** interface/use-case/mapper for every class despite one trivial implementation and no testing/change need.

**Consequence:** indirection with no protection.

**Alternative:** abstract at volatility, ownership, or test-control boundaries.
