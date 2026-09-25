# Gap Report

## 1. Fourteen channel titles not reliably inventoried

The current channel index reported 47 videos, while 33 channel-owned titles were reliably surfaced in search results during this pass. The remaining 14 are **unknown/unverified**, not silently omitted as irrelevant.

### Required future action

When direct channel listing becomes accessible:
1. export all 47 titles/URLs/playlists;
2. diff against `video-knowledge-index.md`;
3. add missing entries before claiming full inventory coverage.

---

## 2. Most full YouTube transcripts were inaccessible

Direct YouTube page fetching was intermittently throttled. Search results exposed descriptions and chapter snippets but generally not full captions.

### Impact

For D2 videos, this package cannot safely claim:
- exact code shown;
- precise verbal heuristics;
- detailed tradeoff conclusions;
- complete mistakes lists;
- timestamped opinions beyond surfaced chapters.

### Future action

For each D2 technical video, obtain transcript/captions, then populate:
- concepts;
- detailed notes;
- code/data/control flow;
- architecture decisions;
- heuristics;
- timestamped traceability.

---

## 3. Playlists beyond Mobile System Design were not comprehensively enumerated

A Mobile System Design playlist was directly surfaced. A complete playlist inventory was not reliably available through the accessible channel page.

---

## 4. Linked source repositories/code were not comprehensively verified

The user brief asks to inspect linked repositories/code. Search surfaced third-party Mobile System Design exercise repositories, but they were not assumed to be Andrey-authored unless clearly verified. No external repository content is attributed to the channel in the skill.

---

## 5. Detailed framework-specific state-management positions are incomplete

The course/topic inventory names MVC/MVP/MVVM/MVI, state management, architecture, DI, and design patterns, but full lesson transcripts were unavailable. Therefore this skill compares patterns using general decision criteria and does not falsely declare a creator-preferred universal pattern.

---

## 6. Testing/security/observability details are mostly scope-level

The current mind-map/course confirms these domains are in scope, but accessible detailed teaching was insufficient. Concrete implementation recommendations are marked **S**.

---

## 7. Potentially outdated APIs/practices

Several videos span multiple years. Without full transcripts, specific APIs cannot be exhaustively version-audited. Current Android official architecture guidance was checked only as supplemental context. No old API is silently upgraded and attributed back to the creator.

---

# Rule for future updates

Never “fill” a gap by changing its evidence grade. Add a new source, timestamp, and date, then promote D2 → D1 only when transcript-level evidence was actually inspected.
