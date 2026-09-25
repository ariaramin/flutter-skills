# 04 Prototype · p122

**Core idea:** Ask an existing object to clone itself through a shared clone contract, so clients need not know its concrete class or repeat complex setup.

**Apply when:** The concrete type arrives through an abstraction, or many objects start from a few configurations. Define ownership of mutable children and external resources before cloning; test that changing a clone does not unexpectedly change the original.

**Book example:** The chapter clones preconfigured shapes so copies retain type-specific state without a client-side type switch (pp128–131). A registry can hold configured prototypes and hand out copies.

**Cost and alternative:** Graphs with circular references or resource handles need careful copy rules. A normal copy constructor is simpler when the concrete type is known. Factory Method varies creation by creator subclass rather than copying a configured object (pp134–135).
