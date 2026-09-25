# Senior Mobile Architecture Mental Model

A senior mobile engineer reasons across **five interacting systems**, not just screens and APIs.

## 1. Product system

What user outcome matters? What is the failure tolerance? What still works without network? What is the perceived-latency target?

## 2. State system

Where does each piece of state live? Who can change it? What is durable? What is pending? What is authoritative? How does it recover after process death?

## 3. Data/synchronization system

How do local and remote records converge? What is cached? What is paginated? What is pushed in realtime? How are conflicts/deduplication/retries handled?

## 4. Dependency/ownership system

Which component owns each responsibility? Which direction do dependencies point? Where can implementations vary? What boundary lets teams work independently?

## 5. Runtime/resource system

What happens under backgrounding, cancellation, poor networks, memory pressure, low battery, large media, and high latency?

---

# The decision loop

For each major feature:

1. **Constraint** — what product/runtime condition drives the design?
2. **Invariant** — what must remain true?
3. **Owner** — which component is responsible?
4. **State** — what states/transitions exist?
5. **Contract** — what data/API interface crosses the boundary?
6. **Failure** — how does it break and recover?
7. **Tradeoff** — what simpler/stronger alternative exists?
8. **Proof** — what test/metric/observable signal validates it?

If an architecture choice cannot answer these, it is not finished.

---

# Senior/staff signals reflected in accessible material [D1/C]

- leads the problem rather than waiting for interviewer prompts;
- organizes functional/nonfunctional/out-of-scope constraints;
- explains data model and API before diving into details;
- identifies mobile-specific deep dives such as offline/sync;
- offers alternatives rather than one “correct” technology;
- can go from high-level diagram to detailed read/write/failure flow;
- addresses scalability through concrete client mechanisms (pagination/cache/prefetch/data efficiency), not slogans;
- communicates tradeoffs clearly;
- notices what is missing from a working design and suggests the next improvement.

---

# Architecture quality heuristic [I/S]

A good architecture minimizes **uncontrolled change propagation**.

When one thing changes—API shape, database, UI framework, auth provider, feature policy—ask how many unrelated components must change. Boundaries are useful when they contain that blast radius without creating more ceremony than they save.
