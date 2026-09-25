# 03 Builder · p103

**Core idea:** Separate ordered construction steps from the final representation. A director can reuse the same step sequence with different builders, but is optional when the client can call steps directly.

**Apply when:** Construction has several meaningful stages, optional steps, or distinct output representations. Keep required invariants explicit and make it clear when the product is complete. Use a simple constructor or named arguments when the object is small and construction has no workflow.

**Book example:** The same sports-car assembly sequence is run with `CarBuilder` to produce a car and `CarManualBuilder` to produce its manual. The products do not need one common interface; the builders share the construction-step contract (pp109–115).

**Cost and alternative:** Builders and a director add classes. [Abstract Factory](ch02-abstract-factory.md) returns members of a product family immediately; Builder permits further steps before obtaining a product (pp120–121).
