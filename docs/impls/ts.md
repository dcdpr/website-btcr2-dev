# TypeScript

The TypeScript reference implementation lives in the
[`did-btcr2-js` monorepo](https://github.com/dcdpr/did-btcr2-js). Three packages
are relevant here:

| Package | Purpose | npm |
|---|---|---|
| [`@did-btcr2/method`](https://www.npmjs.com/package/@did-btcr2/method) | Sans-I/O reference implementation of the DID Method (Create / Resolve / Update state machines). | ✅ |
| [`@did-btcr2/api`](https://www.npmjs.com/package/@did-btcr2/api) | High-level SDK facade with Bitcoin connection, KMS and CAS wiring. | ✅ |
| [`@did-btcr2/cli`](https://github.com/dcdpr/did-btcr2-js/tree/main/packages/cli) | Command-line interface. | ⏳ not yet published |

> **Status** — Both `@did-btcr2/method` and `@did-btcr2/api` are pre-1.0. APIs
> may change before stabilization.

## Install

```sh
pnpm add @did-btcr2/api @did-btcr2/method
```

`@did-btcr2/method` ships browser builds with WASM and top-level await. In
bundlers (Vite, Webpack, esbuild) you typically need:

* `vite-plugin-wasm` + `vite-plugin-top-level-await` (Vite/Vitepress)
* `resolve.conditions: ['browser']` so the browser build is picked up

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

* **`deterministic`** — encode a compressed secp256k1 public key.
* **`external`** — encode the bytes of an intermediate DID document.

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

Updates are JSON Patches applied to the current DID document. The library
signs the update with the verification method you nominate and broadcasts it
through the chosen beacon.

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
