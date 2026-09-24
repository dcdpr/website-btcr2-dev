<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import DemoCard from '../components/DemoCard.vue';
import { useDidBtcr2 } from '../composables/useDidBtcr2';
import { hexToBytes, isHex } from './hex';
import { formatError } from './errors';
import { normalizeSidecar } from './sidecar';
import './demo-fields.css';

const props = withDefaults(
  defineProps<{
    /** Op label; defaults to "Update", set to "Deactivate" for the deactivate demo. */
    op?: 'update' | 'deactivate';
  }>(),
  { op: 'update' },
);

const { ready, modules, createApiForNetwork, networkOf } = useDidBtcr2();

const did = ref('');
const patchesText = ref(
  `[{ "op": "add", "path": "/alsoKnownAs", "value": ["https://example.com"] }]`,
);
const patchesError = ref<string | null>(null);
// Both ids are optional. If they are empty, the api uses the verification
// method that publishes the signer's key and the beacon that holds the only
// spendable UTXO.
const verificationMethodId = ref('');
const beaconId = ref('');
const sidecarText = ref('');
const sidecarError = ref<string | null>(null);
// The update builds on the version that this resolution finds. With the
// resolution default (6), the resolution misses an update with fewer than
// 6 confirmations. The new update then targets the same versionId, and
// resolution of the DID fails with LATE_PUBLISHING_ERROR.
const minConf = ref(1);
const signingMaterialHex = ref('');

const running = ref(false);
const response = ref<unknown>(null);
const nextSidecar = ref<unknown>(null);

const network = computed(() => (ready.value ? networkOf(did.value) : null));
const isMinConfValid = computed(() => Number.isInteger(minConf.value) && minConf.value >= 1);

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

watch(sidecarText, () => {
  sidecarError.value = null;
  const raw = sidecarText.value.trim();
  if (!raw) return;
  try {
    JSON.parse(raw);
  } catch (e: unknown) {
    sidecarError.value = e instanceof Error ? e.message : 'Invalid JSON';
  }
});

const isSigningKeyValid = computed(() => {
  const h = signingMaterialHex.value.trim();
  return isHex(h) && h.length === 64;
});

const canRun = computed(
  () =>
    !!network.value &&
    (props.op === 'deactivate' || (!!patchesText.value.trim() && !patchesError.value)) &&
    !sidecarError.value &&
    isMinConfValid.value &&
    isSigningKeyValid.value,
);

const snippet = computed(() => {
  const net = network.value || '<network of the DID>';
  const sidecar = normalizeSidecar(sidecarText.value);
  const lines = [
    `  did: '${did.value || '<did>'}',`,
    ...(props.op === 'update' ? [`  patches: ${patchesText.value.trim() || '[]'},`] : []),
    `  signer: new LocalSigner(hexToBytes('<32-byte-secret-key-hex>')),`,
    ...(verificationMethodId.value ? [`  verificationMethodId: '${verificationMethodId.value}',`] : []),
    ...(beaconId.value ? [`  beaconId: '${beaconId.value}',`] : []),
  ];
  const resolution = [
    ...(sidecar ? [`sidecar: ${JSON.stringify(sidecar)}`] : []),
    `minConf: ${minConf.value}`,
  ];
  if (resolution.length) lines.push(`  resolutionOptions: { ${resolution.join(', ')} },`);
  const call = props.op === 'deactivate' ? 'deactivateDid' : 'updateDid';
  return `import { createApi, LocalSigner } from '@did-btcr2/api';

const api = createApi({ btc: { network: '${net}' } });
// The api resolves the current document, applies the patches, signs the
// update, and broadcasts a beacon signal. The beacon address must hold a
// confirmed UTXO.
const result = await api.${call}({
${lines.join('\n')}
});
// result: { signedUpdate, txid, announcement?, proof?, publishedToCas }
console.log(result);`;
});

