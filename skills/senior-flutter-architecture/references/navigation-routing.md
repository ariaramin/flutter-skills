# Navigation, Routing & Deep Links

## Choose based on navigation complexity [F]

Current Flutter guidance:
- simple apps can use `Navigator`;
- apps with complex deep linking/navigation state should use `Router` or a routing package;
- named routes are not recommended for most applications.

Do not migrate an existing stable router merely because another package is fashionable.

## Route arguments

Prefer stable, minimal arguments:
- entity IDs;
- immutable small configuration;
- route intent.

Avoid passing large mutable domain objects as the authoritative state when they can become stale.

Pattern:
```text
route receives ID
→ presentation owner loads/observes current entity
→ repository remains source of truth
```

## Deep-link flow

Model:
```text
OS/web URL
→ parser/router
→ auth/session gate
→ route state
→ feature receives stable arguments
→ feature loads authoritative state
```

Define behavior for:
- logged-out deep links;
- invalid/deleted entities;
- expired invite/action links;
- nested navigation;
- back behavior;
- web URL synchronization if web is supported.

## Navigation ownership

Simple navigation wiring may stay in a view. [F]

For complex flows, consider:
- router state derived from app/session state;
- navigation coordinator;
- typed route abstraction;
- effect/event from presentation owner consumed by UI.

Do not make repositories navigate.

## One-shot navigation effects

Avoid storing `shouldNavigate = true` as durable state without consumption semantics.

Use a mechanism that prevents repeated navigation on rebuild/resubscription.

## Nested navigation

Use intentionally for:
- tabs with independent stacks;
- shells;
- flows/wizards;
- embedded modules.

Define:
- which stack owns back;
- whether state persists when switching branches;
- deep-link mapping into nested routes.

## State restoration

Navigation restoration and data restoration are separate concerns.
A restored route should still resolve current authoritative data through the feature/data layer.

## Route guards

Guards may depend on:
- authentication;
- onboarding state;
- feature entitlements;
- permissions.

Keep the source-of-truth outside the router; the router observes/queries it.

## Testing

Test:
- route parsing;
- deep links;
- redirects/guards;
- back behavior;
- invalid route args;
- nested stack behavior;
- auth state transition while deep linked.
