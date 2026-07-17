# Cross-impl Parity Matrix

A quick snapshot of which `did:btcr2` features each implementation supports
today. Use it to pick an implementation that fits your stack.

## CRUD operations

| Operation | TypeScript | Java (UR/UR) | Python | Rust |
|---|:---:|:---:|:---:|:---:|
| **Create** — deterministic (`k1`) | ✅ | ✅ | 🚧 | 🚧 |
| **Create** — external (`x1`) | ✅ | ✅ | 🚧 | 🚧 |
| **Resolve** — Bitcoin beacons | ✅ | ✅ | 🚧 | 🚧 |
| **Resolve** — sidecar | ✅ | ⚠️ | 🚧 | 🚧 |
| **Resolve** — CAS / IPFS | ✅ | ⚠️ | 🚧 | 🚧 |
| **Update** — Singleton beacon | ✅ | ⚠️ | 🚧 | 🚧 |
| **Update** — Map / SMT beacon | 🚧 | 🚧 | 🚧 | 🚧 |
| **Deactivate** | ✅\* | ⚠️ | 🚧 | 🚧 |

\* TS deactivate is implemented as an Update with the well-known
`{ "op": "add", "path": "/deactivated", "value": true }` patch. A first-class
`api.btcr2.deactivate()` is not yet wired through.

## Bitcoin networks

| Network | TypeScript | Java | Python | Rust |
|---|:---:|:---:|:---:|:---:|
| `bitcoin` (mainnet) | ✅ | ✅ | 🚧 | 🚧 |
| `testnet3` | ✅ | ✅ | 🚧 | 🚧 |
| `testnet4` | ✅ | ✅ | 🚧 | 🚧 |
| `signet` | ✅ | ✅ | 🚧 | 🚧 |
| `mutinynet` | ✅ | ⚠️ | 🚧 | 🚧 |
| `regtest` | ✅ | ✅ | 🚧 | 🚧 |

## Capabilities

| Feature | TypeScript | Java | Python | Rust |
|---|:---:|:---:|:---:|:---:|
| Pure sans-I/O state machines | ✅ | n/a | 🚧 | 🚧 |
| Pluggable KMS | ✅ | ⚠️ | 🚧 | 🚧 |
| Pluggable CAS executor | ✅ | ⚠️ | 🚧 | 🚧 |
| Browser-runnable (pure JS, no WASM) | ✅ | n/a | n/a | 🚧 |
| Universal Resolver driver | n/a | ✅ | n/a | n/a |
| Universal Registrar driver | n/a | ✅ | n/a | n/a |

## Legend

| Symbol | Meaning |
|---|---|
| ✅ | Supported and exercised by tests / demos |
| ⚠️ | Partial support — see implementation docs for caveats |
| 🚧 | Not yet implemented / in progress |
| n/a | Not applicable to this implementation's shape |

> The matrix is maintained by hand against each implementation's current
> `main` branch. Open an issue if a cell looks wrong.
