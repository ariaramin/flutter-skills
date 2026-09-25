# Video-by-Video Knowledge Index

## Evidence key

- **D1** full/substantial timestamped transcript inspected.
- **D2** direct YouTube title/description/chapter metadata inspected.
- **M** metadata/title surfaced, but not enough content for technical extraction.
- **U** unverified/not reliably indexed in this research pass.

The channel search index reported **47 videos** at research time. The table below records only titles reliably surfaced as belonging to Andrey Tech. Missing titles are explicitly acknowledged in `gap-report.md`.

| # | Video | ID | Evidence | Extractable knowledge |
|---|---|---|---|---|
| 1 | Google's Recommended App Architecture Explained (Android & iOS) | `Nism7uG2QpU` | D2 | Layered/recommended app architecture topic; current details must not be inferred beyond exposed material. |
| 2 | iOS Architecture in the Era of SwiftUI | `fiqpzk-4eaM` | D2 | MVC, MVVM, modern patterns including Clean Architecture in SwiftUI-era context. |
| 3 | Top 5 Mobile System Design Concepts Explained | `BiTG81puzt8` | D2 | Pros/cons/examples; surfaced chapters include storage, pagination, DI. |
| 4 | Introduction to Mobile System Design | `W0KNQuMka-Q` | D2 | Foundational framing of mobile system design. |
| 5 | Mobile System Design Interview Guide | `T9I4AGvUWDE` | D2 | Interview structure/approach. |
| 6 | What You Need to Know for Mobile System Design (free mind map) | `BDrTANs3A9Q` | D2 | Knowledge-map organization and how to use it. |
| 7 | 4 Common Mistakes in Mobile System Design Interviews | `TP5mCDConxI` | D2 | First exposed mistake: failing to ask questions; remaining exact mistake titles unavailable in this pass. |
| 8 | API Pagination in System Design Interviews | `5qTb7RTjWXs` | D2 | Offset pagination, cursor pagination, selection criteria. |
| 9 | REST API Explained for Mobile Engineers (by Ex-Meta Lead Engineer) | `DQ6As8CQS74` | D2 | REST statelessness and mobile-oriented REST fundamentals. |
| 10 | GraphQL vs REST: What Mobile Engineers Need to Know | `AfZj85taUwg` | D2 | REST/GraphQL comparison; Apollo/caching/pagination/type-safe model ecosystem mentioned in surfaced metadata. |
| 11 | WebSockets Explained Simply - by Ex-Meta Lead Engineer | `K-fAG2KPd-s` | D2 | WebSockets compared with polling, long polling, SSE. |
| 12 | Dependency Injection in iOS Explained (with SwiftUI) | `U2GTVieDCXw` | D2 | DI in iOS/SwiftUI with code example. |
| 13 | SOLID principles explained with iOS examples | `yM-GVpfSGiE` | D2 | SOLID, including Dependency Inversion, via iOS examples. |
| 14 | How to Build a File Downloader - Mobile System Design | `t1ulqa7oAKg` | D2 | Requirements, library design, architecture, resumable flow, background downloads. |
| 15 | Mobile System Design - Design YouTube App | `kiRSQAlUsn8` | D2 | Requirements → API/data model → architecture flow. |
| 16 | Design Story Viewer - iOS System Design Interview | `N5zXmp2FJgc` | D2 | Requirements → plan → data model → API → UI. |
| 17 | Senior iOS Engineer Mock Interview - Spotify App System Design | `7To_oZqqWis` | D2 | Requirements → API/data model → high-level design → follow-ups → feedback. |
| 18 | Senior iOS Engineer Mock Interview - Hotel Booking System Design | `3q2qs46ubUg` | D2 | Requirements → API/data model → high-level design; payment deep dive. |
| 19 | Design Uber Eats - iOS System Design Interview | `SbXDhAKgWek` | D2 | Requirements-first system-design exercise; exact full content unavailable. |
| 20 | Lead Android Engineer Mock Interview – Facebook App System Design | `-LWWvZksPp8` | **D1** | Full transcript: feed requirements, scale/offline, REST, cursor pagination, layers/repositories, caching, optimistic writes, retry/backoff, navigation, modularization, instructor feedback. |
| 21 | Lead Android Engineer Mock Interview – Stock Trading App System Design | `aInrHw_CjqE` | D2 | Requirements → API/data model; full deep dives unavailable. |
| 22 | Design Messenger - Mobile System Design Mock Interview | `m6ab37t2ypQ` | D2 | Requirements, data model, REST API/WebSockets, iOS architecture. |
| 23 | Top 5 iOS Coding Interview Types (and How to Prepare) | `IyyVGRHxfpY` | D2 | Interview format/prep context, not core architecture knowledge. |
| 24 | How Mobile Engineers Get Promoted: Scope, Impact, Autonomy | `-AxlG4J-ziQ` | M | Career/seniority context. |
| 25 | Meta Software Engineer Interview Experience | `AVcsca-zap8` | M | Interview experience. |
| 26 | What's it Really Like to Work at Meta - Pros & Cons | `f_HW7ou070g` | M | Career/company context. |
| 27 | Relocation to London as a Software Engineer | `keHJh0xkZUs` | M | Career context. |
| 28 | Why Tech Interviews Feel Harder Than Ever | `11W4I18gn44` | M | Interview-market context. |
| 29 | How I learned to code (and make iOS apps) | `nO7kH1_efPg` | M | Learning/career context. |
| 30 | Behavioral Interview: Full Preparation Guide for Software Engineers | `oNf5L0nvHpk` | M | Behavioral interview context. |
| 31 | How to Crack Microsoft Interviews & Grow to Senior Engineer | `hDcWRMP0tNY` | M | Career/interview context. |
| 32 | Spotify Staff Software Engineer Interview Revealed | `5Hx8pJVmSlM` | M | Staff interview context. |
| 33 | Uber's Staff Software Engineer Interview Exposed | `RWP9Zmhyv_Q` | M | Staff interview context. |

