# CollabArch — Technical Architecture & Engineering Specifications

This document outlines the core distributed systems architecture, state synchronization protocol, and simulation engine powering CollabArch.

---

## 1. Collaborative State Management (CRDTs)

### Problem Definition
Collaborative diagramming environments suffer from concurrent edit anomalies:
1. **Move Conflicts**: Two users dragging the same component simultaneously to different coordinates.
2. **Topology Mutations**: User A deleting a service while User B connects an edge to it.
3. **Partition Divergence**: Users continuing to edit during temporary network drops.

Traditional Last-Write-Wins (LWW) mechanisms based on wall-clock timestamps cause data clobbering, lost edits, and phantom connections.

### Yjs Data Model Design
CollabArch models canvas state as a single decentralized `Y.Doc`:

```typescript
// Shared Types Representation
const yDoc = new Y.Doc();

// Shared Maps for Graph Topology
const yNodes = yDoc.getMap<CanvasNode>('nodes');
const yEdges = yDoc.getMap<CanvasEdge>('edges');

// Node Schema in CRDT
interface CanvasNode {
  id: string;
  type: 'api-gateway' | 'service' | 'database' | 'queue';
  position: { x: number; y: number };
  data: {
    label: string;
    capacityRps: number;
    latencyMs: number;
    queueDepthLimit: number;
    failureRate: number; // 0.0 - 1.0
  };
}
```

### Convergence & Update Propagation
* **Binary Updates**: State changes are encoded as compact byte arrays (`Uint8Array`) using `Y.encodeStateAsUpdate(yDoc)` and `Y.applyUpdate(yDoc, update)`.
* **Commutativity**: Updates are order-independent and deterministic. Replicas reach Strong Eventual Consistency (SEC) once all updates have been received.
* **Presence & Awareness**: User cursors, usernames, and active selections are handled via the `y-protocols/awareness` protocol, transmitted over ephemeral sub-channels without polluting the persistent document history.

---

## 2. Distributed Real-Time Gateway & WebSocket Clustering

### Scalability Bottleneck
A single WebSocket server is constrained by OS file descriptor limits and memory per connection. Furthermore, WebSocket connections are stateful; clients in the same canvas room may terminate their TCP connections on different physical server instances behind a layer 4/7 load balancer.

### Clustered Redis Pub/Sub Backplane
To decouple connection affinity from room-level broadcasts:

```text
[ Client 1 ] ---> (WS) ---> [ Gateway Node A ] ---\
                                                   |---> [ Redis: room:123 ]
[ Client 2 ] ---> (WS) ---> [ Gateway Node B ] ---/         |
                                                           | (Fan-out)
                                                           v
                                                  All Nodes Hosting Room 123
```

1. **Room Ingress**: When Client 1 dispatches a binary update to Node A:
   - Node A writes the update locally to its in-memory room doc cache.
   - Node A publishes the binary payload to Redis channel `collabarch:room:<roomId>:updates`.
2. **Egress Distribution**: Node B, having subscribed to `collabarch:room:<roomId>:updates` when Client 2 connected, receives the Redis message and forwards it directly to Client 2 over its existing WebSocket connection.
3. **Connection Lifecycle**:
   - On zero connections for a room on a given node, the node unsubscribes from that room's Redis channel to prevent unnecessary memory and CPU overhead.

---

## 3. Storage & Debounced Persistence Strategy

To prevent database write amplification from high-frequency mouse movements and rapid edits:

1. **In-Memory Buffer**: The WebSocket Gateway maintains an active `Y.Doc` representation in memory for active rooms.
2. **Debounced Flush**: A debounced persistence job (e.g., 5-second idle or max 30-second window) encodes the merged `Y.Doc` state into a single binary blob:
   ```typescript
   const snapshot = Buffer.from(Y.encodeStateAsUpdate(roomDoc));
   await prisma.canvasRoom.update({
     where: { id: roomId },
     data: {
       documentBlob: snapshot,
       updatedAt: new Date(),
     },
   });
   ```
3. **Cold Start Rehydration**: When a client requests a room with no active gateway instance, the server fetches the binary snapshot from PostgreSQL, initializes a fresh in-memory `Y.Doc`, and streams it down as the base state vector.

---

## 4. Offline-First Resilience (IndexedDB Sync)

```text
+-------------------------------------------------------------+
| Browser Storage & Memory                                    |
|                                                             |
|   [ React Flow Canvas ] <---> [ In-Memory Y.Doc ]           |
|                                     |                       |
|                   +-----------------+-----------------+     |
|                   |                                   |     |
|                   v                                   v     |
|         [ y-indexeddb Provider ]             [ y-websocket ] |
+-------------------|-----------------------------------|-----+
                    v                                   v
             [ IndexedDB ]                         (Internet)
             Local Persistence                      WebSocket
```

1. **Local-First Writes**: Every edit is immediately committed to IndexedDB locally via `y-indexeddb`. The canvas operates fully without network connectivity.
2. **Delta Reconnection Protocol**:
   - Upon reconnecting, the client and server exchange state vectors (`Y.encodeStateVector`).
   - Only missing updates are computed and transmitted:
     ```typescript
     // Send state vector, receive only the delta
     const localVector = Y.encodeStateVector(localDoc);
     // Remote computes: Y.encodeStateAsUpdate(remoteDoc, localVector)
     ```
   - This eliminates bandwidth bloat and guarantees instant, conflict-free reconciliation.

---

## 5. Discrete-Event Traffic Simulation Engine

### Mathematical Modeling
The simulation engine models the architecture canvas as a Directed Acyclic Graph (DAG) $G = (V, E)$, evaluating queue dynamics and network latency:

1. **Traffic Generator (Source Nodes)**: Emits requests following a Poisson arrival process or uniform burst distribution ($R$ requests/second).
2. **Service Capacity & Processing**: Each node $v \in V$ processes traffic at service rate $\mu_v$.
   - Service time is modeled with standard deviation: $T_{\text{proc}} \sim \mathcal{N}(\mu, \sigma^2)$.
3. **Queue Dynamics & Buffer Bloat**:
   - Arriving requests fill a FIFO buffer of max depth $Q_{\max}$.
   - If buffer is full ($Q_{\text{current}} \ge Q_{\max}$), incoming packets trigger **drop-tail packet loss**.
4. **Visual Loop**: A decoupled `requestAnimationFrame` loop translates simulation packet coordinates along React Flow SVG edge paths, color-coding packets by latency and status (green = healthy, amber = queuing/slow, red = dropped/5xx).
