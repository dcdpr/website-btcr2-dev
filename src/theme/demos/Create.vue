<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { NetworkName } from '@did-btcr2/api';
import DemoCard from '../components/DemoCard.vue';
import { TEST_NETWORKS, useDidBtcr2 } from '../composables/useDidBtcr2';
import { hexToBytes, isHex } from './hex';
import {
  buildGenesis,
  demoGenesis,
  demoKeyPair,
  generateDemoKeyPair,
  type GenesisSpec,
} from './shared-inputs';
import { formatError } from './errors';
import './demo-fields.css';

const networks = TEST_NETWORKS;
type Network = NetworkName;

const { ready, modules, createApiForNetwork } = useDidBtcr2();

const selectedNetwork = ref<Network | ''>('');
const idType = ref<'KEY' | 'EXTERNAL' | ''>('');
const pubKeyHex = ref('');
const genesisDocText = ref('');
const genesisDocError = ref<string | null>(null);

const running = ref(false);
const response = ref<unknown>(null);
const resolveSidecar = ref<unknown>(null);

const isKeyValid = computed(() => {
  if (idType.value !== 'KEY') return false;
  const h = pubKeyHex.value.trim();
  if (!h || !isHex(h) || h.length !== 66) return false;
  const prefix = h.slice(0, 2);
  return prefix === '02' || prefix === '03';
});

const isExternalValid = computed(() => {
  if (idType.value !== 'EXTERNAL') return false;
  const raw = genesisDocText.value.trim();
  return !!raw && !genesisDocError.value;
});

const canRun = computed(
  () =>
    !!selectedNetwork.value && !!idType.value && (isKeyValid.value || isExternalValid.value),
);

watch(genesisDocText, () => {
  genesisDocError.value = null;
  const raw = genesisDocText.value.trim();
  if (!raw) return;
  try {
    JSON.parse(raw);
  } catch (e: unknown) {
    genesisDocError.value = e instanceof Error ? e.message : 'Invalid JSON';
  }
});

const snippet = computed(() => {
  const net = selectedNetwork.value || '<network>';
  if (idType.value === 'KEY') {
    const hex = pubKeyHex.value || '<compressed-secp256k1-pubkey-hex>';
    return `import { createApi } from '@did-btcr2/api';

// A new DID takes the network of the Bitcoin connection.
const api = createApi({ btc: { network: '${net}' } });
const did = api.createDid('deterministic', hexToBytes('${hex}'));
// Fund one of these addresses before the first update.
const beacons = api.btcr2.getBeacons(api.btcr2.getInitialDocument(did));
console.log({ did, beacons });`;
  }
  if (idType.value === 'EXTERNAL') {
    return `import { createApi } from '@did-btcr2/api';

const api = createApi({ btc: { network: '${net}' } });
// Genesis document: placeholder ids (did:btcr2:_) and at least one beacon
// service. api.btcr2.buildGenesisDocument({ verificationMethods: [{ publicKey }] })
// builds a valid one.
const genesisDocument = ${genesisDocText.value.trim() || '{ /* genesis document */ }'};
// The api checks the document, hashes it (JCS + SHA-256), and encodes the DID.
const { did, didDocument } = api.btcr2.createExternalFromDocument(genesisDocument);
const beacons = api.btcr2.getBeacons(didDocument);
// Keep the document: resolving this DID needs it back as sidecar data:
//   api.resolveDid(did, { sidecar: { genesisDocument } })
console.log({ did, beacons });`;
  }
  return '// Choose network and idType, then fill the fields to see the call';
});

async function randomize() {
  if (!modules.value) return;
  selectedNetwork.value = networks[Math.floor(Math.random() * networks.length)];
  idType.value = Math.random() < 0.5 ? 'KEY' : 'EXTERNAL';
  // Use the key pair and the genesis document of the Inputs demo, so the
  // user has the secret key that updates the new DID.
  const keys = demoKeyPair.value ?? generateDemoKeyPair(modules.value);
  if (idType.value === 'KEY') {
    pubKeyHex.value = keys.publicKey;
    genesisDocText.value = '';
  } else {
    pubKeyHex.value = '';
    const genesis = demoGenesis.value?.spec;
    if (genesis) selectedNetwork.value = genesis.network;
    generateGenesisDoc(
      genesis ?? {
        network: selectedNetwork.value as Network,
        publicKey: keys.publicKey,
        beacons: [{ type: 'SingletonBeacon', addressType: 'p2wpkh' }],
      },
    );
  }
}

// The input of the last generated genesis doc, kept so a network change can
// regenerate the doc (its beacon address is network-specific). The text is
// kept too so we never clobber a document the user has hand-edited.
let lastGenSpec: GenesisSpec | null = null;
let lastGenDocText = '';

