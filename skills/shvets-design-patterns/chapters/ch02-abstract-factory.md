# 02 Abstract Factory · p87

**Core idea:** A factory contract creates every member of a related product family. Swapping the concrete factory changes the whole family while clients use abstract products.

**Apply when:** Products must belong to one compatible variant and client code should never mix them accidentally. Define the product contracts, then one factory method per product type and one concrete factory per variant. Choose a factory once at the composition boundary and pass it where products are built (pp98–100).

**Book example:** A cross-platform UI creates matching buttons and checkboxes for the selected platform. A concrete platform factory supplies both; client code does not name platform-specific widgets (pp93–97).

**Cost and alternative:** The product-family matrix creates interfaces and classes. Factory Method handles one variable product; Builder handles a multi-step product rather than a compatible family. A few constructors chosen once may be enough for a small fixed matrix.
