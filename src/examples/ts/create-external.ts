// Create an external `did:btcr2:x1…` identifier from a genesis document.
// The identifier encodes the SHA-256 hash of the canonical document.
import { createApi, SchnorrKeyPair } from '@did-btcr2/api';

const api = createApi({ btc: { network: 'mutinynet' } });
const keys = SchnorrKeyPair.generate();

// One key with all four verification relationships, and one Singleton
// beacon at the P2WPKH address of that key. The builder uses the
// placeholder id `did:btcr2:_` and the two required contexts.
const genesisDocument = api.btcr2.buildGenesisDocument({
  verificationMethods: [{ publicKey: keys.publicKey.compressed }],
});

// Hash exactly the JSON that you keep: one changed byte gives another DID.
const json = JSON.stringify(genesisDocument);
const { did, didDocument } = api.btcr2.createExternalFromDocument(JSON.parse(json));
const [beacon] = api.btcr2.getBeacons(didDocument);

// Keep `json`. Resolution of an x1 DID needs the genesis document as
// sidecar data: api.resolveDid(did, { sidecar: { genesisDocument } })
const report = api.did.validate(did, { genesisDocument: JSON.parse(json) });

console.log({ did, beacon: beacon.address, valid: report.valid });
