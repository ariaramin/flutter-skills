# Performance & Optimization

## Channel-supported evidence

- Facebook requirements include low latency/data efficiency [D1].
- Candidate uses client caching/CDN awareness and receives positive feedback [D1].
- Instructor feedback explicitly suggests feed **prefetching** [D1].
- Mind-map includes Performance & Optimization [C].
- File Downloader addresses resumable/background large transfer concerns [D2].

## Performance workflow [D1/C/S]

1. State the user-visible metric: startup, screen-ready, scroll smoothness, media time-to-display, mutation feedback latency.
2. Identify critical path.
3. Measure/estimate the bottleneck.
4. Apply the narrowest lever.
5. Re-measure and document resource tradeoff.

## Large-list/feed strategy [D1/S]

- paginate;
- prefetch before end-of-list if budget permits;
- deduplicate page results;
- avoid re-render/recompute of unchanged items;
- cache media and request display-appropriate sizes;
- cancel obsolete prefetch when navigation/query changes.

## Cache tiers [D1/S]

Potential tiers:
- in-memory object cache;
- local database;
- file/media cache;
- HTTP/CDN cache.

Each tier trades latency against memory/storage/staleness/complexity. Do not add every tier by default.

## Network/data efficiency [D1/C/S]

For global/mobile networks consider:
- page/batch sizes;
- compressed payloads;
- incremental sync;
- media sizing/encoding;
- avoiding redundant polling;
- offline cache;
- request coalescing/deduplication.

## Background/media transfer [D2/S]

For large downloads:
- resume rather than restart where possible;
- preserve task state if the product promises background continuity;
- validate final file;
- respect platform/network/power policies.

## Performance anti-patterns

- “prefetch everything” without data/battery budget;
- memory cache with unbounded growth;
- fetching entire collections before render;
- decoding full-resolution media for thumbnails;
- retries that increase load during outages;
- synchronous disk/network work on UI thread [S].
