---
name: flutter-supabase-engineering
description: Design, implement, review, secure, test, debug, migrate, and optimize production Supabase integrations in Flutter and Dart applications. Use when a task involves supabase_flutter, Supabase Auth or session restoration, OAuth/PKCE or deep links, PostgREST queries and mutations, PostgreSQL Row Level Security, RPC/database functions, pagination or query performance, Realtime/Postgres Changes/Broadcast/Presence, Storage buckets/uploads/downloads/signed URLs, Edge Functions, caching or offline behavior, retries/idempotency, local Supabase testing, mock_supabase_http_client, or Supabase architecture and production readiness. Do not use for generic PostgreSQL work with no Supabase client or policy concerns, backend-only Supabase integrations, or non-Supabase authentication.
---

# Flutter Supabase Engineering

Treat Flutter as an untrusted client. Keep the database, Row Level Security,
constraints, and server-side policy authoritative.

## Start with evidence

Before changing code:

1. Inspect `pubspec.yaml`, `pubspec.lock`, Flutter/Dart constraints, and target
   platforms.
2. Identify the locked `supabase_flutter`, `supabase`, `postgrest`,
   `realtime_client`, `storage_client`, `functions_client`, and test-package
   versions.
3. Find every Supabase initialization and client construction; identify the
   single intended client owner and lifetime.
4. Inspect Auth bootstrap, persistence, deep-link handling, listeners, sign-out,
   and session-dependent startup behavior.
5. Inspect database migrations, grants, RLS policies, indexes, functions,
   constraints, and generated/typed models relevant to the task.
6. Inventory query count, selected columns, pagination, N+1 patterns, mutation
   idempotency, Realtime channels, Storage transfer paths, Edge Functions,
   retry layers, caching, and offline requirements.
7. Separate current repository behavior from version-sensitive guidance.

The bundled guide was validated on 2026-08-11 against
`supabase_flutter 2.17.1`, `supabase 2.16.0`, `storage_client 2.6.0`,
`functions_client 2.7.1`, and `mock_supabase_http_client 0.0.3+2`. Use the
installed packages and their changelogs as the source of truth when versions
differ.

## Preserve these invariants

- Initialize `supabase_flutter` once before `runApp` and reuse its client.
- Do not create a new client, query, Future, stream, Auth listener, or Realtime
  channel from `build()`.
- Treat the project URL and client publishable/anonymous key as client
  configuration, not authorization.
- Never ship a service-role key, secret key, database password, JWT signing
  secret, third-party secret, or privileged credential in Flutter.
- Enable and test RLS for client-accessible data; do not treat hidden UI or a
  client-supplied user/tenant ID as authorization.
- Keep authorization claims in trusted server-controlled data, not editable
  user metadata.
- Keep ordinary user-owned CRUD behind direct PostgREST plus RLS when that is
  the simplest secure boundary.
- Use database functions/RPC for atomic multi-row or transactional SQL work.
- Use Edge Functions for server-only secrets, external integrations, or custom
  privileged orchestration—not as a generic proxy for every query.
- Select only needed columns, filter on the server, paginate large results,
  avoid N+1 requests, and index real query and RLS predicates.
- Use `.single()` only when exactly one row is required; use `.maybeSingle()`
  when absence is valid.
- Make retried mutations idempotent at the database or protocol boundary; do
  not infer safety from a client boolean.
- Keep Realtime subscriptions narrow, persist stream instances, remove unused
  channels, and never treat Realtime as durable history.
- Reconcile initial query data and Realtime changes deliberately.
- Use private buckets for private data and enforce access with Storage RLS;
  object paths are organization, not authorization.
- Choose standard versus resumable upload based on object size and network
  reliability; avoid whole-file memory loads for large objects.
- Do not stack retries across client, repository, and state layers.
- Do not assume Supabase is offline-first; add an explicit local source of
  truth, sync, conflict, and deletion model only when the product requires it.
- Apply schema and policy migrations through the database workflow, never from
  the Flutter app.
- Never rely on mocks to prove RLS, grants, constraints, triggers, Auth,
  Realtime, or real PostgreSQL behavior.

## Choose the smallest secure boundary

Use this decision order:

1. Use direct PostgREST plus RLS for ordinary user-owned CRUD.
2. Use RPC for atomic database work or reusable server-side SQL logic.
3. Use an Edge Function when server-only credentials, external APIs, or custom
   privileged orchestration are required.
4. Use Postgres Changes for moderate live database views.
5. Use Broadcast for high-scale fan-out or application-defined messages.
6. Use Presence for ephemeral online state.
7. Use private Storage plus signed URLs for temporary external access.
8. Add offline-first architecture only for an explicit offline editing
   requirement.

Prefer the first boundary that fully satisfies security and correctness.

## Route to the production guide

Read only the relevant sections of `references/production-guide.md`. Locate
sections before reading them with:

