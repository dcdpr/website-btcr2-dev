---
title: Diagrams
description: Diagrams of the did:btcr2 architecture, operations, beacons, and data structures.
---

These diagrams show the parts of the [did:btcr2 specification](https://dcdpr.github.io/did-btcr2/) and how they interact.
They do not describe a specific implementation.
The diagrams use the terms of the specification. The [Terminology](https://dcdpr.github.io/did-btcr2/terminology.html)
chapter defines them. If a diagram and the specification do not agree, the specification is correct.

| Page | Diagrams |
|:-----|:---------|
| [Create](/diagrams/create/) | The Create operation and the identifier encoding |
| [Resolve](/diagrams/resolve/) | The Resolve operation and each of its steps |
| [Update and Deactivate](/diagrams/update/) | The Update and Deactivate operations and the Beacon Signal transaction |
| [Beacons](/diagrams/beacons/) | Beacon Types, update aggregation, and SMT proofs |
| [Data](/diagrams/data/) | Data structures, the update hash chain, and update data distribution |

## Architecture

The architecture diagram shows the actors, the four operations, and the systems that they use.
Solid arrows show calls and on-chain data. Dashed arrows show off-chain data.

```mermaid
flowchart TB
  Controller(["DID Controller"])
  RP(["Relying Party"])

  Create["Create<br/>(offline)"]
  Deactivate["Deactivate"]
  Update["Update"]
  Resolve["Resolve"]
  Signer["Signer<br/>(BIP340 Schnorr)"]
  AggService["Aggregation Service"]

  subgraph Beacons["BTCR2 Beacons"]
    Singleton["Singleton Beacon"]
    CASBeacon["CAS Beacon"]
    SMTBeacon["SMT Beacon"]
  end

  Sidecar[/"Sidecar Data"/]
  CAS[("CAS<br/>(IPFS)")]
  BTC[("Bitcoin blockchain")]

  Controller --> Create
  Controller --> Deactivate
  Controller --> Update
  Deactivate -->|"Update with<br/>a fixed patch"| Update
  Update -->|"sign"| Signer
  Update -->|"announce"| Singleton
  Update -->|"announce"| AggService
  AggService --> CASBeacon
  AggService --> SMTBeacon
  Singleton -->|"Beacon Signal"| BTC
  CASBeacon -->|"Beacon Signal"| BTC
  SMTBeacon -->|"Beacon Signal"| BTC
  Controller -.->|"give"| Sidecar
  Controller -.->|"publish<br/>(optional)"| CAS
  Sidecar -.-> RP
  RP -->|"did and<br/>Sidecar Data"| Resolve
  Resolve -->|"find<br/>Beacon Signals"| BTC
  Resolve -.->|"get documents<br/>by hash"| CAS
```

## Protocol layers

The protocol layers diagram groups the parts of did:btcr2 into layers, from the applications down to the Bitcoin
blockchain. Each layer uses the layer below it.

```mermaid
flowchart TB
  L7["<b>Applications</b><br/>Identity wallets<br/>Verifiable Credential issuers and verifiers"]
  L6["<b>DID Resolution</b><br/>resolve(did, resolutionOptions)<br/>versionId, versionTime, minConf (default 6)<br/>DID document metadata:<br/>versionId, confirmations, deactivated"]
  L5["<b>Update authorization</b><br/>BTCR2 Signed Update<br/>Data Integrity Proof (bip340-jcs-2025)<br/>Root Capability: capabilityInvocation, Write<br/>BIP340 Schnorr signature"]
  L4["<b>DID document state</b><br/>Genesis Bytes: public key<br/>or Genesis Document<br/>Initial DID Document, Current DID Document<br/>BTCR2 Unsigned Update: JSON Patch,<br/>sourceHash, targetHash, targetVersionId<br/>JSON Document Hashing: JCS, then SHA-256"]
  L3["<b>Update data distribution (off-chain)</b><br/>Sidecar Data<br/>CAS (IPFS CIDv1, raw)"]
  L2["<b>Beacons</b><br/>Singleton, CAS, and SMT Beacons<br/>Beacon Signal<br/>BTCR2 Update Announcement<br/>Aggregation Cohort (n-of-n MuSig2 example,<br/>optional k-of-n fallback)"]
  L1["<b>Bitcoin</b><br/>Transaction that spends<br/>from a Beacon Address<br/>Last output: OP_RETURN<br/>and 32 Signal Bytes<br/>Block height, mediantime, confirmations<br/>Networks: bitcoin, signet, regtest,<br/>testnet3, testnet4, mutinynet"]

  L7 --> L6 --> L5 --> L4 --> L3 --> L2 --> L1
```

## DID document lifecycle

The state diagram follows one DID document from its creation to its deactivation. A DID starts with offline
creation. Each applied BTCR2 Signed Update makes a new version. Deactivation is permanent.

```mermaid
stateDiagram-v2
    state "secp256k1 public key" as Key
    state "Genesis Document<br/>(id: did:btcr2:_)" as Genesis
    state "Initial DID Document<br/>(version 1)" as Initial
    state "DID document<br/>(version N, N ≥ 2)" as Updated
    state "Deactivated DID document<br/>(deactivated: true)" as Deactivated

    [*] --> Key: Create k1 DID
    [*] --> Genesis: Create x1 DID
    Key --> Initial: Resolve renders the<br/>Initial DID Document template
    Genesis --> Initial: Resolve replaces the<br/>placeholder with the DID
    Initial --> Updated: Apply BTCR2 Signed Update<br/>(targetVersionId 2)
    Updated --> Updated: Apply BTCR2 Signed Update<br/>(targetVersionId N + 1)
    Initial --> Deactivated: Apply Deactivate update
    Updated --> Deactivated: Apply Deactivate update
    Deactivated --> [*]
```
