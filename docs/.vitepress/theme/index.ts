import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import DemoCard from './components/DemoCard.vue';
import Mermaid from './components/Mermaid.vue';
import DemoCreate from './demos/Create.vue';
import DemoResolve from './demos/Resolve.vue';
import DemoUpdate from './demos/Update.vue';
import './custom.css';

// Bitcoin REST endpoints are called directly (mempool.space and
// mutinynet.com both send Access-Control-Allow-Origin: *); see
// composables/useDidBtcr2.ts. No proxies, no fetch patching.

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
