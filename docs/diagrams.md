---
mermaidTheme: forest
title: DID BTCR2 Diagrams
---

# Diagrams

Below are UML diagrams of the various objects and algorithms in the specification.

## Architecture

The below architecture diagram is a high-level view of the key parts of the specification and their interactions.

```mermaid
flowchart LR
  %% Main Actors
  Controller([DID Controller])
  Resolver([DID Resolver])

  %% Impl Libs & Apps
  subgraph SDK["Application / SDK"]
    Create[Create]
    Deactivate[Deactivate]
    Update[Update]
    Read[Read]
    KMS[Key Manager]
    Crypto[Cryptosuite]
  end

  subgraph BTCR2Beacon
    SingletonBeacon
    MapBeacon
    SMTBeacon
  end

  %% Data
  BTC[(Bitcoin Blockchain)]
  CAS[("CAS (IPFS)")]
  Sidecar[(Sidecar Data)]

  %% DID Resolver
  Resolver ---> Read

  %% DID Controller
  Controller --> Create
  Controller --> Update
  Controller --> Deactivate
  
  %% Update
  Update --> KMS
  Update --> Crypto
  Update --> Sidecar

  %% Beacons
  Update --> BTCR2Beacon
  BTCR2Beacon --> BTC

  %% Read
  Read --> BTC
  Read --> CAS
  Read --> Sidecar
  Read --> Crypto

  %% Deactivate (Reuses Update)
  Deactivate --> Update
```

## Data Flow

The below data flowcharts map the high-level algorithm calls made for each of the CRUD Operations in the specification.

### Create

