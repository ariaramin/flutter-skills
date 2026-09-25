# Design principles before patterns

Shvets treats patterns as reusable design ideas, not ready-made code. The principles in pp30–67 help decide whether a pattern's extra structure pays for itself.

| Principle | Decision check | Book example |
|---|---|---|
| Encapsulate What Varies (p35) | Isolate the part likely to change; begin with a method if a class is unnecessary. | Move tax-rate calculation out of order-total logic (pp36–38). |
| Program to an Interface, not an Implementation (p39) | Can the client state only the behavior it needs? | A collaborator accepts an abstract interface instead of a concrete type. The book notes this can increase complexity before it earns value (p40). |
| Favor Composition Over Inheritance (p44) | Does variation combine independently, or does inheritance create a subclass for every combination? | Delegate behavior to composed objects; subclass only for a true subtype or extension point. |

## SOLID checks

- **Single Responsibility Principle** (p49): if two independent reasons force edits to one class, separate those responsibilities. Do not split a cohesive class merely because it has several methods.
- **Open/Closed Principle** (p51): when new variants recur, aim to add one variant without editing stable client logic. The book uses shipping-cost strategies (pp52–53).
- **Liskov Substitution Principle** (p54): a subtype must honor the base contract. Accept no narrower inputs, promise no weaker outputs, preserve invariants and expected failure behavior. A read-only document that throws from an inherited `save` breaks substitution (pp58–60).
- **Interface Segregation Principle** (p61): do not force a client to implement methods it cannot use. Split a broad cloud-provider interface by capabilities; stop splitting once contracts are specific enough (pp61–63).
- **Dependency Inversion Principle** (p64): high-level business logic specifies the operations it needs; low-level details implement that contract. The book prefers a business-level `openReport` operation over making policy code orchestrate primitive file calls (pp64–67).

## Practical order

Inspect the actual change, isolate its cause, add the narrowest seam, then evaluate a named pattern. Retain a direct dependency when there is one stable implementation and no costly change path. The book explicitly acknowledges that extraction and interfaces can make code more complicated before they bring a benefit (p40).
