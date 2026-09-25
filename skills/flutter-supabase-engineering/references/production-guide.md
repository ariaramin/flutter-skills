# Supabase for Flutter

Validated: 2026-08-11

Current stable package baseline at validation time:

```text
supabase_flutter:             2.17.1
supabase:                     2.16.0
storage_client:               2.6.0
functions_client:             2.7.1
mock_supabase_http_client:    0.0.3+2
```

Current package targets include:

- Android
- iOS
- Linux
- macOS
- Web
- Windows

Always inspect the project's actual `pubspec.lock` before applying version-sensitive guidance. Fresh package changelogs can move ahead of generated API-reference pages.

---

## Purpose

This skill governs production use of the Supabase Dart/Flutter ecosystem in Flutter applications.

Use it to design, implement, review, secure, test, debug, migrate, or optimize:

- Supabase initialization
- Auth
- persisted sessions
- OAuth and PKCE
- magic links and recovery
- database/PostgREST access
- Row Level Security
- PostgreSQL functions/RPC
- query performance
- pagination
- Realtime
- Broadcast
- Presence
- Storage
- signed URLs
- uploads/downloads
- Edge Functions
- retries
- caching/offline behavior
- typed data models
- integration testing
- local Supabase development
- production security
- application architecture

This skill treats the database and server-side policy layer as authoritative.

Flutter is an untrusted client.

---

# When to Use This Skill

Trigger this skill when asked to:

- add Supabase to Flutter
- configure `supabase_flutter`
- migrate old Supabase Flutter code
- implement sign-up/sign-in/sign-out
- implement OAuth
- implement PKCE
- configure deep links
- implement magic links
- implement password recovery
- diagnose session restoration
- diagnose token refresh
- use `onAuthStateChange`
- query PostgreSQL through Supabase
- optimize a slow Supabase query
- design RLS policies
- review Supabase security
- implement pagination
- remove N+1 queries
- implement inserts/updates/upserts/deletes
- implement an RPC
- implement atomic database work
- subscribe to Realtime
- use Broadcast
- use Presence
- optimize Realtime subscriptions
- implement Storage uploads/downloads
- use private/public buckets
- generate signed URLs
- invoke an Edge Function
- choose between PostgREST, RPC, and Edge Functions
- implement offline caching
- test Supabase repositories
- use `mock_supabase_http_client`
- test RLS
- use the Supabase CLI
- review production readiness

---

# Package Selection

## Dependency map

Conceptually:

```text
supabase_flutter
      |
      v
supabase
      |
      +--> Auth client
      +--> postgrest
      +--> realtime_client
      +--> storage_client
      +--> functions_client
```

`supabase_flutter` adds Flutter-specific concerns such as:

```text
session persistence
deep-link handling
app lifecycle integration
Flutter OAuth launching
Flutter Auth helpers
```

---

## `supabase_flutter`

### Use when

Building a Flutter application.

This SHOULD be the normal Flutter entry point.

It provides:

- `Supabase.initialize()`
- `Supabase.instance.client`
- Flutter Auth persistence
- OAuth/deep-link integration
- Flutter lifecycle behavior
- access to the complete Supabase client stack

Install:

```shell
flutter pub add supabase_flutter
```

---

## `supabase`

The lower-level Dart Supabase client.

Use directly for:

- non-Flutter Dart applications
- server-side Dart
- command-line applications
- deliberately isolated tests
- custom lower-level environments

A normal Flutter application SHOULD NOT create a parallel standalone `SupabaseClient` when `supabase_flutter` already owns one.

---

## `storage_client`

Lower-level Storage client.

Normal Flutter code should prefer:

```dart
Supabase.instance.client.storage
```

Use `storage_client` directly only when:

- building a lower-level Dart library
- no full Supabase client exists
- custom Storage-only infrastructure is deliberate

Do not instantiate independent Storage clients throughout a Flutter app.

---

## `functions_client`

Lower-level Edge Functions client.

Normal Flutter code should prefer:

```dart
Supabase.instance.client.functions
```

Use directly only for:

- lower-level Dart libraries
- isolated tooling
- unusual custom HTTP/auth integration

---

## `mock_supabase_http_client`

Testing utility.

It implements an in-memory simulation of Supabase's HTTP/Data API requests.

It can help test:

- repository query construction
- CRUD mapping
- filters
- ordering
- ranges
- single/maybe-single behavior
- mock RPC behavior

It does **not** prove:

- RLS
- PostgreSQL constraints
- triggers
- Auth behavior
- Realtime behavior
- Storage policy behavior
- Edge Function behavior
- actual PostgREST error semantics
- query planning/index performance

Use a real local Supabase stack for those.

---

# Platform Capability Matrix

| Capability | Android | iOS | macOS | Linux | Windows | Web |
|---|---:|---:|---:|---:|---:|---:|
| `supabase_flutter` | Yes | Yes | Yes | Yes | Yes | Yes |
| Auth persistence | Yes | Yes | Yes | Yes | Yes | Yes |
| Email/password Auth | Yes | Yes | Yes | Yes | Yes | Yes |
| PKCE | Yes | Yes | Yes | Yes | Yes | Yes |
| Browser OAuth | Yes | Yes | Yes | Verify callback integration | Yes | Yes |
| Native provider SDK Auth | Provider/platform-specific | Provider/platform-specific | Provider-specific | Provider-specific | Provider-specific | Browser/provider-specific |
| Deep-link callback handling | Yes | Yes | Yes | Supported by current package line; test desktop integration | Yes | Browser navigation |
| PostgREST/Data API | Yes | Yes | Yes | Yes | Yes | Yes |
| Realtime WebSocket | Yes | Yes | Yes | Yes | Yes | Yes |
| Storage | Yes | Yes | Yes | Yes | Yes | Yes |
| Native `File` upload | Yes | Yes | Yes | Yes | Yes | No; use bytes/browser APIs |
| Edge Functions | Yes | Yes | Yes | Yes | Yes | Yes, subject to CORS |
| SharedPreferences session persistence | Yes | Yes | Yes | Yes | Yes | Browser-backed |
| Secure-storage guarantee by default | No universal guarantee | No universal guarantee | No universal guarantee | No universal guarantee | No universal guarantee | Browser threat model |
| `mock_supabase_http_client` | Test use | Test use | Test use | Test use | Test use | Test use |

Provider OAuth, desktop callback, app-link/universal-link, and browser behavior must still be validated for the actual provider and target platform.

---

# Core Principles

1. **Use `supabase_flutter` as the normal Flutter entry point.**

2. **Create one app-scoped Supabase client.**

3. **Never ship a secret/service-role key to a Flutter client.**

4. **RLS and database privileges are the authorization boundary.**

5. **Client-side checks are user experience, not security.**

6. **Treat every Flutter-provided identifier and payload as untrusted.**

7. **Use direct PostgREST CRUD when RLS can safely authorize the operation.**

8. **Use PostgreSQL functions/RPC for data-local atomic or SQL-heavy work.**

9. **Use Edge Functions for secrets, external APIs, webhooks, or privileged server orchestration.**

10. **Do not put ordinary CRUD behind Edge Functions without a reason.**

11. **Keep Supabase calls out of `build()`.**

12. **Select only data that the caller needs.**

13. **Paginate unbounded collections.**

14. **Eliminate N+1 client request patterns.**

15. **Index columns involved in filters, sorting, joins, and RLS.**

16. **Optimize RLS as part of query performance.**

17. **Realtime augments authoritative state; it is not durable event history.**

18. **Subscribe only to Realtime data the feature actually needs.**

19. **Do not create one Realtime channel per list item.**

20. **Dispose unused channels/subscriptions.**

21. **Persist `.stream()` instances rather than reconstructing them during widget rebuilds.**

22. **Private Storage content belongs in private buckets with RLS.**

23. **A Storage path chosen by a client is not authorization.**

24. **Use temporary signed URLs as bearer-like access links.**

25. **Match the upload mechanism to object size and network conditions.**

26. **Do not invent a Dart resumable-upload API that the package does not expose.**

27. **Do not blindly retry non-idempotent mutations.**

28. **Use database uniqueness/constraints for idempotency and consistency where possible.**

29. **Supabase is not automatically an offline-first local database.**

30. **Use a real local Supabase environment to test RLS and database behavior.**

---

# Configuration and Secrets

## Client-safe values

A Flutter application can contain:

```text
Supabase project URL
Supabase publishable key
```

These are designed for client applications.

Example compile-time configuration:

```dart
const String supabaseUrl =
    String.fromEnvironment('SUPABASE_URL');

const String supabasePublishableKey =
    String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY');
```

Using `--dart-define` is useful configuration management.

It does **not** turn a bundled value into a secret.

Mobile binaries and Web bundles are inspectable.

---

# Server-only values

The Flutter client MUST NEVER contain:

```text
Supabase secret/service-role key
database password
JWT signing secret
third-party private API key
payment-provider secret
SMTP password
webhook signing secret
private encryption key
```

Place privileged credentials in:

- Edge Function secrets
- a trusted backend
- CI/CD secret storage

---

# Initialization

Current production initialization:

```dart
import 'package:flutter/widgets.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const String supabaseUrl =
    String.fromEnvironment('SUPABASE_URL');

const String supabasePublishableKey =
    String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY');

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  if (supabaseUrl.isEmpty ||
      supabasePublishableKey.isEmpty) {
    throw StateError(
      'Missing Supabase client configuration.',
    );
  }

  await Supabase.initialize(
    url: supabaseUrl,
    publishableKey: supabasePublishableKey,
  );

  runApp(const App());
}

class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    return const Directionality(
      textDirection: TextDirection.ltr,
      child: Center(
        child: Text('App'),
      ),
    );
  }
}
```

The application's real root widget naturally replaces the demonstration `App`.

---

# Initialization Rules

## Before `runApp`

Normally:

```text
WidgetsFlutterBinding.ensureInitialized()
Supabase.initialize()
runApp()
```

Do not also perform:

- profile fetches
- dashboard queries
- Storage listings
- Edge Function calls
- topic/channel subscriptions
- large cache refreshes

before the first frame unless the product genuinely cannot render without them.

---

# Session Restoration Is Asynchronous

Do not assume:

```text
await Supabase.initialize()
```

means:

```text
a persisted authenticated session has fully refreshed and been resolved
```

If navigation depends on restored Auth, represent a bootstrap state such as:

```text
unknown
anonymous
authenticated
```

and resolve it from the Auth lifecycle.

Avoid flashing:

```text
login -> home
```

or:

```text
home -> login
```

while restoration is still settling.

---

# Client Lifetime

Use one:

```dart
final SupabaseClient supabase =
    Supabase.instance.client;
```

for the application lifetime.

Provide that reference through:

- constructor injection
- provider
- service locator
- app-scope dependency container

according to existing architecture.

---

# Do Not Recreate Clients

Bad:

```dart
Widget build(BuildContext context) {
  final SupabaseClient client = SupabaseClient(
    supabaseUrl,
    supabasePublishableKey,
  );

  return const SizedBox();
}
```

Why:

- duplicate Auth state
- duplicate Realtime clients
- duplicate sockets
- redundant HTTP infrastructure
- harder cleanup
- inconsistent token propagation

Preferred:

