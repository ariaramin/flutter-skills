# Example — Feature Design: Offline-Capable Comments Feed

This example demonstrates the reasoning style, not a mandatory architecture.

## 1. Requirements

Functional:
- show paginated comments;
- post comment;
- allow posting while offline;
- show pending/failed state;
- open comment author profile.

Nonfunctional:
- first content quickly from local cache;
- global/unreliable networks;
- avoid duplicate comment submission;
- pending writes survive app restart.

Out of scope:
- nested comment tree;
- comment editing;
- moderation backend.

## 2. Data model

`Comment(id, postId, author, body, createdAt, serverRevision)`

`PendingCommentMutation(requestId, postId, localCommentId, body, status, createdAt, retryCount)`

## 3. API

- fetch comments with cursor + limit;
- create comment with client request/idempotency ID;
- response returns canonical server comment.

## 4. State ownership

Screen state holder owns:
- rendered comments;
- initial refresh state;
- next-page state;
- compose-input state;
- connectivity-facing status.

Repository/data layer owns:
- local comment persistence;
- cursor persistence if required;
- pending mutation queue;
- remote synchronization.

## 5. Read path

1. Observe cached/local comments.
2. Refresh remote when freshness policy requires.
3. Merge/upsert by ID/revision.
4. Publish updated local view.
5. Load next page when prefetch threshold is crossed.

## 6. Write path

1. Create local pending comment + request ID.
2. Render immediately as pending.
3. If online, send; if offline, queue.
4. On server success, replace/merge local placeholder with canonical record.
5. On transient failure, backoff and retry within budget.
6. On terminal failure, mark failed and expose retry/delete action.

## 7. Tradeoff

**Decision:** optimistic write.

**Why:** comment UX benefits from immediate feedback and product explicitly requires offline posting.

**Cost:** mutation queue, reconciliation, duplicate prevention, failure UI.

**Alternative:** pessimistic post after server confirmation.

**Switch:** use pessimistic path if server validation/risk makes local provisional state misleading or dangerous.

## 8. Tests

- offline post survives restart;
- duplicate retry does not duplicate server comment;
- pending→confirmed transition;
- pending→failed→manual retry;
- refresh overlaps with next-page load;
- server canonical data replaces local provisional values.
