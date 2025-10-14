import { defineConfig } from 'vitepress'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineConfig({
    title: 'did:btcr2',
    description: 'A censorship-resistant DID Method using the Bitcoin blockchain as a Verifiable Data Registry to announce changes to the DID document.',
    cleanUrls: true,
    base: '/',
    vite: {
      server: {
        proxy: {
          '/mempool': {
            target: 'https://mempool.space',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/mempool/, ''),
          }
        }
      },
      plugins: [
        wasm(),
        topLevelAwait(),
      ],
       resolve: {
        conditions: ['browser'],
        dedupe: ['vue'], 
      },
    },
    themeConfig: {
      outline: { level: 'deep' },
      externalLinkIcon: true,
      search: { provider: 'local' },
      nav: [
        { text: 'Home', link: '/' },
        { text: 'Specification', link: '/spec' },
        // { text: 'Diagrams', link: '/diagrams' }
      ],
      footer: {
        copyright: 'Copyright © 2025 Digital Contract Design'
      },
      sidebar: [
        {
          text: 'Specification',
          link: '/spec'
        },
        // {
        //   text: 'Diagrams',
        //   link: '/diagrams'
        // },
        {
          text: 'Demo',
          link: '/demo'
        },
        {
          text: 'Implementations',
          link: '/impls',
          items: [
            { text: 'Java', link: '/impls/java' },
            { text: 'Python', link: '/impls/py' },
            { text: 'Rust', link: '/impls/rs' },
            { text: 'TypeScript', link: '/impls/ts' }
          ]
        }
      ],
      socialLinks: [{ icon: 'github', link: 'https://github.com/dcdpr/did-btcr2' }]
    },
  })
