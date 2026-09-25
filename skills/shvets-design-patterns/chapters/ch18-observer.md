# 18 Observer · p336

**Core idea:** A publisher maintains subscriptions and notifies interested observers when an event occurs; subscribers can join and leave at runtime.

**Apply when:** The set of listeners is unknown or changes during execution. Define event payload, subscription ownership, unsubscription, error behavior, and whether notification order matters. Keep publisher code independent of concrete listeners.

**Book example:** A store publishes product events to customers who opted into notifications, without storing product-specific customer logic (pp343–348).

**Cost and alternative:** Notification order is not guaranteed by the pattern, and leaked subscriptions can retain objects. One direct callback is enough for a fixed single listener. Mediator is for coordinating known peers; Observer is for dynamic subscription (pp349–351).
