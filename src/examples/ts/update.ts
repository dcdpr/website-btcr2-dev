// Apply a JSON Patch to a DID document, sign the update, and broadcast a
// beacon signal. The beacon address must hold a confirmed UTXO.
import { createApi, LocalSigner } from '@did-btcr2/api';

const api = createApi({ btc: { network: 'mutinynet' } });

const did = 'did:btcr2:k1q5p...'; // your DID
const secretKey = new Uint8Array(32); // your 32-byte secp256k1 secret key
const signer = new LocalSigner(secretKey);

// The api resolves the current document first. verificationMethodId and
// beaconId are optional: the api uses the method that publishes the
// signer's key and the beacon that holds the only spendable UTXO.
const first = await api.updateDid({
  did,
  patches: [{ op: 'add', path: '/alsoKnownAs', value: ['https://example.com'] }],
  signer,
});

// Keep first.signedUpdate. Bitcoin holds only its hash. A resolver needs
// the signed update as sidecar data, unless you publish it to a CAS.
console.log(first.txid, first.signedUpdate);

// The next update resolves the DID too, so it needs the earlier signed
// updates as sidecar data. Pass minConf: 1. With the default (6), an
// update less than 6 blocks after the previous one resolves the old
// version, and the DID gets two updates for one version.
const second = await api.updateDid({
  did,
  patches: [{ op: 'remove', path: '/alsoKnownAs' }],
  signer,
  resolutionOptions: { sidecar: { updates: [first.signedUpdate] }, minConf: 1 },
});

// result: { signedUpdate, txid, announcement?, proof?, publishedToCas }
console.log(second.txid);
