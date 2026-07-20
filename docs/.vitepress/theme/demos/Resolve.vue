<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { NetworkName } from '@did-btcr2/api';
import DemoCard from '../components/DemoCard.vue';
import { useDidBtcr2 } from '../composables/useDidBtcr2';
import { formatError } from './errors';
import './demo-fields.css';

const networks: readonly NetworkName[] = ['bitcoin', 'testnet3', 'testnet4', 'signet', 'mutinynet', 'regtest'];
type Network = NetworkName;

const { ready, modules, createApiForNetwork } = useDidBtcr2();

const did = ref('');
const selectedNetwork = ref<Network | ''>('');
const sidecarText = ref('');
const sidecarError = ref<string | null>(null);

const running = ref(false);
const response = ref<unknown>(null);

const isExternal = computed(() => did.value.startsWith('did:btcr2:x1'));
const inferredNetwork = computed<Network | ''>(() => {
  // Auto-pick a sensible default network from the DID prefix where possible.
  // The HRP-encoded suffix carries the network; we don't decode here, just default.
  if (!did.value.startsWith('did:btcr2:')) return '';
  return selectedNetwork.value || 'regtest';
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

const canRun = computed(
  () =>
    did.value.startsWith('did:btcr2:') &&
    !sidecarError.value &&
    !!(selectedNetwork.value || inferredNetwork.value),
);

const SIDECAR_KEYS = ['genesisDocument', 'updates', 'casUpdates', 'smtProofs'];

/**
 * The library reads the genesis document from `sidecar.genesisDocument`.
 * Accept either a full sidecar object or a bare placeholder-form genesis
 * document (the Create demo's textarea content) and wrap the latter.
 * Returns undefined when the text is empty, invalid JSON, or an empty object.
 */
function normalizeSidecar(raw: string): Record<string, unknown> | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
  const obj = parsed as Record<string, unknown>;
  if (Object.keys(obj).length === 0) return undefined;
  if (SIDECAR_KEYS.some((k) => k in obj)) return obj;
  if (typeof obj.id === 'string') return { genesisDocument: obj };
  return obj;
}

const snippet = computed(() => {
  const id = did.value || 'did:btcr2:k1...';
  const net = selectedNetwork.value || inferredNetwork.value || 'regtest';
  const sidecar = isExternal.value ? normalizeSidecar(sidecarText.value) : undefined;
  if (sidecar) {
    return `import { createApi } from '@did-btcr2/api';

const api = createApi({ btc: { network: '${net}' } });
// x1 DIDs resolve from the placeholder-form genesis document, supplied via
// sidecar.genesisDocument (or fetched from a configured CAS).
const result = await api.resolveDid('${id}', { sidecar: ${JSON.stringify(sidecar, null, 2)} });
console.log(result);`;
  }
  return `import { createApi } from '@did-btcr2/api';

const api = createApi({ btc: { network: '${net}' } });
const result = await api.resolveDid('${id}');
console.log(result);`;
});

async function run() {
  if (!modules.value || !canRun.value) return;
  running.value = true;
  response.value = null;
  const net = (selectedNetwork.value || inferredNetwork.value) as Network;
  const api = createApiForNetwork(net);
  try {
    const sidecar = isExternal.value ? normalizeSidecar(sidecarText.value) : undefined;
    response.value = await api.resolveDid(did.value, sidecar ? { sidecar } : undefined);
  } catch (err: unknown) {
    response.value = formatError(err);
  } finally {
    api.dispose();
    running.value = false;
  }
}
</script>

<template>
  <DemoCard
    title="Resolve"
    :snippet="snippet"
    :response="response"
    :running="running"
    :can-run="canRun"
    :ready="ready"
    run-label="Resolve"
    running-label="Resolving…"
    @run="run"
  >
    <div class="demo-row cols-2">
      <label class="demo-field">
        <span class="demo-label">Identifier (DID)</span>
        <input
          class="demo-input"
          v-model.trim="did"
          placeholder="did:btcr2:k1… or did:btcr2:x1…"
          spellcheck="false"
        />
      </label>

      <label class="demo-field">
        <span class="demo-label">Bitcoin Network (for beacon resolution)</span>
        <select class="demo-select" v-model="selectedNetwork">
          <option value="">auto / regtest</option>
          <option v-for="n in networks" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>
    </div>

    <div v-if="isExternal" class="demo-field">
      <span class="demo-label">Sidecar Data (JSON; x1 DIDs need the placeholder-form genesis document from Create)</span>
      <textarea
        class="demo-textarea"
        v-model="sidecarText"
        rows="6"
        spellcheck="false"
        placeholder="{ &quot;genesisDocument&quot;: { &quot;id&quot;: &quot;did:btcr2:_&quot;, … } }"
      />
      <p v-if="sidecarText && sidecarError" class="demo-error">
        JSON error: {{ sidecarError }}
      </p>
    </div>
  </DemoCard>
</template>
