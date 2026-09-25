# 09 Decorator · p191

**Core idea:** Wrap a component in other components with the same usable contract, each adding behavior before or after delegation. Layers can be composed per object at runtime.

**Apply when:** Optional features combine in different orders or inheritance would require a subclass for every combination. Keep each wrapper focused and make order observable in tests where it matters.

**Book example:** A data source is wrapped with compression and encryption decorators. Data passes through each wrapper on read and write; the underlying source remains unaware (pp198–202).

**Cost and alternative:** Wrapper stacks can be hard to inspect, remove, or reorder safely. One local wrapper or function can be enough. [Adapter](ch06-adapter.md) changes the interface; [Proxy](ch12-proxy.md) mainly controls access or lifecycle rather than composing optional behavior (pp204–208).
