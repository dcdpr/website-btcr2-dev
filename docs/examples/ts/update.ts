// Apply a JSON Patch to a DID document, sign with the verification method
// listed in `capabilityInvocation`, and broadcast through the chosen beacon.
import { createApi } from '@did-btcr2/api';

const api = createApi({ btc: { network: 'regtest' } });

const did =
  'did:btcr2:k1qgpgwtp2dpe3thqny6jngl5eg6p4wghd04yj70jcp8qe4nh75hd4dhc8f08q4';

const signed = await api.updateDid({
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
});

console.log(signed);

api.dispose();
