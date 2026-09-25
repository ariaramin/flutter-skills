# Example — Refactoring a Giant Mobile View Model

## Starting point

`CheckoutViewModel` directly owns:
- UI form state;
- pricing calculations;
- REST calls;
- local draft persistence;
- analytics;
- payment retry loop;
- navigation.

## Goal

Reduce change coupling without a rewrite.

## Step 1 — Characterize behavior

Add tests around:
- price calculation;
- submission states;
- retry/failure UX;
- draft restoration.

## Step 2 — Draw current flow

```text
UI → GiantViewModel → HTTP/DB/Analytics/Navigation
```

Identify side-effect seams and policy logic.

## Step 3 — Extract data boundary first

Move HTTP + draft persistence policy behind `CheckoutRepository` (or equivalent cohesive data capability).

Do **not** move pricing rules merely because “repository is non-UI.”

## Step 4 — Extract domain policy only if earned

If pricing/eligibility rules are substantial/reused, move them into pure domain policy/use case. If they are tiny and feature-local, keep them near feature state rather than adding empty wrappers.

## Step 5 — Make submission a state machine

`editing → submitting → success`

Failures:
`submitting → retry_wait → submitting` or `terminal_failure`

For payment-like irreversible actions, do not blindly apply optimistic success.

## Step 6 — Separate navigation trigger

View model emits a destination/result event or updates navigation state; router owns actual navigation mechanics according to app conventions.

## Step 7 — Add DI at external seams

Inject repository, payment gateway, clock/request-ID generator, analytics if tests/change boundaries require them.

## Step 8 — Delete obsolete code

Do not leave old HTTP helpers and duplicate state “temporarily” forever.

## Final architecture

```text
CheckoutUI
  ↓
CheckoutStateHolder
  ├─ PricingPolicy / UseCase (only if justified)
  ├─ CheckoutRepository
  │    ├─ Remote API
  │    └─ Draft Store
  ├─ PaymentGateway
  └─ Navigation/Event boundary
```

## Why this matches the skill

It follows requirements/responsibility-first reasoning, repository/DI/layer seams supported by channel evidence, explicit async/failure state, and avoids cargo-cult full rewrites.
