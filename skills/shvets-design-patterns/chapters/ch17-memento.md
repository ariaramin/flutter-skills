# 17 Memento · p320

**Core idea:** Let an originator capture and restore its own state without exposing its private representation to the caretaker that stores snapshots.

**Apply when:** Undo, rollback, or transaction-like restore needs a prior state and direct field access would break encapsulation. Define snapshot scope, retention, and resource ownership. The caretaker tracks history but should not inspect or mutate snapshot internals.

**Book example:** A text editor produces snapshots before changes; a separate history object retains them and asks the editor to restore a prior state (pp328–332).

**Cost and alternative:** Frequent snapshots can consume substantial memory and become invalid if the originator or its resources disappear. Command may reverse simple operations without a full snapshot; Prototype can copy a straightforward state object (pp333–335).
