# Flutter Refactoring & Migration Workflow

## Rule: preserve behavior first

Architecture improvements that change behavior unintentionally are regressions.

## Step 1 — Characterize

Collect:
- unit/widget/integration tests;
- manual flow notes;
- logs/network behavior;
- data persistence behavior;
- route/deep-link behavior;
- lifecycle behavior.

Add characterization tests around risky behavior.

## Step 2 — Draw current flow

Example:
```text
Screen State
  → Dio directly
  → JSON model
  → setState
  → SharedPreferences
```

Identify:
- source of truth;
- hidden dependencies;
- side effects;
- lifecycle coupling.

## Step 3 — Choose one seam

Good first seams:
- API service;
- repository;
- presentation owner;
- native capability interface.

Avoid introducing every desired layer at once.

## Step 4 — Move a vertical path

Migrate one complete operation:
```text
load profile
```
before:
```text
all networking in app
```

## Step 5 — Prevent dual authority

During migration, old and new state systems can diverge.
Define one owner and adapters for remaining consumers.

## Step 6 — Preserve route/public contracts

If migration touches routes/package APIs, add compatibility adapters where necessary and remove them after consumers move.

## Step 7 — Migrate state-management library only with a plan

Define:
- why current library blocks goals;
- target scope;
- interoperability period;
- how side effects map;
- test migration;
- completion criteria.

Do not run two global stores indefinitely.

## Step 8 — Native/plugin migration

Wrap existing channel/native code behind a Dart contract first.
Then move implementation into plugin/Pigeon/FFI if reuse/type safety warrants it.

## Step 9 — Delete

Remove:
- old providers/BLoCs/controllers;
- duplicate caches;
- pass-through use-cases;
- obsolete locators;
- compatibility adapters.

A migration that only adds new architecture is incomplete.

## Step 10 — Validate

- analyzer;
- tests;
- deep links;
- lifecycle;
- offline/retry;
- performance;
- app size/build impact if packages changed.

## Refactoring decision record

Document:
- problem;
- current impact;
- chosen seam;
- migration slices;
- risks;
- rollback strategy;
- done criteria.
