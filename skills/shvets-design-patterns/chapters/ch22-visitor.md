# 22 Visitor · p393

**Core idea:** Keep an operation outside a set of element classes, with a visit method for each concrete element. Each element's `accept` method dispatches to the matching visit method.

**Apply when:** A stable element hierarchy needs new operations often. Define the element/visitor pairing and ensure every element type is handled. A visitor can accumulate results while walking a Composite tree.

**Book example:** Shapes accept an XML-export visitor so export logic can vary by shape without putting export methods into every core shape class (pp401–405).

**Cost and alternative:** Every new element type requires updating visitors, and visitors may need access to private details. A direct method is simpler when the operation belongs naturally to the element or the element types change frequently (pp405–408).