// Build the genesis document with the library, not by hand.
function generateGenesisDoc(spec: GenesisSpec) {
  const api = createApiForNetwork(spec.network);
  try {
    lastGenDocText = JSON.stringify(buildGenesis(api, spec), null, 2);
    lastGenSpec = spec;
    genesisDocText.value = lastGenDocText;
  } finally {
    api.dispose();
  }
}

watch(selectedNetwork, () => {
  if (
    idType.value === 'EXTERNAL' &&
    selectedNetwork.value &&
    lastGenSpec &&
    genesisDocText.value === lastGenDocText
  ) {
    generateGenesisDoc({ ...lastGenSpec, network: selectedNetwork.value as Network });
  }
});

async function run() {
  if (!modules.value || !canRun.value) return;
  running.value = true;
  response.value = null;
  resolveSidecar.value = null;
  try {
    const network = selectedNetwork.value as Network;
    const api = createApiForNetwork(network);
    try {
      if (idType.value === 'KEY') {
        const did = api.createDid('deterministic', hexToBytes(pubKeyHex.value));
        const beacons = api.btcr2.getBeacons(api.btcr2.getInitialDocument(did));
        response.value = { did, beacons };
      } else {
        const genesisDocument = JSON.parse(genesisDocText.value);
        // The api refuses a document that is not a valid genesis document,
        // so an edited document cannot mint a DID that never resolves.
        const { did, didDocument } = api.btcr2.createExternalFromDocument(genesisDocument);
        response.value = { did, beacons: api.btcr2.getBeacons(didDocument) };
        // The hash is one-way, so resolving this DID requires this exact
        // placeholder-form document back, under the `genesisDocument` sidecar
        // key. Hand the user a ready-to-paste payload for the Resolve demo.
        resolveSidecar.value = { genesisDocument };
      }
    } finally {
      api.dispose();
    }
  } catch (err: unknown) {
    response.value = formatError(err);
  } finally {
    running.value = false;
  }
}

const extra = computed(() =>
  resolveSidecar.value
    ? { label: 'Sidecar for Resolve (paste into the Resolve demo)', value: resolveSidecar.value }
    : null,
);
</script>

<template>
  <DemoCard
    title="Create"
    :snippet="snippet"
    :response="response"
    :running="running"
    :can-run="canRun"
    :ready="ready"
    run-label="Create"
    running-label="Creating…"
    :extra="extra"
    @run="run"
  >
    <div class="demo-row cols-2">
      <label class="demo-field">
        <span class="demo-label">Bitcoin Network</span>
        <select class="demo-select" v-model="selectedNetwork">
          <option value="" disabled>Select a network…</option>
          <option v-for="n in networks" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>

      <label class="demo-field">
        <span class="demo-label">ID Type</span>
        <select class="demo-select" v-model="idType">
          <option value="" disabled>Select id type…</option>
          <option value="KEY">key (deterministic)</option>
          <option value="EXTERNAL">external (genesis document)</option>
        </select>
      </label>
    </div>

    <div v-if="idType === 'KEY'" class="demo-field">
      <span class="demo-label">Compressed secp256k1 Public Key (hex, 33 bytes)</span>
      <input
        class="demo-input"
        v-model.trim="pubKeyHex"
        placeholder="02… or 03… (66 hex chars)"
        spellcheck="false"
      />
      <p v-if="pubKeyHex && !isKeyValid" class="demo-warn">
        Must be 66 hex chars, starting with 02 or 03.
      </p>
    </div>

    <div v-else-if="idType === 'EXTERNAL'" class="demo-field">
      <span class="demo-label">Genesis Document (JSON, placeholder ids + a beacon service; Random Inputs builds one)</span>
      <textarea
        class="demo-textarea"
        v-model="genesisDocText"
        rows="10"
        spellcheck="false"
        placeholder="{
  &quot;id&quot;: &quot;did:btcr2:_&quot;,
  &quot;verificationMethod&quot;: [{ &quot;id&quot;: &quot;did:btcr2:_#key-0&quot;, … }],
  &quot;service&quot;: [{ &quot;type&quot;: &quot;SingletonBeacon&quot;, … }]
}"
      />
      <p v-if="genesisDocText && genesisDocError" class="demo-error">
        JSON error: {{ genesisDocError }}
      </p>
    </div>

    <template #actions>
      <button class="btn" :disabled="!ready" @click="randomize">Random Inputs</button>
    </template>
  </DemoCard>
</template>

<style scoped>
.btn {
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid var(--vp-c-brand-1);
  background: transparent;
  color: var(--vp-c-brand-1);
  cursor: pointer;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
