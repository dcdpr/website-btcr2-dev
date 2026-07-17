<script setup lang="ts">
import { ref, onMounted, watch, useId } from 'vue';
import { useData } from 'vitepress';

// Client-only mermaid renderer. Loads mermaid lazily in onMounted so VitePress
// SSR never sees it, sidestepping the withMermaid SSR fragility that drove the
// previous integration to be removed.

const props = defineProps<{
  /** Inline mermaid source. */
  code?: string;
  /** Base64-encoded source (used by the markdown fence transformer). */
  codeB64?: string;
  /** Or fetch source from a URL relative to the site root. */
  src?: string;
}>();

function decodeB64(s: string): string {
  if (typeof atob === 'function') {
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  }
  return '';
}

const containerId = `mermaid-${useId()}`;
const svg = ref<string>('');
const error = ref<string | null>(null);
const { isDark } = useData();

let mermaidRef: typeof import('mermaid').default | null = null;

async function ensureMermaid() {
  if (mermaidRef) return mermaidRef;
  const mod = await import('mermaid');
  mermaidRef = mod.default;
  mermaidRef.initialize({
    startOnLoad: false,
    theme: isDark.value ? 'dark' : 'default',
    securityLevel: 'strict',
    flowchart: { useMaxWidth: true, htmlLabels: true },
  });
  return mermaidRef;
}

async function getSource(): Promise<string> {
  if (props.code) return props.code;
  if (props.codeB64) return decodeB64(props.codeB64);
  if (props.src) {
    const res = await fetch(props.src);
    if (!res.ok) throw new Error(`Failed to fetch ${props.src}: ${res.status}`);
    return await res.text();
  }
  return '';
}

async function render() {
  error.value = null;
  try {
    const mermaid = await ensureMermaid();
    const source = (await getSource()).trim();
    if (!source) {
      svg.value = '';
      return;
    }
    const result = await mermaid.render(`${containerId}-svg`, source);
    svg.value = result.svg;
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e);
    svg.value = '';
  }
}

onMounted(render);
watch(isDark, async () => {
  // Re-initialize mermaid with the new theme then re-render.
  if (mermaidRef) {
    mermaidRef.initialize({
      startOnLoad: false,
      theme: isDark.value ? 'dark' : 'default',
      securityLevel: 'strict',
      flowchart: { useMaxWidth: true, htmlLabels: true },
    });
  }
  await render();
});
watch(() => [props.code, props.codeB64, props.src], render);
</script>

<template>
  <ClientOnly>
    <div class="mermaid-wrap">
      <div v-if="error" class="mermaid-error">Mermaid render error: {{ error }}</div>
      <div v-else class="mermaid" v-html="svg"></div>
    </div>
  </ClientOnly>
</template>

<style scoped>
.mermaid-wrap {
  margin: 16px 0;
}
.mermaid {
  display: flex;
  align-items: center;
  justify-content: center;
}
.mermaid-error {
  color: #ff6b6b;
  font-size: 13px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  padding: 12px;
  border: 1px solid #ff6b6b;
  border-radius: 6px;
}
</style>
