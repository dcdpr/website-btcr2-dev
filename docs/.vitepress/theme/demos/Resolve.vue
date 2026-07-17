<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { NetworkName } from '@did-btcr2/api';
import DemoCard from '../components/DemoCard.vue';
import { useDidBtcr2 } from '../composables/useDidBtcr2';
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

const snippet = computed(() => {
  const id = did.value || 'did:btcr2:k1...';
  const net = selectedNetwork.value || inferredNetwork.value || 'regtest';
  const trimmedSidecar = sidecarText.value.trim();
  if (isExternal.value && trimmedSidecar && trimmedSidecar !== '{}') {
    return `import { createApi } from '@did-btcr2/api';

const api = createApi({ btc: { network: '${net}' } });
const result = await api.resolveDid('${id}', { sidecar: ${trimmedSidecar} });
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
    const opts =
      isExternal.value && sidecarText.value.trim()
        ? { sidecar: JSON.parse(sidecarText.value) }
        : undefined;
    response.value = await api.resolveDid(did.value, opts);
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
      <span class="demo-label">Sidecar Data (JSON, optional — required for x1 DIDs without CAS)</span>
      <textarea
        class="demo-textarea"
        v-model="sidecarText"
        rows="6"
        spellcheck="false"
        placeholder="{ &quot;initialDocument&quot;: { ... } }"
      />
      <p v-if="sidecarText && sidecarError" class="demo-error">
        JSON error: {{ sidecarError }}
      </p>
    </div>
  </DemoCard>
</template>
