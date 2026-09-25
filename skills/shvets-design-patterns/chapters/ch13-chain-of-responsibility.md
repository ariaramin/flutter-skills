# 13 Chain of Responsibility · p250

**Core idea:** Pass a request through ordered handlers. Each handler may process it or pass it onward; the sender does not choose a receiver directly.

**Apply when:** Request types, capable handlers, or their order may vary. Define the handler contract and forwarding rule, then link handlers in the required order. Decide what an unhandled request means and test the full chain, not only individual handlers.

**Book example:** A GUI component displays contextual help or passes the request up through parent components until one can respond (pp259–264).

**Cost and alternative:** A request can silently reach the end unhandled, and ordering matters. A fixed sequence of checks may be simpler when handlers never change. Observer broadcasts to subscribers; Command stores one operation; neither models a handler declining and passing a request (pp265–267).