async function run() {
  if (!modules.value || !canRun.value || !network.value) return;
  running.value = true;
  response.value = null;
  nextSidecar.value = null;
  const api = createApiForNetwork(network.value);
  try {
    const sidecar = normalizeSidecar(sidecarText.value);
    const params = {
      did: did.value,
      signer: new modules.value.api.LocalSigner(hexToBytes(signingMaterialHex.value)),
      ...(verificationMethodId.value ? { verificationMethodId: verificationMethodId.value } : {}),
      ...(beaconId.value ? { beaconId: beaconId.value } : {}),
      resolutionOptions: { ...(sidecar ? { sidecar } : {}), minConf: minConf.value },
    };
    const result =
      props.op === 'deactivate'
        ? await api.deactivateDid(params)
        : await api.updateDid({ ...params, patches: JSON.parse(patchesText.value) });
    response.value = result;
    // A resolver needs every signed update of the DID that no CAS holds.
    // Add this update (and its CAS announcement or SMT proof, if any) to
    // the sidecar that the user gave, so it can go to Resolve or to the
    // next update.
    const base = sidecar ?? {};
    const list = (key: string) => (Array.isArray(base[key]) ? (base[key] as unknown[]) : []);
    nextSidecar.value = {
      ...base,
      updates: [...list('updates'), result.signedUpdate],
      ...(result.announcement ? { casUpdates: [...list('casUpdates'), result.announcement] } : {}),
      ...(result.proof ? { smtProofs: [...list('smtProofs'), result.proof] } : {}),
    };
  } catch (err: unknown) {
    response.value = formatError(err);
  } finally {
    api.dispose();
    running.value = false;
  }
}

const extra = computed(() =>
  nextSidecar.value
    ? {
        label: 'Sidecar for Resolve (paste into Resolve, or into the next Update)',
        value: nextSidecar.value,
      }
    : null,
);
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
    :extra="extra"
    @run="run"
  >
    <div class="demo-field">
      <span class="demo-label">Identifier (DID)</span>
      <input
        class="demo-input"
        v-model.trim="did"
        placeholder="did:btcr2:k1… or did:btcr2:x1…"
        spellcheck="false"
      />
      <p v-if="did && ready && !network" class="demo-warn">
        Not a valid did:btcr2 identifier.
      </p>
      <p v-else-if="network" class="demo-hint">Network (from the DID): {{ network }}</p>
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

    <div class="demo-row cols-2">
      <label class="demo-field">
        <span class="demo-label">Verification Method ID (optional)</span>
        <input
          class="demo-input"
          v-model.trim="verificationMethodId"
          placeholder="#initialKey"
          spellcheck="false"
        />
      </label>
      <label class="demo-field">
        <span class="demo-label">Beacon ID (optional)</span>
        <input
          class="demo-input"
          v-model.trim="beaconId"
          placeholder="#initialP2WPKH"
          spellcheck="false"
        />
      </label>
    </div>
    <p class="demo-hint">
      If an ID is empty, the api uses the verification method of the signing key and the beacon
      that holds the only spendable UTXO.
    </p>

    <div class="demo-field">
      <span class="demo-label">Sidecar Data (JSON, optional)</span>
      <textarea
        class="demo-textarea"
        v-model="sidecarText"
        rows="4"
        spellcheck="false"
        placeholder="{ &quot;genesisDocument&quot;: { … }, &quot;updates&quot;: [ … ] }"
      />
      <p v-if="sidecarText && sidecarError" class="demo-error">
        JSON error: {{ sidecarError }}
      </p>
      <p v-else class="demo-hint">
        An x1 DID needs its genesis document. A DID with earlier updates needs those signed
        updates, unless a CAS holds them.
      </p>
    </div>

    <div class="demo-row cols-2">
      <label class="demo-field">
        <span class="demo-label">Minimum confirmations (minConf)</span>
        <input class="demo-input" type="number" min="1" step="1" v-model.number="minConf" />
        <p v-if="!isMinConfValid" class="demo-warn">Must be a whole number, 1 or more.</p>
        <p v-else class="demo-hint">
          Keep 1. The update builds on the version that the resolution finds. If the
          resolution misses your last update, the DID stops resolving.
        </p>
      </label>
      <label class="demo-field">
        <span class="demo-label">Signing secret key (hex, 32 bytes)</span>
        <input
          class="demo-input"
          v-model.trim="signingMaterialHex"
          placeholder="64-char hex"
          spellcheck="false"
        />
        <p v-if="signingMaterialHex && !isSigningKeyValid" class="demo-warn">
          Must be 64 hex chars (a 32-byte secret key).
        </p>
      </label>
    </div>
    <p class="demo-warn">
      ⚠️ This demo broadcasts a transaction on the network of the DID. Use test-network keys
      only. Never use a real key here.
    </p>
  </DemoCard>
</template>
