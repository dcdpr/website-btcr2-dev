<script setup lang="ts">
import { computed } from 'vue';
import CopyButton from '../components/CopyButton.vue';
import DemoCard from '../components/DemoCard.vue';
import { useDidBtcr2 } from '../composables/useDidBtcr2';
import { demoKeyPair, generateDemoKeyPair } from './key-pair';
import './demo-fields.css';

const { ready, modules } = useDidBtcr2();

const snippet = `import { SchnorrKeyPair } from '@did-btcr2/api';

// A new secp256k1 key pair from a secure random source.
const keys = SchnorrKeyPair.generate();
// Create takes the compressed public key (33 bytes).
const publicKey = keys.publicKey.hex;
// Update and Deactivate sign with the secret key (32 bytes).
const secretKey = keys.secretKey.hex;
console.log({ publicKey, secretKey });`;

// One field for each key, so the user can copy each key alone.
const keyFields = computed(() => [
  { label: 'Public key (hex, 33 bytes), for Create', value: demoKeyPair.value?.publicKey ?? '' },
  {
    label: 'Secret key (hex, 32 bytes), for Update and Deactivate',
    value: demoKeyPair.value?.secretKey ?? '',
  },
]);

function run() {
  if (!modules.value) return;
  generateDemoKeyPair(modules.value);
}
</script>

<template>
  <DemoCard
    title="Key Pair"
    :snippet="snippet"
    :response="demoKeyPair"
    :running="false"
    :can-run="true"
    :ready="ready"
    run-label="Generate"
    @run="run"
  >
    <p class="demo-warn">
      ⚠️ The page shows the secret key in clear text. Use this key pair on test networks only.
    </p>

    <template #response>
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