```dart
final SupabaseClient client =
    Supabase.instance.client;
```

owned at app scope.

---

# Authentication

The current Auth client supports product flows including:

- email/password
- OTP/magic link
- phone Auth
- anonymous Auth
- OAuth
- native ID-token sign-in
- SSO
- MFA
- identity linking
- password recovery
- user updates
- passkey flows through current Flutter integration

Use only the flows the product actually needs.

---

# Email and Password

```dart
Future<AuthResponse> signIn(
  SupabaseClient client, {
  required String email,
  required String password,
}) {
  return client.auth.signInWithPassword(
    email: email,
    password: password,
  );
}
```

Sign-up:

```dart
Future<AuthResponse> signUp(
  SupabaseClient client, {
  required String email,
  required String password,
}) {
  return client.auth.signUp(
    email: email,
    password: password,
  );
}
```

Do not infer authenticated application state solely from the method returning.

Let the centralized Auth/session state own navigation.

---

# Auth Session Lifecycle

The application should model:

```text
SDK/local session state
        |
        v
Auth coordinator
        |
        v
application auth state
        |
        v
router/state management
```

Avoid:

```text
every screen
 -> read session
 -> refresh session
 -> decide navigation
```

---

# Access and Refresh Tokens

Access tokens expire.

Refresh tokens allow the SDK to obtain new sessions and are subject to Supabase Auth rotation/session rules.

The SDK manages automatic token refresh under normal client operation.

Do not call:

```dart
refreshSession()
```

before every request.

That adds:

- extra network round trips
- contention/races
- unnecessary refresh-token rotation
- startup latency

Normal client requests use the current Auth state.

---

# `getSession()` and `currentSession`

Use:

```dart
client.auth.currentSession
```

for a synchronous view of currently known local session state.

The current client line also has an asynchronous session getter that can refresh on demand.

Do not use either as a client-side authorization authority.

The backend validates the JWT and applies RLS.

---

# `onAuthStateChange`

Register one application-lifetime listener.

Current events include:

```text
initialSession
signedIn
signedOut
passwordRecovery
tokenRefreshed
userUpdated
userDeleted
mfaChallengeVerified
```

Always provide an error handler.

Example coordinator:

```dart
import 'dart:async';

import 'package:supabase_flutter/supabase_flutter.dart';

final class AuthSessionCoordinator {
  AuthSessionCoordinator(this._client);

  final SupabaseClient _client;

  final StreamController<Session?> _sessions =
      StreamController<Session?>.broadcast();

  StreamSubscription<AuthState>? _subscription;

  Stream<Session?> get sessions => _sessions.stream;

  Session? get currentSession =>
      _client.auth.currentSession;

  void start() {
    if (_subscription != null) {
      return;
    }

    _subscription =
        _client.auth.onAuthStateChange.listen(
      (AuthState state) {
        _sessions.add(state.session);
      },
      onError: (
        Object error,
        StackTrace stackTrace,
      ) {
        _sessions.addError(
          error,
          stackTrace,
        );
      },
    );
  }

  Future<void> signOut() async {
    await _client.auth.signOut();
  }

  Future<void> dispose() async {
    await _subscription?.cancel();
    _subscription = null;
    await _sessions.close();
  }
}
```

In a real architecture, map raw `Session?` to domain Auth state if that improves testability.

---

# Auth Listener Rules

## MUST

- own one global subscription
- provide `onError`
- cancel it if its owning coordinator is disposable

## SHOULD NOT

- fetch the whole user profile on every `tokenRefreshed`
- create one listener per page
- perform navigation from several independent listeners
- trigger sign-in again from `signedIn`
- call refresh recursively from token-refresh events

Use Auth events to update application session state.

Let router/state logic react once.

---

# Sign-Out

Normal sign-out:

```dart
await client.auth.signOut();
```

After sign-out:

- clear user-specific in-memory state
- clear user-specific persistent cache where required
- leave private Realtime channels
- cancel user-bound feature subscriptions
- remove optimistic mutations belonging to the previous session
- let centralized Auth routing move to the unauthenticated UI

Do not leave User A's cached data visible if User B subsequently signs in.

---

# Remote Revocation

Do not assume every issued access token becomes unusable on every device the instant another device signs out.

JWT/session enforcement is partly tied to:

- access-token expiry
- refresh
- server session policy
- specific sensitive server checks

For highly sensitive actions, enforce freshness/security server-side instead of trusting stale client state.

---

# Auth Persistence

`supabase_flutter` persists Auth state by default.

Current implementation uses SharedPreferences-backed storage unless customized.

This is a convenience/default persistence mechanism.

It is **not** a universal guarantee that refresh tokens are stored in:

```text
hardware-backed keychain
Android Keystore
Secure Enclave
```

---

# Custom Auth Storage

Use a custom `LocalStorage` implementation when the application's threat model requires a different storage mechanism.

Potential reasons:

- regulated data
- enterprise threat requirements
- stronger native at-rest controls
- application-wide secure-storage policy

Do not add a secure-storage dependency reflexively to every application.

Assess:

- rooted/jailbroken device assumptions
- Web parity
- backup behavior
- desktop persistence
- migration from previous storage

---

# Web Auth Persistence

Web persistence inherits browser security properties.

Important risks include:

- XSS
- malicious browser extensions
- shared devices
- browser storage deletion
- private/incognito mode
- multiple tabs

Current Supabase Flutter supports Auth event propagation between browser tabs.

Do not assume Web token storage behaves like iOS Keychain.

---

# OAuth and PKCE

PKCE is the modern Supabase Flutter flow.

Typical browser OAuth:

```dart
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

Future<void> signInWithGitHub(
  SupabaseClient client,
) async {
  await client.auth.signInWithOAuth(
    OAuthProvider.github,
    redirectTo: kIsWeb
        ? null
        : 'io.example.app://login-callback',
  );
}
```

The exact scheme/domain MUST match:

- the application platform configuration
- Supabase Auth redirect allow-list
- the provider configuration where relevant

---

# OAuth Deep-Link Flow

Conceptually:

```text
Flutter app
   |
   v
OAuth provider/browser
   |
   v
Supabase Auth callback
   |
   v
configured application redirect
   |
   v
supabase_flutter detects Auth callback
   |
   v
PKCE code exchange/session update
   |
   v
onAuthStateChange
   |
   v
application Auth state/router
```

Do not route protected application content solely because a raw URL was opened.

Wait for the Auth state to establish the authenticated session.

---

# OAuth Rules

- Configure every redirect URL explicitly.
- Use stable production application links/universal links where appropriate.
- Test killed-app callback handling.
- Test warm-app callbacks.
- Test callback error query parameters.
- Test duplicate callback handling.
- Test expired/used PKCE codes.
- Test provider cancellation.
- Test Web separately from native.

Do not add arbitrary fixed delays to "wait for Supabase OAuth."

Model actual Auth events.

---

# `getOAuthSignInUrl`

Current 2.17-era Flutter Auth can obtain an OAuth sign-in URL without automatically launching it.

Use that when the application deliberately owns browser/window launching.

Revalidate the exact API in the installed version before using it.

---

# Password Recovery

Typical architecture:

```text
request reset email
       |
       v
user opens recovery link
       |
       v
Supabase callback processed
       |
       v
passwordRecovery Auth event
       |
       v
application opens reset UI
       |
       v
updateUser(new password)
```

Do not infer recovery status from an arbitrary route query parameter alone.

Use the authenticated/recovery state supplied by Auth.

---

# Native Provider Sign-In

For providers with native SDKs, current Flutter support commonly uses:

```dart
client.auth.signInWithIdToken(...)
```

after the native provider library returns a valid OIDC ID token.

Provider configuration differs by:

- Android
- iOS
- macOS
- Web
- desktop

Do not invent provider setup from another platform.

---

# Authorization and RLS

This is the primary security boundary.

## Mandatory rule

For data exposed through the Data API:

```text
Flutter UI check != authorization
client filter != authorization
hidden button != authorization
route guard != authorization
```

Authorization belongs in:

- PostgreSQL grants
- Row Level Security
- database constraints
- trusted server logic

---

# RLS Baseline

Example table:

```sql
create table public.todos (
  id bigint generated by default as identity primary key,
  user_id uuid not null
    references auth.users(id)
    on delete cascade,
  title text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.todos
  enable row level security;

grant select, insert, update, delete
on public.todos
to authenticated;

create policy "todos_select_own"
on public.todos
for select
to authenticated
using (
  (select auth.uid()) = user_id
);

create policy "todos_insert_own"
on public.todos
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
);

create policy "todos_update_own"
on public.todos
for update
to authenticated
using (
  (select auth.uid()) = user_id
)
with check (
  (select auth.uid()) = user_id
);

create policy "todos_delete_own"
on public.todos
for delete
to authenticated
using (
  (select auth.uid()) = user_id
);

create index todos_user_id_created_at_idx
on public.todos (
  user_id,
  created_at desc
);
```

The exact policies must reflect the product's security model.

Do not blindly copy ownership policies to multi-tenant applications.

---

# Grants and RLS

Both matter.

Conceptually:

```text
Postgres role privilege
       AND
RLS policy
```

The Data API role needs permission to perform the operation, and the row must satisfy the applicable policy.

Do not grant broad table access and assume RLS configuration mistakes cannot matter.

Use least privilege.

---

# `auth.uid()`

For ordinary ownership policies:

```sql
(select auth.uid()) = user_id
```

is a strong default shape.

Supabase currently recommends wrapping stable Auth helper calls in:

```sql
select
```

when they do not depend on each row.

This allows PostgreSQL to execute them as an init plan rather than reevaluating them per row.

---

# Explicit Client Filters Still Matter

Even with:

```sql
using (
  (select auth.uid()) = user_id
)
```

prefer:

```dart
client
    .from('todos')
    .select('id,title,completed,created_at')
    .eq('user_id', userId);
```

when the application already knows the user ID.

Why:

- RLS remains security
- explicit query predicate helps PostgreSQL planning
- fewer candidate rows
- clearer application intent

Do not remove RLS because the client filters correctly.

---

# Index RLS Columns

If a policy contains:

```text
user_id
organization_id
team_id
membership role
```

inspect whether those columns have appropriate indexes.

RLS executes as part of every affected query.

An unindexed policy can make an otherwise simple Flutter query slow.

---

# RLS Policy Performance

Prefer:

- indexed policy columns
- `TO authenticated`/appropriate role
- stable Auth helpers wrapped with `select`
- simple ownership predicates
- precomputed/bounded membership sets where appropriate
- minimal expensive joins

Investigate with PostgreSQL query plans.

Do not guess that "Supabase networking is slow" before checking RLS.

---

# Multi-Tenant RLS

Typical model:

```text
organizations
memberships
resources.organization_id
```

The client can send:

```text
organization_id = X
```

only as a query value.

The server must independently prove that:

```text
auth.uid() belongs to organization X
```

through RLS or trusted server logic.

Never authorize:

```dart
if (selectedOrganization.id == row.organizationId) {
  // trusted
}
```

on the client.

---

# User Metadata and Authorization

Be careful using JWT/user metadata in policies.

User-editable profile metadata must not become an authorization source.

Use trusted app metadata/custom claims or database membership state as appropriate.

