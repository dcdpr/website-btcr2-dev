---
title: Update and Deactivate
description: Diagrams of the did:btcr2 Update and Deactivate operations and the Beacon Signal transaction.
---

The [Update](https://dcdpr.github.io/did-btcr2/operations/update.html) operation changes a DID document. The DID
controller makes a BTCR2 Signed Update and announces it through one or more BTCR2 Beacons of the DID document. The
[Deactivate](https://dcdpr.github.io/did-btcr2/operations/deactivate.html) operation is an Update with a fixed patch.

## Update operation

The update has three steps. The resolver of each relying party finds the update later through its Beacon Signal.

```mermaid
flowchart TD
  Start(["update(didSourceDocument, jsonPatch,<br/>targetVersionId, verificationMethodId, signer)"])
  Version["targetVersionId = versionId + 1,<br/>from a fresh resolution of the DID"]
  Unsigned[["Construct BTCR2 Unsigned Update"]]
  Signed[["Construct BTCR2 Signed Update"]]
  Check["Verify update.proof (SHOULD)"]
  Announce[["Announce DID Update"]]
  Return[/"Return signedUpdate"/]
  Keep["Keep the BTCR2 Signed Update for Sidecar Data,<br/>or publish it to CAS"]

  Version -.-> Start
  Start --> Unsigned --> Signed --> Check --> Announce --> Return
  Return -.-> Keep
```

Use the `versionId` of a fresh resolution for `targetVersionId`. Do not use a local count. An announced update with an
incorrect `targetVersionId` or an incorrect proof can make the DID unresolvable.

## Construct BTCR2 Unsigned Update

[Construct BTCR2 Unsigned Update](https://dcdpr.github.io/did-btcr2/operations/update.html#construct-btcr2-unsigned-update)
applies the patch and records the hashes of the source and target DID documents. `H()` is the
[JSON Document Hashing](https://dcdpr.github.io/did-btcr2/algorithms.html#json-document-hashing) algorithm.

```mermaid
flowchart TD
  classDef error fill:#fdecea,stroke:#b3261e,color:#b3261e

  Start(["Construct BTCR2 Unsigned Update"]) --> Patch["Apply jsonPatch to didSourceDocument<br/>to make didTargetDocument"]
  Patch -->|"malformed, or an operation fails"| Err(["INVALID_DID_UPDATE"]):::error
  Patch --> Valid{"didTargetDocument conformant<br/>to DID Core v1.1, and<br/>id not changed?"}
  Valid -->|"no"| Err
  Valid -->|"yes"| Fill["Fill the template:<br/>@context (four context URLs)<br/>patch = jsonPatch<br/>sourceHash = H(didSourceDocument)<br/>targetHash = H(didTargetDocument)<br/>targetVersionId"]
  Fill --> Return[/"BTCR2 Unsigned Update"/]
```

## Construct BTCR2 Signed Update

[Construct BTCR2 Signed Update](https://dcdpr.github.io/did-btcr2/operations/update.html#construct-btcr2-signed-update)
adds a Data Integrity proof. The proof invokes the root capability of the DID. The signer holds the private key or
has access to it. An external signer is RECOMMENDED.

```mermaid
flowchart TD
  classDef error fill:#fdecea,stroke:#b3261e,color:#b3261e

  Start(["Construct BTCR2 Signed Update"]) --> Find{"An entry of didSourceDocument<br/>.capabilityInvocation identifies<br/>verificationMethodId?"}
  Find -->|"no"| Err(["INVALID_DID_UPDATE"]):::error
  Find -->|"yes: reference"| Lookup{"didSourceDocument.verificationMethod<br/>has that id?"}
  Lookup -->|"no"| Err
  Lookup -->|"yes"| Suite
  Find -->|"yes: embedded object"| Suite["Create a BIP340 Cryptosuite:<br/>bip340-jcs-2025 with the signer"]
  Suite --> Config["Fill the Data Integrity Config:<br/>type DataIntegrityProof<br/>verificationMethod<br/>proofPurpose capabilityInvocation<br/>capability urn:zcap:root:(encoded did)<br/>capabilityAction Write"]
  Config --> Proof["cryptosuite.createProof(update, proofConfig)"]
  Proof --> Return[/"BTCR2 Signed Update<br/>(the unsigned update and its proof)"/]
```

## Announce DID Update

[Announce DID Update](https://dcdpr.github.io/did-btcr2/operations/update.html#announce-did-update) depends on the Beacon
Type. The DID controller broadcasts the Beacon Signal of a Singleton Beacon. The Aggregation Service broadcasts the
Beacon Signal of an Aggregate Beacon.

```mermaid
flowchart TD
  Start(["Announce DID Update"]) --> Select["Select one or more BTCR2 Beacons<br/>in didSourceDocument.service"]
  Select --> Type{"Beacon Type"}
  Type -->|"Singleton Beacon"| Hash["Signal Bytes = JSON Document Hash<br/>of the BTCR2 Signed Update"]
  Hash --> Build["Construct the Beacon Signal:<br/>spend a UTXO of the Beacon Address,<br/>last output OP_RETURN and Signal Bytes"]
  Build --> Sign["Sign with the key that<br/>controls the Beacon Address"]
  Sign --> Broadcast["Broadcast to the Bitcoin network"]
  Type -->|"CAS Beacon or SMT Beacon"| Submit["Send the update hash to the<br/>Aggregation Service"]
  Submit --> Agg[["BTCR2 Update Aggregation<br/>(see the Beacons page)"]]
  Agg --> Broadcast
```

## Beacon Signal transaction

A Beacon Signal is a Bitcoin transaction that spends from a Beacon Address. Its last output holds the 32 Signal Bytes.
The inputs, the fee, and the change output are parameters of the
[non-normative funding example](https://dcdpr.github.io/did-btcr2/operations/update.html#funding-a-beacon-signal).

```mermaid
flowchart LR
  subgraph Inputs["Inputs (prevouts)"]
    direction TB
    In1["UTXO that the<br/>Beacon Address controls"]
    In2["Other UTXOs<br/>(optional)"]
  end

  Tx["Beacon Signal<br/>transaction<br/>(fee from feeRate)"]

  subgraph Outputs["Outputs"]
    direction TB
    Change["Change output<br/>(changeAddress)"]
    Last["Last output:<br/>OP_RETURN, OP_PUSH_BYTES,<br/>signal_bytes (32 bytes)"]
  end

  In1 --> Tx
  In2 --> Tx
  Tx --> Change
  Tx --> Last
```

A Beacon Signal is an Authorized Beacon Signal only if its Beacon Address is in the then-current DID document.

## Deactivate operation

Deactivation is permanent. After the resolver applies the deactivation update, resolution stops. The resolver returns
`deactivated: true` in the DID document metadata.

```mermaid
flowchart TD
  Start(["deactivate(didSourceDocument, targetVersionId,<br/>verificationMethodId, signer)"])
  Patch["jsonPatch: add /deactivated = true"]
  Update[["Update operation"]]
  Signed[/"BTCR2 Signed Update"/]
  Resolver["The resolver applies the update:<br/>current_document.deactivated = true"]
  Stop(["Resolution stops at this version:<br/>didDocumentMetadata.deactivated = true"])

  Start --> Patch --> Update --> Signed --> Resolver --> Stop
```

This example shows a BTCR2 Signed Update that deactivates a DID at version 3. The values are shortened.

```json
{
  "@context": [
    "https://w3id.org/json-ld-patch/v1",
    "https://w3id.org/zcap/v1",
    "https://w3id.org/security/data-integrity/v2",
    "https://btcr2.dev/context/v1"
  ],
  "patch": [
    {
      "op": "add",
      "path": "/deactivated",
      "value": true
    }
  ],
  "sourceHash": "Rd9NR_kzIdbPBf9V5Srr5lkr3Qw6pUjr...",
  "targetHash": "HDLiTin4d3Lt-Z5NSh5Kfkhqf4iglDv8...",
  "targetVersionId": 3,
  "proof": {
    "@context": [
      "https://w3id.org/json-ld-patch/v1",
      "https://w3id.org/zcap/v1",
      "https://w3id.org/security/data-integrity/v2",
      "https://btcr2.dev/context/v1"
    ],
    "type": "DataIntegrityProof",
    "cryptosuite": "bip340-jcs-2025",
    "verificationMethod": "did:btcr2:k1q5p...#initialKey",
    "proofPurpose": "capabilityInvocation",
    "capability": "urn:zcap:root:did%3Abtcr2%3Ak1q5p...",
    "capabilityAction": "Write",
    "proofValue": "z313jDDznRsbnr85HMnVFRrLYxsrbQFB..."
  }
}
```
