import { shallowRef } from 'vue';
import type { BeaconAddressType, Btcr2DidDocument, DidBtcr2Api, NetworkName } from '@did-btcr2/api';
import type { Btcr2Modules } from '../composables/useDidBtcr2';
import { hexToBytes } from './hex';

// The demo islands on one page load this module once, so they share this
// state. The Inputs demo shows the key pair and the genesis document, and
// Random Inputs in Create uses them.

/** A secp256k1 key pair in hex: compressed public key (33 bytes), secret key (32 bytes). */
export type DemoKeyPair = { publicKey: string; secretKey: string };

export const demoKeyPair = shallowRef<DemoKeyPair | null>(null);

export function generateDemoKeyPair(modules: Btcr2Modules): DemoKeyPair {
  const keys = modules.api.SchnorrKeyPair.generate();
  demoKeyPair.value = { publicKey: keys.publicKey.hex, secretKey: keys.secretKey.hex };
  return demoKeyPair.value;
}

/** The input of a demo genesis document. The public key is hex (33 bytes). */
export type GenesisSpec = {
  network: NetworkName;
  publicKey: string;
  addressType: BeaconAddressType;
};

export const demoGenesis = shallowRef<{ spec: GenesisSpec; document: Btcr2DidDocument } | null>(null);

/**
 * Build a genesis document: one key with the four verification relationships,
 * and one Singleton beacon with the address of that key on the network.
 */
export function buildGenesis(api: DidBtcr2Api, spec: GenesisSpec): Btcr2DidDocument {
  const publicKey = hexToBytes(spec.publicKey);
  return api.btcr2.buildGenesisDocument({
    network: spec.network,
    verificationMethods: [{ publicKey }],
    beacons: [{ type: 'SingletonBeacon', publicKey, addressType: spec.addressType }],
  });
}
