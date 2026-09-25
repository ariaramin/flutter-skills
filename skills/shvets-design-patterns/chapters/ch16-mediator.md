# 16 Mediator · p304

**Core idea:** Move coordination among peers into one mediator so each component communicates through it rather than knowing the others.

**Apply when:** A component depends on many peers and those links impede reuse or change. Define the events or operations the mediator handles; keep components ignorant of peer classes. Split the mediator by cohesive workflows if it starts owning unrelated business rules.

**Book example:** A dialog coordinates text fields, buttons, and a checkbox. Components notify the dialog of changes; the dialog decides which other controls to enable or update (pp311–315).

**Cost and alternative:** The mediator can become a god object. A direct callback is simpler for one or two links. Facade simplifies an outside client's access while subsystem objects may still talk directly; Mediator changes the internal collaboration graph (pp316–319).
