# 08 Composite · p177

**Core idea:** Give leaves and containers a shared component contract so a client can operate on a whole tree or a single node uniformly.

**Apply when:** Data is recursive and the same operation must work on an individual and a nested group. Define leaf behavior first, let composites hold children and delegate or aggregate recursively. Do not put child-management methods in a common contract if leaves cannot sensibly support them.

**Book example:** An image editor groups dots, circles, and nested graphic groups; drawing a group recursively draws its members (pp184–188).

**Cost and alternative:** A uniform interface can become vague when leaf and container capabilities differ. A plain tree traversal may suffice when clients do not need polymorphic leaf/group use. [Decorator](ch09-decorator.md) wraps one component to add behavior; a Composite holds many children (pp189–190).
