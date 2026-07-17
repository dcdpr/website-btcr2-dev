import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import DemoCard from './components/DemoCard.vue';
import Mermaid from './components/Mermaid.vue';
import DemoCreate from './demos/Create.vue';
import DemoResolve from './demos/Resolve.vue';
import DemoUpdate from './demos/Update.vue';
import './custom.css';

// CORS handling for the Bitcoin REST endpoints lives in
// composables/useDidBtcr2.ts (createApiForNetwork): in dev the api is
// configured with the /mempool and /mutinynet Vite proxy paths from
// config.ts; in production the library's default hosts are used directly.
// No fetch patching.

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
