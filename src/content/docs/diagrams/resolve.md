---
title: Resolve
description: Diagrams of the did:btcr2 Resolve operation and each of its steps.
---

The [Resolve](https://dcdpr.github.io/did-btcr2/operations/resolve.html) operation builds a DID document. It starts
with the Initial DID Document. Then it applies the BTCR2 Signed Updates that Authorized Beacon Signals announce on the
Bitcoin blockchain.

The resolver keeps this state:

- `updates`: tuples of block metadata, a Beacon Address, and a BTCR2 Signed Update.
- `scanned_beacons`: the Beacon Addresses that the resolver scanned.
- `current_document`: the Current DID Document.
- `current_version_id`: the version of `current_document`. The start value is `1`.
- `update_hash_history`: the hashes of the applied BTCR2 Unsigned Updates.
- `block_confirmations` and `current_block_height`: the block of the last applied update.

## Resolution sequence

The sequence diagram shows the messages between the parties. The Sidecar Data is optional. If the resolver does not
find a document in the Sidecar Data, it gets the document from CAS.

```mermaid
sequenceDiagram
    autonumber
    actor Controller as DID Controller
    actor RP as Relying Party
    participant Resolver
    participant BTC as Bitcoin blockchain
    participant CAS

    Controller->>RP: did and Sidecar Data<br/>(optional)
    RP->>Resolver: resolve(did, resolutionOptions)
    Resolver->>Resolver: Decode the DID
    Resolver->>Resolver: Process Sidecar Data
    opt x1 DID and no Genesis Document in the Sidecar Data
        Resolver->>CAS: Get the Genesis Document<br/>by genesis_bytes
        CAS-->>Resolver: Genesis Document
    end
    Resolver->>Resolver: Establish current_document<br/>(version 1)
    loop Until Process Next Update resolves didDocument
        Resolver->>BTC: Find Beacon Signals of<br/>new Beacon Addresses
        BTC-->>Resolver: Transactions with minConf<br/>or more confirmations
        opt Document not in the Sidecar Data
            Resolver->>CAS: Get the document by its hash
            CAS-->>Resolver: BTCR2 Signed Update<br/>or CAS Announcement
        end
        Resolver->>Resolver: Process Next Update
    end
    Resolver-->>RP: didResolutionMetadata, didDocument,<br/>didDocumentMetadata
```

## Resolve process

Resolution is a loop of two steps: Find Beacon Signals, then Process Next Update. The loop stops when Process Next
Update resolves `didDocument` or raises an error.

```mermaid
flowchart TD
  classDef error fill:#fdecea,stroke:#b3261e,color:#b3261e

  Start(["resolve(did, resolutionOptions)"])
  Decode[["Decode the DID"]]
  Sidecar[["Process Sidecar Data"]]
  Options{"versionId and versionTime<br/>both set, or a value<br/>that does not parse?"}
  Establish[["Establish current_document"]]
  Find[["Find Beacon Signals"]]
  Next[["Process Next Update"]]
  Done{"didDocument<br/>resolved?"}
  Return[/"Return didResolutionMetadata,<br/>didDocument, didDocumentMetadata<br/>(versionId, confirmations, deactivated)"/]
  ErrDID(["INVALID_DID"]):::error
  ErrOptions(["INVALID_OPTIONS"]):::error

  Start --> Decode --> Sidecar --> Options
  Decode -->|"decoding error"| ErrDID
  Options -->|"yes"| ErrOptions
  Options -->|"no"| Establish --> Find --> Next --> Done
  Done -->|"no"| Find
  Done -->|"yes"| Return
```

## Establish current_document

[Process Sidecar Data](https://dcdpr.github.io/did-btcr2/operations/resolve.html#process-sidecar-data) makes lookup
tables from the Sidecar Data. For an `x1` DID, it also gets and checks the Genesis Document.
[Establish current_document](https://dcdpr.github.io/did-btcr2/operations/resolve.html#establish-current-document)
then makes the Initial DID Document.

```mermaid
flowchart TD
  classDef error fill:#fdecea,stroke:#b3261e,color:#b3261e

  Start(["Process Sidecar Data, then<br/>Establish current_document"]) --> Kind{"genesis_bytes"}
  Kind -->|"k: secp256k1 public key"| Render["Render the Initial DID Document template"]
  Render --> KeyDoc["verificationMethod: initialKey (Multikey)<br/>service: three Singleton Beacons<br/>(P2PKH, P2WPKH, and P2TR addresses)"]
  Kind -->|"x: SHA-256 hash"| InSidecar{"sidecar.genesisDocument<br/>provided?"}
  InSidecar -->|"no"| FromCAS["Get the Genesis Document<br/>from CAS by genesis_bytes"]
  FromCAS -->|"not found"| ErrNF(["NOT_FOUND"]):::error
  FromCAS --> HashCheck
  InSidecar -->|"yes"| HashCheck{"JSON Document Hash<br/>= genesis_bytes?"}
  HashCheck -->|"no"| ErrDID(["INVALID_DID"]):::error
  HashCheck -->|"yes"| Replace["Replace did:btcr2:_ with the did"]
  KeyDoc --> Out[/"current_document<br/>(conformant to DID Core v1.1)<br/>current_version_id = 1"/]
  Replace --> Out
```

## Find Beacon Signals

[Find Beacon Signals](https://dcdpr.github.io/did-btcr2/operations/resolve.html#find-beacon-signals) scans each new
Beacon Address in `current_document`. An update can add a BTCR2 Beacon. The next loop then scans the new Beacon
Address. The resolver must not use unconfirmed mempool transactions.

```mermaid
flowchart TD
  classDef error fill:#fdecea,stroke:#b3261e,color:#b3261e

  Start(["Find Beacon Signals"]) --> Services["Read the BTCR2 Beacon services<br/>in current_document"]
  Services --> NewAddr{"A Beacon Address that is<br/>not in scanned_beacons?"}
  NewAddr -->|"no"| End(["Go to Process Next Update"])
  NewAddr -->|"yes"| Query["Find the transactions that:<br/>• spend from the Beacon Address<br/>• have Signal Bytes in the last output<br/>• are at height ≥ current_block_height<br/>• have minConf or more confirmations (default 6)"]
  Query --> Mark["Add the Beacon Address<br/>to scanned_beacons"]
  Mark --> EachTx{"Next<br/>transaction?"}
  EachTx -->|"no"| NewAddr
  EachTx -->|"yes"| Type{"Beacon Type"}
  Type -->|"Singleton Beacon"| Single["update_hash = Signal Bytes"]
  Type -->|"CAS Beacon"| ProcCAS[["Process CAS Beacon"]]
  Type -->|"SMT Beacon"| ProcSMT[["Process SMT Beacon"]]
  ProcCAS --> Announces{"Update<br/>for the did?"}
  ProcSMT --> Announces
  Announces -->|"no"| EachTx
  Announces -->|"yes"| Get
  Single --> Get["Get the BTCR2 Signed Update from<br/>update_lookup_table, else from CAS"]
  Get -->|"not found"| ErrMissing(["MISSING_UPDATE_DATA"]):::error
  Get --> Check{"JSON Document Hash<br/>= update_hash?"}
  Check -->|"no"| ErrSignal(["INVALID_SIGNAL_DATA"]):::error
  Check -->|"yes"| Append["Append a tuple to updates:<br/>block metadata, Beacon Address,<br/>BTCR2 Signed Update"]
  Append --> EachTx
```

### Process CAS Beacon

A Beacon Signal of a CAS Beacon commits to a CAS Announcement. The CAS Announcement maps each DID to the hash of its
BTCR2 Signed Update.

```mermaid
flowchart TD
  classDef error fill:#fdecea,stroke:#b3261e,color:#b3261e

  Start(["Process CAS Beacon"]) --> Map["map_update_hash = Signal Bytes"]
  Map --> Lookup["Get the CAS Announcement from<br/>cas_lookup_table, else from CAS"]
  Lookup -->|"not found"| ErrMissing(["MISSING_UPDATE_DATA"]):::error
  Lookup --> Entry{"Entry for<br/>the did?"}
  Entry -->|"yes"| Hash[/"update_hash = the entry value"/]
  Entry -->|"no"| None[/"No update for the did"/]
```

### Process SMT Beacon

A Beacon Signal of an SMT Beacon commits to the root of a Sparse Merkle Tree. The SMT Proof must come from the Sidecar
Data. The resolver does not get SMT Proofs from CAS.

```mermaid
flowchart TD
  classDef error fill:#fdecea,stroke:#b3261e,color:#b3261e

  Start(["Process SMT Beacon"]) --> Root["smt_root = Signal Bytes"]
  Root --> Lookup{"smt_lookup_table<br/>has smt_root?"}
  Lookup -->|"no"| ErrMissing(["MISSING_UPDATE_DATA"]):::error
  Lookup -->|"yes"| Id{"smt_proof.id<br/>= smt_root?"}
  Id -->|"no"| ErrSignal(["INVALID_SIGNAL_DATA"]):::error
  Id -->|"yes"| Verify[["SMT Proof Verification"]]
  Verify -->|"false"| ErrSignal
  Verify -->|"true"| HasId{"smt_proof<br/>has updateId?"}
  HasId -->|"yes"| Hash[/"update_hash = updateId"/]
  HasId -->|"no"| None[/"No update for the did"/]
```

## Process Next Update

[Process Next Update](https://dcdpr.github.io/did-btcr2/operations/resolve.html#process-next-update) applies one
update per loop. It also selects the version that `versionId` or `versionTime` requests.

```mermaid
flowchart TD
  classDef error fill:#fdecea,stroke:#b3261e,color:#b3261e

  Start(["Process Next Update"]) --> AtVersion{"versionId set, and<br/>current_version_id = versionId?"}
  AtVersion -->|"yes"| Resolved[/"didDocument = current_document"/]
  AtVersion -->|"no"| Empty{"updates empty, or<br/>current_document.deactivated?"}
  Empty -->|"yes"| HasVersion{"versionId set?"}
  HasVersion -->|"yes"| ErrNF(["NOT_FOUND"]):::error
  HasVersion -->|"no"| Resolved
  Empty -->|"no"| Sort["Sort updates by targetVersionId,<br/>then by block height.<br/>Remove the first tuple."]
  Sort --> Authorized{"current_document has a BTCR2 Beacon<br/>with the Beacon Address of the tuple?"}
  Authorized -->|"no: ignore the tuple"| Loop(["Go to Find Beacon Signals"])
  Authorized -->|"yes"| Time{"targetVersionId > current_version_id,<br/>versionTime set, and block<br/>mediantime after versionTime?"}
  Time -->|"yes"| Resolved
  Time -->|"no"| Compare{"update.targetVersionId"}
  Compare -->|"≤ current_version_id"| Dup[["Confirm Duplicate Update"]]
  Compare -->|"= current_version_id + 1"| Apply[["Apply update"]]
  Compare -->|"> current_version_id + 1"| ErrLate(["LATE_PUBLISHING"]):::error
  Dup --> Loop
  Apply --> Loop
```

### Confirm Duplicate Update

A DID controller can announce the same update through more than one BTCR2 Beacon. The resolver accepts a duplicate only
if it is the same as the update that it applied for that version.

```mermaid
flowchart TD
  classDef error fill:#fdecea,stroke:#b3261e,color:#b3261e

  Start(["Confirm Duplicate Update"]) --> Min{"targetVersionId < 2?"}
  Min -->|"yes"| ErrUpdate(["INVALID_DID_UPDATE"]):::error
  Min -->|"no"| Hash["Remove the proof.<br/>Hash the unsigned update with<br/>JSON Document Hashing."]
  Hash --> Same{"Hash = update_hash_history<br/>[targetVersionId - 2]?"}
  Same -->|"no"| ErrLate(["LATE_PUBLISHING"]):::error
  Same -->|"yes"| Ok[/"True duplicate:<br/>no change to current_document"/]
```

### Apply update

[Apply update](https://dcdpr.github.io/did-btcr2/operations/resolve.html#apply-update) checks the update against the
two DID document hashes and the proof. Each failed check raises `INVALID_DID_UPDATE`.

```mermaid
flowchart TD
  classDef error fill:#fdecea,stroke:#b3261e,color:#b3261e

  Start(["Apply update"]) --> Source{"JSON Document Hash of<br/>current_document<br/>= update.sourceHash?"}
  Source -->|"no"| Err(["INVALID_DID_UPDATE"]):::error
  Source -->|"yes"| Proof[["Check update.proof"]]
  Proof -->|"fail"| Err
  Proof -->|"pass"| Patch["Apply update.patch (JSON Patch)<br/>to current_document"]
  Patch -->|"malformed, or an operation fails"| Err
  Patch --> Valid{"Conformant to DID Core v1.1,<br/>and id = did?"}
  Valid -->|"no"| Err
  Valid -->|"yes"| Target{"JSON Document Hash of<br/>current_document<br/>= update.targetHash?"}
  Target -->|"no"| Err
  Target -->|"yes"| Record["Append the unsigned update hash<br/>to update_hash_history.<br/>Set block_confirmations and<br/>current_block_height.<br/>Increment current_version_id."]
```

### Check update.proof

[Check update.proof](https://dcdpr.github.io/did-btcr2/operations/resolve.html#check-update-proof) makes sure that a
`capabilityInvocation` key of `current_document` signed the update. The time checks use the block that contains the
Beacon Signal.

```mermaid
flowchart TD
  classDef error fill:#fdecea,stroke:#b3261e,color:#b3261e

  Start(["Check update.proof"]) --> Ctx{"update @context is the required array,<br/>and proof @context = update @context?"}
  Ctx -->|"no"| Err(["INVALID_DID_UPDATE"]):::error
  Ctx -->|"yes"| Purpose{"proofPurpose = capabilityInvocation,<br/>capabilityAction = Write, and<br/>capability = urn:zcap:root:(encoded did)?"}
  Purpose -->|"no"| Err
  Purpose -->|"yes"| VM{"An entry of current_document<br/>.capabilityInvocation identifies<br/>proof.verificationMethod?"}
  VM -->|"no"| Err
  VM -->|"yes"| Key["Get publicKeyMultibase from the<br/>embedded or referenced<br/>verification method"]
  Key -->|"no verification method"| Err
  Key --> Time{"If present:<br/>created ≤ block header timestamp,<br/>expires ≥ block mediantime,<br/>expires ≥ created?"}
  Time -->|"no"| Err
  Time -->|"yes"| Verify{"BIP340 Cryptosuite<br/>bip340-jcs-2025<br/>verifies the update?"}
  Verify -->|"no"| Err
  Verify -->|"yes"| Pass[/"pass"/]
```
