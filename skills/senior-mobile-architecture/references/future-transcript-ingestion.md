# Future Transcript Ingestion Protocol

Use this file when upgrading D2 videos to D1.

For each video:

1. Save title, URL, playlist/series, publication date.
2. Read the complete transcript/captions.
3. Record chapter timestamps actually present; never invent.
4. Extract concepts, definitions, decisions, alternatives, constraints, mistakes, edge cases.
5. Extract code semantics: responsibility, data flow, control flow, state, dependencies, lifecycle, failure modes.
6. Separate **creator statement**, **interview candidate statement**, and **creator feedback**.
7. Add traceability rows to `source-traceability.md`.
8. Update `video-knowledge-index.md` evidence D2 → D1.
9. Update principles only if the new source strengthens/changes them.
10. Re-run contradiction/outdated-practice review.

## Contradiction log template

| Concept | Earlier source | Later source | Difference | Resolution/status |
|---|---|---|---|---|

## Heuristic template

> When **condition**, prefer **choice** because **reason**; reconsider when **switch condition**.

Only promote a heuristic into `SKILL.md` after repeated/direct evidence or label it as source-specific.
