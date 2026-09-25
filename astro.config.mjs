import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import vue from '@astrojs/vue';
import mermaid from 'astro-mermaid';

export default defineConfig({
  site: 'https://btcr2.dev',
  integrations: [
    // astro-mermaid must come before starlight so its remark plugin sees the
    // ```mermaid fences first.
    mermaid({ autoTheme: true, mermaidConfig: { flowchart: { wrappingWidth: 320 } } }),
    starlight({
      title: 'did:btcr2',
      description:
        'A censorship-resistant DID Method using the Bitcoin blockchain as a Verifiable Data Registry to announce changes to the DID document.',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/dcdpr/did-btcr2' },
      ],
      sidebar: [
        { label: 'Specification', link: '/spec/' },
        {
          label: 'Diagrams',
          items: [
            { label: 'Overview', link: '/diagrams/' },
            { label: 'Create', link: '/diagrams/create/' },
            { label: 'Resolve', link: '/diagrams/resolve/' },
            { label: 'Update and Deactivate', link: '/diagrams/update/' },
            { label: 'Beacons', link: '/diagrams/beacons/' },
            { label: 'Data', link: '/diagrams/data/' },
            {
              label: 'Use case: Stuart meets Satoshi',
              items: [
                { label: 'Overview', link: '/diagrams/stuart-meets-satoshi/' },
                { label: 'Key rotation', link: '/diagrams/stuart-meets-satoshi/key-rotation/' },
                { label: 'State machines', link: '/diagrams/stuart-meets-satoshi/states/' },
                { label: 'Data', link: '/diagrams/stuart-meets-satoshi/data/' },
              ],
            },
          ],
        },
        { label: 'Demo', link: '/demo/' },
        {
          label: 'Implementations',
          items: [
            { label: 'Overview', link: '/impls/' },
            { label: 'Java', link: '/impls/java/' },
            { label: 'Python', link: '/impls/py/' },
            { label: 'Rust', link: '/impls/rs/' },
            {
              label: 'TypeScript',
              items: [
                { label: 'Overview', link: '/impls/ts/' },
                { label: 'SDK', link: '/impls/ts/sdk/' },
                { label: 'CLI', link: '/impls/ts/cli/' },
              ],
            },
          ],
        },
        { label: 'Cross-impl Parity', link: '/parity/' },
      ],
      customCss: ['./src/styles/custom.css'],
    }),
    vue(),
  ],
});
