<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { NetworkName } from '@did-btcr2/api';
import DemoCard from '../components/DemoCard.vue';
import { useDidBtcr2 } from '../composables/useDidBtcr2';
import { bytesToHex, hexToBytes, isHex } from './hex';
import './demo-fields.css';

const networks: readonly NetworkName[] = ['bitcoin', 'testnet3', 'testnet4', 'signet', 'mutinynet', 'regtest'];
type Network = NetworkName;

const { ready, modules, createApiForNetwork } = useDidBtcr2();

const selectedNetwork = ref<Network | ''>('');
const idType = ref<'KEY' | 'EXTERNAL' | ''>('');
const pubKeyHex = ref('');
const intermediateDocText = ref('');
const intermediateDocError = ref<string | null>(null);

const running = ref(false);
const response = ref<unknown>(null);
const initialDocument = ref<unknown>(null);

const isKeyValid = computed(() => {
  if (idType.value !== 'KEY') return false;
  const h = pubKeyHex.value.trim();
  if (!h || !isHex(h) || h.length !== 66) return false;
  const prefix = h.slice(0, 2);
  return prefix === '02' || prefix === '03';
});

const isExternalValid = computed(() => {
  if (idType.value !== 'EXTERNAL') return false;
  const raw = intermediateDocText.value.trim();
  return !!raw && !intermediateDocError.value;
});

const canRun = computed(
  () =>
    !!selectedNetwork.value && !!idType.value && (isKeyValid.value || isExternalValid.value),
);

watch(intermediateDocText, () => {
  intermediateDocError.value = null;
  const raw = intermediateDocText.value.trim();
  if (!raw) return;
  try {
    JSON.parse(raw);
  } catch (e: unknown) {
    intermediateDocError.value = e instanceof Error ? e.message : 'Invalid JSON';
  }
});

const snippet = computed(() => {
  const net = selectedNetwork.value || '<network>';
  if (idType.value === 'KEY') {
    const hex = pubKeyHex.value || '<compressed-secp256k1-pubkey-hex>';
    return `import { createApi } from '@did-btcr2/api';

const api = createApi({ btc: { network: '${net}' } });
const genesisBytes = hexToBytes('${hex}');
const did = api.createDid('deterministic', genesisBytes, { network: '${net}' });
console.log(did);`;
  }
  if (idType.value === 'EXTERNAL') {
    return `import { createApi } from '@did-btcr2/api';
import { canonicalHashBytes } from '@did-btcr2/common';

const api = createApi({ btc: { network: '${net}' } });
const intermediateDocument = ${intermediateDocText.value.trim() || '{ /* intermediate DID doc */ }'};
// EXTERNAL identifiers encode the SHA-256 hash of the canonicalized document.
const genesisHash = canonicalHashBytes(intermediateDocument);
const did = api.createDid('external', genesisHash, { network: '${net}' });
console.log(did);`;
  }
  return '// Choose network and idType, then fill the fields to see the call';
});

async function randomize() {
  if (!modules.value) return;
  selectedNetwork.value = networks[Math.floor(Math.random() * networks.length)];
  idType.value = Math.random() < 0.5 ? 'KEY' : 'EXTERNAL';
  const keys = modules.value.keypair.SchnorrKeyPair.generate();
  if (idType.value === 'KEY') {
    pubKeyHex.value = bytesToHex(keys.publicKey.compressed);
    intermediateDocText.value = '';
  } else {
    pubKeyHex.value = '';
    // Build a minimal intermediate DID document from the public key. The
    // identifier fields are placeholders that the create() call will replace
    // when it returns the resolved DID.
    const PLACEHOLDER = 'did:btcr2:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    intermediateDocText.value = JSON.stringify(
      {
        '@context': ['https://www.w3.org/TR/did-1.1', 'https://btcr2.dev/context'],
        id: PLACEHOLDER,
        controller: [PLACEHOLDER],
        verificationMethod: [
          {
            id: `${PLACEHOLDER}#key-0`,
            type: 'Multikey',
            controller: PLACEHOLDER,
            // Multikey requires a base58btc multibase string (zQ3s… prefix).
            publicKeyMultibase: keys.publicKey.encode(),
          },
        ],
        authentication: [`${PLACEHOLDER}#key-0`],
        assertionMethod: [`${PLACEHOLDER}#key-0`],
        capabilityInvocation: [`${PLACEHOLDER}#key-0`],
        capabilityDelegation: [`${PLACEHOLDER}#key-0`],
      },
      null,
      2,
    );
  }
}

async function run() {
  if (!modules.value || !canRun.value) return;
  running.value = true;
  response.value = null;
  initialDocument.value = null;
  try {
    const network = selectedNetwork.value as Network;
    const api = createApiForNetwork(network);
    try {
      if (idType.value === 'KEY') {
        const did = api.createDid('deterministic', hexToBytes(pubKeyHex.value), { network });
        response.value = { did };
      } else {
        const doc = JSON.parse(intermediateDocText.value);
        // EXTERNAL identifiers encode the 32-byte hash of the canonicalized
        // document, not the raw document bytes.
        const genesisHash = modules.value.common.canonicalHashBytes(doc);
        const did = api.createDid('external', genesisHash, { network });
        response.value = { did };
        initialDocument.value = substitutePlaceholder(doc, did);
      }
    } finally {
      api.dispose();
    }
  } catch (err: unknown) {
    response.value = err instanceof Error ? err.stack || err.message : String(err);
  } finally {
    running.value = false;
  }
}

/**
 * Walk a parsed JSON doc and replace every placeholder DID string with the
 * resolved one. Operates on the parsed object, not a stringified copy — the
 * previous implementation double-stringified and then JSON.parsed a string,
 * which produced a string instead of the doc object.
 */
function substitutePlaceholder(doc: unknown, realDid: string): unknown {
  const PLACEHOLDER = 'did:btcr2:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  if (typeof doc === 'string') return doc.split(PLACEHOLDER).join(realDid);
  if (Array.isArray(doc)) return doc.map((v) => substitutePlaceholder(v, realDid));
  if (doc && typeof doc === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(doc)) {
      out[k] = substitutePlaceholder(v, realDid);
    }
    return out;
  }
  return doc;
}

const extra = computed(() =>
  initialDocument.value ? { label: 'Initial Document', value: initialDocument.value } : null,
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
          <option value="EXTERNAL">external (intermediate doc)</option>
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
      <span class="demo-label">Intermediate DID Document (JSON)</span>
      <textarea
        class="demo-textarea"
        v-model="intermediateDocText"
        rows="10"
        spellcheck="false"
        placeholder="{
  &quot;@context&quot;: [&quot;https://www.w3.org/TR/did-1.1&quot;],
  &quot;id&quot;: &quot;did:btcr2:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx&quot;
}"
      />
      <p v-if="intermediateDocText && intermediateDocError" class="demo-error">
        JSON error: {{ intermediateDocError }}
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
