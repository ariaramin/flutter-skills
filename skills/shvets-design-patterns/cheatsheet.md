# Decision guide

Start with the concrete problem. A recognizable diagram alone does not identify intent (Bridge/State/Strategy, pp175, 367–380).

| If the pressure is… | First consider | Distinguish it from… |
|---|---|---|
| One product is chosen by a creator subclass | Factory Method | Abstract Factory creates a *family* of compatible products. |
| A whole product family must match one variant | Abstract Factory | A startup switch plus constructors may suffice if the family is small and fixed. |
| Construction is stepwise or yields several representations | Builder | A constructor or named arguments suffice for simple objects. |
| An existing API mismatches the client contract | Adapter | Facade simplifies a subsystem; it does not primarily translate one contract. |
| Two class dimensions multiply combinations | Bridge | Strategy varies one algorithm; Adapter fixes an existing mismatch. |
| One object and a nested group need the same operation | Composite | Decorator wraps one component to add behavior. |
| Optional behaviors stack around one component | Decorator | Proxy controls access or service lifecycle. Order can affect behavior. |
| Many similar objects duplicate large state | Flyweight | Measure memory first; split shared intrinsic from per-use extrinsic state. |
| A request may move through ordered handlers | Chain of Responsibility | Observer broadcasts to subscribers; Command packages one operation. |
| An operation needs history, queuing, or undo | Command | Strategy chooses *how* to perform an algorithm. |
| Object behavior follows its own changing state | State | Strategy choice is typically set by the client. |
| Multiple algorithms can be interchanged | Strategy | A function may suffice in languages with first-class functions (p378). |
| Algorithm order stays fixed but subclasses vary steps | Template Method | Strategy composes and can switch at runtime. |
| New operations target stable element types | Visitor | If element types change often, all visitors need edits. |

## Stop signs

- One implementation, no demonstrated variation: keep direct code.
- Simple collection: use the language's iterator (p303).
- Two short, rarely changing algorithm branches: a conditional can be clearer than Strategy classes (p378).
- Small, stable state machine: a switch may be clearer than State classes (p365).
- No memory evidence: skip Flyweight (p231).
- Global access as the only reason: do not assume Singleton; it hides dependencies and complicates tests (pp143–144).

When applying a pattern, name the added contract, ownership/lifecycle, failure behavior, and one focused verification of the changed boundary.
