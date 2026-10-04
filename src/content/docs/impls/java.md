---
title: Java
---

The Java integration is delivered via the DIF [Universal Resolver](https://uniresolver.io/)
and [Universal Registrar](https://uniregistrar.io/) drivers maintained by Danube Tech.

* [`uni-resolver-driver-did-btcr2`](https://github.com/danubetech/uni-resolver-driver-did-btcr2)
* [`uni-registrar-driver-did-btcr2`](https://github.com/danubetech/uni-registrar-driver-did-btcr2)

> **Status** — Driver-only. There is no standalone Java SDK at this time;
> JVM consumers should drive the operations via the Universal Resolver /
> Registrar HTTP APIs.

## Install

Both drivers are distributed as Docker images. Pull and run via
`docker compose`; see the per-driver READMEs for compose snippets.

## Create

```http
POST https://uniregistrar.io/1.0/create?method=btcr2
Content-Type: application/json

{
  "didDocument": { ... },
  "options": { "network": "mutinynet" }
}
```

See [`uni-registrar-driver-did-btcr2`](https://github.com/danubetech/uni-registrar-driver-did-btcr2)
for the supported request shape.

## Resolve

```http
GET https://uniresolver.io/1.0/identifiers/did:btcr2:k1qypcylxwhf8sykn2dztm6z8lxm43kwkyzf07qmp9jafv3zfntmpwtks9hmnrw
Accept: application/did
```

Or via UI (open in browser):

https://uniresolver.io/#did:btcr2:k1qypcylxwhf8sykn2dztm6z8lxm43kwkyzf07qmp9jafv3zfntmpwtks9hmnrw

## Update

```http
POST https://uniregistrar.io/1.0/update?method=btcr2
Content-Type: application/json

{
  "did": "did:btcr2:k1...",
  "didDocumentOperation": ["addToDidDocument"],
  "didDocument": [ { ... } ],
  "options": {
    "didSourceDocument": { ... },
    "targetVersionId": 2
  }
}
```

`options.didSourceDocument` (the current DID document) and `options.targetVersionId`
are required. `beaconServiceId`, `beaconServiceType` and `publishToIpfs` are optional.
See the [registrar driver README](https://github.com/danubetech/uni-registrar-driver-did-btcr2#update-and-deactivate)
for the options.

## Deactivate

```http
POST https://uniregistrar.io/1.0/deactivate?method=btcr2
Content-Type: application/json

{
  "did": "did:btcr2:k1...",
  "options": {
    "didSourceDocument": { ... },
    "targetVersionId": 3
  }
}
```

## Contributing

File issues and PRs against the appropriate driver repo.
