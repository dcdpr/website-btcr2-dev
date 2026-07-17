# Demo

The DID Method specification covers four CRUD operations. The widgets on this page
exercise the **TypeScript** reference implementation (`@did-btcr2/api`, backed by
`@did-btcr2/method`, `@did-btcr2/keypair`, and `@did-btcr2/common`) directly in
your browser via dynamic imports.

* [Create](#create) — produce a new `did:btcr2` identifier from a public key or an intermediate DID document.
* [Resolve](#resolve) — resolve an identifier using Bitcoin beacon signals and optional sidecar data.
* [Update](#update) — apply a JSON Patch to the DID document and announce it on-chain.
* [Deactivate](#deactivate) — special-case Update that adds `{"deactivated": true}` to the DID document.

> **Note** — these demos run client-side against the live Bitcoin network you select.
> Use a test network (`regtest`, `signet`, `mutinynet`, `testnet3`, `testnet4`) for anything
> that broadcasts a transaction, and never paste a real signing key.

## Create

Creating a `did:btcr2` identifier is fully off-chain — no network round-trip is
needed. The Create operation accepts either:

* **`KEY` (deterministic)** — a compressed secp256k1 public key (33 bytes, SEC-encoded).
* **`EXTERNAL`** — an [intermediate DID document](https://dcdpr.github.io/did-btcr2/#def-intermediate-did-document)
  with every identifier replaced by the placeholder
  `did:btcr2:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`.
  The identifier encodes the SHA-256 hash of the canonicalized document.

Supported networks: `bitcoin`, `testnet3`, `testnet4`, `signet`, `mutinynet`, `regtest`.

<DemoCreate />

## Resolve

Resolution drives the [`Resolver`](https://dcdpr.github.io/did-btcr2/operations/resolve.html)
state machine. The `@did-btcr2/api` facade injects the Bitcoin connection for
the configured network so beacon signals can be fetched automatically. For
`did:btcr2:x1…` identifiers you may also provide sidecar data containing the
initial document, signed updates, CAS announcements and/or SMT proofs.

<DemoResolve />

## Update

Updates are applied as [JSON Patch](https://datatracker.ietf.org/doc/html/rfc6902)
documents. `api.updateDid(...)` resolves the current state (unless you provide
`sourceDocument` + `sourceVersionId`), applies your patches, signs the result
with the verification method and signing key you supply, and broadcasts via the
chosen beacon. The response includes the signed update and the signal `txid`.

<DemoUpdate />

## Deactivate

Deactivation is an Update with the well-known patch
`[{ "op": "add", "path": "/deactivated", "value": true }]`. The demo pre-fills
that patch for you.

<DemoUpdate op="deactivate" />