Also remember that JWT claims can remain stale until a token refresh.

---

# `security definer`

Default to:

```text
security invoker
```

for database functions.

If `security definer` is genuinely required:

- put sensitive helpers outside exposed API schemas where possible
- set an explicit safe `search_path`
- fully qualify referenced objects
- restrict `EXECUTE`
- audit RLS-bypass implications
- test as `anon` and `authenticated`

A security-definer function can bypass protections under its creator's privileges.

Treat it as privileged server code.

---

# Database Queries

Use the current v2 query builder.

---

# Select Required Columns

Good:

```dart
final List<Map<String, dynamic>> rows =
    await client
        .from('todos')
        .select(
          'id,title,completed,created_at',
        )
        .eq('user_id', userId)
        .order(
          'created_at',
          ascending: false,
        )
        .range(0, 49);
```

Avoid by default:

```dart
await client.from('todos').select('*');
```

when the screen only needs four fields.

Selecting fewer columns reduces:

- database tuple/output work
- JSON encoding
- network transfer
- Dart JSON decoding
- model allocation
- memory usage

---

# Current Filter APIs

Prefer typed operators:

```text
eq
neq
gt
gte
lt
lte
inFilter
isFilter
contains
containedBy
match
```

Use `.or()` and raw PostgREST filtering only when the typed API cannot express the query conveniently.

Example:

```dart
final rows = await client
    .from('instruments')
    .select('id,name')
    .or(
      'id.eq.2,name.eq.cello',
    );
```

Raw filter syntax is easier to get wrong.

Keep it centralized in repositories.

---

# Do Not Generate v1 Syntax

Do not generate obsolete code such as:

```dart
await client
    .from('todos')
    .select()
    .execute();
```

or old filter names such as:

```text
in_
is_
```

when current APIs are:

```text
inFilter
isFilter
```

---

# Typed Models

For large applications, do not propagate:

```dart
Map<String, dynamic>
```

through every application layer.

Example:

```dart
final class Todo {
  const Todo({
    required this.id,
    required this.title,
    required this.completed,
    required this.createdAt,
  });

  final int id;
  final String title;
  final bool completed;
  final DateTime createdAt;

  factory Todo.fromJson(
    Map<String, dynamic> json,
  ) {
    return Todo(
      id: json['id'] as int,
      title: json['title'] as String,
      completed: json['completed'] as bool,
      createdAt: DateTime.parse(
        json['created_at'] as String,
      ),
    );
  }
}
```

Small prototypes MAY use maps directly when the schema surface is tiny.

---

# Repository Example

```dart
import 'package:supabase_flutter/supabase_flutter.dart';

final class Todo {
  const Todo({
    required this.id,
    required this.title,
    required this.completed,
    required this.createdAt,
  });

  final int id;
  final String title;
  final bool completed;
  final DateTime createdAt;

  factory Todo.fromJson(
    Map<String, dynamic> json,
  ) {
    return Todo(
      id: json['id'] as int,
      title: json['title'] as String,
      completed: json['completed'] as bool,
      createdAt: DateTime.parse(
        json['created_at'] as String,
      ),
    );
  }
}

final class TodoRepository {
  TodoRepository(this._client);

  final SupabaseClient _client;

  Future<List<Todo>> fetchPage({
    required String userId,
    required int from,
    required int to,
  }) async {
    final List<Map<String, dynamic>> rows =
        await _client
            .from('todos')
            .select(
              'id,title,completed,created_at',
            )
            .eq('user_id', userId)
            .order(
              'created_at',
              ascending: false,
            )
            .range(from, to);

    return rows
        .map(Todo.fromJson)
        .toList(growable: false);
  }

  Future<Todo?> findById(
    int id,
  ) async {
    final Map<String, dynamic>? row =
        await _client
            .from('todos')
            .select(
              'id,title,completed,created_at',
            )
            .eq('id', id)
            .maybeSingle();

    return row == null
        ? null
        : Todo.fromJson(row);
  }

  Future<Todo> create({
    required String userId,
    required String title,
  }) async {
    final Map<String, dynamic> row =
        await _client
            .from('todos')
            .insert(
              <String, Object?>{
                'user_id': userId,
                'title': title,
              },
            )
            .select(
              'id,title,completed,created_at',
            )
            .single();

    return Todo.fromJson(row);
  }

  Future<void> setCompleted({
    required int id,
    required bool completed,
  }) async {
    await _client
        .from('todos')
        .update(
          <String, Object?>{
            'completed': completed,
          },
        )
        .eq('id', id);
  }

  Future<void> delete(
    int id,
  ) async {
    await _client
        .from('todos')
        .delete()
        .eq('id', id);
  }
}
```

Notice:

- one client
- no query from a widget
- narrow column selection
- mutation does not request return rows when not needed
- `maybeSingle()` for a legitimately absent row

---

# `.single()` vs `.maybeSingle()`

Use:

```dart
.single()
```

when:

```text
exactly one row MUST exist
```

It is an error when:

- zero rows
- more than one row

Use:

```dart
.maybeSingle()
```

when:

```text
zero or one row is valid
```

It returns `null` when no row exists and errors when several rows violate the expectation.

Do not use `.single()` for optional profile/config rows and then treat "zero rows" as an exceptional backend incident.

---

# Pagination

For bounded/simple datasets:

```dart
final rows = await client
    .from('messages')
    .select('id,created_at,body')
    .eq('room_id', roomId)
    .order(
      'created_at',
      ascending: false,
    )
    .range(0, 49);
```

`range()` uses inclusive endpoints.

Always use deterministic ordering.

---

# Keyset Pagination

For large/changing feeds, offset/range pagination can:

- scan/skips increasing offsets
- produce duplicates/missing items when rows are inserted between pages

Prefer keyset/cursor logic when scale requires it.

Example concept:

```text
ORDER BY created_at DESC, id DESC

next page:
created_at/id < last seen tuple
```

Use an indexed stable ordering with a unique tie-breaker.

The Dart client does not need a special "cursor pagination object"; express it using normal filters/order consistent with the schema.

---

# Avoid N+1

Bad:

```text
fetch 100 posts
for each post:
    fetch author
```

This creates:

```text
101 network requests
```

Prefer:

- PostgREST embedded relationships
- database view
- RPC
- denormalized read model where justified

Example:

```dart
final rows = await client
    .from('posts')
    .select(
      '''
      id,
      title,
      author:profiles (
        id,
        display_name
      )
      ''',
    )
    .range(0, 49);
```

One larger query is often cheaper than dozens of network round trips.

Measure payload size before embedding enormous child collections.

---

# Query Performance Workflow

For a slow screen:

```text
1. Count duplicate requests
2. Inspect query count
3. Inspect selected columns
4. Inspect row count
5. Inspect nested payload size
6. Verify server-side filters
7. Verify pagination
8. Check N+1
9. Check database indexes
10. Check RLS policy shape
11. Inspect EXPLAIN/query diagnostics
12. Profile Flutter JSON/model/render work
```

Do not begin by moving JSON decoding into an isolate unless the payload is actually large enough to justify it.

---

# Database Index Awareness

Common index candidates:

```text
foreign keys used in joins
ownership/user_id
organization_id
status filters
created_at ordering
compound filter + order columns
RLS membership columns
```

Example:

```sql
create index messages_room_created_idx
on public.messages (
  room_id,
  created_at desc
);
```

Do not add an index for every column.

Indexes add:

- disk/storage
- insert/update cost
- maintenance

Use the actual query plan.

---

# Mutations

## Insert without returned row

```dart
await client
    .from('todos')
    .insert(
      <String, Object?>{
        'user_id': userId,
        'title': title,
      },
    );
```

Do not append `.select()` if the application does not use the returned representation.

---

# Insert and Return

```dart
final Map<String, dynamic> row =
    await client
        .from('todos')
        .insert(
          <String, Object?>{
            'user_id': userId,
            'title': title,
          },
        )
        .select(
          'id,title,completed,created_at',
        )
        .single();
```

Use when:

- server generated ID needed immediately
- trigger/default values matter
- optimistic UI needs authoritative row

---

# Update

Always bound an update:

```dart
await client
    .from('todos')
    .update(
      <String, Object?>{
        'completed': true,
      },
    )
    .eq('id', todoId);
```

Do not accidentally execute an unbounded update.

RLS remains server authorization.

---

# Upsert

Current semantics use primary/unique keys.

Example:

```dart
await client
    .from('profiles')
    .upsert(
      <String, Object?>{
        'id': userId,
        'display_name': displayName,
      },
      onConflict: 'id',
    );
```

An upsert's idempotency depends on the uniqueness model.

Do not assume:

```text
upsert == always safe retry
```

if other side effects/triggers are non-idempotent.

---

# Delete

```dart
await client
    .from('todos')
    .delete()
    .eq('id', todoId);
```

Deletion is also subject to RLS.

In Supabase/PostgREST, row visibility policies can affect which rows can be deleted.

Test delete policies explicitly.

---

# Database Constraints

Put invariant enforcement in PostgreSQL.

Examples:

```text
NOT NULL
UNIQUE
FOREIGN KEY
CHECK
PRIMARY KEY
EXCLUDE constraint where appropriate
```

Flutter validation improves UX.

It does not prevent:

- races
- malicious clients
- another client version
- server integrations

from violating a rule.

---

# Idempotency

Client flags such as:

```dart
bool submitted = true;
```

can improve UI behavior.

They are not a concurrency guarantee.

For critical operations prefer:

- unique constraints
- stable business IDs
- idempotency table/key
- atomic database function
- server-side guard

Example:

```sql
create unique index payments_provider_event_key
on public.payments(provider_event_id);
```

---

# RPC and Database Functions

Invoke:

```dart
final Object? result =
    await client.rpc(
  'calculate_order_total',
  params: <String, Object?>{
    'order_id': orderId,
  },
);
```

Use RPC when:

- several related SQL steps belong together
- operation should be atomic
- complex query is much cheaper near the data
- bulk processing avoids many round trips
- reusable database logic belongs in PostgreSQL

---

# Transactions

Do not invent:

```dart
client.transaction(...)
```

for arbitrary multi-statement SQL.

The normal Supabase Dart client does not provide a generic PostgreSQL transaction object across several Data API calls.

For atomic work, use a PostgreSQL function.

Example conceptual flow:

```text
Flutter
  |
  | one rpc()
  v
Postgres function
  |
  +-- mutation A
  +-- mutation B
  +-- validation
  +-- rollback on failure
```

---

# Database Function Security

Default to:

```text
security invoker
```

unless privileged execution is explicitly required.

For `security definer`:

```text
MUST set safe search_path
MUST fully qualify objects
MUST restrict EXECUTE
MUST audit bypass-RLS behavior
```

Do not expose a privileged function simply because "the client needs access."

Design a narrowly scoped capability.

---

# Edge Functions vs RPC vs Direct Queries

| Need | Preferred |
|---|---|
| Ordinary CRUD | Direct PostgREST |
| RLS-safe filtered read | Direct PostgREST |
| Simple insert/update/delete | Direct PostgREST |
| Embedded relational read | PostgREST |
| Atomic multi-table DB operation | PostgreSQL function / RPC |
| SQL-heavy computation | RPC |
| Bulk data-local operation | RPC |
| Third-party API secret | Edge Function |
| Payment-provider secret | Edge Function |
| Webhook endpoint | Edge Function |
| Custom server HTTP response | Edge Function |
| Privileged orchestration | Edge Function |
| External API + DB transaction | Edge Function orchestrating a narrowly scoped RPC where atomic DB work is needed |

