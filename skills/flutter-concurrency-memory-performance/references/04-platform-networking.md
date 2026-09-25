# Platform Background Behavior, Networking & Work Shaping

Source-preserving excerpt from the uploaded production skill. Use this file when the core `SKILL.md` routes to this topic.

## Table of contents
- [Background Execution by Platform](#background-execution-by-platform)
  - [Android](#android)
  - [iOS](#ios)
  - [macOS](#macos)
  - [Windows](#windows)
  - [Linux](#linux)
  - [Web](#web)
- [Networking Efficiency](#networking-efficiency)
  - [In-flight deduplication pattern](#in-flight-deduplication-pattern)
- [Debounce, Throttle, Coalesce](#debounce-throttle-coalesce)
- [Resource Pools](#resource-pools)

---

# Background Execution by Platform

## Android

Do not imply that an isolate lets Flutter run arbitrary code indefinitely in the background.

Android imposes version-dependent background and foreground-service restrictions. Use appropriate Android scheduling/background APIs or a vetted plugin that wraps them when work must survive foreground transitions, process death, or reboot.

Optimize for:

- device-dependent memory limits
- constrained/low-memory devices
- foreground-service restrictions
- bounded jobs
- network batching
- event-driven updates rather than polling

## iOS

iOS usually suspends ordinary apps after backgrounding unless a permitted background mechanism applies.

Use the correct platform mechanism for the workload, such as system-scheduled background tasks or supported foreground-initiated continued processing. Do not model a long-lived Dart isolate as an unrestricted daemon.

Memory limits are device/condition dependent, and memory pressure can lead to process termination.

## macOS

Treat macOS as a potentially long-lived process:

- prevent hours-long cache/subscription growth
- release screen/session resources
- reduce hidden/background work
- respect App Nap and power constraints
- manage native Cocoa/FFI/plugin resources

## Windows

Treat Windows Flutter as a potentially long-running Win32 process:

- control background CPU
- avoid timer/poll loops when hidden
- release native handles/resources
- monitor working set over long scenarios
- validate high-refresh/high-DPI paths

## Linux

Treat Linux as a long-lived desktop process:

- clean GTK/plugin/FFI resources
- close native handles
- bound caches/workers
- suspend unnecessary hidden-window activity
- test relevant distribution/device configuration

Current Linux Flutter also uses the merged UI/platform-thread model since stable 3.41.

## Web

See the dedicated Web section. No Dart isolates. Respect browser lifecycle, memory constraints, and main-thread execution.

---

# Networking Efficiency

Before optimizing HTTP CPU code, look for avoidable network work.

Audit:

- duplicate requests
- concurrent equivalent requests
- repeated pagination pages
- overfetching
- overly frequent refresh
- retry storms
- cache misses
- repeated authentication refresh
- unnecessarily large responses

## In-flight deduplication pattern

For idempotent keyed requests:

1. compute canonical request key
2. check valid cache
3. check in-flight map
4. if present, share/await existing Future
5. otherwise create request and store it
6. remove entry in `finally`
7. store successful result according to cache policy

Define failure semantics so a failed Future does not remain permanently cached unless intentionally negative-cached.

---

# Debounce, Throttle, Coalesce

Typical mapping:

| Scenario | First strategy to evaluate |
|---|---|
| search-as-you-type | debounce + latest generation |
| rapid resize | throttle or coalesce |
| scroll analytics | throttle/batch |
| network refresh button spam | in-flight dedupe |
| worker transform on changing slider | latest-wins/coalesce |
| sensor stream | sampling/throttle if requirements permit |
| repeated identical parsing | memoize/dedupe only if input reuse exists |

Do not hide correctness bugs behind debounce. It is workload shaping, not a concurrency guarantee.

---

# Resource Pools

Pool only expensive, scarce, reusable resources.

Possible candidates:

- worker isolates for repeated CPU tasks
- database connections where the database library requires/benefits from it
- native buffers in a proven hot path
- network clients when their library benefits from persistent connection reuse

Do not pool:

- ordinary Dart model objects by default
- widgets
- cheap temporary Lists merely to avoid GC
- resources the underlying package already pools efficiently

A pool itself needs:

- maximum size
- acquisition timeout
- shutdown
- error handling
- unhealthy-resource replacement
- lifecycle ownership

---
