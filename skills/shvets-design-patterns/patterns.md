# Pattern map

This is a navigation index. Each chapter gives a use condition, implementation shape, example, and cost.

| Pattern | Implement when | Main cost |
|---|---|---|
| [Factory Method](chapters/ch01-factory-method.md) | Creator subclasses must choose a product | More creator subclasses |
| [Abstract Factory](chapters/ch02-abstract-factory.md) | Compatible product families change together | Multiple interfaces and factories |
| [Builder](chapters/ch03-builder.md) | Complex construction has reusable steps | Extra builders; director only if useful |
| [Prototype](chapters/ch04-prototype.md) | Configured objects must clone without concrete-type knowledge | Copy semantics and cycles |
| [Singleton](chapters/ch05-singleton.md) | One instance is an enforced invariant | Global coupling, testing, concurrency |
| [Adapter](chapters/ch06-adapter.md) | Contracts mismatch | One translation layer |
| [Bridge](chapters/ch07-bridge.md) | Two dimensions vary independently | Two parallel abstractions |
| [Composite](chapters/ch08-composite.md) | Leaves and groups are used uniformly | Common interface may overgeneralize |
| [Decorator](chapters/ch09-decorator.md) | Optional behavior layers combine | Wrapper order and stack complexity |
| [Facade](chapters/ch10-facade.md) | Complex subsystem needs a small entry point | Facade can grow into a god object |
| [Flyweight](chapters/ch11-flyweight.md) | Repeated state dominates memory | Context management, CPU, complexity |
| [Proxy](chapters/ch12-proxy.md) | Access or lifecycle requires interception | Extra indirection and latency |
| [Chain of Responsibility](chapters/ch13-chain-of-responsibility.md) | Ordered handlers may decline a request | Unhandled requests |
| [Command](chapters/ch14-command.md) | Operations need storage, delay, or undo | More operation objects |
| [Iterator](chapters/ch15-iterator.md) | Traversal logic hides a complex collection | Overkill for simple collections |
| [Mediator](chapters/ch16-mediator.md) | Direct peer dependencies are tangled | Central mediator can become huge |
| [Memento](chapters/ch17-memento.md) | Restore requires private state snapshots | Snapshot memory and lifecycle |
| [Observer](chapters/ch18-observer.md) | Subscribers change at runtime | Ordering and subscription lifecycle |
| [State](chapters/ch19-state.md) | State-dependent behavior branches grow | Class count for simple machines |
| [Strategy](chapters/ch20-strategy.md) | Algorithms swap independently | Selection burden and extra objects |
| [Template Method](chapters/ch21-template-method.md) | A fixed algorithm has overrideable steps | Rigid inheritance hierarchy |
| [Visitor](chapters/ch22-visitor.md) | Operations change more often than element types | New element type changes every visitor |
