---
title: Java
---

The Java integration is delivered via the [DIF Universal Resolver](https://dev.uniresolver.io/)
and [Universal Registrar](https://uniregistrar.io/) drivers maintained by Danube Tech.

* [`uni-resolver-driver-did-btr2`](https://github.com/danubetech/uni-resolver-driver-did-btr2)
* [`uni-registrar-driver-did-btr2`](https://github.com/danubetech/uni-registrar-driver-did-btr2)

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
  "options": { "network": "regtest" }
}
```

See [`uni-registrar-driver-did-btr2`](https://github.com/danubetech/uni-registrar-driver-did-btr2)
for the supported request shape.

## Resolve

```http
GET https://dev.uniresolver.io/1.0/identifiers/did:btcr2:k1...
Accept: application/did+ld+json
```

## Update

```http
POST https://uniregistrar.io/1.0/update?method=btcr2
Content-Type: application/json

{
  "did": "did:btcr2:k1...",
  "didDocumentOperation": ["addToDidDocument"],
  "didDocument": [ { ... } ]
}
```

## Deactivate

```http
POST https://uniregistrar.io/1.0/deactivate?method=btcr2
Content-Type: application/json

{ "did": "did:btcr2:k1..." }
```

## Contributing

File issues against the appropriate driver repo. PRs are welcomed by the
Danube Tech maintainers; see each repo's `CONTRIBUTING` document for details.
