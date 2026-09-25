# 12 Proxy · p233

**Core idea:** Give clients a stand-in with the service's contract; the stand-in controls when and whether a request reaches the service.

**Apply when:** Access control, lazy initialization, remote communication, caching, logging, or service lifecycle must be handled at the service boundary. Specify what happens when the service is unavailable and whether the proxy owns its lifecycle (pp241–243).

**Book example:** A proxy around a video service caches responses to repeated video requests while clients keep using the same video-service interface (pp237–240).

**Cost and alternative:** Extra indirection can add latency and state to manage. A direct service call is simpler without a real control need. Adapter changes the service contract; Decorator composes optional behavior and is normally assembled by the client, whereas a proxy commonly manages its underlying service (pp243–245).
