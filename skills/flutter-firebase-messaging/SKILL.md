---
name: flutter-firebase-messaging
description: Use when adding, configuring, reviewing, debugging, migrating, or optimizing Firebase Cloud Messaging in a Flutter app with FlutterFire firebase_messaging. Covers permissions, registration tokens, foreground and background handling, notification taps and routing, Android channels and priority, APNs, macOS, Web Push service workers, topics, backend registration, reliability, security, and release validation. Trigger on Flutter FCM, firebase_messaging, getToken, onTokenRefresh, onMessage, onBackgroundMessage, getInitialMessage, onMessageOpenedApp, notification permission, duplicate notifications, or push failures. Do not use for generic Firebase Admin SDK, APNs, local-notification, or service-worker work unless it directly affects FlutterFire messaging.
---

# Flutter Firebase Messaging

Build or repair production Firebase Messaging integrations without importing stale native or Web assumptions into FlutterFire.

## Workflow

1. Inspect before editing:
   - Read `pubspec.yaml`, `pubspec.lock`, Flutter/Dart constraints, and the installed `firebase_messaging` changelog.
   - Identify every supported platform and inspect its existing Firebase/native configuration.
   - Search every messaging listener, token call, background handler, permission request, topic operation, payload parser, presentation path, and notification route.
   - Identify the trusted sender, payload schema, backend registration model, permission UX, and reliability assumptions.
2. Read the relevant sections of `references/production-guide.md`. Use `rg -n '^#|^##' references/production-guide.md` to locate sections; do not load the entire reference when a focused section is sufficient.
3. Revalidate version-sensitive facts against current official FlutterFire, Firebase, Android, Apple, or Flutter documentation before relying on them. Prefer installed package source and current official documentation over the reference when they conflict.
4. Fix the shared root cause with the smallest complete change. Reuse the application's existing lifecycle, routing, persistence, authentication, and networking patterns.
5. Validate the affected lifecycle on every supported platform, including release mode where background execution or tree shaking matters.

## Reference Routing

- For architecture or implementation: read `Core Principles`, `Recommended Architecture`, `Initialization`, and `Production Decision Rules`.
- For permissions or consent: read `Permission Handling` and `Privacy-Aware Auto Initialization`.
- For tokens and accounts: read `Token and Registration Management` and the backend registration sections.
- For callbacks or routing: read the foreground, background, interaction, payload, deduplication, and navigation sections.
- For Android: read the Android permission, channel, priority, Doze, and release-handler sections.
- For iOS or macOS: read the APNs, capabilities, swizzling, UIScene, foreground presentation, and initial-message sections.
- For Web: read the Web capability, VAPID, service-worker, routing, topic, and token-reconciliation sections.
- For review or debugging: use `Code Review Checklist`, anti-patterns, `Version Sensitivity`, and `Release Validation`.
- For security or sending: read the payload, trusted backend, HTTP v1, authorization, topic, logging, and deep-link sections.

## Non-Negotiable Rules

- Treat FCM as a delivery hint, not durable business state or a guaranteed job queue.
- Keep server credentials and send authorization out of the Flutter client.
- Treat payload data and notification routes as untrusted input; authenticate and authorize before protected navigation or mutation.
- Register application-wide listeners once. Never add listeners in widget `build()` methods.
- Keep native background handlers top-level, annotated with `@pragma('vm:entry-point')`, short, idempotent, isolate-safe, and free of UI or navigation work.
- Request notification permission contextually. Do not let startup token retrieval become accidental permission UX.
- Treat registration tokens as rotating installation routes, not user identities. Make backend association and refresh synchronization idempotent.
- Separate message receipt deduplication from notification-interaction deduplication.
- Avoid duplicate presentation when the OS already displays a notification payload.
- Use topics for broadcast segmentation, never authorization.
- Design Web separately: do not assume native background handlers, token-refresh streams, tap APIs, or client topic APIs work there.
- Preserve standard FlutterFire Apple swizzling unless current FlutterFire documentation explicitly supports the intended alternative.
- Use high-priority Android delivery only for time-sensitive, user-visible notifications.

## Output Expectations

When implementing, make the smallest reviewable diff and add one focused runnable check for non-trivial parsing, routing, registration, or deduplication logic. When reviewing, report findings by severity with exact file and line locations, then list validation gaps. State any platform or version behavior that still requires a physical-device, release-build, or deployed-HTTPS test.

## Examples

Should trigger:

- "Add Firebase push notifications to this Flutter app."
- "Why does `onBackgroundMessage` work in debug but fail in release?"
- "Review our FCM token refresh and logout handling."
- "Fix duplicate notifications and cold-start routing on iOS."
- "Configure Flutter Web messaging with a service worker and VAPID key."

Should not trigger:

- "Send an FCM message from a Node Admin SDK backend" unless Flutter payload compatibility is part of the request.
- "Schedule a local notification with flutter_local_notifications" unless it is the presentation layer for an FCM flow.
- "Explain APNs token authentication" unless it is configuring FlutterFire messaging.
