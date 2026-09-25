# Senior Mobile Architecture — Andrey Tech Grounded Skill

A reusable AI-agent skill distilled from the **accessible** technical material of the Andrey Tech YouTube channel, supported by Andrey's current Mobile System Design course curriculum and mind-map as instructor-authored companion sources.

## What this package is

This package is designed to make an AI coding agent behave like a senior/staff mobile engineer: clarify requirements, model constraints, design data flow and state ownership, reason about APIs/storage/offline behavior, evaluate tradeoffs, and only then implement.

It is **not** a claim that every one of the channel's 47 indexed videos was fully watched/transcribed. YouTube pages were intermittently throttled and only one long-form video exposed a complete timestamped transcript through an accessible transcript mirror during this research pass. All other sources are graded by evidence quality.

## Evidence labels

- **D1 — Direct transcript:** complete or substantial timestamped transcript content inspected.
- **D2 — Direct metadata/chapters:** creator/video title, description, chapters, or timestamp snippets inspected.
- **C — Instructor companion:** Andrey's current course page or mind-map page.
- **I — Cross-source inference:** principle inferred from repeated structure/examples; never presented as a direct quote or universal creator doctrine.
- **S — Supplemental:** general/current mobile engineering knowledge added to make the skill operational; explicitly not attributed to the channel.

## Package map

- `SKILL.md` — operational AI-agent behavior.
- `references/curriculum-map.md` — reconstructed learning path.
- `references/video-knowledge-index.md` — video-by-video accessible evidence.
- `references/architecture-principles.md` — reusable principles + evidence grading.
- `references/architecture-patterns.md` — catalog of recurring patterns.
- `references/decision-frameworks.md` — decision trees for recurring design choices.
- `references/state-management.md` — state ownership, offline mutations, navigation state.
- `references/data-layer.md` — repositories, storage, cache, sync, pagination.
- `references/networking-api-design.md` — REST, GraphQL, realtime, API contracts.
- `references/concurrency.md` — cancellation/background/retry concerns; mostly supplemental where transcripts were unavailable.
- `references/testing.md` — testability guidance; channel scope + supplemental operational detail.
- `references/performance.md` — latency, caching, prefetch, data efficiency.
- `references/security-observability.md` — scope explicitly listed by Andrey's mind-map; details are labeled by evidence level.
- `references/anti-patterns.md` — failure modes and refactoring strategies.
- `references/senior-mobile-mental-model.md` — staff-level reasoning model.
- `references/source-traceability.md` — source registry and timestamped evidence.
- `references/coverage-report.md` — what was fully/partially analyzed.
- `references/gap-report.md` — inaccessible/unverified material.
- `references/supplemental-current-practices.md` — clearly separated current context.
- `examples/architecture-review.md` — example review workflow.
- `examples/feature-design.md` — example feature/system design.
- `examples/refactoring-example.md` — safe migration example.

## Core fidelity rule

When using this skill, never say “Andrey teaches X” unless the relevant reference marks X as D1, D2, or C. For I/S material, describe it as inference or supplemental engineering guidance.
