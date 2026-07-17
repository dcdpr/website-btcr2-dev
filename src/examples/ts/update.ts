// Apply a JSON Patch to a DID document, sign with the verification method
// listed in `capabilityInvocation`, and broadcast through the chosen beacon.
import { createApi } from '@did-btcr2/api';
import { LocalSigner } from '@did-btcr2/keypair';

const api = createApi({ btc: { network: 'regtest' } });

const did =
  'did:btcr2:k1qgpgwtp2dpe3thqny6jngl5eg6p4wghd04yj70jcp8qe4nh75hd4dhc8f08q4';

const secretKeyBytes = new Uint8Array(32); // your 32-byte secp256k1 secret key
const signer = new LocalSigner(secretKeyBytes);

const result = await api.updateDid({
  did,
  patches: [
    {
      op: 'replace',
      path: '/service/0/serviceEndpoint',
      value: 'bitcoin:mppdEp4wznKcUkDrw7LhrtKpTFx19vXxi8',
    },
  ],
  sourceVersionId: 1,
  verificationMethodId: `${did}#initialKey`,
  beaconId: `${did}#initialP2PKH`,
  signer,
});

// result: { signedUpdate, txid, announcement?, proof?, publishedToCas }
console.log(result);

api.dispose();
