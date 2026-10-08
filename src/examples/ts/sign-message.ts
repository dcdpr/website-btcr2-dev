// Sign a text message with a key of a DID. The proof purpose is always
// assertionMethod, so the signature is never valid as an update proof.
import { createApi } from '@did-btcr2/api';

const api = createApi({ btc: { network: 'mutinynet' } });

const did = 'did:btcr2:k1q5p...'; // your DID
const secretKey = new Uint8Array(32); // your 32-byte secp256k1 secret key
const signer = api.kms.signer(api.kms.import(api.crypto.keypair.fromSecret(secretKey)));

// signMessage does no I/O. Resolve the current DID document first: the key
// must be in its assertionMethod. Add the sidecar data of the DID:
// api.tryResolveDid(did, { sidecar })
const resolution = await api.tryResolveDid(did);
if (!resolution.ok) throw new Error(`${resolution.error}: ${resolution.errorMessage}`);

// The format has no time and no replay protection. Put the date, a nonce,
// and the audience in the text.
const text = 'I control this DID. 2026-10-08 nonce 7f3a';
const signed = api.btcr2.signMessage(resolution.document, text, signer);

// signed: { type: 'BTCR2Message', message, proof }. Send it as JSON.
console.log(JSON.stringify(signed));
