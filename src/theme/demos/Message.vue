<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import DemoCard from '../components/DemoCard.vue';
import { isDemoNetwork, useDidBtcr2 } from '../composables/useDidBtcr2';
import { formatError } from './errors';
import { isHex } from './hex';
import { normalizeSidecar } from './sidecar';
import './demo-fields.css';

const { ready, createApiForNetwork, networkOf } = useDidBtcr2();

const mode = ref<'sign' | 'verify'>('sign');

// Both modes resolve the current DID document, so they share these fields.
const did = ref('');
const sidecarText = ref('');
const sidecarError = ref<string | null>(null);
const minConf = ref(6);

// Sign mode. The format has no time and no replay protection, so the
// default text has the date and a nonce.
const nonce = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) =>
  b.toString(16).padStart(2, '0'),
).join('');
const message = ref(`I control this DID. ${new Date().toISOString().slice(0, 10)} nonce ${nonce}`);
const signingMaterialHex = ref('');

// Verify mode. Sign fills this field with its result.
const signedText = ref('');
const signedError = ref<string | null>(null);

const running = ref(false);
const signResponse = ref<unknown>(null);
const verifyResponse = ref<unknown>(null);

const network = computed(() => (ready.value ? networkOf(did.value) : null));
// Sign does not accept a mainnet DID: the page must not handle keys that
// control real funds. Verify is read-only, so it accepts one.
const isMainnet = computed(() => network.value === 'bitcoin');
const isUnsupported = computed(() => !!network.value && !isDemoNetwork(network.value));
const isMinConfValid = computed(() => Number.isInteger(minConf.value) && minConf.value >= 1);
const isSigningKeyValid = computed(() => {
  const h = signingMaterialHex.value.trim();
  return isHex(h) && h.length === 64;
});

function jsonError(raw: string): string | null {
  if (!raw.trim()) return null;
  try {
    JSON.parse(raw);
    return null;
  } catch (e: unknown) {
    return e instanceof Error ? e.message : 'Invalid JSON';
  }
}
watch(sidecarText, () => (sidecarError.value = jsonError(sidecarText.value)));
watch(signedText, () => (signedError.value = jsonError(signedText.value)));

const canRun = computed(() => {
  const common =
    !!network.value && !isUnsupported.value && !sidecarError.value && isMinConfValid.value;
  if (mode.value === 'sign') {
    return common && !isMainnet.value && !!message.value && isSigningKeyValid.value;
  }
  return common && !!signedText.value.trim() && !signedError.value;
});

const resolutionOptions = computed(() => {
  const sidecar = normalizeSidecar(sidecarText.value);
  return {
    ...(sidecar ? { sidecar } : {}),
    ...(minConf.value !== 6 ? { minConf: minConf.value } : {}),
  };
});

const snippet = computed(() => {
  const id = did.value || 'did:btcr2:k1...';
  const net = network.value || '<network of the DID>';
  const opts = Object.keys(resolutionOptions.value).length
    ? `, ${JSON.stringify(resolutionOptions.value, null, 2)}`
    : '';
  const resolve = `const resolution = await api.tryResolveDid('${id}'${opts});
if (!resolution.ok) throw new Error(\`\${resolution.error}: \${resolution.errorMessage}\`);`;
  if (mode.value === 'sign') {
    return `import { createApi } from '@did-btcr2/api';

const api = createApi({ btc: { network: '${net}' } });
// The key manager of the api holds the key and gives the signer.
const keyPair = api.crypto.keypair.fromSecret('<32-byte-secret-key-hex>');
const signer = api.kms.signer(api.kms.import(keyPair));
// signMessage does no I/O. Resolve the current DID document first: the key
// must be in its assertionMethod.
${resolve}
const signed = api.btcr2.signMessage(resolution.document, ${JSON.stringify(message.value)}, signer);
// signed: { type: 'BTCR2Message', message, proof }
console.log(signed);`;
  }
  const signed = signedText.value.trim() && !signedError.value ? signedText.value.trim() : '{ /* the signed message */ }';
  return `import { createApi } from '@did-btcr2/api';

const api = createApi({ btc: { network: '${net}' } });
const signedMessage = ${signed};
// Resolve the current DID document: after a key rotation or a deactivation,
// an old message fails.
${resolve}
// verifyMessage does no I/O and does not throw for a bad message. The checks
// run in order and stop at the first failure.
const report = api.btcr2.verifyMessage(resolution.document, signedMessage);
console.log(report);`;
});

