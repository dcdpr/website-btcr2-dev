<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { BeaconAddressType, NetworkName } from '@did-btcr2/api';
import CopyButton from '../components/CopyButton.vue';
import DemoCard from '../components/DemoCard.vue';
import { TEST_NETWORKS, useDidBtcr2 } from '../composables/useDidBtcr2';
import { formatError } from './errors';
import { isHex } from './hex';
import { buildGenesis, demoGenesis, demoKeyPair, generateDemoKeyPair } from './shared-inputs';
import './demo-fields.css';

const { ready, modules, createApiForNetwork } = useDidBtcr2();

const mode = ref<'keys' | 'genesis'>('keys');

// Key Pair mode: one field for each key, so the user can copy each key alone.
const keyFields = computed(() => [
  { label: 'Public key (hex, 33 bytes), for Create', value: demoKeyPair.value?.publicKey ?? '' },
  {
    label: 'Secret key (hex, 32 bytes), for Update and Deactivate',
    value: demoKeyPair.value?.secretKey ?? '',
  },
]);

// Genesis Document mode.
const ADDRESS_TYPES: readonly BeaconAddressType[] = ['p2pkh', 'p2wpkh', 'p2tr'];
const network = ref<NetworkName>('mutinynet');
const addressType = ref<BeaconAddressType>('p2wpkh');
const genesisPubKey = ref('');
const genesisError = ref<string | null>(null);

// The public key field follows the key pair.
watch(
  demoKeyPair,
  (pair) => {
    if (pair) genesisPubKey.value = pair.publicKey;
  },
  { immediate: true },
);

const isPubKeyValid = computed(() => {
  const h = genesisPubKey.value;
  return isHex(h) && h.length === 66 && (h.startsWith('02') || h.startsWith('03'));
});

// An empty public key is allowed: Generate then makes a key pair first.
const canRun = computed(() => mode.value === 'keys' || !genesisPubKey.value || isPubKeyValid.value);

const response = computed(() =>
  mode.value === 'keys' ? demoKeyPair.value : (genesisError.value ?? demoGenesis.value?.document ?? null),
);

const snippet = computed(() => {
  if (mode.value === 'keys') {
    return `import { SchnorrKeyPair } from '@did-btcr2/api';

// A new secp256k1 key pair from a secure random source.
const keys = SchnorrKeyPair.generate();
// Create takes the compressed public key (33 bytes).
const publicKey = keys.publicKey.hex;
// Update and Deactivate sign with the secret key (32 bytes).
const secretKey = keys.secretKey.hex;
console.log({ publicKey, secretKey });`;
  }
  return `import { createApi } from '@did-btcr2/api';

// The network sets the beacon address.
const api = createApi({ btc: { network: '${network.value}' } });
const publicKey = hexToBytes('${genesisPubKey.value || '<compressed-secp256k1-pubkey-hex>'}');
// One key with the four verification relationships, and one Singleton
// beacon with the ${addressType.value} address of the key. Every id uses the
// placeholder did:btcr2:_.
const genesisDocument = api.btcr2.buildGenesisDocument({
  verificationMethods: [{ publicKey }],
  beacons: [{ type: 'SingletonBeacon', publicKey, addressType: '${addressType.value}' }],
});
// Create hashes it into a did:btcr2:x1... identifier:
//   api.btcr2.createExternalFromDocument(genesisDocument)
console.log(genesisDocument);`;
});

function run() {
  if (!modules.value) return;
  if (mode.value === 'keys') {
    generateDemoKeyPair(modules.value);
    return;
  }
  const publicKey = genesisPubKey.value || generateDemoKeyPair(modules.value).publicKey;
  const spec = { network: network.value, publicKey, addressType: addressType.value };
  const api = createApiForNetwork(spec.network);
  try {
    demoGenesis.value = { spec, document: buildGenesis(api, spec) };
    genesisError.value = null;
  } catch (err: unknown) {
    genesisError.value = formatError(err);
  } finally {
    api.dispose();
  }
}
</script>

<template>
  <DemoCard
    :title="mode === 'keys' ? 'Key Pair' : 'Genesis Document'"
    :snippet="snippet"
    :response="response"
    :running="false"
    :can-run="canRun"
    :ready="ready"
    run-label="Generate"
    @run="run"
  >
    <div class="mode-toggle" role="group" aria-label="What to generate">
      <button type="button" :aria-pressed="mode === 'keys'" @click="mode = 'keys'">Key Pair</button>
      <button type="button" :aria-pressed="mode === 'genesis'" @click="mode = 'genesis'">
        Genesis Document
      </button>
    </div>

    <p v-if="mode === 'keys'" class="demo-warn">
      ⚠️ The page shows the secret key in clear text. Use this key pair on test networks only.
    </p>

    <template v-else>
      <div class="demo-row cols-2">
        <label class="demo-field">
          <span class="demo-label">Bitcoin Network (of the beacon address)</span>
          <select class="demo-select" v-model="network">
            <option v-for="n in TEST_NETWORKS" :key="n" :value="n">{{ n }}</option>
          </select>
        </label>
        <label class="demo-field">
          <span class="demo-label">Beacon address type</span>
          <select class="demo-select" v-model="addressType">
            <option v-for="t in ADDRESS_TYPES" :key="t" :value="t">{{ t }}</option>
          </select>
        </label>
      </div>
      <label class="demo-field">
        <span class="demo-label">Compressed secp256k1 Public Key (hex, 33 bytes)</span>
        <input
          class="demo-input"
          v-model.trim="genesisPubKey"
          placeholder="02… or 03… (66 hex chars)"
          spellcheck="false"
        />
        <p v-if="genesisPubKey && !isPubKeyValid" class="demo-warn">
          Must be 66 hex chars, starting with 02 or 03.
        </p>
        <p v-else class="demo-hint">
          The key pair fills this field. If it is empty, Generate makes a key pair first.
        </p>
      </label>
    </template>

    <template v-if="mode === 'keys'" #response>
      <div class="key-fields">
        <label v-for="field in keyFields" :key="field.label" class="demo-field">
          <span class="demo-label">{{ field.label }}</span>
          <span class="key-value">
            <input class="demo-input" readonly :value="field.value" placeholder="—" />
            <CopyButton :text="field.value" :label="`Copy ${field.label}`" />
          </span>
        </label>
      </div>
    </template>
  </DemoCard>
</template>

<style scoped>
.mode-toggle {
  display: inline-flex;
  width: fit-content;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  overflow: hidden;
}

/* margin: 0 removes the Starlight gap between page siblings. */
.mode-toggle button {
  margin: 0;
  padding: 6px 14px;
  border: 0;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
}

.mode-toggle button[aria-pressed='true'] {
  background: var(--vp-c-brand-1);
  color: #000;
}

/* The grid gap sets the space, so remove the Starlight gap between page siblings. */
.key-fields {
  display: grid;
  gap: 12px;
}

.key-fields > * {
  margin: 0;
}

.key-value {
  display: flex;
  gap: 6px;
  align-items: center;
}

/* A 33-byte key in hex has 66 characters. This size shows it on one line. */
.key-value .demo-input {
  font-size: 13px;
}
</style>
