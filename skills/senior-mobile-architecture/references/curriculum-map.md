# Reconstructed Channel Curriculum Map

This order is reconstructed by concept dependency rather than upload order. Evidence grades are defined in `README.md`.

## Track 1 — Learn the mobile-system-design method

1. **Introduction to Mobile System Design** — `W0KNQuMka-Q` [D2]
   - Establishes the mobile-system-design domain.
2. **Mobile System Design Interview Guide** — `T9I4AGvUWDE` [D2]
   - Structured interview approach.
3. **4 Common Mistakes in Mobile System Design Interviews** — `TP5mCDConxI` [D2]
   - Accessible chapter evidence includes “Mistake 1: Failing to Ask Questions.”
4. **What You Need to Know for Mobile System Design (free mind map)** — `BDrTANs3A9Q` [D2/C]
   - Chapters surfaced: Intro → presenting mind map → how to use mind map.
5. Instructor mind-map [C]
   - Mobile Domain Knowledge
   - API Design & Networking
   - Software Architecture & Design Patterns
   - Data Storage
   - Performance & Optimization
   - Privacy & Security
   - Observability & Testing
   - Advanced Topics
   - Interview Strategy

### Learning outcome

Be able to frame requirements, identify constraints, plan the discussion, and organize a mobile design answer before choosing technologies.

---

## Track 2 — Architecture foundations

1. **Top 5 Mobile System Design Concepts Explained** — `BiTG81puzt8` [D2]
   - Description promises pros/cons + examples and a mobile-architecture foundation.
   - Search index exposes chapters including **Storage (14:15)**, **Pagination (20:22)**, and **Dependency Injection**.
2. **Google's Recommended App Architecture Explained (Android & iOS)** — `Nism7uG2QpU` [D2]
3. **iOS Architecture in the Era of SwiftUI** — `fiqpzk-4eaM` [D2]
   - Description explicitly contrasts MVC/MVVM with modern patterns such as Clean Architecture.
4. **SOLID principles explained with iOS examples** — `yM-GVpfSGiE` [D2]
5. **Dependency Injection in iOS Explained (with SwiftUI)** — `U2GTVieDCXw` [D2]

### Companion course reinforcement [C]

Andrey's current course includes:
- App Architecture Fundamentals
- SOLID Principles
- MVC vs MVP vs MVVM vs MVI
- Dependency Injection & Testing
- Gang of Four Design Patterns

### Learning outcome

Understand architecture as responsibility/dependency management, not a collection of names. Compare patterns by state/data-flow ownership and testing/change boundaries.

---

## Track 3 — API design, data movement, and realtime

1. **REST API Explained for Mobile Engineers** — `DQ6As8CQS74` [D2]
   - Creator description emphasizes REST statelessness.
2. **GraphQL vs REST: What Mobile Engineers Need to Know** — `AfZj85taUwg` [D2]
3. **WebSockets Explained Simply** — `K-fAG2KPd-s` [D2]
   - Compares WebSockets with HTTP polling, long polling, and SSE.
4. **API Pagination in System Design Interviews** — `5qTb7RTjWXs` [D2]
   - Chapters surfaced: pagination overview, offset-based, cursor-based, how to choose.
5. **Top 5 Mobile System Design Concepts Explained** — storage/pagination/DI chapters [D2]

### Companion course reinforcement [C]

- API Communication Protocols
- Real-Time Updates
- REST API Design
- Authentication
- Data Storage Types Compared

### Learning outcome

Choose communication and pagination strategies based on access pattern, mutation rate, latency, realtime needs, client complexity, and operational constraints.

---

## Track 4 — Guided system-design exercises

1. **Mobile System Design — Design YouTube App** — `kiRSQAlUsn8` [D2]
   - Chapters begin: Requirements → API & Data Model → ...
2. **Design Story Viewer — iOS System Design Interview** — `N5zXmp2FJgc` [D2]
   - Chapters: Intro & Requirements → Plan → Data Model → API → UI ...
3. **How to Build a File Downloader — Mobile System Design** — `t1ulqa7oAKg` [D2]
   - Chapters include Functional Requirements, How to Design a Library, High-Level Architecture, Resumable Downloads, Step-by-Step Download Flow, Background Downloads.

### Learning outcome

Practice moving from requirements/data contracts to architecture and then to mobile-specific deep dives such as media, background lifecycle, and reusable library APIs.

---

## Track 5 — Mock interviews: apply the method under ambiguity

Recommended order by complexity rather than date:

1. **Design Messenger — Mobile System Design Mock Interview** — `m6ab37t2ypQ` [D2]
   - Requirements → data model → API; description mentions REST/WebSockets and iOS architecture.
2. **Design Uber Eats — iOS System Design Interview** — `SbXDhAKgWek` [D2]
3. **Senior iOS Engineer Mock Interview — Hotel Booking** — `3q2qs46ubUg` [D2]
   - Requirements → API & Data Model → High-Level Design → payment deep dive.
4. **Senior iOS Engineer Mock Interview — Spotify App** — `7To_oZqqWis` [D2]
   - Requirements → API & Data Model → High-Level Design → follow-up questions → instructor feedback.
5. **Lead Android Engineer Mock Interview — Stock Trading App** — `aInrHw_CjqE` [D2]
6. **Lead Android Engineer Mock Interview — Facebook App** — `-LWWvZksPp8` [D1]
   - Full accessible transcript examined. Deep dives include offline interactions, optimistic updates, retry/error policy, navigation, modularization, and feedback.

### Learning outcome

Demonstrate senior signals: problem navigation, complete working design, technical depth, alternatives/tradeoffs, and clear communication.

---

## Track 6 — Career/interview context (secondary to architecture skill)

Relevant for senior-signal framing, not core implementation knowledge:
- **Top 5 iOS Coding Interview Types (and How to Prepare)** — `IyyVGRHxfpY`
- **How Mobile Engineers Get Promoted: Scope, Impact, Autonomy** — `-AxlG4J-ziQ`
- **Meta Software Engineer Interview Experience** — `AVcsca-zap8`
- **Why Tech Interviews Feel Harder Than Ever** — `11W4I18gn44`
- **Behavioral Interview: Full Preparation Guide for Software Engineers** — `oNf5L0nvHpk`
- other career/company interview videos listed in `video-knowledge-index.md`.

---

# Coherent senior curriculum

A practical learning sequence synthesized from the tracks:

1. **Problem framing** — requirements, NFRs, scope.
2. **Mobile constraints** — lifecycle, network, offline, data/battery.
3. **Data/API contracts** — entities, operations, pagination, realtime.
4. **Architecture boundaries** — presentation/domain/data, repositories, DI.
5. **State and synchronization** — ownership, local persistence, optimistic mutations, conflict/retry.
6. **Performance** — caching, prefetching, media/data efficiency.
7. **SDK/library design** — public API, lifecycle, cancellation, background/resume.
8. **Modularity/testability** — contracts and team/codebase scale.
9. **Communication** — alternatives, costs, switch conditions.
10. **Mock practice** — end-to-end design with timed deep dives.
