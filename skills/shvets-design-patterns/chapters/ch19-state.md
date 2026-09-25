# 19 State · p352

**Core idea:** Move behavior associated with each internal state into state objects. The context delegates to its current state, and transitions change the object handling later requests.

**Apply when:** State-dependent conditionals are large, repeated, or change often. Define legal transitions, ownership of shared context data, and how invalid events behave. Make transitions visible in focused tests.

**Book example:** An audio player reacts differently to play, lock, next, and previous actions depending on its current state; state classes hold those behaviors and can trigger transitions (pp359–365).

**Cost and alternative:** A small stable state machine may be clearer as a switch. Strategy objects are usually independent algorithm choices set by a client; State objects can know transitions and replace the current state (pp365–367).