```sh
rg -n '^#{1,3} (SECTION|RELATED SECTION)$' references/production-guide.md
```

Use these search headings:

| Task | Search headings |
|---|---|
| Select packages, configure secrets, initialize, or manage client lifetime | `Package Selection|Platform Capability Matrix|Configuration and Secrets|Initialization|Session Restoration Is Asynchronous|Client Lifetime|Do Not Recreate Clients` |
| Implement Auth, sessions, sign-out, OAuth, PKCE, deep links, or recovery | `Authentication|Auth Session Lifecycle|Access and Refresh Tokens|getSession|onAuthStateChange|Sign-Out|Auth Persistence|OAuth and PKCE|OAuth Deep-Link Flow|Password Recovery|Native Provider Sign-In` |
| Design authorization, RLS, grants, tenant isolation, or policy performance | `Authorization and RLS|RLS Baseline|Grants and RLS|auth.uid|Index RLS Columns|RLS Policy Performance|Multi-Tenant RLS|User Metadata and Authorization|security definer` |
| Implement queries, typed models, pagination, or query optimization | `Database Queries|Select Required Columns|Current Filter APIs|Typed Models|Repository Example|single.*maybeSingle|Pagination|Keyset Pagination|Avoid N\+1|Query Performance Workflow|Database Index Awareness` |
| Implement mutations, constraints, idempotency, RPC, or transactions | `Mutations|Insert|Update|Upsert|Delete|Database Constraints|Idempotency|RPC and Database Functions|Transactions|Database Function Security` |
| Choose direct queries, RPC, or Edge Functions | `Edge Functions vs RPC vs Direct Queries|Decision Framework` |
| Add or optimize Realtime, Broadcast, Presence, or streams | `Realtime Architecture|Postgres Changes|Realtime Multiple Filters|Realtime Scaling|Realtime Performance Rules|Remove Channels|Flutter Lifecycle and Realtime|Realtime Is Not Durable History|stream|Realtime \+ Local State Reconciliation|Broadcast|Presence` |
| Implement Storage, uploads, downloads, buckets, signed URLs, or CDN behavior | `Storage|Public vs Private Buckets|Storage RLS|Storage Ownership|Storage Upload|Web Uploads|Standard vs Resumable Uploads|Large Upload Memory|Storage Retry|Signed URLs|Public URLs|CDN and cacheControl|Downloads` |
| Invoke, cancel, retry, locate, or debug Edge Functions | `Edge Functions|Current Function Cancellation|Function Error Types|Function Retry Strategy|Function Region|Web Edge Functions|Function Performance` |
| Add caching, offline support, retry, or error mapping | `Offline Behavior|Caching Strategy|Retry Strategy|PostgREST Automatic Retry|Error Handling|Error Mapping` |
| Review architecture, Flutter performance, concurrency, security, or reliability | `Architecture|Repository Pattern|Dependency Injection|State Management|Flutter Widget Performance|Concurrency and Race Conditions|Security Rules|Performance Rules|Reliability Rules` |
| Test, debug, migrate, review, or prepare production | `Testing|mock_supabase_http_client|Mock Limitations|Local Supabase|RLS Security Tests|Database Migration Rules|Edge Function Testing|Observability and Debugging|Debugging Guide|Anti-Patterns|Implementation Checklist|Code Review Checklist|Production Readiness Checklist|Version-Sensitive Areas` |

For a full security or production-readiness audit, read the entire guide after
completing the repository inventory.

## Implement at the authoritative boundary

- Fix authorization in RLS, grants, trusted claims, or server-side code rather
  than duplicating checks in every Flutter caller.
- Fix query shape and indexes before applying Dart micro-optimizations.
- Fix atomicity with a database constraint, transaction, or function rather
  than client sequencing.
- Reuse the existing repository, client, Auth bootstrap, cache, and subscription
  ownership patterns when they are sound.
- Do not add an interface, wrapper, Edge Function, or cache solely for future
  flexibility.
- Keep transport and Supabase error types inside the data boundary; map them to
  stable application failures where the existing architecture expects it.

## Validate the result

Run the narrowest relevant Dart/Flutter checks, then validate authoritative
behavior against a local or isolated Supabase stack. Cover changed paths from
this matrix:

- authenticated, anonymous, expired, refreshed, and signed-out sessions;
- allowed and denied RLS cases for each relevant role and tenant;
- database constraints, triggers, functions, transactions, and indexes;
- empty, single-row, multi-row, pagination, and concurrent mutation cases;
- Realtime subscribe, reconnect, reconcile, and channel disposal behavior;
- private/public Storage access and representative transfer sizes;
- Edge Function success, typed failures, timeout, cancellation, and idempotent
  retry behavior;
- offline/cache transitions when changed;
- release-like deep-link and OAuth behavior on each affected platform.

Never test destructive behavior against production. Report any authorization,
migration, platform, or local-stack path that was not executed.
