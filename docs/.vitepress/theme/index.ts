import DefaultTheme from 'vitepress/theme';
import DemoCard from './components/DemoCard.vue';
import Mermaid from './components/Mermaid.vue';
import DemoCreate from './demos/Create.vue';
import DemoResolve from './demos/Resolve.vue';
import DemoUpdate from './demos/Update.vue';
import './custom.css';

// Dev-only CORS workaround: route mempool.space/.holdings through the Vite proxy.
// Gated on import.meta.env.DEV because the /mempool proxy only exists in the dev
// server — applying this rewrite in production would 404 against the deployed origin.
if (import.meta.env.DEV && typeof globalThis.fetch === 'function') {
  const MEMPOOL_RX = /^https?:\/\/(mempool\.space|mempool\.holdings)\b/i;
  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : (input as URL).toString();
    if (MEMPOOL_RX.test(url)) {
      const proxied = url.replace(MEMPOOL_RX, '/mempool');
      return originalFetch(proxied, init);
    }
    return originalFetch(input as RequestInfo, init);
  };
}

import type { Theme } from 'vitepress';

const theme: Theme = {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('DemoCard', DemoCard);
    app.component('Mermaid', Mermaid);
    app.component('DemoCreate', DemoCreate);
    app.component('DemoResolve', DemoResolve);
    app.component('DemoUpdate', DemoUpdate);
  },
};

export default theme;
