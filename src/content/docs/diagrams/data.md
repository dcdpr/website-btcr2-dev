---
title: Data
description: Diagrams of the did:btcr2 data structures, the update hash chain, and update data distribution.
---

The [Data Structures](https://dcdpr.github.io/did-btcr2/data-structures.html) chapter defines each structure. All
SHA-256 hashes in these structures are `base64url` strings without padding.

## Resolution inputs

The class diagram shows the data that a resolver receives in `resolutionOptions`. All properties of the Sidecar Data
are optional. An `x1` DID needs a Genesis Document, from the Sidecar Data or from CAS.

```mermaid
classDiagram
  direction LR
  class ResolutionOptions["Resolution Options"] {
    versionId
    versionTime
    minConf, default 6
    sidecar
  }
  class SidecarData["Sidecar Data"] {
    context
    genesisDocument
    updates
    casUpdates
    smtProofs
  }
  class GenesisDocument["Genesis Document"] {
    id: did:btcr2:_
  }
  class SignedUpdate["BTCR2 Signed Update"] {
    context
    patch
    sourceHash
    targetHash
    targetVersionId
    proof
  }
  class Proof["Data Integrity Proof"] {
    type: DataIntegrityProof
    cryptosuite: bip340-jcs-2025
    verificationMethod
    proofPurpose: capabilityInvocation
    capability: urn:zcap:root:...
    capabilityAction: Write
    proofValue
  }
  class CASAnnouncement["CAS Announcement"] {
    did: update hash
  }
  class SMTProof["SMT Proof"] {
    id: SMT root
    nonce
    updateId
    collapsed
    hashes
  }
  ResolutionOptions --> "0..1" SidecarData : sidecar
  SidecarData --> "0..1" GenesisDocument : genesisDocument
  SidecarData --> "0..*" SignedUpdate : updates
  SidecarData --> "0..*" CASAnnouncement : casUpdates
  SidecarData --> "0..*" SMTProof : smtProofs
  SignedUpdate --> "1" Proof : proof
```

The `context` rows are the `@context` properties.

## Update hash chain

Each BTCR2 Signed Update links two versions of the DID document through their hashes. A Beacon Signal commits to the
hash of each update. `H()` is the [JSON Document Hashing](https://dcdpr.github.io/did-btcr2/algorithms.html#json-document-hashing)
algorithm: JCS, then SHA-256.

```mermaid
flowchart TD
  D1["DID document<br/>version 1<br/>(Initial DID Document)"]
  U2["BTCR2 Signed Update<br/>targetVersionId: 2<br/>sourceHash: H(version 1)<br/>targetHash: H(version 2)"]
  D2["DID document<br/>version 2"]
  U3["BTCR2 Signed Update<br/>targetVersionId: 3<br/>sourceHash: H(version 2)<br/>targetHash: H(version 3)"]
  D3["DID document<br/>version 3"]
  S2[("Beacon Signal<br/>commits to H(update 2)")]
  S3[("Beacon Signal<br/>commits to H(update 3)")]

  D1 --> U2 --> D2 --> U3 --> D3
  S2 -.->|"announces"| U2
  S3 -.->|"announces"| U3
```

A Singleton Beacon Signal holds the hash of the update. A CAS Beacon Signal or an SMT Beacon Signal commits to the hash
through a CAS Announcement or an SMT root.

## Update data distribution

The resolver gets documents through [Sidecar Data or CAS](https://dcdpr.github.io/did-btcr2/update-data-distribution.html).
It identifies each document by its hash. Use one distribution mechanism for the life of a DID. Documents on CAS are
public. For privacy, use Sidecar Data.

```mermaid
flowchart TD
  classDef error fill:#fdecea,stroke:#b3261e,color:#b3261e

  Need(["The resolver needs the<br/>document for hash h"]) --> InSidecar{"Sidecar Data has a<br/>document with hash h?"}
  InSidecar -->|"yes"| Use[/"Use the document"/]
  InSidecar -->|"no"| SMT{"SMT Proof?"}
  SMT -->|"yes"| ErrMissing(["MISSING_UPDATE_DATA"]):::error
  SMT -->|"no"| CID["Construct the CIDv1 from h"]
  CID --> Get["Get the file from IPFS"]
  Get --> Check{"SHA-256 of the file = h?"}
  Check -->|"yes"| Use
  Check -->|"no, or not found"| NotAvailable(["Not available:<br/>MISSING_UPDATE_DATA, or NOT_FOUND<br/>for a Genesis Document"]):::error
```

## CID construction

A resolver makes an IPFS CIDv1 from the SHA-256 hash of a document. The file in IPFS is a raw block. Thus the file
bytes are the JCS bytes of the document.

```mermaid
flowchart TD
  Doc["JSON document"] --> JCS["JCS<br/>(RFC 8785)"] --> SHA["SHA-256:<br/>32 bytes = h"]
  SHA --> Bytes["CIDv1 bytes:<br/>0x01 CIDv1<br/>0x55 raw<br/>0x12 SHA-256<br/>0x20 length (32)<br/>h"]
  Bytes --> Multibase["multibase base32<br/>(prefix b)"]
  Multibase --> URL["ipfs://bafkrei…"]
```
