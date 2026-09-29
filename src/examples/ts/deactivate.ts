// Deactivate a DID. This is permanent: the api refuses a later update.
// Deactivation is an update with the patch
//   [{ op: 'add', path: '/deactivated', value: true }]
import { createApi, type SignedBTCR2Update } from '@did-btcr2/api';

const api = createApi({ btc: { network: 'mutinynet' } });

const did = 'did:btcr2:k1q5p...'; // your DID
const secretKey = new Uint8Array(32); // your 32-byte secp256k1 secret key
const updates: SignedBTCR2Update[] = [/* every signed update of the DID, in order */];
const signer = api.kms.signer(api.kms.import(api.crypto.keypair.fromSecret(secretKey)));

const { txid, signedUpdate } = await api.deactivateDid(did, signer, {
  resolutionOptions: { sidecar: { updates } },
});

// Add signedUpdate to the sidecar data: a resolver needs it to see the
// deactivation.
console.log(txid, signedUpdate);
