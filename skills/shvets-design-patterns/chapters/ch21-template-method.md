# 21 Template Method · p381

**Core idea:** A superclass fixes an algorithm's order and allows subclasses to override selected steps without replacing the overall sequence.

**Apply when:** Several subclasses truly share the same stable workflow and vary only defined steps. Mark required steps and optional hooks; preserve superclass contracts and make steps cohesive. Do not force subclasses to override steps they cannot meaningfully implement.

**Book example:** A game AI keeps the same turn sequence while monster and human factions vary resource collection, building, and unit behavior (pp386–389).

**Cost and alternative:** Inheritance freezes the skeleton, and many hooks become hard to maintain or violate substitution. Strategy uses composition to replace behavior per object at runtime. A Factory Method can be one step in a larger template (pp390–392).
