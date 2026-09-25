# Source & Traceability Index

Research date: **2026-08-19**.

## Primary channel

- Andrey Tech: `https://www.youtube.com/@andrey_tech`
- Channel search index reported 47 videos during this pass.
- YouTube direct page fetches were intermittently throttled, so accessible search metadata/descriptions/chapters were used where full transcripts were unavailable.

## Instructor-authored companion sources [C]

### Mobile System Design Interview Blueprint
`https://andrey-tech.com/mobile-system-design-course`

Accessible curriculum:
- Welcome / practice / interview blueprint / evaluation
- Design News Feed App
- App Architecture Fundamentals
- SOLID Principles
- System Design Diagrams
- Design Messenger App
- MVC vs MVP vs MVVM vs MVI
- API Communication Protocols
- Real-Time Updates
- Design Flight Booking App
- REST API Design
- Authentication
- Design Image Loading Library
- Dependency Injection & Testing
- Data Storage Types Compared
- Design ChatGPT App
- App Navigation
- Gang of Four Design Patterns

Page states 5 real interview problems and 21 lessons and names API design, pagination, caching, state management, app design, and SDK/library design as key outcomes.

### Mobile System Design Knowledge Mind Map
`https://andrey-tech.com/mindmap`

Accessible top-level areas:
- Mobile Domain Knowledge
- API Design & Networking
- Software Architecture & Design Patterns
- Data Storage
- Performance & Optimization
- Privacy & Security
- Observability & Testing
- Advanced Topics
- Interview Strategy

---

# Timestamped direct-transcript evidence [D1]

## Lead Android Engineer Mock Interview – Facebook App System Design
YouTube: `https://www.youtube.com/watch?v=-LWWvZksPp8`

Accessible transcript mirror: `https://sozai.app/transcript/lead-android-engineer-mock-interview-facebook-app-design/`

Transcript mirror identifies Andrey Tech, duration 53:08, and provides the full timestamped transcript.

| Timestamp | Concept | Evidence use |
|---|---|---|
| 02:00–09:47 | Clarifying questions; functional/nonfunctional/out-of-scope; global/offline/data efficiency/sync | Requirements-first architecture |
| 10:25–11:56 | REST/HTTP baseline; SSE/WebSockets/gRPC alternatives; JSON | Protocol tradeoffs |
| 12:11–14:53 | Pagination contract; cursor selection; before/after semantics | Cursor pagination |
| ~16:07 onward | Client/data-model discussion | Contract-before-architecture sequence |
| ~35:50–37:00 | Repository read path across local/DB/remote; hydration/cache | Data-layer policy |
| 38:07–41:16 | Optimistic updates; backend authority; pending user interactions | Offline/sync |
| ~43:50–45:33 | Bounded retries, exponential backoff, user-facing failures | Reliability |
| 45:47–46:40 | Navigation/router/backstack; pass post ID | Navigation boundary |
| 46:57–49:26 | Multi-module discussion, feature/library modules, contracts | Modularity (candidate solution) |
| 50:06–52:56 | Instructor feedback | Directly endorsed signals: requirements organization, REST+cursor+alternatives, caching, DI, repository, presentation/domain/data layers, optimistic offline behavior, retry deep dive, communication; missed prefetch discussion |

**Attribution caution:** Many design statements before 49:26 come from the interview candidate. Treat instructor feedback at 50:06–52:56 as the clearest evidence of what Andrey explicitly evaluated positively.

---

# Direct video metadata/chapter evidence [D2]

## Top 5 Mobile System Design Concepts Explained
`https://www.youtube.com/watch?v=BiTG81puzt8`
- description: detailed topics with pros/cons/examples to build mobile-architecture foundation;
- surfaced chapter snippets include Storage 14:15, Pagination 20:22, Dependency Injection.

## API Pagination in System Design Interviews
`https://www.youtube.com/watch?v=5qTb7RTjWXs`
- surfaced chapters: pagination overview; Offset-based pagination 2:27; Cursor-based pagination 6:07; How to choose 10:00.

## REST API Explained for Mobile Engineers
`https://www.youtube.com/watch?v=DQ6As8CQS74`
- description exposes REST statelessness as a key principle.

## WebSockets Explained Simply
`https://www.youtube.com/watch?v=K-fAG2KPd-s`
- description compares WebSockets with HTTP polling, long polling, SSE.

## GraphQL vs REST
`https://www.youtube.com/watch?v=AfZj85taUwg`
- comparison topic; surfaced metadata mentions Apollo ecosystem support around caching/pagination/type-safe models.

## How to Build a File Downloader
`https://www.youtube.com/watch?v=t1ulqa7oAKg`
- chapters surfaced: 0:00 Intro; 0:25 Functional Requirements; 1:44 How to Design a Library; High-Level Architecture; 12:12 How Resumable Downloads Work; 14:27 Step-by-Step Download Flow; 16:45 Handling Background Downloads.

## Design Messenger
`https://www.youtube.com/watch?v=m6ab37t2ypQ`
- chapters surfaced: 0:00 Intro; 2:05 Gathering Requirements; 7:30 Data Model; 22:40 API ...
- description surfaced REST API, WebSockets, iOS app architecture.

## Design Story Viewer
`https://www.youtube.com/watch?v=N5zXmp2FJgc`
- chapters surfaced: 0:00 Intro & Requirements; 1:15 Plan; 1:44 Data Model; 2:24 API; 7:04 UI ...

## Design YouTube App
`https://www.youtube.com/watch?v=kiRSQAlUsn8`
- chapters surfaced: 0:00 Intro; 0:31 Requirements; 2:33 API & Data Model; 5:03 ...

## Spotify Mock Interview
`https://www.youtube.com/watch?v=7To_oZqqWis`
- chapters surfaced: 0:00 Intro; 1:12 Gathering Requirements; 7:12 API & Data Model; 26:08 High Level Design; 44:48 Follow-up Questions; 1:04:45 My Feedback.

## Hotel Booking Mock Interview
`https://www.youtube.com/watch?v=3q2qs46ubUg`
- chapters surfaced: 0:00 Intro; 0:34 Requirements; 8:15 API & Data Model; 32:06 High Level Design; 38:41 Payment ...

## Facebook Mock Interview
`https://www.youtube.com/watch?v=-LWWvZksPp8`
- YouTube chapter metadata begins 0:00 Intro; 1:07 Gathering Requirements; 6:35 API & Data ...
- upgraded to D1 because a full transcript mirror was accessible.

## SOLID principles explained with iOS examples
`https://www.youtube.com/watch?v=yM-GVpfSGiE`
- description explicitly covers SOLID with iOS examples and surfaced metadata includes Dependency Inversion.

## iOS Architecture in the Era of SwiftUI
`https://www.youtube.com/watch?v=fiqpzk-4eaM`
- description: MVC, MVVM, modern patterns such as Clean Architecture in the SwiftUI/Compose era.

## What You Need to Know for Mobile System Design
`https://www.youtube.com/watch?v=BDrTANs3A9Q`
- chapters surfaced: 0:00 Intro; 0:36 Presenting the Mind Map; 1:54 How to use the Mind Map ...

---

# Supplemental current-source validation [S]

Android's official architecture guide was checked separately for current context (2026), not as evidence of what Andrey said. See `supplemental-current-practices.md`.
