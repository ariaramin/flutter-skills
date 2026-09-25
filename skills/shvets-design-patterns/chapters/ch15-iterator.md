# 15 Iterator · p289

**Core idea:** Put traversal state and rules behind an iterator so clients can visit elements without knowing the collection's representation.

**Apply when:** Traversal is nontrivial, several traversal modes exist, or callers must not reach into collection internals. Decide how mutation during iteration behaves, and whether traversal is lazy or snapshot-based.

**Book example:** Social-network iterators traverse friends or coworkers through one profile-iterator interface while hiding network-specific retrieval (pp295–301).

**Cost and alternative:** Dedicated iterator classes can be needless for a list. Use the language's `Iterable`/iterator support first, then implement custom traversal only for behavior it cannot express. Separate iterators can preserve independent cursor positions (pp301–303).
