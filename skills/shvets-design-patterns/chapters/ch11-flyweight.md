# 11 Flyweight · p219

**Core idea:** Store duplicated, stable intrinsic state once and pass varying extrinsic state per use. Reuse flyweights keyed by intrinsic state.

**Apply when:** A very large number of similar objects demonstrably consumes too much memory and most of their state repeats. Measure first; identify immutable shared data and the per-use context; test that sharing never leaks mutable state between logical objects.

**Book example:** A forest renderer shares tree-type data such as name, color, and texture while each tree keeps its position and other per-instance context (pp224–230).

**Cost and alternative:** Context passing and lookup add CPU and code complexity. If memory is acceptable, ordinary objects are clearer. Unlike Singleton, Flyweight permits many shared instances with different intrinsic states (pp231–232).
