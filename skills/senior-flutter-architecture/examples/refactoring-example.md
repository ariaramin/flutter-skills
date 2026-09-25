# Example — Refactor Giant Flutter Screen Without Rewriting the App

## Starting point

`CheckoutScreenState` owns:
- text controllers;
- price calculations;
- promo validation;
- network submit;
- SharedPreferences draft;
- analytics;
- navigation;
- 600 lines of widgets.

## Goal

Reduce responsibility coupling while preserving the current state-management package and UI.

## Step 1 — Characterize

Add tests for:
- price calculation;
- promo error;
- submit success/failure;
- draft restoration.

## Step 2 — Extract repository/service boundary

Create:
```text
CheckoutApiService
CheckoutDraftService
CheckoutRepository
```

Do not change UI state package yet.

## Step 3 — Extract presentation owner

Move:
- load draft;
- input-derived checkout state;
- submit command;
- loading/error/success transitions.

Keep:
- `TextEditingController` if it is truly view-local, or synchronize it deliberately with presentation state.

## Step 4 — Extract domain policy only if earned

If price calculation/promo policy is reused/complex:
```text
CalculateCheckoutTotal
ValidatePromotion
```

If simple and used once, keep it in presentation owner/repository where responsibility is clear.

## Step 5 — Navigation effect

Submission success emits/returns a one-shot success effect.
View/router performs navigation.
Repository does not navigate.

## Step 6 — Remove duplicate state

Delete old screen booleans and cached totals once new owner is authoritative.

## Step 7 — Test

Unit:
- presentation owner;
- repository;
- calculation.

Widget:
- state rendering;
- submit event.

Integration:
- checkout happy path.

## Result

```text
CheckoutScreen (view-local controllers/layout)
  → CheckoutViewModel
    → CheckoutRepository
      → CheckoutApiService
      → CheckoutDraftService
```

The refactor improves architecture without forcing a new state-management library or full-app rewrite.
