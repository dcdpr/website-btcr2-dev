import { defineConfig } from 'vitepress'

// Encode mermaid source so it can ride inside an attribute without breaking
// HTML parsing. We base64-encode (using a UTF-8-safe path) to sidestep quote /
// angle-bracket / newline collisions that the previous vitepress-plugin-mermaid
// SSR step paved over for us.
function encodeForAttr(source: string): string {
  return Buffer.from(source, 'utf-8').toString('base64')
}

export default defineConfig({
  title: 'did:btcr2',
  description: 'A censorship-resistant DID Method using the Bitcoin blockchain as a Verifiable Data Registry to announce changes to the DID document.',
  cleanUrls: true,
  base: '/',
  markdown: {
    config(md) {
      // Replace the default fenced-code renderer so ```mermaid blocks emit a
      // <Mermaid> component instead of a <pre><code>. Falls through to the
      // original renderer for every other language.
      const defaultFence = md.renderer.rules.fence!
      md.renderer.rules.fence = (tokens, idx, options, env, self) => {
        const token = tokens[idx]
        if (token.info.trim() === 'mermaid') {
          return `<Mermaid code-b64="${encodeForAttr(token.content)}" />`
        }
        return defaultFence(tokens, idx, options, env, self)
      }
    },
  },
  vite: {
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
      { text: 'Diagrams', link: '/diagrams' },
      { text: 'Demo', link: '/demo' },
      { text: 'Implementations', link: '/impls' },
      { text: 'Parity', link: '/parity' },
    ],
    footer: {
      copyright: 'Copyright © 2025 Digital Contract Design',
    },
    sidebar: [
      { text: 'Specification', link: '/spec' },
      { text: 'Diagrams', link: '/diagrams' },
      { text: 'Demo', link: '/demo' },
      {
        text: 'Implementations',
        link: '/impls',
        items: [
          { text: 'Java', link: '/impls/java' },
          { text: 'Python', link: '/impls/py' },
          { text: 'Rust', link: '/impls/rs' },
          { text: 'TypeScript', link: '/impls/ts' },
        ],
      },
      { text: 'Cross-impl Parity', link: '/parity' },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/dcdpr/did-btcr2' }],
  },
})
