<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import DemoCard from '../components/DemoCard.vue';
import { useDidBtcr2 } from '../composables/useDidBtcr2';
import './demo-fields.css';

const networks = ['bitcoin', 'testnet3', 'testnet4', 'signet', 'mutinynet', 'regtest'] as const;
type Network = (typeof networks)[number];

const props = withDefaults(
  defineProps<{
    /** Op label; defaults to "Update", set to "Deactivate" for the deactivate demo. */
    op?: 'update' | 'deactivate';
  }>(),
  { op: 'update' },
);

const { ready, modules } = useDidBtcr2();

const did = ref('');
const selectedNetwork = ref<Network>('regtest');
const patchesText = ref(
  props.op === 'deactivate'
    ? `[{ "op": "add", "path": "/deactivated", "value": true }]`
    : `[{ "op": "replace", "path": "/service/0/serviceEndpoint", "value": "bitcoin:<new-address>" }]`,
);
const patchesError = ref<string | null>(null);
const verificationMethodId = ref('#initialKey');
const beaconId = ref('#initialP2PKH');
const signingMaterialHex = ref('');
const sourceVersionId = ref(1);

const running = ref(false);
const response = ref<unknown>(null);

watch(patchesText, () => {
  patchesError.value = null;
  const raw = patchesText.value.trim();
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      patchesError.value = 'Patches must be a JSON array of JSON Patch ops';
    }
  } catch (e: unknown) {
    patchesError.value = e instanceof Error ? e.message : 'Invalid JSON';
  }
});

const canRun = computed(
  () =>
    did.value.startsWith('did:btcr2:') &&
    !patchesError.value &&
    !!verificationMethodId.value &&
    !!beaconId.value &&
    !!signingMaterialHex.value,
);

const fullVerificationMethodId = computed(() =>
  verificationMethodId.value.startsWith('#')
    ? `${did.value}${verificationMethodId.value}`
    : verificationMethodId.value,
);
const fullBeaconId = computed(() =>
  beaconId.value.startsWith('#') ? `${did.value}${beaconId.value}` : beaconId.value,
);

const snippet = computed(() => {
  const patchesPretty = patchesText.value.trim() || '[]';
  return `import { createApi } from '@did-btcr2/api';

const api = createApi({ btc: { network: '${selectedNetwork.value}' } });
const signed = await api.updateDid({
  did: '${did.value || '<did>'}',
  patches: ${patchesPretty},
  sourceVersionId: ${sourceVersionId.value},
  verificationMethodId: '${fullVerificationMethodId.value}',
  beaconId: '${fullBeaconId.value}',
  // signingMaterial is sourced from the configured KMS by default; pass
  // explicit bytes here only if you're not using a KMS.
});
console.log(signed);`;
});

async function run() {
  if (!modules.value || !canRun.value) return;
  running.value = true;
  response.value = null;
  const api = modules.value.api.createApi({ btc: { network: selectedNetwork.value as never } });
  try {
    const patches = JSON.parse(patchesText.value);
    const signed = await api.updateDid({
      did: did.value,
      patches,
      sourceVersionId: sourceVersionId.value,
      verificationMethodId: fullVerificationMethodId.value,
      beaconId: fullBeaconId.value,
      // The api type accepts signingMaterial via the underlying method facade;
      // here we don't yet expose it directly on updateDid, so anything beyond
      // a configured KMS will surface as an error in `response`.
    } as never);
    response.value = signed;
  } catch (err: unknown) {
    response.value = err instanceof Error ? err.stack || err.message : String(err);
  } finally {
    api.dispose();
    running.value = false;
  }
}
</script>

<template>
  <DemoCard
    :title="props.op === 'deactivate' ? 'Deactivate' : 'Update'"
    :snippet="snippet"
    :response="response"
    :running="running"
    :can-run="canRun"
    :ready="ready"
    :run-label="props.op === 'deactivate' ? 'Deactivate' : 'Update'"
    :running-label="props.op === 'deactivate' ? 'Deactivating…' : 'Updating…'"
    @run="run"
  >
    <div class="demo-row cols-2">
      <label class="demo-field">
        <span class="demo-label">Identifier (DID)</span>
        <input
          class="demo-input"
          v-model.trim="did"
          placeholder="did:btcr2:k1…"
          spellcheck="false"
        />
      </label>
      <label class="demo-field">
        <span class="demo-label">Bitcoin Network</span>
        <select class="demo-select" v-model="selectedNetwork">
          <option v-for="n in networks" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>
    </div>

    <div v-if="props.op === 'update'" class="demo-field">
      <span class="demo-label">JSON Patch operations</span>
      <textarea
        class="demo-textarea"
        v-model="patchesText"
        rows="6"
        spellcheck="false"
      />
      <p v-if="patchesError" class="demo-error">JSON error: {{ patchesError }}</p>
    </div>

    <div class="demo-row cols-3">
      <label class="demo-field">
        <span class="demo-label">Verification Method ID</span>
        <input class="demo-input" v-model.trim="verificationMethodId" placeholder="#initialKey" />
      </label>
      <label class="demo-field">
        <span class="demo-label">Beacon ID</span>
        <input class="demo-input" v-model.trim="beaconId" placeholder="#initialP2PKH" />
      </label>
      <label class="demo-field">
        <span class="demo-label">Source Version ID</span>
        <input class="demo-input" type="number" min="1" v-model.number="sourceVersionId" />
      </label>
    </div>

    <div class="demo-field">
      <span class="demo-label">Signing key bytes (hex, your responsibility — never use a real key here)</span>
      <input
        class="demo-input"
        v-model.trim="signingMaterialHex"
        placeholder="64-char hex"
        spellcheck="false"
      />
      <p class="demo-warn">
        ⚠️ This demo executes against the live network configured above. Use test-network keys only.
      </p>
    </div>
  </DemoCard>
</template>
