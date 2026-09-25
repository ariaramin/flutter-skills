# 14 Command · p268

**Core idea:** Package an operation and its parameters as a value/object so it can be invoked later, queued, logged, sent, or undone.

**Apply when:** The operation needs an independent lifetime from its caller. Define `execute` and, if required, undo data or a paired reversal. Keep command history and failure handling at the invoker boundary.

**Book example:** Text editor actions become commands. The application records executed commands and uses that history for undo, while menu or button code need not know each action's receiver (pp279–284).

**Cost and alternative:** More objects and history storage. A direct function call or callback is enough for an immediate, stateless action. Memento can capture state before commands when reversal cannot be computed from the command alone (pp285–288, 333–335).
