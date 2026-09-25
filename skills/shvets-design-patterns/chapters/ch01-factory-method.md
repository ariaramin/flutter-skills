# 01 Factory Method · p71

**Core idea:** Put product-dependent behavior in a creator; let creator subclasses select the concrete product through one overridable creation method. The creator's main responsibility is still its business logic, not being a generic factory (pp75–76).

**Apply when:** A framework or existing creator hierarchy needs an extension point for one product, and clients can use a common product contract. Replace concrete construction at that boundary; keep product use in the base creator. A creation method may return a reused object, not necessarily a new one.

**Book example:** A base dialog renders a button through `createButton`; Windows and web dialog subclasses supply platform-specific buttons while shared rendering code uses the button interface (pp77–80).

**Cost and alternative:** Each product variant can require another creator subclass. A direct constructor or one startup selection is simpler while the product choice is fixed. Use [Abstract Factory](ch02-abstract-factory.md) when several related products must change together.
