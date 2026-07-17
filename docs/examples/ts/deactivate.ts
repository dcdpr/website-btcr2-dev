// Deactivation is an Update with the well-known patch
//   [{ op: 'add', path: '/deactivated', value: true }]
import { createApi } from '@did-btcr2/api';

const api = createApi({ btc: { network: 'regtest' } });

const did =
  'did:btcr2:k1qgpgwtp2dpe3thqny6jngl5eg6p4wghd04yj70jcp8qe4nh75hd4dhc8f08q4';

const signed = await api.updateDid({
  did,
  patches: [{ op: 'add', path: '/deactivated', value: true }],
  sourceVersionId: 1,
  verificationMethodId: `${did}#initialKey`,
  beaconId: `${did}#initialP2PKH`,
});

console.log(signed);

api.dispose();