Do not use Edge Functions as a generic proxy around every table.

That adds:

```text
Flutter -> Function -> Data API/Postgres
```

instead of:

```text
Flutter -> Data API/Postgres
```

and adds another:

- network hop
- compute invocation
- serialization boundary
- cold-start possibility
- error surface

---

# Realtime Architecture

Supabase Realtime has three distinct concepts.

## Postgres Changes

Use for:

- modest subscriber counts
- quick database-change subscriptions
- filtered row change notifications

## Broadcast

Use for:

- application messages
- fan-out
- high-frequency ephemeral events
- larger-scale database change fan-out
- cursor/activity-style messages

## Presence

Use for:

- online members
- shared presence state
- small bounded user state

Do not use Presence for high-frequency cursor coordinates when Broadcast is a better fit.

---

# Postgres Changes

Current example:

```dart
final RealtimeChannel channel =
    client
        .channel(
          'room:$roomId:messages',
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'messages',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'room_id',
            value: roomId,
          ),
          callback: (
            PostgresChangePayload payload,
          ) {
            // Reconcile by primary key.
          },
        )
        .subscribe();
```

Keep the `channel` reference.

Remove it when the feature no longer needs it.

---

# Realtime Multiple Filters

Current Supabase client versions support richer Postgres Changes filtering, including multiple filters and selected columns.

Example pattern:

```dart
client
    .channel('active:europe')
    .onPostgresChanges(
      event: PostgresChangeEvent.update,
      schema: 'public',
      table: 'countries',
      filters: <PostgresChangeFilter>[
        PostgresChangeFilter(
          type: PostgresChangeFilterType.gte,
          column: 'population',
          value: 1000000,
        ),
        PostgresChangeFilter(
          type: PostgresChangeFilterType.eq,
          column: 'continent',
          value: 'Europe',
        ),
      ],
      select: <String>[
        'id',
        'name',
        'population',
      ],
      callback: (payload) {
        // Handle bounded payload.
      },
    )
    .subscribe();
```

Revalidate this surface if the project's `supabase` dependency predates the 2.14–2.16 feature line.

---

# Realtime Scaling

Postgres Changes has backend cost proportional to subscribers because each event must be authorized for subscribers.

Supabase currently documents that:

- changes are processed serially to preserve order
- per-subscriber authorization limits scaling
- around thousands of subscribers to the same change stream should prompt consideration of Broadcast

Treat the currently documented ~3,000-subscriber figure as a present-day product guideline, not a permanent protocol constant.

---

# Realtime Performance Rules

## MUST NOT

- subscribe to an entire hot table if one room/user subset is sufficient
- create a channel for every list card
- subscribe from `build()`
- create duplicate equivalent subscriptions
- keep user-private channels after logout
- use Presence for high-rate event streaming

## SHOULD

- filter at the Realtime server
- select only event columns needed where supported
- share app-scope channels when multiple widgets consume the same feed
- remove channels when feature scope ends
- requery after reconnect if completeness matters
- reconcile changes by primary key

---

# Remove Channels

Use:

```dart
await client.removeChannel(channel);
```

when the channel is no longer needed.

For an entire session transition where all channels are obsolete, the client also exposes channel cleanup APIs.

Do not depend only on delayed server cleanup for abandoned channels.

---

# Flutter Lifecycle and Realtime

`supabase_flutter` participates in application lifecycle handling for Realtime.

Do not write every screen as:

```text
onResume -> connect realtime
onPause -> disconnect realtime
```

without understanding the global client behavior.

Feature code should own:

- which channel it needs
- when that logical subscription is needed

while the app-scoped Supabase client manages the underlying connection lifecycle.

---

# Realtime Is Not Durable History

Bad assumption:

```text
Realtime emitted every update
therefore local state is complete
```

Potential interruptions:

- app suspended
- network lost
- socket disconnected
- browser tab frozen
- token refresh/rejoin
- process terminated

For important state:

```text
initial authoritative query
        |
        v
live updates
        |
disconnect/resume
        |
        v
authoritative reconciliation query
```

---

# `.stream()`

`stream()` combines:

```text
initial PostgREST query
+
Realtime updates
```

and uses the provided primary key to apply row changes.

Example:

```dart
final Stream<List<Map<String, dynamic>>>
    messagesStream = client
        .from('messages')
        .stream(
          primaryKey: <String>['id'],
        )
        .eq(
          'room_id',
          roomId,
        )
        .order('created_at');
```

---

# Never Recreate Streams in `build()`

Bad:

```dart
Widget build(BuildContext context) {
  return StreamBuilder(
    stream: client
        .from('messages')
        .stream(
          primaryKey: ['id'],
        ),
    builder: ...,
  );
}
```

A rebuild can recreate the stream/subscription.

Preferred:

```dart
late final Stream<List<Map<String, dynamic>>>
    _messagesStream;

@override
void initState() {
  super.initState();

  _messagesStream = client
      .from('messages')
      .stream(
        primaryKey: <String>['id'],
      );
}
```

Or, better in larger applications, own the stream in state/application infrastructure rather than the widget.

---

# Realtime + Local State Reconciliation

Use the row primary key.

Conceptually:

```text
INSERT
 -> add if ID not present

UPDATE
 -> replace/merge row with same ID

DELETE
 -> remove same ID
```

Do not reconcile by list index.

List indices change with sorting/filtering.

---

# Ordering

A Realtime event arriving after an initial query can race with that query.

For correctness-sensitive state:

- identify rows by primary key
- use `updated_at` or revision/version where needed
- reject stale revisions
- run reconciliation after subscription setup when race risk matters

Do not assume callback arrival order equals database business-event order across every reconnect.

---

# Optimistic UI

Optimistic updates work well for:

- toggles
- likes
- simple edits
- reversible deletes

Pattern:

```text
user action
   |
apply optimistic local state
   |
send mutation
   |
success -> reconcile authoritative row
failure -> rollback / refetch
```

RLS and constraints still decide whether the change is allowed.

Do not let optimistic UI become proof that a mutation succeeded.

---

# Broadcast

Broadcast is appropriate for ephemeral shared events.

Examples:

```text
typing
cursor position
room activity
custom database-trigger fanout
```

For private Broadcast/Presence channels, use Realtime authorization policies and private-channel configuration.

Never assume a channel name such as:

```text
private-room-123
```

makes it private.

Authorization must be enforced.

---

# Presence

Presence is shared ephemeral user state.

Good:

```text
user online
member currently viewing document
```

Bad:

```text
full persisted user profile
database source of truth
cursor update 60 times/sec
```

Presence state can disappear/rejoin.

Persist durable domain state in PostgreSQL.

---

# Storage

Access through:

```dart
final SupabaseStorageClient storage =
    client.storage;
```

Bucket:

```dart
final StorageFileApi avatars =
    client.storage.from('avatars');
```

---

# Public vs Private Buckets

## Private

Use for:

- private documents
- account files
- protected media
- user uploads

Downloads require authorization/policy or a signed URL.

## Public

Use only when every person with the object URL may retrieve it.

Good candidates:

- public website assets
- public product images
- intentionally public profile images

Do not put private account content in a public bucket and attempt to hide its URL.

---

# Storage RLS

Storage object authorization is backed by RLS on Storage metadata.

Example path strategy:

```text
user-id/object-id.ext
```

can make policies easier.

But:

```text
path prefix == user ID
```

is merely client-provided data until the policy checks it.

Do not trust:

```dart
final path = '${currentUser.id}/secret.pdf';
```

as authorization.

---

# Storage Ownership

Object ownership metadata can help identify the uploader.

It does not grant access by itself.

Policies must explicitly authorize:

- SELECT
- INSERT
- UPDATE
- DELETE

as required.

---

# Storage Upload

Native example:

```dart
import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart';

Future<String> uploadAvatar({
  required SupabaseClient client,
  required File file,
  required String userId,
  required String extension,
}) async {
  final String path =
      '$userId/${DateTime.now().microsecondsSinceEpoch}.$extension';

  await client.storage
      .from('avatars')
      .upload(
        path,
        file,
        fileOptions: const FileOptions(
          cacheControl: '31536000',
          upsert: false,
        ),
      );

  return path;
}
```

For a production implementation, prefer a stable generated object ID rather than relying on timestamps alone if collision/idempotency semantics matter.

---

# Web Uploads

Web code typically uploads bytes rather than `dart:io File`:

```dart
Future<String> uploadAvatarBytes({
  required SupabaseClient client,
  required Uint8List bytes,
  required String userId,
  required String objectId,
}) async {
  final String path =
      '$userId/$objectId.webp';

  await client.storage
      .from('avatars')
      .uploadBinary(
        path,
        bytes,
        fileOptions: const FileOptions(
          contentType: 'image/webp',
          cacheControl: '31536000',
          upsert: false,
        ),
      );

  return path;
}
```

Remember that `Uint8List` means the entire object is already in Dart memory.

Do not use this architecture for huge files without evaluating memory.

---

# Standard vs Resumable Uploads

Current Supabase Storage guidance:

```text
<= ~6 MB:
  standard upload is the normal path

> ~6 MB or unreliable network:
  TUS resumable upload recommended
```

A standard upload can technically support much larger objects, but reliability degrades with large transfers.

---

# TUS Warning

Supabase Storage supports the TUS protocol.

The current high-level Dart `storage_client` API does not provide a generic:

```dart
uploadResumable(...)
```

method equivalent to the official JavaScript TUS example.

**MUST NOT invent one.**

If resumable uploads are required:

1. verify the current Dart package first
2. integrate a compatible TUS client/protocol implementation
3. use the direct Storage hostname as currently recommended
4. forward only the required Auth credential
5. implement resume/idempotency carefully

---

# Large Upload Memory

Prefer native file-based upload over:

```dart
final bytes = await file.readAsBytes();
await uploadBinary(...);
```

for large native files.

The latter duplicates the entire file into application memory.

For large Web files, choose a browser/TUS streaming architecture appropriate to the actual package support.

---

# Storage Retry

Storage upload APIs include bounded retry behavior.

Do not stack:

```text
SDK retry x app retry x state-manager retry
```

without understanding how many attempts can result.

A retry of an upload also needs path semantics:

```text
same path + upsert false
```

may return conflict after the server actually accepted the first attempt but the client lost the response.

Use stable object IDs and deliberate retry/upsert semantics.

---

# Signed URLs

For private content:

```dart
final String signedUrl =
    await client.storage
        .from('documents')
        .createSignedUrl(
          objectPath,
          60,
        );
```

The lifetime argument is seconds.

A signed URL is temporary bearer-like access.

Anyone possessing it can generally use the granted access during its validity.

Therefore:

- use short appropriate lifetime
- do not log it unnecessarily
- do not persist forever
- do not treat it as user identity
- regenerate when needed

---

# Public URLs

```dart
final String publicUrl =
    client.storage
        .from('public-assets')
        .getPublicUrl(path);
```

Only use for an intentionally public bucket.

