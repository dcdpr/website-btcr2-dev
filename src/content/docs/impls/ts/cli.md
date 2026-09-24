---
title: 'CLI: @did-btcr2/cli'
description: Create, resolve, update, and deactivate did:btcr2 identifiers with the btcr2 command.
---

The `btcr2` command creates, resolves, updates, and deactivates did:btcr2
identifiers from a terminal. It also keeps your keys in an encrypted keystore
and your endpoints in a config file. The CLI wraps the
[SDK](/impls/ts/sdk/).

## Install

```sh
npm install -g @did-btcr2/cli
btcr2 --version
```

The CLI needs Node.js 22 or newer. `pnpm add -g @did-btcr2/cli` also works. To
run the CLI with no install, use `npx @did-btcr2/cli <command>`.

## Quickstart on mutinynet

[Mutinynet](https://mutinynet.com) is a test network with 30-second blocks and a
faucet. Its coins have no value.

### 1. Set up

```sh
btcr2 quickstart -n mutinynet --unlock --ttl 2h
```

The command makes the home directory `~/.btcr2`, a config file, and an encrypted
keystore. It asks for a new passphrase and keeps the unlocked session for two
hours, so the next commands do not ask again.

### 2. Create a DID (offline)

```sh
btcr2 create -n mutinynet
```

```text
did:btcr2:k1q5peptk7dxpuad5krnsjdhulx89f27c72yqpqfvs5xn5gum736xqpgsxnfemr
Generated and stored key urn:kms:secp256k1:6abcb072... (now the active key).
Fund the initial beacon to anchor updates:
  Beacon:   tb1qyw43zf0egqankmxrwyhrtnx4ls3mkp8d2xzh6a
  Faucet:   https://faucet.mutinynet.com/
```

`create` makes a new key, stores it in the keystore, and makes it the active
key. The next command examples use `DID` for your identifier:

```sh
DID=did:btcr2:k1q5p...   # the output of create
```

### 3. Resolve

```sh
btcr2 resolve -i "$DID"
```

The identifier names its network, so `resolve` needs no `-n`. The output is the
DID document and its metadata (`versionId`, `confirmations`, `deactivated`).

### 4. Fund the beacon

An update is a Bitcoin transaction from the beacon address. Open the
[faucet](https://faucet.mutinynet.com/), send about 10,000 sats to the `Beacon`
address from step 2, and wait for one confirmation.

### 5. Update

```sh
btcr2 -o json update -i "$DID" \
  -p '[{"op":"add","path":"/alsoKnownAs","value":["https://example.com"]}]' \
  | jq '.data.signedUpdate' > signed-update.json
```

`update` signs the JSON Patch with the active key and broadcasts a beacon
signal. Bitcoin holds only the hash of the update. `signed-update.json` holds the
update itself: keep it.

### 6. Resolve version 2

Wait for one confirmation, and then about one more minute. Then give the signed
update back as sidecar data:

```sh
btcr2 resolve -i "$DID" --min-conf 1 \
  -r "$(jq -c '{sidecar:{updates:[.]}}' signed-update.json)"
```

The document now has `alsoKnownAs`, and `versionId` is `"2"`. Without the
sidecar data, the resolution cannot build version 2: only you and the parties
that get the signed update can see the change.

### 7. Deactivate

```sh
btcr2 -o json deactivate -i "$DID" --min-conf 1 \
  -r "$(jq -c '{sidecar:{updates:[.]}}' signed-update.json)" \
  | jq '.data.signedUpdate' > signed-deactivate.json
```

Deactivation is permanent. To resolve the deactivated DID, pass both signed
updates:

```sh
btcr2 resolve -i "$DID" --min-conf 1 \
  -r "$(jq -sc '{sidecar:{updates:.}}' signed-update.json signed-deactivate.json)"
```

:::caution[Pass `--min-conf 1` and every signed update on each write]
`update` and `deactivate` resolve the DID first, with the resolution default of
6 confirmations. An update less than 6 blocks after the previous one then builds
on the old version, and the DID gets two updates for one version. Before each
write, resolve the DID and check that `versionId` shows your latest update.
:::

## External (x1) identifiers

An `x1` identifier encodes the hash of a genesis document. `genesis build`
writes the document from a spec file, or asks for the values in a terminal. It
prints the identifier and the beacon address to fund. Use a key that no other
DID uses: two DIDs with one key share a beacon address, and Bitcoin then links
them.

```sh
btcr2 key generate --name alice
cat > spec.json <<'JSON'
{
  "verificationMethods": [{ "key": "alice" }],
  "services": [
    { "id": "#website", "type": "LinkedDomains", "serviceEndpoint": "https://example.com" }
  ]
}
JSON
btcr2 genesis build -n mutinynet --spec spec.json --out genesis.json
btcr2 resolve -i did:btcr2:x1q... --genesis-document genesis.json
```

Keep `genesis.json`. Resolution of an `x1` identifier needs it. Without
`--genesis-document`, the CLI looks for the document in the CAS, and that
search can wait about 30 seconds before it fails.

## Keys and the keystore

* The keystore is one file (`~/.btcr2/keystore.json`). Each secret key is
  encrypted with argon2id and XChaCha20-Poly1305.
* `btcr2 key list` shows the keys. `btcr2 key generate --name alice --set-active`
  makes a named key. `--signing-key <name>` selects a key for one command.
* The CLI gets the passphrase from `BTCR2_KEYSTORE_PASSPHRASE`, then
  `--passphrase-file`, then an unlocked session, then a prompt. It never takes
  the passphrase as a flag value.
* `btcr2 keystore unlock --ttl 2h` keeps a session. `btcr2 keystore lock` ends
  it. A mainnet session needs `--allow-mainnet`.

## Configuration

* The home directory is `~/.btcr2` (`%LOCALAPPDATA%\btcr2` on Windows).
  `--home` or `BTCR2_HOME` changes it.
* A value comes from the first of: a flag, an environment variable, the active
  profile in `config.json`, the default of the network.
* The default REST hosts are the same as in the [SDK](/impls/ts/sdk/#configure).
  `--btc-rest <url>` and `--cas-gateway <url>` change the endpoints.
* `btcr2 config effective -n mutinynet` shows each value and its source.
  `btcr2 config doctor -n mutinynet` tests the endpoints.

## Scripts

* `-o json` prints `{ "action": ..., "data": ... }`. Hints go to stderr.
  `--quiet` removes them.
* The exit code is `0` on success and `1` on an error.
* A script with no terminal needs `BTCR2_KEYSTORE_PASSPHRASE` or
  `--passphrase-file` to sign.

## Commands

| Command | Purpose |
|---|---|
| `quickstart`, `init` | Set up the home, the config file, and the keystore. |
| `create` | Create an identifier (offline). |
| `resolve` | Resolve the DID document of an identifier. |
| `update` | Sign a JSON Patch and broadcast a beacon signal. |
| `deactivate` | Deactivate an identifier. This is permanent. |
| `identifier` | `decode` and `validate` an identifier (offline). |
| `genesis` | `build` the genesis document of an `x1` identifier (offline). |
| `key`, `keystore` | Manage the keys and the keystore. |
| `config`, `profile` | Read and write the config and its profiles. |
| `completion` | Print a bash, zsh, or fish completion script. |

`btcr2 <command> --help` lists the flags of a command. The
[CLI reference](https://github.com/dcdpr/did-btcr2-js/tree/main/packages/cli/docs)
has one page per command, and
[DEMO.md](https://github.com/dcdpr/did-btcr2-js/blob/main/packages/cli/docs/DEMO.md)
is a longer walkthrough.
