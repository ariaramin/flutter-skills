# 20 Strategy · p368

**Core idea:** Put interchangeable algorithms behind one contract and let a context delegate to the selected implementation.

**Apply when:** Several real algorithms solve the same operation and selection or implementation changes independently from the context. Keep selection at the boundary that knows the user's configuration or need; test each algorithm through the shared contract.

**Book example:** A navigator chooses driving, walking, or public-transport routing without rewriting its route-request flow for each algorithm (pp371–375).

**Cost and alternative:** Clients must choose correctly and extra classes add weight. The book explicitly recommends functions as a lighter implementation in languages that support them; a small fixed conditional can also be clearer (pp377–380). State varies behavior based on the context's own evolving state.