A hard-to-guess URL is not access control.

---

# CDN and `cacheControl`

Storage integrates with Supabase's CDN.

Use longer cache times for immutable content.

Example:

```text
avatars/<user>/<content-hash>.webp
```

or:

```text
products/<id>/<version>.webp
```

is more cache-friendly than repeatedly overwriting:

```text
products/<id>/image.webp
```

behind a one-year cache.

Versioned/immutable paths make cache invalidation explicit.

---

# Storage Metadata

Do not treat Storage object listings as the application's relational data model.

For complex product records store domain metadata in PostgreSQL:

```text
file id
bucket/path
owner
document type
processing state
created_at
```

Storage owns bytes.

PostgreSQL owns relational application metadata.

Do not directly manipulate Storage system metadata tables to create/delete files.

Use the Storage API.

---

# Downloads

`download()` returns bytes and is convenient for small/medium files.

For very large media/documents, avoid loading the full object into Dart memory when the platform can:

- stream a signed/public URL
- use a media player
- use an HTTP/file downloader
- leverage OS/browser caching

Choose based on object size and UX.

---

# Edge Functions

Normal entry:

```dart
final FunctionResponse response =
    await client.functions.invoke(
  'hello',
  body: <String, Object?>{
    'name': 'Flutter',
  },
);

final Object? data = response.data;
```

The Supabase client normally manages its project/Auth headers.

Do not manually copy access tokens into every Function invocation unless the particular architecture requires custom Authorization behavior.

---

# Current Function Cancellation

Current `functions_client 2.7+` supports:

```dart
abortSignal
```

Example:

```dart
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';

Future<Object?> invokeWithTimeout(
  SupabaseClient client,
) async {
  try {
    final FunctionResponse response =
        await client.functions.invoke(
      'generate-preview',
      body: const <String, Object?>{
        'size': 'small',
      },
      abortSignal: Future<void>.delayed(
        const Duration(seconds: 10),
      ),
    );

    return response.data;
  } on http.RequestAbortedException {
    rethrow;
  }
}
```

The abort Future must not complete with an error.

---

# Cancellation Is Not Transaction Rollback

If the client aborts after:

```text
request sent
```

the Function may already be executing.

Therefore:

```text
client timeout
!=
server operation definitely cancelled
```

Never blindly retry a payment/job-creation Function after timeout unless the Function is idempotent.

---

# Function Error Types

Current Functions client distinguishes errors such as:

```text
FunctionsFetchException
  transport/no response

FunctionsHttpException
  function returned non-success HTTP response

FunctionsRelayException
  relay/infrastructure error
```

Use the subtype to decide:

- retry possibility
- diagnostic logging
- user-facing behavior

Do not convert all Function failures to "no internet."

---

# Function Retry Strategy

## Potentially retryable

- transient transport failure
- temporary 503
- idempotent Function
- request with a server-side idempotency key

## Not blindly retryable

- payment creation
- email sending
- job creation
- non-idempotent external API mutation
- unknown outcome after client abort/timeout

For those, add:

```text
stable operation ID
+
server-side uniqueness/idempotency
```

before automatic retry.

---

# Function Region

Supabase can route Functions geographically, and current APIs allow forcing a Function region.

Do not hardcode a region unless needed.

Tradeoff:

```text
nearest to user
  -> low client latency

same region as database
  -> low Function-to-DB latency
```

For database-heavy Functions, locating execution near PostgreSQL can reduce server-to-database round trips.

Forcing a region can reduce automatic routing flexibility.

Measure.

---

# Web Edge Functions

Web requests are subject to browser CORS.

A Function invoked by a browser must handle the required CORS headers and preflight behavior.

Do not "fix" a CORS error by exposing secrets to the browser or using permissive production policy without review.

---

# Function Performance

Avoid:

```text
Flutter
 -> Function
 -> read one public row
```

when Flutter can safely do:

```text
Flutter
 -> PostgREST/RLS
```

Function overhead includes:

- invocation
- serverless compute
- possible cold start
- another serialization layer
- another failure mode

Functions are valuable when they provide a real server boundary.

---

# Offline Behavior

Supabase Flutter does not automatically provide:

```text
offline PostgreSQL replica
automatic local query cache
offline mutation queue
conflict resolver
```

Auth session persistence is not database offline persistence.

---

# If the Product Is Not Offline-First

Keep architecture simple.

Possible:

```text
repository in-memory cache
+
network refresh
+
Realtime invalidation
```

No persistent database is necessary solely because mobile networks can occasionally fail.

---

# If the Product Must Be Offline-First

Add an explicit local data architecture.

Conceptually:

```text
UI
 |
 v
local database / repository
 |
 +--> reads immediately
 |
 +--> durable outbox
 |
 v
sync engine
 |
 v
Supabase
```

You need policies for:

- local schema
- pending mutation IDs
- retries
- conflicts
- deletion/tombstones
- auth account changes
- logout data removal
- Realtime reconciliation

This is an application feature, not something `supabase_flutter` transparently supplies.

---

# Caching Strategy

Use caching only where requirements justify it.

## In-memory cache

Good for:

- reference data
- repeated screen navigation
- recently fetched profiles

## Persistent cache

Good for:

- offline viewing
- expensive stable data
- large startup datasets

## Stale-while-revalidate

Useful when:

- slightly stale UI is acceptable
- network latency should not block screen display

## Invalidation

Invalidate/update after:

- successful mutation
- Realtime change
- account switch
- explicit refresh
- TTL when semantically appropriate

Do not cache private User A data into User B's session.

---

# Retry Strategy

First determine operation semantics.

| Operation | Retry guidance |
|---|---|
| SELECT | Usually safe with bounded retry |
| HEAD/count/read | Usually safe |
| Auth automatic refresh | Let Auth client own normal refresh |
| Explicit Auth sign-in | User/application controlled |
| INSERT | Unsafe unless idempotency exists |
| UPDATE | Depends on semantics |
| DELETE | Depends on semantics |
| UPSERT | Often safer with stable uniqueness, but side effects matter |
| RPC | Depends entirely on function |
| Edge Function | Depends entirely on function |
| Storage upload | Depends on path/upsert/idempotency |
| Signed URL generation | Generally safe |
| Realtime reconnect | SDK handles transport; app re-reconciles state |

Use bounded retries.

For application-level retry loops, prefer:

```text
exponential backoff
+
jitter
+
maximum attempts/deadline
```

Do not retry forever in foreground.

---

# PostgREST Automatic Retry

Recent client versions introduced configurable retry/request-timeout behavior.

Before adding an app-wide retry wrapper:

1. inspect the installed `postgrest`/`supabase` version
2. inspect its configured retry behavior
3. ensure mutation semantics remain correct

Do not multiply retries accidentally.

---

# Error Handling

Catch specific SDK errors where their meaning matters.

---

# Auth

Current Auth errors derive from `AuthException`, with more specific types for API/session/retryable fetch/password cases.

Example:

```dart
try {
  await client.auth.signInWithPassword(
    email: email,
    password: password,
  );
} on AuthException catch (error) {
  // Map to application Auth failure.
  // Do not expose raw server text blindly.
}
```

---

# PostgREST

```dart
try {
  await client
      .from('todos')
      .insert(
        <String, Object?>{
          'title': title,
        },
      );
} on PostgrestException catch (error) {
  final String? code = error.code;

  // Map known constraint/policy conditions.
  // Preserve details for safe diagnostics.
}
```

Useful fields include:

```text
message
code
details
hint
```

Do not parse human-readable messages when a stable PostgreSQL/error code is available.

---

# Storage

```dart
try {
  await client.storage
      .from('documents')
      .upload(
        path,
        file,
      );
} on StorageException catch (error) {
  // Inspect status/error class and map to domain failure.
}
```

---

# Functions

```dart
try {
  await client.functions.invoke(
    'create-report',
    body: <String, Object?>{
      'report_id': reportId,
    },
  );
} on FunctionsHttpException catch (error) {
  // Function returned a non-success response.
} on FunctionsRelayException catch (error) {
  // Relay/infrastructure-specific failure.
} on FunctionsFetchException catch (error) {
  // Transport/no-response failure.
}
```

Revalidate exception exports when using a package version older than Functions 2.7.

---

# Error Mapping

Repositories MAY convert SDK exceptions to domain errors.

Example concepts:

```text
Unauthenticated
Forbidden
NotFound
Conflict
ValidationFailure
NetworkUnavailable
TemporaryServerFailure
UnknownDataFailure
```

Do not discard original structured diagnostic information.

Do not show raw Postgres policy/constraint internals to users.

---

# Avoid `catch (_) {}`

Bad:

```dart
try {
  await client.from('todos').select();
} catch (_) {
  return [];
}
```

This makes:

```text
RLS failure
network outage
database failure
valid empty list
```

indistinguishable.

Preferred:

- map known errors
- log/observe unexpected ones
- show correct fallback state

---

# Architecture

Recommended medium-size architecture:

```text
lib/
  data/
    supabase/
      auth_repository.dart
      todo_repository.dart
      storage_repository.dart
      functions_repository.dart
      realtime_service.dart
  domain/
    ...
  application/
    ...
  presentation/
    ...
```

Do not mandate folders if the application is small.

The important boundary is:

```text
Widget
   |
   v
state/application action
   |
   v
repository/service
   |
   v
one SupabaseClient
```

rather than:

```text
Widget.build()
   |
   v
Supabase query
```

---

# Repository Pattern

Repositories are useful when they provide:

- query centralization
- typed models
- caching
- error mapping
- pagination
- testing
- security review
- provider isolation

They become ceremony when:

- application has three tiny queries
- every repository simply forwards one SDK call
- no test/schema boundary is gained

Use the smallest abstraction that gives meaningful ownership.

---

# Dependency Injection

Inject:

```dart
SupabaseClient
```

or repositories that already own it.

Do not require a state-management framework.

Valid approaches include:

- constructor injection
- provider
- service locator
- application container

---

# State Management

Framework-neutral rule:

```text
network/subscription lifecycle
belongs to application/data state,
not build()
```

## Riverpod

Use providers/notifiers to own request/subscription lifetime.

## Bloc

Fetch in events/use cases, not `BlocBuilder`.

## Provider/MVVM

View models/services own network operations.

## Redux

Effects/middleware own asynchronous Supabase work.

---

# Flutter Widget Performance

## Never Query in `build()`

Bad:

```dart
Widget build(BuildContext context) {
  final future =
      client.from('todos').select();

  return FutureBuilder(
    future: future,
    builder: ...,
  );
}
```

Every rebuild can create another request.

Preferred:

- stable Future
- state-layer request
- repository cache
- pagination controller

---

# Stable Future Example

```dart
late final Future<List<Todo>> _future;

@override
void initState() {
  super.initState();

  _future = repository.fetchPage(
    userId: userId,
    from: 0,
    to: 49,
  );
}
```

If input dependencies can change, use a state-management/controller lifecycle that explicitly refetches on dependency change.

---

# Selective Rebuilds

One Realtime row update should not necessarily rebuild an entire app shell.

Normalize local state by primary key and expose only the affected feature state.

Flutter rebuild cost and Realtime transport cost are separate problems.

---

# Serialization Performance

Normal small/medium Supabase payloads do not justify custom isolates.

