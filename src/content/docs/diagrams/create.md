---
title: Create
description: Diagrams of the did:btcr2 Create operation and the identifier encoding.
---

The [Create](https://dcdpr.github.io/did-btcr2/operations/create.html) operation makes a did:btcr2 identifier from
three values: [Genesis Bytes](https://dcdpr.github.io/did-btcr2/terminology.html#genesis-bytes), a Bitcoin network,
and a specification version. Create is offline: it does not use the Bitcoin network or CAS.

## Create operation

The Genesis Bytes are one of two types:

- A secp256k1 public key. The result is a key-based `k1` DID.
- The hash of a [Genesis Document](https://dcdpr.github.io/did-btcr2/data-structures.html#genesis-document). The
  result is a document-based `x1` DID. A resolver needs the Genesis Document to resolve the DID.

```mermaid
flowchart TD
  classDef error fill:#fdecea,stroke:#b3261e,color:#b3261e

  Start(["create(genesisBytes, network, version)"])
  Kind{"Type of<br/>Genesis Bytes"}
  Key["secp256k1 public key:<br/>33 bytes, compressed SEC format<br/>(prefix 0x02 or 0x03)"]
  GenesisDoc["Genesis Document:<br/>a DID document with<br/>id = did:btcr2:_"]
  Hash["JSON Document Hashing<br/>(JCS, then SHA-256):<br/>32 bytes"]
  EncodeK[["DID-BTCR2 Identifier Encoding<br/>hrp = k"]]
  EncodeX[["DID-BTCR2 Identifier Encoding<br/>hrp = x"]]
  ReturnK[/"did:btcr2:k1…"/]
  ReturnX[/"did:btcr2:x1…"/]
  Keep["Keep the Genesis Document for Sidecar Data,<br/>or publish it to CAS"]
  Err(["INVALID_DID"]):::error

  Start --> Kind
  Kind -->|"public key"| Key --> EncodeK --> ReturnK
  Kind -->|"Genesis Document"| GenesisDoc --> Hash --> EncodeX --> ReturnX
  ReturnX -.-> Keep
  EncodeK -->|"encoding error"| Err
  EncodeX -->|"encoding error"| Err
```

A Genesis Document can have more than one verification method and more than one BTCR2 Beacon. It can also have
Aggregate Beacons and other service endpoints. To make an updatable DID, include at least one `capabilityInvocation`
verification method and at least one BTCR2 Beacon service.

## Identifier encoding

The [DID-BTCR2 Identifier Encoding](https://dcdpr.github.io/did-btcr2/algorithms.html#did-btcr2-identifier-encoding)
algorithm packs the version, the network, and the Genesis Bytes into one Bech32m string. The
[decoding](https://dcdpr.github.io/did-btcr2/algorithms.html#did-btcr2-identifier-decoding) algorithm does the
inverse operation.

```mermaid
flowchart TD
  V["version_number = 1"] --> VB["btcr2_version = 0<br/>(4 bits)"]
  N["network_name"] --> NB["network_value<br/>(4 bits, Table 1)"]
  VB --> Byte["First byte:<br/>btcr2_version in bits 0 to 3,<br/>network_value in bits 4 to 7"]
  NB --> Byte
  G["key_or_hash<br/>(Genesis Bytes)"] --> Data
  Byte --> Data["Unencoded data bytes:<br/>first byte + genesis_bytes<br/>(34 or 33 bytes)"]
  Data --> Bech["Bech32m encode,<br/>lowercase<br/>hrp k: public key<br/>hrp x: hash"]
  Bech --> DID["did:btcr2: + method-specific-id"]
```

The bit numbers count from the left of the byte. Thus the first byte of a `mutinynet` DID is `0x05`.

| `network_name` | `network_value` |
|:---------------|:----------------|
| `bitcoin` | `0` |
| `signet` | `1` |
| `regtest` | `2` |
| `testnet3` | `3` |
| `testnet4` | `4` |
| `mutinynet` | `5` |
| Reserved | `6` to `11` |
| Custom networks | `12` to `15` |
