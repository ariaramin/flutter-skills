# 10 Facade · p209

**Core idea:** Offer clients a small, task-oriented entry point to a complex subsystem. The subsystem remains usable directly for clients that need more control.

**Apply when:** Multiple callers repeat the same orchestration across library classes, or a subsystem boundary needs a stable simple API. Put the common sequence behind a facade; keep domain rules with their owners.

**Book example:** A video converter facade coordinates codecs, buffers, and other conversion parts so an application calls one conversion operation (pp213–217).

**Cost and alternative:** A facade can absorb too much and become a god object. Do not add one merely to rename a single method. [Adapter](ch06-adapter.md) reconciles one interface mismatch; Mediator changes how peers collaborate internally (pp217–218, 316–319).
