# 06 Adapter · p149

**Core idea:** Translate an existing object's interface into the interface a client expects. Object Adapter wraps the adaptee; the translation belongs at that boundary.

**Apply when:** A legacy or third-party API has useful behavior but incompatible method names, data shape, or calling conventions. Define the client's smallest contract, wrap the existing service, translate arguments and results, and preserve its error behavior deliberately.

**Book example:** A square peg is wrapped to expose the round-peg radius expected by a round-hole client. The adapter computes the radius that encloses the square peg (pp153–157).

**Cost and alternative:** One wrapper adds indirection. If you own and can safely change the original API, changing it may be simpler. [Facade](ch10-facade.md) simplifies a subsystem; [Decorator](ch09-decorator.md) adds behavior while retaining a component contract (pp159–161).