First:

- reduce selected columns
- paginate
- eliminate nested overfetching
- remove N+1

Only consider off-main-isolate parsing when measurements show a large JSON/model transformation causes visible jank.

---

# Concurrency and Race Conditions

## Double submit

Prevent in UI:

```text
pending state
```

and enforce server-side uniqueness/idempotency where duplicate execution matters.

## Concurrent profile updates

Use:

- row constraints
- version column
- update predicates
- RPC with locking when required

Do not assume the latest HTTP response corresponds to latest user intent.

## Logout during request

Do not apply a User A result after User B signs in.

Tag requests/state with account/session generation where necessary.

## Realtime before initial query

Reconcile by primary key/version.

Do not append blindly.

## Upload race

Use generated object IDs and deliberate overwrite policy.

---

# Security Rules

## MUST

- use a publishable client key
- keep secret/service-role credentials server-side
- enable RLS on exposed private data
- design policies per operation
- use server-side authorization
- treat client data as untrusted
- protect private Storage with policies
- protect private Realtime channels
- use database constraints
- test cross-user isolation
- restrict privileged database functions
- store Edge Function secrets server-side

## MUST NOT

- trust hidden UI
- trust a client-provided user ID
- trust a client-provided tenant ID
- trust a Storage folder name
- ship database credentials
- bypass RLS from Flutter
- place a secret key in `--dart-define`
- make a bucket public to avoid writing policies
- expose third-party secrets through Function responses/logs

---

# Performance Rules — HIGH PRIORITY

## 1. One client

Mechanism avoided:

```text
duplicate Auth state
duplicate HTTP clients
duplicate Realtime sockets
duplicate session propagation
```

---

## 2. Never query from `build()`

Mechanism:

```text
Flutter rebuild
 -> duplicate network request
 -> duplicate DB work
 -> duplicate JSON
 -> extra battery/network
```

---

## 3. Select only needed columns

Mechanism:

```text
smaller database result
smaller JSON
less network
less decoding
less memory
```

---

## 4. Paginate large results

Mechanism:

```text
bounded DB result
bounded network payload
bounded list/model memory
bounded render work
```

---

## 5. Avoid N+1

Mechanism:

```text
N network round trips
+
N query planning/execution cycles
```

Use relations/views/RPC where appropriate.

---

## 6. Filter on the server

Bad:

```text
download 50,000 rows
filter 20 rows in Dart
```

Preferred:

```text
WHERE/filter in Postgres/PostgREST
```

---

## 7. Index actual query predicates

Mechanism:

PostgreSQL can avoid sequential scanning/sorting large row sets.

Remember RLS predicate columns.

---

## 8. Keep RLS efficient

Mechanism:

RLS executes with every matching query and can add per-row policy work.

Use:

```text
indexes
TO roles
(select auth.uid())
simple membership predicates
```

where applicable.

---

## 9. Keep Realtime narrow

Mechanism:

```text
fewer server authorization checks
fewer WebSocket messages
less JSON
less client reconciliation
less battery
```

---

## 10. Do not create one channel per row

Mechanism:

```text
channel state
subscriptions
rejoins
server resources
client callbacks
```

Scale subscriptions by logical feature/room.

---

## 11. Dispose unused channels

Mechanism:

Unused channels continue to consume transport/backend resources until removed/cleaned up.

---

## 12. Persist `.stream()` instances

Mechanism:

Avoid reconnect/refetch caused by Flutter rebuilds.

---

## 13. Do not use Edge Functions for trivial CRUD

Mechanism:

Avoid unnecessary:

```text
serverless invocation
extra HTTP hop
serialization
cold-start exposure
```

---

## 14. Keep Function payloads small

Mechanism:

Less:

- serialization
- upload/download
- memory
- Function parsing

---

## 15. Match Storage method to object size

Small:

```text
standard upload
```

Large/unreliable:

```text
resumable protocol
```

Do not repeatedly restart huge transfers.

---

## 16. Avoid whole-file memory loads for large objects

Mechanism:

`Uint8List` requires memory proportional to file size.

---

## 17. Use CDN-friendly object paths

Immutable/versioned URLs improve cache hit behavior and prevent stale-overwrite confusion.

---

## 18. Avoid redundant Auth work

Do not:

```text
get token
refresh token
get token
```

before each query.

Supabase client manages Auth propagation.

---

## 19. Avoid stacked retry layers

Mechanism:

If:

```text
SDK attempts 3
application attempts 3
state layer attempts 3
```

one user action can become 27 requests.

---

## 20. Optimize architecture before Dart micro-optimizations

A missing DB index or 100 network requests matters more than allocating one extra repository object.

---

# Reliability Rules

1. Model Auth bootstrap explicitly.
2. Do not assume `initialize()` means session restoration has fully settled.
3. Handle Auth stream errors.
4. Do not manually refresh before every request.
5. Treat Realtime as lossy/live, not historical.
6. Requery on reconnect where completeness matters.
7. Reconcile by primary key/version.
8. Make retries bounded.
9. Do not retry non-idempotent operations blindly.
10. Put critical idempotency in the database/server.
11. Use constraints against concurrency races.
12. Treat client cancellation as "stopped waiting," not guaranteed server rollback.
13. Design Storage uploads for partial/unknown outcomes.
14. Clear account-specific cache/subscriptions on logout.
15. Handle network loss as normal mobile state.
16. Do not assume local Auth persistence gives offline database access.

---

# Testing

Use a layered test strategy.

```text
1. Pure unit tests
2. MockSupabaseHttpClient repository tests
3. Local Supabase integration tests
4. Isolated cloud/staging tests
```

---

# Unit Tests

Test:

- model parsing
- repository decisions
- error mapping
- pagination state
- optimistic rollback
- Auth-state reducer
- retry/idempotency logic

Use fake repositories when Supabase itself is not what the test is validating.

---

# `mock_supabase_http_client`

Current pattern:

```dart
import 'package:mock_supabase_http_client/mock_supabase_http_client.dart';
import 'package:supabase/supabase.dart';
import 'package:test/test.dart';

void main() {
  late MockSupabaseHttpClient mockHttp;
  late SupabaseClient client;

  setUp(() {
    mockHttp = MockSupabaseHttpClient();

    client = SupabaseClient(
      'https://mock.supabase.co',
      'fake-publishable-key',
      httpClient: mockHttp,
    );
  });

  tearDown(() {
    mockHttp.close();
  });

  test('repository reads a todo', () async {
    await client.from('todos').insert(
      <String, Object?>{
        'id': 1,
        'title': 'Test',
        'completed': false,
      },
    );

    final Map<String, dynamic> row =
        await client
            .from('todos')
            .select(
              'id,title,completed',
            )
            .eq('id', 1)
            .single();

    expect(
      row['title'],
      'Test',
    );
  });
}
```

---

# Mock Limitations

Do not use the mock package to prove:

```text
RLS works
constraint works
trigger works
Auth works
Realtime works
Storage policy works
Edge Function works
query has good index plan
```

It does not execute real PostgreSQL.

Its own README and changelog have occasionally lagged each other, so revalidate individual mock features before depending on them.

---

# Local Supabase

For real integration testing use the Supabase CLI.

Typical workflow:

```shell
supabase init
supabase start
supabase db reset
```

Version-control:

```text
supabase/migrations/
supabase/seed.sql
supabase/functions/
```

Use local Supabase to test:

- PostgreSQL
- migrations
- RLS
- constraints
- triggers
- RPC
- Auth
- Realtime
- Storage
- Edge Functions

according to the local stack capabilities.

---

# Local Stack Is Not Production

The local Supabase development stack is for development/testing.

Do not expose it as a production Supabase deployment.

Its local defaults are not a hardened internet-facing security configuration.

---

# RLS Security Tests

At minimum test:

```text
anonymous -> cannot read private row
anonymous -> cannot write private row

User A -> can read own row
User A -> cannot read User B row
User A -> cannot update User B row
User A -> cannot delete User B row

User A -> can upload own permitted Storage path
User A -> cannot upload into User B namespace
User A -> cannot retrieve User B private file

authenticated member -> allowed tenant
non-member -> denied tenant

private Realtime member -> subscribes
non-member -> denied
```

Do not consider an RLS policy complete until cross-user negative tests exist.

---

# Database Migration Rules

Production schema changes belong in migrations.

Version-control:

- tables
- columns
- constraints
- indexes
- RLS
- functions
- grants
- triggers

Do not have Flutter execute:

```text
CREATE TABLE
ALTER TABLE
CREATE POLICY
```

during app startup.

Application versions can be:

- old
- offline
- malicious
- concurrently running

Schema deployment belongs to backend CI/CD.

---

# Test Data Isolation

Prefer:

- local database reset
- deterministic seed
- unique test user IDs
- per-test generated resource IDs
- explicit cleanup

Never run destructive tests against production.

Do not put real customer PII in development seed files.

---

# Edge Function Testing

Test Function logic separately from Flutter UI.

Use:

- local Functions
- HTTP integration requests
- deliberate Auth headers
- test secrets
- idempotency tests
- failure injection

Flutter unit tests should usually fake the application's Function repository rather than boot a Function runtime.

---

# Observability and Debugging

Supabase exposes logs for services such as:

- Auth
- Postgres
- API/PostgREST
- Realtime
- Storage
- Edge Functions

Use the component matching the failure.

Do not diagnose every server response solely from Flutter logs.

---

# Logging Privacy

Supabase client packages have verbose logging.

Very verbose SDK logs can include request/session/auth details.

Do not enable maximum/FINEST logging in production without reviewing what is emitted.

Never log:

- access tokens
- refresh tokens
- secret keys
- signed private URLs
- authorization headers
- private Function payloads

---

# Debugging Guide

