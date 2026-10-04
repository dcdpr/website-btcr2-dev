---
title: Rust
---

The Rust implementation lives at
[`dcdpr/did-btcr2-rust`](https://github.com/dcdpr/did-btcr2-rust).

> **Status** — Experimental, pre-1.0, and not published to crates.io. The
> current work is on the `resolver-hardening` branch; `main` still holds an
> earlier prototype written against a previous draft of the specification.
> On that branch, create, resolve, update and deactivate work with
> [Singleton Beacons](/diagrams/beacons). CAS and SMT Beacons are not
> implemented yet. The API will change before the first release.

The library is a sans-I/O core: the resolver is a state machine that never
makes network calls itself, and the caller supplies the blockchain data. The
`did-btcr2` command-line tool in the same repository drives it against an
Esplora server.

## Install

Build and install the command-line tool from source:

```sh
git clone --recurse-submodules --branch resolver-hardening \
    https://github.com/dcdpr/did-btcr2-rust.git
cd did-btcr2-rust
cargo install --path crates/did-btcr2-cli
```

The repository pins its Rust toolchain in `rust-toolchain.toml`.

## Create

Create a key-based (`k1`) DID from a new key. This runs offline and prints the
DID, its initial DID document, and the generated secret key:

```sh
did-btcr2 create --generate --network testnet4
```

## Resolve

```sh
did-btcr2 resolve did:btcr2:k1qypcylxwhf8sykn2dztm6z8lxm43kwkyzf07qmp9jafv3zfntmpwtks9hmnrw
```

The network comes from the DID. `--esplora-url` selects another Esplora
server, and `--sidecar <file>` supplies Sidecar Data.

## Update

Sign a JSON Patch and announce it with a Beacon Signal:

```sh
did-btcr2 update <did> --patch patch.json --key-file key.hex --dry-run
```

`--dry-run` prints the transaction without broadcasting it.

## Deactivate

```sh
did-btcr2 deactivate <did> --key-file key.hex --dry-run
```

## Contributing

Open issues and pull requests at
[`dcdpr/did-btcr2-rust`](https://github.com/dcdpr/did-btcr2-rust). Run
`cargo test` before submitting a pull request.
