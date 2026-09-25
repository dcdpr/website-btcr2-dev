import { shallowRef } from 'vue';
import type { Btcr2Modules } from '../composables/useDidBtcr2';

/** A secp256k1 key pair in hex: compressed public key (33 bytes), secret key (32 bytes). */
export type DemoKeyPair = { publicKey: string; secretKey: string };

// The demo islands on one page load this module once, so they share this key
// pair. The Key Pair demo shows it, and Random Inputs in Create uses it.
export const demoKeyPair = shallowRef<DemoKeyPair | null>(null);

export function generateDemoKeyPair(modules: Btcr2Modules): DemoKeyPair {
  const keys = modules.api.SchnorrKeyPair.generate();
  demoKeyPair.value = { publicKey: keys.publicKey.hex, secretKey: keys.secretKey.hex };
  return demoKeyPair.value;
}
