// Create a deterministic `did:btcr2:k1…` identifier from a compressed
// secp256k1 public key. Creation is offline: no chain read and no fee.
import { createApi, SchnorrKeyPair } from '@did-btcr2/api';

// A new DID takes the network of the Bitcoin connection.
const api = createApi({ btc: { network: 'mutinynet' } });

const keys = SchnorrKeyPair.generate(); // or load your own key pair
const did = api.createDid('deterministic', keys.publicKey.compressed);

// The initial DID document has three Singleton beacons: P2PKH, P2WPKH, and
// P2TR. Fund one of these addresses before the first update.
const beacons = api.btcr2.getBeacons(api.btcr2.getInitialDocument(did));

console.log({ did, beacons });
