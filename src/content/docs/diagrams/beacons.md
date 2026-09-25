---
title: Beacons
description: Diagrams of the did:btcr2 Beacon Types, BTCR2 Update aggregation, and SMT proofs.
---

A [BTCR2 Beacon](https://dcdpr.github.io/did-btcr2/beacons.html) is a service in the DID document. Its
`serviceEndpoint` is a Beacon Address. Each Beacon Signal from that address commits to 32 Signal Bytes. The Beacon
Type tells the resolver how to find the update for a DID from these bytes.

## Beacon Types

| Beacon Type | Service `type` | Signal Bytes | Resolver data for each Beacon Signal |
|:------------|:---------------|:-------------|:-------------------------------------|
| Singleton Beacon | `SingletonBeacon` | Hash of the BTCR2 Signed Update | BTCR2 Signed Update |
| CAS Beacon | `CASBeacon` | Hash of the CAS Announcement | CAS Announcement, and the BTCR2 Signed Update if there is an entry for the DID |
| SMT Beacon | `SMTBeacon` | Root of an optimized Sparse Merkle Tree | SMT Proof (Sidecar Data only), and the BTCR2 Signed Update if the proof has an `updateId` |

The resolver needs this data for each Beacon Signal of the Beacon Address. This includes the signals that announce no
update for the DID. Include at least one Singleton Beacon as a fallback, in case all Aggregate Beacons fail.

```mermaid
flowchart TD
  Signal["Beacon Signal:<br/>Signal Bytes (32 bytes)"]
  Signal -->|"Singleton Beacon"| S1["Signal Bytes = hash of the<br/>BTCR2 Signed Update"]
  Signal -->|"CAS Beacon"| C1["Signal Bytes = hash of the<br/>CAS Announcement"]
  Signal -->|"SMT Beacon"| M1["Signal Bytes = SMT root"]
  C1 --> C2["CAS Announcement:<br/>did → update hash"]
  C2 -->|"entry for the did"| Hash
  M1 --> M2["SMT Proof for the did<br/>(from Sidecar Data)"]
  M2 -->|"updateId"| Hash
  S1 --> Hash["Hash of the<br/>BTCR2 Signed Update"]
  Hash --> Update["BTCR2 Signed Update<br/>(from Sidecar Data or CAS)"]
```

## Singleton Beacon

The DID controller controls the Beacon Address of a Singleton Beacon. Thus the DID controller signs and broadcasts
each Beacon Signal. There is no Aggregation Cohort.

```mermaid
sequenceDiagram
    autonumber
    actor Controller as DID Controller
    participant BTC as Bitcoin network
    participant CAS
    actor RP as Relying Party
    participant Resolver

    Note over Controller: Construct the BTCR2 Signed Update.<br/>Signal Bytes = its JSON Document Hash.
    Controller->>BTC: Broadcast the Beacon Signal<br/>(signed with the Beacon Address key)
    alt CAS distribution
        Controller->>CAS: Publish the BTCR2 Signed Update
    else Sidecar distribution
        Controller->>RP: Give the did and the<br/>Sidecar Data (updates)
    end
    RP->>Resolver: resolve(did, resolutionOptions)
    Resolver->>BTC: Find Beacon Signals<br/>of the Beacon Address
    BTC-->>Resolver: Beacon Signal<br/>(Signal Bytes = update_hash)
    alt update_hash in the Sidecar Data
        Resolver->>Resolver: Get the update from<br/>update_lookup_table
    else update_hash not in the Sidecar Data
        Resolver->>CAS: Get the document by update_hash
        CAS-->>Resolver: BTCR2 Signed Update
    end
    Resolver->>Resolver: Check the hashes and the proof,<br/>then apply the patch
    Resolver-->>RP: didDocument and<br/>didDocumentMetadata
```

## Aggregate Beacons

A CAS Beacon or an SMT Beacon puts the updates of many DIDs into one Beacon Signal. An
[Aggregation Service](https://dcdpr.github.io/did-btcr2/beacons/aggregate-beacons.html) coordinates the Aggregation
Participants of an Aggregation Cohort. The specification gives a RECOMMENDED example protocol with MuSig2 (BIP327).
The diagrams show this example and a `k-of-n` fallback. A full aggregation protocol is out of scope for the
specification.

### n-of-n and k-of-n signatures

The specification RECOMMENDS a Beacon Address that needs an `n-of-n` signature. Then each Beacon Signal needs a
signature from every participant. The specification does not require `n-of-n`. A cohort can also accept `k` of the
`n` signatures, with `k < n`. For example, a P2TR Beacon Address can have an `n-of-n` MuSig2 key path and a `k-of-n`
script path as a fallback.

Each choice has a risk ([Worst Case](https://dcdpr.github.io/did-btcr2/appendix.html#worst-case)):

- `n-of-n`: one participant that does not sign stops all Beacon Signals of the cohort.
- `k-of-n`: a participant that does not sign does not check the Beacon Signal. The signal can announce an update for
  the DID of that participant that the participant did not submit. A resolver cannot get that update, so the DID is
  invalid ([Invalidation Attacks](https://dcdpr.github.io/did-btcr2/appendix/security-considerations.html#invalidation-attacks)).

In both cases, a Singleton Beacon in the DID document is a fallback.

```mermaid
flowchart TD
  Unsigned["Unsigned Beacon Signal.<br/>Each participant checks its own entry before it signs."] --> Count{"How many participants sign?"}
  Count -->|"all n"| NofN["n-of-n: MuSig2 key path<br/>one aggregated signature<br/>(RECOMMENDED example)"]
  Count -->|"k to n - 1<br/>(cohort with a k-of-n fallback)"| KofN["k-of-n fallback: script path<br/>k Schnorr signatures"]
  Count -->|"fewer"| Fail["The round fails.<br/>No Beacon Signal."]
  NofN --> Signal["Broadcast the Beacon Signal"]
  KofN --> Signal
  KofN -.- Risk["Risk: a participant that did not sign<br/>did not check its entry"]
```

### Create an Aggregation Cohort

The Beacon Address is a Pay-to-Taproot (P2TR) address. Each Aggregation Participant gives one of the `n` keys. With
`n-of-n`, each Beacon Signal needs a signature from every participant. With a `k-of-n` fallback, the participants also
check `k`. The Aggregation Service is minimally trusted.

```mermaid
sequenceDiagram
    autonumber
    participant Service as Aggregation Service
    actor P as Aggregation Participants
    participant BTC as Bitcoin network

    Service->>P: Advertise the Aggregation Cohort<br/>(Beacon Type, size, costs, timing)
    P->>Service: Enroll: DIDs or indexes (SHA-256 of a DID)<br/>and a Schnorr public key
    Service->>Service: Finalize the membership.<br/>Compute the P2TR Beacon Address: n-of-n key path,<br/>optional k-of-n script path.
    Service->>P: The Beacon Address,<br/>the set of n public keys, and k
    P->>P: Compute the address again. Make sure<br/>that the set contains their key.
    P->>BTC: Update each DID to add a CASBeacon or SMTBeacon<br/>service (through an existing BTCR2 Beacon)
```

### Aggregate and broadcast a Beacon Signal

Each update opportunity needs a response from every Aggregation Participant, also if the participant has no update.
In the pull flow, the Aggregation Service announces the opportunity. In the push flow, the participants send updates
when they are ready.

```mermaid
sequenceDiagram
    autonumber
    participant Service as Aggregation Service
    actor P as Aggregation Participant
    participant BTC as Bitcoin network

    Service->>P: Update opportunity
    alt CAS Beacon
        P->>Service: did and updateHash (or no update),<br/>MuSig2 nonce
    else SMT Beacon
        P->>Service: didIndex and leaf value,<br/>MuSig2 nonce
    end
    Note over Service: Wait for the response of every participant.<br/>Aggregate the MuSig2 nonces.
    alt CAS Beacon
        Service->>Service: Build the CAS Announcement.<br/>Signal Bytes = its hash.
        Service->>P: CAS Announcement, Unsigned Beacon Signal,<br/>aggregated nonce
        P->>P: Check their entries, and Signal Bytes<br/>= hash of the CAS Announcement
    else SMT Beacon
        Service->>Service: Build the optimized SMT.<br/>Signal Bytes = SMT root.
        Service->>P: SMT Proofs for their indexes,<br/>Unsigned Beacon Signal, aggregated nonce
        P->>P: Verify each SMT Proof<br/>against the Signal Bytes
    end
    alt n-of-n: all n participants sign
        P->>Service: MuSig2 partial signature
        Service->>Service: Aggregate the partial signatures
    else k-of-n fallback: some participants do not sign
        Service->>P: Fallback request: the same<br/>transaction, script path
        P->>P: Check that the Signal Bytes<br/>did not change
        P->>Service: Schnorr signature
        Note over Service: Wait for k signatures.
    end
    P->>P: Keep the updates, and the CAS Announcement<br/>or the SMT Proofs and nonces
    Service->>BTC: Broadcast the Beacon Signal
```

## SMT leaf values

The leaf index of a DID is the SHA-256 hash of the DID. The DID controller selects the leaf value for each index and
each Beacon Signal. A `nonce` hides from other parties if there is an update. The DID controller must keep each
`nonce` for the life of the DID.

```mermaid
flowchart TD
  Start(["Leaf value at index = hash(did)"]) --> Nonce{"nonce?"}
  Nonce -->|"yes"| U1{"update?"}
  Nonce -->|"no"| U2{"update?"}
  U1 -->|"yes"| A["hash(hash(nonce) + updateId)<br/>private: announces the update"]
  U1 -->|"no"| B["hash(hash(nonce))<br/>private: no update"]
  U2 -->|"yes"| C["updateId<br/>public: announces the update"]
  U2 -->|"no"| D["cachedZero[0] = hash(0 + 0)<br/>empty leaf: no update"]
```

## SMT Proof Verification

The [SMT Proof Verification](https://dcdpr.github.io/did-btcr2/algorithms.html#smt-proof-verification) algorithm walks
from the leaf to the root. `hash()` is SHA-256. `+` joins two 32-byte values. Decode the `base64url` fields of the SMT
Proof before the walk. `cachedZero[n]` is the value of an empty subtree at height `n`.

```mermaid
flowchart TD
  Start(["SMT Proof Verification"]) --> Sizes{"updateId (if present), collapsed,<br/>and each entry of hashes are 32 bytes,<br/>and count(hashes) + ones(collapsed) = 256?"}
  Sizes -->|"no"| False(["false"])
  Sizes -->|"yes"| Leaf["candidate = leaf value<br/>(from nonce and updateId)<br/>index = hash(did)<br/>n = 0, i = 255"]
  Leaf --> Collapsed{"collapsed bit i = 1?"}
  Collapsed -->|"yes"| Zero["sibling = cachedZero[n]"]
  Collapsed -->|"no"| Next["sibling = next entry of hashes"]
  Next --> NotZero{"sibling = cachedZero[n]?"}
  NotZero -->|"yes"| False
  NotZero -->|"no"| Side
  Zero --> Side{"index bit i = 1?"}
  Side -->|"yes"| Right["candidate = hash(sibling + candidate)"]
  Side -->|"no"| Left["candidate = hash(candidate + sibling)"]
  Right --> More{"n < 255?"}
  Left --> More
  More -->|"yes: n = n + 1, i = 255 - n"| Collapsed
  More -->|"no"| Root{"candidate = proof.id?"}
  Root -->|"yes"| True(["true"])
  Root -->|"no"| False
```

Bit `0` of a 32-byte value is the most significant bit of the first byte. Thus the walk starts with the last bit of
the index at the leaf. It stops with the first bit at the root.
