# 07 Bridge · p162

**Core idea:** Separate an abstraction from an implementation when each has its own variants. Compose one with the other instead of multiplying subclasses across both dimensions.

**Apply when:** The code has two independent axes such as device type and remote-control capabilities. Give each axis its own small contract, then delegate across the bridge. Keep the split only if each axis actually varies or must be extended separately.

**Book example:** Basic and advanced remote controls work with different devices through a device interface, avoiding a remote subclass for every device combination (pp166–172).

**Cost and alternative:** Two hierarchies can overcomplicate one cohesive class. [Adapter](ch06-adapter.md) usually repairs an existing mismatch; Bridge is usually an up-front separation of variation. [Strategy](ch20-strategy.md) focuses on interchangeable algorithms rather than two independent class dimensions (pp173–176).
