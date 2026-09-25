# 05 Singleton · p136

**Core idea:** Restrict a class to one instance and expose a global access point. These are two separate responsibilities, which is why the book also flags a Single Responsibility Principle conflict (pp142–144).

**Apply when:** The entire process truly must enforce one instance, and ordinary application ownership cannot enforce it. Specify initialization and concurrency behavior; consider how tests reset or replace the dependency.

**Book example:** The chapter uses a shared database access object to illustrate the single-instance premise (pp137–141).

**Cost and alternative:** Global access hides dependencies, complicates tests, and needs synchronization under concurrency. Prefer a shared instance created in startup wiring and passed to consumers when that satisfies the actual requirement. Multiple instances in separate processes or isolates also limit what a process-local Singleton can guarantee.
