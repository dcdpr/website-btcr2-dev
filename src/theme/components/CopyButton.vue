<script setup lang="ts">
import { useCopyToClipboard } from '../composables/useCopyToClipboard';

const props = defineProps<{ text: string | null | undefined; label?: string }>();
const { copied, copy } = useCopyToClipboard();
</script>

<template>
  <button
    class="copy-control"
    type="button"
    :aria-label="copied ? 'Copied' : (props.label || 'Copy')"
    :disabled="!props.text"
    @click="copy(String(props.text ?? ''))"
  >
    <svg v-if="!copied" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15V5a2 2 0 0 1 2-2h10"></path>
    </svg>
    <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M20 6L9 17l-5-5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
  </button>
</template>

<style scoped>
.copy-control {
  position: relative;
  padding: 0.25em;
  float: right;
  background: transparent;
  border: 1px solid transparent;
  color: var(--vp-c-text-2);
  border-radius: 4px;
  cursor: pointer;
}
.copy-control:hover:not(:disabled) {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
.copy-control:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