async function run() {
  if (!canRun.value || !network.value) return;
  const signing = mode.value === 'sign';
  const response = signing ? signResponse : verifyResponse;
  running.value = true;
  response.value = null;
  const api = createApiForNetwork(network.value);
  try {
    const resolution = await api.tryResolveDid(did.value, resolutionOptions.value);
    if (!resolution.ok) throw new Error(`${resolution.error}: ${resolution.errorMessage}`);
    if (signing) {
      const keyPair = api.crypto.keypair.fromSecret(signingMaterialHex.value);
      const signer = api.kms.signer(api.kms.import(keyPair));
      const signed = api.btcr2.signMessage(resolution.document, message.value, signer);
      response.value = signed;
      signedText.value = JSON.stringify(signed, null, 2);
      verifyResponse.value = null;
    } else {
      response.value = api.btcr2.verifyMessage(resolution.document, JSON.parse(signedText.value));
    }
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
    :title="mode === 'sign' ? 'Sign Message' : 'Verify Message'"
    :snippet="snippet"
    :response="mode === 'sign' ? signResponse : verifyResponse"
    :running="running"
    :can-run="canRun"
    :ready="ready"
    :run-label="mode === 'sign' ? 'Sign' : 'Verify'"
    :running-label="mode === 'sign' ? 'Signing…' : 'Verifying…'"
    @run="run"
  >
    <div class="mode-toggle" role="group" aria-label="Sign or verify">
      <button type="button" :aria-pressed="mode === 'sign'" :disabled="running" @click="mode = 'sign'">
        Sign
      </button>
      <button
        type="button"
        :aria-pressed="mode === 'verify'"
        :disabled="running"
        @click="mode = 'verify'"
      >
        Verify
      </button>
    </div>

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
      <p v-else-if="isUnsupported" class="demo-warn">
        This demo does not support {{ network }}. Use the api with a local node for a
        {{ network }} DID.
      </p>
      <p v-else-if="mode === 'sign' && isMainnet" class="demo-warn">
        This demo does not sign on mainnet (bitcoin). Use a DID on a test network.
      </p>
      <p v-else-if="network" class="demo-hint">Network (from the DID): {{ network }}</p>
    </div>

    <template v-if="mode === 'sign'">
      <label class="demo-field">
        <span class="demo-label">Message</span>
        <textarea class="demo-textarea" v-model="message" rows="2" spellcheck="false" />
        <p v-if="!message" class="demo-warn">Type the text to sign.</p>
        <p v-else class="demo-hint">
          Put the date, a nonce, and the audience in the text: the format has no time and no
          replay protection.
        </p>
      </label>
    </template>
    <template v-else>
      <label class="demo-field">
        <span class="demo-label">Signed Message (JSON)</span>
        <textarea
          class="demo-textarea"
          v-model="signedText"
          rows="6"
          spellcheck="false"
          placeholder="{ &quot;type&quot;: &quot;BTCR2Message&quot;, &quot;message&quot;: …, &quot;proof&quot;: { … } }"
        />
        <p v-if="signedText && signedError" class="demo-error">JSON error: {{ signedError }}</p>
        <p v-else class="demo-hint">Sign fills this field with its result.</p>
      </label>
    </template>

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
        An x1 DID needs its genesis document. A DID with updates needs those signed updates,
        unless a CAS holds them.
      </p>
    </div>

    <div class="demo-row cols-2">
      <label class="demo-field">
        <span class="demo-label">Minimum confirmations (minConf)</span>
        <input class="demo-input" type="number" min="1" step="1" v-model.number="minConf" />
        <p v-if="!isMinConfValid" class="demo-warn">Must be a whole number, 1 or more.</p>
        <p v-else class="demo-hint">
          Resolution ignores a beacon signal with fewer confirmations. The default is 6.
        </p>
      </label>
      <label v-if="mode === 'sign'" class="demo-field">
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
    <p v-if="mode === 'sign'" class="demo-warn">
      ⚠️ Use test-network keys only. Never use a real key here.
    </p>
  </DemoCard>
</template>

<style scoped>
/* The same toggle as in Inputs.vue. */
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
</style>
