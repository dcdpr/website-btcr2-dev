# Demo

The DID Method specification covers four CRUD operations. The widgets on this page
exercise the **TypeScript** reference implementation (`@did-btcr2/api`, backed by
`@did-btcr2/method`, `@did-btcr2/keypair`, and `@did-btcr2/common`) directly in
your browser via dynamic imports.

* [Create](#create) — produce a new `did:btcr2` identifier from a public key or a Genesis Document.
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
* **`EXTERNAL`** — the SHA-256 hash of a JCS-canonicalized
  [Genesis Document](https://dcdpr.github.io/did-btcr2/terminology.html#genesis-document):
  a DID document written against the placeholder identifier `did:btcr2:_` that must
  include at least one beacon `service` entry. **Random Inputs** builds a valid one via
  `GenesisDocument.fromPublicKey(pubkey, network)`. Keep the document: the hash is
  one-way, so resolving the resulting `x1…` identifier requires it as sidecar data.

Supported networks: `bitcoin`, `testnet3`, `testnet4`, `signet`, `mutinynet`, `regtest`.

<DemoCreate />

## Resolve

Resolution drives the [`Resolver`](https://dcdpr.github.io/did-btcr2/operations/resolve.html)
state machine. The `@did-btcr2/api` facade injects the Bitcoin connection for
the configured network so beacon signals can be fetched automatically. For
`did:btcr2:x1…` identifiers the identifier encodes only a hash, so resolution
also needs the Genesis Document supplied as sidecar data:
`{ "genesisDocument": … }` (the Create demo's "Sidecar for Resolve" output
pastes straight in; a bare genesis document is wrapped automatically), plus any
signed updates, CAS announcements and/or SMT proofs the DID's history requires.

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
