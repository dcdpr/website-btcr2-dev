<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import DemoCard from '../components/DemoCard.vue';
import { useDidBtcr2 } from '../composables/useDidBtcr2';
import { formatError } from './errors';
import { normalizeSidecar } from './sidecar';
import './demo-fields.css';

const { ready, createApiForNetwork, networkOf } = useDidBtcr2();

const did = ref('');
const sidecarText = ref('');
const sidecarError = ref<string | null>(null);
// The specification default. The api refuses any value below 1.
const minConf = ref(6);

const running = ref(false);
const response = ref<unknown>(null);

const isExternal = computed(() => did.value.startsWith('did:btcr2:x1'));
// `ready` is part of the dependency so the network shows once the api loads.
const network = computed(() => (ready.value ? networkOf(did.value) : null));
const isMinConfValid = computed(() => Number.isInteger(minConf.value) && minConf.value >= 1);

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

const canRun = computed(() => !!network.value && !sidecarError.value && isMinConfValid.value);

const snippet = computed(() => {
  const id = did.value || 'did:btcr2:k1...';
  const net = network.value || '<network of the DID>';
  const sidecar = normalizeSidecar(sidecarText.value);
  const options = [
    ...(sidecar ? [`sidecar: ${JSON.stringify(sidecar, null, 2).replace(/\n/g, '\n  ')}`] : []),
    ...(minConf.value !== 6 ? [`minConf: ${minConf.value}`] : []),
  ];
  const optionsArg = options.length ? `, {\n  ${options.join(',\n  ')},\n}` : '';
  return `import { createApi } from '@did-btcr2/api';

// The connection must be on the network that the DID encodes.
const api = createApi({ btc: { network: '${net}' } });
// x1 DIDs need the genesis document as sidecar data. A DID with updates
// needs the signed updates, unless they are published to a CAS.
const result = await api.resolveDid('${id}'${optionsArg});
console.log(result);`;
});

async function run() {
  if (!canRun.value || !network.value) return;
  running.value = true;
  response.value = null;
  const api = createApiForNetwork(network.value);
  try {
    const sidecar = normalizeSidecar(sidecarText.value);
    response.value = await api.resolveDid(did.value, {
      ...(sidecar ? { sidecar } : {}),
      minConf: minConf.value,
    });
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

    <div class="demo-field">
      <span class="demo-label">
        Sidecar Data (JSON, optional){{ isExternal ? '. An x1 DID needs the genesis document from Create' : '' }}
      </span>
      <textarea
        class="demo-textarea"
        v-model="sidecarText"
        rows="6"
        spellcheck="false"
        placeholder="{ &quot;genesisDocument&quot;: { … }, &quot;updates&quot;: [ … ] }"
      />
      <p v-if="sidecarText && sidecarError" class="demo-error">
        JSON error: {{ sidecarError }}
      </p>
    </div>

    <label class="demo-field">
      <span class="demo-label">Minimum confirmations (minConf)</span>
      <input class="demo-input" type="number" min="1" step="1" v-model.number="minConf" />
      <p v-if="!isMinConfValid" class="demo-warn">Must be a whole number, 1 or more.</p>
      <p v-else class="demo-hint">
        Resolution ignores a beacon signal with fewer confirmations. The default is 6. A lower
        value shows a fresh update sooner.
      </p>
    </label>
  </DemoCard>
</template>