## Detailed notes: Lead Android Engineer Mock Interview — Facebook App [D1]

**Problem:** Facebook-like feed with feed/detail screens, mixed post media, likes/comments, infinite scroll, global audience, offline viewing and offline interactions.

**Requirements behavior:**
- Candidate explicitly asks clarifying questions before design.
- Functional, nonfunctional, and out-of-scope items are separated.
- Scale and global network variation drive offline/data-efficiency concerns.

**API/data decisions:**
- REST/HTTP + JSON selected as practical baseline; SSE/WebSockets/gRPC are acknowledged alternatives for server-initiated/realtime behavior.
- Cursor pagination chosen for a changing feed; cursor is backend-provided, with before/after direction metadata.
- Media URLs are simplified because server-side processing/encoding is assumed in scope.

**Client architecture:**
- Repositories sit between UI/use-case flow and local/remote data sources.
- One relational local database with multiple tables is argued to simplify relationships and consistency.
- A read flow is described as memory/store → DB → remote; remote results hydrate local DB/cache before surfacing.
- Instructor feedback positively calls out repository pattern, dependency injection, and presentation/domain/data layering.

**Offline/sync:**
- Likes/comments can be optimistic.
- Pending user interactions carry identity/type/status/timestamp-like data.
- Local writes are reconciled with backend; backend is described as authoritative in this candidate solution.
- Terminal failure should be visible to the user rather than silently discarded.

**Reliability:**
- Bounded retry with exponential backoff is discussed to avoid excessive traffic/rate limits.
- Network/HTTP failures are mapped to explicit UI status/banner behavior.

**Navigation:**
- Screen transition passes a stable post ID to a navigation/router component with back stack, rather than treating navigation as raw object transfer.

**Modularity:**
- Candidate argues for feature/library modules and interface contracts at scale to support team parallelism/onboarding; this is a demonstrated solution, not a verified universal instructor rule.

**Instructor feedback:**
- Strong: requirements organization, working solution, REST + cursor pagination + alternatives, caching/CDN awareness, DI, repository, three-layer architecture, offline optimistic updates, retry/error deep dive, communication/tradeoffs.
- Improvement: discuss feed **prefetching** for infinite scrolling.

## Important attribution rule

For videos with D2 only, this index records **topics and exposed chapter structure**, not detailed teachings that could only be known from a transcript. Do not inflate D2 into D1.