| Symptom | Likely Cause | How to Verify | Fix |
|---|---|---|---|
| App starts on login then jumps home | Auth restoration asynchronous | Inspect `initialSession` and router state | Add explicit auth bootstrap state |
| App briefly shows home then logs out | Stale persisted session/refresh failure | Handle Auth stream error/events | Let auth coordinator resolve session before protected route |
| `onAuthStateChange` causes crash offline | Stream error has no handler | Inspect zone/log stack | Add `onError` |
| Duplicate navigation after login | Multiple Auth listeners | Search subscriptions | Own one auth coordinator |
| Request gets 401 after token transition | stale/custom Authorization header | Compare custom headers with SDK auth | Let SupabaseClient manage Auth header |
| OAuth returns but app stays logged out | redirect/deep-link/PKCE mismatch | Check callback URL + Auth events | Fix redirect allow-list/platform link config |
| OAuth works Web but not mobile | mobile callback configuration missing | Inspect app/universal link | Configure native redirect |
| OAuth works mobile but not Web | browser redirect/storage/CORS assumptions | Inspect browser URL/storage | Use Web-specific redirect flow |
| Password recovery opens wrong screen | navigation driven by raw URL | Inspect `passwordRecovery` event | Route from Auth recovery state |
| Query returns zero unexpectedly | RLS/filter/session issue | Test SQL as role, inspect Auth | Fix policy/filter/session |
| Query says permission denied | grant/RLS mismatch | Inspect table grants + policy | Grant minimum role privilege and correct RLS |
| Query is slow | missing index/RLS/N+1/overfetch | EXPLAIN, query logs, payload | Fix query/index/policy |
| `.single()` throws on optional row | zero rows valid | Inspect response expectation | Use `.maybeSingle()` |
| Duplicate API calls | request created in `build()` or several state listeners | Network inspector/log | Own request lifecycle |
| List uses huge memory | unbounded `select('*')` | Inspect row count/payload | select columns + paginate |
| Feed gets slower on later pages | high offset pagination | inspect query plan | consider keyset pagination |
| Many profile requests | N+1 | count HTTP requests | embed relation/view/RPC |
| Realtime duplicates | duplicate channels/streams | inspect channel creation | one subscription owner |
| Realtime stops updating | disconnected/rejoin/token/lifecycle | inspect Realtime status | let SDK reconnect, then reconcile query |
| Realtime local state drifts | missed events | compare authoritative query | requery on reconnect |
| Realtime backend load high | broad Postgres Changes subscriptions | inspect subscriber/filter pattern | filter more / use Broadcast |
| Delete changes missing old data | replica identity limitations | inspect table configuration | configure required replica identity if justified |
| Storage upload denied | Storage RLS | inspect `storage.objects` policies | fix INSERT policy |
| Overwrite denied | missing SELECT/UPDATE policy | inspect upsert policy permissions | add correct policies |
| Private file publicly accessible | public bucket | inspect bucket | migrate to private |
| Signed URL expired | intended TTL | inspect creation time | regenerate |
| CDN serves old file | same path overwritten with long cache | inspect path/cache | use versioned immutable path |
| Large upload repeatedly fails | standard upload too large/unreliable | inspect size/network | use TUS-compatible resumable architecture |
| App OOMs on file upload | entire file loaded into bytes | memory profile | use file/stream/resumable path |
| Function 401 | bad/missing Auth or server policy | inspect Function logs | fix client/session/function verification |
| Function 500 | application error | Edge Function logs | fix Function |
| Function timeout then duplicates action | retry without idempotency | inspect operation IDs | implement server idempotency |
| Function fails only on Web | CORS/preflight | browser network panel | return correct CORS headers |
| Mock test passes but production RLS fails | mock doesn't implement RLS | run local integration test | test against local Supabase |
| Local query fast, production slow | data volume/index/RLS differs | production Query Performance/EXPLAIN | fix production schema/query |
| User B sees User A cached state | cache not cleared at sign-out | inspect repository cache | namespace/clear account data |

---

# Anti-Patterns

## Anti-pattern: New Supabase client per screen

### Bad

```dart
final client = SupabaseClient(
  url,
  key,
);
```

inside features.

### Why

Duplicates stateful client infrastructure.

### Preferred

One `Supabase.instance.client`.

---

## Anti-pattern: Query from `build()`

### Why

Flutter rebuilds are not data-fetch lifecycle events.

### Preferred

State/repository-owned request.

---

## Anti-pattern: `select('*')` everywhere

### Why

Overfetching increases DB, network, decoding, and memory cost.

### Preferred

Explicit required columns.

---

## Anti-pattern: Unbounded table reads

### Why

Dataset growth eventually becomes a performance incident.

### Preferred

Pagination.

---

## Anti-pattern: Client-side filtering of huge data

### Bad

```text
SELECT all
-> where() in Dart
```

### Why

Database can filter much more efficiently before transfer.

### Preferred

PostgREST/PostgreSQL predicate.

---

## Anti-pattern: N+1 requests

### Why

Round-trip latency compounds.

### Preferred

embedded relation/view/RPC.

---

## Anti-pattern: No database indexes

### Why

Flutter cannot compensate for sequential scans.

### Preferred

index actual query/RLS columns.

---

## Anti-pattern: No RLS

### Why

Publishable client credentials are intentionally available to clients.

### Preferred

RLS + least privilege.

---

## Anti-pattern: Hide button as authorization

### Why

A malicious client can call the API directly.

### Preferred

server-side policy.

---

## Anti-pattern: Service-role/secret key in Flutter

### Why

Any client can extract and use it to bypass intended authorization.

### Preferred

Edge Function/trusted backend.

---

## Anti-pattern: Client tenant ID trusted

### Why

Attacker can change it.

### Preferred

RLS membership verification.

---

## Anti-pattern: Function for every select

### Why

Adds a serverless hop without a security/logic benefit.

### Preferred

direct PostgREST when RLS is sufficient.

---

## Anti-pattern: Edge Functions as generic database proxy

### Why

More latency, code, failure modes, and cost.

### Preferred

Functions only when server boundary adds value.

---

## Anti-pattern: Broad Realtime table subscription

### Why

High event and authorization volume.

### Preferred

server filters / Broadcast.

---

## Anti-pattern: One channel per row

### Why

Channel/socket subscription overhead scales with UI item count.

### Preferred

one logical collection/room channel.

---

## Anti-pattern: Forget to remove channels

### Why

Unused subscriptions continue consuming resources.

### Preferred

tie channel lifetime to feature/app scope.

---

## Anti-pattern: Realtime as sole source of truth

### Why

Live connections can miss periods.

### Preferred

snapshot + live changes + reconciliation.

---

## Anti-pattern: New `.stream()` in every rebuild

### Why

Reconnect/refetch/duplicate stream behavior.

### Preferred

persist stream.

---

## Anti-pattern: `.single()` for optional data

### Why

Zero rows becomes an exception.

### Preferred

`.maybeSingle()`.

---

## Anti-pattern: Blind insert retry

### Why

First request may have succeeded before response was lost.

### Preferred

stable idempotency/uniqueness.

---

## Anti-pattern: Client boolean as idempotency

### Why

Not safe across process/network/device/concurrency.

### Preferred

database/server uniqueness.

---

## Anti-pattern: Public bucket for private data

### Why

Read access is intentionally public.

### Preferred

private bucket + RLS/signed URL.

---

## Anti-pattern: User ID in path equals security

### Why

Client chooses the path.

### Preferred

Storage policy checks Auth ownership.

---

## Anti-pattern: Huge `Uint8List` uploads

### Why

Whole object occupies Dart heap.

### Preferred

file/resumable architecture.

---

## Anti-pattern: Overwrite highly cached asset path

### Why

CDN/browser can continue serving older bytes.

### Preferred

version/content-hashed paths.

---

## Anti-pattern: Put domain model only in Storage listing

### Why

Object storage is not relational application metadata.

### Preferred

PostgreSQL metadata row.

---

## Anti-pattern: Function retry after timeout without idempotency

### Why

Server may still have completed first request.

### Preferred

operation key + server guard.

---

## Anti-pattern: Manual refresh before every request

### Why

Unnecessary network/token rotation.

### Preferred

let Auth client manage normal refresh.

---

## Anti-pattern: Multiple Auth subscriptions

### Why

Duplicate navigation/network work.

### Preferred

one Auth coordinator.

---

## Anti-pattern: Treat SharedPreferences as hardware security

### Why

Default persistence does not make that guarantee.

### Preferred

threat-model storage.

---

## Anti-pattern: Assume Supabase is offline-first

### Why

No automatic local PostgreSQL replica/mutation queue.

### Preferred

explicit local architecture if required.

---

## Anti-pattern: Trust mocks for RLS

### Why

HTTP mock does not run PostgreSQL policy engine.

### Preferred

local Supabase integration tests.

---

## Anti-pattern: Test against production

### Why

Data/security risk.

### Preferred

local/isolated staging.

---

## Anti-pattern: Schema migration from Flutter

### Why

Clients are untrusted and version-fragmented.

### Preferred

migration files + backend CI/CD.

---

# Implementation Checklist

## 1. Inspect versions

- [ ] `pubspec.yaml`
- [ ] `pubspec.lock`
- [ ] current `supabase_flutter` changelog
- [ ] current `supabase` changelog
- [ ] companion package versions

## 2. Configure environment

- [ ] project URL
- [ ] publishable key
- [ ] no secret/service-role key
- [ ] separate dev/staging/prod projects as needed

## 3. Initialize once

- [ ] `WidgetsFlutterBinding.ensureInitialized`
- [ ] `Supabase.initialize`
- [ ] `Supabase.instance.client`
- [ ] no client creation in features

## 4. Design Auth

- [ ] persisted-session requirements
- [ ] secure-storage threat model
- [ ] one Auth listener
- [ ] Auth listener `onError`
- [ ] bootstrap state
- [ ] logout cache cleanup
- [ ] account switching
- [ ] OAuth redirects
- [ ] deep-link setup
- [ ] recovery flow

## 5. Secure database

- [ ] RLS enabled
- [ ] least-privilege grants
- [ ] SELECT policy
- [ ] INSERT policy
- [ ] UPDATE policy
- [ ] DELETE policy
- [ ] policy roles
- [ ] policy indexes
- [ ] cross-user tests

## 6. Design queries

- [ ] required columns only
- [ ] explicit filters
- [ ] pagination
- [ ] deterministic order
- [ ] no N+1
- [ ] relations/views/RPC where appropriate
- [ ] indexes checked

## 7. Design mutations

- [ ] constraints
- [ ] unique keys
- [ ] idempotency
- [ ] `.select()` only if return rows needed
- [ ] optimistic rollback where used

## 8. Choose backend boundary

- [ ] direct CRUD if RLS-safe
- [ ] RPC for atomic/data-local work
- [ ] Edge Function for secrets/external work

## 9. Design Realtime

- [ ] Postgres Changes vs Broadcast vs Presence
- [ ] server filter
- [ ] shared logical channels
- [ ] cleanup
- [ ] reconnect reconciliation
- [ ] primary-key handling

## 10. Design Storage

- [ ] public/private decision
- [ ] Storage policies
- [ ] path convention
- [ ] content type
- [ ] cache control
- [ ] unique/versioned path
- [ ] large-file strategy
- [ ] signed URL TTL

## 11. Functions

- [ ] Auth expectations
- [ ] secrets server-side
- [ ] CORS for Web
- [ ] timeout/cancellation
- [ ] error subtype handling
- [ ] idempotency before retries
- [ ] Function logs

## 12. Offline

- [ ] define product requirement
- [ ] memory cache if sufficient
- [ ] persistent DB only if needed
- [ ] outbox/conflict strategy if offline mutations required

## 13. Testing

- [ ] unit tests
- [ ] mock HTTP repository tests
- [ ] local Supabase
- [ ] RLS negative tests
- [ ] Auth tests
- [ ] Realtime tests
- [ ] Storage policy tests
- [ ] Function tests

## 14. Performance

- [ ] request count
- [ ] payload size
- [ ] pagination
- [ ] N+1
- [ ] query plan/indexes
- [ ] RLS performance
- [ ] Realtime channel count
- [ ] large transfer memory

---

# Code Review Checklist

## Client

- [ ] One app-scoped client?
- [ ] No per-screen `SupabaseClient`?
- [ ] No parallel lower-level clients without reason?

## Secrets

- [ ] Publishable key only?
- [ ] No secret/service-role key?
- [ ] No third-party secret?
- [ ] No database password?

## Auth

- [ ] One `onAuthStateChange`?
- [ ] Has `onError`?
- [ ] Session bootstrap modeled?
- [ ] No refresh-before-every-request?
- [ ] Logout clears user state?
- [ ] OAuth/deep links platform-tested?

