import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import vue from '@astrojs/vue';
import mermaid from 'astro-mermaid';

export default defineConfig({
  site: 'https://btcr2.dev',
  vite: {
    server: {
      // Dev-server twin of the production nginx `location /mempool/` block
      // (see rpm/ and CLAUDE.md). Same-origin proxying is REQUIRED for
      // mempool.space: the @did-btcr2/bitcoin REST client sends
      // `Content-Type: application/json` on GETs, which triggers a CORS
      // preflight that mempool.space's OPTIONS handler rejects (404).
      proxy: {
        '/mempool': {
          target: 'https://mempool.space',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/mempool/, ''),
        },
      },
    },
  },
  integrations: [
    // astro-mermaid must come before starlight so its remark plugin sees the
    // ```mermaid fences first.
    mermaid({ autoTheme: true }),
    starlight({
      title: 'did:btcr2',
      description:
        'A censorship-resistant DID Method using the Bitcoin blockchain as a Verifiable Data Registry to announce changes to the DID document.',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/dcdpr/did-btcr2' },
      ],
      sidebar: [
        { label: 'Specification', link: '/spec/' },
        { label: 'Diagrams', link: '/diagrams/' },
        { label: 'Demo', link: '/demo/' },
        {
          label: 'Implementations',
          items: [
            { label: 'Overview', link: '/impls/' },
            { label: 'Java', link: '/impls/java/' },
            { label: 'Python', link: '/impls/py/' },
            { label: 'Rust', link: '/impls/rs/' },
            { label: 'TypeScript', link: '/impls/ts/' },
          ],
        },
        { label: 'Cross-impl Parity', link: '/parity/' },
      ],
      customCss: ['./src/styles/custom.css'],
    }),
    vue(),
  ],
});
