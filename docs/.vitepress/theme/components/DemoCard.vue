<script setup lang="ts">
import { computed } from 'vue';
import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import 'highlight.js/styles/github-dark.min.css';
import CopyButton from './CopyButton.vue';

hljs.registerLanguage('typescript', typescript);

const props = defineProps<{
  title?: string;
  snippet: string;
  response: unknown;
  running: boolean;
  canRun: boolean;
  ready: boolean;
  runLabel?: string;
  runningLabel?: string;
  /** Optional extra payload to display under "Initial Document" or similar. */
  extra?: { label: string; value: unknown } | null;
}>();

const emit = defineEmits<{ (e: 'run'): void }>();

const highlightedSnippet = computed(
  () => hljs.highlight(props.snippet, { language: 'typescript' }).value,
);

const responseText = computed(() => formatValue(props.response));
const extraText = computed(() => (props.extra ? formatValue(props.extra.value) : ''));

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v, replacer, 2);
  } catch {
    return String(v);
  }
}

// JSON.stringify replacer that turns Uint8Array / Map / Set into something
// readable, and serializes BigInt (used for satoshi amounts in some api types).
function replacer(_key: string, value: unknown): unknown {
  if (value instanceof Uint8Array) {
    return Array.from(value)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  if (value instanceof Map) {
    return Object.fromEntries(value.entries());
  }
  if (value instanceof Set) {
    return Array.from(value);
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}
</script>

<template>
  <ClientOnly>
    <div class="demo-card">
      <h3 v-if="props.title" class="demo-title">{{ props.title }}</h3>

      <div class="demo-inputs">
        <slot />
      </div>

      <div class="actions">
        <button
          class="btn primary"
          :disabled="!props.ready || props.running || !props.canRun"
          @click="emit('run')"
        >
          <span v-if="props.running" class="spinner" aria-hidden="true" />
          {{ props.running ? (props.runningLabel || 'Running…') : (props.runLabel || 'Run') }}
        </button>
        <slot name="actions" />
      </div>

      <div class="response-wrap">
        <h4 class="sep">Response</h4>
        <CopyButton :text="responseText" label="Copy response" />
        <pre class="out hljs">{{ responseText || (props.running ? '' : '—') }}</pre>
      </div>

      <div v-if="props.extra" class="extra-wrap">
        <h4 class="sep">{{ props.extra.label }}</h4>
        <CopyButton :text="extraText" :label="`Copy ${props.extra.label}`" />
        <pre class="out hljs">{{ extraText || (props.running ? '' : '—') }}</pre>
      </div>

      <details class="snippet" open>
        <summary class="summary">Code Preview</summary>
        <CopyButton :text="props.snippet" label="Copy code" />
        <pre class="hljs"><code v-html="highlightedSnippet"></code></pre>
      </details>
    </div>
  </ClientOnly>
</template>

<style scoped>
.demo-card {
  border: 1px solid var(--vp-c-divider);
  padding: 16px;
  border-radius: 8px;
  margin: 12px 0 24px;
}

.demo-title {
  margin: 0 0 12px;
  font-size: 18px;
}

.demo-inputs {
  display: grid;
  gap: 12px;
}

.summary {
  letter-spacing: -0.01em;
  line-height: 24px;
  font-size: 18px;
}

.actions {
  margin: 14px 0 0;
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

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
  background: var(--vp-c-alt) !important;
  border-color: var(--vp-c-alt) !important;
}

.btn.primary {
  background: var(--vp-c-brand-1);
  color: #000;
  border-color: var(--vp-c-brand-1);
}

.spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  margin-right: 8px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
  vertical-align: -2px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.snippet {
  font-size: 13px;
  margin: 14px 0 0;
}

.snippet code {
  white-space: pre-wrap;
  word-break: break-word;
}

.response-wrap,
.extra-wrap {
  position: relative;
}

.sep {
  margin: 16px 0 8px;
}

.out {
  margin-top: 6px;
  white-space: pre-wrap;
  word-break: break-word;
  min-height: 40px;
  font-size: 13px;
}

.hljs {
  border-radius: 8px;
  padding: 12px;
}
</style>
