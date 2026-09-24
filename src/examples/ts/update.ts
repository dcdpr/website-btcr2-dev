// Apply a JSON Patch to a DID document, sign the update, and broadcast a
// beacon signal. The beacon address must hold a confirmed UTXO.
import { createApi, LocalSigner } from '@did-btcr2/api';

const api = createApi({ btc: { network: 'mutinynet' } });

const did = 'did:btcr2:k1q5p...'; // your DID
const secretKey = new Uint8Array(32); // your 32-byte secp256k1 secret key

// Link a website to the DID. The api resolves the current document first.
// verificationMethodId and beaconId are optional: the api uses the method
// that publishes the signer's key and the beacon that holds the only
// spendable UTXO.
const result = await api.updateDid({
  did,
  patches: [{
    op: 'add',
    path: '/service/-',
    value: { id: `${did}#website`, type: 'LinkedDomains', serviceEndpoint: 'https://example.com' },
  }],
  signer: new LocalSigner(secretKey),
});

// Keep result.signedUpdate. Bitcoin holds only its hash. A resolver needs
// the signed update as sidecar data, unless you publish it to a CAS.
// result: { signedUpdate, txid, announcement?, proof?, publishedToCas }
console.log(result.txid, result.signedUpdate);