## RLS

- [ ] RLS enabled?
- [ ] Grants least-privilege?
- [ ] Every operation policy-covered?
- [ ] `TO` role specified?
- [ ] `(select auth.uid())` used appropriately?
- [ ] policy columns indexed?
- [ ] cross-user tests?

## Queries

- [ ] No old `.execute()`?
- [ ] No obsolete v1 filters?
- [ ] Explicit columns?
- [ ] Server filters?
- [ ] Paginated?
- [ ] deterministic ordering?
- [ ] no N+1?
- [ ] indexes checked?

## Mutations

- [ ] bounded update/delete?
- [ ] `.select()` only when needed?
- [ ] uniqueness constraints?
- [ ] idempotency?
- [ ] optimistic rollback?

## RPC

- [ ] actually needs DB function?
- [ ] secure function mode?
- [ ] safe `search_path` for definer?
- [ ] execute grants restricted?

## Realtime

- [ ] correct primitive?
- [ ] filtered?
- [ ] no per-row channel?
- [ ] channel removed?
- [ ] stream not recreated from build?
- [ ] reconnect/requery?
- [ ] state keyed by PK?

## Storage

- [ ] correct bucket privacy?
- [ ] policies?
- [ ] path not trusted?
- [ ] file size strategy?
- [ ] no huge bytes unnecessary?
- [ ] signed URL expiration?
- [ ] CDN/cache path strategy?

## Functions

- [ ] Function genuinely needed?
- [ ] secrets only server-side?
- [ ] current error classes?
- [ ] CORS?
- [ ] cancellation semantics understood?
- [ ] retry idempotency?

## Offline

- [ ] Supabase not assumed offline-first?
- [ ] cache intentional?
- [ ] account-specific cache isolation?

## Testing

- [ ] mock used only within scope?
- [ ] local RLS tests?
- [ ] no production testing?
- [ ] migrations tested?

## Flutter

- [ ] no query in `build()`?
- [ ] no stream construction in `build()`?
- [ ] stable request lifecycle?
- [ ] selective Realtime rebuilds?

---

# Production Readiness Checklist

- [ ] Production Supabase project selected.
- [ ] Correct project URL.
- [ ] Correct publishable key.
- [ ] No privileged key in client.
- [ ] Production RLS enabled.
- [ ] Grants reviewed.
- [ ] RLS cross-user tests passing.
- [ ] Multi-tenant isolation tested.
- [ ] Auth redirect allow-list correct.
- [ ] Android deep link/app link tested.
- [ ] iOS universal/custom link tested.
- [ ] Web OAuth tested.
- [ ] Desktop OAuth tested if supported by product.
- [ ] Session restore tested after restart.
- [ ] Offline Auth refresh failure tested.
- [ ] Sign-out/account-switch cleanup tested.
- [ ] Large queries paginated.
- [ ] Query plans/indexes reviewed.
- [ ] RLS performance reviewed.
- [ ] N+1 eliminated.
- [ ] Realtime channel count reviewed.
- [ ] Reconnect/reconciliation tested.
- [ ] Private Storage policies tested.
- [ ] Public buckets intentional.
- [ ] Large upload strategy tested on poor network.
- [ ] Signed URL lifetime reviewed.
- [ ] Edge Function secrets configured server-side.
- [ ] Function retries idempotent.
- [ ] Web Function CORS tested.
- [ ] Local integration suite passing.
- [ ] Database migrations committed.
- [ ] Production monitoring/logging configured.
- [ ] Verbose client logs do not leak tokens.

---

# Version-Sensitive Areas

Always revalidate:

## `supabase_flutter`

Especially:

- `Supabase.initialize`
- `publishableKey`
- `persistSession`
- deep-link detection
- PKCE
- passkey helpers
- OAuth URL helpers
- lifecycle Realtime behavior

## `supabase`

Especially:

- Auth session APIs
- `.stream()`
- Realtime filters
- PostgREST retry configuration
- trace-context propagation
- Functions authorization behavior

## `postgrest`

Especially:

- auto retry
- request timeout
- abort support
- filter names
- builder behavior

## `functions_client`

The current 2.7 line added:

```text
abortSignal
FunctionsFetchException
FunctionsHttpException
FunctionsRelayException
```

Do not use those in a project pinned to an older Functions client.

## `storage_client`

Revalidate:

- upload retries
- dedicated Storage hostname
- signed URL options
- download behavior
- large-upload support
- whether a future Dart version adds TUS directly

## `mock_supabase_http_client`

Its README/changelog have had stale or contradictory limitations.

Do not assume it faithfully mirrors current PostgREST.

## Auth providers

Provider SDKs change independently.

Revalidate:

- Google
- Apple
- Facebook
- SSO
- passkeys
- deep-link requirements

## Realtime scale guidance

Quotas and product architecture evolve.

Revalidate current:

- channel limits
- messages/sec
- concurrent users
- Postgres Changes recommendations

## Storage limits

Revalidate:

- bucket limits
- file-size limits
- TUS behavior
- CDN behavior

## Flutter platform behavior

Revalidate after:

- Flutter deep-link changes
- Web routing changes
- Android app-link changes
- iOS universal-link changes
- desktop plugin changes

---

# Decision Framework

## Ordinary user-owned CRUD?

Use:

```text
PostgREST + RLS
```

## Several rows/tables must change atomically?

Use:

```text
PostgreSQL function + RPC
```

## Need third-party secret?

Use:

```text
Edge Function
```

## Need external API call?

Use:

```text
Edge Function
```

## Need a live database screen with moderate subscribers?

Use:

```text
initial query + filtered Postgres Changes
```

or:

```text
.stream()
```

## Need high-scale fan-out?

Evaluate:

```text
Broadcast
```

rather than broad Postgres Changes.

## Need ephemeral online state?

Use:

```text
Presence
```

## Need private file?

Use:

```text
private Storage bucket + RLS
```

## Need temporary external access?

Use:

```text
signed URL
```

## Need public immutable asset?

Use:

```text
public bucket + versioned path + cache control
```

## Need small upload?

Use:

```text
standard Storage upload
```

## Need large/unreliable upload?

Use:

```text
TUS-compatible resumable architecture
```

after verifying current Dart support.

## Need offline-first editing?

Add:

```text
local database + sync/outbox
```

Supabase alone is not the local offline database.

---

# Official References

## Flutter / Dart packages

- https://pub.dev/packages/supabase_flutter
- https://pub.dev/packages/supabase_flutter/changelog
- https://pub.dev/packages/supabase
- https://pub.dev/packages/supabase/changelog
- https://pub.dev/packages/storage_client
- https://pub.dev/packages/storage_client/changelog
- https://pub.dev/packages/functions_client
- https://pub.dev/packages/functions_client/changelog
- https://pub.dev/packages/mock_supabase_http_client
- https://pub.dev/packages/mock_supabase_http_client/changelog

## Supabase Flutter reference

- https://supabase.com/docs/reference/dart/introduction
- https://supabase.com/docs/reference/dart/installing
- https://supabase.com/docs/reference/dart/initializing
- https://supabase.com/docs/reference/dart/auth-signinwithpassword
- https://supabase.com/docs/reference/dart/auth-signinwithoauth
- https://supabase.com/docs/reference/dart/auth-onauthstatechange
- https://supabase.com/docs/reference/dart/auth-signout
- https://supabase.com/docs/reference/dart/select
- https://supabase.com/docs/reference/dart/insert
- https://supabase.com/docs/reference/dart/update
- https://supabase.com/docs/reference/dart/upsert
- https://supabase.com/docs/reference/dart/delete
- https://supabase.com/docs/reference/dart/rpc
- https://supabase.com/docs/reference/dart/stream
- https://supabase.com/docs/reference/dart/subscribe
- https://supabase.com/docs/reference/dart/functions-invoke
- https://supabase.com/docs/reference/dart/upgrade-guide

## Auth

- https://supabase.com/docs/guides/auth
- https://supabase.com/docs/guides/auth/sessions
- https://supabase.com/docs/guides/auth/sessions/pkce-flow
- https://supabase.com/docs/guides/auth/redirect-urls

## Database / RLS / PostgreSQL

- https://supabase.com/docs/guides/database
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/database/functions
- https://supabase.com/docs/guides/database/postgres/indexes
- https://supabase.com/docs/guides/database/query-optimization

## Realtime

- https://supabase.com/docs/guides/realtime
- https://supabase.com/docs/guides/realtime/postgres-changes
- https://supabase.com/docs/guides/realtime/broadcast
- https://supabase.com/docs/guides/realtime/presence
- https://supabase.com/docs/guides/realtime/authorization

## Storage

- https://supabase.com/docs/guides/storage
- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/guides/storage/uploads/standard-uploads
- https://supabase.com/docs/guides/storage/uploads/resumable-uploads
- https://supabase.com/docs/guides/storage/cdn

## Edge Functions

- https://supabase.com/docs/guides/functions
- https://supabase.com/docs/guides/functions/secrets
- https://supabase.com/docs/guides/functions/cors
- https://supabase.com/docs/guides/functions/status-codes

## Local development / testing

- https://supabase.com/docs/guides/local-development
- https://supabase.com/docs/guides/local-development/cli/getting-started
- https://supabase.com/docs/guides/deployment/database-migrations
- https://supabase.com/docs/guides/database/testing

## Source

- https://github.com/supabase/supabase-flutter

---

# Final Rules for AI Coding Agents

Before changing a production Supabase Flutter implementation:

1. inspect installed versions
2. identify supported platforms
3. identify the single Supabase client owner
4. inspect Auth bootstrap/listeners
5. inspect client credential handling
6. inspect RLS and grants
7. inspect query count and selected columns
8. inspect pagination
9. inspect N+1 requests
10. inspect database indexes
11. inspect RLS performance
12. inspect mutation idempotency
13. inspect Realtime subscription count/scope
14. inspect Storage policy/file-size strategy
15. inspect Edge Function necessity
16. inspect retry behavior
17. inspect offline requirements
18. inspect test coverage against real local Supabase

Then implement the smallest secure architecture that satisfies the product requirement.

The preferred production shape is:

```text
Flutter UI
    |
    v
Application / state
    |
    v
Repository / service
    |
    v
one SupabaseClient
    |
    +---------------------------+
    |             |             |
    v             v             v
PostgREST       Realtime      Storage
    |
    +--> PostgreSQL / RLS
    |
    +--> RPC for atomic SQL logic

Flutter
    |
    +--> Edge Functions
          only for server-only secrets,
          external integrations,
          or custom privileged orchestration
```

Optimize in this order:

```text
security correctness
database/query shape
round-trip count
payload size
RLS/index efficiency
Realtime scope
Storage transfer strategy
retry/idempotency
Flutter state/rebuild behavior
```

Do not try to solve a bad PostgreSQL query with Dart micro-optimizations.

Do not try to solve missing authorization with hidden UI.

Do not try to solve every backend requirement with an Edge Function.

Do not try to make Realtime into durable event storage.

Do not try to make Supabase into an offline database unless the application explicitly adds that architecture.

The best Supabase Flutter implementation is usually the one that keeps the client simple while using PostgreSQL, RLS, constraints, indexes, and server-side boundaries for the work they are designed to perform.