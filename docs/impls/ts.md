# TypeScript

The TypeScript reference implementation lives in the
[`did-btcr2-js` monorepo](https://github.com/dcdpr/did-btcr2-js). The packages
most relevant to consumers:

| Package | Purpose |
|---|---|
| [`@did-btcr2/method`](https://www.npmjs.com/package/@did-btcr2/method) | Sans-I/O reference implementation of the DID Method (Create / Resolve / Update state machines). |
| [`@did-btcr2/api`](https://www.npmjs.com/package/@did-btcr2/api) | High-level SDK facade with Bitcoin connection, KMS and CAS wiring. |
| [`@did-btcr2/keypair`](https://www.npmjs.com/package/@did-btcr2/keypair) | Schnorr/secp256k1 key pairs, Multikey encoding, and the `Signer` interface (`LocalSigner`). |
| [`@did-btcr2/common`](https://www.npmjs.com/package/@did-btcr2/common) | Shared types plus canonicalization/hash utilities (`canonicalHashBytes`). |
| [`@did-btcr2/aggregation`](https://www.npmjs.com/package/@did-btcr2/aggregation) | Aggregated-beacon protocol with Nostr and HTTP/REST transports. |
| [`@did-btcr2/cli`](https://www.npmjs.com/package/@did-btcr2/cli) | Command-line interface. |

> **Status**: all packages are pre-1.0. APIs may change before stabilization.

## Install

```sh
pnpm add @did-btcr2/api @did-btcr2/keypair @did-btcr2/common
```

The packages are pure JavaScript (no WASM) and target both Node.js ≥ 22 and
modern browsers. Each ships a prebuilt browser bundle selected via the
`browser` condition in `exports`; in Vite set
`resolve.conditions: ['browser']` if your build resolves with Node conditions
(e.g. VitePress SSR).

## Quickstart

```ts
import { createApi } from '@did-btcr2/api';
import { SchnorrKeyPair } from '@did-btcr2/keypair';

const api = createApi({ btc: { network: 'regtest' } });

const keys = SchnorrKeyPair.generate();
const did = api.createDid('deterministic', keys.publicKey.compressed, {
  network: 'regtest',
});

console.log(did); // did:btcr2:k1…

api.dispose();
```

## Create

`did:btcr2` identifiers can be created entirely offline. Two modes:

* **`deterministic`**: encode a compressed secp256k1 public key.
* **`external`**: encode the SHA-256 hash of the canonicalized intermediate
  DID document (`canonicalHashBytes` from `@did-btcr2/common`).

::: code-group
<<< @/examples/ts/create-key.ts [Deterministic (k1)]
<<< @/examples/ts/create-external.ts [External (x1)]
:::

## Resolve

Resolution drives the [`Resolver`](https://dcdpr.github.io/did-btcr2/operations/resolve.html)
state machine. `api.resolveDid()` injects the configured Bitcoin connection so
beacon signals are fetched for you.

<<< @/examples/ts/resolve.ts

## Update

Updates are JSON Patches applied to the current DID document. You supply a
`Signer` (e.g. `LocalSigner` from `@did-btcr2/keypair`, or a KMS-backed
signer); the library signs the update with the verification method you
nominate and broadcasts it through the chosen beacon. The result contains the
signed update, the signal `txid`, and any per-beacon sidecar artifacts.

<<< @/examples/ts/update.ts

## Deactivate

Deactivation is an Update with the well-known patch
`[{ op: 'add', path: '/deactivated', value: true }]`.

<<< @/examples/ts/deactivate.ts

## Contributing

To report bugs or request features, open an issue at
<https://github.com/dcdpr/did-btcr2-js/issues>.

Local development:

```sh
git clone https://github.com/dcdpr/did-btcr2-js.git
cd did-btcr2-js
pnpm install
pnpm build
pnpm test
```

Requires Node.js ≥ 22.