The [Create](https://dcdpr.github.io/did-btcr2/#create) operation consists of two main algorithms for creating
identifiers and DID documents.

1. [From Deterministic Key Pair](https://dcdpr.github.io/did-btcr2/#from-deterministic-key-pair) to encode a secp256k1
   public key as a did:btcr2 identifier.
1. [From External Intermediate DID document](https://dcdpr.github.io/did-btcr2/#from-external-intermediate-did-document)
   encodes an external [intermediate DID document](https://dcdpr.github.io/did-btcr2/#def-intermediate-did-document)
   as a did:btcr2 identifier. Doing so allows for more complex [initial DID documents](https://dcdpr.github.io/did-btcr2/#def-initial-did-document)
   with features such as the ability to include Service Endpoints and [BTCR2 Beacons](https://dcdpr.github.io/did-btcr2/#def-btcr2-beacon)
   that support aggregation.
   
In both cases, DID creation can be undertaken in an offline manner, i.e., the DID controller does NOT need to interact
with the Bitcoin network to create their DID.

```mermaid
flowchart TD
    %% Start
    Start@{shape: circle, label: Create DID &<br/>DID Document} --> CheckIdType{idType}
    
    %% Deterministic
    CheckIdType -->|KEY|Deterministic@{shape: subproc, label: From Deterministic<br/>Key Pair}
    Deterministic --> IdentifierEncodingK1@{shape: subproc, label: Identifier<br/>Encoding (k1)}
    IdentifierEncodingK1 ---> ResolveDeterministic@{shape: subproc, label: Deterministically Generate<br/>Initial DID Document}

    %% External
    CheckIdType -->|EXTERNAL|External@{shape: subproc, label: From External<br/>Intermediate DID Document}
    External --> JSONCanonicalizeHash@{shape: subproc, label: JSON Canonicalization<br/>and Hash}
    JSONCanonicalizeHash --> IdentifierEncodingX1@{shape: subproc, label: Identifier<br/>Encoding (x1)}
    IdentifierEncodingX1 --> CheckStoreOnCAS{Store on CAS?}
    CheckStoreOnCAS -->|TRUE|StoreOnCAS@{shape: subproc, label: "Publish Intermediate DID Document to CAS"}
    CheckStoreOnCAS -->|FALSE|Return
    StoreOnCAS --> Return

    %% Error
    CheckIdType -->|ERROR|InvalidIdType@{shape: stadium, label: InvalidIdType}
  
    %% Return
    ResolveDeterministic --> Return@{shape: lean-l, label: "Return<br/>did, initialDocument"}
```

### Read

The [Read](https://dcdpr.github.io/did-btcr2/#read) operation is executed by a DID Resolver after receiving a resolution
request for a specific did:btcr2 identifier. 

It consists of two main subprocesses:
  1. [Resolve Initial DID Document](https://dcdpr.github.io/did-btcr2/#resolve-initial-did-document) to resolve an initial
     DID document for the given did:btcr2 identifier.
  1. [Resolve Target Document](https://dcdpr.github.io/did-btcr2/#resolve-target-document) to resolve the target document
     using updates found on the Bitcoin blockchain.

```mermaid
flowchart TD
    Start@{shape: circle, label: Read} --> IdentifierDecoding@{shape: subproc, label: Identifier Decoding}
    IdentifierDecoding --> ResolveInitial@{shape: subproc, label: Resolve Initial DID Document}
    ResolveInitial --> ResolveTarget@{shape: subproc, label: Resolve Target Document}
    ResolveTarget --> Return@{shape: lean-l, label: Return targetDocument}
```

#### Resolve Initial DID Document

[Resolve Initial DID Document](https://dcdpr.github.io/did-btcr2/#resolve-initial-did-document) is the first subprocess of
the Read operation consisting of two additional subprocesses.

* [Deterministically Generate Initial DID Document](https://dcdpr.github.io/did-btcr2/#deterministically-generate-initial-did-document)
  to create an initial DID document from a secp256k1 public key.
* [External Resolution](https://dcdpr.github.io/did-btcr2/#external-resolution) to retrieve an intermediate DID document
  either from CAS or Sidecar Data.

```mermaid
flowchart TD

    Start@{shape: circle, label: Resolve Initial<br>DID Document} --> CheckIdType{idType}

    %% Deterministic Path
    CheckIdType -->|KEY| Deterministic@{shape: subproc, label: Deterministically<br>Generate<br/>Initial<br>DID Document}
    Deterministic --> GenerateBeacon@{shape: subproc, label: Generate<br/>Beacon Services}
    GenerateBeacon --> EstablishSingleton@{shape: subproc, label: Establish<br/>Singleton Beacon}

    %% External Path
    CheckIdType -->|EXTERNAL| External@{shape: subproc, label: External Resolution}
    External -->CheckSidecarData{resolutionOptions.<br>sidecarData.<br>initialDocument}
    CheckSidecarData-->|NOT NULL| SidecarValidate@{shape: subproc, label: Sidecar Initial<br/>DID Document<br>Validation}
    CheckSidecarData-->|NULL| CasRetrieval@{shape: subproc, label: CAS Retrieval}
    CasRetrieval-->CheckInitialDocument{initialDocument}
    SidecarValidate-->CheckInitialDocument
    CheckInitialDocument-->|VALID| ReturnInitialDocument@{shape: lean-l, label: Return initialDocument}

    %% Error
    CheckIdType -->|ERROR| InvalidHRPValue@{shape: stadium, label: InvalidHRPValue}
    CheckInitialDocument-->|INVALID| InvalidDIDDocumentError@{shape: stadium, label: InvalidDIDDocumentError}

    %% Return
    EstablishSingleton --> ReturnInitialDocument
```

#### Resolve Target Document

[Resolve Target Document](https://dcdpr.github.io/did-btcr2/#resolve-target-document) is the second subprocess of the Read
operation, which calls a single recursive subprocess, [Traverse Bitcoin Blockchain History](https://dcdpr.github.io/did-btcr2/#traverse-bitcoin-blockchain-history),
which walks the Bitcoin blockchain and identifies spending transactions from bitcoin addresses listed in the DID document. These
spends are called Beacon Signals and may contain announcements about changes made to the DID document controlled by the
did:btcr2 identifier being resolved.

```mermaid
flowchart TD
    Start@{shape: circle, label: Resolve Target<br>Document} --> TraverseHistory@{shape: subproc, label: Traverse Bitcoin<br/>Blockchain History}
    TraverseHistory --> WhileUpdates{orderedUpdates.length > 0}
    WhileUpdates -->|TRUE| JSONCanonicalizeHash1@{shape: subproc, label: JSON Canonicalization<br/>and Hash}
    JSONCanonicalizeHash1 --> FindNextSignals@{shape: subproc, label: Find Next Signals}
    FindNextSignals --> ProcessBeaconSignals@{shape: subproc, label: Process Beacon Signals}
    ProcessBeaconSignals --> TargetVersionId{update<br/>.targetVersionId}
    TargetVersionId -->| \> currentVersionId + 1| LatePublishing@{shape: stadium, label: LatePublishingError}
    TargetVersionId -->| = currentVersionId + 1| ApplyDidUpdate@{shape: subproc, label: Apply<br/>DID Update}
    TargetVersionId -->| <= currentVersionId| ConfirmDupeUpdate@{shape: subproc, label: Confirm Duplicate Update} 
    ApplyDidUpdate --> JSONCanonicalizeHash2@{shape: subproc, label: JSON Canonicalization<br/>and Hash}
    JSONCanonicalizeHash2 --> TraverseHistory
    ConfirmDupeUpdate --> TraverseHistory
    WhileUpdates -->|FALSE| ReturnTargetDocument@{shape: lean-l, label: Return targetDocument}
```

### Update

The [Update](https://dcdpr.github.io/did-btcr2/#update) operation is executed by a DID Controller to make changes to a
DID document. Updates to a DID document is achieved by constructing JSON Patches, invoking and securing them and announcing
them to the Bitcoin blockchain.

It consists of three main subprocesses:
  1. [Construct BTCR2 Update](https://dcdpr.github.io/did-btcr2/#construct-btcr2-update) to construct an unsecured BTCR2 update
  1. [Invoke BTCR2 Update](https://dcdpr.github.io/did-btcr2/#invoke-btcr2-update) to add a signature unsecured BTCR2 update
  1. [Announce DID Update](https://dcdpr.github.io/did-btcr2/#announce-did-update) to broadcast the BTCR2 update to the Bitcoin blockchain

```mermaid
flowchart TD
    Start@{shape: circle, label: Update} --> ConstructUpdate@{shape: subproc, label: Construct BTCR2 Update}
    ConstructUpdate --> InvokeUpdate@{shape: subproc, label: Invoke BTCR2 Update}
    InvokeUpdate --> AnnounceUpdate@{shape: subproc, label: Announce DID Update}
    AnnounceUpdate --> End@{shape: lean-l, label: Return signalsMetadata}
```

#### Construct BTCR2 Update

[Construct BTCR2 Update](https://dcdpr.github.io/did-btcr2/#construct-btcr2-update) is the first subprocess of the Update
algorithm. The goal of this subprocess is to apply a JSON Patch document to a source DID document and verify that the resulting
updated target DID document is a valid, conformant DID document.

```mermaid
flowchart TD
    Start@{shape: circle, label: Construct<br>BTCR2 Update} --> ConstructPatch@{shape: subproc, label: Apply JSON Patch<br>to sourceDocument}
    ConstructPatch --> ValidateTargetDoc{Is targetDocument<br>conformant?}
    ValidateTargetDoc -->|TRUE|JSONCanonicalizeHash@{shape: subproc, label: Canonicalize and Hash sourceDocument and targetDocument}
    ValidateTargetDoc -->|FALSE|HandleError@{ shape: stadium, label: "InvalidDIDUpdateError" }
    JSONCanonicalizeHash --> End@{shape: lean-l, label: Return unsecuredBtcr2Update}
```

#### Invoke BTCR2 Update

[Invoke BTCR2 Update](https://dcdpr.github.io/did-btcr2/#invoke-btcr2-update) is section 7.3.2 of the DID BTCR2 Method specification.
It is the second subprocess of the Update algorithm with the goal of retrieving and use the private key associated with
the verification method listed in the source DID document to sign and add a Data Integrity Proof to the BTCR2 Update.

```mermaid
flowchart TD
    Start@{shape: circle, label: Invoke<br>BTCR2 Update} --> DeriveZCap@{shape: subproc, label: Derive Root<br>Capability from<br>did:btcr2 Identifier}
    DeriveZCap --> InstantiateCryptosuite@{shape: subproc, label: Instantiate<br>BIP340 Cryptosuite}
    InstantiateCryptosuite --> AddProof@{shape: subproc, label: Add Proof to<br>btcr2Update}
    AddProof --> Return@{shape: lean-l, label: Return btcr2Update}
```

#### Announce DID Update

[Announce DID Update](https://dcdpr.github.io/did-btcr2/#announce-did-update) is the third subprocess of the Update
algorithm. The goal of this subprocess is to retrieve the services object(s) from the source DID document and call
the Broadcast DID Update algorithm corresponding to the type of the BTCR2 Beacon: Singleton Beacon, Map Beacon or SMT Beacon.

```mermaid
flowchart TD
    Start@{shape: circle, label: Announce<br>BTCR2 Update} --> FindBeacons{Find<br>beaconServices}
    FindBeacons -->|NOT FOUND| BeaconNotFound@{shape: stadium, label: BeaconNotFoundError}
    FindBeacons -->|FOUND| ForEach[For each<br>beaconService]
    ForEach -->AddMoreBeacons{beaconService<br>.type}
    AddMoreBeacons -->|SingletonBeacon| BroadcastSingleton@{shape: subproc, label: Broadcast Singleton<br>Beacon Signal}
    AddMoreBeacons -->|MapBeacon| BroadcastMap@{shape: subproc, label: Broadcast Map<br>Beacon Signal}
    AddMoreBeacons -->|SMTBeacon| BroadcastSMT@{shape: subproc, label: Broadcast SMT<br>Beacon Signal}
    AddMoreBeacons -->|ELSE| InvalidBeacon@{shape: stadium, label: InvalidBeaconError}
    BroadcastSingleton --> SignalMetadata[signalMetadata]
    BroadcastMap --> SignalMetadata
    BroadcastSMT --> SignalMetadata
    SignalMetadata --> MergeSignalsMetadata[Merge<br>signalMetadata]
    SignalMetadata --> ForEach
    MergeSignalsMetadata --> Return@{shape: lean-l, label: Return<br>signalsMetadata}
```


### Deactivate

The [Deactivate](https://dcdpr.github.io/did-btcr2/#deactivate) operation data flowchart is almost identical to the
[Update](#update) flow since the process of deactivation is simply that of creating an update to the DID document.
DID Controllers create a JSON Patch to add the key-value pair `{"deactivated": true}` to the DID document. Below is an
example of a BTCR2 Update that would be used to deactivate a DID and DID document.

```json
{
    "updatePayload": {
        "@context": [
            "https://w3id.org/security/v2",
            "https://w3id.org/zcap/v1",
            "https://w3id.org/json-ld-patch/v1"
        ],
        "patch": [
            {
                "op": "add",
                "path": "/deactivated",
                "value": true
            }
        ],
        "targetHash": "ER5jJUisvZafd8n6V2Bo...",
        "targetVersionId": 2,
        "sourceHash": "3osrqR3kJ2YMEDfwcKow...",
        "proof": {
            "cryptosuite": "bip340-jcs-2025",
            "type": "DataIntegrityProof",
            "verificationMethod": "did:btcr2:k1xyz123#initialKey",
            "proofPurpose": "capabilityInvocation",
            "capability": "urn:zcap:root:did%3Abtcr2%3Ak1xyz123",
            "capabilityAction": "Write",
            "@context": [
                "https://w3id.org/security/v2",
                "https://w3id.org/zcap/v1",
                "https://w3id.org/json-ld-patch/v1"
            ],
            "proofValue": "z3LhCeApi5wirR4jubkKQhEEiVRPZADDamf..."
        }
    }
}
```