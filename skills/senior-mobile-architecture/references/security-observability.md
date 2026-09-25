# Security, Privacy & Observability

## Evidence status

Andrey's mind-map explicitly lists **Privacy & Security** and **Observability & Testing** as core mobile-system-design areas [C]. Facebook mock excludes auth from the main problem but uses bearer-token identity in API discussion [D1]. Detailed security/observability lesson transcripts were not accessible, so implementation detail here is **S — supplemental**.

## Security questions [C/S]

- What sensitive data is stored locally?
- What must be encrypted/protected by platform facilities?
- What credentials/tokens exist and where are they kept?
- What data should never enter logs/analytics?
- What can be cached and for how long?
- Are deep links/navigation arguments trustworthy?
- Are backend authorization checks independent of client UI restrictions?
- Are API version/auth-refresh flows backward compatible?

## Privacy [C/S]

- minimize collected/stored data;
- define retention/deletion behavior;
- avoid persisting sensitive payloads only for convenience;
- redact logs/crash breadcrumbs;
- treat screenshots/clipboard/notifications as possible data-exposure surfaces where relevant.

## Observability [C/S]

Instrument architectural seams rather than random logs:
- request latency/error class;
- cache hit/miss/staleness;
- pagination failures/duplicate rate;
- pending mutation age/retry count;
- sync conflicts;
- offline duration;
- background task success/failure;
- startup/screen-ready performance.

## Debuggable identifiers [S]

Use correlation/request/mutation IDs so a local optimistic action can be traced through queue → network → server response without logging sensitive payloads.
