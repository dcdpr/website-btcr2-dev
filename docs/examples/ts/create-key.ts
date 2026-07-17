// Create a deterministic `did:btcr2:k1…` identifier from a compressed
// secp256k1 public key.
import { createApi } from '@did-btcr2/api';
import { SchnorrKeyPair } from '@did-btcr2/keypair';

const api = createApi({ btc: { network: 'regtest' } });

const keys = SchnorrKeyPair.generate(); // or supply your own bytes
const did = api.createDid('deterministic', keys.publicKey.compressed, {
  network: 'regtest',
});

console.log({ did });

api.dispose();
