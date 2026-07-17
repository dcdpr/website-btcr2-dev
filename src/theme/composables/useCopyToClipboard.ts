import { ref, type Ref } from 'vue';

export type UseCopyToClipboard = {
  copied: Ref<boolean>;
  copy: (text: string) => Promise<void>;
};

export function useCopyToClipboard(resetMs = 1500): UseCopyToClipboard {
  const copied = ref(false);
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function copy(text: string) {
    if (!text) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      copied.value = true;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        copied.value = false;
      }, resetMs);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }

  return { copied, copy };
}
